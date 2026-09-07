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
	maxPromptRunes     = 500
	emailAdminWindow   = 10 * time.Minute
	emailSiteMax       = 20
	emailSiteWindow    = time.Hour
	aiAdminMax         = 10
	aiAdminWindow      = time.Hour
	aiSiteMax          = 30
	aiSiteWindow       = time.Hour
)

func (a *App) diagnosticsEnabled(w http.ResponseWriter, r *http.Request) bool {
	if a.cfg.EnableDiagnostics {
		return true
	}
	if strings.HasPrefix(r.URL.Path, "/api/admin/diagnostics/") {
		a.writeSafeError(w, http.StatusNotFound, "not found")
		return false
	}
	return true
}

func (a *App) requireAdmin(w http.ResponseWriter, r *http.Request) *User {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, http.StatusForbidden, "forbidden")
		return nil
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	if user.Role != "admin" {
		a.writeSafeError(w, http.StatusForbidden, "forbidden")
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
	requestID := randomID(8)
	if !user.EmailVerified || user.Email == "" {
		a.audit.add(AuditEvent{ID: requestID, Kind: "email-test", UserID: user.ID, Status: "denied", CreatedAt: time.Now()})
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "request_id": requestID})
		return
	}
	if !a.emailAdminLimit.allow(user.ID) || !a.emailSiteLimit.allow("site") {
		a.audit.add(AuditEvent{ID: requestID, Kind: "email-test", UserID: user.ID, Status: "rate_limited", CreatedAt: time.Now()})
		writeJSON(w, http.StatusTooManyRequests, map[string]any{"error": "rate_limited", "request_id": requestID})
		return
	}

	var ignored map[string]any
	_ = json.NewDecoder(r.Body).Decode(&ignored)

	subject := "[" + siteName + "] Admin diagnostics test email"
	body := "This is an administrator diagnostics test for " + siteName + " at " + time.Now().UTC().Format(time.RFC3339) + ".\n"
	if err := a.mailer.Send(user.Email, subject, body); err != nil {
		a.audit.add(AuditEvent{ID: requestID, Kind: "email-test", UserID: user.ID, Status: "failed", CreatedAt: time.Now()})
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "request_id": requestID})
		return
	}
	a.audit.add(AuditEvent{ID: requestID, Kind: "email-test", UserID: user.ID, Status: "sent", CreatedAt: time.Now()})
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
	requestID := randomID(8)
	var body struct {
		Provider string `json:"provider"`
		Prompt   string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, http.StatusBadRequest, "invalid_request")
		return
	}
	provider := strings.ToLower(strings.TrimSpace(body.Provider))
	prompt := strings.TrimSpace(body.Prompt)
	if provider != "deepseek" && provider != "kimi" {
		a.writeSafeError(w, http.StatusBadRequest, "invalid_request")
		return
	}
	if prompt == "" || utf8.RuneCountInString(prompt) > maxPromptRunes {
		a.writeSafeError(w, http.StatusBadRequest, "invalid_request")
		return
	}
	client, ok := a.chat[provider]
	if !ok {
		a.writeSafeError(w, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.aiAdminLimit.allow(user.ID+":"+provider) || !a.aiSiteLimit.allow("site") {
		a.audit.add(AuditEvent{ID: requestID, Kind: "ai-chat-test", UserID: user.ID, Provider: provider, Status: "rate_limited", PromptLen: utf8.RuneCountInString(prompt), CreatedAt: time.Now()})
		writeJSON(w, http.StatusTooManyRequests, map[string]any{"error": "rate_limited", "request_id": requestID})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 12*time.Second)
	defer cancel()
	result, err := client.Chat(ctx, prompt)
	if err != nil {
		a.audit.add(AuditEvent{ID: requestID, Kind: "ai-chat-test", UserID: user.ID, Provider: provider, Status: "failed", PromptLen: utf8.RuneCountInString(prompt), CreatedAt: time.Now()})
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "request_id": requestID, "error": "provider_unavailable"})
		return
	}
	a.audit.add(AuditEvent{ID: requestID, Kind: "ai-chat-test", UserID: user.ID, Provider: provider, Status: "ok", PromptLen: utf8.RuneCountInString(prompt), CreatedAt: time.Now()})
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"request_id": requestID,
		"text":       sanitizeModelText(result.Text),
		"usage":      result.Usage,
	})
}
