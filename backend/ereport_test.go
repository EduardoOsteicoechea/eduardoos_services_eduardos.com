package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func (a *App) authedReq(t *testing.T, email, method, path, body string) (*http.Request, *httptest.ResponseRecorder) {
	t.Helper()
	seed := httptest.NewRecorder()
	sess, err := a.issueSession(seed, a.mustUser(email))
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if method != http.MethodGet && method != http.MethodHead {
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", a.cfg.AllowedOrigins[0])
		req.Header.Set("X-CSRF-Token", sess.CSRF)
	}
	copyCookies(req, seed)
	return req, httptest.NewRecorder()
}

func (a *App) doJSON(t *testing.T, email, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req, rec := a.authedReq(t, email, method, path, body)
	a.Handler().ServeHTTP(rec, req)
	return rec
}

func decodeMap(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
		t.Fatalf("json: %v %s", err, rec.Body.String())
	}
	return out
}

func TestEreportCreateRequiresEntitlementAndAdminBypass(t *testing.T) {
	app := newTestApp(false)
	denied := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Acme","firstReportName":"R1"}`)
	if denied.Code != http.StatusForbidden {
		t.Fatalf("member create without entitlement: %d %s", denied.Code, denied.Body.String())
	}
	created := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"AdminOrg","firstReportName":"First"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("admin create: %d %s", created.Code, created.Body.String())
	}
}

func TestEreportEntitlementsUnavailableFailClosed(t *testing.T) {
	app := newTestApp(false)
	app.failClosedEnt = true
	rec := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"X"}`)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("fail closed: %d %s", rec.Code, rec.Body.String())
	}
}

func TestEreportLapsedOwnerCanPutNotCreate(t *testing.T) {
	app := newTestApp(false)
	if err := app.grantEntitlement("member-1", productEreport); err != nil {
		t.Fatal(err)
	}
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Shop","firstReportName":"Alpha"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", created.Code, created.Body.String())
	}
	body := decodeMap(t, created)
	org := body["org"].(map[string]any)
	report := body["report"].(map[string]any)
	orgID := org["id"].(string)
	reportID := report["id"].(string)

	ents, _ := app.store.EntitlementsByUser(context.Background(), "member-1")
	for _, ent := range ents {
		ent.Active = false
		_ = app.store.UpsertEntitlement(context.Background(), ent)
	}
	blocked := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs/"+orgID+"/reports", `{"tema":"Nope"}`)
	if blocked.Code != http.StatusForbidden {
		t.Fatalf("lapsed create: %d %s", blocked.Code, blocked.Body.String())
	}
	payload, _ := json.Marshal(map[string]any{"payload": emptyEreportPayload(), "tema": "Kept"})
	put := app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/ereport/orgs/"+orgID+"/reports/"+reportID, string(payload))
	if put.Code != http.StatusOK {
		t.Fatalf("lapsed put: %d %s", put.Code, put.Body.String())
	}
}

func TestEreportIDORAndAdminNoCrossOrg(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Private","firstReportName":"Secret"}`)
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)

	adminGet := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/ereport/orgs/"+orgID+"/reports/"+reportID, "")
	if adminGet.Code != http.StatusNotFound && adminGet.Code != http.StatusForbidden {
		t.Fatalf("admin cross-org: %d %s", adminGet.Code, adminGet.Body.String())
	}

	other := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/ereport/orgs/"+orgID, "")
	if other.Code == http.StatusOK {
		t.Fatal("admin must not list another user's org")
	}

	trav := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/ereport/orgs/..%2fadmin-1", "")
	if trav.Code == http.StatusOK {
		t.Fatal("traversal must not succeed")
	}
}

func TestEreportEmailChangeDoesNotMoveDirectories(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Stay"}`)
	orgID := decodeMap(t, created)["org"].(map[string]any)["id"].(string)
	user := app.mustUser("member@eduardoos.com")
	root, err := app.ereport.ownerDir(user.ID)
	if err != nil {
		t.Fatal(err)
	}
	user.Username = "renameduser"
	user.UsernameNormalized = "renameduser"
	if err := app.store.UpdateUser(context.Background(), user); err != nil {
		t.Fatal(err)
	}
	got := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/ereport/orgs/"+orgID, "")
	if got.Code != http.StatusOK {
		t.Fatalf("after rename: %d %s", got.Code, got.Body.String())
	}
	if _, err := os.Stat(root); err != nil {
		t.Fatalf("owner directory moved: %v", err)
	}
}

// Reports written under the pre-username layout must stay exactly where they
// are, so a deploy of the new layout cannot orphan live data.
func TestEreportAdoptsExistingUserIDDirectory(t *testing.T) {
	app := newTestApp(false)
	user := app.mustUser("member@eduardoos.com")
	legacy := filepath.Join(app.cfg.EreportMediaRoot, user.ID)
	if err := os.MkdirAll(filepath.Join(legacy, "orgs"), 0750); err != nil {
		t.Fatal(err)
	}

	dir, err := app.ereport.ownerDir(user.ID)
	if err != nil {
		t.Fatal(err)
	}
	if dir != legacy {
		t.Fatalf("owner dir %s, want the existing %s", dir, legacy)
	}
}

func TestEreportEmailChangeKeepsOwnerDirectory(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Keep"}`)
	user := app.mustUser("member@eduardoos.com")
	before, err := app.ereport.ownerDir(user.ID)
	if err != nil {
		t.Fatal(err)
	}

	user.Email = "moved@eduardoos.com"
	user.EmailNormalized = "moved@eduardoos.com"
	if err := app.store.UpdateUser(context.Background(), user); err != nil {
		t.Fatal(err)
	}
	// Drop the cache so resolution has to read the pin back off disk.
	app.ereport.ownerDirs = map[string][]string{}

	after, err := app.ereport.ownerDir(user.ID)
	if err != nil {
		t.Fatal(err)
	}
	if after != before {
		t.Fatalf("owner dir moved to %s, want %s", after, before)
	}
	if _, err := os.Stat(before); err != nil {
		t.Fatalf("original directory gone: %v", err)
	}
}

