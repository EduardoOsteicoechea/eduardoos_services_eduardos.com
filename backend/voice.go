package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

// Global voice (speech-to-text + text-to-speech) for the agent dock.
//
// Flow: the browser captures 16 kHz mono PCM and POSTs chunks to
// /api/voice/stream/{id}/chunk. The Go API feeds a self-hosted streaming STT
// worker through the STTEngine interface. The finalized transcript is sent to
// the existing /api/chat pipeline with speak:true, which streams text deltas
// plus synthesized audio (one sentence at a time) back over SSE.
//
// All engines are hidden behind interfaces so a provider can be swapped per
// site or feature without touching handlers. The feature is off unless
// VOICE_ENABLED=true.

const (
	voiceSampleRate        = 16000
	voiceDefaultChunkBytes = 256 << 10
	voiceDefaultSessionSec = 300
	voiceDefaultConcurrent = 8
	voiceMaxSpeakRunes     = 1200
	voiceMaxInterpretRunes = 2000
	voiceMaxSentenceRunes  = 600
	voiceTTSTimeout        = 20 * time.Second
	voiceIdleTimeout       = 2 * time.Minute

	voiceIPMax        = 30
	voiceUserMax      = 60
	voiceSpeakMax     = 40
	voiceInterpretMax = 60
	voiceRateSpace    = time.Hour
)

var (
	errVoiceNotFound = errors.New("voice session not found")
	errVoiceBusy     = errors.New("voice concurrency limit reached")
	errVoiceEmpty    = errors.New("voice empty text")
)

// STTSession is one streaming recognition context.
type STTSession interface {
	// Write feeds PCM audio and returns an interim (partial) hypothesis and,
	// when the recognizer finalizes a segment, the final text for that segment.
	Write(pcm []byte) (partial, final string, err error)
	// Close flushes and returns any remaining final text.
	Close() (string, error)
	// Cancel releases the session without producing more text.
	Cancel()
}

// STTEngine starts streaming recognition sessions.
type STTEngine interface {
	Start(ctx context.Context, lang string) (STTSession, error)
}

// TTSEngine synthesizes speech audio for a piece of text.
type TTSEngine interface {
	Synthesize(ctx context.Context, text, lang string) (audio []byte, mime string, err error)
}

// ---------------------------------------------------------------------------
// Deterministic fakes (tests and VOICE_FAKE_* local development)
// ---------------------------------------------------------------------------

type fakeSTTSession struct {
	mu     sync.Mutex
	bytes  int
	closed bool
	final  string
}

func (s *fakeSTTSession) Write(pcm []byte) (string, string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return "", "", nil
	}
	s.bytes += len(pcm)
	if s.bytes == 0 {
		return "", "", nil
	}
	return "…", "", nil
}

func (s *fakeSTTSession) Close() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.closed = true
	if strings.TrimSpace(s.final) == "" {
		return "transcripción simulada", nil
	}
	return s.final, nil
}

func (s *fakeSTTSession) Cancel() {
	s.mu.Lock()
	s.closed = true
	s.mu.Unlock()
}

type fakeSTTEngine struct{ final string }

func (e fakeSTTEngine) Start(_ context.Context, _ string) (STTSession, error) {
	return &fakeSTTSession{final: e.final}, nil
}

type fakeTTSEngine struct{}

func (fakeTTSEngine) Synthesize(_ context.Context, _, _ string) ([]byte, string, error) {
	return []byte("ID3voice"), "audio/mpeg", nil
}

// ---------------------------------------------------------------------------
// Session manager
// ---------------------------------------------------------------------------

type voiceSession struct {
	id        string
	lang      string
	stt       STTSession
	createdAt time.Time
	lastUsed  time.Time
	text      string
	mu        sync.Mutex
}

type voiceManager struct {
	mu          sync.Mutex
	sessions    map[string]*voiceSession
	engine      STTEngine
	maxSessions int
	maxSession  time.Duration
	log         *slog.Logger
	mustLog     bool
	stopCh      chan struct{}
}

