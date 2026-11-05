package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newEeyesTestApp(t *testing.T) *App {
	t.Helper()
	cfg := config{
		ListenAddr:             "127.0.0.1:8081",
		MongoDatabase:          mongoDatabase,
		JWTSecret:              "test-jwt-secret-not-for-production",
		JWTIssuer:              jwtIssuer,
		JWTAudience:            jwtAudience,
		AppEnv:                 "production",
		MustLog:                true,
		MediaRoot:              filepath.Join(os.TempDir(), "eduardoos-eeyes-media-"+randomID(6)),
		EreportMaxImageBytes:   defaultMaxImageBytes,
		EreportMaxImageEdge:    defaultMaxImageEdge,
		EreportMaxPayloadBytes: defaultMaxPayloadBytes,
		AllowedOrigins:         []string{"https://eduardoos.com", "http://127.0.0.1:4321"},
		DeepSeekBaseURL:        "https://api.deepseek.com",
		DeepSeekModel:          "deepseek-v4-flash",
		KimiBaseURL:            "https://api.moonshot.ai/v1",
		KimiModel:              "kimi-k3",
	}
	app := newApp(cfg)
	app.mailer = &recordingMailer{}
	hash, err := hashPassword("correct-horse-battery")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "admin-1", Email: "admin@eduardoos.com", EmailNormalized: "admin@eduardoos.com",
		Username: "siteadmin", UsernameNormalized: "siteadmin", PasswordHash: hash,
		Role: roleAdmin, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "member-1", Email: "member@eduardoos.com", EmailNormalized: "member@eduardoos.com",
		Username: "member", UsernameNormalized: "member", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "other-1", Email: "other@eduardoos.com", EmailNormalized: "other@eduardoos.com",
		Username: "other", UsernameNormalized: "other", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	t.Cleanup(func() { _ = os.RemoveAll(cfg.MediaRoot) })
	return app
}

func eeyesCreatePairingCodes(t *testing.T, app *App) (pairingID, code1, code2, code3 string) {
	t.Helper()
	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/pairings", `{}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create pairing status=%d body=%s", rec.Code, rec.Body.String())
	}
	assertNoSecrets(t, rec.Body.String())
	var out struct {
		ID    string `json:"id"`
		Code1 string `json:"code1"`
		Code2 string `json:"code2"`
		Code3 string `json:"code3"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.ID == "" || len(out.Code1) != 4 || len(out.Code2) != 4 || len(out.Code3) != 4 {
		t.Fatalf("bad pairing payload: %+v", out)
	}
	return out.ID, out.Code1, out.Code2, out.Code3
}

func eeyesPairDevice(t *testing.T, app *App, code1, code2, code3 string) (token, deviceID string) {
	t.Helper()
	body := map[string]string{
		"code1": code1, "code2": code2, "code3": code3,
		"platform": "android", "model": "PixelTest", "shellVersion": "1",
	}
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/eeyes/device/pair", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("pair status=%d body=%s", rec.Code, rec.Body.String())
	}
	var out struct {
		Token    string `json:"token"`
		DeviceID string `json:"deviceId"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(out.Token, eeyesDeviceTokenPrefix) || out.DeviceID == "" {
		t.Fatalf("bad pair response: %+v", out)
	}
	return out.Token, out.DeviceID
}

