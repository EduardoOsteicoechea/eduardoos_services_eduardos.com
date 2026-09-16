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
	"os/exec"
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

func eocodeRequest(t *testing.T, app *App, email, method, path, body string) (*http.Request, *httptest.ResponseRecorder) {
	t.Helper()
	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser(email))
	if err != nil {
		t.Fatal(err)
	}
	var reader *strings.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	var req *http.Request
	if reader != nil {
		req = httptest.NewRequest(method, path, reader)
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(req, seed)
	return req, httptest.NewRecorder()
}

func TestEocodeHistoryRoundTrip(t *testing.T) {
	app := newTestApp(true)
	seedReq, seedRec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/state")
	app.Handler().ServeHTTP(seedRec, seedReq)
	if seedRec.Code != http.StatusOK {
		t.Fatalf("seed: %d", seedRec.Code)
	}

	saveReq, saveRec := eocodeRequest(t, app, "admin@eduardoos.com", http.MethodPut, "/api/eocode/history", `{"turns":[{"role":"user","content":"hola"},{"role":"assistant","content":"que tal"}]}`)
	app.Handler().ServeHTTP(saveRec, saveReq)
	if saveRec.Code != http.StatusOK {
		t.Fatalf("save: %d %s", saveRec.Code, saveRec.Body.String())
	}

	getReq, getRec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/history")
	app.Handler().ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("get: %d", getRec.Code)
	}
	var body struct {
		Turns []eocodeChatTurn `json:"turns"`
	}
	if err := json.NewDecoder(getRec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if len(body.Turns) != 2 || body.Turns[0].Content != "hola" {
		t.Fatalf("unexpected turns %+v", body.Turns)
	}

	stateReq, stateRec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/state")
	app.Handler().ServeHTTP(stateRec, stateReq)
	if strings.Contains(stateRec.Body.String(), "history.json") {
		t.Fatal("history file must not appear in the workspace index")
	}
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
	if body.PreviewURL != "/api/eocode/preview/" {
		t.Fatalf("unexpected preview url %q", body.PreviewURL)
	}
	if body.RulesIndex == "" || !strings.Contains(body.RulesIndex, "components/head.py") {
		t.Fatalf("rules index not seeded: %q", body.RulesIndex)
	}
	paths := map[string]bool{}
	for _, f := range body.Files {
		paths[f.Path] = true
	}
	for _, want := range []string{"site.py", "components/head.py", "components/body.py", "components/bottom.py", "views/inicio.py", "rules/constraints.md", "rules/index.md"} {
		if !paths[want] {
			t.Fatalf("missing seeded file %q in %v", want, paths)
		}
	}
}

