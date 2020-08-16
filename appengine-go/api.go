package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"text/template"
	"time"

	"github.com/go-redis/redis"
	"github.com/julienschmidt/httprouter"
)

func accountKey(email string) string {
	return fmt.Sprintf("account:%s", email)
}

func passphraseKey(email string) string {
	return fmt.Sprintf("passphrase:%s", email)
}

type Account struct {
	Service         string              `json:"service"`
	Connection      interface{}         `json:"connection"` // *SpotifyConnection | *ScrobbleConnection
	ConnectionError ConnectionErrReason `json:"connectionError"`
	Settings        AccountSettings     `json:"settings"`
}

func (a *Account) connectionComplete() bool {
	return a.Service != ""
}

type AccountSettings struct {
	TimeZone      string `json:"timeZone"`
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

type SpotifyConnection struct {
	RefreshToken string `json:"refreshToken"`
}

type ScrobbleConnection struct {
	Username string `json:"username"`
}

type Service string

const (
	Spotify  Service = "spotify"
	Scrobble Service = "scrobble"
)

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
		panic("read rand")
	}
	return hex.EncodeToString(b)
}

const passphraseExpiry = 2 * 24 * time.Hour

const (
	passphraseEmailSubject = "Login code for " + AppName

	passphraseEmailText = `Hi,

Someone has requested a login code for {{.Email}} to log in to the {{.AppName}} app (https://{{.AppDomain}}).

The code is below:

  {{.Passphrase}}

Enter this code to log in.
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
		log.Printf("redis: SET passhrase: %s", err)
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
