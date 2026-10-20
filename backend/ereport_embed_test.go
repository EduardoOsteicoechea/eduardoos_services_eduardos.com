package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestEreportEmbedQuickIssueOriginGate(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	_ = app.grantEntitlement("member-1", productAPI)

	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs",
		`{"name":"EmbedSite","firstReportName":"Website issues","firstReportPurpose":"website_registration"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", created.Code, created.Body.String())
	}
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)
	secID, grpID := defaultWebsiteConnectorIDs()

	patch := app.doJSON(t, "member@eduardoos.com", http.MethodPatch,
		"/api/ereport/orgs/"+orgID+"/reports/"+reportID+"/site-connector",
		`{"assign":true,"sectionId":"`+secID+`","groupId":"`+grpID+`","connectorHosts":["localhost:8080"]}`)
	if patch.Code != http.StatusOK {
		t.Fatalf("patch hosts: %d %s", patch.Code, patch.Body.String())
	}

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"embed"}`)
	if keyRec.Code != http.StatusCreated {
		t.Fatalf("apikey: %d %s", keyRec.Code, keyRec.Body.String())
	}
	secret := decodeMap(t, keyRec)["key"].(string)

	// Wrong origin rejected.
	badBody, _ := json.Marshal(map[string]any{
		"orgId": orgID, "reportId": reportID,
		"text": "Bad origin bug. Detail here.",
		"hostOrigin": "http://localhost:9999",
	})
	bad := v1JSON(t, app, secret, http.MethodPost, "/api/v1/ereport/embed/quick-issue", badBody)
	if bad.Code != http.StatusForbidden {
		t.Fatalf("wrong origin should 403, got %d %s", bad.Code, bad.Body.String())
	}

	// Allowed origin creates issue.
	okBody, _ := json.Marshal(map[string]any{
		"orgId": orgID, "reportId": reportID,
		"text": "Nav overflow. Menu clips on phone.",
		"hostOrigin": "http://localhost:8080",
	})
	ok := v1JSON(t, app, secret, http.MethodPost, "/api/v1/ereport/embed/quick-issue", okBody)
	if ok.Code != http.StatusCreated {
		t.Fatalf("quick-issue: %d %s", ok.Code, ok.Body.String())
	}
	node := decodeMap(t, ok)["node"].(map[string]any)
	if node["nombre"] != "Nav overflow" {
		t.Fatalf("nombre parse: %#v", node["nombre"])
	}
	if node["status"] != "reprobado" {
		t.Fatalf("status: %#v", node["status"])
	}

	// Mint embed token + write with token.
	tokBody, _ := json.Marshal(map[string]any{
		"orgId": orgID, "reportId": reportID, "origin": "http://localhost:8080",
	})
	tokRec := v1JSON(t, app, secret, http.MethodPost, "/api/v1/ereport/embed-token", tokBody)
	if tokRec.Code != http.StatusOK {
		t.Fatalf("embed-token: %d %s", tokRec.Code, tokRec.Body.String())
	}
	token := decodeMap(t, tokRec)["token"].(string)
	if token == "" || token[:10] != embedTokenPrefix {
		t.Fatalf("expected eos_embed_ token, got %q", token)
	}

	tokIssue, _ := json.Marshal(map[string]any{
		"text": "Second bug. From embed token.",
		"hostOrigin": "http://localhost:8080",
	})
	tokOK := v1JSON(t, app, token, http.MethodPost, "/api/v1/ereport/embed/quick-issue", tokIssue)
	if tokOK.Code != http.StatusCreated {
		t.Fatalf("token quick-issue: %d %s", tokOK.Code, tokOK.Body.String())
	}

	// Token bound to :8080 must reject :3000.
	tokBad, _ := json.Marshal(map[string]any{
		"text": "Wrong port.",
		"hostOrigin": "http://localhost:3000",
	})
	tokForbidden := v1JSON(t, app, token, http.MethodPost, "/api/v1/ereport/embed/quick-issue", tokBad)
	if tokForbidden.Code != http.StatusForbidden {
		t.Fatalf("token wrong origin should 403, got %d %s", tokForbidden.Code, tokForbidden.Body.String())
	}

	// Mode W issue card: GET report + PATCH item with embed token + host origin.
	tokNode, _ := decodeMap(t, tokOK)["node"].(map[string]any)
	itemID := asString(tokNode["id"])
	if itemID == "" {
		t.Fatal("expected item id from token quick-issue")
	}
	getPath := "/api/v1/ereport/orgs/" + orgID + "/reports/" + reportID
	getReq := httptest.NewRequest(http.MethodGet, getPath+"?hostOrigin=http://localhost:8080", nil)
	getReq.Header.Set("Authorization", "Bearer "+token)
	getRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("embed GET report: %d %s", getRec.Code, getRec.Body.String())
	}
	badGet := httptest.NewRequest(http.MethodGet, getPath+"?hostOrigin=http://localhost:3000", nil)
	badGet.Header.Set("Authorization", "Bearer "+token)
	badGetRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(badGetRec, badGet)
	if badGetRec.Code != http.StatusForbidden {
		t.Fatalf("embed GET wrong host should 403, got %d %s", badGetRec.Code, badGetRec.Body.String())
	}
	patchBody, _ := json.Marshal(map[string]any{"solucion": "Fixed in Mode W card."})
	patchPath := getPath + "/sections/" + secID + "/groups/" + grpID + "/items/" + itemID
	patchReq := httptest.NewRequest(http.MethodPatch, patchPath, bytes.NewReader(patchBody))
	patchReq.Header.Set("Authorization", "Bearer "+token)
	patchReq.Header.Set("Content-Type", "application/json")
	patchReq.Header.Set("X-Ereport-Host-Origin", "http://localhost:8080")
	patchRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(patchRec, patchReq)
	if patchRec.Code != http.StatusOK {
		t.Fatalf("embed PATCH item: %d %s", patchRec.Code, patchRec.Body.String())
	}
}

func TestParseIssueTextServer(t *testing.T) {
	n, i := parseIssueTextServer("Title only")
	if n != "Title only" || i != "Title only" {
		t.Fatalf("got %q %q", n, i)
	}
	n, i = parseIssueTextServer("Name. Rest of body.")
	if n != "Name" || i != "Rest of body." {
		t.Fatalf("got %q %q", n, i)
	}
}

func TestNormalizeEmbedOriginHost(t *testing.T) {
	if got := normalizeEmbedOriginHost("http://localhost:8080/path"); got != "localhost:8080" {
		t.Fatalf("got %q", got)
	}
	if got := normalizeEmbedOriginHost("https://eduardoos.com"); got != "eduardoos.com" {
		t.Fatalf("got %q", got)
	}
}

func TestConnectorHostsAllowOrigin(t *testing.T) {
	hosts := []string{"localhost:8080", "eduardoos.com"}
	if !connectorHostsAllowOrigin(hosts, "localhost:8080") {
		t.Fatal("exact port should match")
	}
	if connectorHostsAllowOrigin(hosts, "localhost:3000") {
		t.Fatal("other port should not match when only :8080 is listed")
	}
	if !connectorHostsAllowOrigin([]string{"localhost"}, "localhost:9999") {
		t.Fatal("hostname-only tag should loose-match")
	}
}
