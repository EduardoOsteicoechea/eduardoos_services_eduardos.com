package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSubscriptionsCatalogPublic(t *testing.T) {
	app := newTestApp(true)
	app.cfg.PayPalHostedButtonID = "TEST_BUTTON"
	req := httptest.NewRequest(http.MethodGet, "/api/subscriptions/catalog", nil)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("catalog status=%d body=%s", rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	services, ok := body["services"].([]any)
	if !ok || len(services) < 6 {
		t.Fatalf("expected catalog services, got %#v", body["services"])
	}
	ids := map[string]bool{}
	for _, raw := range services {
		row, _ := raw.(map[string]any)
		id, _ := row["id"].(string)
		ids[id] = true
	}
	for _, want := range []string{"pamphlet", "homescool", "scrib", "ereport", "evoice", "api"} {
		if !ids[want] {
			t.Fatalf("missing catalog id %s in %#v", want, ids)
		}
	}
	if ids["playlist"] || ids["church-management"] {
		t.Fatal("playlist and church-management must be omitted")
	}
}

func TestSubscriptionsAccessDenyAllow(t *testing.T) {
	app := newTestApp(true)
	deny := httptest.NewRequest(http.MethodGet, "/api/subscriptions/access/pamphlet", nil)
	denyRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(denyRec, deny)
	if denyRec.Code != http.StatusUnauthorized {
		t.Fatalf("guest access want 401 got %d", denyRec.Code)
	}

	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/subscriptions/access/pamphlet", nil)
	copyCookies(req, seed)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("member access status=%d body=%s", rec.Code, rec.Body.String())
	}
	var denied map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &denied)
	if denied["allowed"] != false {
		t.Fatalf("member without entitlement must be denied: %#v", denied)
	}

	if err := app.grantEntitlement("member-1", "pamphlet"); err != nil {
		t.Fatal(err)
	}
	req2 := httptest.NewRequest(http.MethodGet, "/api/subscriptions/access/pamphlet", nil)
	copyCookies(req2, seed)
	rec2 := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec2, req2)
	var allowed map[string]any
	_ = json.Unmarshal(rec2.Body.Bytes(), &allowed)
	if allowed["allowed"] != true {
		t.Fatalf("expected entitlement allow: %#v", allowed)
	}
	if has, ok := allowed["has_entitlement"]; ok && has != true {
		t.Fatalf("has_entitlement should be true when present: %#v", allowed)
	}
	if reason, ok := allowed["reason"].(string); ok && reason != "entitlement" && reason != "" {
		t.Fatalf("unexpected reason: %#v", allowed)
	}

	adminSeed := httptest.NewRecorder()
	if _, err := app.issueSession(adminSeed, app.mustUser("admin@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	adminReq := httptest.NewRequest(http.MethodGet, "/api/subscriptions/access/ereport", nil)
	copyCookies(adminReq, adminSeed)
	adminRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(adminRec, adminReq)
	var adminBody map[string]any
	_ = json.Unmarshal(adminRec.Body.Bytes(), &adminBody)
	if adminBody["allowed"] != true || adminBody["is_admin"] != true {
		t.Fatalf("admin must bypass: %#v", adminBody)
	}
}

func TestPaymentsCreateIntentAndStatus(t *testing.T) {
	app := newTestApp(true)
	app.cfg.PayPalHostedButtonID = "TEST_BUTTON_ID"
	app.cfg.PayPalCheckoutURL = "https://www.paypal.com/cgi-bin/webscr"

	req, rec := app.memberPOST(t, "/api/payments/intents", `{"services":["pamphlet","scrib"],"billing_period":"monthly"}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("create intent status=%d body=%s", rec.Code, rec.Body.String())
	}
	var created map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	intentID, _ := created["intent_id"].(string)
	if intentID == "" || created["hosted_button_id"] != "TEST_BUTTON_ID" {
		t.Fatalf("unexpected intent: %#v", created)
	}
	if created["amount"] != "2.00" {
		t.Fatalf("amount=%v want 2.00", created["amount"])
	}

	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	statusReq := httptest.NewRequest(http.MethodGet, "/api/payments/status/"+intentID, nil)
	copyCookies(statusReq, seed)
	statusRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(statusRec, statusReq)
	if statusRec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", statusRec.Code, statusRec.Body.String())
	}
	var status map[string]any
	_ = json.Unmarshal(statusRec.Body.Bytes(), &status)
	if status["status"] != "pending" {
		t.Fatalf("expected pending, got %#v", status)
	}
}

func TestPaymentsCreateIntentRequiresAuth(t *testing.T) {
	app := newTestApp(true)
	app.cfg.PayPalHostedButtonID = "BTN"
	rec := app.anonPOST(t, "/api/payments/intents", `{"services":["pamphlet"],"billing_period":"monthly"}`)
	if rec.Code != http.StatusUnauthorized && rec.Code != http.StatusForbidden {
		t.Fatalf("guest create intent want 401/403 got %d", rec.Code)
	}
}

func TestKnownCatalogHelpers(t *testing.T) {
	if !knownService("api") || monthlyPriceUSD("api") != 3 {
		t.Fatal("api catalog broken")
	}
	if knownService("playlist") || knownService("church-management") {
		t.Fatal("omitted services must not be known")
	}
	if quoteTotalUSD([]string{"api", "ereport"}, "monthly") != 4 {
		t.Fatal("quote monthly wrong")
	}
	if !isEvoiceAllowlisted("eliasosteic@gmail.com") {
		t.Fatal("evoice allowlist missing")
	}
}