func newVoiceManager(engine STTEngine, maxSessions int, maxSession time.Duration, log *slog.Logger, mustLog bool) *voiceManager {
	if maxSessions <= 0 {
		maxSessions = voiceDefaultConcurrent
	}
	if maxSession <= 0 {
		maxSession = voiceDefaultSessionSec * time.Second
	}
	m := &voiceManager{
		sessions:    map[string]*voiceSession{},
		engine:      engine,
		maxSessions: maxSessions,
		maxSession:  maxSession,
		log:         log,
		mustLog:     mustLog,
		stopCh:      make(chan struct{}),
	}
	go m.sweeper()
	return m
}

func (m *voiceManager) sweeper() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-m.stopCh:
			return
		case <-ticker.C:
			m.mu.Lock()
			m.sweepLocked(time.Now())
			m.mu.Unlock()
		}
	}
}

func (m *voiceManager) sweepLocked(now time.Time) {
	for id, s := range m.sessions {
		s.mu.Lock()
		expired := now.Sub(s.createdAt) > m.maxSession || now.Sub(s.lastUsed) > voiceIdleTimeout
		s.mu.Unlock()
		if expired {
			s.stt.Cancel()
			delete(m.sessions, id)
			if m.mustLog && m.log != nil {
				m.log.Info("voice.session.swept", "stream_id", id, "lang", s.lang)
			}
		}
	}
}

func (m *voiceManager) Start(ctx context.Context, lang string) (string, error) {
	m.mu.Lock()
	m.sweepLocked(time.Now())
	if len(m.sessions) >= m.maxSessions {
		m.mu.Unlock()
		return "", errVoiceBusy
	}
	m.mu.Unlock()

	stt, err := m.engine.Start(ctx, lang)
	if err != nil {
		return "", err
	}
	id := randomID(20)
	now := time.Now()
	m.mu.Lock()
	m.sessions[id] = &voiceSession{id: id, lang: lang, stt: stt, createdAt: now, lastUsed: now}
	m.mu.Unlock()
	if m.mustLog && m.log != nil {
		m.log.Info("voice.session.start", "stream_id", id, "lang", lang)
	}
	return id, nil
}

func (m *voiceManager) get(id string) *voiceSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.sessions[id]
}

