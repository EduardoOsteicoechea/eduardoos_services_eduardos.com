package main

import (
	"net/http"
	"strings"
)

const (
	openRouterBaseURL      = "https://openrouter.ai/api/v1"
	openRouterDefaultModel = "deepseek/deepseek-chat"
)

func newOpenRouterClient(apiKey, model, baseURL string, httpClient *http.Client) openAICompatClient {
	model = strings.TrimSpace(model)
	if model == "" {
		model = openRouterDefaultModel
	}
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = openRouterBaseURL
	}
	if httpClient == nil {
		httpClient = newHTTPClient()
	}
	return openAICompatClient{
		name:    "openrouter",
		baseURL: baseURL,
		apiKey:  strings.TrimSpace(apiKey),
		model:   model,
		extraHeaders: map[string]string{
			"HTTP-Referer": "https://" + siteName,
			"X-Title":      displayName,
		},
		http: httpClient,
	}
}
