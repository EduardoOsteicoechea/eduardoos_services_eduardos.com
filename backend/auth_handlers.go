package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"unicode"
)

func (a *App) registerHandler(w http.ResponseWriter, r *http.Request) {
	a.logAuthDebug(r, "register_start", slog.String("smtp_state", a.smtpDebugState()))
	if !a.requireUnsafe(w, r) {
		return
	}
	a.logAuthDebug(r, "register_csrf_ok")
	if !a.registerLimit.allow(clientIP(r.RemoteAddr)) {
		a.logAuthDebug(r, "register_rate_limited")
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	var body struct {
		Email    string `json:"email"`
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.logAuthDebug(r, "register_decode_failed", slog.String("reason", "invalid_json"))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	email, emailNorm, emailOK := normalizeEmail(body.Email)
	username, userOK := normalizeUsername(body.Username)
	passwordOK := validPassword(body.Password)
	a.logAuthDebug(r, "register_validated",
		slog.Bool("email_ok", emailOK),
		slog.Bool("username_ok", userOK),
		slog.Bool("password_ok", passwordOK),
		slog.String("email_domain", emailLogDomain(emailNorm)),
	)
	if !emailOK || !userOK || !passwordOK {
		a.logAuthDebug(r, "register_rejected", slog.String("reason", "validation_failed"))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if existing, err := a.store.UserByEmail(r.Context(), emailNorm); err == nil && existing != nil {
		a.logAuthDebug(r, "register_existing_email",
			slog.String("user_id", existing.ID),
			slog.String("status", existing.Status),
		)
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	hash, err := hashPassword(body.Password)
	if err != nil {
		a.logAuthDebug(r, "register_hash_failed", slog.String("reason", redactLogValue(err.Error())))
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
			a.logAuthDebug(r, "register_insert_duplicate_email")
			writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
			return
		}
		if errors.Is(err, errDuplicateUsername) {
			a.logAuthDebug(r, "register_insert_duplicate_username")
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
		a.logAuthDebug(r, "register_insert_failed", slog.String("reason", redactLogValue(err.Error())))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.logAuthDebug(r, "register_user_inserted", slog.String("user_id", user.ID), slog.String("status", user.Status))
	if code, err := a.issueOTPLogged(r, user, otpEmailVerify, emailNorm); err == nil {
		a.deliverOTPEmail(r, "register", email, otpEmailVerify, code, user.ID)
	} else {
		a.logAuthDebug(r, "register_otp_skipped", slog.String("reason", "issue_otp_failed"))
	}
	a.auditEvent(r, "register", "accepted", user.ID)
	a.logAuthDebug(r, "register_created", slog.String("user_id", user.ID), slog.String("status", user.Status))
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) verifyEmailHandler(w http.ResponseWriter, r *http.Request) {
	a.logAuthDebug(r, "verify_email_start")
	if !a.requireUnsafe(w, r) {
		return
	}
	a.logAuthDebug(r, "verify_email_csrf_ok")
	var body struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.logAuthDebug(r, "verify_email_decode_failed")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, emailNorm, ok := normalizeEmail(body.Email)
	otpOK := validOTP(body.OTP)
	a.logAuthDebug(r, "verify_email_validated",
		slog.Bool("email_ok", ok),
		slog.Bool("otp_ok", otpOK),
		slog.String("email_domain", emailLogDomain(emailNorm)),
	)
	if !ok || !otpOK {
		a.logAuthDebug(r, "verify_email_generic_ok", slog.String("reason", "invalid_input"))
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	otp, err := a.consumeOTPLogged(r, otpEmailVerify, emailNorm, body.OTP)
	if errors.Is(err, errOTPLocked) {
		a.logAuthDebug(r, "verify_email_rate_limited")
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	if err != nil {
		a.logAuthDebug(r, "verify_email_generic_ok", slog.String("reason", otpErrorReason(err)))
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	user, err := a.store.UserByID(r.Context(), otp.UserID)
	if err != nil || user.Status == statusDisabled {
		a.logAuthDebug(r, "verify_email_user_unavailable",
			slog.String("otp_user_id", otp.UserID),
			slog.Bool("user_found", err == nil),
		)
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	a.logAuthDebug(r, "verify_email_user_loaded",
		slog.String("user_id", user.ID),
		slog.String("status_before", user.Status),
	)
	user.Status = statusVerified
	user.EmailVerified = true
	user.UpdatedAt = time.Now().UTC()
	if err := a.store.UpdateUser(r.Context(), user); err != nil {
		a.logAuthDebug(r, "verify_email_update_failed", slog.String("reason", redactLogValue(err.Error())))
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	a.logAuthDebug(r, "verify_email_user_verified", slog.String("user_id", user.ID))
	if _, err := a.issueSessionLogged(w, r, user); err != nil {
		a.logAuthDebug(r, "verify_email_session_failed")
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	a.auditEvent(r, "verify_email", "success", user.ID)
	a.logAuthDebug(r, "verify_email_success", slog.String("user_id", user.ID))
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) resendVerificationHandler(w http.ResponseWriter, r *http.Request) {
	a.logAuthDebug(r, "resend_verification_start", slog.String("smtp_state", a.smtpDebugState()))
	if !a.requireUnsafe(w, r) {
		return
	}
	a.logAuthDebug(r, "resend_verification_csrf_ok")
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.logAuthDebug(r, "resend_verification_decode_failed")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, emailNorm, ok := normalizeEmail(body.Email)
	a.logAuthDebug(r, "resend_verification_validated",
		slog.Bool("email_ok", ok),
		slog.String("email_domain", emailLogDomain(emailNorm)),
	)
	if !ok {
		a.logAuthDebug(r, "resend_verification_rejected", slog.String("reason", "invalid_email"))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	ip := clientIP(r.RemoteAddr)
	ipOK := a.resendIPLimit.allow(ip)
	idOK := a.resendIDLimit.allow(emailNorm)
	if !ipOK || !idOK {
		a.logAuthDebug(r, "resend_verification_rate_limited",
			slog.Bool("ip_ok", ipOK),
			slog.Bool("id_ok", idOK),
		)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	user, err := a.store.UserByEmail(r.Context(), emailNorm)
	if err != nil {
		a.logAuthDebug(r, "resend_verification_user_not_found")
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	a.logAuthDebug(r, "resend_verification_user_loaded",
		slog.String("user_id", user.ID),
		slog.String("status", user.Status),
	)
	if user.Status == statusPending {
		if code, err := a.issueOTPLogged(r, user, otpEmailVerify, emailNorm); err == nil {
			a.deliverOTPEmail(r, "resend_verification", user.Email, otpEmailVerify, code, user.ID)
		} else {
			a.logAuthDebug(r, "resend_verification_otp_skipped", slog.String("reason", "issue_otp_failed"))
		}
	} else {
		a.logAuthDebug(r, "resend_verification_skipped", slog.String("reason", "user_not_pending"))
	}
	a.logAuthDebug(r, "resend_verification_ok")
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) changePasswordHandler(w http.ResponseWriter, r *http.Request) {
	a.logAuthDebug(r, "change_password_start")
	if !a.requireUnsafe(w, r) {
		return
	}
	a.logAuthDebug(r, "change_password_csrf_ok")
	user := a.currentUser(r)
	if user == nil {
		a.logAuthDebug(r, "change_password_unauthorized", slog.String("session_state", a.sessionDebugState(r)))
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	a.logAuthDebug(r, "change_password_user_loaded", slog.String("user_id", user.ID))
	if !a.profileLimit.allow(user.ID) {
		a.logAuthDebug(r, "change_password_rate_limited")
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	var body struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || !validPassword(body.NewPassword) {
		a.logAuthDebug(r, "change_password_invalid_request", slog.Bool("decode_ok", err == nil))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !verifyPassword(user.PasswordHash, body.CurrentPassword) {
		a.logAuthDebug(r, "change_password_denied", slog.String("reason", "bad_current_password"))
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	hash, err := hashPassword(body.NewPassword)
	if err != nil {
		a.logAuthDebug(r, "change_password_hash_failed", slog.String("reason", redactLogValue(err.Error())))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user.PasswordHash = hash
	user.UpdatedAt = time.Now().UTC()
	if err := a.store.UpdateUser(r.Context(), user); err != nil {
		a.logAuthDebug(r, "change_password_update_failed", slog.String("reason", redactLogValue(err.Error())))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.logAuthDebug(r, "change_password_revoking_sessions", slog.String("user_id", user.ID))
	_ = a.store.RevokeUserSessions(r.Context(), user.ID, "password_change")
	if _, err := a.issueSessionLogged(w, r, user); err != nil {
		a.logAuthDebug(r, "change_password_session_failed")
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	a.auditEvent(r, "change_password", "success", user.ID)
	a.logAuthDebug(r, "change_password_success", slog.String("user_id", user.ID))
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) requestPasswordResetHandler(w http.ResponseWriter, r *http.Request) {
	a.logAuthDebug(r, "password_reset_request_start", slog.String("smtp_state", a.smtpDebugState()))
	if !a.requireUnsafe(w, r) {
		return
	}
	a.logAuthDebug(r, "password_reset_request_csrf_ok")
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.logAuthDebug(r, "password_reset_request_decode_failed")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, emailNorm, ok := normalizeEmail(body.Email)
	a.logAuthDebug(r, "password_reset_request_validated",
		slog.Bool("email_ok", ok),
		slog.String("email_domain", emailLogDomain(emailNorm)),
	)
	if !ok {
		a.logAuthDebug(r, "password_reset_request_rejected", slog.String("reason", "invalid_email"))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	ip := clientIP(r.RemoteAddr)
	ipOK := a.resetIPLimit.allow(ip)
	idOK := a.resetIDLimit.allow(emailNorm)
	if !ipOK || !idOK {
		a.logAuthDebug(r, "password_reset_request_rate_limited",
			slog.Bool("ip_ok", ipOK),
			slog.Bool("id_ok", idOK),
		)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	user, err := a.store.UserByEmail(r.Context(), emailNorm)
	if err != nil {
		a.logAuthDebug(r, "password_reset_request_user_not_found")
	} else {
		a.logAuthDebug(r, "password_reset_request_user_loaded",
			slog.String("user_id", user.ID),
			slog.String("status", user.Status),
		)
		if user.Status != statusDisabled {
			if code, err := a.issueOTPLogged(r, user, otpPasswordReset, emailNorm); err == nil {
				a.deliverOTPEmail(r, "password_reset_request", user.Email, otpPasswordReset, code, user.ID)
			} else {
				a.logAuthDebug(r, "password_reset_request_otp_skipped", slog.String("reason", "issue_otp_failed"))
			}
		} else {
			a.logAuthDebug(r, "password_reset_request_skipped", slog.String("reason", "user_disabled"))
		}
	}
	a.auditEvent(r, "password_reset_request", "accepted", "")
	a.logAuthDebug(r, "password_reset_request_ok")
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) resetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	a.logAuthDebug(r, "password_reset_start")
	if !a.requireUnsafe(w, r) {
		return
	}
	a.logAuthDebug(r, "password_reset_csrf_ok")
	var body struct {
		Email       string `json:"email"`
		OTP         string `json:"otp"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.logAuthDebug(r, "password_reset_decode_failed")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, emailNorm, ok := normalizeEmail(body.Email)
	otpOK := validOTP(body.OTP)
	passwordOK := validPassword(body.NewPassword)
	a.logAuthDebug(r, "password_reset_validated",
		slog.Bool("email_ok", ok),
		slog.Bool("otp_ok", otpOK),
		slog.Bool("password_ok", passwordOK),
		slog.String("email_domain", emailLogDomain(emailNorm)),
	)
	if !ok || !otpOK {
		a.logAuthDebug(r, "password_reset_generic_ok", slog.String("reason", "invalid_input"))
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	if !passwordOK {
		a.logAuthDebug(r, "password_reset_rejected", slog.String("reason", "invalid_password"))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	otp, err := a.consumeOTPLogged(r, otpPasswordReset, emailNorm, body.OTP)
	if errors.Is(err, errOTPLocked) {
		a.logAuthDebug(r, "password_reset_rate_limited")
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	if err != nil {
		a.logAuthDebug(r, "password_reset_generic_ok", slog.String("reason", otpErrorReason(err)))
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	user, err := a.store.UserByID(r.Context(), otp.UserID)
	if err != nil {
		a.logAuthDebug(r, "password_reset_user_not_found", slog.String("otp_user_id", otp.UserID))
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	a.logAuthDebug(r, "password_reset_user_loaded", slog.String("user_id", user.ID))
	hash, err := hashPassword(body.NewPassword)
	if err != nil {
		a.logAuthDebug(r, "password_reset_hash_failed", slog.String("reason", redactLogValue(err.Error())))
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}
	user.PasswordHash = hash
	user.UpdatedAt = time.Now().UTC()
	if err := a.store.UpdateUser(r.Context(), user); err != nil {
		a.logAuthDebug(r, "password_reset_update_failed", slog.String("reason", redactLogValue(err.Error())))
	}
	a.logAuthDebug(r, "password_reset_revoking_sessions", slog.String("user_id", user.ID))
	_ = a.store.RevokeUserSessions(r.Context(), user.ID, "reset")
	a.clearAuthCookies(w)
	a.auditEvent(r, "password_reset", "success", user.ID)
	a.logAuthDebug(r, "password_reset_success", slog.String("user_id", user.ID))
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
