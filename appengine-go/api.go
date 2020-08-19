package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"text/template"
	"time"

	"github.com/go-redis/redis"
	"github.com/julienschmidt/httprouter"
)

func accountKey(email string) string {
	return fmt.Sprintf("account:%s", email)
}

func emailFromAccountKey(key string) string {
	return strings.TrimPrefix(key, "account:")
}

func passphraseKey(email string) string {
	return fmt.Sprintf("passphrase:%s", email)
}

func libraryCacheKey(service Service, email string) string {
	return fmt.Sprintf("library:%s:%s", service, email)
}

func unsubTokenKey(email string) string {
	return fmt.Sprintf("unsub_token:%s", email)
}

func generateUnsubToken() string {
	p := make([]byte, 16)
	if _, err := rand.Read(p); err != nil {
		panic(err)
	}
	return hex.EncodeToString(p)
}

type Account struct {
	Connection *Connection     `json:"connection"`
	Settings   AccountSettings `json:"settings"`
}

func (a *Account) connectionComplete() bool {
	return a.Connection != nil
}

type AccountSettings struct {
	EmailsEnabled bool   `json:"emailsEnabled"`
	EmailFormat   string `json:"emailFormat"` // EmailFormatHTML | EmailFormatText
}

const (
	EmailFormatHTML = "html"
	EmailFormatText = "plain text"
)

type ConnectionErrReason string

const (
	ConnectionErrGeneric    ConnectionErrReason = "generic"    // generic error
	ConnectionErrPermission ConnectionErrReason = "permission" // insuffcient permissions, likely that profile is private
	ConnectionErrNotFound   ConnectionErrReason = "not found"  // no such profile
)

type ConnectionError struct {
	Reason    ConnectionErrReason `json:"reason"`
	Timestamp int64               `json:"timestamp"`
}

func (c *ConnectionError) Error() string {
	return fmt.Sprintf("%s at %s", c.Reason, time.Unix(c.Timestamp, 0))
}

type Connection struct {
	Service Service `json:"service"`
	Conn
	Error *ConnectionError `json:"error"`
}

type Conn struct {
	RefreshToken string `json:"refreshToken,omitempty"`
	Username     string `json:"username,omitempty"`
}

type Service string

const (
	Spotify  Service = "spotify"
	Scrobble Service = "scrobble"
)

var AllServices = [...]Service{
	Spotify,
	Scrobble,
}

func (s *Server) AccountHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := s.currentIdentity(r)
	if email == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	accJSON, err := s.redis.Get(accountKey(email)).Bytes()
	if err == redis.Nil {
		w.WriteHeader(http.StatusNotFound)
		return
	} else if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Write(accJSON)
}

