package main

import (
	"context"
	"net/http"
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
