package main

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestIDHeaderOnSuccessAndError(t *testing.T) {
	app := newTestApp(true)
	okReq := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	okRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(okRec, okReq)
	if okRec.Header().Get("X-Request-ID") == "" {
		t.Fatal("success missing X-Request-ID")
	}
	errReq := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	errReq.Header.Set("X-Request-ID", "client-req-id-01")
	errRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(errRec, errReq)
	if errRec.Header().Get("X-Request-ID") != "client-req-id-01" {
		t.Fatalf("echo request id: %q", errRec.Header().Get("X-Request-ID"))
	}
	var body map[string]any
	_ = json.NewDecoder(errRec.Body).Decode(&body)
	if body["error"] != "unauthorized" || body["message"] == nil || body["request_id"] != "client-req-id-01" {
		t.Fatalf("error contract: %+v", body)
	}
	if _, ok := body["csrf"]; ok {
		t.Fatal("401 /me must not include csrf")
	}
	if _, ok := body["debug"]; ok {
		t.Fatal("production-like tests must not include debug")
	}
	assertNoSecrets(t, errRec.Body.String())
}

func TestCSRFGuestAndAuthenticatedOK(t *testing.T) {
	app := newTestApp(true)
	guest := httptest.NewRequest(http.MethodGet, "/api/auth/csrf", nil)
	guestRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(guestRec, guest)
	if guestRec.Code != http.StatusOK {
		t.Fatalf("guest csrf: %d", guestRec.Code)
	}
	var guestBody map[string]string
	_ = json.NewDecoder(guestRec.Body).Decode(&guestBody)
	if guestBody["csrf"] == "" {
		t.Fatal("guest csrf token missing")
	}

	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	authed := httptest.NewRequest(http.MethodGet, "/api/auth/csrf", nil)
	copyCookies(authed, seed)
	authedRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(authedRec, authed)
	if authedRec.Code != http.StatusOK {
		t.Fatalf("authed csrf: %d", authedRec.Code)
	}
}

func TestGuestMeDoesNotInvalidateCSRF(t *testing.T) {
	app := newTestApp(true)
	csrfRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(csrfRec, httptest.NewRequest(http.MethodGet, "/api/auth/csrf", nil))
	var csrfBody map[string]string
	_ = json.NewDecoder(csrfRec.Body).Decode(&csrfBody)

	me := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(me, csrfRec)
	meRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(meRec, me)
	if meRec.Code != http.StatusUnauthorized {
		t.Fatalf("me: %d", meRec.Code)
	}

	login := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(`{"identifier":"member@eduardoos.com","password":"correct-horse-battery"}`))
	login.Header.Set("Content-Type", "application/json")
	login.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	login.Header.Set("X-CSRF-Token", csrfBody["csrf"])
	copyCookies(login, csrfRec)
	loginRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(loginRec, login)
	if loginRec.Code != http.StatusOK {
		t.Fatalf("login after guest me should keep csrf: %d %s", loginRec.Code, loginRec.Body.String())
	}
}