func generatePassphrase() string {
	b := make([]byte, 5)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

const (
	passphraseExpiry = 2 * 24 * time.Hour

	passphraseEmailSubject = "Login code for " + AppName
	passphraseEmailText    = `Hi,

Someone has requested a login code for {{.Email}} to log in to the {{.AppName}} app (https://{{.AppDomain}}).

The code is below:

{{.Passphrase}}
`
)

var passphraseEmailTmpl = template.Must(template.New("passphrase email").Parse(passphraseEmailText))

func (s *Server) PassphraseHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := r.FormValue("email")
	if email == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if err := validateEmail(email); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	pass := generatePassphrase()
	if err := s.redis.Set(passphraseKey(email), pass, passphraseExpiry).Err(); err != nil {
		log.Printf("SET passhrase: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var buf bytes.Buffer
	err := passphraseEmailTmpl.Execute(&buf, map[string]interface{}{
		"Email":      email,
		"AppName":    AppName,
		"AppDomain":  AppDomain,
		"Passphrase": pass,
	})
	if err != nil {
		log.Printf("execute template: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if err := s.email.Send([]string{email}, passphraseEmailSubject, buf.String(), ""); err != nil {
		log.Printf("send passphrase email: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func (s *Server) LoginHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := r.FormValue("email")
	if email == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	passphrase := r.FormValue("passphrase")
	if passphrase == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	want, err := s.redis.Get(passphraseKey(email)).Result()
	if err == redis.Nil {
		w.WriteHeader(http.StatusForbidden) // passphrase expired
		return
	} else if err != nil {
		log.Printf("GET passphrase: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if env() != Dev && want != passphrase {
		w.WriteHeader(http.StatusForbidden) // bad passphrase
		return
	}

	// ensure Account
	acc := Account{
		nil,
		AccountSettings{
			EmailsEnabled: true,
			EmailFormat:   EmailFormatHTML,
		},
	}
	if err := s.redis.SetNX(accountKey(email), mustMarshalJSON(acc), 0).Err(); err != nil {
		log.Printf("SETNX account: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// ensure unsub token
	if err := s.redis.SetNX(unsubTokenKey(email), generateUnsubToken(), 0).Err(); err != nil {
		log.Printf("SETNX unsub token: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if err := s.redis.Del(passphraseKey(email)).Err(); err != nil {
		log.Printf("DEL passphrase: %s", err) // only log
	}

	if err := s.setIdentityCookie(w, r, email); err != nil {
		log.Printf("set identity cookie: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func (s *Server) DeleteAccountConnectionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := s.currentIdentity(r)
	if email == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	acc, err := getAccount(accountKey(email), s.redis)
	if err != nil {
		log.Printf("get account: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if !acc.connectionComplete() {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if err := s.redis.Del(libraryCacheKey(acc.Connection.Service, email)).Err(); err != nil {
		log.Printf("DEL library cache: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if err := UpdateEntity(s.redis, accountKey(email), &Account{}, func(v interface{}) interface{} {
		a := v.(*Account)
		a.Connection = nil
		return a
	}); err != nil {
		log.Printf("update account: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func (s *Server) SetEmailsEnabledHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := s.currentIdentity(r)
	if email == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	var b bool
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		log.Printf("json-decode body: %s", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if err := UpdateEntity(s.redis, accountKey(email), &Account{}, func(v interface{}) interface{} {
		a := v.(*Account)
		a.Settings.EmailsEnabled = b
		return a
	}); err != nil {
		log.Printf("update account: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}

func (s *Server) DeleteAccountHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := s.currentIdentity(r)
	if email == "" {
		http.Error(w, "bad credentials", http.StatusUnauthorized)
		return
	}

	var delKeys []string
	delKeys = append(delKeys, passphraseKey(email))
	for _, s := range AllServices {
		delKeys = append(delKeys, libraryCacheKey(s, email))
	}
	delKeys = append(delKeys, accountKey(email))
	// NOTE: don't delete unsub token

	if err := s.redis.Del(delKeys...).Err(); err != nil {
		log.Printf("DEL keys: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	log.Printf("successfully deleted account: %s", email)
	http.SetCookie(w, &http.Cookie{
		Name:   cookieNameIdentity,
		MaxAge: -1, // delete cookie
	})
	io.WriteString(w, "deleted account\n")
}

func (s *Server) BirthdaysHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ts := r.URL.Query()["timestamp"]
	if len(ts) == 0 {
		http.Error(w, "timestamp required", http.StatusBadRequest)
		return
	}
	if len(ts) > 2 {
		http.Error(w, "too many timestamps", http.StatusBadRequest)
		return
	}
	var timestamps []int64
	for _, t := range ts {
		i, err := strconv.ParseInt(t, 10, 64)
		if err != nil {
			http.Error(w, "bad timestamp", http.StatusBadRequest)
			return
		}
		timestamps = append(timestamps, i)
	}

	timeZoneName := r.FormValue("timeZone")
	loc := defaultLocation
	if timeZoneName != "" {
		var err error
		loc, err = time.LoadLocation(timeZoneName)
		if err != nil {
			log.Printf("load location %s: %s", timeZoneName, err)
			http.Error(w, "bad timezone", http.StatusBadRequest)
			return
		}
	}

	cache := r.FormValue("cache")
	if cache == "" {
		cache = "on"
	}
	if cache != "on" && cache != "off" {
		http.Error(w, "bad cache", http.StatusBadRequest)
		return
	}

	email := s.currentIdentity(r)
	if email == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	acc, err := getAccount(accountKey(email), s.redis)
	if err != nil {
		log.Printf("get account: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	if !acc.connectionComplete() {
		w.WriteHeader(412)
		return
	}

	conn := *acc.Connection
	ctx := context.Background() // intentional

	var songs []Song

	if cache == "on" {
		songs = s.getSongsFromCache(conn.Service, email)
	}

	if songs == nil { // need to do a live fetch?
		var err error
		songs, err = FetchSongs(ctx, s.http, conn)
		if connErr, ok := err.(*ConnectionError); ok {
			log.Printf("fetch songs connection error: %s", err)
			switch connErr.Reason {
			case ConnectionErrPermission, ConnectionErrNotFound:
				w.WriteHeader(422)
			case ConnectionErrGeneric:
				w.WriteHeader(http.StatusInternalServerError)
			default:
				panic("unreachable")
			}
			return
		}
		if err != nil {
			log.Printf("fetch songs: %s", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	s.putSongsToCache(conn.Service, email, songs)

	result := computeBirthdaysForTimestamps(timestamps, loc, songs)
	if err := json.NewEncoder(w).Encode(result); err != nil {
		log.Printf("write response: %s", err)
	}
}

type BirthdayResponse map[int64][]BirthdayItem

func computeBirthdaysForTimestamps(timestamps []int64, loc *time.Location, songs []Song) BirthdayResponse {
	m := make(BirthdayResponse)
	for _, t := range timestamps {
		m[t] = computeBirthdays(t, loc, songs)
	}
	return m
}

func getAccount(key string, redis *redis.Client) (Account, error) {
	accJSON, err := redis.Get(key).Bytes()
	if err != nil {
		return Account{}, err
	}

	var acc Account
	mustUnmarshalJSON(accJSON, &acc)
	return acc, nil
}
