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

func eeyesPairStep(t *testing.T, app *App, body map[string]any) *httptest.ResponseRecorder {
	t.Helper()
	if _, ok := body["platform"]; !ok {
		body["platform"] = "android"
	}
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/eeyes/device/pair", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	return rec
}

func eeyesPairSession(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var out struct {
		Session string `json:"session"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if rec.Code != http.StatusOK || out.Session == "" {
		t.Fatalf("step1 status=%d body=%s", rec.Code, rec.Body.String())
	}
	return out.Session
}

func eeyesPairDevice(t *testing.T, app *App, code1, code2, code3 string) (token, deviceID string) {
	t.Helper()
	return eeyesPairDeviceInstall(t, app, code1, code2, code3, "")
}

func eeyesPairDeviceInstall(t *testing.T, app *App, code1, code2, code3, installID string) (token, deviceID string) {
	t.Helper()
	session := eeyesPairSession(t, eeyesPairStep(t, app, map[string]any{"step": 1, "code1": code1}))
	if rec := eeyesPairStep(t, app, map[string]any{"step": 2, "code1": code1, "code": code2, "session": session}); rec.Code != http.StatusOK {
		t.Fatalf("step2 status=%d body=%s", rec.Code, rec.Body.String())
	}
	rec := eeyesPairStep(t, app, map[string]any{
		"step": 3, "code1": code1, "code": code3, "session": session,
		"model": "PixelTest", "shellVersion": "1", "installId": installID,
	})
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
	rec = eeyesPairStep(t, app, map[string]any{"step": 1, "code1": c1})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("reuse want 401 got %d body=%s", rec.Code, rec.Body.String())
	}

	sync := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	if sync.Code != http.StatusOK || !strings.Contains(sync.Body.String(), deviceID) {
		t.Fatalf("sync=%s", sync.Body.String())
	}
	assertNoSecrets(t, sync.Body.String())
}

func TestEeyesPairingKeepsOtherDevices(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	pair := func(install, platform string) (token, deviceID string) {
		t.Helper()
		_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
		session := eeyesPairSession(t, eeyesPairStep(t, app, map[string]any{"step": 1, "code1": c1, "platform": platform}))
		if rec := eeyesPairStep(t, app, map[string]any{"step": 2, "code1": c1, "code": c2, "session": session, "platform": platform}); rec.Code != http.StatusOK {
			t.Fatalf("step2 %d %s", rec.Code, rec.Body.String())
		}
		rec := eeyesPairStep(t, app, map[string]any{
			"step": 3, "code1": c1, "code": c3, "session": session,
			"platform": platform, "model": install, "shellVersion": "1", "installId": install,
		})
		if rec.Code != http.StatusCreated {
			t.Fatalf("pair %s %d %s", install, rec.Code, rec.Body.String())
		}
		var out struct {
			Token    string `json:"token"`
			DeviceID string `json:"deviceId"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		return out.Token, out.DeviceID
	}
	tokenA, idA := pair("phone-a", "android")
	tokenB, idB := pair("phone-b", "android")
	tokenC, idC := pair("pc-c", "desktop")
	if idA == idB || idB == idC || idA == idC {
		t.Fatalf("pairing collapsed devices %s %s %s", idA, idB, idC)
	}
	listed := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/devices", "")
	body := listed.Body.String()
	if listed.Code != http.StatusOK || !strings.Contains(body, idA) || !strings.Contains(body, idB) || !strings.Contains(body, idC) {
		t.Fatalf("devices %s", body)
	}
	if strings.Contains(body, `"revokedAt"`) {
		t.Fatalf("new pair revoked a sibling: %s", body)
	}
	for _, token := range []string{tokenA, tokenB, tokenC} {
		sync := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
		if sync.Code != http.StatusOK {
			t.Fatalf("sibling sync %d %s", sync.Code, sync.Body.String())
		}
	}
	// Same install rotates only its own token.
	tokenA2, idA2 := pair("phone-a", "android")
	if idA2 != idA {
		t.Fatalf("same install created %s instead of reusing %s", idA2, idA)
	}
	if eeyesDeviceJSON(t, app, tokenA, http.MethodGet, "/api/eeyes/device/sync", "").Code == http.StatusOK {
		t.Fatal("rotated token still accepted")
	}
	if eeyesDeviceJSON(t, app, tokenA2, http.MethodGet, "/api/eeyes/device/sync", "").Code != http.StatusOK {
		t.Fatal("new token for the same install rejected")
	}
	if eeyesDeviceJSON(t, app, tokenB, http.MethodGet, "/api/eeyes/device/sync", "").Code != http.StatusOK ||
		eeyesDeviceJSON(t, app, tokenC, http.MethodGet, "/api/eeyes/device/sync", "").Code != http.StatusOK {
		t.Fatal("re-pair of one install revoked the others")
	}
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

	rec := eeyesPairStep(t, app, map[string]any{"step": 1, "code1": c1})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expired want 401 got %d", rec.Code)
	}

	_, c1b, c2b, _ := eeyesCreatePairingCodes(t, app)
	session := eeyesPairSession(t, eeyesPairStep(t, app, map[string]any{"step": 1, "code1": c1b}))
	for i := 0; i < eeyesPairMaxAttempts; i++ {
		rec = eeyesPairStep(t, app, map[string]any{"step": 2, "code1": c1b, "code": "1111", "session": session})
		if rec.Code != http.StatusUnauthorized && rec.Code != http.StatusTooManyRequests {
			t.Fatalf("attempt %d status=%d", i, rec.Code)
		}
	}
	rec = eeyesPairStep(t, app, map[string]any{"step": 2, "code1": c1b, "code": c2b, "session": session})
	if rec.Code != http.StatusTooManyRequests && rec.Code != http.StatusUnauthorized {
		t.Fatalf("after bruteforce status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestEeyesPairingStepsAreSequential(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	pairingID, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	pairingStep := func() int {
		t.Helper()
		rec := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/pairings/"+pairingID, "")
		var out struct {
			Step int `json:"step"`
		}
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
		return out.Step
	}
	if pairingStep() != 0 {
		t.Fatal("fresh pairing must be at step 0")
	}
	// Skipping step 1 (no session) must fail.
	if rec := eeyesPairStep(t, app, map[string]any{"step": 3, "code1": c1, "code": c3, "session": "x"}); rec.Code != http.StatusUnauthorized {
		t.Fatalf("skip to step 3 want 401 got %d", rec.Code)
	}
	session := eeyesPairSession(t, eeyesPairStep(t, app, map[string]any{"step": 1, "code1": c1}))
	if pairingStep() != 1 {
		t.Fatal("hub must see step 1 after code 1")
	}
	// Code 3 before code 2 must fail.
	if rec := eeyesPairStep(t, app, map[string]any{"step": 3, "code1": c1, "code": c3, "session": session}); rec.Code != http.StatusUnauthorized {
		t.Fatalf("step 3 before 2 want 401 got %d", rec.Code)
	}
	// Another device's session must fail.
	if rec := eeyesPairStep(t, app, map[string]any{"step": 2, "code1": c1, "code": c2, "session": "forged"}); rec.Code != http.StatusUnauthorized {
		t.Fatalf("forged session want 401 got %d", rec.Code)
	}
	if rec := eeyesPairStep(t, app, map[string]any{"step": 2, "code1": c1, "code": c2, "session": session}); rec.Code != http.StatusOK {
		t.Fatalf("step 2 %d %s", rec.Code, rec.Body.String())
	}
	if pairingStep() != 2 {
		t.Fatal("hub must see step 2 after code 2")
	}
}

