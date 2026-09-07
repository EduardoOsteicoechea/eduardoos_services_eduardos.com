package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func memberEmail() string { return "member@" + siteName }
func adminEmail() string  { return "admin@" + siteName }

func TestProfilePersistsAcrossAPIRestart(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.memberPOST(t, "/api/profile", `{"display_name":"Persistent Name","username":"keptuser","phone":"+14155552671"}`)
	req.Method = http.MethodPatch
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body.String())
	}
	restarted := newAppWithStore(app.cfg, app.store)
	user, err := restarted.store.UserByEmail(context.Background(), strings.ToLower(memberEmail()))
	if err != nil {
		t.Fatal(err)
	}
	if user.DisplayName != "Persistent Name" || user.Username != "keptuser" || user.Phone != "+14155552671" {
		t.Fatalf("store lost profile: %+v", user)
	}
	seed := httptest.NewRecorder()
	if _, err := restarted.issueSession(seed, user); err != nil {
		t.Fatal(err)
	}
	me := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(me, seed)
	got := httptest.NewRecorder()
	restarted.Handler().ServeHTTP(got, me)
	if got.Code != http.StatusOK {
		t.Fatalf("me after restart: %d", got.Code)
	}
	var body map[string]any
	_ = json.NewDecoder(got.Body).Decode(&body)
	if body["display_name"] != "Persistent Name" || body["username"] != "keptuser" || body["phone"] != "+14155552671" {
		t.Fatalf("api lost profile: %s", got.Body.String())
	}
	assertNoSecrets(t, got.Body.String())
}

func TestProfileKeepsFieldsAfterPasswordChange(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.memberPOST(t, "/api/profile", `{"display_name":"Keep Me","username":"keptuser","phone":"+14155552671"}`)
	req.Method = http.MethodPatch
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body.String())
	}
	pass, rec2 := app.memberPOST(t, "/api/auth/change-password", `{"current_password":"correct-horse-battery","new_password":"new-horse-battery1"}`)
	app.Handler().ServeHTTP(rec2, pass)
	if rec2.Code != http.StatusOK {
		t.Fatalf("password: %d %s", rec2.Code, rec2.Body.String())
	}
	user, err := app.store.UserByEmail(context.Background(), strings.ToLower(memberEmail()))
	if err != nil {
		t.Fatal(err)
	}
	if user.DisplayName != "Keep Me" || user.Phone != "+14155552671" || user.Username != "keptuser" {
		t.Fatalf("password change dropped profile: %+v", user)
	}
}

func TestProfileUsernameUniqueness(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.memberPOST(t, "/api/profile", `{"username":"siteadmin"}`)
	req.Method = http.MethodPatch
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("expected conflict, got %d %s", rec.Code, rec.Body.String())
	}
}

func TestProfileCrossUserDenied(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.memberPOST(t, "/api/profile", `{"display_name":"Member Only"}`)
	req.Method = http.MethodPatch
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatal(rec.Body.String())
	}
	admin := app.mustUser(adminEmail())
	if admin.DisplayName == "Member Only" {
		t.Fatal("member patch must not change admin")
	}
	guest := httptest.NewRequest(http.MethodPatch, "/api/profile", bytes.NewBufferString(`{"display_name":"Nope"}`))
	guest.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	guestRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(guestRec, guest)
	if guestRec.Code != http.StatusForbidden && guestRec.Code != http.StatusUnauthorized {
		t.Fatalf("guest profile: %d", guestRec.Code)
	}
}

