package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestEreportV1NodeMutations(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	_ = app.grantEntitlement("member-1", productAPI)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Nodes","firstReportName":"Base"}`)
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"nodes"}`)
	if keyRec.Code != http.StatusCreated {
		t.Fatalf("apikey: %d %s", keyRec.Code, keyRec.Body.String())
	}
	secret := decodeMap(t, keyRec)["key"].(string)

	// Create section
	secBody, _ := json.Marshal(map[string]any{
		"title":          "Web section",
		"kind":           "funcionalidades",
		"productHistory": "Concept A",
	})
	secRec := v1JSON(t, app, secret, http.MethodPost,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID+"/sections", secBody)
	if secRec.Code != http.StatusCreated {
		t.Fatalf("post section: %d %s", secRec.Code, secRec.Body.String())
	}
	secOut := decodeMap(t, secRec)
	secNode := secOut["node"].(map[string]any)
	sectionID := secNode["id"].(string)
	if secNode["productHistory"] != "Concept A" {
		t.Fatalf("section concept: %#v", secNode["productHistory"])
	}
	if secOut["snapshotId"] == nil {
		t.Fatal("expected snapshot on section create")
	}

	// Patch section concept
	patchSec, _ := json.Marshal(map[string]any{"productHistory": "Concept A2", "title": "Web section v2"})
	patchSecRec := v1JSON(t, app, secret, http.MethodPatch,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID+"/sections/"+sectionID, patchSec)
	if patchSecRec.Code != http.StatusOK {
		t.Fatalf("patch section: %d %s", patchSecRec.Code, patchSecRec.Body.String())
	}
	if decodeMap(t, patchSecRec)["node"].(map[string]any)["productHistory"] != "Concept A2" {
		t.Fatal("section concept not updated")
	}

	// Create group
	grpBody, _ := json.Marshal(map[string]any{"title": "Sub A", "productHistory": "Sub concept"})
	grpRec := v1JSON(t, app, secret, http.MethodPost,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID+"/sections/"+sectionID+"/groups", grpBody)
	if grpRec.Code != http.StatusCreated {
		t.Fatalf("post group: %d %s", grpRec.Code, grpRec.Body.String())
	}
	groupID := decodeMap(t, grpRec)["node"].(map[string]any)["id"].(string)

	// Patch group
	patchGrp, _ := json.Marshal(map[string]any{"productHistory": "Sub concept 2"})
	patchGrpRec := v1JSON(t, app, secret, http.MethodPatch,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID+"/sections/"+sectionID+"/groups/"+groupID, patchGrp)
	if patchGrpRec.Code != http.StatusOK {
		t.Fatalf("patch group: %d %s", patchGrpRec.Code, patchGrpRec.Body.String())
	}

	// Create item
	itemBody, _ := json.Marshal(map[string]any{
		"nombre":     "Leak",
		"incidencia": "Water under sink",
		"status":     "reprobado",
	})
	itemRec := v1JSON(t, app, secret, http.MethodPost,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID+"/sections/"+sectionID+"/groups/"+groupID+"/items", itemBody)
	if itemRec.Code != http.StatusCreated {
		t.Fatalf("post item: %d %s", itemRec.Code, itemRec.Body.String())
	}
	itemNode := decodeMap(t, itemRec)["node"].(map[string]any)
	itemID := itemNode["id"].(string)
	if itemNode["status"] != "reprobado" {
		t.Fatalf("new item status: %#v", itemNode["status"])
	}

	// Patch item
	patchItem, _ := json.Marshal(map[string]any{
		"solucion":      "Replaced trap",
		"fechaSolucion": "2026-09-30",
		"status":        "aprobado",
	})
	patchItemRec := v1JSON(t, app, secret, http.MethodPatch,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID+"/sections/"+sectionID+"/groups/"+groupID+"/items/"+itemID, patchItem)
	if patchItemRec.Code != http.StatusOK {
		t.Fatalf("patch item: %d %s", patchItemRec.Code, patchItemRec.Body.String())
	}
	patched := decodeMap(t, patchItemRec)["node"].(map[string]any)
	if patched["status"] != "aprobado" || patched["solucion"] != "Replaced trap" {
		t.Fatalf("item patch: %#v", patched)
	}

	// 404 unknown section
	miss := v1JSON(t, app, secret, http.MethodPatch,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID+"/sections/no-such",
		[]byte(`{"title":"x"}`))
	if miss.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d %s", miss.Code, miss.Body.String())
	}

	// Unauthorized without key
	noAuth := httptest.NewRequest(http.MethodPost,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID+"/sections",
		bytes.NewReader([]byte(`{"title":"x"}`)))
	noAuth.Header.Set("Content-Type", "application/json")
	noRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(noRec, noAuth)
	if noRec.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", noRec.Code)
	}

	// Append still rejects mutating existing items (regression)
	getRec := v1JSON(t, app, secret, http.MethodGet,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, nil)
	if getRec.Code != http.StatusOK {
		t.Fatalf("get: %d %s", getRec.Code, getRec.Body.String())
	}
	payload := decodeMap(t, getRec)["payload"].(map[string]any)
	// mutate first default item in original section-a
	secs := payload["sections"].([]any)
	for _, raw := range secs {
		sec := raw.(map[string]any)
		if asString(sec["id"]) == "section-a" {
			groups := sec["groups"].([]any)
			grp := groups[0].(map[string]any)
			items := grp["items"].([]any)
			it := items[0].(map[string]any)
			it["incidencia"] = "mutated-by-append"
			items[0] = it
			grp["items"] = items
			groups[0] = grp
			sec["groups"] = groups
			break
		}
	}
	appendBody, _ := json.Marshal(map[string]any{"confirmOverwrite": true, "payload": payload})
	appendRec := v1JSON(t, app, secret, http.MethodPost,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, appendBody)
	if appendRec.Code != http.StatusBadRequest {
		t.Fatalf("append mutation should 400, got %d %s", appendRec.Code, appendRec.Body.String())
	}
	if decodeMap(t, appendRec)["error"] != "append_existing_item_modified" {
		t.Fatalf("want append_existing_item_modified, got %s", appendRec.Body.String())
	}

	// New item without incidencia rejected
	badItem, _ := json.Marshal(map[string]any{"nombre": "no text", "status": "reprobado"})
	badItemRec := v1JSON(t, app, secret, http.MethodPost,
		"/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID+"/sections/"+sectionID+"/groups/"+groupID+"/items", badItem)
	if badItemRec.Code != http.StatusBadRequest {
		t.Fatalf("empty incidencia should 400, got %d %s", badItemRec.Code, badItemRec.Body.String())
	}
}

func v1JSON(t *testing.T, app *App, secret, method, path string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	var req *http.Request
	if body == nil {
		req = httptest.NewRequest(method, path, nil)
	} else {
		req = httptest.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Authorization", "Bearer "+secret)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	return rec
}
