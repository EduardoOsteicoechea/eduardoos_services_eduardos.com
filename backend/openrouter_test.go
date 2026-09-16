package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOpenRouterClientSetsAttributionHeaders(t *testing.T) {
	var gotAuth, gotReferer, gotTitle, gotModel string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotReferer = r.Header.Get("HTTP-Referer")
		gotTitle = r.Header.Get("X-Title")
		raw, _ := io.ReadAll(r.Body)
		var payload map[string]any
		_ = json.Unmarshal(raw, &payload)
		if model, ok := payload["model"].(string); ok {
			gotModel = model
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"ok"}}],"usage":{"prompt_tokens":1,"completion_tokens":1}}`))
	}))
	t.Cleanup(srv.Close)

	client := newOpenRouterClient("or-test-key", "", "", srv.URL, srv.Client())
	result, err := client.Complete(t.Context(), "sys", []ChatMessage{{Role: "user", Content: "hi"}})
	if err != nil {
		t.Fatalf("complete: %v", err)
	}
	if result.Text != "ok" {
		t.Fatalf("text %q", result.Text)
	}
	if gotAuth != "Bearer or-test-key" {
		t.Fatalf("authorization %q", gotAuth)
	}
	if gotReferer != "https://eduardoos.com" {
		t.Fatalf("referer %q", gotReferer)
	}
	if gotTitle != "Eduardoos" {
		t.Fatalf("title %q", gotTitle)
	}
	if gotModel != openRouterDefaultModel {
		t.Fatalf("model %q", gotModel)
	}
}

func TestOpenRouterClientEmptyKeyIsUnavailable(t *testing.T) {
	client := newOpenRouterClient("  ", "deepseek/deepseek-chat", "", "", nil)
	_, err := client.Chat(t.Context(), "ping")
	if err == nil || !strings.Contains(err.Error(), "provider unavailable") {
		t.Fatalf("expected provider unavailable, got %v", err)
	}
}

func TestOpenRouterClientVisionUsesVisionModel(t *testing.T) {
	var gotModel, gotReferer, gotAuth string
	var sawImage bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotReferer = r.Header.Get("HTTP-Referer")
		raw, _ := io.ReadAll(r.Body)
		var payload map[string]any
		_ = json.Unmarshal(raw, &payload)
		if model, ok := payload["model"].(string); ok {
			gotModel = model
		}
		sawImage = strings.Contains(string(raw), "image_url")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"página uno"}}],"usage":{"prompt_tokens":2,"completion_tokens":3}}`))
	}))
	t.Cleanup(srv.Close)

	client := newOpenRouterClient("or-test-key", "deepseek/deepseek-chat", "", srv.URL, srv.Client())
	result, err := client.CompleteVision(t.Context(), "sys", "lee esto", "image/png", []byte("png-bytes"), 256)
	if err != nil {
		t.Fatalf("vision: %v", err)
	}
	if result.Text != "página uno" {
		t.Fatalf("text %q", result.Text)
	}
	if gotAuth != "Bearer or-test-key" {
		t.Fatalf("authorization %q", gotAuth)
	}
	if gotReferer != "https://eduardoos.com" {
		t.Fatalf("referer %q", gotReferer)
	}
	if gotModel != openRouterDefaultVisionModel {
		t.Fatalf("vision model %q, want %q", gotModel, openRouterDefaultVisionModel)
	}
	if !sawImage {
		t.Fatal("expected image_url in vision payload")
	}
}
