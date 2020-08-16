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

	ds.Close()

	tasks, err := newTasksClient(ctx)
	if err != nil {
		return err
	}
	defer tasks.Close()

	redisc := newRedis(net.JoinHostPort(config.RedisHost, config.RedisHost), config.RedisTLS)
	defer redisc.Close()

	newEmailClient()

	router := httprouter.New()
	router.GET("/api/v1/account", AccountHandler)

	PORT := os.Getenv("") // TODO
	return http.ListenAndServe(PORT, router)
}
