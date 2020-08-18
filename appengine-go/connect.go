package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
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

	v := url.Values{}
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
	return fmt.Sprintf("%s://%s/auth/spotify", userReq.URL.Scheme, userReq.Host)
}

func (s *Server) AuthSpotifyHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	successResponse := func() {
		http.SetCookie(w, &http.Cookie{
			Name:   cookieNameState,
			MaxAge: -1,
		})
		http.Redirect(w, r, "/birthdays?connect-success=1", http.StatusFound)
	}
	errorResponse := func() {
		http.SetCookie(w, &http.Cookie{
			Name:   cookieNameState,
			MaxAge: -1,
		})
		http.Redirect(w, r, "/birthdays?connect-error=1", http.StatusFound)
	}

	if error := r.FormValue("error"); error != "" {
		log.Printf("connect error: %s", error)
		errorResponse()
		return
	}

	code := r.FormValue("code")
	state := r.FormValue("state")

	// extract state from spotify
	var spotifyState StateCookie
	if err := json.Unmarshal([]byte(state), &spotifyState); err != nil {
		log.Printf("json-unmarshal state: %s", err)
		errorResponse()
		return
	}

	// extract state from cookie
	cookie, err := r.Cookie(cookieNameState)
	if err != nil {
		log.Printf("get cookie %s: %s", cookieNameState, err)
		errorResponse()
		return
	}
	var cookieState StateCookie
	err = s.config.StateCookie.Decode(cookieNameState, cookie.Value, &cookieState)
	if err != nil {
		log.Printf("decode state cookie: %s", err)
		errorResponse()
		return
	}

	// ensure state matches
	if cookieState.State != spotifyState.State {
		log.Printf("state mismatch: %s != %s", cookieState.State, spotifyState.State)
		errorResponse()
		return
	}

	// fetch tokens
	v := url.Values{}
	v.Set("grant_type", "authorization_code")
	v.Set("code", code)
	v.Set("redirect_uri", spotifyRedirectURL(r))
	v.Set("client_id", s.config.SpotifyClientID)
	v.Set("client_secret", s.config.SpotifyClientSecret)

	req, err := http.NewRequest("POST", "https://accounts.spotify.com/api/token", strings.NewReader(v.Encode()))
	if err != nil {
		log.Printf("new request: %s", err)
		errorResponse()
		return
	}
	req = req.WithContext(ctx)
	req.Header.Set("content-type", "application/x-www-form-urlencoded")

	rsp, err := s.http.Do(req)
	if err != nil {
		log.Printf("do spotify request: %s", err)
		errorResponse()
		return
	}
	defer drainAndClose(rsp.Body)
	if !successStatus(rsp.StatusCode) {
		log.Printf("bad status: %s", rsp.StatusCode)
		errorResponse()
		return
	}

	var tokenRsp SpotifyTokenResponse
	if err := json.NewDecoder(rsp.Body).Decode(&tokenRsp); err != nil {
		log.Printf("json-decode spotify token response: %s", err)
		errorResponse()
		return
	}

	accountEmail := cookieState.Email
	if err := UpdateEntity(s.redis, accountKey(accountEmail), &Account{}, func(v interface{}) interface{} {
		a := v.(*Account)
		a.Connection = &Connection{
			Spotify,
			SpotifyConnection{
				tokenRsp.RefreshToken,
			},
			ConnectionErrNone,
		}
		return a
	}); err != nil {
		log.Printf("update connection: %s", err)
		errorResponse()
		return
	}

	successResponse()
}

type SpotifyTokenResponse struct {
	RefreshToken string `json:"refresh_token"`
	// Don't care about below fields.
	//
	// AccessToken  string `json:"access_token"`
	// TokenType    string `json:"token_type"`
	// Scope        string `json:"scope"`
	// ExpiresIn    int    `json:"expires_in"`
}

func (s *Server) ConnectScrobbleHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	email := s.currentIdentity(r)
	if email == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	scrobbleUsername := r.FormValue("username")
	if scrobbleUsername == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	v := url.Values{}
	v.Set("username", scrobbleUsername)
	v.Set("limit", "0")
	u := fmt.Sprintf("%s/scrobbled?%s", scrobbleAPIBaseURL, v.Encode())

	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		log.Printf("new request: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	req = req.WithContext(ctx)

	rsp, err := s.http.Do(req)
	if err != nil {
		log.Printf("get scrobbled: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer drainAndClose(rsp.Body)

	if !successStatus(rsp.StatusCode) {
		log.Printf("bad status: %d", rsp.StatusCode)
		switch rsp.StatusCode {
		case 403:
			w.WriteHeader(409) // profile appears to be private
		case 404:
			w.WriteHeader(404) // profile not found
		default:
			w.WriteHeader(http.StatusInternalServerError)
		}
	}

	if err := UpdateEntity(s.redis, accountKey(email), &Account{}, func(v interface{}) interface{} {
		a := v.(*Account)
		a.Connection = &Connection{
			Scrobble,
			ScrobbleConnection{
				scrobbleUsername,
			},
			ConnectionErrNone,
		}
		return a
	}); err != nil {
		log.Printf("update connection: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
}