func TestEocodeIdentifyConsult(t *testing.T) {
	app := newTestApp(true)
	app.chat[eocodeProvider] = &recordingChat{provider: eocodeProvider, text: `{"type":"consult","text":"Hola, **bienvenido**."}`}
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
	app.chat[eocodeProvider] = &recordingChat{provider: eocodeProvider, text: `{"files":[{"path":"components/extra.py","content":"def render_extra():\n    return '<p>hola</p>'\n"}]}`}
	req, rec := app.adminPOST(t, "/api/eocode/edit", `{"message":"usa rojo","files_to_edit":[{"path":"components/extra.py","reason":"color"}]}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	admin := app.mustUser("admin@eduardoos.com")
	ws := app.eocodeWorkspace(admin.ID)
	content, err := ws.readFile("components/extra.py")
	if err != nil {
		t.Fatalf("written file missing: %v", err)
	}
	if !strings.Contains(content, "render_extra") {
		t.Fatalf("unexpected content %q", content)
	}
}

func TestEocodeEditRejectsTraversal(t *testing.T) {
	app := newTestApp(true)
	app.chat[eocodeProvider] = &recordingChat{provider: eocodeProvider, text: `{"files":[{"path":"../../evil.py","content":"x=1"}]}`}
	req, rec := app.adminPOST(t, "/api/eocode/edit", `{"message":"x","files_to_edit":[{"path":"../../evil.py"}]}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code == http.StatusOK {
		var body map[string]any
		_ = json.NewDecoder(rec.Body).Decode(&body)
		if body["ok"] == true {
			t.Fatal("traversal edit must not succeed")
		}
	}
	if _, err := os.Stat(filepath.Join(app.cfg.MediaRoot, "evil.py")); err == nil {
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

func TestEocodeEditStripsFence(t *testing.T) {
	app := newTestApp(true)
	app.chat[eocodeProvider] = &recordingChat{
		provider: eocodeProvider,
		text:     "{\"files\":[{\"path\":\"components/body.py\",\"content\":\"```python\\ndef render_body():\\n    return '<body>x</body>'\\n```\"}]}",
	}
	req, rec := app.adminPOST(t, "/api/eocode/edit", `{"message":"cambia el body","files_to_edit":[{"path":"components/body.py"}]}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	ws := app.eocodeWorkspace(app.mustUser("admin@eduardoos.com").ID)
	content, err := ws.readFile("components/body.py")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(content, "```") {
		t.Fatalf("code fence not stripped: %q", content)
	}
	if !strings.Contains(content, "render_body") {
		t.Fatalf("edited content missing: %q", content)
	}
}

func TestEocodePreviewRendersPythonSSR(t *testing.T) {
	app := newTestApp(true)
	if _, err := exec.LookPath(app.cfg.EocodePython); err != nil {
		t.Skipf("python %q not available", app.cfg.EocodePython)
	}
	seedReq, seedRec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/state")
	app.Handler().ServeHTTP(seedRec, seedReq)
	if seedRec.Code != http.StatusOK {
		t.Fatalf("seed state: %d %s", seedRec.Code, seedRec.Body.String())
	}
	req, rec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/preview/")
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "text/html") {
		t.Fatalf("expected html content type, got %q", ct)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "<!DOCTYPE html>") || !strings.Contains(body, "Mi Portafolio") {
		t.Fatalf("unexpected SSR output: %s", body)
	}
	if !strings.Contains(body, `data-view="inicio"`) || !strings.Contains(body, `data-route="sobre-mi"`) {
		t.Fatalf("SPA views missing from SSR output: %s", body)
	}
	if !strings.Contains(body, eocodeSPACSSMarker) {
		t.Fatal("expected SPA CSS fallback in preview HTML")
	}
}

func TestEocodeSSRBlocksForbiddenPython(t *testing.T) {
	app := newTestApp(true)
	ws := app.eocodeWorkspace(app.mustUser("admin@eduardoos.com").ID)
	if err := ws.ensure(); err != nil {
		t.Fatal(err)
	}
	if err := ws.writeFile("components/evil.py", "import os\n"); err != nil {
		t.Fatal(err)
	}
	if _, err := app.eocodeRenderSite(context.Background(), ws); err == nil {
		t.Fatal("expected forbidden import to block SSR execution")
	}
}

func TestEocodeFileReturnsContent(t *testing.T) {
	app := newTestApp(true)
	seedReq, seedRec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/state")
	app.Handler().ServeHTTP(seedRec, seedReq)
	if seedRec.Code != http.StatusOK {
		t.Fatalf("seed state: %d %s", seedRec.Code, seedRec.Body.String())
	}
	req, rec := eocodeGet(t, app, "admin@eduardoos.com", "/api/eocode/file/components/body.py")
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Path    string `json:"path"`
		Type    string `json:"type"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.Type != "python" || !strings.Contains(body.Content, "render_body") {
		t.Fatalf("unexpected file payload %+v", body)
	}
}

func TestEocodeMigratesStaticWorkspace(t *testing.T) {
	app := newTestApp(true)
	ws := app.eocodeWorkspace(app.mustUser("admin@eduardoos.com").ID)
	if err := os.MkdirAll(filepath.Join(ws.Root, "rules"), 0750); err != nil {
		t.Fatal(err)
	}
	_ = os.WriteFile(filepath.Join(ws.Root, "index.html"), []byte("<html></html>"), 0640)
	_ = os.WriteFile(filepath.Join(ws.Root, "styles.css"), []byte("body{}"), 0640)
	_ = os.WriteFile(filepath.Join(ws.Root, "rules", "atomic-html.md"), []byte("old"), 0640)
	_ = os.WriteFile(filepath.Join(ws.Root, "rules", "index.md"), []byte("old index atomic-html.md"), 0640)
	if err := ws.ensure(); err != nil {
		t.Fatal(err)
	}
	for _, gone := range []string{"index.html", "styles.css", "rules/atomic-html.md"} {
		if _, err := os.Stat(ws.fullPath(gone)); err == nil {
			t.Fatalf("expected %s removed by migration", gone)
		}
	}
	if _, err := os.Stat(ws.fullPath("site.py")); err != nil {
		t.Fatal("site.py not seeded after migration")
	}
	idx, err := ws.readFile("rules/index.md")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(idx, "components/head.py") {
		t.Fatalf("rules index not migrated: %q", idx)
	}
}

func TestEocodeSafeRelPath(t *testing.T) {
	bad := []string{"", "../a.html", "/etc/passwd", "a/../../b.py", "evil.exe", "index.html", "app.js", "styles.css"}
	for _, in := range bad {
		if got, ok := eocodeSafeRelPath(in); ok {
			t.Fatalf("expected rejection for %q, got %q", in, got)
		}
	}
	good := []string{"site.py", "components/head.py", "assets/a.webp", "rules/atomic-ssr.md", "data.json", "views/inicio.py"}
	for _, in := range good {
		if _, ok := eocodeSafeRelPath(in); !ok {
			t.Fatalf("expected acceptance for %q", in)
		}
	}
}

func TestEocodeWriteSitePyKeepsCanonicalEntry(t *testing.T) {
	app := newTestApp(true)
	ws := app.eocodeWorkspace(app.mustUser("admin@eduardoos.com").ID)
	if err := ws.ensure(); err != nil {
		t.Fatal(err)
	}
	if err := ws.writeFile("site.py", "print('nope')\nfrom views.inicio import render\n"); err != nil {
		t.Fatal(err)
	}
	got, err := ws.readFile("site.py")
	if err != nil {
		t.Fatal(err)
	}
	if got != eocodeInitialSitePy {
		t.Fatalf("site.py must stay the canonical SSR entry, got %q", got)
	}
	if !strings.Contains(got, "render_head() + render_body() + render_bottom()") {
		t.Fatal("canonical site.py missing the three-part concat")
	}
}

func TestEocodePythonDepsIncludesViews(t *testing.T) {
	deps := eocodePythonDeps("from views.inicio import render\nfrom components.body import render_body\n")
	joined := strings.Join(deps, ",")
	if !strings.Contains(joined, "views/inicio.py") || !strings.Contains(joined, "components/body.py") {
		t.Fatalf("deps=%v", deps)
	}
}
