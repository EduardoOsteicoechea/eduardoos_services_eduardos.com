package main

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newEvoiceTestApp(t *testing.T) *App {
	t.Helper()
	cfg := config{
		ListenAddr:             "127.0.0.1:8081",
		MongoDatabase:          mongoDatabase,
		JWTSecret:              "test-jwt-secret-not-for-production",
		JWTIssuer:              jwtIssuer,
		JWTAudience:            jwtAudience,
		AppEnv:                 "production",
		MustLog:                true,
		MediaRoot:              filepath.Join(os.TempDir(), "eduardoos-evoice-media-"+randomID(6)),
		EvoiceFakeTTS:          true,
		EreportMaxImageBytes:   defaultMaxImageBytes,
		EreportMaxImageEdge:    defaultMaxImageEdge,
		EreportMaxPayloadBytes: defaultMaxPayloadBytes,
		AllowedOrigins:         []string{"https://eduardoos.com", "http://127.0.0.1:4321"},
		DeepSeekBaseURL:        "https://api.deepseek.com",
		DeepSeekModel:          "deepseek-v4-flash",
		KimiBaseURL:            "https://api.moonshot.ai/v1",
		KimiModel:              "kimi-k3",
	}
	app := newApp(cfg)
	app.mailer = &recordingMailer{}
	hash, err := hashPassword("correct-horse-battery")
	if err != nil {
		t.Fatal(err)
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
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "allow-1", Email: "eliasosteic@gmail.com", EmailNormalized: "eliasosteic@gmail.com",
		Username: "elias", UsernameNormalized: "elias", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	t.Cleanup(func() { _ = os.RemoveAll(cfg.MediaRoot) })
	return app
}

func TestEvoiceProjectCreateFakeTTS(t *testing.T) {
	app := newEvoiceTestApp(t)
	if err := app.grantEntitlement("member-1", productEvoice); err != nil {
		t.Fatal(err)
	}
	owner := "member-1"

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/evoice/projects", `{"name":"smoke"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/evoice/projects", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "smoke") {
		t.Fatalf("list projects=%s", rec.Body.String())
	}

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", "hello.txt")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = fw.Write([]byte("Hola mundo eVoice."))
	_ = mw.Close()
	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/evoice/projects/"+owner+"/smoke/docs", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	copyCookiesFromJar(req, seed.cookies)
	rec = httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("upload status=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/evoice/projects/"+owner+"/smoke/generate", `{}`)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("generate status=%d body=%s", rec.Code, rec.Body.String())
	}
	var genResp map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &genResp); err != nil {
		t.Fatal(err)
	}
	jobID, _ := genResp["jobId"].(string)
	if jobID == "" {
		t.Fatal("missing jobId")
	}

	deadline := time.Now().Add(5 * time.Second)
	var job evoiceJobStatus
	for time.Now().Before(deadline) {
		rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/evoice/jobs/"+jobID, "")
		if rec.Code != http.StatusOK {
			t.Fatalf("job status=%d", rec.Code)
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &job); err != nil {
			t.Fatal(err)
		}
		if job.State == "done" || job.State == "failed" {
			break
		}
		time.Sleep(40 * time.Millisecond)
	}
	if job.State != "done" {
		t.Fatalf("job state=%s err=%s logs=%v", job.State, job.Error, job.Logs)
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/evoice/projects/"+owner+"/smoke/audios", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "hello.v1.mp3") {
		t.Fatalf("audios=%s", rec.Body.String())
	}

	req, rec = app.authedReq(t, "member@eduardoos.com", http.MethodGet, "/api/evoice/file/"+owner+"/smoke/audios?name=hello.v1.mp3", "")
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("file get status=%d", rec.Code)
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte("ID3fake-evoice")) {
		t.Fatalf("expected fake mp3 bytes")
	}
}

func TestEvoiceRequiresEntitlementNotAllowlist(t *testing.T) {
	app := newEvoiceTestApp(t)
	rec := app.doJSON(t, "eliasosteic@gmail.com", http.MethodGet, "/api/evoice/me", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("former allowlist email without subscription want 403 got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestEvoiceDenyWithoutEntitlement(t *testing.T) {
	app := newEvoiceTestApp(t)
	rec := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/evoice/me", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected forbidden, got %d %s", rec.Code, rec.Body.String())
	}
}

type evoiceSessionJar struct {
	csrf    string
	cookies []*http.Cookie
}

func httptestSession(t *testing.T, app *App, email string) evoiceSessionJar {
	t.Helper()
	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser(email))
	if err != nil {
		t.Fatal(err)
	}
	return evoiceSessionJar{csrf: sess.CSRF, cookies: seed.Result().Cookies()}
}

func copyCookiesFromJar(req *http.Request, cookies []*http.Cookie) {
	for _, c := range cookies {
		req.AddCookie(c)
	}
}
