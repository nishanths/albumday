package main

import (
	"net/http"
	"time"

	"github.com/gorilla/securecookie"
)

const (
	cookieNameIdentity = "albumday_identity"
	cookieAgeIdentity  = 30 * 24 * time.Hour
)

func identityCookieCodec(secret string) *securecookie.SecureCookie {
	return securecookie.New([]byte(secret), nil).
		MaxAge(int(cookieAgeIdentity / time.Second)).
		SetSerializer(securecookie.JSONEncoder{})
}

type IdentityCookie struct {
	Email string
}

func (s *Server) setIdentityCookie(w http.ResponseWriter, r *http.Request, email string) error {
	encoded, err := s.config.IdentityCookie.Encode(cookieNameIdentity, IdentityCookie{
		Email: email,
	})
	if err != nil {
		return err
	}
	cookie := &http.Cookie{
		Name:     cookieNameIdentity,
		Value:    encoded,
		Expires:  time.Now().Add(cookieAgeIdentity),
		HttpOnly: true,
	}
	http.SetCookie(w, cookie)
	return nil
}

func (s *Server) currentIdentity(r *http.Request) string {
	cookie, err := r.Cookie(cookieNameIdentity)
	if err != nil {
		return ""
	}

	var t IdentityCookie
	err = s.config.IdentityCookie.Decode(cookieNameIdentity, cookie.Value, &t)
	if err != nil {
		return ""
	}
	return t.Email
}
