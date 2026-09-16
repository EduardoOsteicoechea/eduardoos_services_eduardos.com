package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newVoiceTestApp(t *testing.T) *App {
	t.Helper()
	cfg := config{
		ListenAddr:             "127.0.0.1:8081",
		MongoDatabase:          mongoDatabase,
		JWTSecret:              "test-jwt-secret-not-for-production",
		JWTIssuer:              jwtIssuer,
		JWTAudience:            jwtAudience,
		AppEnv:                 "production",
		MustLog:                true,
		MediaRoot:              filepath.Join(os.TempDir(), "eduardoos-voice-media-"+randomID(6)),
		EreportMaxImageBytes:   defaultMaxImageBytes,
		EreportMaxImageEdge:    defaultMaxImageEdge,
		EreportMaxPayloadBytes: defaultMaxPayloadBytes,
		AllowedOrigins:         []string{"https://eduardoos.com", "http://127.0.0.1:4321"},
		DeepSeekBaseURL:        "https://api.deepseek.com",
		DeepSeekModel:          "deepseek-v4-flash",
		KimiBaseURL:            "https://api.moonshot.ai/v1",
		KimiModel:              "kimi-k3",
		VoiceEnabled:           true,
		VoiceFakeSTT:           true,
		VoiceFakeTTS:           true,
		VoiceSTTLangDefault:    "es",
		VoiceMaxConcurrent:     4,
		VoiceMaxSessionSeconds: 300,
	}
	app := newApp(cfg)
	app.mailer = &recordingMailer{}
	app.chat["deepseek"] = &recordingChat{provider: "deepseek", text: "hola. mundo. fin.", usage: ChatUsage{PromptTokens: 1, CompletionTokens: 1}}
	app.chat["openrouter"] = &recordingChat{provider: "openrouter", text: "hola. mundo. fin.", usage: ChatUsage{PromptTokens: 1, CompletionTokens: 1}}
	t.Cleanup(func() {
		if app.voice != nil {
			app.voice.Close()
		}
		_ = os.RemoveAll(cfg.MediaRoot)
	})
	return app
}

func TestVoiceManagerLifecycle(t *testing.T) {
	mgr := newVoiceManager(fakeSTTEngine{final: "hola mundo"}, 2, time.Minute, nil, false)
	defer mgr.Close()

	id, err := mgr.Start(context.Background(), "es")
	if err != nil {
		t.Fatal(err)
	}
	partial, final, text, err := mgr.Write(id, []byte{1, 2, 3, 4})
	if err != nil {
		t.Fatal(err)
	}
	if partial == "" {
		t.Fatal("expected a partial hypothesis")
	}
	if final != "" || text != "" {
		t.Fatalf("unexpected final=%q text=%q", final, text)
	}
	got, err := mgr.Stop(id)
	if err != nil {
		t.Fatal(err)
	}
	if got != "hola mundo" {
		t.Fatalf("stop text = %q", got)
	}
	if _, err := mgr.Stop(id); err == nil {
		t.Fatal("stopping an unknown session must error")
	}
}

func TestVoiceManagerConcurrencyLimit(t *testing.T) {
	mgr := newVoiceManager(fakeSTTEngine{}, 1, time.Minute, nil, false)
	defer mgr.Close()
	id, err := mgr.Start(context.Background(), "es")
	if err != nil {
		t.Fatal(err)
	}
	defer mgr.Cancel(id)
	if _, err := mgr.Start(context.Background(), "es"); err == nil {
		t.Fatal("second session must be rejected while at the concurrency limit")
	}
}

func TestVoiceDisabledRoutesAreHidden(t *testing.T) {
	app := newTestApp(false)
	req := httptest.NewRequest(http.MethodGet, "/api/voice/config", nil)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 when voice is disabled, got %d", rec.Code)
	}
}

