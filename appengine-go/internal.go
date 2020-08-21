package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/go-redis/redis"
	"github.com/julienschmidt/httprouter"
)

type DailyEmailTask struct {
	AccountKey string
}

func (s *Server) DailyEmailCronHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// https://redis.io/commands/keys:
	//
	// While the time complexity for this operation is O(N), the constant times
	// are fairly low. For example, Redis running on an entry level laptop can
	// scan a 1 million key database in 40 milliseconds.
	accountKeys, err := s.redis.Keys("account:*").Result()
	if err != nil {
		log.Printf("KEYS account:*", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	for _, k := range accountKeys {
		err := s.tasks.PostJSONTask(ctx, "/internal/task/daily-email", DailyEmailTask{k})
		if err != nil {
			log.Printf("post JSON task for %s: %s", k, err) // log and continue
		}
	}

	w.WriteHeader(http.StatusOK)
}

var calcuttaLoc = mustLoadLocation("Asia/Calcutta")

func (s *Server) DailyEmailTaskHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var task DailyEmailTask
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		log.Printf("json-decode request body: %s", err)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	email := emailFromAccountKey(task.AccountKey)

	acc, err := getAccount(task.AccountKey, s.redis)
	if err == redis.Nil {
		log.Printf("missing account %s", email)
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		log.Printf("get account: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if !acc.Settings.EmailsEnabled {
		log.Printf("skipping email for %s: emails disabled", email)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if !acc.connectionComplete() {
		log.Printf("skipping email for %s: connection incomplete", email)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	conn := *acc.Connection

	// fetch songs
	songs := s.getSongsFromCache(conn.Service, email)

	if songs == nil {
		var err error
		songs, err = FetchSongs(ctx, s.http, conn, s.config)
		var cerr ConnectionErrReason
		if errors.As(err, &cerr) {
			log.Printf("fetch songs connection error: %s", err)
			switch cerr {
			case ConnectionErrPermission, ConnectionErrNotFound:
				w.WriteHeader(http.StatusNoContent)
			case ConnectionErrGeneric:
				w.WriteHeader(http.StatusInternalServerError)
			default:
				panic("unreachable")
			}
			return
		}
		if err != nil {
			log.Printf("fetch songs: %s", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
	}

	s.putSongsToCache(conn.Service, email, songs)

	// compute birthdays
	t := time.Now()
	items := computeBirthdays(t.Unix(), calcuttaLoc, songs)

	if len(items) == 0 {
		log.Printf("no items for %s: skipping sending email", email)
		w.WriteHeader(http.StatusCreated)
		return
	}

	// make unsub link
	unsubToken, err := s.redis.Get(unsubTokenKey(email)).Result()
	if err != nil {
		log.Printf("GET unsub token: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	v := url.Values{}
	v.Set("email", email)
	v.Set("token", unsubToken)

	// prepare email
	var buf bytes.Buffer
	if err := emailTmpl.ExecuteTemplate(&buf, "base", &EmailTmplArgs{
		Day:           t.Day(),
		Month:         t.Month(),
		AppVisitURL:   "https://" + AppDomain + "/feed",
		BirthdayItems: items,
		UnsubURL:      "https://" + AppDomain + "/unsub?" + v.Encode(),
		SupportEmail:  SupportEmail,
		Browser:       false,
		IsDev:         env() == Dev,
	}); err != nil {
		log.Printf("execute email template: %s", err)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	// send email
	if err := s.email.Send(
		[]string{email},
		fmt.Sprintf("%d %s", t.Day(), t.Month()),
		"",
		buf.String(),
	); err != nil {
		log.Printf("send email: %s", err)
		var serr StatusError
		if errors.As(err, &serr) {
			if !isRetryableStatus(serr.Code) {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (s *Server) RefreshLibraryCronHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	panic("unimplemented")
}

func (s *Server) RefreshLibraryTaskHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	panic("unimplemented")
}
