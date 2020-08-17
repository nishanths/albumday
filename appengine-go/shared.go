package main

import (
	"encoding/json"
	"errors"
	"io"
	"io/ioutil"
	"regexp"
)

func drainAndClose(r io.ReadCloser) {
	io.Copy(ioutil.Discard, r)
	r.Close()
}

func mustJSONUnmarshal(b []byte, v interface{}) {
	if err := json.Unmarshal(b, v); err != nil {
		panic(err)
	}
}

func mustJSONMarshal(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

const ProjectID = "albumday"

const (
	AppName   = "album birthdays"
	AppDomain = "birthdays.casa"
)

// From github.com/badoux/checkmail, and HTML5 spec doc.
var emailRegexp = regexp.MustCompile("^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$")

func validateEmail(email string) error {
	if !emailRegexp.MatchString(email) {
		return errors.New("invalid format")
	}
	return nil
}
