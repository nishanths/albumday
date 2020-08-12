package main

import "github.com/julienschmidt/httprouter"

func main() {
	router := httprouter.New()
	router.GET("/api/v1/account", AccountHandler)
}
