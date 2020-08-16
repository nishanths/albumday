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

const ProjectID = "albumday"

const (
	AppName   = "album birthdays"
	AppDomain = "album.casa"
)

var emailRegexp = regexp.MustCompile("^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$")

func validateEmail(email string) error {
	if !emailRegexp.MatchString(email) {
		return errors.New("invalid format")
	}
	return nil
}
