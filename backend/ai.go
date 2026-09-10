package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
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
	Stream(ctx context.Context, system string, history []ChatMessage, emit func(string) error) (ChatResult, error)
}

// VisionChatClient is optional; DeepSeek vision uses multimodal chat completions.
type VisionChatClient interface {
	CompleteVision(ctx context.Context, system, prompt, imageMIME string, imageData []byte, maxTokens int) (ChatResult, error)
}

type recordingChat struct {
	provider   string
	text       string
	usage      ChatUsage
	fail       bool
	last       string
	lastSystem string
	lastHist   []ChatMessage
	lastMIME   string
	lastImage  int
	lastVision bool
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

func (c *recordingChat) Stream(ctx context.Context, system string, history []ChatMessage, emit func(string) error) (ChatResult, error) {
	result, err := c.Complete(ctx, system, history)
	if err != nil {
		return result, err
	}
	if emit != nil {
		if err := emit(result.Text); err != nil {
			return ChatResult{}, err
		}
	}
	return result, nil
}

func (c *recordingChat) CompleteVision(_ context.Context, system, prompt, imageMIME string, imageData []byte, _ int) (ChatResult, error) {
	c.calls++
	c.lastVision = true
	c.lastSystem = system
	c.last = prompt
	c.lastMIME = imageMIME
	c.lastImage = len(imageData)
	c.lastHist = []ChatMessage{{Role: "user", Content: prompt}}
	if c.fail {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	return ChatResult{Text: c.text, Usage: c.usage}, nil
}

type openAICompatClient struct {
	name        string
	baseURL     string
	apiKey      string
	model       string
	visionModel string
	http        *http.Client
}

func (c openAICompatClient) visionHTTP() *http.Client {
	if c.http != nil && c.http.Timeout >= 90*time.Second {
		return c.http
	}
	return &http.Client{Timeout: 120 * time.Second}
}

func (c openAICompatClient) resolveVisionModel() string {
	if strings.TrimSpace(c.visionModel) != "" {
		return strings.TrimSpace(c.visionModel)
	}
	return c.model
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

func (c openAICompatClient) Stream(ctx context.Context, system string, history []ChatMessage, emit func(string) error) (ChatResult, error) {
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
		"stream":     true,
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
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
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
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	reader := bufio.NewReader(resp.Body)
	var full strings.Builder
	for {
		line, err := reader.ReadString('\n')
		if err != nil && err != io.EOF {
			return ChatResult{}, fmt.Errorf("provider unavailable")
		}
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "data:") {
			data := strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
			if data == "[DONE]" {
				break
			}
			var parsed struct {
				Choices []struct {
					Delta struct {
						Content string `json:"content"`
					} `json:"delta"`
				} `json:"choices"`
			}
			if json.Unmarshal([]byte(data), &parsed) == nil && len(parsed.Choices) > 0 {
				delta := parsed.Choices[0].Delta.Content
				if delta != "" {
					full.WriteString(delta)
					if emit != nil {
						if err := emit(delta); err != nil {
							return ChatResult{}, err
						}
					}
				}
			}
		}
		if err == io.EOF {
			break
		}
	}
	text := sanitizeModelText(full.String())
	if text == "" {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	return ChatResult{Text: text}, nil
}

func sanitizeModelDelta(text string) string {
	var b strings.Builder
	for _, r := range text {
		if r < 32 && r != '\n' && r != '\t' {
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func sanitizeModelText(text string) string {
	return sanitizeModelTextMax(text, 2000)
}

func sanitizeModelTextMax(text string, maxRunes int) string {
	if maxRunes <= 0 {
		maxRunes = 2000
	}
	var b strings.Builder
	count := 0
	for _, r := range text {
		if r < 32 && r != '\n' && r != '\t' {
			continue
		}
		b.WriteRune(r)
		count++
		if count >= maxRunes {
			break
		}
	}
	out := strings.TrimSpace(b.String())
	if utf8.RuneCountInString(out) > maxRunes {
		out = string([]rune(out)[:maxRunes])
	}
	return out
}

func (c openAICompatClient) CompleteVision(ctx context.Context, system, prompt, imageMIME string, imageData []byte, maxTokens int) (ChatResult, error) {
	if c.apiKey == "" {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	if len(imageData) == 0 || strings.TrimSpace(imageMIME) == "" {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	if maxTokens < 64 {
		maxTokens = 64
	}
	if maxTokens > 4096 {
		maxTokens = 4096
	}
	system = strings.TrimSpace(system)
	prompt = strings.TrimSpace(prompt)
	if system == "" || prompt == "" {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	dataURL := "data:" + imageMIME + ";base64," + base64.StdEncoding.EncodeToString(imageData)
	userContent := []map[string]any{
		{"type": "text", "text": prompt},
		{"type": "image_url", "image_url": map[string]any{"url": dataURL}},
	}
	payload := map[string]any{
		"model": c.resolveVisionModel(),
		"messages": []map[string]any{
			{"role": "system", "content": system},
			{"role": "user", "content": userContent},
		},
		"max_tokens":  maxTokens,
		"temperature": 0.4,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.visionHTTP().Do(req)
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return ChatResult{}, fmt.Errorf("provider unavailable: vision status %d", resp.StatusCode)
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
		return ChatResult{}, fmt.Errorf("provider unavailable: vision empty response")
	}
	text := sanitizeModelTextMax(parsed.Choices[0].Message.Content, 12000)
	if text == "" {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	return ChatResult{Text: text, Usage: parsed.Usage}, nil
}

func newHTTPClient() *http.Client {
	return &http.Client{Timeout: 45 * time.Second}
}
