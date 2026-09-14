package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// httpSTTEngine talks to the self-hosted Vosk streaming worker
// (voice-worker/stt_server.py) over loopback. The worker keeps the models in
// memory and exposes one recognizer per session.
type httpSTTEngine struct {
	baseURL string
	client  *http.Client
}

func newHTTPSTTEngine(baseURL string) httpSTTEngine {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = "http://127.0.0.1:8090"
	}
	return httpSTTEngine{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 60 * time.Second},
	}
}

func (e httpSTTEngine) Start(ctx context.Context, lang string) (STTSession, error) {
	body, err := json.Marshal(map[string]string{"lang": lang})
	if err != nil {
		return nil, err
	}
	var out struct {
		ID string `json:"id"`
	}
	if err := e.post(ctx, "/sessions", body, &out); err != nil {
		return nil, err
	}
	if strings.TrimSpace(out.ID) == "" {
		return nil, fmt.Errorf("voice stt: empty session id")
	}
	return &httpSTTSession{engine: e, id: out.ID}, nil
}

func (e httpSTTEngine) post(ctx context.Context, path string, body []byte, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := e.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("voice stt: status %d", resp.StatusCode)
	}
	if out != nil {
		if err := json.Unmarshal(raw, out); err != nil {
			return err
		}
	}
	return nil
}

type httpSTTSession struct {
	engine httpSTTEngine
	id     string
	closed bool
}

func (s *httpSTTSession) Write(pcm []byte) (string, string, error) {
	if s.closed {
		return "", "", nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	var out struct {
		Partial string `json:"partial"`
		Final   string `json:"final"`
	}
	if err := s.engine.post(ctx, "/sessions/"+s.id+"/chunk", pcm, &out); err != nil {
		return "", "", err
	}
	return out.Partial, out.Final, nil
}

func (s *httpSTTSession) Close() (string, error) {
	if s.closed {
		return "", nil
	}
	s.closed = true
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	var out struct {
		Text string `json:"text"`
	}
	if err := s.engine.post(ctx, "/sessions/"+s.id+"/stop", []byte("{}"), &out); err != nil {
		return "", err
	}
	return out.Text, nil
}

func (s *httpSTTSession) Cancel() {
	if s.closed {
		return
	}
	s.closed = true
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = s.engine.post(ctx, "/sessions/"+s.id+"/cancel", []byte("{}"), nil)
}

// piperTTSEngine shells out to voice-worker/speak.py, which uses the existing
// Piper + ffmpeg toolchain from the eVoice worker.
type piperTTSEngine struct {
	python  string
	script  string
	modelES string
	modelEN string
	timeout time.Duration
}

func newPiperTTSEngine(cfg config) piperTTSEngine {
	script := cfg.VoiceTTScript
	if strings.TrimSpace(script) == "" {
		script = defaultVoiceTTSScript()
	}
	return piperTTSEngine{
		python:  cfg.VoicePython,
		script:  script,
		modelES: cfg.VoicePiperModelES,
		modelEN: cfg.VoicePiperModelEN,
		timeout: voiceTTSTimeout,
	}
}

func (e piperTTSEngine) Synthesize(ctx context.Context, text, lang string) ([]byte, string, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, "", errVoiceEmpty
	}
	py := strings.TrimSpace(e.python)
	if py == "" {
		py = "python3"
	}
	script := strings.TrimSpace(e.script)
	if script == "" {
		script = "speak.py"
	}
	dir, err := os.MkdirTemp("", "voice-tts-")
	if err != nil {
		return nil, "", err
	}
	defer os.RemoveAll(dir)
	out := filepath.Join(dir, "out.mp3")

	timeout := e.timeout
	if timeout <= 0 {
		timeout = voiceTTSTimeout
	}
	tctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	args := []string{script, "--out", out, "--lang", normalizeVoiceLang(lang, "es")}
	if strings.TrimSpace(e.modelES) != "" {
		args = append(args, "--model-es", e.modelES)
	}
	if strings.TrimSpace(e.modelEN) != "" {
		args = append(args, "--model-en", e.modelEN)
	}
	cmd := exec.CommandContext(tctx, py, args...)
	cmd.Stdin = strings.NewReader(text)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, "", fmt.Errorf("voice tts: %s", truncateVoiceErr(stderr.String()))
	}
	audio, err := os.ReadFile(out)
	if err != nil || len(audio) == 0 {
		return nil, "", fmt.Errorf("voice tts: no audio produced")
	}
	return audio, "audio/mpeg", nil
}

func truncateVoiceErr(s string) string {
	s = strings.TrimSpace(s)
	if len(s) > 200 {
		return s[:200]
	}
	return s
}

func defaultVoiceTTSScript() string {
	if v := strings.TrimSpace(os.Getenv("VOICE_TTS_SCRIPT")); v != "" {
		return v
	}
	candidates := []string{
		filepath.Join("voice-worker", "speak.py"),
		filepath.Join("backend", "voice-worker", "speak.py"),
	}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "voice-worker", "speak.py"))
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c
		}
	}
	return "speak.py"
}
