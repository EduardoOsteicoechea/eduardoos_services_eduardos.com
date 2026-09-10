package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPreferencesGetPutRoundTrip(t *testing.T) {
	app := newTestApp(true)

	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	missReq := httptest.NewRequest(http.MethodGet, "/api/preferences/pamphlet.lastEpamId", nil)
	copyCookies(missReq, seed)
	missRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(missRec, missReq)
	if missRec.Code != http.StatusNotFound {
		t.Fatalf("missing pref want 404 got %d %s", missRec.Code, missRec.Body.String())
	}

	putReq, putRec := app.memberPOST(t, "/api/preferences/pamphlet.lastEpamId", `{"value":"epam-123"}`)
	putReq.Method = http.MethodPut
	app.Handler().ServeHTTP(putRec, putReq)
	if putRec.Code != http.StatusOK {
		t.Fatalf("put status=%d body=%s", putRec.Code, putRec.Body.String())
	}
	var putBody map[string]any
	if err := json.Unmarshal(putRec.Body.Bytes(), &putBody); err != nil {
		t.Fatal(err)
	}
	if putBody["key"] != "pamphlet.lastEpamId" || putBody["value"] != "epam-123" {
		t.Fatalf("unexpected put body %#v", putBody)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/preferences/pamphlet.lastEpamId", nil)
	copyCookies(getReq, seed)
	got := httptest.NewRecorder()
	app.Handler().ServeHTTP(got, getReq)
	if got.Code != http.StatusOK {
		t.Fatalf("get status=%d body=%s", got.Code, got.Body.String())
	}
	var getBody map[string]any
	_ = json.Unmarshal(got.Body.Bytes(), &getBody)
	if getBody["value"] != "epam-123" {
		t.Fatalf("get body %#v", getBody)
	}
}

func TestPreferencesPutRequiresCSRF(t *testing.T) {
	app := newTestApp(true)
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPut, "/api/preferences/scrib.institutesNav", bytes.NewBufferString(`{"value":1}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	copyCookies(req, seed)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("want 403 without csrf, got %d", rec.Code)
	}
}

func TestPreferencesRejectsBadKey(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.memberPOST(t, "/api/preferences/bad%20key!", `{"value":1}`)
	req.Method = http.MethodPut
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest && rec.Code != http.StatusNotFound {
		// path may 404 before handler if mux rejects; otherwise handler returns 400
		t.Fatalf("bad key want 400/404 got %d", rec.Code)
	}
}
