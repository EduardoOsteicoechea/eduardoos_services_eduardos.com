package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

//go:embed prompts/system.md
var siteSystemPrompt string

//go:embed prompts/PROFILE_CONTEXT.md
var profileContextCorpus string

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
	Message  string           `json:"message"`
	Question string           `json:"question"` // alias used by /api/profile/ask
	History  []publicChatTurn `json:"history"`
	Stream   bool             `json:"stream"`
}

func chatSystemPrompt() string {
	base := strings.TrimSpace(siteSystemPrompt)
	corpus := strings.TrimSpace(profileContextCorpus)
	if corpus == "" {
		return base
	}
	return base + "\n\n---\n\n# PROFILE_CONTEXT (canonical corpus)\n\n" + corpus
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

func writeSSE(w http.ResponseWriter, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "data: %s\n\n", raw); err != nil {
		return err
	}
	if flusher, ok := w.(http.Flusher); ok {
		flusher.Flush()
	}
	return nil
}

func (a *App) publicChatHandler(w http.ResponseWriter, r *http.Request) {
	a.handlePublicChat(w, r, "public-chat")
}

// profileAskHandler is an alias of public chat for the home dock (/api/profile/ask).
func (a *App) profileAskHandler(w http.ResponseWriter, r *http.Request) {
	a.handlePublicChat(w, r, "profile-ask")
}

func (a *App) handlePublicChat(w http.ResponseWriter, r *http.Request, auditKind string) {
	originOK := a.validOrigin(r)
	csrfOK := a.validCSRF(r)
	if !originOK || !csrfOK {
		a.logAuthDebug(r, "public_chat_denied",
			slog.String("audit_kind", auditKind),
			slog.Bool("origin_ok", originOK),
			slog.Bool("csrf_ok", csrfOK),
			slog.String("csrf_reason", a.csrfFailureReason(r)),
		)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	var body publicChatRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	message := strings.TrimSpace(body.Message)
	if message == "" {
		message = strings.TrimSpace(body.Question)
	}
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
		a.auditEventExtra(r, auditKind, "rate_limited", userID, publicChatProvider, utf8.RuneCountInString(message))
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	client, ok := a.chat[publicChatProvider]
	if !ok {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	systemPrompt := chatSystemPrompt()
	if a.cfg.MustLog {
		a.log.Info("chat.system_prompt",
			"request_id", requestIDFrom(r, nil),
			"kind", auditKind,
			"prompt_len", utf8.RuneCountInString(systemPrompt),
			"has_profile_corpus", strings.Contains(systemPrompt, "eduardooost@gmail.com"),
		)
	}
	history := sanitizeChatTurns(body.History)
	history = append(history, ChatMessage{Role: "user", Content: message})
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	if body.Stream {
		rid := requestIDFrom(r, w)
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		w.WriteHeader(http.StatusOK)
		result, err := client.Stream(ctx, systemPrompt, history, func(delta string) error {
			clean := sanitizeModelDelta(delta)
			if clean == "" {
				return nil
			}
			return writeSSE(w, map[string]any{"delta": clean})
		})
		if err != nil {
			a.auditEventExtra(r, auditKind, "failed", userID, publicChatProvider, utf8.RuneCountInString(message))
			_ = writeSSE(w, map[string]any{
				"ok": false, "error": "provider_unavailable",
				"request_id": rid,
				"message":    "The assistant could not reply.",
			})
			return
		}
		a.auditEventExtra(r, auditKind, "ok", userID, publicChatProvider, utf8.RuneCountInString(message))
		_ = writeSSE(w, map[string]any{
			"ok": true, "done": true,
			"request_id": rid,
			"text":       sanitizeModelText(result.Text),
		})
		return
	}
	result, err := client.Complete(ctx, systemPrompt, history)
	if err != nil {
		a.auditEventExtra(r, auditKind, "failed", userID, publicChatProvider, utf8.RuneCountInString(message))
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "error": "provider_unavailable",
			"request_id": requestIDFrom(r, w),
			"message":    "The assistant could not reply.",
		})
		return
	}
	a.auditEventExtra(r, auditKind, "ok", userID, publicChatProvider, utf8.RuneCountInString(message))
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"request_id": requestIDFrom(r, w),
		"text":       sanitizeModelText(result.Text),
	})
}
