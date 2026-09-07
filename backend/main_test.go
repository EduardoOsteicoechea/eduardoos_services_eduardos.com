package main

import (
	"bytes"
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

func TestHealth(t *testing.T) {
	app := newTestApp(true)
	for _, path := range []string{"/health", "/api/health"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		app.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: expected HTTP 200, got %d", path, rec.Code)
		}
		var body map[string]string
		if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
			t.Fatalf("%s: invalid JSON: %v", path, err)
		}
		if body["status"] != "ok" {
			t.Fatalf("%s: expected status ok, got %q", path, body["status"])
		}
	}
}

func TestListenAddrIsLoopback(t *testing.T) {
	cfg := loadConfig()
	if !strings.HasPrefix(cfg.ListenAddr, "127.0.0.1:") {
		t.Fatalf("API must bind to 127.0.0.1, got %q", cfg.ListenAddr)
	}
}

func TestInfo(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/info", nil)
	rec := httptest.NewRecorder()
	newTestApp(false).Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d", rec.Code)
	}
}

func TestAuthMeUnauthorized(t *testing.T) {
	app := newTestApp(true)
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
	assertNoSecrets(t, rec.Body.String())
}

func TestAdminMe(t *testing.T) {
	app := newTestApp(true)
	rec := httptest.NewRecorder()
	admin := app.mustUser("admin@eduardoos.com")
	if _, err := app.issueSession(rec, admin); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(req, rec)
	got := httptest.NewRecorder()
	app.Handler().ServeHTTP(got, req)
	if got.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", got.Code)
	}
	var body map[string]any
	if err := json.NewDecoder(got.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["role"] != "admin" {
		t.Fatalf("expected admin role, got %v", body["role"])
	}
}

func TestDiagnosticsDisabledIs404(t *testing.T) {
	app := newTestApp(false)
	req, rec := app.adminPOST(t, "/api/admin/diagnostics/email-test", `{}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d body %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(strings.ToLower(rec.Body.String()), `"error":"not_found"`) {
		t.Fatalf("expected generic not_found, got %s", rec.Body.String())
	}
	assertNoSecrets(t, rec.Body.String())
}

func TestDiagnosticsRequiresAuth(t *testing.T) {
	app := newTestApp(true)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/diagnostics/email-test", bytes.NewBufferString(`{}`))
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", "nope")
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden && rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 or 403, got %d", rec.Code)
	}
}

func TestDiagnosticsRequiresAdmin(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.memberPOST(t, "/api/admin/diagnostics/email-test", `{}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestDiagnosticsRequiresCSRF(t *testing.T) {
	app := newTestApp(true)
	admin := app.mustUser("admin@eduardoos.com")
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, admin); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/admin/diagnostics/email-test", bytes.NewBufferString(`{}`))
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	copyCookies(req, seed)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rec.Code)
	}
}

func TestEmailGoesOnlyToAdmin(t *testing.T) {
	app := newTestApp(true)
	mailer := app.mailer.(*recordingMailer)
	req, rec := app.adminPOST(t, "/api/admin/diagnostics/email-test", `{"email":"attacker@example.com","to":"attacker@example.com"}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	if mailer.Last().To != "admin@eduardoos.com" {
		t.Fatalf("mail must go only to admin, got %q", mailer.Last().To)
	}
	if mailer.sends != 1 {
		t.Fatalf("expected one send, got %d", mailer.sends)
	}
	assertNoSecrets(t, rec.Body.String())
	for _, event := range app.audit.all() {
		if strings.Contains(event.Status, "@") || strings.Contains(strings.ToLower(event.Kind), "smtp") {
			t.Fatalf("audit leaked sensitive data: %+v", event)
		}
	}
}

func TestEmailRateLimit(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.adminPOST(t, "/api/admin/diagnostics/email-test", `{}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("first send: %d %s", rec.Code, rec.Body.String())
	}
	req2, rec2 := app.adminPOST(t, "/api/admin/diagnostics/email-test", `{}`)
	app.Handler().ServeHTTP(rec2, req2)
	if rec2.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec2.Code)
	}
}

func TestAIProviderSelectionAndLimit(t *testing.T) {
	app := newTestApp(true)
	deepseek := app.chat["deepseek"].(*recordingChat)
	kimi := app.chat["kimi"].(*recordingChat)

	req, rec := app.adminPOST(t, "/api/admin/diagnostics/ai-chat-test", `{"provider":"deepseek","prompt":"ping"}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("deepseek: %d %s", rec.Code, rec.Body.String())
	}
	if deepseek.calls != 1 || kimi.calls != 0 {
		t.Fatalf("expected only deepseek, deepseek=%d kimi=%d", deepseek.calls, kimi.calls)
	}

	bad, badRec := app.adminPOST(t, "/api/admin/diagnostics/ai-chat-test", `{"provider":"openai","prompt":"ping"}`)
	app.Handler().ServeHTTP(badRec, bad)
	if badRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unknown provider, got %d", badRec.Code)
	}

	long := strings.Repeat("x", maxPromptRunes+1)
	payload, _ := json.Marshal(map[string]string{"provider": "kimi", "prompt": long})
	lim, limRec := app.adminPOST(t, "/api/admin/diagnostics/ai-chat-test", string(payload))
	app.Handler().ServeHTTP(limRec, lim)
	if limRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for long prompt, got %d", limRec.Code)
	}

	ok, okRec := app.adminPOST(t, "/api/admin/diagnostics/ai-chat-test", `{"provider":"kimi","prompt":"hello"}`)
	app.Handler().ServeHTTP(okRec, ok)
	if okRec.Code != http.StatusOK {
		t.Fatalf("kimi: %d %s", okRec.Code, okRec.Body.String())
	}
	if kimi.calls != 1 {
		t.Fatalf("expected kimi call")
	}
	var body map[string]any
	if err := json.NewDecoder(okRec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["text"] != "kimi-ok" {
		t.Fatalf("unexpected text %v", body["text"])
	}
	assertNoSecrets(t, okRec.Body.String())
}

func TestAIProviderFailureIsSafe(t *testing.T) {
	app := newTestApp(true)
	app.chat["deepseek"].(*recordingChat).fail = true
	req, rec := app.adminPOST(t, "/api/admin/diagnostics/ai-chat-test", `{"provider":"deepseek","prompt":"ping"}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 generic failure, got %d", rec.Code)
	}
	raw := rec.Body.String()
	if strings.Contains(raw, "secret") || strings.Contains(raw, "sk-") || strings.Contains(strings.ToLower(raw), "smtp") {
		t.Fatalf("unsafe error: %s", raw)
	}
	if !strings.Contains(raw, "provider_unavailable") {
		t.Fatalf("expected provider_unavailable, got %s", raw)
	}
}

