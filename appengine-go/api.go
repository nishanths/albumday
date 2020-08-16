package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-redis/redis"
	"github.com/julienschmidt/httprouter"
)

func accountKey(email string) string {
	return fmt.Sprintf(":account:%s", email)
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
	ErrConnectionGeneric    ConnectionErrReason = "generic"    // generic error
	ErrConnectionPermission ConnectionErrReason = "permission" // insuffcient permissions, likely that profile is private
	ErrConnectionNotFound   ConnectionErrReason = "not found"  // no such profile
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

func (s *Server) AccountHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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

func mustJSONUnmarshal(b []byte, v interface{}) {
	if err := json.Unmarshal(b, v); err != nil {
		panic(err)
	}
}
