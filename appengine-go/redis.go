package main

import (
	"crypto/tls"
	"fmt"

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

func UpdateEntity(c *redis.Client, key string, vType interface{}, update func(v interface{}) interface{}) error {
	// TODO: needs transaction
	b, err := c.Get(key).Bytes()
	if err != nil {
		return fmt.Errorf("redis: GET entity: %s", err)
	}
	mustJSONUnmarshal(b, vType)
	updated := mustJSONMarshal(update(vType))
	if err := c.Set(key, updated, 0).Err(); err != nil {
		return fmt.Errorf("redis: SET entity: %s", err)
	}
	return nil
}