func (m *voiceManager) Write(id string, pcm []byte) (partial, final, text string, err error) {
	s := m.get(id)
	if s == nil {
		return "", "", "", errVoiceNotFound
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if time.Since(s.createdAt) > m.maxSession {
		s.stt.Cancel()
		return "", "", s.text, errVoiceNotFound
	}
	partial, final, err = s.stt.Write(pcm)
	if err != nil {
		return partial, final, s.text, err
	}
	if final != "" {
		s.text = appendVoiceText(s.text, final)
	}
	s.lastUsed = time.Now()
	return partial, final, s.text, nil
}

func (m *voiceManager) Stop(id string) (string, error) {
	m.mu.Lock()
	s := m.sessions[id]
	if s != nil {
		delete(m.sessions, id)
	}
	m.mu.Unlock()
	if s == nil {
		return "", errVoiceNotFound
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	final, err := s.stt.Close()
	if final != "" {
		s.text = appendVoiceText(s.text, final)
	}
	return s.text, err
}

func (m *voiceManager) Cancel(id string) error {
	m.mu.Lock()
	s := m.sessions[id]
	if s != nil {
		delete(m.sessions, id)
	}
	m.mu.Unlock()
	if s == nil {
		return errVoiceNotFound
	}
	s.stt.Cancel()
	return nil
}

func appendVoiceText(current, extra string) string {
	extra = strings.TrimSpace(extra)
	if extra == "" {
		return current
	}
	if strings.TrimSpace(current) == "" {
		return extra
	}
	return current + " " + extra
}

func (m *voiceManager) Close() {
	select {
	case <-m.stopCh:
	default:
		close(m.stopCh)
	}
	m.mu.Lock()
	for id, s := range m.sessions {
		s.stt.Cancel()
		delete(m.sessions, id)
	}
	m.mu.Unlock()
}

// ---------------------------------------------------------------------------
// Sentence streamer (used by the chat SSE pipeline for TTS)
// ---------------------------------------------------------------------------

type voiceSentenceStreamer struct {
	pending strings.Builder
	seq     int
}

func (s *voiceSentenceStreamer) nextSeq() int {
	s.seq++
	return s.seq
}

// push appends a text delta and returns any complete sentences now available.
func (s *voiceSentenceStreamer) push(delta string) []string {
	s.pending.WriteString(delta)
	text := s.pending.String()
	var out []string
	for {
		idx := firstVoiceSentenceEnd(text)
		if idx < 0 {
			break
		}
		end := idx + 1
		sentence := strings.TrimSpace(text[:end])
		if sentence != "" {
			out = append(out, sentence)
		}
		text = text[end:]
	}
	for utf8.RuneCountInString(text) > voiceMaxSentenceRunes {
		cut := voiceRunawayCut(text)
		if cut <= 0 {
			break
		}
		sentence := strings.TrimSpace(text[:cut])
		if sentence != "" {
			out = append(out, sentence)
		}
		text = text[cut:]
	}
	s.pending.Reset()
	s.pending.WriteString(text)
	return out
}

// flush returns any trailing text that never hit a sentence terminator.
func (s *voiceSentenceStreamer) flush() string {
	out := strings.TrimSpace(s.pending.String())
	s.pending.Reset()
	return out
}

func firstVoiceSentenceEnd(s string) int {
	for i := 0; i < len(s); i++ {
		switch s[i] {
		case '.', '!', '?', '\n':
			// Keep decimal numbers such as 3.14 in one sentence.
			if s[i] == '.' && i > 0 && i+1 < len(s) && isASCIIDigit(s[i-1]) && isASCIIDigit(s[i+1]) {
				continue
			}
			return i
		}
	}
	return -1
}

func voiceRunawayCut(s string) int {
	lastSpace := -1
	count := 0
	for i, r := range s {
		if count >= voiceMaxSentenceRunes {
			if lastSpace > 0 {
				return lastSpace
			}
			return i
		}
		if r == ' ' {
			lastSpace = i
		}
		count++
	}
	return -1
}

func isASCIIDigit(b byte) bool {
	return b >= '0' && b <= '9'
}

func normalizeVoiceLang(raw, fallback string) string {
	v := strings.ToLower(strings.TrimSpace(raw))
	if strings.HasPrefix(v, "en") {
		return "en"
	}
	if strings.HasPrefix(v, "es") {
		return "es"
	}
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(fallback)), "en") {
		return "en"
	}
	return "es"
}

// ---------------------------------------------------------------------------
// Engine resolution
// ---------------------------------------------------------------------------

func resolveVoice(cfg config, log *slog.Logger) (*voiceManager, STTEngine, TTSEngine) {
	if !cfg.VoiceEnabled {
		return nil, nil, nil
	}
	var stt STTEngine
	if cfg.VoiceFakeSTT {
		stt = fakeSTTEngine{}
	} else {
		stt = newHTTPSTTEngine(cfg.VoiceSTTURL)
	}
	var tts TTSEngine
	if cfg.VoiceFakeTTS {
		tts = fakeTTSEngine{}
	} else {
		tts = newPiperTTSEngine(cfg)
	}
	maxSession := time.Duration(cfg.VoiceMaxSessionSeconds) * time.Second
	mgr := newVoiceManager(stt, cfg.VoiceMaxConcurrent, maxSession, log, cfg.MustLog)
	return mgr, stt, tts
}

// ---------------------------------------------------------------------------
// HTTP handlers
// ---------------------------------------------------------------------------

func (a *App) registerVoiceRoutes(mux *http.ServeMux) {
	if a.voice == nil {
		return
	}
	mux.HandleFunc("GET /api/voice/config", a.voiceConfigHandler)
	mux.HandleFunc("POST /api/voice/stream", a.voiceStartHandler)
	mux.HandleFunc("POST /api/voice/stream/{id}/chunk", a.voiceChunkHandler)
	mux.HandleFunc("POST /api/voice/stream/{id}/stop", a.voiceStopHandler)
	mux.HandleFunc("POST /api/voice/stream/{id}/cancel", a.voiceCancelHandler)
	mux.HandleFunc("POST /api/voice/speak", a.voiceSpeakHandler)
	mux.HandleFunc("POST /api/voice/interpret", a.voiceInterpretHandler)
}

