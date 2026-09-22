package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestEpamV1CreateAndGet(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEpam)
	_ = app.grantEntitlement("member-1", productAPI)

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"epam"}`)
	secret := decodeMap(t, keyRec)["key"].(string)

	doc := map[string]any{
		"type": "pamphlet_single_sheet",
		"id":   "doc-epam-v1-1",
		"header": map[string]any{
			"title": "Connector article", "subtitle": "", "author": "Test",
			"series": "Series A", "series_chapter": "1", "date": "2026-09-22",
		},
		"footer":              map[string]any{},
		"last_edited_element": map[string]any{"column": 1, "index": 0},
		"column_1":            []any{},
		"column_2":            []any{},
		"column_3":            []any{},
		"column_4":            []any{},
		"column_5":            []any{},
		"column_6":            []any{},
		"column_7":            []any{},
		"column_8":            []any{},
	}
	payload, _ := json.Marshal(map[string]any{"document": doc, "title": "Connector article"})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/epam/epams", bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+secret)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body.String())
	}
	created := decodeMap(t, rec)
	meta, _ := created["meta"].(map[string]any)
	epamID, _ := meta["epamId"].(string)
	if epamID == "" {
		t.Fatalf("missing epamId: %s", rec.Body.String())
	}
	articleURL, _ := created["articleUrl"].(string)
	if !strings.Contains(articleURL, "/articles/read?id=") {
		t.Fatalf("articleUrl=%q", articleURL)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/epam/epams/"+epamID, nil)
	getReq.Header.Set("Authorization", "Bearer "+secret)
	getRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("get: %d %s", getRec.Code, getRec.Body.String())
	}
}

func TestEpamV1AcceptsLegacyPamphletEntitlement(t *testing.T) {
	app := newTestApp(false)
	now := time.Now().UTC()
	if err := app.store.UpsertEntitlement(context.Background(), &Entitlement{
		ID: "legacy-pamphlet", UserID: "member-1", Product: "pamphlet", Active: true, CreatedAt: now,
	}); err != nil {
		t.Fatal(err)
	}
	_ = app.grantEntitlement("member-1", productAPI)

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"legacy"}`)
	secret := decodeMap(t, keyRec)["key"].(string)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/epam/access", nil)
	req.Header.Set("Authorization", "Bearer "+secret)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("access with legacy pamphlet entitlement: %d %s", rec.Code, rec.Body.String())
	}
}
