package main

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func (s *Server) DailyEmailCronHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
}

func (s *Server) DailyEmailTaskHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
}

func (s *Server) RefreshLibraryCronHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
}

func (s *Server) RefreshLibraryTaskHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
}
