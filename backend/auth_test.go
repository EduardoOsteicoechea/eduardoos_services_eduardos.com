package main

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/jpeg"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestRegisterVerifyLoginUsername(t *testing.T) {
	app := newTestApp(true)
	mailer := app.mailer.(*recordingMailer)
	rec := app.anonPOST(t, "/api/auth/register", `{"email":"new@eduardoos.com","username":"newuser","password":"correct-horse-battery"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("register: %d %s", rec.Code, rec.Body.String())
	}
	assertNoSecrets(t, rec.Body.String())
	if strings.Contains(rec.Body.String(), mailer.Last().Body) && mailer.Last().Body != "" {
		t.Fatal("OTP leaked in HTTP")
	}
	user := app.mustUser("new@eduardoos.com")
	if user.Status != statusPending || user.PasswordHash == "correct-horse-battery" {
		t.Fatalf("pending hash state: %+v", user)
	}
	code := extractOTP(t, mailer)
	verify := app.anonPOST(t, "/api/auth/verify-email", `{"email":"new@eduardoos.com","otp":"`+code+`"}`)
	if verify.Code != http.StatusOK {
		t.Fatalf("verify: %d %s", verify.Code, verify.Body.String())
	}
	if cookieNamed(verify, app.accessCookieName()) == nil || cookieNamed(verify, app.refreshCookieName()) == nil {
		t.Fatal("verify must issue session cookies")
	}
	user = app.mustUser("new@eduardoos.com")
	if user.Status != statusVerified || !user.EmailVerified {
		t.Fatalf("expected verified, got %+v", user)
	}
	login := app.anonPOST(t, "/api/auth/login", `{"identifier":"newuser","password":"correct-horse-battery"}`)
	if login.Code != http.StatusOK {
		t.Fatalf("username login: %d %s", login.Code, login.Body.String())
	}
}

func TestPasswordLengthEightSucceedsSevenFails(t *testing.T) {
	app := newTestApp(true)
	mailer := app.mailer.(*recordingMailer)

	tooShort := app.anonPOST(t, "/api/auth/register", `{"email":"short7@eduardoos.com","username":"short7u","password":"abcdefg"}`)
	if tooShort.Code != http.StatusBadRequest {
		t.Fatalf("7-char register: %d %s", tooShort.Code, tooShort.Body.String())
	}

	okReg := app.anonPOST(t, "/api/auth/register", `{"email":"eight8@eduardoos.com","username":"eight8u","password":"abcdefgh"}`)
	if okReg.Code != http.StatusOK {
		t.Fatalf("8-char register: %d %s", okReg.Code, okReg.Body.String())
	}
	code := extractOTP(t, mailer)
	verify := app.anonPOST(t, "/api/auth/verify-email", `{"email":"eight8@eduardoos.com","otp":"`+code+`"}`)
	if verify.Code != http.StatusOK {
		t.Fatalf("verify 8-char: %d %s", verify.Code, verify.Body.String())
	}
	login := app.anonPOST(t, "/api/auth/login", `{"identifier":"eight8@eduardoos.com","password":"abcdefgh"}`)
	if login.Code != http.StatusOK {
		t.Fatalf("login 8-char: %d %s", login.Code, login.Body.String())
	}

	changeReq, changeRec := app.memberPOST(t, "/api/auth/change-password", `{"current_password":"correct-horse-battery","new_password":"abcdefg"}`)
	app.Handler().ServeHTTP(changeRec, changeReq)
	if changeRec.Code != http.StatusBadRequest {
		t.Fatalf("7-char change: %d %s", changeRec.Code, changeRec.Body.String())
	}

	app.anonPOST(t, "/api/auth/request-password-reset", `{"email":"member@eduardoos.com"}`)
	resetCode := extractOTP(t, mailer)
	resetShort := app.anonPOST(t, "/api/auth/reset-password", `{"email":"member@eduardoos.com","otp":"`+resetCode+`","new_password":"abcdefg"}`)
	if resetShort.Code != http.StatusBadRequest {
		t.Fatalf("7-char reset: %d %s", resetShort.Code, resetShort.Body.String())
	}

	shortStore := newMemoryStore()
	shortCfg := config{
		JWTSecret:              "bootstrap-secret-value-not-production",
		JWTIssuer:              jwtIssuer,
		JWTAudience:            jwtAudience,
		BootstrapAdminEmail:    "root7@eduardoos.com",
		BootstrapAdminPassword: "abcdefg",
		MediaRoot:              t.TempDir(),
		AllowedOrigins:         []string{"https://eduardoos.com"},
	}
	_ = newAppWithStore(shortCfg, shortStore)
	n, _ := shortStore.CountAdmins(context.Background())
	if n != 0 {
		t.Fatalf("7-char bootstrap must not create admin, got %d", n)
	}

	okStore := newMemoryStore()
	okCfg := shortCfg
	okCfg.BootstrapAdminEmail = "root8@eduardoos.com"
	okCfg.BootstrapAdminPassword = "abcdefgh"
	_ = newAppWithStore(okCfg, okStore)
	n, _ = okStore.CountAdmins(context.Background())
	if n != 1 {
		t.Fatalf("8-char bootstrap must create admin, got %d", n)
	}
}

func TestDuplicateEmailIsGenericAndDuplicateUsernameConflicts(t *testing.T) {
	app := newTestApp(true)
	first := app.anonPOST(t, "/api/auth/register", `{"email":"dup@eduardoos.com","username":"dupone","password":"correct-horse-battery"}`)
	if first.Code != http.StatusOK {
		t.Fatal(first.Body.String())
	}
	second := app.anonPOST(t, "/api/auth/register", `{"email":"dup@eduardoos.com","username":"duptwo","password":"correct-horse-battery"}`)
	if second.Code != http.StatusOK {
		t.Fatalf("duplicate email should be generic 200, got %d", second.Code)
	}
	conflict := app.anonPOST(t, "/api/auth/register", `{"email":"other@eduardoos.com","username":"dupone","password":"correct-horse-battery"}`)
	if conflict.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d %s", conflict.Code, conflict.Body.String())
	}
}

func TestOTPExpiryReuseAndAttempts(t *testing.T) {
	app := newTestApp(true)
	mailer := app.mailer.(*recordingMailer)
	app.anonPOST(t, "/api/auth/register", `{"email":"otp@eduardoos.com","username":"otpuser","password":"correct-horse-battery"}`)
	code := extractOTP(t, mailer)
	otp, err := app.store.LatestOTP(context.Background(), otpEmailVerify, "otp@eduardoos.com")
	if err != nil {
		t.Fatal(err)
	}
	otp.ExpiresAt = time.Now().UTC().Add(-time.Minute)
	_ = app.store.UpdateOTP(context.Background(), otp)
	expired := app.anonPOST(t, "/api/auth/verify-email", `{"email":"otp@eduardoos.com","otp":"`+code+`"}`)
	if expired.Code != http.StatusOK {
		t.Fatalf("expired: %d", expired.Code)
	}
	if cookieNamed(expired, app.accessCookieName()) != nil {
		t.Fatal("expired OTP must not issue a session")
	}

	app.anonPOST(t, "/api/auth/resend-verification", `{"email":"otp@eduardoos.com"}`)
	fresh := extractOTP(t, mailer)
	for i := 0; i < 4; i++ {
		got := app.anonPOST(t, "/api/auth/verify-email", `{"email":"otp@eduardoos.com","otp":"000000"}`)
		if got.Code != http.StatusOK {
			t.Fatalf("attempt %d: %d", i, got.Code)
		}
	}
	locked := app.anonPOST(t, "/api/auth/verify-email", `{"email":"otp@eduardoos.com","otp":"000000"}`)
	if locked.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 after 5 attempts, got %d", locked.Code)
	}
	reused := app.anonPOST(t, "/api/auth/verify-email", `{"email":"otp@eduardoos.com","otp":"`+fresh+`"}`)
	if cookieNamed(reused, app.accessCookieName()) != nil {
		t.Fatal("locked/reused OTP must not sign in")
	}
}

func TestPendingLoginIsGeneric(t *testing.T) {
	app := newTestApp(true)
	app.anonPOST(t, "/api/auth/register", `{"email":"pend@eduardoos.com","username":"penduser","password":"correct-horse-battery"}`)
	login := app.anonPOST(t, "/api/auth/login", `{"identifier":"pend@eduardoos.com","password":"correct-horse-battery"}`)
	if login.Code != http.StatusUnauthorized || !strings.Contains(login.Body.String(), "invalid_credentials") {
		t.Fatalf("pending login: %d %s", login.Code, login.Body.String())
	}
	if cookieNamed(login, app.accessCookieName()) != nil {
		t.Fatal("pending login must not set cookies")
	}
}

func TestLoginEmailAndBadCredentials(t *testing.T) {
	app := newTestApp(true)
	ok := app.anonPOST(t, "/api/auth/login", `{"identifier":"admin@eduardoos.com","password":"correct-horse-battery"}`)
	if ok.Code != http.StatusOK {
		t.Fatalf("admin login: %d %s", ok.Code, ok.Body.String())
	}
	bad := app.anonPOST(t, "/api/auth/login", `{"identifier":"admin@eduardoos.com","password":"wrong-password-12"}`)
	if bad.Code != http.StatusUnauthorized {
		t.Fatalf("bad password: %d", bad.Code)
	}
	unknown := app.anonPOST(t, "/api/auth/login", `{"identifier":"nobody@eduardoos.com","password":"correct-horse-battery"}`)
	if unknown.Code != http.StatusUnauthorized {
		t.Fatalf("unknown: %d", unknown.Code)
	}
	assertNoSecrets(t, bad.Body.String())
}

func TestRefreshRotationAndReuseRevokesFamily(t *testing.T) {
	app := newTestApp(true)
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	firstRefresh := cookieNamed(seed, app.refreshCookieName()).Value
	csrf := app.issueCSRF(t, seed)
	refreshReq := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{}`))
	refreshReq.Header.Set("Content-Type", "application/json")
	refreshReq.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	refreshReq.Header.Set("X-CSRF-Token", csrf)
	copyCookies(refreshReq, seed)
	rotated := httptest.NewRecorder()
	app.Handler().ServeHTTP(rotated, refreshReq)
	if rotated.Code != http.StatusOK {
		t.Fatalf("refresh: %d %s", rotated.Code, rotated.Body.String())
	}
	secondRefresh := cookieNamed(rotated, app.refreshCookieName()).Value
	if secondRefresh == "" || secondRefresh == firstRefresh {
		t.Fatal("refresh must rotate the opaque token")
	}

	reuse := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{}`))
	reuse.Header.Set("Content-Type", "application/json")
	reuse.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	reuse.Header.Set("X-CSRF-Token", csrf)
	reuse.AddCookie(&http.Cookie{Name: app.refreshCookieName(), Value: firstRefresh})
	copyCookies(reuse, seed)
	reuseRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(reuseRec, reuse)
	if reuseRec.Code != http.StatusUnauthorized {
		t.Fatalf("reuse: %d %s", reuseRec.Code, reuseRec.Body.String())
	}

	again := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{}`))
	again.Header.Set("Content-Type", "application/json")
	again.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	again.Header.Set("X-CSRF-Token", csrf)
	copyCookies(again, rotated)
	againRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(againRec, again)
	if againRec.Code != http.StatusUnauthorized {
		t.Fatalf("family should be revoked, got %d", againRec.Code)
	}
}

