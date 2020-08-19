package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/go-redis/redis"
)

func (s *Server) getSongsFromCache(service Service, email string) []Song {
	b, err := s.redis.Get(libraryCacheKey(service, email)).Bytes()
	if err == redis.Nil {
		return nil
	}
	if err != nil {
		log.Printf("GET library cache: %s", err)
		return nil
	}

	songs := make([]Song, 0) // `make` so that it's not nil for the return value
	if err := json.Unmarshal(b, &songs); err != nil {
		log.Printf("json-unmarshal songs: %s", err)
		return nil
	}

	return songs
}

func (s *Server) putSongsToCache(service Service, email string, songs []Song) {
	b := mustMarshalJSON(songs)

	err := s.redis.Set(libraryCacheKey(service, email), string(b), 48*time.Hour).Err()
	if err != nil {
		log.Printf("SET library cache: %s", err)
		return
	}
}
