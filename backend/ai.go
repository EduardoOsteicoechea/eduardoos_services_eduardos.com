package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

type ChatUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

type ChatResult struct {
	Text  string
	Usage ChatUsage
}

type ChatMessage struct {
	Role    string
	Content string
}

type ChatClient interface {
	Chat(ctx context.Context, prompt string) (ChatResult, error)
	Complete(ctx context.Context, system string, history []ChatMessage) (ChatResult, error)
}

type recordingChat struct {
	provider   string
	text       string
	usage      ChatUsage
	fail       bool
	last       string
	lastSystem string
	lastHist   []ChatMessage
	calls      int
}

func (c *recordingChat) Chat(ctx context.Context, prompt string) (ChatResult, error) {
	return c.Complete(ctx, "connectivity-test", []ChatMessage{{Role: "user", Content: prompt}})
}

func (c *recordingChat) Complete(_ context.Context, system string, history []ChatMessage) (ChatResult, error) {
	c.calls++
	c.lastSystem = system
	c.lastHist = append([]ChatMessage(nil), history...)
	if len(history) > 0 {
		c.last = history[len(history)-1].Content
	}
	if c.fail {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	return ChatResult{Text: c.text, Usage: c.usage}, nil
}

type openAICompatClient struct {
	name    string
	baseURL string
	apiKey  string
	model   string
	http    *http.Client
}

func (c openAICompatClient) chatPayload(prompt string) map[string]any {
	payload := map[string]any{
		"model": c.model,
		"messages": []map[string]string{
			{"role": "system", "content": "You are a connectivity test. Reply in one short sentence. Do not request tools or secrets."},
			{"role": "user", "content": prompt},
		},
		"max_tokens": 256,
	}
	if c.name == "kimi" {
		// kimi-k3 rejects temperature and the k2.x thinking flag; it always reasons.
		delete(payload, "max_tokens")
		payload["max_completion_tokens"] = 256
		payload["reasoning_effort"] = "low"
		return payload
	}
	payload["temperature"] = 0.2
	return payload
}

func (c openAICompatClient) Chat(ctx context.Context, prompt string) (ChatResult, error) {
	return c.Complete(ctx, "You are a connectivity test. Reply in one short sentence. Do not request tools or secrets.", []ChatMessage{{Role: "user", Content: prompt}})
}

func (c openAICompatClient) Complete(ctx context.Context, system string, history []ChatMessage) (ChatResult, error) {
	if c.apiKey == "" {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	messages := []map[string]string{{"role": "system", "content": system}}
	for _, item := range history {
		if item.Role != "user" && item.Role != "assistant" {
			continue
		}
		content := strings.TrimSpace(item.Content)
		if content == "" {
			continue
		}
		messages = append(messages, map[string]string{"role": item.Role, "content": content})
	}
	payload := map[string]any{
		"model":      c.model,
		"messages":   messages,
		"max_tokens": 512,
	}
	if c.name == "kimi" {
		delete(payload, "max_tokens")
		payload["max_completion_tokens"] = 512
		payload["reasoning_effort"] = "low"
	} else {
		payload["temperature"] = 0.2
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	endpoint := c.baseURL + "/chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage ChatUsage `json:"usage"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil || len(parsed.Choices) == 0 {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	text := strings.TrimSpace(parsed.Choices[0].Message.Content)
	if text == "" {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	return ChatResult{Text: text, Usage: parsed.Usage}, nil
}

func sanitizeModelText(text string) string {
	var b strings.Builder
	count := 0
	for _, r := range text {
		if r < 32 && r != '\n' && r != '\t' {
			continue
		}
		b.WriteRune(r)
		count++
		if count >= 2000 {
			break
		}
	}
	out := strings.TrimSpace(b.String())
	if utf8.RuneCountInString(out) > 2000 {
		out = string([]rune(out)[:2000])
	}
	return out
}

func newHTTPClient() *http.Client {
	return &http.Client{Timeout: 45 * time.Second}
}
