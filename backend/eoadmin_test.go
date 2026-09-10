package main

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testPNGBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 64, 64))
	for y := 0; y < 64; y++ {
		for x := 0; x < 64; x++ {
			img.Set(x, y, color.RGBA{R: 10, G: 20, B: 30, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestEoadminStatementLifecycle(t *testing.T) {
	app := newTestApp(true)
	app.cfg.AdminEmail = "admin@eduardoos.com"
	mail := app.mailer.(*recordingMailer)
	_ = app.eoadmin.EnsureSeedOptions(context.Background(), defaultEoadminOptions(time.Now().UTC()))

	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser("member@eduardoos.com"))
	if err != nil {
		t.Fatal(err)
	}

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	_ = w.WriteField("option_id", "opt-pamphlet")
	_ = w.WriteField("description", "Bank transfer proof")
	_ = w.WriteField("items", `[{"checkbox_id":"months","units":2}]`)
	_ = w.WriteField("amount_rect", `{"x":0.1,"y":0.2,"w":0.3,"h":0.05}`)
	_ = w.WriteField("reference_rect", `{"x":0.1,"y":0.3,"w":0.4,"h":0.05}`)
	_ = w.WriteField("svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect x="0.1" y="0.2" width="0.3" height="0.05"/></svg>`)
	part, err := w.CreateFormFile("file", "proof.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(testPNGBytes(t)); err != nil {
		t.Fatal(err)
	}
	_ = w.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/eoadmin/statements", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(req, seed)
	rr := httptest.NewRecorder()
	app.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("create status=%d body=%s", rr.Code, rr.Body.String())
	}
	created := decodeMap(t, rr)
	stMap, _ := created["statement"].(map[string]any)
	id, _ := stMap["id"].(string)
	if id == "" || stMap["status"] != eoadminStatusPendingApproval {
		t.Fatalf("unexpected create payload: %#v", created)
	}
	if mail.sends < 1 {
		t.Fatal("expected admin email")
	}
	if !strings.Contains(mail.Last().Body, id) {
		t.Fatal("mail should include statement id")
	}

	deny := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/eoadmin/statements/"+id, "")
	if deny.Code != http.StatusOK {
		t.Fatalf("admin get want 200 got %d", deny.Code)
	}

	// Insert a second member and deny cross-user access.
	hash, _ := hashPassword("correct-horse-battery")
	now := time.Now().UTC()
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "other-1", Email: "other@eduardoos.com", EmailNormalized: "other@eduardoos.com",
		Username: "other", UsernameNormalized: "other", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	cross := app.doJSON(t, "other@eduardoos.com", http.MethodGet, "/api/eoadmin/statements/"+id, "")
	if cross.Code != http.StatusForbidden {
		t.Fatalf("cross-user want 403 got %d body=%s", cross.Code, cross.Body.String())
	}

	approve := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eoadmin/statements/"+id+"/approve", `{"note":"ok"}`)
	if approve.Code != http.StatusOK {
		t.Fatalf("approve status=%d body=%s", approve.Code, approve.Body.String())
	}
	st, err := app.eoadmin.GetStatement(context.Background(), id)
	if err != nil || st.Status != eoadminStatusToDeliver {
		t.Fatalf("after approve: %#v err=%v", st, err)
	}
	ents, _ := app.store.EntitlementsByUser(context.Background(), "member-1")
	found := false
	for _, e := range ents {
		if e != nil && e.Product == "pamphlet" && e.isLive(time.Now().UTC()) {
			found = true
		}
	}
	if !found {
		t.Fatal("expected pamphlet entitlement after approve")
	}

	deliver := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/eoadmin/statements/"+id+"/deliver", `{}`)
	if deliver.Code != http.StatusOK {
		t.Fatalf("deliver status=%d", deliver.Code)
	}
	st, _ = app.eoadmin.GetStatement(context.Background(), id)
	if st.Status != eoadminStatusDelivered {
		t.Fatalf("want delivered got %s", st.Status)
	}
	abs := filepath.Join(app.cfg.MediaRoot, filepath.FromSlash(st.ImageKey))
	if _, err := os.Stat(abs); err != nil {
		t.Fatalf("image missing: %v", err)
	}
}

func TestEoadminOptionsSearch(t *testing.T) {
	app := newTestApp(true)
	_ = app.eoadmin.EnsureSeedOptions(context.Background(), defaultEoadminOptions(time.Now().UTC()))
	rec := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eoadmin/options?q=scrib", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d", rec.Code)
	}
	payload := decodeMap(t, rec)
	opts, _ := payload["options"].([]any)
	if len(opts) != 1 {
		t.Fatalf("want 1 scrib option, got %#v", payload)
	}
}

func TestEoadminPendingPaymentWithoutImage(t *testing.T) {
	app := newTestApp(true)
	_ = app.eoadmin.EnsureSeedOptions(context.Background(), defaultEoadminOptions(time.Now().UTC()))

	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser("member@eduardoos.com"))
	if err != nil {
		t.Fatal(err)
	}
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	_ = w.WriteField("option_id", "opt-scrib")
	_ = w.WriteField("description", "Order only")
	_ = w.WriteField("items", `[{"checkbox_id":"months","units":1}]`)
	_ = w.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/eoadmin/statements", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(req, seed)
	rr := httptest.NewRecorder()
	app.Handler().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("create status=%d body=%s", rr.Code, rr.Body.String())
	}
	created := decodeMap(t, rr)
	stMap, _ := created["statement"].(map[string]any)
	if stMap["status"] != eoadminStatusPendingPayment {
		t.Fatalf("want pending_payment got %#v", stMap)
	}
}
