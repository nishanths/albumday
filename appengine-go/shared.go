package main

import (
	"io"
	"io/ioutil"
)

func drainAndClose(r io.ReadCloser) {
	io.Copy(ioutil.Discard, r)
	r.Close()
}

const ProjectID = "albumday"
