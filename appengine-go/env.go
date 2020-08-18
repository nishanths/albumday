package main

import (
	"fmt"
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

const devPort = "8080"

func devAddr() string {
	return fmt.Sprintf("localhost:%s", devPort)
}

func devBaseURL() string {
	return "http://" + devAddr()
}