func eeyesDeviceJSON(t *testing.T, app *App, token, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	var rdr *bytes.Reader
	if body != "" {
		rdr = bytes.NewReader([]byte(body))
	} else {
		rdr = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Authorization", "Bearer "+token)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	return rec
}

func TestEeyesPairingHappyPathAndReuse(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	pairingID, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	token, deviceID := eeyesPairDevice(t, app, c1, c2, c3)

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/pairings/"+pairingID, "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"status":"paired"`) {
		t.Fatalf("pairing status body=%s", rec.Body.String())
	}

	// reuse codes must fail
	raw, _ := json.Marshal(map[string]string{
		"code1": c1, "code2": c2, "code3": c3, "platform": "android", "model": "x", "shellVersion": "1",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/eeyes/device/pair", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("reuse want 401 got %d body=%s", rec.Code, rec.Body.String())
	}

	sync := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	if sync.Code != http.StatusOK || !strings.Contains(sync.Body.String(), deviceID) {
		t.Fatalf("sync=%s", sync.Body.String())
	}
	assertNoSecrets(t, sync.Body.String())
}

func TestEeyesPairingExpiredAndBruteforce(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, c1, _, _ := eeyesCreatePairingCodes(t, app)
	p, err := app.eeyes.PairingByCode1Hash(context.Background(), app.hashOpaque("eeyes-pair-1", c1))
	if err != nil {
		t.Fatal(err)
	}
	p.ExpiresAt = time.Now().UTC().Add(-time.Minute)
	_ = app.eeyes.UpdatePairing(context.Background(), p)

	raw, _ := json.Marshal(map[string]string{
		"code1": c1, "code2": "0000", "code3": "0000", "platform": "android", "model": "x", "shellVersion": "1",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/eeyes/device/pair", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expired want 401 got %d", rec.Code)
	}

	_, c1b, c2b, c3b := eeyesCreatePairingCodes(t, app)
	for i := 0; i < eeyesPairMaxAttempts; i++ {
		bad, _ := json.Marshal(map[string]string{
			"code1": c1b, "code2": "1111", "code3": "2222", "platform": "android", "model": "x", "shellVersion": "1",
		})
		req = httptest.NewRequest(http.MethodPost, "/api/eeyes/device/pair", bytes.NewReader(bad))
		req.Header.Set("Content-Type", "application/json")
		rec = httptest.NewRecorder()
		app.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized && rec.Code != http.StatusTooManyRequests {
			t.Fatalf("attempt %d status=%d", i, rec.Code)
		}
	}
	good, _ := json.Marshal(map[string]string{
		"code1": c1b, "code2": c2b, "code3": c3b, "platform": "android", "model": "x", "shellVersion": "1",
	})
	req = httptest.NewRequest(http.MethodPost, "/api/eeyes/device/pair", bytes.NewReader(good))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests && rec.Code != http.StatusUnauthorized {
		t.Fatalf("after bruteforce status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestEeyesRevokeImmediate(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	token, deviceID := eeyesPairDevice(t, app, c1, c2, c3)

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodDelete, "/api/eeyes/devices/"+deviceID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("revoke status=%d body=%s", rec.Code, rec.Body.String())
	}
	sync := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	if sync.Code != http.StatusUnauthorized || !strings.Contains(sync.Body.String(), "device_revoked") {
		t.Fatalf("expected device_revoked got %d %s", sync.Code, sync.Body.String())
	}
}

func TestEeyesCrossUserAndEntitlementLoss(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	if err := app.grantEntitlement("other-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	token, deviceID := eeyesPairDevice(t, app, c1, c2, c3)

	rec := app.doJSON(t, "other@eduardoos.com", http.MethodDelete, "/api/eeyes/devices/"+deviceID, "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("cross-user revoke want 404 got %d %s", rec.Code, rec.Body.String())
	}

	// drop entitlement for member-1
	ents, _ := app.store.EntitlementsByUser(context.Background(), "member-1")
	for _, e := range ents {
		if e != nil && e.Product == productEeyes {
			e.Active = false
			_ = app.store.UpsertEntitlement(context.Background(), e)
		}
	}
	sync := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	if sync.Code != http.StatusUnauthorized {
		t.Fatalf("entitlement loss want 401 got %d %s", sync.Code, sync.Body.String())
	}
}

func TestEeyesMediaUploadIdempotentAndRejects(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	token, deviceID := eeyesPairDevice(t, app, c1, c2, c3)

	createBody := map[string]any{
		"title": "Foto del recibo", "instructions": "Toma evidencia",
		"deviceId": deviceID, "photoIntervalSec": 0, "maxPhotos": 3, "audioSeconds": 10,
	}
	raw, _ := json.Marshal(createBody)
	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks", string(raw))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create task %d %s", rec.Code, rec.Body.String())
	}
	var created struct {
		Task struct {
			ID string `json:"id"`
		} `json:"task"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	taskID := created.Task.ID

	start := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/tasks/"+taskID+"/start", `{}`)
	if start.Code != http.StatusOK {
		t.Fatalf("start %d %s", start.Code, start.Body.String())
	}

	// minimal JPEG
	jpeg := []byte{0xff, 0xd8, 0xff, 0xd9}
	b64 := base64.StdEncoding.EncodeToString(jpeg)
	mediaBody := map[string]any{
		"clientMediaId": "11111111-1111-1111-1111-111111111111",
		"kind":          "image",
		"mime":          "image/jpeg",
		"capturedAt":    time.Now().UTC().Format(time.RFC3339),
		"sha256":        sha256Hex(jpeg),
		"dataBase64":    b64,
	}
	mb, _ := json.Marshal(mediaBody)
	up1 := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/tasks/"+taskID+"/media", string(mb))
	if up1.Code != http.StatusCreated {
		t.Fatalf("upload1 %d %s", up1.Code, up1.Body.String())
	}
	up2 := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/tasks/"+taskID+"/media", string(mb))
	if up2.Code != http.StatusCreated {
		t.Fatalf("upload2 idempotent %d %s", up2.Code, up2.Body.String())
	}

	bad := map[string]any{
		"clientMediaId": "22222222-2222-2222-2222-222222222222",
		"kind":          "image",
		"dataBase64":    base64.StdEncoding.EncodeToString([]byte("not-an-image")),
	}
	bb, _ := json.Marshal(bad)
	badRec := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/tasks/"+taskID+"/media", string(bb))
	if badRec.Code != http.StatusBadRequest {
		t.Fatalf("bad mime want 400 got %d %s", badRec.Code, badRec.Body.String())
	}

	huge := bytes.Repeat([]byte{0xff, 0xd8, 0xff, 0xd9}, (eeyesMaxImageBytes/4)+8)
	// force jpeg magic at start
	huge[0], huge[1], huge[2] = 0xff, 0xd8, 0xff
	tooBig := map[string]any{
		"clientMediaId": "33333333-3333-3333-3333-333333333333",
		"kind":          "image",
		"dataBase64":    base64.StdEncoding.EncodeToString(huge),
	}
	tb, _ := json.Marshal(tooBig)
	bigRec := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/tasks/"+taskID+"/media", string(tb))
	if bigRec.Code != http.StatusRequestEntityTooLarge && bigRec.Code != http.StatusBadRequest {
		t.Fatalf("too large want 413/400 got %d %s", bigRec.Code, bigRec.Body.String())
	}

	done := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/tasks/"+taskID+"/complete", `{}`)
	if done.Code != http.StatusOK {
		t.Fatalf("complete %d %s", done.Code, done.Body.String())
	}
	comps := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/completions", "")
	if comps.Code != http.StatusOK || !strings.Contains(comps.Body.String(), taskID) {
		t.Fatalf("completions %s", comps.Body.String())
	}
	assertNoSecrets(t, comps.Body.String())
}

func TestEeyesSyncSendsUpcomingNotifications(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	token, deviceID := eeyesPairDevice(t, app, c1, c2, c3)

	create := func(title string, at time.Time) {
		t.Helper()
		raw, _ := json.Marshal(map[string]any{
			"title": title, "deviceId": deviceID, "maxPhotos": 1,
			"notifyAt": at.UTC().Format(time.RFC3339),
		})
		rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks", string(raw))
		if rec.Code != http.StatusCreated {
			t.Fatalf("create %s %d %s", title, rec.Code, rec.Body.String())
		}
	}
	create("soon", time.Now().Add(15*time.Minute))
	create("later", time.Now().Add(eeyesNotificationHorizon+time.Hour))

	rec := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("sync %d %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Notifications []struct {
			Title string `json:"title"`
		} `json:"notifications"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if len(body.Notifications) != 1 || body.Notifications[0].Title != "soon" {
		t.Fatalf("want only the upcoming notification, got %+v", body.Notifications)
	}
}

func TestEeyesNoticeLifecycle(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	token, deviceID := eeyesPairDevice(t, app, c1, c2, c3)

	bad := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks",
		`{"title":"x","deviceId":"`+deviceID+`","kind":"other"}`)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("unknown kind must 400, got %d", bad.Code)
	}

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks",
		`{"title":"Aviso","instructions":"Hola","deviceId":"`+deviceID+`","kind":"notice","maxPhotos":9}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create notice %d %s", rec.Code, rec.Body.String())
	}
	var created struct {
		Task eeyesTask `json:"task"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.Task.Kind != eeyesTaskKindNotice || created.Task.NotifyAt == nil || created.Task.MaxPhotos != 0 {
		t.Fatalf("notice defaults wrong: %+v", created.Task)
	}

	sync := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	var body struct {
		Tasks         []map[string]any `json:"tasks"`
		Notifications []struct {
			Key string `json:"key"`
		} `json:"notifications"`
	}
	_ = json.Unmarshal(sync.Body.Bytes(), &body)
	if len(body.Tasks) != 0 || len(body.Notifications) != 1 {
		t.Fatalf("notice must notify without listing a task: %s", sync.Body.String())
	}

	ack := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/notifications/ack",
		`{"keys":["`+body.Notifications[0].Key+`"]}`)
	if ack.Code != http.StatusOK {
		t.Fatalf("ack %d", ack.Code)
	}
	got, _ := app.eeyes.TaskByID(context.Background(), created.Task.ID)
	if got == nil || got.Status != eeyesTaskCompleted || got.CompletedAt == nil {
		t.Fatalf("acked notice must be delivered: %+v", got)
	}
	comps := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/completions", "")
	if strings.Contains(comps.Body.String(), created.Task.ID) {
		t.Fatal("notices must not appear in completions")
	}
}

func TestEeyesDownloadFromVersionSubdir(t *testing.T) {
	app := newEeyesTestApp(t)
	root := t.TempDir()
	app.cfg.EeyesReleasesRoot = root
	androidDir := filepath.Join(root, "android")
	if err := os.MkdirAll(filepath.Join(androidDir, "42"), 0o755); err != nil {
		t.Fatal(err)
	}
	apk := []byte("PK\x03\x04fake-apk")
	if err := os.WriteFile(filepath.Join(androidDir, "42", "eeyes-android.apk"), apk, 0o644); err != nil {
		t.Fatal(err)
	}
	writeLatest := func(file string) {
		t.Helper()
		raw := `{"versionCode":42,"versionName":"1.0.42","sha256":"x","size":12,"minVersionCode":1,"file":"` + file + `"}`
		if err := os.WriteFile(filepath.Join(androidDir, "latest.json"), []byte(raw), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	for _, file := range []string{"eeyes-android.apk", "42/eeyes-android.apk"} {
		writeLatest(file)
		rec := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/eeyes/downloads/android", "")
		if rec.Code != http.StatusOK || !bytes.Equal(rec.Body.Bytes(), apk) {
			t.Fatalf("file=%q download %d %q", file, rec.Code, rec.Body.String())
		}
		if cd := rec.Header().Get("Content-Disposition"); !strings.Contains(cd, "eeyes-android.apk") {
			t.Fatalf("content-disposition %q", cd)
		}
	}

	writeLatest("../../etc/passwd")
	rec := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/eeyes/downloads/android", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("traversal must 404, got %d", rec.Code)
	}
}

func TestEeyesUIServesHTML(t *testing.T) {
	app := newEeyesTestApp(t)
	req := httptest.NewRequest(http.MethodGet, "/api/eeyes/ui", nil)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "eEyes") {
		t.Fatalf("ui index %d %s", rec.Code, rec.Body.String())
	}
	if csp := rec.Header().Get("Content-Security-Policy"); !strings.Contains(csp, "connect-src 'none'") {
		t.Fatalf("missing CSP: %s", csp)
	}
	if !strings.Contains(rec.Body.String(), `/api/eeyes/ui/app-js`) || !strings.Contains(rec.Body.String(), `/api/eeyes/ui/app-css`) {
		t.Fatal("index must link extensionless assets")
	}
	for path, want := range map[string]string{
		"/api/eeyes/ui/app-js":  "eeyesBridge",
		"/api/eeyes/ui/app.js":  "eeyesBridge",
		"/api/eeyes/ui/app-css": "{",
	} {
		req = httptest.NewRequest(http.MethodGet, path, nil)
		rec = httptest.NewRecorder()
		app.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), want) {
			t.Fatalf("%s -> %d", path, rec.Code)
		}
	}
}
