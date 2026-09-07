package main

import (
	"net/http"
	"regexp"
	"strings"
)

const maxRequestIDLen = 64

var requestIDRe = regexp.MustCompile(`^[A-Za-z0-9._-]{8,64}$`)

var safeMessages = map[string]string{
	"invalid_request":     "Check the form and try again.",
	"unauthorized":        "Sign in to continue.",
	"invalid_credentials": "Sign-in failed.",
	"forbidden":           "The request was rejected.",
	"rate_limited":        "Too many attempts. Try later.",
	"conflict":            "That username is already taken.",
	"payload_too_large":   "That file is too large.",
	"not_found":           "Not found.",
	"internal_error":      "Something went wrong.",
}

func normalizeErrorCode(code string) string {
	switch strings.TrimSpace(code) {
	case "not found":
		return "not_found"
	case "":
		return "internal_error"
	default:
		return code
	}
}

func safeErrorMessage(code string) string {
	code = normalizeErrorCode(code)
	if msg, ok := safeMessages[code]; ok {
		return msg
	}
	return safeMessages["internal_error"]
}

func sanitizeRequestID(raw string) string {
	id := strings.TrimSpace(raw)
	if len(id) > maxRequestIDLen {
		id = id[:maxRequestIDLen]
	}
	if requestIDRe.MatchString(id) {
		return id
	}
	return randomID(16)
}

func requestIDFrom(r *http.Request, w http.ResponseWriter) string {
	if r != nil {
		if id, ok := r.Context().Value(requestIDContextKey).(string); ok && id != "" {
			return id
		}
	}
	if w != nil {
		if id := strings.TrimSpace(w.Header().Get("X-Request-ID")); id != "" {
			return id
		}
	}
	id := randomID(16)
	if w != nil {
		w.Header().Set("X-Request-ID", id)
	}
	return id
}

func (a *App) writeSafeError(w http.ResponseWriter, r *http.Request, status int, code string) {
	a.writeAPIError(w, r, status, code, "")
}

func (a *App) writeAPIError(w http.ResponseWriter, r *http.Request, status int, code, debug string) {
	code = normalizeErrorCode(code)
	id := requestIDFrom(r, w)
	payload := map[string]any{
		"error":      code,
		"message":    safeErrorMessage(code),
		"request_id": id,
	}
	if debug != "" && a.allowClientDebug(r) {
		payload["debug"] = redactLogValue(debug)
	}
	writeJSON(w, status, payload)
}

func (a *App) allowClientDebug(r *http.Request) bool {
	if a.cfg.AppEnv == "development" {
		return true
	}
	if !a.cfg.EnableDiagnostics || r == nil {
		return false
	}
	user := a.currentUser(r)
	return user != nil && user.Role == roleAdmin
}
