package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/julienschmidt/httprouter"
)

func main() {
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

	newEmailClient()

	router := httprouter.New()
	router.GET("/api/v1/account", AccountHandler)

	PORT := os.Getenv("PORT")
	if PORT == "" {
		PORT = "8080"
	}
	return http.ListenAndServe(":"+PORT, router)
}
