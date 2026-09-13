package main

import (
	"context"
	"errors"
	"flag"
	"log"
	"log/slog"
	"net/http"
	"os"
	"strings"
)

func main() {
	cfg := loadConfig()
	command, confirmBackup := parseAPICommand(os.Args[1:])
	if command == "serve" && cfg.SecureCookies && strings.TrimSpace(cfg.JWTSecret) == "" {
		log.Fatal("JWT_SECRET is required when COOKIE_SECURE=true")
	}

	logger := newJSONLogger()
	setupCtx, cancel := context.WithTimeout(context.Background(), migrationSetupTimeout)
	defer cancel()

	store, err := openStore(setupCtx, cfg)
	if err != nil {
		logger.Error("database_unavailable", slog.String("reason", redactLogValue(err.Error())))
		log.Fatal("database unavailable")
	}
	defer func() { _ = store.Close(context.Background()) }()

	switch command {
	case "migrate-status":
		if err := logMigrationStatus(setupCtx, store, logger); err != nil {
			logger.Error("database_setup_failed", slog.String("reason", migrationReason(err)))
			os.Exit(1)
		}
		return
	case "migrate-destructive":
		if err := store.ApplyDestructiveMigrations(setupCtx, logger, cfg.AppEnv, confirmBackup); err != nil {
			logger.Error("database_setup_failed", slog.String("reason", migrationReason(err)))
			os.Exit(1)
		}
		return
	case "ereport-import":
		if err := runEreportImportCLI(setupCtx, cfg, store, os.Args[2:]); err != nil {
			logger.Error("ereport_import_failed", slog.String("reason", err.Error()))
			os.Exit(1)
		}
		return
	case "scrib-import":
		if err := runScribImportCLI(setupCtx, store, os.Args[2:]); err != nil {
			logger.Error("scrib_import_failed", slog.String("reason", err.Error()))
			os.Exit(1)
		}
		return
	}

	if err := store.ApplySafeMigrations(setupCtx, logger, cfg.AppEnv); err != nil {
		logger.Error("database_setup_failed", slog.String("reason", migrationReason(err)))
		os.Exit(1)
	}
	if err := migratePamphletBodies(setupCtx, cfg, store); err != nil {
		logger.Error("pamphlet_migration_failed", slog.String("reason", redactLogValue(err.Error())))
		os.Exit(1)
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

func parseAPICommand(args []string) (command, confirmBackup string) {
	command = "serve"
	if len(args) == 0 {
		return command, ""
	}
	switch args[0] {
	case "migrate-status", "migrate-destructive":
		command = args[0]
		fs := flag.NewFlagSet(command, flag.ContinueOnError)
		fs.SetOutput(os.Stderr)
		fs.StringVar(&confirmBackup, "confirm-backup", "", "")
		_ = fs.Parse(args[1:])
		return command, confirmBackup
	case "ereport-import":
		return "ereport-import", ""
	case "scrib-import":
		return "scrib-import", ""
	default:
		return command, ""
	}
}

func openStore(ctx context.Context, cfg config) (DataStore, error) {
	if strings.TrimSpace(cfg.MongoURI) == "" {
		if cfg.SecureCookies || cfg.AppEnv == "production" {
			return nil, errors.New("MONGODB_URI is required when COOKIE_SECURE=true or APP_ENV=production")
		}
		log.Println("WARNING: MONGODB_URI unset; using in-memory store (data will not persist)")
		return newMemoryStore(), nil
	}
	return newMongoStore(ctx, cfg)
}
