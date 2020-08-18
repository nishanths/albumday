package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/gorilla/securecookie"
	"github.com/julienschmidt/httprouter"
)

const (
	cookieNameState = "albumday:state"
	cookieAgeState  = 30 * time.Minute
)

type StateCookie struct {
	State   string
	Email   string
	Service Service
}

func stateParam() string {
	p := make([]byte, 32)
	if _, err := rand.Read(p); err != nil {
		panic(err)
	}
	return hex.EncodeToString(p)
}

func stateCookieCodec(secret string) *securecookie.SecureCookie {
	return securecookie.New([]byte(secret), nil).
		MaxAge(int(cookieAgeState / time.Second)).
		SetSerializer(securecookie.JSONEncoder{})
}

func (s *Server) ConnectSpotifyHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	email := s.currentIdentity(r)
	if email == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	stateCookie := StateCookie{
		State:   stateParam(),
		Email:   email,
		Service: Spotify,
	}
	stateCookieJSON := mustMarshalJSON(stateCookie)

	v := new(url.Values)
	v.Set("client_id", s.config.SpotifyClientID)
	v.Set("response_type", "code")
	v.Set("redirect_uri", spotifyRedirectURL(r))
	v.Set("state", string(stateCookieJSON))
	v.Set("scope", "user-library-read")
	v.Set("show_dialog", "false")

	encoded, err := s.config.StateCookie.Encode(cookieNameIdentity, stateCookie)
	if err != nil {
		log.Printf("encode state cookie: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     cookieNameState,
		Value:    encoded,
		Expires:  time.Now().Add(cookieAgeState),
		HttpOnly: true,
	})

	http.Redirect(w, r, "https://accounts.spotify.com/authorize?"+v.Encode(), http.StatusFound)
}

func spotifyRedirectURL(userReq *http.Request) string {
	u := *userReq.URL
	return fmt.Sprintf("%s://%s/auth/spotify", u.Scheme, userReq.Host)
}

func (s *Server) AuthSpotifyHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
}

func (s *Server) ConnectScrobbleHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
}