func TestEeyesRepairSameInstallReusesDevice(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, a1, a2, a3 := eeyesCreatePairingCodes(t, app)
	oldToken, deviceID := eeyesPairDeviceInstall(t, app, a1, a2, a3, "install-abc")
	_, b1, b2, b3 := eeyesCreatePairingCodes(t, app)
	newToken, deviceID2 := eeyesPairDeviceInstall(t, app, b1, b2, b3, "install-abc")
	if deviceID2 != deviceID {
		t.Fatalf("same install must keep device id: %s vs %s", deviceID, deviceID2)
	}
	if rec := eeyesDeviceJSON(t, app, oldToken, http.MethodGet, "/api/eeyes/device/sync", ""); rec.Code != http.StatusUnauthorized {
		t.Fatalf("old token must stop working, got %d", rec.Code)
	}
	if rec := eeyesDeviceJSON(t, app, newToken, http.MethodGet, "/api/eeyes/device/sync", ""); rec.Code != http.StatusOK {
		t.Fatalf("new token sync %d", rec.Code)
	}
	_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	if _, other := eeyesPairDeviceInstall(t, app, c1, c2, c3, "install-xyz"); other != deviceID {
		t.Fatal("same model linked again must stay one device")
	}
	_, d1, d2, d3 := eeyesCreatePairingCodes(t, app)
	session := eeyesPairSession(t, eeyesPairStep(t, app, map[string]any{"step": 1, "code1": d1}))
	if rec := eeyesPairStep(t, app, map[string]any{"step": 2, "code1": d1, "code": d2, "session": session}); rec.Code != http.StatusOK {
		t.Fatalf("step2 %d", rec.Code)
	}
	rec := eeyesPairStep(t, app, map[string]any{
		"step": 3, "code1": d1, "code": d3, "session": session,
		"model": "SM-X400", "shellVersion": "1", "installId": "install-tab",
	})
	var tablet struct {
		DeviceID string `json:"deviceId"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &tablet)
	if rec.Code != http.StatusCreated || tablet.DeviceID == "" || tablet.DeviceID == deviceID {
		t.Fatalf("different model must stay linked: %d %s", rec.Code, rec.Body.String())
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
		"batchId": "batch-1",
	}
	raw, _ := json.Marshal(createBody)
	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks", string(raw))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create task %d %s", rec.Code, rec.Body.String())
	}
	var created struct {
		Task struct {
			ID      string `json:"id"`
			BatchID string `json:"batchId"`
		} `json:"task"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.Task.BatchID != "batch-1" {
		t.Fatalf("batchId %q", created.Task.BatchID)
	}
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
	var uploaded struct {
		Media struct {
			ID string `json:"id"`
		} `json:"media"`
	}
	_ = json.Unmarshal(up1.Body.Bytes(), &uploaded)
	patched := app.doJSON(t, "member@eduardoos.com", http.MethodPatch, "/api/eeyes/media/"+uploaded.Media.ID, `{"analysis":"nota de prueba"}`)
	if patched.Code != http.StatusOK {
		t.Fatalf("analysis %d %s", patched.Code, patched.Body.String())
	}
	if err := app.grantEntitlement("other-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	other := app.doJSON(t, "other@eduardoos.com", http.MethodPatch, "/api/eeyes/media/"+uploaded.Media.ID, `{"analysis":"ajeno"}`)
	if other.Code != http.StatusNotFound {
		t.Fatalf("other analysis want 404 got %d", other.Code)
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
	if comps.Code != http.StatusOK || !strings.Contains(comps.Body.String(), taskID) || !strings.Contains(comps.Body.String(), "nota de prueba") {
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
	if got, _ := app.eeyes.TaskByID(context.Background(), created.Task.ID); got == nil || got.NotifyDispatchedAt == nil {
		t.Fatal("sync must record when the notification was dispatched")
	}
	devs := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/devices", "")
	if !strings.Contains(devs.Body.String(), `"lastSyncAt"`) || !strings.Contains(devs.Body.String(), `"lastSyncNotifications":1`) {
		t.Fatalf("devices must expose last sync diagnostics: %s", devs.Body.String())
	}

	ack := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/notifications/ack",
		`{"keys":["`+body.Notifications[0].Key+`"]}`)
	if ack.Code != http.StatusOK {
		t.Fatalf("ack %d", ack.Code)
	}
	got, _ := app.eeyes.TaskByID(context.Background(), created.Task.ID)
	if got == nil || got.Status != eeyesTaskCompleted || got.CompletedAt == nil || got.NotifyAckedAt == nil {
		t.Fatalf("acked notice must be delivered: %+v", got)
	}
	comps := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/completions", "")
	if strings.Contains(comps.Body.String(), created.Task.ID) {
		t.Fatal("notices must not appear in completions")
	}
}

func TestEeyesScheduledPhotoLifecycle(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	token, deviceID := eeyesPairDevice(t, app, c1, c2, c3)

	bad := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks",
		`{"title":"Foto","deviceId":"`+deviceID+`","kind":"photo","cameraFacing":"side"}`)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("unknown camera must 400, got %d", bad.Code)
	}

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks",
		`{"title":"Foto","deviceId":"`+deviceID+`","kind":"photo","cameraFacing":"front","audioSeconds":30}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create photo %d %s", rec.Code, rec.Body.String())
	}
	var created struct {
		Task eeyesTask `json:"task"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	taskID := created.Task.ID
	if created.Task.Kind != eeyesTaskKindPhoto || created.Task.CameraFacing != eeyesCameraFront ||
		created.Task.NotifyAt == nil || created.Task.MaxPhotos != 1 || created.Task.AudioSeconds != 0 {
		t.Fatalf("photo defaults wrong: %+v", created.Task)
	}

	sync := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	var body struct {
		Tasks         []map[string]any `json:"tasks"`
		Notifications []struct {
			Key    string `json:"key"`
			Kind   string `json:"kind"`
			Facing string `json:"facing"`
		} `json:"notifications"`
	}
	_ = json.Unmarshal(sync.Body.Bytes(), &body)
	if len(body.Tasks) != 0 || len(body.Notifications) != 1 {
		t.Fatalf("photo must sync as a capture instruction only: %s", sync.Body.String())
	}
	n := body.Notifications[0]
	if n.Key != "capture:"+taskID || n.Kind != "capture" || n.Facing != eeyesCameraFront {
		t.Fatalf("capture instruction wrong: %+v", n)
	}

	jpeg := []byte{0xff, 0xd8, 0xff, 0xd9}
	upload := func(clientID, kind string) *httptest.ResponseRecorder {
		mb, _ := json.Marshal(map[string]any{
			"clientMediaId": clientID,
			"kind":          kind,
			"mime":          "image/jpeg",
			"sha256":        sha256Hex(jpeg),
			"dataBase64":    base64.StdEncoding.EncodeToString(jpeg),
		})
		return eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/tasks/"+taskID+"/media", string(mb))
	}
	if up := upload("22222222-2222-2222-2222-222222222222", "audio"); up.Code != http.StatusBadRequest {
		t.Fatalf("photo task must reject audio, got %d", up.Code)
	}
	if up := upload("33333333-3333-3333-3333-333333333333", "image"); up.Code != http.StatusCreated {
		t.Fatalf("photo upload without start %d %s", up.Code, up.Body.String())
	}
	got, _ := app.eeyes.TaskByID(context.Background(), taskID)
	if got == nil || got.Status != eeyesTaskCompleted || got.CompletedAt == nil {
		t.Fatalf("first photo must complete the task: %+v", got)
	}
	if up := upload("33333333-3333-3333-3333-333333333333", "image"); up.Code != http.StatusCreated {
		t.Fatalf("retried upload must stay idempotent after completion, got %d", up.Code)
	}
	if up := upload("44444444-4444-4444-4444-444444444444", "image"); up.Code != http.StatusConflict {
		t.Fatalf("second photo after completion must 409, got %d", up.Code)
	}

	ack := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/notifications/ack",
		`{"keys":["capture:`+taskID+`"]}`)
	if ack.Code != http.StatusOK {
		t.Fatalf("ack %d", ack.Code)
	}
	if got, _ := app.eeyes.TaskByID(context.Background(), taskID); got == nil || got.NotifyAckedAt == nil {
		t.Fatal("capture ack must be recorded")
	}
	comps := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/completions", "")
	if !strings.Contains(comps.Body.String(), taskID) || !strings.Contains(comps.Body.String(), `"kind":"image"`) {
		t.Fatalf("photo must appear in completions with its media: %s", comps.Body.String())
	}
}

