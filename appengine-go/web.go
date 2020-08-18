package main

import (
	"html/template"
	"log"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type Bootstrap struct {
	LoggedIn bool   `json:"loggedIn"`
	Email    string `json:"email"`
}

type IndexArgs struct {
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

	if err := indexTmpl.Execute(w, IndexArgs{
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

	if err := indexTmpl.Execute(w, IndexArgs{
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

	if err := indexTmpl.Execute(w, IndexArgs{
		"album birthdays",
		b,
	}); err != nil {
		log.Printf("execute index template: %s", err)
	}
}
