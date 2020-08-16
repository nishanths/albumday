package main

import (
	"context"
	"flag"
	"log"
	"net"
	"net/http"
	"os"

	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	"github.com/go-redis/redis"
	"github.com/julienschmidt/httprouter"
)

type Server struct {
	email  EmailClient
	config Config
	tasks  *cloudtasks.Client
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
	ds, err := newDatastore(ctx)
	if err != nil {
		return err
	}
	config, err := loadConfig(ctx, ds)
	if err != nil {
		return err
	}
	ds.Close() // no longer needed

	tasks, err := newTasksClient(ctx)
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