// voiceInterpretBasePrompt turns a raw ASR transcript into a clean,
// context-aware user message. It must not answer the message.
const voiceInterpretBasePrompt = "You normalize speech-to-text output for an assistant. " +
	"Rewrite the user's raw transcript into a clear, faithful message. " +
	"Rules: fix obvious ASR errors, accents, punctuation, and casing; " +
	"use the conversation history to resolve ambiguity and context; " +
	"keep the user's meaning and language; do NOT answer the question; " +
	"do NOT add facts, commentary, or greetings; " +
	"return ONLY the corrected message text."

// voiceInterpretSystemPrompt adds the site topic so domain terms are fixed
// correctly (e.g. product names) without answering.
func (a *App) voiceInterpretSystemPrompt() string {
	var b strings.Builder
	b.WriteString(voiceInterpretBasePrompt)
	site := strings.TrimSpace(websiteContextCorpus)
	if site != "" {
		b.WriteString("\n\n---\n\n# SITE_TOPIC\n\n")
		b.WriteString("Context about this website, for fixing domain terms only. Do not answer from it.\n\n")
		b.WriteString(clipRunes(site, 8000))
	}
	return b.String()
}

func clipRunes(s string, max int) string {
	if max <= 0 || utf8.RuneCountInString(s) <= max {
		return s
	}
	return string([]rune(s)[:max])
}

