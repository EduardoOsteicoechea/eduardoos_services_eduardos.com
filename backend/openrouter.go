package main

import (
	"net/http"
	"strings"
)

const (
	openRouterBaseURL            = "https://openrouter.ai/api/v1"
	openRouterDefaultModel       = "deepseek/deepseek-chat"
	openRouterDefaultVisionModel = "deepseek/deepseek-v4.1-flash"
)

func newOpenRouterClient(apiKey, model, visionModel, baseURL string, httpClient *http.Client) openAICompatClient {
	model = strings.TrimSpace(model)
	if model == "" {
		model = openRouterDefaultModel
	}
	visionModel = strings.TrimSpace(visionModel)
	if visionModel == "" {
		visionModel = openRouterDefaultVisionModel
	}
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = openRouterBaseURL
	}
	if httpClient == nil {
		httpClient = newHTTPClient()
	}
	return openAICompatClient{
		name:        "openrouter",
		baseURL:     baseURL,
		apiKey:      strings.TrimSpace(apiKey),
		model:       model,
		visionModel: visionModel,
		extraHeaders: map[string]string{
			"HTTP-Referer": "https://" + siteName,
			"X-Title":      displayName,
		},
		http: httpClient,
	}
}
