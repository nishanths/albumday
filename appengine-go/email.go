package main

import (
	"html/template"
	"strings"
	"time"
)

var templateFuncs = template.FuncMap{
	"add": func(x, y int) int {
		return x + y
	},
	"lower": strings.ToLower,
	"releaseMatchMonth": func(r ReleaseMatch) bool {
		return r == MatchMonth
	},
}

var (
	emailTmpl = template.Must(
		template.New("email").Funcs(templateFuncs).ParseFiles("templates/email.html"),
	)
)

type EmailTmplArgs struct {
	Day           int
	Month         time.Month
	AppVisitURL   string
	BirthdayItems []BirthdayItem
	UnsubURL      string
	SupportEmail  string
	Browser       bool
	IsDev         bool
}
