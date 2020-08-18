package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"io/ioutil"
	"os"

	"cloud.google.com/go/datastore"
	"github.com/gorilla/securecookie"
)

type Config struct {
	RedisHost string
	RedisPort string
	RedisTLS  *tls.Config

	SendgridAPIKey string

	SpotifyClientID     string
	SpotifyClientSecret string

	IdentityCookie, StateCookie *securecookie.SecureCookie

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
		cert, err := tls.LoadX509KeyPair("redis/tls/redis.crt", "redis/tls/redis.key")
		if err != nil {
			return Config{}, fmt.Errorf("load cert: %s", err)
		}

		clientCert, err := ioutil.ReadFile("redis/tls/ca.crt")
		if err != nil {
			return Config{}, fmt.Errorf("read ca cert: %s", err)
		}
		pool := x509.NewCertPool()
		pool.AppendCertsFromPEM(clientCert)

		key := datastore.NameKey("Metadata", "singleton", nil)
		var m Metadata
		if err := ds.Get(ctx, key, &m); err != nil {
			return Config{}, fmt.Errorf("get metadata: %s", err)
		}

		return Config{
			RedisHost: m.RedisHost,
			RedisPort: "6379",
			RedisTLS: &tls.Config{
				InsecureSkipVerify: true,
				ServerName:         m.RedisHost,
				Certificates:       []tls.Certificate{cert},
				ClientCAs:          pool,
			},
			SendgridAPIKey:      m.SendgridAPIKey,
			SpotifyClientID:     m.SpotifyClientID,
			SpotifyClientSecret: m.SpotifyClientSecret,
			IdentityCookie:      identityCookieCodec(m.CookieSecret),
			StateCookie:         stateCookieCodec(m.CookieSecret),
			TasksSecret:         m.TasksSecret,
		}, nil
	case Dev:
		return Config{
			RedisHost:           "localhost",
			RedisPort:           "6379",
			SpotifyClientID:     os.Getenv("SPOTIFY_CLIENT_ID"),
			SpotifyClientSecret: os.Getenv("SPOTIFY_CLIENT_SECRET"),
			IdentityCookie:      identityCookieCodec("AVR30Z8RZrDwBRgGYwM7CpcADLGLiDxjk+lTiU01sBsuAZ3eOctoGn7pqWUnwIA3hgfsqL8elZty/2YKkZCLlg=="),
			StateCookie:         stateCookieCodec("AVR30Z8RZrDwBRgGYwM7CpcADLGLiDxjk+lTiU01sBsuAZ3eOctoGn7pqWUnwIA3hgfsqL8elZty/2YKkZCLlg=="),
			TasksSecret:         "bar",
		}, nil
	default:
		panic("unreachable")
	}
}
