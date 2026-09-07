package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
)

func main() {
	cfg := loadConfig()
	if cfg.SecureCookies && strings.TrimSpace(os.Getenv("JWT_SECRET")) == "" {
		log.Fatal("JWT_SECRET is required when COOKIE_SECURE=true")
	}

	ctx := context.Background()
	store, err := openStore(ctx, cfg)
	if err != nil {
		log.Fatal("database unavailable")
	}
	defer func() { _ = store.Close(ctx) }()
	if err := store.EnsureIndexes(ctx); err != nil {
		log.Fatal("database unavailable")
	}

	app := newAppWithStore(cfg, store)
	server := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: app.Handler(),
	}

	log.Printf("%s api listening on %s", siteName, cfg.ListenAddr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func openStore(ctx context.Context, cfg config) (DataStore, error) {
	if strings.TrimSpace(cfg.MongoURI) == "" {
		return newMemoryStore(), nil
	}
	return newMongoStore(ctx, cfg)
}
