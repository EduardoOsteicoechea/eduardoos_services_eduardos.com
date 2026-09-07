package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

//go:embed prompts/system.md
var siteSystemPrompt string

const (
	maxPublicChatRunes   = 500
	maxPublicChatHistory = 8
	publicChatIPMax      = 20
	publicChatUserMax    = 40
	publicChatWindow     = time.Hour
	publicChatProvider   = "deepseek"
)

type publicChatTurn struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type publicChatRequest struct {
	Message string           `json:"message"`
	History []publicChatTurn `json:"history"`
}

func sanitizeChatTurns(raw []publicChatTurn) []ChatMessage {
	out := make([]ChatMessage, 0, maxPublicChatHistory)
	for _, item := range raw {
		if len(out) >= maxPublicChatHistory {
			break
		}
		role := strings.ToLower(strings.TrimSpace(item.Role))
		if role != "user" && role != "assistant" {
			continue
		}
		content := strings.TrimSpace(item.Content)
		if content == "" || utf8.RuneCountInString(content) > maxPublicChatRunes {
			continue
		}
		out = append(out, ChatMessage{Role: role, Content: content})
	}
	return out
}

func (a *App) publicChatHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	var body publicChatRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	message := strings.TrimSpace(body.Message)
	if message == "" || utf8.RuneCountInString(message) > maxPublicChatRunes {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	ip := clientIP(r.RemoteAddr)
	user := a.currentUser(r)
	userID := ""
	if user != nil {
		userID = user.ID
	}
	if !a.chatIPLimit.allow(ip) || (userID != "" && !a.chatUserLimit.allow(userID)) {
		a.auditEventExtra(r, "public-chat", "rate_limited", userID, publicChatProvider, utf8.RuneCountInString(message))
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	client, ok := a.chat[publicChatProvider]
	if !ok {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	history := sanitizeChatTurns(body.History)
	history = append(history, ChatMessage{Role: "user", Content: message})
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	result, err := client.Complete(ctx, siteSystemPrompt, history)
	if err != nil {
		a.auditEventExtra(r, "public-chat", "failed", userID, publicChatProvider, utf8.RuneCountInString(message))
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "error": "provider_unavailable",
			"request_id": requestIDFrom(r, w),
			"message":    "The assistant could not reply.",
		})
		return
	}
	a.auditEventExtra(r, "public-chat", "ok", userID, publicChatProvider, utf8.RuneCountInString(message))
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"request_id": requestIDFrom(r, w),
		"text":       sanitizeModelText(result.Text),
	})
}
