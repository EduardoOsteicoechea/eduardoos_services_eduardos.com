package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientIPUsesForwardedForBehindLoopbackProxy(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/auth/request-password-reset", nil)
	req.RemoteAddr = "127.0.0.1:54321"
	req.Header.Set("X-Forwarded-For", "203.0.113.50, 127.0.0.1")
	if got := clientIP(req); got != "203.0.113.50" {
		t.Fatalf("clientIP=%q want 203.0.113.50", got)
	}
}

func TestClientIPIgnoresForwardedForFromPublicPeer(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)
	req.RemoteAddr = "198.51.100.10:443"
	req.Header.Set("X-Forwarded-For", "203.0.113.50")
	if got := clientIP(req); got != "198.51.100.10" {
		t.Fatalf("clientIP=%q want direct peer", got)
	}
}

func TestClientIPFallsBackToRealIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	req.RemoteAddr = "[::1]:8081"
	req.Header.Set("X-Real-IP", "198.51.100.20")
	if got := clientIP(req); got != "198.51.100.20" {
		t.Fatalf("clientIP=%q want X-Real-IP", got)
	}
}