func TestAvatarFormatsAndMetadataPersist(t *testing.T) {
	app := newTestApp(true)
	for _, tc := range []struct {
		name string
		data []byte
		mime string
	}{
		{"ok.jpg", encodeJPEG(t, 6, 6), "image/jpeg"},
		{"ok.png", encodePNG(t, 6, 6), "image/png"},
		{"ok.webp", tinyWebP(), "image/webp"},
	} {
		rec := app.uploadAvatar(t, memberEmail(), tc.name, tc.data)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: %d %s", tc.name, rec.Code, rec.Body.String())
		}
		assertNoSecrets(t, rec.Body.String())
		if strings.Contains(rec.Body.String(), app.cfg.MediaRoot) || strings.Contains(rec.Body.String(), "/media/") {
			t.Fatalf("%s leaked storage path", tc.name)
		}
		var body map[string]any
		_ = json.NewDecoder(bytes.NewReader(rec.Body.Bytes())).Decode(&body)
		href, _ := body["avatar"].(string)
		if !strings.HasPrefix(href, "/api/profile/avatar?v=") {
			t.Fatalf("%s avatar href %v", tc.name, body["avatar"])
		}
		user := app.mustUser(memberEmail())
		if user.AvatarKey == "" || user.AvatarContentType != tc.mime || user.AvatarBytes != int64(len(tc.data)) || user.AvatarFilename == "" || user.AvatarUpdatedAt == nil {
			t.Fatalf("%s metadata: %+v", tc.name, user)
		}
		if strings.Contains(user.AvatarKey, "..") || filepath.IsAbs(user.AvatarKey) || !strings.HasPrefix(user.AvatarKey, "avatars/") {
			t.Fatalf("unsafe key %q", user.AvatarKey)
		}
		if _, err := os.Stat(filepath.Join(app.cfg.MediaRoot, filepath.FromSlash(user.AvatarKey))); err != nil {
			t.Fatalf("file missing: %v", err)
		}
	}
	restarted := newAppWithStore(app.cfg, app.store)
	user := restarted.mustUser(memberEmail())
	if user.AvatarContentType != "image/webp" || user.AvatarKey == "" {
		t.Fatal("avatar metadata did not survive API restart")
	}
}

func TestAvatarRejectsUnsafePayloads(t *testing.T) {
	app := newTestApp(true)
	oversize := append(encodeJPEG(t, 8, 8), bytes.Repeat([]byte{0}, int(maxAvatarBytes)+1)...)
	cases := []struct {
		name string
		file string
		data []byte
		code int
	}{
		{"gif", "x.gif", []byte("GIF89a....xxxx"), http.StatusBadRequest},
		{"svg", "x.svg", []byte("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), http.StatusBadRequest},
		{"html", "x.html", []byte("<!DOCTYPE html><html><script>alert(1)</script></html>"), http.StatusBadRequest},
		{"exe", "x.exe", append([]byte{0x4d, 0x5a}, bytes.Repeat([]byte{0}, 20)...), http.StatusBadRequest},
		{"malformed", "x.jpg", []byte{0xff, 0xd8, 0xff}, http.StatusBadRequest},
		{"oversize", "big.jpg", oversize, http.StatusRequestEntityTooLarge},
	}
	for _, tc := range cases {
		rec := app.uploadAvatar(t, memberEmail(), tc.file, tc.data)
		if rec.Code != tc.code {
			t.Fatalf("%s: got %d want %d %s", tc.name, rec.Code, tc.code, rec.Body.String())
		}
		assertNoSecrets(t, rec.Body.String())
	}
	ok := app.uploadAvatar(t, memberEmail(), "../../etc/passwd.jpg", encodeJPEG(t, 8, 8))
	if ok.Code != http.StatusOK {
		t.Fatalf("traversal name should be ignored: %d", ok.Code)
	}
	user := app.mustUser(memberEmail())
	if strings.Contains(user.AvatarKey, "..") || strings.Contains(user.AvatarFilename, "..") {
		t.Fatal("traversal leaked into stored path")
	}
}

func TestAvatarGetAuthorizationAndAccel(t *testing.T) {
	app := newTestApp(true)
	app.cfg.SecureCookies = true
	up := app.uploadAvatar(t, memberEmail(), "face.jpg", encodeJPEG(t, 8, 8))
	if up.Code != http.StatusOK {
		t.Fatal(up.Body.String())
	}
	user := app.mustUser(memberEmail())
	get := httptest.NewRequest(http.MethodGet, "/api/profile/avatar?v=1", nil)
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, user); err != nil {
		t.Fatal(err)
	}
	copyCookies(get, seed)
	got := httptest.NewRecorder()
	app.Handler().ServeHTTP(got, get)
	if got.Code != http.StatusOK {
		t.Fatalf("owner get: %d %s", got.Code, got.Body.String())
	}
	if got.Header().Get("X-Accel-Redirect") != "" {
		t.Fatal("browser <img> must receive image bytes through /api/, not an empty accel response")
	}
	if got.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("cache %q", got.Header().Get("Cache-Control"))
	}
	if got.Header().Get("Content-Type") != "image/jpeg" {
		t.Fatalf("type %q", got.Header().Get("Content-Type"))
	}
	if got.Body.Len() < 12 || !bytes.HasPrefix(got.Body.Bytes(), []byte{0xff, 0xd8, 0xff}) {
		t.Fatal("owner get must include image bytes so <img> can render through /api/")
	}
	if strings.Contains(got.Header().Get("X-Accel-Redirect"), app.cfg.MediaRoot) {
		t.Fatal("absolute media path leaked")
	}
	adminGet := httptest.NewRequest(http.MethodGet, "/api/profile/avatar", nil)
	adminSeed := httptest.NewRecorder()
	if _, err := app.issueSession(adminSeed, app.mustUser(adminEmail())); err != nil {
		t.Fatal(err)
	}
	copyCookies(adminGet, adminSeed)
	adminRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(adminRec, adminGet)
	if adminRec.Code == http.StatusOK && adminRec.Header().Get("X-Accel-Redirect") == got.Header().Get("X-Accel-Redirect") && got.Header().Get("X-Accel-Redirect") != "" {
		t.Fatal("admin must not retrieve another user's avatar")
	}
	if adminRec.Code == http.StatusOK && app.mustUser(adminEmail()).AvatarKey == "" && adminRec.Header().Get("X-Accel-Redirect") != "" {
		t.Fatal("admin without avatar must not receive member redirect")
	}
	anon := httptest.NewRecorder()
	app.Handler().ServeHTTP(anon, httptest.NewRequest(http.MethodGet, "/api/profile/avatar", nil))
	if anon.Code != http.StatusUnauthorized {
		t.Fatalf("anon get: %d", anon.Code)
	}
	public := httptest.NewRecorder()
	app.Handler().ServeHTTP(public, httptest.NewRequest(http.MethodGet, "/media/"+user.AvatarKey, nil))
	if public.Code != http.StatusNotFound {
		t.Fatalf("public media: %d", public.Code)
	}
	assertNoSecrets(t, got.Body.String())
	assertNoSecrets(t, adminRec.Body.String())
}