func TestLogoutClearsCookiesAndRevokes(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.memberPOST(t, "/api/auth/logout", `{}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("logout: %d", rec.Code)
	}
	if cookieNamed(rec, app.accessCookieName()) == nil || cookieNamed(rec, app.accessCookieName()).MaxAge != -1 {
		t.Fatal("access cookie must be cleared")
	}
	me := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(me, rec)
	meRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(meRec, me)
	if meRec.Code != http.StatusUnauthorized {
		t.Fatalf("me after logout: %d", meRec.Code)
	}
}

func TestAccessJWTClaimsAndLifetime(t *testing.T) {
	app := newTestApp(true)
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("admin@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	raw := cookieNamed(seed, app.accessCookieName()).Value
	parser := jwt.NewParser(jwt.WithIssuedAt())
	claims := &authClaims{}
	_, err := parser.ParseWithClaims(raw, claims, func(*jwt.Token) (any, error) {
		return []byte(app.cfg.JWTSecret), nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if claims.SID == "" || claims.Subject == "" || claims.Issuer != jwtIssuer {
		t.Fatalf("missing required claims: %+v", claims)
	}
	if claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time) != accessTTL {
		t.Fatalf("access TTL %s", claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time))
	}
}

func TestCSRFAndOriginRejected(t *testing.T) {
	app := newTestApp(true)
	paths := []string{
		"/api/auth/login",
		"/api/auth/register",
		"/api/auth/refresh",
		"/api/auth/logout",
		"/api/auth/verify-email",
		"/api/auth/resend-verification",
		"/api/auth/change-password",
		"/api/auth/request-password-reset",
		"/api/auth/reset-password",
	}
	for _, path := range paths {
		req := httptest.NewRequest(http.MethodPost, path, bytes.NewBufferString(`{}`))
		req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
		rec := httptest.NewRecorder()
		app.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("%s missing csrf: %d", path, rec.Code)
		}
		badOrigin := httptest.NewRequest(http.MethodPost, path, bytes.NewBufferString(`{}`))
		badOrigin.Header.Set("Origin", "https://www.eduardoos.com")
		badOrigin.Header.Set("X-CSRF-Token", "x")
		badRec := httptest.NewRecorder()
		app.Handler().ServeHTTP(badRec, badOrigin)
		if badRec.Code != http.StatusForbidden {
			t.Fatalf("%s www origin: %d", path, badRec.Code)
		}
	}
	patch := httptest.NewRequest(http.MethodPatch, "/api/profile", bytes.NewBufferString(`{}`))
	patch.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	patchRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(patchRec, patch)
	if patchRec.Code != http.StatusForbidden {
		t.Fatalf("profile csrf: %d", patchRec.Code)
	}
}

func TestPasswordResetRevokesAndLeavesLoggedOut(t *testing.T) {
	app := newTestApp(true)
	mailer := app.mailer.(*recordingMailer)
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	app.anonPOST(t, "/api/auth/request-password-reset", `{"email":"member@eduardoos.com"}`)
	code := extractOTP(t, mailer)
	reset := app.anonPOST(t, "/api/auth/reset-password", `{"email":"member@eduardoos.com","otp":"`+code+`","new_password":"new-horse-battery"}`)
	if reset.Code != http.StatusOK {
		t.Fatalf("reset: %d %s", reset.Code, reset.Body.String())
	}
	if cookieNamed(reset, app.accessCookieName()) != nil && cookieNamed(reset, app.accessCookieName()).MaxAge != -1 {
		if cookieNamed(reset, app.accessCookieName()).Value != "" {
			t.Fatal("reset must not issue a new session")
		}
	}
	me := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(me, seed)
	meRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(meRec, me)
	if meRec.Code != http.StatusUnauthorized {
		t.Fatalf("old session after reset: %d", meRec.Code)
	}
	login := app.anonPOST(t, "/api/auth/login", `{"identifier":"member@eduardoos.com","password":"new-horse-battery"}`)
	if login.Code != http.StatusOK {
		t.Fatalf("login after reset: %d %s", login.Code, login.Body.String())
	}
}

func TestChangePasswordRevokesOtherSessions(t *testing.T) {
	app := newTestApp(true)
	other := httptest.NewRecorder()
	if _, err := app.issueSession(other, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	req, rec := app.memberPOST(t, "/api/auth/change-password", `{"current_password":"correct-horse-battery","new_password":"changed-horse-12"}`)
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("change: %d %s", rec.Code, rec.Body.String())
	}
	me := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(me, other)
	meRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(meRec, me)
	if meRec.Code != http.StatusUnauthorized {
		t.Fatalf("other session should be revoked, got %d", meRec.Code)
	}
	if cookieNamed(rec, app.accessCookieName()) == nil || cookieNamed(rec, app.accessCookieName()).Value == "" {
		t.Fatal("change-password should keep the current browser signed in")
	}
}

func TestProfileOwnerOnlyAndNoEmailChange(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.memberPOST(t, "/api/profile", `{"display_name":"Member One","username":"member2","phone":"+14155552671"}`)
	req.Method = http.MethodPatch
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("patch: %d %s", rec.Code, rec.Body.String())
	}
	email := app.anonJSON(t, http.MethodPatch, "/api/profile", `{"email":"stolen@eduardoos.com"}`, app.mustUser("member@eduardoos.com"))
	if email.Code != http.StatusBadRequest {
		t.Fatalf("email change: %d %s", email.Code, email.Body.String())
	}
	admin := app.anonJSON(t, http.MethodPatch, "/api/profile", `{"display_name":"Hijack"}`, app.mustUser("admin@eduardoos.com"))
	if admin.Code != http.StatusOK {
		t.Fatal(admin.Body.String())
	}
	member := app.mustUser("member@eduardoos.com")
	if member.DisplayName == "Hijack" {
		t.Fatal("admin must not edit another profile via this API")
	}
}

func TestAvatarValidationAndPrivateGet(t *testing.T) {
	app := newTestApp(true)
	reject := [][]byte{
		[]byte("GIF89a...."),
		[]byte("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
		[]byte("<!DOCTYPE html><html><script>alert(1)</script></html>"),
		[]byte("not-an-image"),
	}
	for _, payload := range reject {
		rec := app.uploadAvatar(t, "member@eduardoos.com", "x.bin", payload)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for %q, got %d %s", payload[:min(12, len(payload))], rec.Code, rec.Body.String())
		}
	}
	jpegBuf := encodeJPEG(t, 8, 8)
	ok := app.uploadAvatar(t, "member@eduardoos.com", "../../etc/passwd.jpg", jpegBuf)
	if ok.Code != http.StatusOK {
		t.Fatalf("jpeg: %d %s", ok.Code, ok.Body.String())
	}
	var body map[string]any
	_ = json.NewDecoder(ok.Body).Decode(&body)
	avatarURL, _ := body["avatar"].(string)
	if !strings.HasPrefix(avatarURL, "/api/profile/avatar?v=") {
		t.Fatalf("avatar url %v", body["avatar"])
	}
	if strings.Contains(ok.Body.String(), app.cfg.MediaRoot) || strings.Contains(ok.Body.String(), "..") {
		t.Fatal("path leaked")
	}
	get := httptest.NewRequest(http.MethodGet, "/api/profile/avatar", nil)
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	copyCookies(get, seed)
	got := httptest.NewRecorder()
	app.Handler().ServeHTTP(got, get)
	if got.Code != http.StatusOK {
		t.Fatalf("owner get: %d", got.Code)
	}
	other := httptest.NewRequest(http.MethodGet, "/api/profile/avatar", nil)
	adminSeed := httptest.NewRecorder()
	if _, err := app.issueSession(adminSeed, app.mustUser("admin@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	copyCookies(other, adminSeed)
	otherRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(otherRec, other)
	if otherRec.Code == http.StatusOK && otherRec.Body.Len() == got.Body.Len() && got.Body.Len() > 0 && bytes.Equal(otherRec.Body.Bytes(), got.Body.Bytes()) {
		t.Fatal("admin must not read another user's avatar")
	}
	public := httptest.NewRequest(http.MethodGet, "/media/avatars/x.jpg", nil)
	pubRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(pubRec, public)
	if pubRec.Code != http.StatusNotFound {
		t.Fatalf("public media: %d", pubRec.Code)
	}
	big := encodeJPEG(t, 2049, 10)
	tooBig := app.uploadAvatar(t, "member@eduardoos.com", "big.jpg", big)
	if tooBig.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("dimension 413 expected, got %d", tooBig.Code)
	}
}

func TestLoginRateLimit(t *testing.T) {
	app := newTestApp(true)
	var last *httptest.ResponseRecorder
	for i := 0; i < 6; i++ {
		last = app.anonPOST(t, "/api/auth/login", `{"identifier":"admin@eduardoos.com","password":"wrong-password-12"}`)
	}
	if last.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", last.Code)
	}
}

func TestBootstrapAdminOnce(t *testing.T) {
	store := newMemoryStore()
	cfg := config{
		JWTSecret:              "bootstrap-secret-value-not-production",
		JWTIssuer:              jwtIssuer,
		JWTAudience:            jwtAudience,
		BootstrapAdminEmail:    "root@eduardoos.com",
		BootstrapAdminPassword: "bootstrap-horse-12",
		MediaRoot:              t.TempDir(),
		AllowedOrigins:         []string{"https://eduardoos.com"},
	}
	app := newAppWithStore(cfg, store)
	n, _ := store.CountAdmins(context.Background())
	if n != 1 {
		t.Fatalf("expected one admin, got %d", n)
	}
	first := app.mustUser("root@eduardoos.com")
	hash := first.PasswordHash
	cfg.BootstrapAdminPassword = "another-horse-12"
	_ = newAppWithStore(cfg, store)
	n, _ = store.CountAdmins(context.Background())
	if n != 1 {
		t.Fatalf("must not mint a second admin, got %d", n)
	}
	again := app.mustUser("root@eduardoos.com")
	if again.PasswordHash != hash {
		t.Fatal("bootstrap must not reset the admin password")
	}
}

func TestCSRFNotReadableCookie(t *testing.T) {
	app := newTestApp(true)
	req := httptest.NewRequest(http.MethodGet, "/api/auth/csrf", nil)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	var body map[string]string
	_ = json.NewDecoder(rec.Body).Decode(&body)
	if body["csrf"] == "" {
		t.Fatal("csrf json missing")
	}
	for _, c := range rec.Result().Cookies() {
		if c.Name == "csrf" || c.Name == "__Host-csrf" || c.Value == body["csrf"] {
			t.Fatalf("readable csrf cookie %s", c.Name)
		}
		if !c.HttpOnly && (c.Name == app.csrfBindCookieName()) {
			t.Fatal("bind cookie must be HttpOnly")
		}
	}
}

func TestNoWildcardCORS(t *testing.T) {
	app := newTestApp(true)
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") == "*" {
		t.Fatal("wildcard CORS")
	}
}

func (a *App) issueCSRF(t *testing.T, seed *httptest.ResponseRecorder) string {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/auth/csrf", nil)
	copyCookies(req, seed)
	rec := httptest.NewRecorder()
	a.Handler().ServeHTTP(rec, req)
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	return body["csrf"]
}

func (a *App) anonPOST(t *testing.T, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	return a.anonJSON(t, http.MethodPost, path, body, nil)
}

func (a *App) anonJSON(t *testing.T, method, path, body string, user *User) *httptest.ResponseRecorder {
	t.Helper()
	seed := httptest.NewRecorder()
	var csrf string
	if user != nil {
		sess, err := a.issueSession(seed, user)
		if err != nil {
			t.Fatal(err)
		}
		csrf = sess.CSRF
	} else {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/csrf", nil)
		a.Handler().ServeHTTP(seed, req)
		var payload map[string]string
		_ = json.NewDecoder(seed.Body).Decode(&payload)
		csrf = payload["csrf"]
	}
	req := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", a.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", csrf)
	copyCookies(req, seed)
	rec := httptest.NewRecorder()
	a.Handler().ServeHTTP(rec, req)
	return rec
}

func (a *App) uploadAvatar(t *testing.T, email, name string, data []byte) *httptest.ResponseRecorder {
	t.Helper()
	seed := httptest.NewRecorder()
	sess, err := a.issueSession(seed, a.mustUser(email))
	if err != nil {
		t.Fatal(err)
	}
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile("file", name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(data); err != nil {
		t.Fatal(err)
	}
	_ = writer.Close()
	req := httptest.NewRequest(http.MethodPost, "/api/profile/avatar", &buf)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Origin", a.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(req, seed)
	rec := httptest.NewRecorder()
	a.Handler().ServeHTTP(rec, req)
	return rec
}

func cookieNamed(rec *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, c := range rec.Result().Cookies() {
		if c.Name == name {
			return c
		}
	}
	return nil
}

func extractOTP(t *testing.T, mailer *recordingMailer) string {
	t.Helper()
	re := regexp.MustCompile(`\b(\d{6})\b`)
	match := re.FindStringSubmatch(mailer.Last().Body)
	if len(match) < 2 {
		t.Fatalf("otp not mailed")
	}
	return match[1]
}

func encodeJPEG(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 60}); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func encodePNG(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestPNGAvatarAccepted(t *testing.T) {
	app := newTestApp(true)
	rec := app.uploadAvatar(t, "member@eduardoos.com", "a.png", encodePNG(t, 4, 4))
	if rec.Code != http.StatusOK {
		t.Fatalf("png: %d %s", rec.Code, rec.Body.String())
	}
}

func TestWWWOriginRejectedOnLogin(t *testing.T) {
	app := newTestApp(true)
	csrfRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(csrfRec, httptest.NewRequest(http.MethodGet, "/api/auth/csrf", nil))
	var body map[string]string
	_ = json.NewDecoder(csrfRec.Body).Decode(&body)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(`{"identifier":}"admin@eduardoos.com","password":"correct-horse-battery"}`))
	req.Header.Set("Origin", "https://www.eduardoos.com")
	req.Header.Set("X-CSRF-Token", body["csrf"])
	copyCookies(req, csrfRec)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("www: %d", rec.Code)
	}
}
