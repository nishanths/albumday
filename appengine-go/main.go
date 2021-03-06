package main

import (
	"context"
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/go-redis/redis"
	"github.com/gorilla/securecookie"
	"github.com/julienschmidt/httprouter"
)

type Server struct {
	email  EmailClient
	config Config
	tasks  TasksClient
	redis  *redis.Client
	http   *http.Client

	identityCookie, stateCookie *securecookie.SecureCookie
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
		http:   &http.Client{Timeout: 30 * time.Second},

		identityCookie: identityCookieCodec(config.CookieSecret),
		stateCookie:    stateCookieCodec(config.CookieSecret),
	}

	router := httprouter.New()

	router.GET("/api/v1/account", s.AccountHandler)
	router.POST("/api/v1/passphrase", s.PassphraseHandler)
	router.POST("/api/v1/login", s.LoginHandler)
	router.DELETE("/api/v1/account", s.DeleteAccountHandler)
	router.DELETE("/api/v1/account/connection", s.DeleteAccountConnectionHandler)
	router.PUT("/api/v1/account/email-notifications", s.SetEmailsEnabledHandler)
	router.GET("/api/v1/birthdays", s.BirthdaysHandler)

	router.GET("/internal/cron/daily-email", RequireCronHeader(s.DailyEmailCronHandler))
	router.POST("/internal/task/daily-email", RequireTasksSecret(config.TasksSecret, s.DailyEmailTaskHandler))

	router.GET("/connect/spotify", s.ConnectSpotifyHandler)
	router.GET("/auth/spotify", s.AuthSpotifyHandler)
	router.POST("/connect/scrobble", s.ConnectScrobbleHandler)

	router.GET("/", s.IndexHandler)
	router.GET("/start", s.StartHandler)
	router.GET("/feed", s.FeedHandler)
	router.GET("/settings", s.FeedHandler)
	router.GET("/logout", s.LogoutHandler)
	// https://security.stackexchange.com/questions/115964/email-unsubscribe-handling-security
	router.GET("/unsub", s.UnsubHandler)
	router.POST("/unsub", s.UnsubHandler)
	router.GET("/email-preview", s.PreviewEmailHandler)
	router.GET("/terms", s.TermsHandler)

	if isDev() {
		router.ServeFiles("/static/*filepath", http.Dir("static"))
	}

	PORT := os.Getenv("PORT")
	if PORT == "" {
		PORT = devPort
	}
	log.Printf("listening on port %s", PORT)
	return http.ListenAndServe(":"+PORT, OldHostsRedirect(router))
}

func RequireCronHeader(h httprouter.Handle) httprouter.Handle {
	return httprouter.Handle(func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		if r.Header.Get("x-appengine-cron") == "true" {
			h(w, r, p)
			return
		}
		w.WriteHeader(http.StatusUnauthorized)
	})
}

func RequireTasksSecret(wantSecret string, h httprouter.Handle) httprouter.Handle {
	return httprouter.Handle(func(w http.ResponseWriter, r *http.Request, p httprouter.Params) {
		if r.Header.Get(headerTasksSecret) == wantSecret {
			h(w, r, p)
			return
		}
		w.WriteHeader(http.StatusUnauthorized)
	})
}

func OldHostsRedirect(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host == "birthdays.casa" {
			u := *r.URL
			u.Host = AppHost
			http.Redirect(w, r, u.String(), http.StatusFound)
			return
		}
		h.ServeHTTP(w, r)
	})
}
