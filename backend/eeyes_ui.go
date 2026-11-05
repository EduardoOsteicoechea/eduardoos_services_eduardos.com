package main

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed eeyes_ui/*
var eeyesUIFiles embed.FS

const eeyesUIVersion = "1"

func eeyesUICSP() string {
	return strings.Join([]string{
		"default-src 'none'",
		"style-src 'self'",
		"script-src 'self'",
		"img-src 'self' data:",
		"font-src 'none'",
		"connect-src 'none'",
		"base-uri 'none'",
		"form-action 'none'",
		"frame-ancestors 'none'",
	}, "; ")
}

func (a *App) eeyesUIIndex(w http.ResponseWriter, r *http.Request) {
	raw, err := eeyesUIFiles.ReadFile("eeyes_ui/index.html")
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	sum := sha256.Sum256(raw)
	etag := `"` + hex.EncodeToString(sum[:8]) + `-` + eeyesUIVersion + `"`
	if match := strings.TrimSpace(r.Header.Get("If-None-Match")); match == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Security-Policy", eeyesUICSP())
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("ETag", etag)
	w.Header().Set("X-Eeyes-UI-Version", eeyesUIVersion)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(raw)
}

func (a *App) eeyesUIAsset(w http.ResponseWriter, r *http.Request) {
	// Extensionless aliases: production Nginx serves *.js/*.css from the static
	// root before the /api/ proxy, so index.html links app-css / app-js.
	name := filepathBaseSafe(r.PathValue("asset"))
	switch name {
	case "app-css":
		name = "app.css"
	case "app-js":
		name = "app.js"
	}
	switch name {
	case "app.css", "app.js":
	default:
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	raw, err := fs.ReadFile(eeyesUIFiles, "eeyes_ui/"+name)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	sum := sha256.Sum256(raw)
	etag := `"` + hex.EncodeToString(sum[:8]) + `-` + eeyesUIVersion + `"`
	if match := strings.TrimSpace(r.Header.Get("If-None-Match")); match == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	ctype := "application/octet-stream"
	if strings.HasSuffix(name, ".css") {
		ctype = "text/css; charset=utf-8"
	} else if strings.HasSuffix(name, ".js") {
		ctype = "application/javascript; charset=utf-8"
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Content-Security-Policy", eeyesUICSP())
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("ETag", etag)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(raw)
}

func filepathBaseSafe(name string) string {
	name = strings.ReplaceAll(name, "\\", "/")
	if i := strings.LastIndex(name, "/"); i >= 0 {
		name = name[i+1:]
	}
	name = strings.TrimSpace(name)
	if name == "" || name == "." || name == ".." {
		return ""
	}
	return name
}
