package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"regexp"
	"runtime/debug"
	"time"
)

type contextKeyObserve string

const requestIDContextKey contextKeyObserve = "request_id"

var redactPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)mongodb(\+srv)?:\/\/\S+`),
	regexp.MustCompile(`(?i)(smtp_password|smtp_pass|password|passwd|otp|refresh_token|access_token|authorization|bearer|api[_-]?key|jwt_secret|mongo_uri|mongodb_uri)\s*[:=]\s*\S+`),
	regexp.MustCompile(`(?i)(sk-[A-Za-z0-9]{8,}|eyJ[A-Za-z0-9._-]{4,})`),
}

func newJSONLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
}

func redactLogValue(raw string) string {
	out := raw
	for _, re := range redactPatterns {
		out = re.ReplaceAllString(out, "[redacted]")
	}
	if len(out) > 2000 {
		out = out[:2000] + "…"
	}
	return out
}

func (a *App) withObservability(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := sanitizeRequestID(r.Header.Get("X-Request-ID"))
		ctx := context.WithValue(r.Context(), requestIDContextKey, id)
		r = r.WithContext(ctx)
		ww := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		ww.Header().Set("X-Request-ID", id)
		start := time.Now()
		defer func() {
			if recovered := recover(); recovered != nil {
				a.logUnexpected(r, "panic", string(debug.Stack()))
				if !ww.wrote {
					a.writeAPIError(ww, r, http.StatusInternalServerError, "internal_error", string(debug.Stack()))
				}
			}
			a.logRequest(r, ww.status, time.Since(start))
		}()
		next.ServeHTTP(ww, r)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
	wrote  bool
}

func (w *statusWriter) WriteHeader(code int) {
	if !w.wrote {
		w.status = code
		w.wrote = true
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if !w.wrote {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(b)
}

func (w *statusWriter) Flush() {
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (w *statusWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

func (a *App) logRequest(r *http.Request, status int, dur time.Duration) {
	userID := ""
	role := ""
	if user := a.currentUser(r); user != nil {
		userID = user.ID
		role = user.Role
	}
	level := slog.LevelInfo
	if status >= 500 {
		level = slog.LevelError
	} else if status >= 400 {
		level = slog.LevelWarn
	}
	a.log.LogAttrs(r.Context(), level, "request",
		slog.String("request_id", requestIDFrom(r, nil)),
		slog.String("method", r.Method),
		slog.String("route", r.URL.Path),
		slog.Int("status", status),
		slog.Int64("duration_ms", dur.Milliseconds()),
		slog.String("user_id", userID),
		slog.String("role", role),
		slog.String("source_ip", clientIP(r.RemoteAddr)),
	)
}

func (a *App) logValidation(r *http.Request, reason string) {
	a.log.Info("validation",
		slog.String("request_id", requestIDFrom(r, nil)),
		slog.String("route", r.URL.Path),
		slog.String("reason", reason),
	)
}

func (a *App) logUnexpected(r *http.Request, kind, stack string) {
	a.log.Error("unexpected_error",
		slog.String("request_id", requestIDFrom(r, nil)),
		slog.String("kind", kind),
		slog.String("route", r.URL.Path),
		slog.String("stack", redactLogValue(stack)),
	)
}

func (a *App) auditEvent(r *http.Request, kind, status, userID string) {
	id := requestIDFrom(r, nil)
	a.audit.add(AuditEvent{
		ID:        id,
		Kind:      kind,
		UserID:    userID,
		Status:    status,
		CreatedAt: time.Now().UTC(),
	})
	a.log.Info("audit",
		slog.String("request_id", id),
		slog.String("kind", kind),
		slog.String("status", status),
		slog.String("user_id", userID),
		slog.String("route", r.URL.Path),
		slog.String("source_ip", clientIP(r.RemoteAddr)),
	)
}

func (a *App) auditEventExtra(r *http.Request, kind, status, userID, provider string, promptLen int) {
	id := requestIDFrom(r, nil)
	a.audit.add(AuditEvent{
		ID:        id,
		Kind:      kind,
		UserID:    userID,
		Provider:  provider,
		Status:    status,
		PromptLen: promptLen,
		CreatedAt: time.Now().UTC(),
	})
	a.log.Info("audit",
		slog.String("request_id", id),
		slog.String("kind", kind),
		slog.String("status", status),
		slog.String("user_id", userID),
		slog.String("provider", provider),
		slog.Int("prompt_len", promptLen),
	)
}