func TestEreportOwnerSegmentEncoding(t *testing.T) {
	if got := ereportSafeEmail("Owner+Tag@Example.COM"); got != "owner-tag_at_example.com" {
		t.Errorf("safe email = %q", got)
	}
	long := strings.Repeat("a", 70) + "@example.com"
	got := ereportSafeEmail(long)
	if len(got) > 64 || !validEreportID(got) {
		t.Errorf("long email = %q (len %d)", got, len(got))
	}
	if other := ereportSafeEmail(strings.Repeat("a", 70) + "@example.org"); other == got {
		t.Error("two long addresses collided into one directory")
	}

	if seg := ereportUsernameSegment("Eduardo.OS", "x@y.com"); seg != "eduardo.os" {
		t.Errorf("username segment = %q", seg)
	}
	// Too short for safeEreportID, so the label falls back to the email local part.
	if seg := ereportUsernameSegment("ab", "member@eduardoos.com"); seg != "member" {
		t.Errorf("short username segment = %q", seg)
	}
	if seg := ereportUsernameSegment(ereportOwnerIndexDir, "member@eduardoos.com"); seg == ereportOwnerIndexDir {
		t.Error("username must never take the reserved index directory")
	}
	for _, seg := range []string{
		ereportUsernameSegment("", "member@eduardoos.com"),
		ereportUsernameSegment("!!!", "member@eduardoos.com"),
		ereportSafeEmail("member@eduardoos.com"),
	} {
		if !validEreportID(seg) {
			t.Errorf("segment %q is not a valid path segment", seg)
		}
	}
}

func TestEreportFilesystemLayoutAndNoS3(t *testing.T) {
	app := newTestApp(false)
	src, _ := os.ReadFile("ereport_http.go")
	if bytes.Contains(bytes.ToLower(src), []byte("s3")) || bytes.Contains(src, []byte("aws-sdk")) {
		t.Fatal("ereport http must not mention s3")
	}
	_ = app.grantEntitlement("member-1", productEreport)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"FS","firstReportName":"Doc"}`)
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)
	user := app.mustUser("member@eduardoos.com")
	metaPath, err := app.ereport.reportMetaPath(user.ID, orgID, reportID)
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(
		ereportUsernameSegment(user.Username, user.Email),
		ereportSafeEmail(user.Email),
		"orgs", orgID, "reports", reportID,
	)
	if !strings.Contains(filepath.ToSlash(metaPath), filepath.ToSlash(want)) {
		t.Fatalf("path %s missing %s", metaPath, want)
	}
	if strings.Contains(metaPath, "@") {
		t.Fatalf("raw email must be encoded in the path: %s", metaPath)
	}
}

func TestEreportInviteOTPAndTrackerSession(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Inv","firstReportName":"Shared"}`)
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)

	invRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs/"+orgID+"/reports/"+reportID+"/invites", `{"email":"guest@example.com"}`)
	if invRec.Code != http.StatusCreated {
		t.Fatalf("invite: %d %s", invRec.Code, invRec.Body.String())
	}
	invBody := decodeMap(t, invRec)
	link := invBody["link"].(string)
	inviteID := invBody["invite"].(map[string]any)["id"].(string)
	secret := link[strings.LastIndex(link, "t=")+2:]

	get := httptest.NewRequest(http.MethodGet, "/api/ereport/invites/"+inviteID+"?t="+secret, nil)
	getRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(getRec, get)
	if getRec.Code != http.StatusOK {
		t.Fatalf("get invite: %d %s", getRec.Code, getRec.Body.String())
	}
	info := decodeMap(t, getRec)
	if info["needsOtp"] != true {
		t.Fatalf("expected needsOtp: %v", info)
	}

	seed := httptest.NewRecorder()
	csrfReq := httptest.NewRequest(http.MethodGet, "/api/auth/csrf", nil)
	app.Handler().ServeHTTP(seed, csrfReq)
	var csrfBody map[string]string
	_ = json.NewDecoder(seed.Body).Decode(&csrfBody)

	otpReq := httptest.NewRequest(http.MethodPost, "/api/ereport/invites/"+inviteID+"/otp", strings.NewReader(`{"email":"guest@example.com","t":"`+secret+`"}`))
	otpReq.Header.Set("Content-Type", "application/json")
	otpReq.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	otpReq.Header.Set("X-CSRF-Token", csrfBody["csrf"])
	copyCookies(otpReq, seed)
	otpRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(otpRec, otpReq)
	if otpRec.Code != http.StatusOK {
		t.Fatalf("otp: %d %s", otpRec.Code, otpRec.Body.String())
	}
	mail := app.mailer.(*recordingMailer).Last()
	if !strings.Contains(mail.To, "guest@example.com") {
		t.Fatalf("otp mail to %q", mail.To)
	}
	code := strings.TrimSpace(mail.Body[strings.LastIndex(mail.Body, "\n\n")+2:])
	code = strings.TrimSpace(strings.Split(code, "\n")[0])

	verifyReq := httptest.NewRequest(http.MethodPost, "/api/ereport/invites/"+inviteID+"/verify", strings.NewReader(`{"email":"guest@example.com","otp":"`+code+`","t":"`+secret+`"}`))
	verifyReq.Header.Set("Content-Type", "application/json")
	verifyReq.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	verifyReq.Header.Set("X-CSRF-Token", csrfBody["csrf"])
	copyCookies(verifyReq, seed)
	verifyRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(verifyRec, verifyReq)
	if verifyRec.Code != http.StatusOK {
		t.Fatalf("verify: %d %s", verifyRec.Code, verifyRec.Body.String())
	}

	reuseReq := httptest.NewRequest(http.MethodPost, "/api/ereport/invites/"+inviteID+"/verify", strings.NewReader(`{"email":"guest@example.com","otp":"`+code+`","t":"`+secret+`"}`))
	reuseReq.Header.Set("Content-Type", "application/json")
	reuseReq.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	reuseReq.Header.Set("X-CSRF-Token", csrfBody["csrf"])
	copyCookies(reuseReq, seed)
	reuse := httptest.NewRecorder()
	app.Handler().ServeHTTP(reuse, reuseReq)
	if reuse.Code == http.StatusOK {
		t.Fatal("otp reuse must fail")
	}

	getRep := httptest.NewRequest(http.MethodGet, "/api/ereport/invite-session/reports/"+reportID, nil)
	copyCookies(getRep, verifyRec)
	got := httptest.NewRecorder()
	app.Handler().ServeHTTP(got, getRep)
	if got.Code != http.StatusOK {
		t.Fatalf("invite get report: %d %s", got.Code, got.Body.String())
	}

	putBody, _ := json.Marshal(map[string]any{"payload": emptyEreportPayload()})
	putReq := httptest.NewRequest(http.MethodPut, "/api/ereport/invite-session/reports/"+reportID, bytes.NewReader(putBody))
	putReq.Header.Set("Content-Type", "application/json")
	putReq.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	putReq.Header.Set("X-CSRF-Token", csrfBody["csrf"])
	copyCookies(putReq, seed)
	copyCookies(putReq, verifyRec)
	putRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(putRec, putReq)
	if putRec.Code != http.StatusOK {
		t.Fatalf("invite put: %d %s", putRec.Code, putRec.Body.String())
	}

	wrong := httptest.NewRequest(http.MethodGet, "/api/ereport/invite-session/reports/"+randomID(16), nil)
	copyCookies(wrong, verifyRec)
	wrongRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(wrongRec, wrong)
	if wrongRec.Code != http.StatusForbidden && wrongRec.Code != http.StatusNotFound {
		t.Fatalf("scope denial: %d", wrongRec.Code)
	}
}