func TestVoiceStreamRequiresCSRF(t *testing.T) {
	app := newVoiceTestApp(t)
	req := httptest.NewRequest(http.MethodPost, "/api/voice/stream", strings.NewReader(`{"lang":"es"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 without CSRF, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestVoiceStreamEndToEndFake(t *testing.T) {
	app := newVoiceTestApp(t)

	cfgReq := httptest.NewRequest(http.MethodGet, "/api/voice/config", nil)
	cfgRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(cfgRec, cfgReq)
	if cfgRec.Code != http.StatusOK || !strings.Contains(cfgRec.Body.String(), `"enabled":true`) {
		t.Fatalf("config: %d %s", cfgRec.Code, cfgRec.Body.String())
	}

	start := app.anonPOST(t, "/api/voice/stream", `{"lang":"es"}`)
	if start.Code != http.StatusOK {
		t.Fatalf("start: %d %s", start.Code, start.Body.String())
	}
	var startBody map[string]any
	if err := json.NewDecoder(start.Body).Decode(&startBody); err != nil {
		t.Fatal(err)
	}
	id, _ := startBody["streamId"].(string)
	if id == "" {
		t.Fatalf("missing streamId in %v", startBody)
	}
	if startBody["sampleRate"].(float64) != voiceSampleRate {
		t.Fatalf("unexpected sampleRate %v", startBody["sampleRate"])
	}

	chunk := app.anonPOST(t, "/api/voice/stream/"+id+"/chunk", "PCMDATA")
	if chunk.Code != http.StatusOK {
		t.Fatalf("chunk: %d %s", chunk.Code, chunk.Body.String())
	}

	stop := app.anonPOST(t, "/api/voice/stream/"+id+"/stop", "")
	if stop.Code != http.StatusOK {
		t.Fatalf("stop: %d %s", stop.Code, stop.Body.String())
	}
	if !strings.Contains(stop.Body.String(), "transcripci") {
		t.Fatalf("expected fake transcript, got %s", stop.Body.String())
	}
}

func TestVoiceChunkRejectsUnknownSession(t *testing.T) {
	app := newVoiceTestApp(t)
	rec := app.anonPOST(t, "/api/voice/stream/does-not-exist/chunk", "PCM")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestVoiceSpeakReturnsAudio(t *testing.T) {
	app := newVoiceTestApp(t)
	rec := app.anonPOST(t, "/api/voice/speak", `{"text":"hola mundo","lang":"es"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("speak: %d %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "audio/") {
		t.Fatalf("expected audio content type, got %q", ct)
	}
	if rec.Body.Len() == 0 {
		t.Fatal("expected audio bytes")
	}
}

func TestVoiceSpeakRejectsOversizedText(t *testing.T) {
	app := newVoiceTestApp(t)
	tooLong := strings.Repeat("a", voiceMaxSpeakRunes+1)
	rec := app.anonPOST(t, "/api/voice/speak", `{"text":"`+tooLong+`"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestChatSpeakStreamsAudioEvents(t *testing.T) {
	app := newVoiceTestApp(t)
	rec := app.anonPOST(t, "/api/chat", `{"message":"cuéntame","stream":true,"speak":true,"lang":"es"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("chat: %d %s", rec.Code, rec.Body.String())
	}
	raw := rec.Body.String()
	if !strings.Contains(raw, `"delta":`) {
		t.Fatalf("expected text deltas, got %s", raw)
	}
	if !strings.Contains(raw, `"type":"audio"`) || !strings.Contains(raw, `"data":`) {
		t.Fatalf("expected audio events, got %s", raw)
	}
	assertNoSecrets(t, raw)
}

func TestChatWithoutSpeakHasNoAudio(t *testing.T) {
	app := newVoiceTestApp(t)
	rec := app.anonPOST(t, "/api/chat", `{"message":"hola","stream":true}`)
	if strings.Contains(rec.Body.String(), `"type":"audio"`) {
		t.Fatal("audio events must not be emitted unless speak is requested")
	}
}

func TestVoiceSentenceStreamer(t *testing.T) {
	s := &voiceSentenceStreamer{}
	got := s.push("Hola mundo")
	if len(got) != 0 {
		t.Fatalf("incomplete sentence should not be emitted: %v", got)
	}
	got = s.push(". ¿Cómo estás? ")
	if len(got) != 2 || got[0] != "Hola mundo." || got[1] != "¿Cómo estás?" {
		t.Fatalf("unexpected sentences: %v", got)
	}
	if tail := s.flush(); tail != "" {
		t.Fatalf("expected empty tail, got %q", tail)
	}
	s.push("sin terminar")
	if tail := s.flush(); tail != "sin terminar" {
		t.Fatalf("flush = %q", tail)
	}
}

func TestFirstVoiceSentenceEndKeepsDecimals(t *testing.T) {
	if idx := firstVoiceSentenceEnd("valor 3.14 final"); idx != -1 {
		t.Fatalf("decimal point must not split a sentence, idx=%d", idx)
	}
	if idx := firstVoiceSentenceEnd("fin. siguiente"); idx != 3 {
		t.Fatalf("expected split at 3, got %d", idx)
	}
}

func TestNormalizeVoiceLang(t *testing.T) {
	cases := map[string]string{"en-US": "en", "EN": "en", "es-ES": "es", "": "es", "fr": "es"}
	for in, want := range cases {
		if got := normalizeVoiceLang(in, "es"); got != want {
			t.Fatalf("normalizeVoiceLang(%q) = %q, want %q", in, got, want)
		}
	}
	if got := normalizeVoiceLang("", "en"); got != "en" {
		t.Fatalf("fallback en not honored, got %q", got)
	}
}
