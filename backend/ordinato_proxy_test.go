package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOrdinatoProxyRequiresAuth(t *testing.T) {
	app := newApp(loadConfig())
	app.cfg.OrdinatoBaseURL = "http://127.0.0.1:8085"
	app.cfg.OrdinatoSiteKey = "test"
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/ordinato/runs", nil)
	app.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden && rr.Code != http.StatusUnauthorized {
		// requireUnsafe may return forbidden without CSRF/origin
		t.Fatalf("status %d body %s", rr.Code, rr.Body.String())
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	if body["error"] == nil {
		t.Fatalf("expected error body %s", rr.Body.String())
	}
}

func TestOrdinatoUnconfigured(t *testing.T) {
	app := newApp(config{AppEnv: "development", JWTSecret: "x", MustLog: false})
	app.cfg.OrdinatoBaseURL = ""
	app.cfg.OrdinatoSiteKey = ""
	// Guest path: still forbidden/unauthorized before config check when no CSRF.
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/ordinato/runs/abc", nil)
	app.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status %d", rr.Code)
	}
}