func TestUnverifiedEmailIsNotSent(t *testing.T) {
	app := newTestApp(true)
	admin := app.mustUser("admin@eduardoos.com")
	admin.EmailVerified = false
	if err := app.store.UpdateUser(context.Background(), admin); err != nil {
		t.Fatal(err)
	}
	mailer := app.mailer.(*recordingMailer)
	req, rec := app.adminPOST(t, "/api/admin/diagnostics/email-test", `{}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if mailer.sends != 0 {
		t.Fatalf("must not send to unverified email")
	}
}

func newTestApp(enable bool) *App {
	cfg := config{
		ListenAddr:        "127.0.0.1:8081",
		MongoDatabase:     mongoDatabase,
		JWTSecret:         "test-jwt-secret-not-for-production",
		JWTIssuer:         jwtIssuer,
		JWTAudience:       jwtAudience,
		AppEnv:            "production",
		EnableDiagnostics: enable,
		MediaRoot:         filepath.Join(os.TempDir(), "eduardoos-media-test-"+randomID(6)),
		EreportMediaRoot:  "",
		EreportMaxImageBytes:   defaultMaxImageBytes,
		EreportMaxImageEdge:    defaultMaxImageEdge,
		EreportMaxPayloadBytes: defaultMaxPayloadBytes,
		AllowedOrigins:    []string{"https://eduardoos.com", "http://127.0.0.1:4321"},
		DeepSeekBaseURL:   "https://api.deepseek.com",
		DeepSeekModel:     "deepseek-v4-flash",
		KimiBaseURL:       "https://api.moonshot.ai/v1",
		KimiModel:         "kimi-k2.6",
	}
	app := newApp(cfg)
	app.mailer = &recordingMailer{}
	app.chat["deepseek"] = &recordingChat{provider: "deepseek", text: "deepseek-ok", usage: ChatUsage{PromptTokens: 1, CompletionTokens: 1}}
	app.chat["kimi"] = &recordingChat{provider: "kimi", text: "kimi-ok", usage: ChatUsage{PromptTokens: 1, CompletionTokens: 2}}
	hash, err := hashPassword("correct-horse-battery")
	if err != nil {
		panic(err)
	}
	now := time.Now().UTC()
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "admin-1", Email: "admin@eduardoos.com", EmailNormalized: "admin@eduardoos.com",
		Username: "siteadmin", UsernameNormalized: "siteadmin", PasswordHash: hash,
		Role: roleAdmin, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "member-1", Email: "member@eduardoos.com", EmailNormalized: "member@eduardoos.com",
		Username: "member", UsernameNormalized: "member", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	return app
}

func (a *App) mustUser(email string) *User {
	user, err := a.store.UserByEmail(context.Background(), strings.ToLower(email))
	if err != nil {
		panic("missing user")
	}
	return user
}

func copyCookies(req *http.Request, rec *httptest.ResponseRecorder) {
	for _, cookie := range rec.Result().Cookies() {
		req.AddCookie(cookie)
	}
}

func (a *App) adminPOST(t *testing.T, path, body string) (*http.Request, *httptest.ResponseRecorder) {
	t.Helper()
	return a.authedPOST(t, "admin@eduardoos.com", path, body)
}

func (a *App) memberPOST(t *testing.T, path, body string) (*http.Request, *httptest.ResponseRecorder) {
	t.Helper()
	return a.authedPOST(t, "member@eduardoos.com", path, body)
}

func (a *App) authedPOST(t *testing.T, email, path, body string) (*http.Request, *httptest.ResponseRecorder) {
	t.Helper()
	seed := httptest.NewRecorder()
	sess, err := a.issueSession(seed, a.mustUser(email))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", a.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(req, seed)
	return req, httptest.NewRecorder()
}

func assertNoSecrets(t *testing.T, raw string) {
	t.Helper()
	lower := strings.ToLower(raw)
	for _, needle := range []string{"smtp_password", "mongo_uri", "mongodb+srv", "sk-", "deepseek_api_key", "kimi_api_key", "jwt_secret", "correct-horse-battery", "test-jwt-secret"} {
		if strings.Contains(lower, needle) {
			t.Fatalf("response leaked %q: %s", needle, raw)
		}
	}
}

func TestLimiterWindow(t *testing.T) {
	lim := newLimiter(time.Hour, 1)
	if !lim.allow("a") || lim.allow("a") {
		t.Fatal("limiter should allow once")
	}
}
