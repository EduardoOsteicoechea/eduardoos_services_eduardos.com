package main

import (
	"bytes"
	"context"
	"encoding/json"
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
	want := filepath.Join(user.ID, "orgs", orgID, "reports", reportID)
	if !strings.Contains(filepath.ToSlash(metaPath), filepath.ToSlash(want)) {
		t.Fatalf("path %s missing %s", metaPath, want)
	}
	if strings.Contains(metaPath, "@") || strings.Contains(metaPath, "_at_") {
		t.Fatalf("path used email: %s", metaPath)
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
	if _, err := mergeAPIPayload(out, bad); err == nil || !strings.Contains(err.Error(), "cannot modify") {
		t.Fatalf("want modify error, got %v", err)
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
