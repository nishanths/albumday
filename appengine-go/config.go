package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"os"

	"cloud.google.com/go/datastore"
)

type Config struct {
	RedisHost string
	RedisPort int
	RedisTLS  *tls.Config

	SendgridAPIKey string

	SpotifyClientID     string
	SpotifyClientSecret string

	CookieSecret string

	TasksSecret string
}

type Metadata struct {
	RedisHost           string
	SendgridAPIKey      string
	SpotifyClientID     string
	SpotifyClientSecret string
	CookieSecret        string
	TasksSecret         string
}

func loadConfig(ctx context.Context, ds *datastore.Client) (Config, error) {
	switch env() {
	case Prod:
		key := datastore.NameKey("Metadata", "singleton", nil)
		var m Metadata
		if err := ds.Get(ctx, key, &m); err != nil {
			return Config{}, fmt.Errorf("failed to get metadata: %s", err)
		}
		return Config{
			RedisHost:           m.RedisHost,
			RedisPort:           6379,
			RedisTLS:            &tls.Config{},
			SendgridAPIKey:      m.SendgridAPIKey,
			SpotifyClientID:     m.SpotifyClientID,
			SpotifyClientSecret: m.SpotifyClientSecret,
			CookieSecret:        m.CookieSecret,
			TasksSecret:         m.TasksSecret,
		}, nil
	case Dev:
		return Config{
			RedisHost:           "localhost",
			RedisPort:           6379,
			SpotifyClientID:     os.Getenv("SPOTIFY_CLIENT_ID"),
			SpotifyClientSecret: os.Getenv("SPOTIFY_CLIENT_SECRET"),
			CookieSecret:        "foo",
			TasksSecret:         "bar",
		}, nil
	default:
		panic("unreachable")
	}
}
