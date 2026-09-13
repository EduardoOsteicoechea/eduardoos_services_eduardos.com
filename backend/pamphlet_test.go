package main

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestPamphletCRUDAndPDF(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productPamphlet)

	createBody := `{
		"epamId":"epam-test-1",
		"fileName":"demo.epam",
		"title":"Demo pamphlet",
		"document":{
			"id":"epam-test-1",
			"type":"pamphlet_single_sheet",
			"ink_color":"black",
			"header":{"title":"Demo pamphlet","series":"Serie A","series_chapter":"1","author":"Eduardo","date":"2026-09-10"},
			"footer":{"action":"","message":"","label1":"WhatsApp:","value1":"","label2":"Teléfono:","value2":"","label3":"Dirección:","value3":"","label4":"Actividades:","value4":""},
			"column_1":[{"type":"paragraph","text":"Hola mundo"}],
			"column_2":[],"column_3":[],"column_4":[],"column_5":[],"column_6":[],"column_7":[],"column_8":[]
		}
	}`
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/epams", createBody)
	if created.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", created.Code, created.Body.String())
	}
	out := decodeMap(t, created)
	meta, _ := out["meta"].(map[string]any)
	doc, _ := out["document"].(map[string]any)
	if meta == nil || doc == nil {
		t.Fatalf("expected meta+document: %v", out)
	}
	epamID, _ := meta["epamId"].(string)
	if epamID == "" {
		t.Fatal("missing epamId")
	}
	if _, err := os.Stat(filepath.Join(app.cfg.MediaRoot, "pamphlet", "member-1", epamID+".epam")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("epam body must not be written to the filesystem: %v", err)
	}

	listed := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/epams", "")
	if listed.Code != http.StatusOK {
		t.Fatalf("list: %d %s", listed.Code, listed.Body.String())
	}

	got := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/epams/"+epamID, "")
	if got.Code != http.StatusOK {
		t.Fatalf("get: %d %s", got.Code, got.Body.String())
	}

	tree := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/epams/series-tree", "")
	if tree.Code != http.StatusOK {
		t.Fatalf("series-tree: %d %s", tree.Code, tree.Body.String())
	}

	pdfBody := `{
		"type":"pamphlet_single_sheet",
		"ink_color":"blue",
		"header":{"title":"Ink blue","series":"","series_chapter":"","author":"","date":""},
		"footer":{"action":"","message":"","label1":"WhatsApp:","value1":"","label2":"Teléfono:","value2":"","label3":"Dirección:","value3":"","label4":"Actividades:","value4":""},
		"column_1":[{"type":"paragraph","text":"PDF"}],
		"column_2":[],"column_3":[],"column_4":[],"column_5":[],"column_6":[],"column_7":[],"column_8":[]
	}`
	pdfRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/documents/pamphlet/pdf", pdfBody)
	if pdfRec.Code != http.StatusOK {
		t.Fatalf("pdf: %d %s", pdfRec.Code, pdfRec.Body.String())
	}
	if ct := pdfRec.Header().Get("Content-Type"); !strings.Contains(ct, "application/pdf") {
		t.Fatalf("content-type: %s", ct)
	}
	raw := pdfRec.Body.Bytes()
	if len(raw) < 4 || string(raw[:4]) != "%PDF" {
		t.Fatalf("expected PDF magic")
	}

	blackBody := strings.Replace(pdfBody, `"ink_color":"blue"`, `"ink_color":"black"`, 1)
	blackRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/documents/pamphlet/pdf", blackBody)
	if blackRec.Code != http.StatusOK || !strings.HasPrefix(blackRec.Body.String(), "%PDF") {
		t.Fatalf("black ink pdf failed: %d", blackRec.Code)
	}

	del := app.doJSON(t, "member@eduardoos.com", http.MethodDelete, "/api/epams/"+epamID, "")
	if del.Code != http.StatusOK {
		t.Fatalf("delete: %d %s", del.Code, del.Body.String())
	}
}

