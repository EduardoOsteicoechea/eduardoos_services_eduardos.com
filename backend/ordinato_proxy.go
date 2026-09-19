package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

const (
	ordinatoSiteID      = "eduardoos"
	ordinatoProxyWindow = time.Hour
	ordinatoProxyMax    = 40
)

func (a *App) ordinatoConfigured() bool {
	return strings.TrimSpace(a.cfg.OrdinatoBaseURL) != "" && strings.TrimSpace(a.cfg.OrdinatoSiteKey) != ""
}

func (a *App) requireOrdinatoUser(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	if !a.ordinatoLimit.allow("user:"+user.ID) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return nil
	}
	return user
}

func (a *App) ordinatoCreateRunHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.requireOrdinatoUser(w, r)
	if user == nil {
		return
	}
	if !a.ordinatoConfigured() {
		if a.cfg.MustLog {
			a.log.Info("ordinato_unconfigured", slog.String("request_id", requestIDFrom(r, w)))
		}
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<10))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	body["user_id"] = user.ID
	if _, ok := body["stream"]; !ok {
		body["stream"] = true
	}
	payload, err := json.Marshal(body)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if a.cfg.MustLog {
		a.log.Info("ordinato_proxy_start",
			slog.String("request_id", requestIDFrom(r, w)),
			slog.String("user_id", user.ID),
			slog.String("path", "/v1/runs"),
		)
	}
	a.proxyOrdinato(w, r, http.MethodPost, "/v1/runs", payload, true)
}

func (a *App) ordinatoGetRunHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireOrdinatoUser(w, r)
	if user == nil {
		return
	}
	if !a.ordinatoConfigured() {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.proxyOrdinato(w, r, http.MethodGet, "/v1/runs/"+id, nil, false)
}

func (a *App) ordinatoEventsHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireOrdinatoUser(w, r)
	if user == nil {
		return
	}
	if !a.ordinatoConfigured() {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.proxyOrdinato(w, r, http.MethodGet, "/v1/runs/"+id+"/events", nil, true)
}

func (a *App) proxyOrdinato(w http.ResponseWriter, r *http.Request, method, path string, body []byte, stream bool) {
	base := strings.TrimRight(a.cfg.OrdinatoBaseURL, "/")
	url := base + path
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(r.Context(), method, url, reader)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	req.Header.Set("X-Ordinato-Site", ordinatoSiteID)
	req.Header.Set("Authorization", "Bearer "+a.cfg.OrdinatoSiteKey)
	req.Header.Set("X-Request-ID", requestIDFrom(r, w))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if stream {
		req.Header.Set("Accept", "text/event-stream")
	}
	client := &http.Client{Timeout: 120 * time.Second}
	if stream {
		client.Timeout = 0
	}
	res, err := client.Do(req)
	if err != nil {
		if a.cfg.MustLog {
			a.log.Info("ordinato_proxy_error",
				slog.String("request_id", requestIDFrom(r, w)),
				slog.String("reason", redactLogValue(err.Error())),
			)
		}
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	defer res.Body.Close()

	ct := res.Header.Get("Content-Type")
	if stream || strings.Contains(ct, "text/event-stream") {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		if rid := res.Header.Get("X-Request-ID"); rid != "" {
			w.Header().Set("X-Request-ID", rid)
		}
		w.WriteHeader(res.StatusCode)
		buf := make([]byte, 32*1024)
		for {
			n, readErr := res.Body.Read(buf)
			if n > 0 {
				if _, writeErr := w.Write(buf[:n]); writeErr != nil {
					return
				}
				if f, ok := w.(http.Flusher); ok {
					f.Flush()
				}
			}
			if readErr != nil {
				return
			}
		}
	}

	out, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	if rid := res.Header.Get("X-Request-ID"); rid != "" {
		w.Header().Set("X-Request-ID", rid)
	}
	if ct == "" {
		ct = "application/json; charset=utf-8"
	}
	w.Header().Set("Content-Type", ct)
	w.WriteHeader(res.StatusCode)
	_, _ = w.Write(out)
	if a.cfg.MustLog {
		a.log.Info("ordinato_proxy_done",
			slog.String("request_id", requestIDFrom(r, w)),
			slog.String("path", path),
			slog.Int("status", res.StatusCode),
		)
	}
}