func (a *App) voiceInterpretHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	rid := requestIDFrom(r, w)
	ip := clientIP(r.RemoteAddr)
	userID := a.voiceUserID(r)
	if !a.voiceInterpret.allow(ip) || (userID != "" && !a.voiceUserLimit.allow(userID)) {
		a.voiceDebug("voice.interpret", "request_id", rid, "status", "rate_limited", "user_id", userID)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	var body struct {
		Text    string           `json:"text"`
		Lang    string           `json:"lang"`
		History []publicChatTurn `json:"history"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 32<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	raw := strings.TrimSpace(body.Text)
	if raw == "" || utf8.RuneCountInString(raw) > voiceMaxInterpretRunes {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	client, ok := a.chat[publicChatProvider]
	if !ok {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	history := sanitizeChatTurns(body.History)
	history = append(history, ChatMessage{Role: "user", Content: raw})
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	result, err := client.Complete(ctx, a.voiceInterpretSystemPrompt(), history)
	if err != nil {
		a.voiceDebugErr("voice.interpret_failed", "request_id", rid, "cause", redactLogValue(err.Error()))
		a.auditEvent(r, "voice_interpret", "failed", userID)
		// Never block the user: fall back to the raw transcript.
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "text": raw, "fallback": true})
		return
	}
	clean := sanitizeModelTextMax(result.Text, voiceMaxInterpretRunes)
	if clean == "" {
		clean = raw
	}
	a.voiceDebug("voice.interpret",
		"request_id", rid,
		"status", "ok",
		"in_runes", utf8.RuneCountInString(raw),
		"out_runes", utf8.RuneCountInString(clean),
	)
	a.auditEvent(r, "voice_interpret", "ok", userID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "text": clean})
}

func (a *App) voiceConfigHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled":     true,
		"sampleRate":  voiceSampleRate,
		"langs":       []string{"es", "en"},
		"defaultLang": normalizeVoiceLang(a.cfg.VoiceSTTLangDefault, "es"),
	})
}

func (a *App) voiceMaxChunkBytes() int64 {
	if a.cfg.VoiceMaxChunkBytes > 0 {
		return a.cfg.VoiceMaxChunkBytes
	}
	return voiceDefaultChunkBytes
}

// voiceDebug writes bounded diagnostics only when MUST_LOG is on. It must never
// receive transcripts or audio, only ids, counts, durations, and mapped causes.
func (a *App) voiceDebug(msg string, args ...any) {
	if a.cfg.MustLog && a.log != nil {
		a.log.Info(msg, args...)
	}
}

func (a *App) voiceDebugErr(msg string, args ...any) {
	if a.log != nil {
		a.log.Error(msg, args...)
	}
}

func (a *App) voiceUserID(r *http.Request) string {
	if user := a.currentUser(r); user != nil {
		return user.ID
	}
	return ""
}

func (a *App) voiceStartHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	rid := requestIDFrom(r, w)
	ip := clientIP(r.RemoteAddr)
	userID := a.voiceUserID(r)
	if !a.voiceIPLimit.allow(ip) || (userID != "" && !a.voiceUserLimit.allow(userID)) {
		a.voiceDebug("voice.stream.start", "request_id", rid, "status", "rate_limited", "user_id", userID)
		a.auditEvent(r, "voice_stream", "rate_limited", userID)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	var body struct {
		Lang string `json:"lang"`
	}
	if r.Body != nil {
		_ = json.NewDecoder(io.LimitReader(r.Body, 4<<10)).Decode(&body)
	}
	lang := normalizeVoiceLang(body.Lang, a.cfg.VoiceSTTLangDefault)
	id, err := a.voice.Start(r.Context(), lang)
	if err != nil {
		if errors.Is(err, errVoiceBusy) {
			a.voiceDebug("voice.stream.start", "request_id", rid, "status", "busy", "lang", lang, "user_id", userID)
			a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
			return
		}
		a.voiceDebugErr("voice.stream.start_failed", "request_id", rid, "lang", lang, "user_id", userID, "cause", redactLogValue(err.Error()))
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	a.voiceDebug("voice.stream.start", "request_id", rid, "status", "ok", "stream_id", id, "lang", lang, "user_id", userID)
	a.auditEvent(r, "voice_stream", "started", userID)
	writeJSON(w, http.StatusOK, map[string]any{
		"streamId":   id,
		"lang":       lang,
		"sampleRate": voiceSampleRate,
	})
}

func (a *App) voiceChunkHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	rid := requestIDFrom(r, w)
	start := time.Now()
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.voiceDebug("voice.stream.chunk", "request_id", rid, "status", "invalid_request", "reason", "missing_id")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	max := a.voiceMaxChunkBytes()
	body, err := io.ReadAll(io.LimitReader(r.Body, max+1))
	if err != nil {
		a.voiceDebugErr("voice.stream.chunk_failed", "request_id", rid, "stream_id", id, "reason", "read_body", "cause", redactLogValue(err.Error()))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if int64(len(body)) > max {
		a.voiceDebug("voice.stream.chunk", "request_id", rid, "stream_id", id, "status", "payload_too_large", "bytes", len(body), "limit", max)
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	if len(body) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	partial, final, text, err := a.voice.Write(id, body)
	if err != nil {
		if errors.Is(err, errVoiceNotFound) {
			a.voiceDebug("voice.stream.chunk", "request_id", rid, "stream_id", id, "status", "not_found")
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.voiceDebugErr("voice.stream.chunk_failed", "request_id", rid, "stream_id", id, "bytes", len(body), "cause", redactLogValue(err.Error()))
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	a.voiceDebug("voice.stream.chunk",
		"request_id", rid,
		"stream_id", id,
		"status", "ok",
		"bytes", len(body),
		"partial_runes", utf8.RuneCountInString(partial),
		"final_runes", utf8.RuneCountInString(final),
		"text_runes", utf8.RuneCountInString(text),
		"duration_ms", time.Since(start).Milliseconds(),
	)
	writeJSON(w, http.StatusOK, map[string]any{
		"partial": partial,
		"final":   final,
		"text":    text,
	})
}

func (a *App) voiceStopHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	rid := requestIDFrom(r, w)
	start := time.Now()
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	text, err := a.voice.Stop(id)
	if err != nil {
		if errors.Is(err, errVoiceNotFound) {
			a.voiceDebug("voice.stream.stop", "request_id", rid, "stream_id", id, "status", "not_found")
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.voiceDebugErr("voice.stream.stop_failed", "request_id", rid, "stream_id", id, "cause", redactLogValue(err.Error()))
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	a.voiceDebug("voice.stream.stop",
		"request_id", rid,
		"stream_id", id,
		"status", "ok",
		"text_runes", utf8.RuneCountInString(text),
		"duration_ms", time.Since(start).Milliseconds(),
	)
	a.auditEvent(r, "voice_stream", "stopped", a.voiceUserID(r))
	writeJSON(w, http.StatusOK, map[string]any{"text": text})
}

func (a *App) voiceCancelHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	rid := requestIDFrom(r, w)
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if err := a.voice.Cancel(id); err != nil && !errors.Is(err, errVoiceNotFound) {
		a.voiceDebugErr("voice.stream.cancel_failed", "request_id", rid, "stream_id", id, "cause", redactLogValue(err.Error()))
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	a.voiceDebug("voice.stream.cancel", "request_id", rid, "stream_id", id, "status", "ok")
	writeJSON(w, http.StatusOK, map[string]any{"cancelled": true})
}

func (a *App) voiceSpeakHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	rid := requestIDFrom(r, w)
	start := time.Now()
	if a.voiceTTS == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	ip := clientIP(r.RemoteAddr)
	userID := a.voiceUserID(r)
	if !a.voiceSpeakLimit.allow(ip) || (userID != "" && !a.voiceUserLimit.allow(userID)) {
		a.voiceDebug("voice.speak", "request_id", rid, "status", "rate_limited", "user_id", userID)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	var body struct {
		Text string `json:"text"`
		Lang string `json:"lang"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 32<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	text := strings.TrimSpace(body.Text)
	if text == "" || utf8.RuneCountInString(text) > voiceMaxSpeakRunes {
		a.voiceDebug("voice.speak", "request_id", rid, "status", "invalid_request", "text_runes", utf8.RuneCountInString(text))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	lang := normalizeVoiceLang(body.Lang, a.cfg.VoiceSTTLangDefault)
	ctx, cancel := context.WithTimeout(r.Context(), voiceTTSTimeout)
	defer cancel()
	audio, mime, err := a.voiceTTS.Synthesize(ctx, text, lang)
	if err != nil || len(audio) == 0 {
		a.voiceDebugErr("voice.speak_failed", "request_id", rid, "lang", lang, "text_runes", utf8.RuneCountInString(text), "cause", voiceCause(err))
		a.auditEvent(r, "voice_speak", "failed", userID)
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	if strings.TrimSpace(mime) == "" {
		mime = "audio/mpeg"
	}
	a.voiceDebug("voice.speak", "request_id", rid, "status", "ok", "lang", lang, "text_runes", utf8.RuneCountInString(text), "bytes", len(audio), "duration_ms", time.Since(start).Milliseconds())
	a.auditEvent(r, "voice_speak", "ok", userID)
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(audio)
}

// emitVoiceAudio synthesizes one sentence and writes an SSE audio event.
// It never fails the request: audio is best-effort on top of the text stream.
func (a *App) emitVoiceAudio(ctx context.Context, w http.ResponseWriter, lang string, s *voiceSentenceStreamer, sentence string) {
	if a.voiceTTS == nil || strings.TrimSpace(sentence) == "" {
		return
	}
	seq := s.nextSeq()
	start := time.Now()
	tctx, cancel := context.WithTimeout(ctx, voiceTTSTimeout)
	defer cancel()
	audio, mime, err := a.voiceTTS.Synthesize(tctx, sentence, lang)
	if err != nil || len(audio) == 0 {
		a.voiceDebugErr("voice.chat.audio_failed", "lang", lang, "seq", seq, "text_runes", utf8.RuneCountInString(sentence), "cause", voiceCause(err))
		return
	}
	if strings.TrimSpace(mime) == "" {
		mime = "audio/mpeg"
	}
	a.voiceDebug("voice.chat.audio", "seq", seq, "lang", lang, "text_runes", utf8.RuneCountInString(sentence), "bytes", len(audio), "duration_ms", time.Since(start).Milliseconds())
	_ = writeSSE(w, map[string]any{
		"type": "audio",
		"seq":  seq,
		"mime": mime,
		"data": base64.StdEncoding.EncodeToString(audio),
	})
}

func voiceCause(err error) string {
	if err == nil {
		return "empty_audio"
	}
	return redactLogValue(err.Error())
}