func TestPamphletRequiresEntitlement(t *testing.T) {
	app := newTestApp(false)
	rec := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/epams", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 without entitlement, got %d %s", rec.Code, rec.Body.String())
	}
	admin := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/epams", "")
	if admin.Code != http.StatusOK {
		t.Fatalf("admin bypass: %d %s", admin.Code, admin.Body.String())
	}
}

func TestArticlesLoadAllPamphletsForConfiguredOwner(t *testing.T) {
	app := newTestApp(false)
	app.cfg.PublicArticlesOwnerEmail = "member@eduardoos.com"
	_, err := app.pamphlet.SaveEpam(context.Background(), EpamRecord{
		UserID: "member-1", EpamID: "saved", Title: "Saved",
		Body: map[string]any{"header": map[string]any{"title": "Saved"}, "column_1": []any{map[string]any{"type": "paragraph", "text": "Visible"}}, "footer": map[string]any{}},
	}, "test")
	if err != nil {
		t.Fatal(err)
	}
	_, err = app.pamphlet.SaveEpam(context.Background(), EpamRecord{
		UserID: "member-1", EpamID: "draft", Title: "Draft",
		Body: map[string]any{"header": map[string]any{"title": "Draft"}, "footer": map[string]any{}},
	}, "test")
	if err != nil {
		t.Fatal(err)
	}
	_, err = app.pamphlet.SaveEpam(context.Background(), EpamRecord{
		UserID: "other-1", EpamID: "foreign", Title: "Foreign", Public: true,
		Body: map[string]any{"header": map[string]any{"title": "Foreign"}, "footer": map[string]any{}},
	}, "test")
	if err != nil {
		t.Fatal(err)
	}
	list := httptest.NewRecorder()
	app.Handler().ServeHTTP(list, httptest.NewRequest(http.MethodGet, "/api/articles", nil))
	if list.Code != http.StatusOK || decodeMap(t, list)["count"] != float64(2) {
		t.Fatalf("owner list: %d %s", list.Code, list.Body.String())
	}
	got := httptest.NewRecorder()
	app.Handler().ServeHTTP(got, httptest.NewRequest(http.MethodGet, "/api/articles/draft", nil))
	if got.Code != http.StatusOK {
		t.Fatalf("saved pamphlet should load as article: %d %s", got.Code, got.Body.String())
	}
	saved := httptest.NewRecorder()
	app.Handler().ServeHTTP(saved, httptest.NewRequest(http.MethodGet, "/api/articles/saved", nil))
	if saved.Code != http.StatusOK {
		t.Fatalf("article with column text: %d %s", saved.Code, saved.Body.String())
	}
	payload := decodeMap(t, saved)
	blocks, _ := payload["blocks"].([]any)
	if len(blocks) == 0 {
		t.Fatalf("expected readable blocks, got %s", saved.Body.String())
	}
	plain, _ := payload["plainText"].(string)
	if !strings.Contains(plain, "Visible") {
		t.Fatalf("expected column text in plainText, got %q", plain)
	}
	foreign := httptest.NewRecorder()
	app.Handler().ServeHTTP(foreign, httptest.NewRequest(http.MethodGet, "/api/articles/foreign", nil))
	if foreign.Code != http.StatusNotFound {
		t.Fatalf("other owner's pamphlet exposed: %d %s", foreign.Code, foreign.Body.String())
	}
}

