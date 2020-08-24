package main

import (
	"fmt"
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
	"pluralize": pluralize,
	"yearsAgo": func(todayYear int, year int) string {
		return fmt.Sprintf("%dy ago", todayYear-year)
	},
}

var (
	emailTmpl = template.Must(
		template.New("email").Funcs(templateFuncs).ParseFiles("templates/email.html"),
	)
)

type EmailTmplArgs struct {
	Today         time.Time
	AppVisitURL   string
	BirthdayItems []BirthdayItem
	UnsubURL      string
	SupportEmail  string
	Browser       bool
	IsDev         bool
}
