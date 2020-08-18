package main

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func (s *Server) LogoutHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	http.SetCookie(w, &http.Cookie{
		Name:   cookieNameIdentity,
		MaxAge: -1,
	})
	http.Redirect(w, r, "/start", http.StatusFound)
}

func (s *Server) IndexHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
}

func (s *Server) StartHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
}

func (s *Server) FeedHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
}
