package main

import (
	"log"
	"net/http"
)

func main() {
	cfg := loadConfig()
	server := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: newMux(),
	}

	log.Printf("%s api listening on %s", siteName, cfg.ListenAddr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