func TestAvatarVersionChangesAfterReplace(t *testing.T) {
	app := newTestApp(true)
	first := app.uploadAvatar(t, memberEmail(), "one.jpg", encodeJPEG(t, 8, 8))
	var a map[string]any
	_ = json.NewDecoder(first.Body).Decode(&a)
	time.Sleep(2 * time.Millisecond)
	second := app.uploadAvatar(t, memberEmail(), "two.jpg", encodePNG(t, 8, 8))
	var b map[string]any
	_ = json.NewDecoder(second.Body).Decode(&b)
	if a["avatar"] == "" || a["avatar"] == b["avatar"] {
		t.Fatalf("version must change after replace: %v then %v", a["avatar"], b["avatar"])
	}
	if !strings.HasPrefix(b["avatar"].(string), "/api/profile/avatar?v=") {
		t.Fatalf("href %v", b["avatar"])
	}
}

func TestWriteAvatarFileKeepsTempOutsideMedia(t *testing.T) {
	root := t.TempDir()
	media := filepath.Join(root, "media")
	rel := "avatars/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg"
	data := encodeJPEG(t, 8, 8)
	if err := writeAvatarFile(media, rel, data); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(media, filepath.FromSlash(rel))); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(media, ".tmp")); !os.IsNotExist(err) {
		t.Fatal("temp files must not live inside the media directory")
	}
	tmp := avatarTempDir(media)
	if !strings.HasPrefix(tmp, root) || strings.Contains(tmp, string(filepath.Separator)+"media"+string(filepath.Separator)) {
		t.Fatalf("temp dir must be beside media, got %q", tmp)
	}
}

func tinyWebP() []byte {
	buf := make([]byte, 30)
	copy(buf[0:4], "RIFF")
	copy(buf[8:12], "WEBP")
	copy(buf[12:16], "VP8X")
	return buf
}
