package main

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

func TestEreportUserBranchIsolatesMainAndSessions(t *testing.T) {
	app := newTestApp(false)
	if err := app.grantEntitlement("member-1", productEreport); err != nil {
		t.Fatal(err)
	}
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"BranchOrg","firstReportName":"Main"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", created.Code, created.Body.String())
	}
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)
	base := "/api/ereport/orgs/" + orgID + "/reports/" + reportID

	first := app.doJSON(t, "member@eduardoos.com", http.MethodPost, base+"/branches", `{}`)
	if first.Code != http.StatusCreated {
		t.Fatalf("create branch: %d %s", first.Code, first.Body.String())
	}
	firstBody := decodeMap(t, first)
	if firstBody["created"] != true {
		t.Fatalf("expected created: %#v", firstBody["created"])
	}
	payload := firstBody["payload"].(map[string]any)
	setFirstIncidencia(t, payload, "sin-sesion")
	raw, _ := json.Marshal(map[string]any{"payload": payload})
	unsess := app.doJSON(t, "member@eduardoos.com", http.MethodPut, base+"/branches/member-1", string(raw))
	if unsess.Code != http.StatusOK {
		t.Fatalf("put without session: %d %s", unsess.Code, unsess.Body.String())
	}
	unsessBody := decodeMap(t, unsess)
	item := firstItem(t, unsessBody["payload"].(map[string]any))
	if _, ok := item["sessionMarks"]; ok {
		t.Fatalf("session mark without an active session: %#v", item["sessionMarks"])
	}
	if item["incidencia"] != "sin-sesion" {
		t.Fatalf("incidencia: %#v", item["incidencia"])
	}

	again := app.doJSON(t, "member@eduardoos.com", http.MethodPost, base+"/branches", `{}`)
	if again.Code != http.StatusOK {
		t.Fatalf("second create: %d %s", again.Code, again.Body.String())
	}
	againBody := decodeMap(t, again)
	if againBody["created"] != false {
		t.Fatal("second create recopied the branch")
	}
	if firstItem(t, againBody["payload"].(map[string]any))["incidencia"] != "sin-sesion" {
		t.Fatal("second create reset the branch payload")
	}

	started := app.doJSON(t, "member@eduardoos.com", http.MethodPost, base+"/branches/member-1/sessions", `{}`)
	if started.Code != http.StatusOK {
		t.Fatalf("start session: %d %s", started.Code, started.Body.String())
	}
	startedBody := decodeMap(t, started)
	sessionID := startedBody["branch"].(map[string]any)["activeSessionId"].(string)
	if sessionID == "" {
		t.Fatal("missing active session")
	}
	busy := app.doJSON(t, "member@eduardoos.com", http.MethodPost, base+"/branches/member-1/sessions", `{}`)
	if busy.Code != http.StatusConflict {
		t.Fatalf("second start: %d %s", busy.Code, busy.Body.String())
	}

	live := deepCloneMap(startedBody["payload"].(map[string]any))
	setFirstIncidencia(t, live, "con-sesion")
	raw, _ = json.Marshal(map[string]any{"payload": live})
	marked := app.doJSON(t, "member@eduardoos.com", http.MethodPut, base+"/branches/member-1", string(raw))
	if marked.Code != http.StatusOK {
		t.Fatalf("put with session: %d %s", marked.Code, marked.Body.String())
	}
	markedBody := decodeMap(t, marked)
	markedItem := firstItem(t, markedBody["payload"].(map[string]any))
	marks, _ := markedItem["sessionMarks"].([]any)
	if len(marks) != 1 || marks[0].(map[string]any)["sessionId"] != sessionID {
		t.Fatalf("session mark: %#v", markedItem["sessionMarks"])
	}
	sec := markedBody["payload"].(map[string]any)["sections"].([]any)[0].(map[string]any)
	if _, ok := sec["sessionMarks"]; ok {
		t.Fatalf("section marked for an item edit: %#v", sec["sessionMarks"])
	}

	mainPayload := deepCloneMap(decodeMap(t, app.doJSON(t, "member@eduardoos.com", http.MethodGet, base, ""))["payload"].(map[string]any))
	mainPayload["reportName"] = "main-only"
	raw, _ = json.Marshal(map[string]any{"payload": mainPayload, "tema": "main-only"})
	mainPut := app.doJSON(t, "member@eduardoos.com", http.MethodPut, base, string(raw))
	if mainPut.Code != http.StatusOK {
		t.Fatalf("main put: %d %s", mainPut.Code, mainPut.Body.String())
	}
	branchAfterMain := app.doJSON(t, "member@eduardoos.com", http.MethodGet, base+"/branches/member-1", "")
	if branchAfterMain.Code != http.StatusOK {
		t.Fatalf("get branch: %d %s", branchAfterMain.Code, branchAfterMain.Body.String())
	}
	branchPayload := decodeMap(t, branchAfterMain)["payload"].(map[string]any)
	if branchPayload["reportName"] == "main-only" {
		t.Fatal("main put changed the branch")
	}
	if firstItem(t, branchPayload)["incidencia"] != "con-sesion" {
		t.Fatal("branch lost the session edit")
	}
	_, mainBody, err := app.ereport.loadReport("member-1", orgID, reportID)
	if err != nil {
		t.Fatal(err)
	}
	if mainBody["reportName"] != "main-only" {
		t.Fatalf("main reportName: %#v", mainBody["reportName"])
	}
	if firstItem(t, mainBody)["incidencia"] == "con-sesion" {
		t.Fatal("branch edit landed on main")
	}

	groups := branchPayload["sections"].([]any)[0].(map[string]any)["groups"].([]any)
	grp := groups[0].(map[string]any)
	grp["items"] = []any{}
	raw, _ = json.Marshal(map[string]any{"payload": branchPayload})
	deleted := app.doJSON(t, "member@eduardoos.com", http.MethodPut, base+"/branches/member-1", string(raw))
	if deleted.Code != http.StatusOK {
		t.Fatalf("delete item: %d %s", deleted.Code, deleted.Body.String())
	}
	deletedSessions := decodeMap(t, deleted)["sessions"].([]any)
	deletedIDs := deletedSessions[0].(map[string]any)["deletedIds"].([]any)
	if len(deletedIDs) != 1 || deletedIDs[0] != "group-1-item-1" {
		t.Fatalf("deletedIds: %#v", deletedIDs)
	}

	stopped := app.doJSON(t, "member@eduardoos.com", http.MethodPost, base+"/branches/member-1/sessions/"+sessionID+"/stop", `{}`)
	if stopped.Code != http.StatusOK {
		t.Fatalf("stop: %d %s", stopped.Code, stopped.Body.String())
	}
	stoppedBody := decodeMap(t, stopped)
	if _, ok := stoppedBody["branch"].(map[string]any)["activeSessionId"]; ok {
		t.Fatalf("session still active: %#v", stoppedBody["branch"])
	}
	stoppedSess := stoppedBody["sessions"].([]any)[0].(map[string]any)
	if stoppedSess["endedAt"] == "" {
		t.Fatal("missing endedAt")
	}
	duration, _ := stoppedSess["durationMs"].(float64)
	time.Sleep(30 * time.Millisecond)
	againGet := decodeMap(t, app.doJSON(t, "member@eduardoos.com", http.MethodGet, base+"/branches/member-1", ""))
	againSess := againGet["sessions"].([]any)[0].(map[string]any)
	if againSess["durationMs"] != duration {
		t.Fatalf("duration changed after stop: %v vs %v", againSess["durationMs"], duration)
	}
	restart := app.doJSON(t, "member@eduardoos.com", http.MethodPost, base+"/branches/member-1/sessions", `{}`)
	if restart.Code != http.StatusOK {
		t.Fatalf("restart: %d %s", restart.Code, restart.Body.String())
	}

	now := time.Now().UTC()
	member := app.mustUser("member@eduardoos.com")
	if err := app.store.InsertUser(context.Background(), &User{
		ID: "guest-1", Email: "guest@eduardoos.com", EmailNormalized: "guest@eduardoos.com",
		Username: "guest", UsernameNormalized: "guest", PasswordHash: member.PasswordHash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	}); err != nil {
		t.Fatal(err)
	}
	if err := app.grantEntitlement("guest-1", productEreport); err != nil {
		t.Fatal(err)
	}
	meta, _, err := app.ereport.loadReport("member-1", orgID, reportID)
	if err != nil {
		t.Fatal(err)
	}
	app.writeAccountShare(member, app.mustUser("guest@eduardoos.com"), orgID, reportID, "share-1", "guest@eduardoos.com", true, meta)

	sharedBase := "/api/ereport/shared/orgs/" + orgID + "/reports/" + reportID
	guestGet := app.doJSON(t, "guest@eduardoos.com", http.MethodGet, sharedBase+"/branches/member-1", "")
	if guestGet.Code != http.StatusOK {
		t.Fatalf("guest get: %d %s", guestGet.Code, guestGet.Body.String())
	}
	if decodeMap(t, guestGet)["canEdit"] != false {
		t.Fatal("guest can edit the owner's branch")
	}
	guestPut := app.doJSON(t, "guest@eduardoos.com", http.MethodPut, sharedBase+"/branches/member-1", `{"payload":{"sections":[]}}`)
	if guestPut.Code != http.StatusForbidden {
		t.Fatalf("guest put: %d %s", guestPut.Code, guestPut.Body.String())
	}
	stranger := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, base+"/branches", "")
	if stranger.Code != http.StatusNotFound {
		t.Fatalf("stranger list: %d %s", stranger.Code, stranger.Body.String())
	}
}

func setFirstIncidencia(t *testing.T, payload map[string]any, text string) {
	t.Helper()
	firstItem(t, payload)["incidencia"] = text
}

func firstItem(t *testing.T, payload map[string]any) map[string]any {
	t.Helper()
	sec := payload["sections"].([]any)[0].(map[string]any)
	grp := sec["groups"].([]any)[0].(map[string]any)
	return grp["items"].([]any)[0].(map[string]any)
}
