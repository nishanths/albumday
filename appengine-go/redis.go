package main

import (
	"crypto/tls"

	"github.com/go-redis/redis"
)

func newRedis(addr string, cfg *tls.Config) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:       addr,
		DB:         0,
		MaxRetries: 3,
		TLSConfig:  cfg,
	})
}
