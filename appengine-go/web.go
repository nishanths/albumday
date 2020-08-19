package main

import (
	"context"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"time"

	"github.com/go-redis/redis"
	"github.com/julienschmidt/httprouter"
)

type Bootstrap struct {
	LoggedIn bool   `json:"loggedIn"`
	Email    string `json:"email"`
}

type IndexTmplArgs struct {
	Title     string
	Bootstrap Bootstrap
}

var (
	indexTmpl = template.Must(template.ParseFiles("templates/index.html"))
)

func (s *Server) LogoutHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	http.SetCookie(w, &http.Cookie{
		Name:   cookieNameIdentity,
		MaxAge: -1,
	})
	http.Redirect(w, r, "/start", http.StatusFound)
}

func (s *Server) IndexHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := s.currentIdentity(r)

	b := Bootstrap{
		LoggedIn: email != "",
		Email:    email,
	}

	if err := indexTmpl.Execute(w, IndexTmplArgs{
		"album birthdays",
		b,
	}); err != nil {
		log.Printf("execute index template: %s", err)
	}
}

func (s *Server) StartHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// for hard visits, clear cookie and show login page
	http.SetCookie(w, &http.Cookie{
		Name:   cookieNameIdentity,
		MaxAge: -1,
	})

	b := Bootstrap{
		LoggedIn: false,
		Email:    "",
	}

	if err := indexTmpl.Execute(w, IndexTmplArgs{
		"album birthdays",
		b,
	}); err != nil {
		log.Printf("execute index template: %s", err)
	}
}

func (s *Server) FeedHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := s.currentIdentity(r)
	if email == "" {
		http.Redirect(w, r, "/start", http.StatusFound)
		return
	}

	b := Bootstrap{
		LoggedIn: email != "",
		Email:    email,
	}

	if err := indexTmpl.Execute(w, IndexTmplArgs{
		"album birthdays",
		b,
	}); err != nil {
		log.Printf("execute index template: %s", err)
	}
}

func (s *Server) UnsubHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := r.FormValue("email")
	if email == "" {
		http.Error(w, "missing email", http.StatusBadRequest)
		return
	}

	token := r.FormValue("token")
	if token == "" {
		http.Error(w, "missing token", http.StatusBadRequest)
		return
	}

	wantToken, err := s.redis.Get(unsubTokenKey(email)).Result()
	if err != nil {
		log.Printf("GET unsub token: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	if token != wantToken {
		log.Printf("unsub token mismatch")
		http.Error(w, "token mismatch", http.StatusForbidden)
		return
	}

	err = UpdateEntity(s.redis, accountKey(email), &Account{}, func(v interface{}) interface{} {
		a := v.(*Account)
		a.Settings.EmailsEnabled = false
		return a
	})
	if err == redis.Nil {
		log.Printf("unsub: no such account %s", email)
		http.Error(w, "no such account", http.StatusNotFound)
		return
	}
	if err != nil {
		log.Printf("update account: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	fmt.Fprint(w, "succesfully unsubscribed %s\n", email)
}

func (s *Server) PreviewEmailHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	const timestamp = 1603039105
	t := time.Unix(timestamp, 0)

	email := s.config.PreviewEmail

	acc, err := getAccount(accountKey(email), s.redis)
	if err != nil {
		log.Printf("get account: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	if !acc.connectionComplete() {
		log.Printf("connection incomplete")
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	conn := *acc.Connection

	songs := s.getSongsFromCache(conn.Service, email)
	if songs == nil {
		var err error
		songs, err = FetchSongs(context.Background(), s.http, conn)
		if err != nil {
			log.Printf("fetch songs: %s", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
	}
	s.putSongsToCache(conn.Service, email, songs)

	items := computeBirthdays(timestamp, time.UTC, songs)

	err = emailTmpl.ExecuteTemplate(w, "base", EmailTmplArgs{
		Day:           t.Day(),
		Month:         t.Month(),
		AppVisitURL:   "https://" + AppDomain + "/feed",
		BirthdayItems: items,
		UnsubURL:      "",
	})
	if err != nil {
		log.Printf("execute email template: %s", err)
	}
}
