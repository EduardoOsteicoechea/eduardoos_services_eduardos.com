package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"errors"
)

const (
	openRouterBaseURL = "https://openrouter.ai/api/v1"
)

type openRouterClient struct {
	apiKey string
	http   *http.Client
}

func newOpenRouterClient(apiKey string) *openRouterClient {
	return &openRouterClient{
		apiKey: strings.TrimSpace(apiKey),
		http:   newHTTPClient(),
	}
}

func (c *openRouterClient) Chat(ctx context.Context, prompt string) (ChatResult, error) {
	return c.Complete(ctx, "You are a connectivity test. Reply in one short sentence.", []ChatMessage{{Role: "user", Content: prompt}})
}

func (c *openRouterClient) Complete(ctx context.Context, system string, history []ChatMessage) (ChatResult, error) {
	return c.completeWith(ctx, system, history, 512)
}

func (c *openRouterClient) completeWith(ctx context.Context, system string, history []ChatMessage, maxTokens int) (ChatResult, error) {
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
		"model":      "deepseek/deepseek-chat",
		"messages":   messages,
		"max_tokens": maxTokens,
		"temperature": 0.7,
	}
	
	body, err := json.Marshal(payload)
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openRouterBaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "https://eduardoos.com")
	req.Header.Set("X-Title", "Eduardoos")
	
	resp, err := c.http.Do(req)
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider request failed: %w", err)
	}
	defer resp.Body.Close()
	
	// Handle rate limiting
	if resp.StatusCode == http.StatusTooManyRequests {
		return ChatResult{}, errors.New("rate_limited")
	}
	
	// Handle auth errors
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return ChatResult{}, errors.New("provider_auth_error")
	}
	
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return ChatResult{}, fmt.Errorf("provider status %d: %s", resp.StatusCode, sanitizeModelTextMax(string(raw), 300))
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

func (c *openRouterClient) Stream(ctx context.Context, system string, history []ChatMessage, emit func(string) error) (ChatResult, error) {
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
		"model":      "deepseek/deepseek-chat",
		"messages":   messages,
		"max_tokens": 512,
		"temperature": 0.7,
		"stream":     true,
	}
	
	body, err := json.Marshal(payload)
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, openRouterBaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "https://eduardoos.com")
	req.Header.Set("X-Title", "Eduardoos")
	
	resp, err := c.http.Do(req)
	if err != nil {
		return ChatResult{}, fmt.Errorf("provider unavailable")
	}
	defer resp.Body.Close()
	
	// Handle rate limiting
	if resp.StatusCode == http.StatusTooManyRequests {
		return ChatResult{}, errors.New("rate_limited")
	}
	
	// Handle auth errors
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return ChatResult{}, errors.New("provider_auth_error")
	}
	
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