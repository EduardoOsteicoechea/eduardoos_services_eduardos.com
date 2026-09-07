package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealth(t *testing.T) {
	for _, path := range []string{"/health", "/api/health"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		newMux().ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("%s: expected HTTP 200, got %d", path, rec.Code)
		}

		var body map[string]string
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("%s: invalid JSON: %v", path, err)
		}
		if body["status"] != "ok" {
			t.Fatalf("%s: expected status ok, got %q", path, body["status"])
		}
	}
}

func TestListenAddrIsLoopback(t *testing.T) {
	cfg := loadConfig()
	if !strings.HasPrefix(cfg.ListenAddr, "127.0.0.1:") {
		t.Fatalf("API must bind to 127.0.0.1, got %q", cfg.ListenAddr)
	}
}

func TestInfo(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/info", nil)
	rec := httptest.NewRecorder()
	newMux().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d", rec.Code)
	}
}