func TestEreportInviteExpired(t *testing.T) {
	app := newTestApp(false)
	inv := ereportInvite{
		ID: randomID(16), Scope: inviteScopeReport, OwnerUserID: "member-1",
		OrgID: randomID(16), ReportID: randomID(16), InvitedEmail: "a@b.c",
		ExpiresAt: time.Now().UTC().Add(-time.Minute).Format(time.RFC3339),
		CreatedAt: nowRFC3339(), CanEdit: true,
	}
	secret := randomID(8)
	inv.SecretHash = app.hashOpaque("ereport-invite:"+inv.ID, secret)
	if err := app.ereport.saveInvite(inv); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/ereport/invites/"+inv.ID+"?t="+secret, nil)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	body := decodeMap(t, rec)
	if body["expired"] != true {
		t.Fatalf("expected expired: %v", body)
	}
}

func TestEreportImageUploadAndAccel(t *testing.T) {
	app := newTestApp(false)
	app.cfg.SecureCookies = true
	_ = app.grantEntitlement("member-1", productEreport)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Img","firstReportName":"Pic"}`)
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)

	png := tinyPNG()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	part, _ := mw.CreateFormFile("file", "shot.png")
	_, _ = part.Write(png)
	_ = mw.Close()
	req, rec := app.authedReq(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs/"+orgID+"/reports/"+reportID+"/images", "")
	req.Body = io.NopCloser(bytes.NewReader(buf.Bytes()))
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.ContentLength = int64(buf.Len())
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("upload: %d %s", rec.Code, rec.Body.String())
	}
	up := decodeMap(t, rec)
	if strings.Contains(rec.Body.String(), "data:") || strings.Contains(rec.Body.String(), "base64") {
		t.Fatal("new image must not be base64")
	}
	imageID := up["id"].(string)
	get, getRec := app.authedReq(t, "member@eduardoos.com", http.MethodGet, "/api/ereport/orgs/"+orgID+"/reports/"+reportID+"/images/"+imageID, "")
	app.Handler().ServeHTTP(getRec, get)
	if getRec.Code != http.StatusOK {
		t.Fatalf("get image: %d %s", getRec.Code, getRec.Body.String())
	}
	accel := getRec.Header().Get("X-Accel-Redirect")
	if !strings.HasPrefix(accel, "/internal-media/ereport/") {
		t.Fatalf("accel %q", accel)
	}
	if strings.Contains(accel, app.cfg.EreportMediaRoot) || strings.Contains(getRec.Body.String(), app.cfg.EreportMediaRoot) {
		t.Fatal("must not leak filesystem path")
	}

	bad := bytes.Repeat([]byte("<svg xmlns='n'></svg>"), 10)
	var buf2 bytes.Buffer
	mw2 := multipart.NewWriter(&buf2)
	part2, _ := mw2.CreateFormFile("file", "x.svg")
	_, _ = part2.Write(bad)
	_ = mw2.Close()
	badReq, badRec := app.authedReq(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs/"+orgID+"/reports/"+reportID+"/images", "")
	badReq.Body = io.NopCloser(bytes.NewReader(buf2.Bytes()))
	badReq.Header.Set("Content-Type", mw2.FormDataContentType())
	app.Handler().ServeHTTP(badRec, badReq)
	if badRec.Code == http.StatusCreated {
		t.Fatal("svg must be rejected")
	}

	gif := []byte("GIF89a" + strings.Repeat("x", 32))
	var buf3 bytes.Buffer
	mw3 := multipart.NewWriter(&buf3)
	part3, _ := mw3.CreateFormFile("file", "x.gif")
	_, _ = part3.Write(gif)
	_ = mw3.Close()
	gifReq, gifRec := app.authedReq(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs/"+orgID+"/reports/"+reportID+"/images", "")
	gifReq.Body = io.NopCloser(bytes.NewReader(buf3.Bytes()))
	gifReq.Header.Set("Content-Type", mw3.FormDataContentType())
	app.Handler().ServeHTTP(gifRec, gifReq)
	if gifRec.Code == http.StatusCreated {
		t.Fatal("gif must be rejected")
	}

	html := []byte("<!doctype html><script>alert(1)</script>")
	var buf4 bytes.Buffer
	mw4 := multipart.NewWriter(&buf4)
	part4, _ := mw4.CreateFormFile("file", "x.html")
	_, _ = part4.Write(html)
	_ = mw4.Close()
	htmlReq, htmlRec := app.authedReq(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs/"+orgID+"/reports/"+reportID+"/images", "")
	htmlReq.Body = io.NopCloser(bytes.NewReader(buf4.Bytes()))
	htmlReq.Header.Set("Content-Type", mw4.FormDataContentType())
	app.Handler().ServeHTTP(htmlRec, htmlReq)
	if htmlRec.Code == http.StatusCreated {
		t.Fatal("html must be rejected")
	}
}

func TestEreportAPIV1AdditiveAndHistory(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	_ = app.grantEntitlement("member-1", productAPI)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"API","firstReportName":"Base"}`)
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"ci"}`)
	if keyRec.Code != http.StatusCreated {
		t.Fatalf("apikey: %d %s", keyRec.Code, keyRec.Body.String())
	}
	secret := decodeMap(t, keyRec)["key"].(string)

	v1get := httptest.NewRequest(http.MethodGet, "/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, nil)
	v1get.Header.Set("Authorization", "Bearer "+secret)
	v1rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(v1rec, v1get)
	if v1rec.Code != http.StatusOK {
		t.Fatalf("v1 get: %d %s", v1rec.Code, v1rec.Body.String())
	}
	got := decodeMap(t, v1rec)
	if got["viewUrl"] == nil || got["ownerSafe"] == nil {
		t.Fatalf("missing viewUrl: %v", got)
	}
	payload := got["payload"].(map[string]any)
	payload["reportNumber"] = "N-1"
	secs := payload["sections"].([]any)
	sec := secs[0].(map[string]any)
	groups := sec["groups"].([]any)
	grp := groups[0].(map[string]any)
	items := grp["items"].([]any)
	items = append(items, map[string]any{"id": "new-1", "incidencia": "Door leak", "status": "reprobado"})
	grp["items"] = items
	groups[0] = grp
	sec["groups"] = groups
	secs[0] = sec
	payload["sections"] = secs
	postBody, _ := json.Marshal(map[string]any{"confirmOverwrite": true, "payload": payload})
	v1post := httptest.NewRequest(http.MethodPost, "/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, bytes.NewReader(postBody))
	v1post.Header.Set("Authorization", "Bearer "+secret)
	v1post.Header.Set("Content-Type", "application/json")
	postRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(postRec, v1post)
	if postRec.Code != http.StatusOK {
		t.Fatalf("v1 post: %d %s", postRec.Code, postRec.Body.String())
	}
	posted := decodeMap(t, postRec)
	if posted["snapshotId"] == nil {
		t.Fatal("expected snapshot")
	}

	payload["sections"].([]any)[0].(map[string]any)["groups"].([]any)[0].(map[string]any)["items"].([]any)[0].(map[string]any)["incidencia"] = "mutated"
	badBody, _ := json.Marshal(map[string]any{"confirmOverwrite": true, "payload": payload})
	bad := httptest.NewRequest(http.MethodPost, "/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, bytes.NewReader(badBody))
	bad.Header.Set("Authorization", "Bearer "+secret)
	bad.Header.Set("Content-Type", "application/json")
	badRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(badRec, bad)
	if badRec.Code != http.StatusBadRequest {
		t.Fatalf("mutation should 400, got %d %s", badRec.Code, badRec.Body.String())
	}
	if decodeMap(t, badRec)["error"] != "append_existing_item_modified" {
		t.Fatalf("want append_existing_item_modified, got %s", badRec.Body.String())
	}

	hist := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/ereport/orgs/"+orgID+"/reports/"+reportID+"/history", "")
	if hist.Code != http.StatusOK {
		t.Fatalf("history: %d %s", hist.Code, hist.Body.String())
	}

	docs := httptest.NewRequest(http.MethodGet, "/api/v1/docs", nil)
	docsRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(docsRec, docs)
	if docsRec.Code != http.StatusOK {
		t.Fatalf("docs: %d %s", docsRec.Code, docsRec.Body.String())
	}
	raw := docsRec.Body.String()
	if strings.Contains(raw, "S3_BUCKET") || strings.Contains(raw, "aws-sdk") {
		t.Fatalf("docs leaked S3 config: %s", raw)
	}
	if strings.Contains(raw, `"path":"/api/v1/ereport/reports/`) {
		t.Fatal("docs must not include flat ownerSafe report routes")
	}
	if !strings.Contains(raw, `"mode":"append"`) && !strings.Contains(raw, "mode append") {
		// docs must mention replace/append modes
		if !strings.Contains(raw, "replace") || !strings.Contains(raw, "append") {
			t.Fatal("docs must document append and replace modes")
		}
	}
}

func TestEreportAPIV1ReplaceFullSeed(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	_ = app.grantEntitlement("member-1", productAPI)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Alcaldia","firstReportName":"Model Checker stub"}`)
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"replace"}`)
	secret := decodeMap(t, keyRec)["key"].(string)

	seed := map[string]any{
		"appTitle": "Issue Tracker", "orgName": "Alcaldía de Buenos Aires",
		"reportName": "Model Checker 1.1", "reportDate": "2026-08-31",
		"reportNumber": "ModelBA-1.1-C20MCB-100", "theme": "dark",
		"validationCriteria": []any{},
		"sections": []any{
			map[string]any{
				"id": "sec-qa-1", "title": "1. Product", "kind": "funcionalidades",
				"groups": []any{
					map[string]any{
						"id": "g-qa-1", "title": "General",
						"items": []any{
							map[string]any{"id": "qa-1", "incidencia": "ok path", "status": "aprobado"},
							map[string]any{"id": "qa-2", "incidencia": "n/a path", "status": "no_aplica"},
							map[string]any{"id": "qa-3", "incidencia": "fail path", "status": "reprobado"},
						},
					},
				},
			},
			map[string]any{
				"id": "sec-qa-2", "title": "2. More",
				"groups": []any{
					map[string]any{
						"id": "g-qa-2", "title": "G2",
						"items": []any{
							map[string]any{"id": "qa-4", "incidencia": "another ok", "status": "aprobado"},
						},
					},
				},
			},
		},
	}

	// replace without confirm → replace_confirm_required
	noConfirm, _ := json.Marshal(map[string]any{"mode": "replace", "confirmOverwrite": false, "payload": seed})
	ncReq := httptest.NewRequest(http.MethodPost, "/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, bytes.NewReader(noConfirm))
	ncReq.Header.Set("Authorization", "Bearer "+secret)
	ncReq.Header.Set("Content-Type", "application/json")
	ncRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(ncRec, ncReq)
	if ncRec.Code != http.StatusBadRequest || decodeMap(t, ncRec)["error"] != "replace_confirm_required" {
		t.Fatalf("want replace_confirm_required, got %d %s", ncRec.Code, ncRec.Body.String())
	}

	postBody, _ := json.Marshal(map[string]any{
		"confirmOverwrite": true, "mode": "replace", "tema": "Model Checker 1.1", "payload": seed,
	})
	postReq := httptest.NewRequest(http.MethodPost, "/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, bytes.NewReader(postBody))
	postReq.Header.Set("Authorization", "Bearer "+secret)
	postReq.Header.Set("Content-Type", "application/json")
	postRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(postRec, postReq)
	if postRec.Code != http.StatusOK {
		t.Fatalf("replace: %d %s", postRec.Code, postRec.Body.String())
	}
	posted := decodeMap(t, postRec)
	if posted["snapshotId"] == nil {
		t.Fatal("expected history snapshot on replace")
	}
	pl := posted["payload"].(map[string]any)
	if countEreportItems(pl) != 4 {
		t.Fatalf("want 4 items after replace, got %d", countEreportItems(pl))
	}
	if asString(pl["theme"]) != "dark" || asString(pl["reportNumber"]) != "ModelBA-1.1-C20MCB-100" {
		t.Fatalf("root meta: %v", pl)
	}
	// Stub template id must be gone unless in seed.
	for _, sec := range asMapSlice(pl["sections"]) {
		for _, g := range asMapSlice(sec["groups"]) {
			for _, it := range asMapSlice(g["items"]) {
				if asString(it["id"]) == "group-1-item-1" {
					t.Fatal("stub group-1-item-1 must not remain after replace")
				}
			}
		}
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, nil)
	getReq.Header.Set("Authorization", "Bearer "+secret)
	getRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("get after replace: %d %s", getRec.Code, getRec.Body.String())
	}
	gotPL := decodeMap(t, getRec)["payload"].(map[string]any)
	if countEreportItems(gotPL) != 4 {
		t.Fatalf("GET item count %d", countEreportItems(gotPL))
	}

	// append still rejects aprobado new items
	appendBad, _ := json.Marshal(map[string]any{
		"confirmOverwrite": true,
		"mode":             "append",
		"payload": map[string]any{
			"sections": []any{
				map[string]any{
					"id": "sec-qa-1",
					"groups": []any{
						map[string]any{
							"id": "g-qa-1",
							"items": []any{
								map[string]any{"id": "qa-1", "incidencia": "ok path", "status": "aprobado"},
								map[string]any{"id": "qa-new-ok", "incidencia": "should fail", "status": "aprobado"},
							},
						},
					},
				},
			},
		},
	})
	abReq := httptest.NewRequest(http.MethodPost, "/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, bytes.NewReader(appendBad))
	abReq.Header.Set("Authorization", "Bearer "+secret)
	abReq.Header.Set("Content-Type", "application/json")
	abRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(abRec, abReq)
	if abRec.Code != http.StatusBadRequest || decodeMap(t, abRec)["error"] != "append_invalid_new_item_status" {
		t.Fatalf("want append_invalid_new_item_status, got %d %s", abRec.Code, abRec.Body.String())
	}

	// other user's key cannot replace
	_ = app.grantEntitlement("admin-1", productEreport)
	_ = app.grantEntitlement("admin-1", productAPI)
	otherKey := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"other"}`)
	otherSecret := decodeMap(t, otherKey)["key"].(string)
	cross, _ := json.Marshal(map[string]any{"confirmOverwrite": true, "mode": "replace", "payload": seed})
	crossReq := httptest.NewRequest(http.MethodPost, "/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, bytes.NewReader(cross))
	crossReq.Header.Set("Authorization", "Bearer "+otherSecret)
	crossReq.Header.Set("Content-Type", "application/json")
	crossRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(crossRec, crossReq)
	if crossRec.Code == http.StatusOK {
		t.Fatal("cross-user replace must not succeed")
	}
}

func TestEreportV1HealsStaleOwnerUserIDAndSkipsOrphans(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	_ = app.grantEntitlement("member-1", productAPI)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"Alcaldia","firstReportName":"Tablet"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", created.Code, created.Body.String())
	}
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	healthyID := body["report"].(map[string]any)["id"].(string)
	user := app.mustUser("member@eduardoos.com")

	// Hex id with stale ownerUserId (account remint) but files under current owner tree.
	staleHex := "89853904ec25e6b790b2254d92e87ff9"
	staleMeta := ereportMeta{
		ID: staleHex, Tema: "Model Checker 1.1", OrgID: orgID,
		OwnerUserID: user.ID, CreatedAt: nowRFC3339(), UpdatedAt: nowRFC3339(),
	}
	if err := app.ereport.saveReport(user.ID, staleMeta, map[string]any{
		"orgName": "Alcaldia", "reportName": "Model Checker 1.1", "sections": []any{},
	}); err != nil {
		t.Fatal(err)
	}
	staleMeta.OwnerUserID = "f77444e7cce71d64baf20e3c"
	metaPath, err := app.ereport.reportMetaPath(user.ID, orgID, staleHex)
	if err != nil {
		t.Fatal(err)
	}
	if err := app.ereport.writeJSON(metaPath, staleMeta); err != nil {
		t.Fatal(err)
	}
	// UUID id, same stale owner mismatch.
	staleUUID := "6d1b577e-91ac-373b-f7f5-8a2d712f7f3a"
	staleUUIDMeta := ereportMeta{
		ID: staleUUID, Tema: "website issues", OrgID: orgID,
		OwnerUserID: user.ID, CreatedAt: nowRFC3339(), UpdatedAt: nowRFC3339(),
	}
	if err := app.ereport.saveReport(user.ID, staleUUIDMeta, map[string]any{
		"orgName": "eduardoos", "reportName": "website issues", "sections": []any{},
	}); err != nil {
		t.Fatal(err)
	}
	staleUUIDMeta.OwnerUserID = "f77444e7cce71d64baf20e3c"
	uuidMetaPath, err := app.ereport.reportMetaPath(user.ID, orgID, staleUUID)
	if err != nil {
		t.Fatal(err)
	}
	if err := app.ereport.writeJSON(uuidMetaPath, staleUUIDMeta); err != nil {
		t.Fatal(err)
	}
	// Library orphan: listed but no meta/payload on disk.
	orphanID := "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	lib, err := app.ereport.loadOrgLibrary(user.ID, orgID)
	if err != nil {
		t.Fatal(err)
	}
	lib.Reports = append(lib.Reports,
		ereportCard{ID: staleHex, Tema: "Model Checker 1.1", UpdatedAt: nowRFC3339()},
		ereportCard{ID: staleUUID, Tema: "website issues", UpdatedAt: nowRFC3339()},
		ereportCard{ID: orphanID, Tema: "ghost", UpdatedAt: nowRFC3339()},
	)
	if err := app.ereport.saveOrgLibrary(user.ID, orgID, lib); err != nil {
		t.Fatal(err)
	}

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"stale-owner"}`)
	secret := decodeMap(t, keyRec)["key"].(string)

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/ereport/orgs/"+orgID+"/reports", nil)
	listReq.Header.Set("Authorization", "Bearer "+secret)
	listRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list: %d %s", listRec.Code, listRec.Body.String())
	}
	listed := decodeMap(t, listRec)["reports"].([]any)
	ids := map[string]bool{}
	for _, raw := range listed {
		ids[raw.(map[string]any)["id"].(string)] = true
	}
	if !ids[healthyID] || !ids[staleHex] || !ids[staleUUID] {
		t.Fatalf("expected healthy+healed reports listed, got %v", ids)
	}
	if ids[orphanID] {
		t.Fatal("orphan without storage must not be listed")
	}

	for _, reportID := range []string{staleHex, staleUUID, healthyID} {
		getReq := httptest.NewRequest(http.MethodGet, "/api/v1/ereport/orgs/"+orgID+"/reports/"+reportID, nil)
		getReq.Header.Set("Authorization", "Bearer "+secret)
		getRec := httptest.NewRecorder()
		app.Handler().ServeHTTP(getRec, getReq)
		if getRec.Code != http.StatusOK {
			t.Fatalf("get %s: %d %s", reportID, getRec.Code, getRec.Body.String())
		}
		got := decodeMap(t, getRec)
		if got["payload"] == nil || got["viewUrl"] == nil {
			t.Fatalf("get %s missing payload/viewUrl: %v", reportID, got)
		}
		meta := got["meta"].(map[string]any)
		if meta["ownerUserId"] != user.ID {
			t.Fatalf("get %s owner not healed: %v", reportID, meta["ownerUserId"])
		}
	}

	// Healed meta persisted on disk.
	healed, _, err := app.ereport.loadReport(user.ID, orgID, staleHex)
	if err != nil || healed.OwnerUserID != user.ID {
		t.Fatalf("persisted heal: %+v err=%v", healed, err)
	}

	postBody, _ := json.Marshal(map[string]any{
		"confirmOverwrite": true,
		"payload": map[string]any{
			"orgName": "Alcaldia", "reportName": "Model Checker 1.1", "reportDate": "2026-09-10",
			"reportNumber": "ModelBA-1.1",
			"sections": []any{
				map[string]any{
					"id": "api-fix-smoke", "title": "API fix smoke",
					"groups": []any{
						map[string]any{
							"id": "api-fix-smoke-g", "title": "smoke",
							"items": []any{
								map[string]any{
									"id": "api-fix-smoke-item-1", "nombre": "smoke",
									"incidencia": "Post-fix smoke issue — safe to close",
									"solucion":   "", "status": "reprobado",
									"fechaIncidencia": "", "fechaSolucion": "",
									"imagesIncidencia": []any{}, "imagesSolucion": []any{},
								},
							},
						},
					},
				},
			},
		},
	})
	postReq := httptest.NewRequest(http.MethodPost, "/api/v1/ereport/orgs/"+orgID+"/reports/"+staleHex, bytes.NewReader(postBody))
	postReq.Header.Set("Authorization", "Bearer "+secret)
	postReq.Header.Set("Content-Type", "application/json")
	postRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(postRec, postReq)
	if postRec.Code != http.StatusOK {
		t.Fatalf("post healed report: %d %s", postRec.Code, postRec.Body.String())
	}

	missReq := httptest.NewRequest(http.MethodGet, "/api/v1/ereport/orgs/"+orgID+"/reports/"+orphanID, nil)
	missReq.Header.Set("Authorization", "Bearer "+secret)
	missRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(missRec, missReq)
	if missRec.Code != http.StatusNotFound {
		t.Fatalf("missing report: %d %s", missRec.Code, missRec.Body.String())
	}
	miss := decodeMap(t, missRec)
	if miss["error"] != "report_storage_missing" || miss["reportId"] != orphanID || miss["orgId"] != orgID {
		t.Fatalf("expected actionable missing error, got %v", miss)
	}
}

func TestEreportSourceHasNoS3Runtime(t *testing.T) {
	entries, err := os.ReadDir(".")
	if err != nil {
		t.Fatal(err)
	}
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
			continue
		}
		if !strings.HasPrefix(name, "ereport_") {
			continue
		}
		src, readErr := os.ReadFile(name)
		if readErr != nil {
			t.Fatal(readErr)
		}
		lower := strings.ToLower(string(src))
		if strings.Contains(lower, "github.com/aws/") || strings.Contains(lower, "s3_bucket") || strings.Contains(lower, "aws-sdk") {
			t.Fatalf("%s must not depend on S3", name)
		}
	}
}

func TestMergeAPIPayload_AddItemRejectsMutation(t *testing.T) {
	stored := emptyEreportPayload()
	incoming := deepCloneMap(stored)
	incoming["reportNumber"] = "N-1"
	secs := asMapSlice(incoming["sections"])
	grps := asMapSlice(secs[0]["groups"])
	items := asMapSlice(grps[0]["items"])
	items = append(items, map[string]any{"id": "new-1", "incidencia": "False positive", "status": "reprobado"})
	grps[0]["items"] = toAnySlice(items)
	secs[0]["groups"] = toAnySlice(grps)
	incoming["sections"] = toAnySlice(secs)
	out, err := mergeAPIPayload(stored, incoming)
	if err != nil {
		t.Fatal(err)
	}
	bad := deepCloneMap(out)
	badSecs := asMapSlice(bad["sections"])
	badGrps := asMapSlice(badSecs[0]["groups"])
	badItems := asMapSlice(badGrps[0]["items"])
	badItems[0]["incidencia"] = "changed"
	badGrps[0]["items"] = toAnySlice(badItems)
	badSecs[0]["groups"] = toAnySlice(badGrps)
	bad["sections"] = toAnySlice(badSecs)
	if err := func() error {
		_, e := mergeAPIPayload(out, bad)
		return e
	}(); err == nil {
		t.Fatal("want modify error")
	} else if api := asAPIWriteErr(err); api.Code != "append_existing_item_modified" {
		t.Fatalf("want append_existing_item_modified, got %v", err)
	}
}

func TestPrepareReplacePayload_AllowsMixedStatuses(t *testing.T) {
	seed := map[string]any{
		"appTitle": "Issue Tracker", "orgName": "Alcaldía", "reportName": "Model Checker 1.1",
		"reportDate": "2026-08-31", "reportNumber": "ModelBA-1.1", "theme": "dark",
		"validationCriteria": []any{},
		"sections": []any{
			map[string]any{
				"id": "sec-1", "title": "1", "kind": "funcionalidades",
				"groups": []any{
					map[string]any{
						"id": "g-1", "title": "General",
						"items": []any{
							map[string]any{"id": "i-ok", "incidencia": "ok", "status": "aprobado"},
							map[string]any{"id": "i-na", "incidencia": "n/a", "status": "no_aplica"},
							map[string]any{"id": "i-bad", "incidencia": "fail", "status": "reprobado"},
						},
					},
				},
			},
		},
	}
	out, err := prepareReplacePayload(seed)
	if err != nil {
		t.Fatal(err)
	}
	if countEreportItems(out) != 3 {
		t.Fatalf("item count %d", countEreportItems(out))
	}
	if asString(out["theme"]) != "dark" || asString(out["orgName"]) != "Alcaldía" {
		t.Fatalf("root meta lost: %v", out)
	}
}

func TestEreportImportFromFilesUsesUsernameAndEmailDirectory(t *testing.T) {
	app := newTestApp(false)
	user := app.mustUser("member@eduardoos.com")
	dir := t.TempDir()
	metaPath := filepath.Join(dir, "meta.json")
	payloadPath := filepath.Join(dir, "report.json")
	if err := os.WriteFile(metaPath, []byte(`{
		"id":"4120fcdf-b872-4493-9c3f-785e6c282809",
		"tema":"eduardoos.com_fixes",
		"ownerEmail":"eduardooost@gmail.com",
		"ownerSafe":"eduardooost_at_gmail.com",
		"createdAt":"2026-08-20T16:06:54Z",
		"updatedAt":"2026-08-20T16:06:54Z"
	}`), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(payloadPath, []byte(`{
		"appTitle":"Issue Tracker",
		"reportDate":"",
		"reportNumber":"",
		"sections":[{"id":"section-a","kind":"funcionalidades","title":"1. Product / platform","groups":[{"id":"group-1","title":"General","items":[{"id":"group-1-item-1","incidencia":"","images":[]}]}]}]
	}`), 0600); err != nil {
		t.Fatal(err)
	}

	result, err := importEreportFromFiles(context.Background(), app.store, app.ereport, ereportImportArgs{
		Email: "member@eduardoos.com", MetaPath: metaPath, PayloadPath: payloadPath, OrgName: "eduardoos.com",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.OwnerUserID != user.ID || result.ReportID != "4120fcdf-b872-4493-9c3f-785e6c282809" {
		t.Fatalf("ids: %+v", result)
	}
	if !strings.Contains(result.ViewPath, "org="+result.OrgID) || !strings.Contains(result.ViewPath, "report="+result.ReportID) {
		t.Fatalf("view path: %s", result.ViewPath)
	}

	meta, payload, err := app.ereport.loadReport(user.ID, result.OrgID, result.ReportID)
	if err != nil {
		t.Fatal(err)
	}
	if meta.Tema != "eduardoos.com_fixes" || payload["reportName"] != "eduardoos.com_fixes" {
		t.Fatalf("payload: tema=%s name=%v", meta.Tema, payload["reportName"])
	}
	if payload["orgName"] != "eduardoos.com" {
		t.Fatalf("orgName: %v", payload["orgName"])
	}

	rootEntries, err := os.ReadDir(app.cfg.EreportMediaRoot)
	if err != nil {
		t.Fatal(err)
	}
	present := map[string]bool{}
	for _, entry := range rootEntries {
		present[entry.Name()] = true
	}
	wantUsername := ereportUsernameSegment(user.Username, user.Email)
	if !present[wantUsername] || !present[ereportOwnerIndexDir] {
		t.Fatalf("root entries %v want %s and %s", present, wantUsername, ereportOwnerIndexDir)
	}
	ownerEntries, err := os.ReadDir(filepath.Join(app.cfg.EreportMediaRoot, wantUsername))
	if err != nil {
		t.Fatal(err)
	}
	wantEmailDir := ereportSafeEmail(user.Email)
	if len(ownerEntries) != 1 || ownerEntries[0].Name() != wantEmailDir {
		t.Fatalf("owner dir entries %v want %s", ownerEntries, wantEmailDir)
	}

	again, err := importEreportFromFiles(context.Background(), app.store, app.ereport, ereportImportArgs{
		Email: "member@eduardoos.com", MetaPath: metaPath, PayloadPath: payloadPath, OrgName: "eduardoos.com",
	})
	if err != nil {
		t.Fatal(err)
	}
	if again.OrgID != result.OrgID || again.ReportID != result.ReportID {
		t.Fatalf("reimport changed ids: %+v %+v", result, again)
	}
}

func TestEreportV1ExecutionLog(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productEreport)
	_ = app.grantEntitlement("member-1", productAPI)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/ereport/orgs", `{"name":"ExecOrg","firstReportName":"ExecReport"}`)
	body := decodeMap(t, created)
	orgID := body["org"].(map[string]any)["id"].(string)
	reportID := body["report"].(map[string]any)["id"].(string)
	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"exec"}`)
	secret := decodeMap(t, keyRec)["key"].(string)
	base := "/api/v1/ereport/orgs/" + orgID + "/reports/" + reportID

	idBody, _ := json.Marshal(map[string]any{"stream": "C20MCB-100", "commit": "abc12345", "source": "ci", "app_version": "1.1.4"})
	idReq := httptest.NewRequest(http.MethodPut, base+"/executions/identity", bytes.NewReader(idBody))
	idReq.Header.Set("Authorization", "Bearer "+secret)
	idReq.Header.Set("Content-Type", "application/json")
	idRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(idRec, idReq)
	if idRec.Code != http.StatusOK {
		t.Fatalf("identity put: %d %s", idRec.Code, idRec.Body.String())
	}

	runBody, _ := json.Marshal(map[string]any{
		"execution_id": "1909cd0067864d07b60a40c778799698",
		"identity":     map[string]any{"stream": "C20MCB-100", "commit": "abc12345", "source": "ci"},
		"subject":      map[string]any{"title": "demo-model"},
		"steps": []any{
			map[string]any{
				"step_id": "CU 6.2.1", "group_id": "6.2", "status": "fail", "pass": false,
				"messages": []any{"Door clearance fail", map[string]any{"text": "measured 0.8", "required": "0.9"}},
				"artifacts": []any{map[string]any{"role": "log", "uri": "file:///tmp/cu.log"}},
			},
			map[string]any{"step_id": "CU 6.2.2", "status": "pass", "pass": true, "messages": []any{}},
		},
	})
	postReq := httptest.NewRequest(http.MethodPost, base+"/executions", bytes.NewReader(runBody))
	postReq.Header.Set("Authorization", "Bearer "+secret)
	postReq.Header.Set("Content-Type", "application/json")
	postRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(postRec, postReq)
	if postRec.Code != http.StatusCreated {
		t.Fatalf("post execution: %d %s", postRec.Code, postRec.Body.String())
	}

	dup := httptest.NewRequest(http.MethodPost, base+"/executions", bytes.NewReader(runBody))
	dup.Header.Set("Authorization", "Bearer "+secret)
	dup.Header.Set("Content-Type", "application/json")
	dupRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(dupRec, dup)
	if dupRec.Code != http.StatusConflict {
		t.Fatalf("dup want 409, got %d %s", dupRec.Code, dupRec.Body.String())
	}

	stReq := httptest.NewRequest(http.MethodGet, base+"/executions/status", nil)
	stReq.Header.Set("Authorization", "Bearer "+secret)
	stRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(stRec, stReq)
	if stRec.Code != http.StatusOK || !strings.Contains(stRec.Body.String(), "reason=ok") {
		t.Fatalf("status: %d %s", stRec.Code, stRec.Body.String())
	}

	ixReq := httptest.NewRequest(http.MethodGet, base+"/executions/index?stream=C20MCB-100&step_id=CU%206.2.1", nil)
	ixReq.Header.Set("Authorization", "Bearer "+secret)
	ixRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(ixRec, ixReq)
	if ixRec.Code != http.StatusOK {
		t.Fatalf("index: %d %s", ixRec.Code, ixRec.Body.String())
	}
	step := decodeMap(t, ixRec)["step"].(map[string]any)
	if step["last_status"] != "fail" || int(step["fail"].(float64)) != 1 {
		t.Fatalf("index step: %v", step)
	}

	getReq := httptest.NewRequest(http.MethodGet, base+"/executions/1909cd0067864d07b60a40c778799698", nil)
	getReq.Header.Set("Authorization", "Bearer "+secret)
	getRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("get run: %d %s", getRec.Code, getRec.Body.String())
	}

	sugReq := httptest.NewRequest(http.MethodGet, base+"/executions/1909cd0067864d07b60a40c778799698/ereport-append-items", nil)
	sugReq.Header.Set("Authorization", "Bearer "+secret)
	sugRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(sugRec, sugReq)
	if sugRec.Code != http.StatusOK {
		t.Fatalf("suggest: %d %s", sugRec.Code, sugRec.Body.String())
	}
	sug := decodeMap(t, sugRec)
	if int(sug["item_count"].(float64)) != 1 {
		t.Fatalf("want 1 suggested item, got %v", sug["item_count"])
	}

	listReq := httptest.NewRequest(http.MethodGet, base+"/executions?stream=C20MCB-100&step_id=CU%206.2.1", nil)
	listReq.Header.Set("Authorization", "Bearer "+secret)
	listRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("list: %d %s", listRec.Code, listRec.Body.String())
	}
	if int(decodeMap(t, listRec)["count"].(float64)) != 1 {
		t.Fatalf("list count: %s", listRec.Body.String())
	}

	docs := httptest.NewRequest(http.MethodGet, "/api/v1/docs", nil)
	docsRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(docsRec, docs)
	if !strings.Contains(docsRec.Body.String(), "executionLogSchema") || !strings.Contains(docsRec.Body.String(), "/executions") {
		t.Fatal("docs must include execution log schema and routes")
	}

	_ = app.grantEntitlement("admin-1", productEreport)
	_ = app.grantEntitlement("admin-1", productAPI)
	otherKey := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"other-exec"}`)
	otherSecret := decodeMap(t, otherKey)["key"].(string)
	cross := httptest.NewRequest(http.MethodGet, base+"/executions/index", nil)
	cross.Header.Set("Authorization", "Bearer "+otherSecret)
	crossRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(crossRec, cross)
	if crossRec.Code == http.StatusOK {
		t.Fatal("cross-user execution read must fail")
	}
}

func TestTrimRunsPerStream(t *testing.T) {
	runs := make([]executionRun, 0, 60)
	for i := 0; i < 60; i++ {
		runs = append(runs, executionRun{
			ExecutionID: fmt.Sprintf("run-%02dxxxxxxxxxxxxxxxxxxxx", i),
			Identity:    executionIdentity{Stream: "A"},
			Steps:       []executionStep{{StepID: "s1", Status: "pass", Pass: true}},
		})
	}
	out := trimRunsPerStream(runs, 50)
	if len(out) != 50 {
		t.Fatalf("want 50, got %d", len(out))
	}
	if out[0].ExecutionID != "run-10xxxxxxxxxxxxxxxxxxxx" || out[49].ExecutionID != "run-59xxxxxxxxxxxxxxxxxxxx" {
		t.Fatalf("kept wrong window: %s .. %s", out[0].ExecutionID, out[49].ExecutionID)
	}
}

func tinyPNG() []byte {
	return []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
		0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
		0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
		0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00,
		0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
	}
}
