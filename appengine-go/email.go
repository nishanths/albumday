package main

import (
	"html/template"
	"time"
)

var templateFuncs = template.FuncMap{
	"add": func(x, y int) int {
		return x + y
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
}