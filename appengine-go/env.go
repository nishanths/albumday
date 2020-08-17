package main

import (
	"os"
)

type Env string

const (
	Dev  Env = "dev"
	Prod Env = "prod"
)

func env() Env {
	_, ok := os.LookupEnv("GAE_DEPLOYMENT_ID")
	if ok {
		return Prod
	}
	return Dev
}

func isDev() bool {
	return env() == Dev
}
