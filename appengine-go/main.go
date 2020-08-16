package main

import (
	"context"
	"flag"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/go-redis/redis"
	"github.com/julienschmidt/httprouter"
)

type Server struct {
	email  EmailClient
	config Config
	tasks  TasksClient
	redis  *redis.Client
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	flag.Parse()

	if err := run(context.Background()); err != nil {
		log.Fatal(err)
	}
}

func run(ctx context.Context) error {
	ds, err := newDatastore(ctx) // nil in dev
	if err != nil {
		return err
	}
	config, err := loadConfig(ctx, ds)
	if err != nil {
		return err
	}
	if ds != nil {
		ds.Close() // no longer needed
	}

	tasks, err := newTasksClient(ctx, config.TasksSecret)
	if err != nil {
		return err
	}
	defer tasks.Close()

	redisc := newRedis(net.JoinHostPort(config.RedisHost, config.RedisPort), config.RedisTLS)
	defer redisc.Close()

	s := &Server{
		email:  newEmailClient(config.SendgridAPIKey),
		config: config,
		tasks:  tasks,
		redis:  redisc,
	}

	router := httprouter.New()
	router.GET("/api/v1/account", s.AccountHandler)

	PORT := os.Getenv("PORT")
	if PORT == "" {
		PORT = "8080"
	}
	log.Printf("listening on port: %s", PORT)
	return http.ListenAndServe(":"+PORT, router)
}
