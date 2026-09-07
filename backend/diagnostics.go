package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	maxPromptRunes   = 500
	emailAdminWindow = 10 * time.Minute
	emailSiteMax     = 20
	emailSiteWindow  = time.Hour
	aiAdminMax       = 10
	aiAdminWindow    = time.Hour
	aiSiteMax        = 30
	aiSiteWindow     = time.Hour
)

func (a *App) diagnosticsEnabled(w http.ResponseWriter, r *http.Request) bool {
	if a.cfg.EnableDiagnostics {
		return true
	}
	if strings.HasPrefix(r.URL.Path, "/api/admin/diagnostics/") {
		a.writeSafeError(w, r, http.StatusNotFound, "not found")
		return false
	}
	return true
}

func (a *App) requireAdmin(w http.ResponseWriter, r *http.Request) *User {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	if user.Role != "admin" {
		a.auditEvent(r, "permission_denied", "forbidden", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	return user
}

func (a *App) emailTestHandler(w http.ResponseWriter, r *http.Request) {
	if !a.diagnosticsEnabled(w, r) {
		return
	}
	user := a.requireAdmin(w, r)
	if user == nil {
		return
	}
	requestID := requestIDFrom(r, w)
	if !user.EmailVerified || user.Email == "" {
		a.auditEvent(r, "email-test", "denied", user.ID)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "error": "email_unverified", "request_id": requestID,
			"message": "The administrator email is not verified.",
		})
		return
	}
	if !a.emailAdminLimit.allow(user.ID) || !a.emailSiteLimit.allow("site") {
		a.auditEvent(r, "email-test", "rate_limited", user.ID)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}

	var ignored map[string]any
	_ = json.NewDecoder(r.Body).Decode(&ignored)

	subject := "[" + siteName + "] Admin diagnostics test email"
	body := "This is an administrator diagnostics test for " + siteName + " at " + time.Now().UTC().Format(time.RFC3339) + ".\n"
	if err := a.mailer.Send(user.Email, subject, body); err != nil {
		a.auditEvent(r, "email-test", "failed", user.ID)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "error": "email_failed", "request_id": requestID,
			"message": "The test email could not be sent.",
		})
		return
	}
	a.auditEvent(r, "email-test", "sent", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "request_id": requestID})
}

func (a *App) aiChatTestHandler(w http.ResponseWriter, r *http.Request) {
	if !a.diagnosticsEnabled(w, r) {
		return
	}
	user := a.requireAdmin(w, r)
	if user == nil {
		return
	}
	requestID := requestIDFrom(r, w)
	var body struct {
		Provider string `json:"provider"`
		Prompt   string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	provider := strings.ToLower(strings.TrimSpace(body.Provider))
	prompt := strings.TrimSpace(body.Prompt)
	if provider != "deepseek" && provider != "kimi" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if prompt == "" || utf8.RuneCountInString(prompt) > maxPromptRunes {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	client, ok := a.chat[provider]
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.aiAdminLimit.allow(user.ID+":"+provider) || !a.aiSiteLimit.allow("site") {
		a.auditEventExtra(r, "ai-chat-test", "rate_limited", user.ID, provider, utf8.RuneCountInString(prompt))
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}

	timeout := 12 * time.Second
	if provider == "kimi" {
		timeout = 45 * time.Second
	}
	ctx, cancel := context.WithTimeout(r.Context(), timeout)
	defer cancel()
	result, err := client.Chat(ctx, prompt)
	if err != nil {
		a.auditEventExtra(r, "ai-chat-test", "failed", user.ID, provider, utf8.RuneCountInString(prompt))
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "error": "provider_unavailable", "request_id": requestID,
			"message": "The AI provider did not respond.",
		})
		return
	}
	a.auditEventExtra(r, "ai-chat-test", "ok", user.ID, provider, utf8.RuneCountInString(prompt))
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"request_id": requestID,
		"text":       sanitizeModelText(result.Text),
		"usage":      result.Usage,
	})
}