func TestEpamImportCLIStoresDocumentForRequestedOwner(t *testing.T) {
	app := newTestApp(false)
	path := filepath.Join(t.TempDir(), "important.epam.json")
	body := `{"id":"important-epam","type":"pamphlet_single_sheet","header":{"title":"Important","series":"Series","series_chapter":"1","author":"Eduardo","date":""},"footer":{},"column_1":[],"column_2":[],"column_3":[],"column_4":[],"column_5":[],"column_6":[],"column_7":[],"column_8":[]}`
	if err := os.WriteFile(path, []byte(body), 0600); err != nil {
		t.Fatal(err)
	}
	if err := runEpamImportCLI(context.Background(), app.store, app.pamphlet, []string{
		"--email=member@eduardoos.com", "--file=" + path,
	}); err != nil {
		t.Fatalf("import: %v", err)
	}
	rec, ok, err := app.pamphlet.GetEpam(context.Background(), "member-1", "important-epam", "test")
	if err != nil || !ok || rec.Title != "Important" {
		t.Fatalf("imported EPAM unavailable: %#v, ok=%t, err=%v", rec, ok, err)
	}
}

func TestEpamPublishCLIExplicitlyPublishesOwnerDocuments(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productPamphlet)
	if _, err := app.pamphlet.SaveEpam(context.Background(), EpamRecord{
		UserID: "member-1", EpamID: "public-epam", Title: "Public EPAM",
		Body: map[string]any{"id": "public-epam", "type": "pamphlet_single_sheet", "header": map[string]any{"title": "Public EPAM"}},
	}, "test"); err != nil {
		t.Fatal(err)
	}
	if err := runEpamPublishCLI(context.Background(), app.store, app.pamphlet, []string{
		"--email=member@eduardoos.com", "--all",
	}); err != nil {
		t.Fatalf("publish: %v", err)
	}
	rec, ok, err := app.pamphlet.GetEpam(context.Background(), "member-1", "public-epam", "test")
	if err != nil || !ok || !rec.Public {
		t.Fatalf("EPAM was not published: %#v, ok=%t, err=%v", rec, ok, err)
	}
}

func TestHomescoolStudentCreateAndCrossUserDeny(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	hash, err := hashPassword("correct-horse-battery")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "student-1", Email: "student@eduardoos.com", EmailNormalized: "student@eduardoos.com",
		Username: "student", UsernameNormalized: "student", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "other-1", Email: "other@eduardoos.com", EmailNormalized: "other@eduardoos.com",
		Username: "other", UsernameNormalized: "other", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	_ = app.grantEntitlement("other-1", productHomescool)

	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/homescool/students",
		`{"studentEmail":"student@eduardoos.com"}`)
	if created.Code != http.StatusCreated && created.Code != http.StatusOK {
		t.Fatalf("register student: %d %s", created.Code, created.Body.String())
	}
	body := decodeMap(t, created)
	link, _ := body["link"].(map[string]any)
	slug, _ := link["studentSlug"].(string)
	if slug == "" {
		t.Fatalf("missing slug: %v", body)
	}

	list := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/homescool/students", "")
	if list.Code != http.StatusOK {
		t.Fatalf("list: %d %s", list.Code, list.Body.String())
	}

	cross := app.doJSON(t, "other@eduardoos.com", http.MethodGet, "/api/homescool/students/"+slug, "")
	if cross.Code != http.StatusNotFound {
		t.Fatalf("cross-user get expected 404, got %d %s", cross.Code, cross.Body.String())
	}

	learning := app.doJSON(t, "student@eduardoos.com", http.MethodGet, "/api/homescool/learning", "")
	if learning.Code != http.StatusOK {
		t.Fatalf("learning: %d %s", learning.Code, learning.Body.String())
	}
	learnBody := decodeMap(t, learning)
	if int(learnBody["count"].(float64)) < 1 {
		t.Fatalf("student should see teacher link")
	}

	access := app.doJSON(t, "student@eduardoos.com", http.MethodGet, "/api/subscriptions/access/homescool", "")
	if access.Code != http.StatusOK {
		t.Fatalf("access: %d %s", access.Code, access.Body.String())
	}
	acc := decodeMap(t, access)
	if acc["allowed"] != true {
		t.Fatalf("linked student should be allowed: %v", acc)
	}
}