func TestEeyesPhotoBurstStaysOpenUntilTheLastShot(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	token, deviceID := eeyesPairDevice(t, app, c1, c2, c3)

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks",
		`{"title":"Ráfaga","deviceId":"`+deviceID+`","kind":"photo","cameraFacing":"back","photoIntervalSec":10,"maxPhotos":3}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create burst %d %s", rec.Code, rec.Body.String())
	}
	var created struct {
		Task eeyesTask `json:"task"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &created)
	if created.Task.PhotoIntervalSec != 10 || created.Task.MaxPhotos != 3 || created.Task.AudioSeconds != 0 {
		t.Fatalf("burst fields: %+v", created.Task)
	}

	sync := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	if !strings.Contains(sync.Body.String(), `"intervalSec":10`) || !strings.Contains(sync.Body.String(), `"maxPhotos":3`) {
		t.Fatalf("sync must tell the shell the burst: %s", sync.Body.String())
	}

	jpeg := []byte{0xff, 0xd8, 0xff, 0xd9}
	upload := func(clientID string) *httptest.ResponseRecorder {
		mb, _ := json.Marshal(map[string]any{
			"clientMediaId": clientID,
			"kind":          "image",
			"mime":          "image/jpeg",
			"sha256":        sha256Hex(jpeg),
			"dataBase64":    base64.StdEncoding.EncodeToString(jpeg),
		})
		return eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/tasks/"+created.Task.ID+"/media", string(mb))
	}
	if up := upload("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"); up.Code != http.StatusCreated {
		t.Fatalf("first burst shot %d", up.Code)
	}
	early := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/tasks/"+created.Task.ID+"/complete", "{}")
	if early.Code != http.StatusConflict {
		t.Fatalf("complete before the last shot must 409, got %d", early.Code)
	}
	again := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	if !strings.Contains(again.Body.String(), `"imagesStored":1`) {
		t.Fatalf("sync must report the shots already stored: %s", again.Body.String())
	}
	ack := eeyesDeviceJSON(t, app, token, http.MethodPost, "/api/eeyes/device/notifications/ack",
		`{"keys":["capture:`+created.Task.ID+`"]}`)
	if ack.Code != http.StatusOK {
		t.Fatalf("ack %d", ack.Code)
	}
	resent := eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/sync", "")
	if !strings.Contains(resent.Body.String(), `"imagesStored":1`) || !strings.Contains(resent.Body.String(), created.Task.ID) {
		t.Fatalf("a short burst must stay on sync after ack: %s", resent.Body.String())
	}
	got, _ := app.eeyes.TaskByID(context.Background(), created.Task.ID)
	if got == nil || got.Status != eeyesTaskInProgress {
		t.Fatalf("burst must stay open after the first shot: %+v", got)
	}
	open := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/completions", "")
	if !strings.Contains(open.Body.String(), created.Task.ID) {
		t.Fatal("an open burst must already list its photos")
	}
	if up := upload("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2"); up.Code != http.StatusCreated {
		t.Fatalf("second burst shot %d", up.Code)
	}
	if up := upload("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3"); up.Code != http.StatusCreated {
		t.Fatalf("third burst shot %d", up.Code)
	}
	got, _ = app.eeyes.TaskByID(context.Background(), created.Task.ID)
	if got == nil || got.Status != eeyesTaskCompleted {
		t.Fatalf("last shot must complete the burst: %+v", got)
	}
	if up := upload("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4"); up.Code != http.StatusConflict {
		t.Fatalf("shot past the burst must 409, got %d", up.Code)
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

func TestEeyesDeviceWaitWakesOnTaskCreate(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
	token, deviceID := eeyesPairDevice(t, app, c1, c2, c3)

	type waitBody struct {
		Changed bool   `json:"changed"`
		V       string `json:"v"`
	}
	parse := func(rec *httptest.ResponseRecorder) waitBody {
		t.Helper()
		if rec.Code != http.StatusOK {
			t.Fatalf("wait %d %s", rec.Code, rec.Body.String())
		}
		var b waitBody
		if err := json.Unmarshal(rec.Body.Bytes(), &b); err != nil {
			t.Fatal(err)
		}
		return b
	}

	first := parse(eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/wait", ""))
	if !first.Changed || first.V == "" {
		t.Fatalf("stale version must answer immediately: %+v", first)
	}

	app.eeyesWake.timeout = 30 * time.Millisecond
	idle := parse(eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/wait?v="+first.V, ""))
	if idle.Changed || idle.V != first.V {
		t.Fatalf("idle wait must time out unchanged: %+v", idle)
	}

	app.eeyesWake.timeout = 5 * time.Second
	done := make(chan *httptest.ResponseRecorder, 1)
	go func() {
		done <- eeyesDeviceJSON(t, app, token, http.MethodGet, "/api/eeyes/device/wait?v="+first.V, "")
	}()
	for i := 0; i < 200; i++ {
		app.eeyesWake.mu.Lock()
		n := app.eeyesWake.waiting[deviceID]
		app.eeyesWake.mu.Unlock()
		if n > 0 {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks",
		`{"title":"Aviso","deviceId":"`+deviceID+`","kind":"notice"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create notice %d", rec.Code)
	}
	select {
	case got := <-done:
		woke := parse(got)
		if !woke.Changed || woke.V == first.V {
			t.Fatalf("task create must wake the device: %+v", woke)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("wait did not wake on task create")
	}
}

func TestEeyesSameModelCollapsesAndPackAnalysis(t *testing.T) {
	app := newEeyesTestApp(t)
	if err := app.grantEntitlement("member-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	pair := func(install, model, platform string) (token, deviceID string) {
		t.Helper()
		_, c1, c2, c3 := eeyesCreatePairingCodes(t, app)
		session := eeyesPairSession(t, eeyesPairStep(t, app, map[string]any{"step": 1, "code1": c1, "platform": platform}))
		if rec := eeyesPairStep(t, app, map[string]any{"step": 2, "code1": c1, "code": c2, "session": session, "platform": platform}); rec.Code != http.StatusOK {
			t.Fatalf("step2 %d %s", rec.Code, rec.Body.String())
		}
		rec := eeyesPairStep(t, app, map[string]any{
			"step": 3, "code1": c1, "code": c3, "session": session,
			"platform": platform, "model": model, "shellVersion": "1", "installId": install,
		})
		if rec.Code != http.StatusCreated {
			t.Fatalf("pair %s %d %s", install, rec.Code, rec.Body.String())
		}
		var out struct {
			Token    string `json:"token"`
			DeviceID string `json:"deviceId"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		return out.Token, out.DeviceID
	}
	tokenA, idA := pair("install-a", "RKY-LX3", "android")
	tokenB, idB := pair("install-b", "RKY-LX3", "android")
	if idB != idA {
		t.Fatalf("same model created %s instead of reusing %s", idB, idA)
	}
	if eeyesDeviceJSON(t, app, tokenA, http.MethodGet, "/api/eeyes/device/sync", "").Code == http.StatusOK {
		t.Fatal("first token of a repeated model still accepted")
	}
	if eeyesDeviceJSON(t, app, tokenB, http.MethodGet, "/api/eeyes/device/sync", "").Code != http.StatusOK {
		t.Fatal("latest token of the repeated model rejected")
	}
	_, idTab := pair("install-tab", "SM-X400", "android")
	if idTab == idA {
		t.Fatal("a different model replaced the phone")
	}

	devs, err := app.eeyes.DevicesByOwner(context.Background(), "member-1")
	if err != nil {
		t.Fatal(err)
	}
	for _, d := range devs {
		if d.ID == idTab {
			d.Model = "RKY-LX3"
			d.Label = "RKY-LX3"
			d.LastSeenAt = time.Now().UTC().Add(-time.Hour)
			if err := app.eeyes.UpdateDevice(context.Background(), d); err != nil {
				t.Fatal(err)
			}
		}
	}
	raw, _ := json.Marshal(map[string]any{
		"title": "Foto", "deviceId": idTab, "kind": "photo", "cameraFacing": "back", "batchId": "pack-1",
	})
	if rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks", string(raw)); rec.Code != http.StatusCreated {
		t.Fatalf("task on duplicate %d %s", rec.Code, rec.Body.String())
	}
	listed := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/devices", "")
	if listed.Code != http.StatusOK {
		t.Fatalf("devices %d", listed.Code)
	}
	var body struct {
		Devices []struct {
			ID        string     `json:"id"`
			Model     string     `json:"model"`
			RevokedAt *time.Time `json:"revokedAt"`
		} `json:"devices"`
	}
	if err := json.Unmarshal(listed.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	live := 0
	for _, d := range body.Devices {
		if d.Model == "RKY-LX3" && d.RevokedAt == nil {
			live++
		}
	}
	if live != 1 {
		t.Fatalf("want one live RKY-LX3, got %+v", body.Devices)
	}
	tasks := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/tasks", "")
	if tasks.Code != http.StatusOK || !strings.Contains(tasks.Body.String(), `"cancelled"`) {
		t.Fatalf("duplicate task not cancelled: %s", tasks.Body.String())
	}

	_, idPC := pair("install-pc", "EDUARDO", "desktop")
	for _, id := range []string{idA, idPC} {
		raw, _ = json.Marshal(map[string]any{
			"title": "Cámara Trasera", "deviceId": id, "kind": "photo", "cameraFacing": "back", "batchId": "pack-2",
		})
		if rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eeyes/tasks", string(raw)); rec.Code != http.StatusCreated {
			t.Fatalf("pack task %d %s", rec.Code, rec.Body.String())
		}
	}
	again := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/tasks", "")
	var taskList struct {
		Tasks []struct {
			ID      string `json:"id"`
			BatchID string `json:"batchId"`
		} `json:"tasks"`
	}
	_ = json.Unmarshal(again.Body.Bytes(), &taskList)
	var packTask string
	for _, task := range taskList.Tasks {
		if task.BatchID == "pack-2" {
			packTask = task.ID
			break
		}
	}
	if packTask == "" {
		t.Fatalf("pack missing: %s", again.Body.String())
	}
	note := `{"analysis":"Postura: erguido. Expresión: no se ve el rostro."}`
	patched := app.doJSON(t, "member@eduardoos.com", http.MethodPatch, "/api/eeyes/tasks/"+packTask+"/pack-analysis", note)
	if patched.Code != http.StatusOK || !strings.Contains(patched.Body.String(), "erguido") {
		t.Fatalf("pack analysis %d %s", patched.Code, patched.Body.String())
	}
	if err := app.grantEntitlement("other-1", productEeyes); err != nil {
		t.Fatal(err)
	}
	other := app.doJSON(t, "other@eduardoos.com", http.MethodPatch, "/api/eeyes/tasks/"+packTask+"/pack-analysis", note)
	if other.Code != http.StatusNotFound {
		t.Fatalf("other pack analysis want 404 got %d", other.Code)
	}
	final := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eeyes/tasks", "")
	if strings.Count(final.Body.String(), "Postura: erguido") != 2 {
		t.Fatalf("pack analysis should be on both devices: %s", final.Body.String())
	}
}
