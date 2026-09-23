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

func TestHomescoolMaterialsV1DocsAndUpsert(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productAPI)
	_ = app.grantEntitlement("member-1", productHomescool)

	hash, err := hashPassword("correct-horse-battery")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "other-1", Email: "other@eduardoos.com", EmailNormalized: "other@eduardoos.com",
		Username: "other", UsernameNormalized: "other", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	_ = app.grantEntitlement("other-1", productAPI)
	_ = app.grantEntitlement("other-1", productHomescool)

	docs := httptest.NewRequest(http.MethodGet, "/api/v1/docs", nil)
	dw := httptest.NewRecorder()
	app.Handler().ServeHTTP(dw, docs)
	if dw.Code != http.StatusOK {
		t.Fatalf("docs %d", dw.Code)
	}
	raw := dw.Body.String()
	if !strings.Contains(raw, "/api/v1/homescool/materials") {
		t.Fatal("docs missing homescool routes")
	}
	if (!strings.Contains(raw, "eduardoos-eoschool-connector") && !strings.Contains(raw, "eoschool")) {
		t.Fatal("docs missing eoschool skill pointer")
	}

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"homescool-ci"}`)
	if keyRec.Code != http.StatusCreated {
		t.Fatalf("apikey: %d %s", keyRec.Code, keyRec.Body.String())
	}
	secret := decodeMap(t, keyRec)["key"].(string)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/homescool/access", nil)
	w := httptest.NewRecorder()
	app.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("no key want 401 got %d", w.Code)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/homescool/access", nil)
	req.Header.Set("Authorization", "Bearer "+secret)
	w = httptest.NewRecorder()
	app.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("access %d %s", w.Code, w.Body.String())
	}

	html := `<!DOCTYPE html><html lang="es"><head><link rel="stylesheet" href="../../../../web_assets/styles.css"><script src="../../../../web_assets/print.js" defer></script></head><body><section class="page"><h1>Preposiciones</h1></section></body></html>`
	body, _ := json.Marshal(map[string]any{
		"confirmOverwrite": true,
		"material": map[string]any{
			"cycle":       3,
			"week":        1,
			"subject":     "idiomas",
			"day":         1,
			"sessionDate": "2026-09-17",
			"title":       "Preposiciones en latín",
			"html":        html,
		},
	})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/homescool/materials", strings.NewReader(string(body)))
	req.Header.Set("Authorization", "Bearer "+secret)
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	app.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("post legacy html %d %s", w.Code, w.Body.String())
	}

	// METHOD_V1 eoschool JSON upsert
	eosDoc := sampleEoschoolDay1()
	eosBody, _ := json.Marshal(map[string]any{
		"confirmOverwrite": true,
		"material":         eosDoc,
	})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/homescool/materials", strings.NewReader(string(eosBody)))
	req.Header.Set("Authorization", "Bearer "+secret)
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	app.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("post eoschool %d %s", w.Code, w.Body.String())
	}
	postOut := decodeMap(t, w)
	if postOut["viewUrl"] == nil {
		t.Fatalf("missing viewUrl: %v", postOut)
	}
	mat := postOut["material"].(map[string]any)
	id := mat["id"].(string)
	if mat["format"] != eoschoolFormatName {
		t.Fatalf("format want eoschool got %v", mat["format"])
	}

	docReq := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/homescool/materials/"+id+"/document", "")
	if docReq.Code != http.StatusOK {
		t.Fatalf("document %d %s", docReq.Code, docReq.Body.String())
	}
	pdfReq := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/homescool/materials/"+id+"/pdf", "")
	if pdfReq.Code != http.StatusOK {
		t.Fatalf("pdf %d %s", pdfReq.Code, pdfReq.Body.String())
	}
	if !strings.HasPrefix(pdfReq.Body.String(), "%PDF") {
		t.Fatalf("pdf magic missing")
	}

	otherKeyRec := app.doJSON(t, "other@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"other"}`)
	if otherKeyRec.Code != http.StatusCreated {
		t.Fatalf("other apikey: %d %s", otherKeyRec.Code, otherKeyRec.Body.String())
	}
	otherSecret := decodeMap(t, otherKeyRec)["key"].(string)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/homescool/materials/"+id, nil)
	req.Header.Set("Authorization", "Bearer "+otherSecret)
	w = httptest.NewRecorder()
	app.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("cross-user want 404 got %d %s", w.Code, w.Body.String())
	}

	req = httptest.NewRequest(http.MethodDelete, "/api/v1/homescool/materials/"+id, nil)
	req.Header.Set("Authorization", "Bearer "+otherSecret)
	w = httptest.NewRecorder()
	app.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("cross-user delete want 404 got %d %s", w.Code, w.Body.String())
	}

	req = httptest.NewRequest(http.MethodDelete, "/api/v1/homescool/materials/"+id, nil)
	req.Header.Set("Authorization", "Bearer "+secret)
	w = httptest.NewRecorder()
	app.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("delete %d %s", w.Code, w.Body.String())
	}
	delOut := decodeMap(t, w)
	if delOut["deleted"] != true {
		t.Fatalf("delete body %#v", delOut)
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/homescool/materials/"+id, nil)
	req.Header.Set("Authorization", "Bearer "+secret)
	w = httptest.NewRecorder()
	app.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("get after delete want 404 got %d %s", w.Code, w.Body.String())
	}

	list := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/homescool/materials?cycle=3", "")
	if list.Code != http.StatusOK {
		t.Fatalf("session list %d %s", list.Code, list.Body.String())
	}
	listed := decodeMap(t, list)
	mats, _ := listed["materials"].([]any)
	if len(mats) < 1 {
		t.Fatal("expected legacy cycle-3 material still in session list")
	}
	if !strings.Contains(dw.Body.String(), "DELETE") {
		t.Fatal("docs missing DELETE homescool materials route")
	}
}

func TestHomescoolSeedImportCiclo3(t *testing.T) {
	app := newTestApp(false)
	ciclo := filepath.Clean(filepath.Join("..", "..", "elias", "ciclo3"))
	assets := filepath.Clean(filepath.Join("..", "..", "elias", "web_assets"))
	if _, err := os.Stat(ciclo); err != nil {
		t.Skip("elias/ciclo3 not present")
	}
	n, err := importHomescoolSeedDir(context.Background(), app.homescool, "member-1", ciclo, assets)
	if err != nil {
		t.Fatal(err)
	}
	if n < 10 {
		t.Fatalf("expected >=10 materials, got %d", n)
	}
	rows, err := app.homescool.ListMaterials(context.Background(), []string{"member-1"}, 3)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != n {
		t.Fatalf("list %d vs import %d", len(rows), n)
	}
}