func TestSafeProductionErrorHasNoStack(t *testing.T) {
	app := newTestApp(true)
	app.cfg.AppEnv = "production"
	rec := app.anonPOST(t, "/api/auth/register", `{"email":"bad","username":"x","password":"short"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("register invalid: %d", rec.Code)
	}
	var body map[string]any
	_ = json.NewDecoder(rec.Body).Decode(&body)
	if body["error"] != "invalid_request" || body["request_id"] == "" || body["message"] == "" {
		t.Fatalf("safe error: %+v", body)
	}
	if _, ok := body["debug"]; ok {
		t.Fatal("debug leaked in production")
	}
	raw := rec.Body.String()
	if strings.Contains(raw, ".go:") || strings.Contains(strings.ToLower(raw), "stack") {
		t.Fatalf("stack leaked: %s", raw)
	}
}

func TestDevelopmentDebugDetails(t *testing.T) {
	app := newTestApp(true)
	app.cfg.AppEnv = "development"
	req := httptest.NewRequest(http.MethodGet, "/api/boom-test", nil)
	rec := httptest.NewRecorder()
	handler := aWithPanic(app)
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("panic status: %d", rec.Code)
	}
	var body map[string]any
	_ = json.NewDecoder(rec.Body).Decode(&body)
	debug, _ := body["debug"].(string)
	if debug == "" {
		t.Fatalf("expected debug in development: %+v", body)
	}
	assertNoSecrets(t, rec.Body.String())
}

func aWithPanic(app *App) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/boom-test", func(http.ResponseWriter, *http.Request) {
		panic("boom")
	})
	return app.withObservability(mux)
}

func TestAdminDiagnosticsDebug(t *testing.T) {
	app := newTestApp(true)
	app.cfg.AppEnv = "production"
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("admin@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/boom-test", func(http.ResponseWriter, *http.Request) {
		panic("boom")
	})
	req := httptest.NewRequest(http.MethodGet, "/api/boom-test", nil)
	copyCookies(req, seed)
	rec := httptest.NewRecorder()
	app.withObservability(mux).ServeHTTP(rec, req)
	var body map[string]any
	_ = json.NewDecoder(rec.Body).Decode(&body)
	if body["debug"] == nil {
		t.Fatalf("admin diagnostics should include debug: %+v", body)
	}
	assertNoSecrets(t, rec.Body.String())

	app.cfg.EnableDiagnostics = false
	req2 := httptest.NewRequest(http.MethodGet, "/api/boom-test", nil)
	copyCookies(req2, seed)
	rec2 := httptest.NewRecorder()
	app.withObservability(mux).ServeHTTP(rec2, req2)
	var body2 map[string]any
	_ = json.NewDecoder(rec2.Body).Decode(&body2)
	if _, ok := body2["debug"]; ok {
		t.Fatal("non-diagnostics production admin must not receive debug")
	}
}

func TestRedactLogValue(t *testing.T) {
	raw := redactLogValue("mongodb+srv://user:secret@host/db password=hunter2 Authorization: Bearer eyJabc.def")
	lower := strings.ToLower(raw)
	if strings.Contains(lower, "secret") || strings.Contains(lower, "hunter2") || strings.Contains(lower, "eyjabc") {
		t.Fatalf("not redacted: %s", raw)
	}
}

func TestLogsRedactSecrets(t *testing.T) {
	app := newTestApp(true)
	var buf bytes.Buffer
	app.log = slog.New(slog.NewJSONHandler(&buf, nil))
	app.logUnexpected(httptest.NewRequest(http.MethodGet, "/api/auth/login", nil), "test", "MONGODB_URI=mongodb+srv://u:p@h/db SMTP_PASSWORD=abc JWT_SECRET=test-jwt-secret-not-for-production")
	out := buf.String()
	if strings.Contains(strings.ToLower(out), "mongodb+srv://u:p") || strings.Contains(out, "SMTP_PASSWORD=abc") {
		t.Fatalf("log leaked secrets: %s", out)
	}
}

func TestLoginAuditHasNoPassword(t *testing.T) {
	app := newTestApp(true)
	var buf bytes.Buffer
	app.log = slog.New(slog.NewJSONHandler(&buf, nil))
	rec := app.anonPOST(t, "/api/auth/login", `{"identifier":"member@eduardoos.com","password":"wrong-password-value"}`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("login fail: %d", rec.Code)
	}
	out := buf.String()
	if strings.Contains(out, "wrong-password-value") {
		t.Fatalf("password in logs: %s", out)
	}
	found := false
	for _, ev := range app.audit.all() {
		if ev.Kind == "login" && ev.Status == "failure" {
			found = true
		}
	}
	if !found {
		t.Fatal("missing login failure audit")
	}
}

func TestLoginIdentifierPayloadSucceeds(t *testing.T) {
	app := newTestApp(true)
	emailLogin := app.anonPOST(t, "/api/auth/login", `{"identifier":"member@eduardoos.com","password":"correct-horse-battery"}`)
	if emailLogin.Code != http.StatusOK {
		t.Fatalf("email identifier: %d %s", emailLogin.Code, emailLogin.Body.String())
	}
	userLogin := app.anonPOST(t, "/api/auth/login", `{"identifier":"member","password":"correct-horse-battery"}`)
	if userLogin.Code != http.StatusOK {
		t.Fatalf("username identifier: %d %s", userLogin.Code, userLogin.Body.String())
	}
}

func TestLoginMissingFieldsAreInvalidRequest(t *testing.T) {
	app := newTestApp(true)
	var buf bytes.Buffer
	app.log = slog.New(slog.NewJSONHandler(&buf, nil))
	emptyIdent := app.anonPOST(t, "/api/auth/login", `{"identifier":"","password":"correct-horse-battery"}`)
	if emptyIdent.Code != http.StatusBadRequest {
		t.Fatalf("missing identifier: %d", emptyIdent.Code)
	}
	emptyPass := app.anonPOST(t, "/api/auth/login", `{"identifier":"member@eduardoos.com","password":""}`)
	if emptyPass.Code != http.StatusBadRequest {
		t.Fatalf("missing password: %d", emptyPass.Code)
	}
	legacy := app.anonPOST(t, "/api/auth/login", `{"email":"member@eduardoos.com","password":"correct-horse-battery"}`)
	if legacy.Code != http.StatusBadRequest {
		t.Fatalf("legacy email field must not login: %d", legacy.Code)
	}
	out := buf.String()
	if !strings.Contains(out, "missing_identifier") || !strings.Contains(out, "missing_password") {
		t.Fatalf("expected validation reason codes: %s", out)
	}
	if strings.Contains(out, "member@eduardoos.com") || strings.Contains(out, "correct-horse-battery") {
		t.Fatalf("validation log leaked identifier or password: %s", out)
	}
}

func TestLoginInvalidJSONLogsReason(t *testing.T) {
	app := newTestApp(true)
	var buf bytes.Buffer
	app.log = slog.New(slog.NewJSONHandler(&buf, nil))
	rec := app.anonPOST(t, "/api/auth/login", `{not-json`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("invalid json: %d", rec.Code)
	}
	out := buf.String()
	if !strings.Contains(out, "invalid_json") {
		t.Fatalf("expected invalid_json: %s", out)
	}
	if strings.Contains(out, "{not-json") {
		t.Fatalf("logged request body: %s", out)
	}
}

func TestStatusWriterImplementsFlusher(t *testing.T) {
	inner := httptest.NewRecorder()
	cf := &countingFlusher{ResponseWriter: inner}
	ww := &statusWriter{ResponseWriter: cf, status: http.StatusOK}
	flusher, ok := any(ww).(http.Flusher)
	if !ok {
		t.Fatal("statusWriter must implement http.Flusher for SSE")
	}
	flusher.Flush()
	if cf.flushes != 1 {
		t.Fatalf("flush not propagated: %d", cf.flushes)
	}
}

type countingFlusher struct {
	http.ResponseWriter
	flushes int
}

func (c *countingFlusher) Flush() {
	c.flushes++
	if f, ok := c.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}
