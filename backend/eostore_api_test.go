package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func (a *App) seedAPIKey(t *testing.T, id, userID, secret string) {
	t.Helper()
	rec := &APIKeyRecord{
		ID:         id,
		UserID:     userID,
		Label:      "ci",
		Prefix:     secret[:12] + "…",
		SecretHash: a.hashOpaque("api-key", secret),
		CreatedAt:  time.Now().UTC(),
	}
	if err := a.store.InsertAPIKey(context.Background(), rec); err != nil {
		t.Fatal(err)
	}
}

func (a *App) importReq(t *testing.T, secret, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/eostore/products/import", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if secret != "" {
		req.Header.Set("Authorization", "Bearer "+secret)
	}
	rec := httptest.NewRecorder()
	a.Handler().ServeHTTP(rec, req)
	return rec
}

const testImportBody = `{
	"company": {"id": "eostore-demo", "name": "EO Store Demo"},
	"sections": [
		{"id": "collares", "name": "Collares", "types": [
			{"id": "dorado", "name": "Dorado"},
			{"id": "plateado", "name": "Plateado"}
		]}
	],
	"products": [
		{"id": "collar-azul", "name": "Collar azul", "section_id": "collares", "type_id": "dorado",
		 "price_base_usd": 5.5, "bs_per_usd": 842.2, "units": 4, "sku": "NH1", "hashtags": ["collar"]},
		{"name": "Collar plateado", "section_id": "collares", "type_id": "plateado",
		 "price_base_usd": 3, "discount_percent": 10, "bs_per_usd": 842.2, "units": 0, "sku": "NH2"}
	]
}`

func TestEostoreImportRequiresAdminKey(t *testing.T) {
	app := newTestApp(false)

	if rec := app.importReq(t, "", testImportBody); rec.Code != http.StatusUnauthorized {
		t.Fatalf("missing key should be 401, got %d", rec.Code)
	}
	if rec := app.importReq(t, "eos_live_deadbeef", testImportBody); rec.Code != http.StatusUnauthorized {
		t.Fatalf("unknown key should be 401, got %d", rec.Code)
	}

	memberSecret := apiKeyPrefix + randomID(24)
	app.seedAPIKey(t, "key-member", "member-1", memberSecret)
	if rec := app.importReq(t, memberSecret, testImportBody); rec.Code != http.StatusForbidden {
		t.Fatalf("member key should be 403, got %d", rec.Code)
	}
}

func TestEostoreImportLifecycle(t *testing.T) {
	app := newTestApp(false)
	secret := apiKeyPrefix + randomID(24)
	app.seedAPIKey(t, "key-admin", "admin-1", secret)

	first := app.importReq(t, secret, testImportBody)
	if first.Code != http.StatusOK {
		t.Fatalf("import status=%d body=%s", first.Code, first.Body.String())
	}
	out := decodeMap(t, first)
	if out["company_created"] != true {
		t.Fatalf("expected company created: %#v", out)
	}
	if out["sections_created"].(float64) != 1 || out["types_created"].(float64) != 2 {
		t.Fatalf("unexpected hierarchy counts: %#v", out)
	}
	if out["products_created"].(float64) != 2 || out["failed"].(float64) != 0 {
		t.Fatalf("unexpected product counts: %#v", out)
	}
	company := out["company"].(map[string]any)
	companyGUID, _ := company["guid"].(string)
	if companyGUID == "" {
		t.Fatalf("missing company guid: %#v", company)
	}

	again := app.importReq(t, secret, testImportBody)
	if again.Code != http.StatusOK {
		t.Fatalf("re-import status=%d body=%s", again.Code, again.Body.String())
	}
	second := decodeMap(t, again)
	if second["products_created"].(float64) != 0 || second["products_updated"].(float64) != 2 {
		t.Fatalf("re-import should update: %#v", second)
	}
	if second["company_created"] != false || second["sections_created"].(float64) != 0 {
		t.Fatalf("re-import should not recreate: %#v", second)
	}

	listed := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/eostore/products?company_guid="+companyGUID, "")
	if listed.Code != http.StatusOK {
		t.Fatalf("list products status=%d body=%s", listed.Code, listed.Body.String())
	}
	rows, _ := decodeMap(t, listed)["products"].([]any)
	if len(rows) != 2 {
		t.Fatalf("expected two products, got %d", len(rows))
	}
}

func TestEostoreImportDryRunWritesNothing(t *testing.T) {
	app := newTestApp(false)
	secret := apiKeyPrefix + randomID(24)
	app.seedAPIKey(t, "key-admin", "admin-1", secret)

	body := strings.Replace(testImportBody, `"company":`, `"dry_run": true, "company":`, 1)
	rec := app.importReq(t, secret, body)
	if rec.Code != http.StatusOK {
		t.Fatalf("dry-run status=%d body=%s", rec.Code, rec.Body.String())
	}
	out := decodeMap(t, rec)
	if out["dry_run"] != true || out["products_created"].(float64) != 2 {
		t.Fatalf("unexpected dry-run output: %#v", out)
	}
	companies, err := app.eostore.ListCompanies(context.Background())
	if err != nil || len(companies) != 0 {
		t.Fatalf("dry-run must not persist, got %v err=%v", companies, err)
	}
	products, err := app.eostore.ListProducts(context.Background(), "", "", "")
	if err != nil || len(products) != 0 {
		t.Fatalf("dry-run must not persist products, got %v err=%v", products, err)
	}
}

func TestEostoreImportRejectsBadPayload(t *testing.T) {
	app := newTestApp(false)
	secret := apiKeyPrefix + randomID(24)
	app.seedAPIKey(t, "key-admin", "admin-1", secret)

	empty := app.importReq(t, secret, `{"company":{"id":"eostore-demo","name":"Demo"},"products":[]}`)
	if empty.Code != http.StatusBadRequest {
		t.Fatalf("empty products should be 400, got %d", empty.Code)
	}

	badDiscount := app.importReq(t, secret, `{
		"company": {"id": "eostore-demo", "name": "Demo"},
		"sections": [{"id": "collares", "name": "Collares", "types": [{"id": "dorado", "name": "Dorado"}]}],
		"products": [{"name": "X", "section_id": "collares", "type_id": "dorado", "price_base_usd": 1, "discount_percent": 7}]
	}`)
	if badDiscount.Code != http.StatusOK {
		t.Fatalf("invalid item should report per-item failure, got %d body=%s", badDiscount.Code, badDiscount.Body.String())
	}
	out := decodeMap(t, badDiscount)
	if out["failed"].(float64) != 1 || out["products_created"].(float64) != 0 {
		t.Fatalf("expected one failed item: %#v", out)
	}
}
