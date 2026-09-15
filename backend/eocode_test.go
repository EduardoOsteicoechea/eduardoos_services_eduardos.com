package main

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func eocodeGet(t *testing.T, app *App, email, path string) (*http.Request, *httptest.ResponseRecorder) {
	t.Helper()
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser(email)); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	copyCookies(req, seed)
	return req, httptest.NewRecorder()
}

func TestEocodeRequiresAdminOrGrant(t *testing.T) {
	app := newTestApp(true)

	req, rec := eocodeGet(t, app, "member@eduardoos.com", "/api/eocode/state")
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("member without grant: expected 403, got %d %s", rec.Code, rec.Body.String())
	}

	adminReq, adminRec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/state")
	app.Handler().ServeHTTP(adminRec, adminReq)
	if adminRec.Code != http.StatusOK {
		t.Fatalf("admin: expected 200, got %d %s", adminRec.Code, adminRec.Body.String())
	}
	assertNoSecrets(t, adminRec.Body.String())
}

func TestEocodeGrantedUserCanAccess(t *testing.T) {
	app := newTestApp(true)
	member := app.mustUser("member@eduardoos.com")
	if err := app.store.UpsertUserPreference(context.Background(), &UserPreference{
		ID: member.ID + "\x00admin_services", UserID: member.ID, Key: "admin_services",
		Value: []string{eocodeServiceID},
	}); err != nil {
		t.Fatal(err)
	}
	req, rec := eocodeGet(t, app, "member@eduardoos.com", "/api/eocode/state")
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("granted member: expected 200, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestEocodeStateSeedsWorkspace(t *testing.T) {
	app := newTestApp(true)
	req, rec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/state")
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Files      []eocodeFileEntry `json:"files"`
		PreviewURL string            `json:"preview_url"`
		RulesIndex string            `json:"rules_index"`
		IsAdmin    bool              `json:"is_admin"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if !body.IsAdmin {
		t.Fatal("expected is_admin true")
	}
	if body.PreviewURL != "/api/eocode/preview/index.html" {
		t.Fatalf("unexpected preview url %q", body.PreviewURL)
	}
	if body.RulesIndex == "" || !strings.Contains(body.RulesIndex, "atomic-html.md") {
		t.Fatalf("rules index not seeded: %q", body.RulesIndex)
	}
	paths := map[string]bool{}
	for _, f := range body.Files {
		paths[f.Path] = true
	}
	for _, want := range []string{"index.html", "styles.css", "app.js", "rules/constraints.md", "rules/index.md"} {
		if !paths[want] {
			t.Fatalf("missing seeded file %q in %v", want, paths)
		}
	}
}

func TestEocodeIdentifyConsult(t *testing.T) {
	app := newTestApp(true)
	app.chat["deepseek"] = &recordingChat{provider: "deepseek", text: `{"type":"consult","text":"Hola, **bienvenido**."}`}
	req, rec := app.adminPOST(t, "/api/eocode/identify", `{"message":"que es HTML?"}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["type"] != "consult" {
		t.Fatalf("expected consult, got %v", body["type"])
	}
	if !strings.Contains(body["text"].(string), "bienvenido") {
		t.Fatalf("unexpected text %v", body["text"])
	}
}

func TestEocodeEditWritesFiles(t *testing.T) {
	app := newTestApp(true)
	app.chat["deepseek"] = &recordingChat{provider: "deepseek", text: `{"files":[{"path":"custom.css","content":"body{color:red}"}]}`}
	req, rec := app.adminPOST(t, "/api/eocode/edit", `{"message":"usa rojo","files_to_edit":[{"path":"custom.css","reason":"color"}]}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	admin := app.mustUser("admin@eduardoos.com")
	ws := app.eocodeWorkspace(admin.ID)
	content, err := ws.readFile("custom.css")
	if err != nil {
		t.Fatalf("written file missing: %v", err)
	}
	if content != "body{color:red}" {
		t.Fatalf("unexpected content %q", content)
	}
}

func TestEocodeEditRejectsTraversal(t *testing.T) {
	app := newTestApp(true)
	app.chat["deepseek"] = &recordingChat{provider: "deepseek", text: `{"files":[{"path":"../../evil.html","content":"x"}]}`}
	req, rec := app.adminPOST(t, "/api/eocode/edit", `{"message":"x","files_to_edit":[{"path":"../../evil.html"}]}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code == http.StatusOK {
		var body map[string]any
		_ = json.NewDecoder(rec.Body).Decode(&body)
		if body["ok"] == true {
			t.Fatal("traversal edit must not succeed")
		}
	}
	if _, err := os.Stat(filepath.Join(app.cfg.MediaRoot, "evil.html")); err == nil {
		t.Fatal("traversal wrote outside workspace")
	}
}

func TestEocodeUploadConvertsToWebp(t *testing.T) {
	app := newTestApp(true)
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	var pngBuf bytes.Buffer
	if err := png.Encode(&pngBuf, img); err != nil {
		t.Fatal(err)
	}

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	fw, err := mw.CreateFormFile("file", "test.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write(pngBuf.Bytes()); err != nil {
		t.Fatal(err)
	}
	_ = mw.Close()

	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser("admin@eduardoos.com"))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/eocode/upload", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(req, seed)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d %s", rec.Code, rec.Body.String())
	}
	var parsed struct {
		Path string `json:"path"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&parsed); err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(parsed.Path, ".webp") {
		t.Fatalf("expected .webp asset, got %q", parsed.Path)
	}
	ws := app.eocodeWorkspace(app.mustUser("admin@eduardoos.com").ID)
	data, err := os.ReadFile(ws.fullPath(parsed.Path))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(data, []byte("RIFF")) || !bytes.Contains(data[:12], []byte("WEBP")) {
		t.Fatal("uploaded asset is not WebP")
	}
}

func TestEocodePreviewServesSeededIndex(t *testing.T) {
	app := newTestApp(true)
	// Seed the workspace first.
	seedReq, seedRec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/state")
	app.Handler().ServeHTTP(seedRec, seedReq)
	if seedRec.Code != http.StatusOK {
		t.Fatalf("seed state: %d", seedRec.Code)
	}
	req, rec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/preview/index.html")
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "text/html") {
		t.Fatalf("expected html content type, got %q", ct)
	}
	if !strings.Contains(rec.Body.String(), "<!DOCTYPE html>") {
		t.Fatal("preview did not serve index.html")
	}
}

func TestEocodeSafeRelPath(t *testing.T) {
	bad := []string{"", "../a.html", "/etc/passwd", "a/../../b.html", "evil.exe", "a.svg.js.exe"}
	for _, in := range bad {
		if got, ok := eocodeSafeRelPath(in); ok {
			t.Fatalf("expected rejection for %q, got %q", in, got)
		}
	}
	good := []string{"index.html", "assets/a.webp", "rules/atomic-css.md", "deep/path/app.js"}
	for _, in := range good {
		if _, ok := eocodeSafeRelPath(in); !ok {
			t.Fatalf("expected acceptance for %q", in)
		}
	}
}
