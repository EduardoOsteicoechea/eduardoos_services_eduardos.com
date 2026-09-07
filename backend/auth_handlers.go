package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode"
)

func (a *App) registerHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	if !a.registerLimit.allow(clientIP(r.RemoteAddr)) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	var body struct {
		Email    string `json:"email"`
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	email, emailNorm, emailOK := normalizeEmail(body.Email)
	username, userOK := normalizeUsername(body.Username)
	if !emailOK || !userOK || !validPassword(body.Password) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if existing, err := a.store.UserByEmail(r.Context(), emailNorm); err == nil && existing != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	hash, err := hashPassword(body.Password)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	user := &User{
		ID:                 randomID(12),
		Email:              email,
		EmailNormalized:    emailNorm,
		Username:           username,
		UsernameNormalized: username,
		PasswordHash:       hash,
		Role:               roleUser,
		Status:             statusPending,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	if err := a.store.InsertUser(r.Context(), user); err != nil {
		if errors.Is(err, errDuplicateEmail) {
			writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
			return
		}
		if errors.Is(err, errDuplicateUsername) {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if code, err := a.issueOTP(user, otpEmailVerify, emailNorm); err == nil {
		_ = a.sendOTPMail(email, otpEmailVerify, code)
	}
	a.auditEvent(r, "register", "accepted", user.ID)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) verifyEmailHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	var body struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, emailNorm, ok := normalizeEmail(body.Email)
	if !ok || !validOTP(body.OTP) {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	otp, err := a.consumeOTP(otpEmailVerify, emailNorm, body.OTP)
	if errors.Is(err, errOTPLocked) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	user, err := a.store.UserByID(r.Context(), otp.UserID)
	if err != nil || user.Status == statusDisabled {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	user.Status = statusVerified
	user.EmailVerified = true
	user.UpdatedAt = time.Now().UTC()
	if err := a.store.UpdateUser(r.Context(), user); err != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	if _, err := a.issueSession(w, user); err != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	a.auditEvent(r, "verify_email", "success", user.ID)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) resendVerificationHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, emailNorm, ok := normalizeEmail(body.Email)
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	ip := clientIP(r.RemoteAddr)
	if !a.resendIPLimit.allow(ip) || !a.resendIDLimit.allow(emailNorm) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	user, err := a.store.UserByEmail(r.Context(), emailNorm)
	if err == nil && user.Status == statusPending {
		if code, err := a.issueOTP(user, otpEmailVerify, emailNorm); err == nil {
			_ = a.sendOTPMail(user.Email, otpEmailVerify, code)
		}
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) changePasswordHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	if !a.profileLimit.allow(user.ID) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	var body struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || !validPassword(body.NewPassword) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !verifyPassword(user.PasswordHash, body.CurrentPassword) {
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	hash, err := hashPassword(body.NewPassword)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user.PasswordHash = hash
	user.UpdatedAt = time.Now().UTC()
	if err := a.store.UpdateUser(r.Context(), user); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_ = a.store.RevokeUserSessions(r.Context(), user.ID, "password_change")
	if _, err := a.issueSession(w, user); err != nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	a.auditEvent(r, "change_password", "success", user.ID)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) requestPasswordResetHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, emailNorm, ok := normalizeEmail(body.Email)
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	ip := clientIP(r.RemoteAddr)
	if !a.resetIPLimit.allow(ip) || !a.resetIDLimit.allow(emailNorm) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	user, err := a.store.UserByEmail(r.Context(), emailNorm)
	if err == nil && user.Status != statusDisabled {
		if code, err := a.issueOTP(user, otpPasswordReset, emailNorm); err == nil {
			_ = a.sendOTPMail(user.Email, otpPasswordReset, code)
		}
	}
	a.auditEvent(r, "password_reset_request", "accepted", "")
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) resetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	var body struct {
		Email       string `json:"email"`
		OTP         string `json:"otp"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, emailNorm, ok := normalizeEmail(body.Email)
	if !ok || !validOTP(body.OTP) {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	if !validPassword(body.NewPassword) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	otp, err := a.consumeOTP(otpPasswordReset, emailNorm, body.OTP)
	if errors.Is(err, errOTPLocked) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	user, err := a.store.UserByID(r.Context(), otp.UserID)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	hash, err := hashPassword(body.NewPassword)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	user.PasswordHash = hash
	user.UpdatedAt = time.Now().UTC()
	_ = a.store.UpdateUser(r.Context(), user)
	_ = a.store.RevokeUserSessions(r.Context(), user.ID, "reset")
	a.clearAuthCookies(w)
	a.auditEvent(r, "password_reset", "success", user.ID)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func sanitizeUsernameSource(raw string) string {
	raw = strings.ToLower(strings.TrimSpace(raw))
	var b strings.Builder
	for _, r := range raw {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			b.WriteRune(r)
		}
		if unicode.Is(unicode.C, r) {
			continue
		}
	}
	value := b.String()
	if len(value) < 3 {
		return "admin"
	}
	if len(value) > 32 {
		value = value[:32]
	}
	return value
}

func (a *App) bootstrapAdmin() {
	ctx := context.Background()
	n, err := a.store.CountAdmins(ctx)
	if err != nil || n > 0 {
		return
	}
	email := strings.TrimSpace(a.cfg.BootstrapAdminEmail)
	password := a.cfg.BootstrapAdminPassword
	if email == "" || password == "" {
		email = strings.TrimSpace(a.cfg.AdminEmail)
		password = a.cfg.AdminPassword
	}
	if email == "" || password == "" || !validPassword(password) {
		return
	}
	display, emailNorm, ok := normalizeEmail(email)
	if !ok {
		return
	}
	hash, err := hashPassword(password)
	if err != nil {
		return
	}
	local := display
	if i := strings.Index(local, "@"); i > 0 {
		local = local[:i]
	}
	username := sanitizeUsernameSource(local)
	if existing, err := a.store.UserByUsername(ctx, username); err == nil && existing != nil {
		username = sanitizeUsernameSource("admin_" + randomID(4))
	}
	now := time.Now().UTC()
	user := &User{
		ID:                 randomID(12),
		Email:              display,
		EmailNormalized:    emailNorm,
		Username:           username,
		UsernameNormalized: username,
		PasswordHash:       hash,
		Role:               roleAdmin,
		Status:             statusVerified,
		EmailVerified:      true,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	_ = a.store.InsertUser(ctx, user)
}
