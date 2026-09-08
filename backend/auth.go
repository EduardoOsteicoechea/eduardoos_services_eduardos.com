package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const userContextKey contextKey = "user"

type authClaims struct {
	SID string `json:"sid"`
	jwt.RegisteredClaims
}

func randomID(n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func randomOTP() (string, error) {
	var n uint32
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	n = uint32(buf[0])<<24 | uint32(buf[1])<<16 | uint32(buf[2])<<8 | uint32(buf[3])
	return fmt.Sprintf("%06d", n%1000000), nil
}

func (a *App) hashOpaque(purpose, value string) string {
	mac := hmac.New(sha256.New, []byte(a.cfg.JWTSecret))
	_, _ = io.WriteString(mac, purpose)
	_, _ = io.WriteString(mac, ":")
	_, _ = io.WriteString(mac, value)
	return hex.EncodeToString(mac.Sum(nil))
}

func hmacEqual(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func (a *App) accessCookieName() string {
	if a.cfg.SecureCookies {
		return "__Host-access"
	}
	return "access"
}

func (a *App) refreshCookieName() string {
	if a.cfg.SecureCookies {
		return "__Host-refresh"
	}
	return "refresh"
}

func (a *App) csrfBindCookieName() string {
	if a.cfg.SecureCookies {
		return "__Host-csrfbind"
	}
	return "csrfbind"
}

func (a *App) setCookie(w http.ResponseWriter, name, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		Secure:   a.cfg.SecureCookies,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	if a.cfg.EnableAuthDebug || a.cfg.AppEnv == "development" {
		a.log.Info("auth_cookie_set",
			slog.String("cookie_name", name),
			slog.Bool("secure", a.cfg.SecureCookies),
			slog.Int("max_age", maxAge),
			slog.Bool("has_value", value != ""),
		)
	}
}

func (a *App) clearCookie(w http.ResponseWriter, name string) {
	a.setCookie(w, name, "", -1)
}

func (a *App) signAccess(userID, sessionID string) (string, error) {
	now := time.Now().UTC()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, authClaims{
		SID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    a.cfg.JWTIssuer,
			Subject:   userID,
			Audience:  jwt.ClaimStrings{a.cfg.JWTAudience},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTTL)),
		},
	})
	return token.SignedString([]byte(a.cfg.JWTSecret))
}

func (a *App) parseAccess(raw string) (*authClaims, error) {
	token, err := jwt.ParseWithClaims(raw, &authClaims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(a.cfg.JWTSecret), nil
	}, jwt.WithIssuer(a.cfg.JWTIssuer), jwt.WithAudience(a.cfg.JWTAudience))
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*authClaims)
	if !ok || !token.Valid || claims.Subject == "" || claims.SID == "" {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}

func (a *App) currentSession(r *http.Request) *Session {
	cookie, err := r.Cookie(a.accessCookieName())
	if err != nil || cookie.Value == "" {
		return nil
	}
	claims, err := a.parseAccess(cookie.Value)
	if err != nil {
		return nil
	}
	sess, err := a.store.SessionByID(r.Context(), claims.SID)
	if err != nil || sess.Revoked || sess.UserID != claims.Subject {
		return nil
	}
	now := time.Now().UTC()
	if now.After(sess.ExpiresAt) || now.After(sess.AbsoluteExpiresAt) {
		return nil
	}
	return sess
}

func (a *App) currentUser(r *http.Request) *User {
	sess := a.currentSession(r)
	if sess == nil {
		return nil
	}
	user, err := a.store.UserByID(r.Context(), sess.UserID)
	if err != nil || user.Status == statusDisabled {
		return nil
	}
	return user
}

func (a *App) issueSession(w http.ResponseWriter, user *User) (*Session, error) {
	now := time.Now().UTC()
	csrf := randomID(16)
	refresh := randomID(32)
	sess := &Session{
		SessionID:         randomID(16),
		FamilyID:          randomID(16),
		UserID:            user.ID,
		RefreshTokenHash:  a.hashOpaque("refresh", refresh),
		CSRFHash:          a.hashOpaque("csrf", csrf),
		CSRF:              csrf,
		ExpiresAt:         now.Add(refreshRolling),
		AbsoluteExpiresAt: now.Add(refreshAbsolute),
		FamilyCreatedAt:   now,
		CreatedAt:         now,
		LastUsedAt:        now,
	}
	if err := a.store.InsertSession(context.Background(), sess); err != nil {
		return nil, err
	}
	token, err := a.signAccess(user.ID, sess.SessionID)
	if err != nil {
		return nil, err
	}
	a.setCookie(w, a.accessCookieName(), token, int(accessTTL.Seconds()))
	a.setCookie(w, a.refreshCookieName(), refresh, int(refreshRolling.Seconds()))
	return sess, nil
}

func (a *App) rotateSession(w http.ResponseWriter, old *Session, user *User) (*Session, error) {
	now := time.Now().UTC()
	csrf := old.CSRF
	if csrf == "" {
		csrf = randomID(16)
	}
	refresh := randomID(32)
	capAt := old.FamilyCreatedAt.Add(refreshAbsolute)
	expires := now.Add(refreshRolling)
	if expires.After(capAt) {
		expires = capAt
	}
	next := &Session{
		SessionID:         randomID(16),
		FamilyID:          old.FamilyID,
		UserID:            user.ID,
		RefreshTokenHash:  a.hashOpaque("refresh", refresh),
		CSRFHash:          a.hashOpaque("csrf", csrf),
		CSRF:              csrf,
		ExpiresAt:         expires,
		AbsoluteExpiresAt: old.AbsoluteExpiresAt,
		FamilyCreatedAt:   old.FamilyCreatedAt,
		CreatedAt:         now,
		LastUsedAt:        now,
	}
	old.Revoked = true
	old.RevokeReason = "rotation"
	old.ReplacedBySessionID = next.SessionID
	if err := a.store.UpdateSession(context.Background(), old); err != nil {
		return nil, err
	}
	if err := a.store.InsertSession(context.Background(), next); err != nil {
		return nil, err
	}
	token, err := a.signAccess(user.ID, next.SessionID)
	if err != nil {
		return nil, err
	}
	a.setCookie(w, a.accessCookieName(), token, int(accessTTL.Seconds()))
	a.setCookie(w, a.refreshCookieName(), refresh, int(time.Until(expires).Seconds()))
	return next, nil
}

func (a *App) clearAuthCookies(w http.ResponseWriter) {
	a.clearCookie(w, a.accessCookieName())
	a.clearCookie(w, a.refreshCookieName())
	a.clearCookie(w, a.csrfBindCookieName())
}

func (a *App) mintCSRF(w http.ResponseWriter, r *http.Request) string {
	token := randomID(16)
	hash := a.hashOpaque("csrf", token)
	if sess := a.currentSession(r); sess != nil {
		sess.CSRFHash = hash
		sess.CSRF = token
		_ = a.store.UpdateSession(r.Context(), sess)
		return token
	}
	if cookie, err := r.Cookie(a.refreshCookieName()); err == nil && cookie.Value != "" {
		if sess, err := a.store.SessionByRefreshHash(r.Context(), a.hashOpaque("refresh", cookie.Value)); err == nil && !sess.Revoked {
			sess.CSRFHash = hash
			sess.CSRF = token
			_ = a.store.UpdateSession(r.Context(), sess)
			return token
		}
	}
	challenge := &CSRFChallenge{
		ID:        randomID(16),
		Hash:      hash,
		ExpiresAt: time.Now().UTC().Add(2 * time.Hour),
	}
	_ = a.store.InsertCSRF(r.Context(), challenge)
	a.setCookie(w, a.csrfBindCookieName(), challenge.ID, int((2 * time.Hour).Seconds()))
	return token
}

func (a *App) validOrigin(r *http.Request) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin != "" {
		for _, allowed := range a.cfg.AllowedOrigins {
			if origin == allowed {
				return true
			}
		}
		return false
	}
	referer := strings.TrimSpace(r.Header.Get("Referer"))
	if referer == "" {
		return false
	}
	parsed, err := url.Parse(referer)
	if err != nil {
		return false
	}
	refOrigin := parsed.Scheme + "://" + parsed.Host
	for _, allowed := range a.cfg.AllowedOrigins {
		if refOrigin == allowed {
			return true
		}
	}
	return false
}

func (a *App) validCSRF(r *http.Request) bool {
	header := strings.TrimSpace(r.Header.Get("X-CSRF-Token"))
	if header == "" {
		return false
	}
	want := a.hashOpaque("csrf", header)
	if sess := a.currentSession(r); sess != nil {
		return hmacEqual(want, sess.CSRFHash)
	}
	if cookie, err := r.Cookie(a.refreshCookieName()); err == nil && cookie.Value != "" {
		if sess, err := a.store.SessionByRefreshHash(r.Context(), a.hashOpaque("refresh", cookie.Value)); err == nil {
			return hmacEqual(want, sess.CSRFHash)
		}
	}
	cookie, err := r.Cookie(a.csrfBindCookieName())
	if err != nil || cookie.Value == "" {
		return false
	}
	ch, err := a.store.CSRFByID(r.Context(), cookie.Value)
	if err != nil || time.Now().UTC().After(ch.ExpiresAt) {
		return false
	}
	return hmacEqual(want, ch.Hash)
}

func (a *App) requireUnsafe(w http.ResponseWriter, r *http.Request) bool {
	originOK := a.validOrigin(r)
	csrfOK := a.validCSRF(r)
	if !originOK || !csrfOK {
		a.logAuthDebug(r, "require_unsafe_denied",
			slog.Bool("origin_ok", originOK),
			slog.Bool("csrf_ok", csrfOK),
			slog.String("csrf_reason", a.csrfFailureReason(r)),
		)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return false
	}
	return true
}

func (a *App) safeProfile(user *User) map[string]any {
	var display any
	if user.DisplayName != "" {
		display = user.DisplayName
	}
	var phone any
	if user.Phone != "" {
		phone = user.Phone
	}
	var avatar any
	if href := avatarAPIHref(user); href != "" {
		avatar = href
	}
	return map[string]any{
		"id":             user.ID,
		"email":          user.Email,
		"username":       user.Username,
		"display_name":   display,
		"phone":          phone,
		"role":           user.Role,
		"status":         user.Status,
		"email_verified": user.EmailVerified,
		"avatar":         avatar,
	}
}

func (a *App) csrfHandler(w http.ResponseWriter, r *http.Request) {
	token := a.mintCSRF(w, r)
	a.logAuthDebug(r, "csrf_minted", slog.Bool("has_token", token != ""))
	writeJSON(w, http.StatusOK, map[string]string{"csrf": token})
}

func (a *App) meHandler(w http.ResponseWriter, r *http.Request) {
	user := a.currentUser(r)
	if user == nil {
		a.logAuthDebug(r, "me_guest", slog.String("session_state", a.sessionDebugState(r)))
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	a.logAuthDebug(r, "me_authed", slog.String("user_id", user.ID), slog.String("role", user.Role))
	writeJSON(w, http.StatusOK, a.safeProfile(user))
}

func (a *App) lookupLoginUser(email, username string) *User {
	if email != "" {
		user, err := a.store.UserByEmail(context.Background(), email)
		if err != nil {
			return nil
		}
		return user
	}
	user, err := a.store.UserByUsername(context.Background(), username)
	if err != nil {
		return nil
	}
	return user
}

func (a *App) dummyPasswordCheck(password string) {
	_ = verifyPassword(a.dummyHash, password)
}

func (a *App) loginHandler(w http.ResponseWriter, r *http.Request) {
	a.logAuthDebug(r, "login_start")
	if !a.requireUnsafe(w, r) {
		return
	}
	ip := clientIP(r.RemoteAddr)
	var body struct {
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.logValidation(r, "invalid_json")
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	identifier := strings.TrimSpace(body.Identifier)
	if identifier == "" {
		a.logValidation(r, "missing_identifier")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if body.Password == "" {
		a.logValidation(r, "missing_password")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	hasEmail := strings.Contains(identifier, "@")
	var emailNorm, usernameNorm string
	var emailOK, usernameOK bool
	if hasEmail {
		_, emailNorm, emailOK = normalizeEmail(identifier)
	} else {
		usernameNorm, usernameOK = normalizeUsername(identifier)
	}
	ident := emailNorm
	if !hasEmail {
		ident = usernameNorm
	}
	if !a.loginIPLimit.allow(ip) || !a.loginIDLimit.allow(ident) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	if (hasEmail && !emailOK) || (!hasEmail && !usernameOK) {
		a.dummyPasswordCheck(body.Password)
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	user := a.lookupLoginUser(emailNorm, usernameNorm)
	if user == nil || user.Status != statusVerified || !verifyPassword(user.PasswordHash, body.Password) {
		if user == nil {
			a.dummyPasswordCheck(body.Password)
		}
		a.auditEvent(r, "login", "failure", "")
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	sess, err := a.issueSession(w, user)
	if err != nil {
		a.auditEvent(r, "login", "failure", "")
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	a.auditEvent(r, "login", "success", user.ID)
	a.logAuthDebug(r, "login_success", slog.String("user_id", user.ID))
	profile := a.safeProfile(user)
	profile["csrf"] = sess.CSRF
	writeJSON(w, http.StatusOK, profile)
}

func (a *App) logoutHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	if sess := a.currentSession(r); sess != nil {
		_ = a.store.RevokeFamily(r.Context(), sess.FamilyID, "logout")
	} else if cookie, err := r.Cookie(a.refreshCookieName()); err == nil && cookie.Value != "" {
		if sess, err := a.store.SessionByRefreshHash(r.Context(), a.hashOpaque("refresh", cookie.Value)); err == nil {
			_ = a.store.RevokeFamily(r.Context(), sess.FamilyID, "logout")
		}
	}
	a.clearAuthCookies(w)
	a.auditEvent(r, "logout", "success", "")
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) refreshHandler(w http.ResponseWriter, r *http.Request) {
	a.logAuthDebug(r, "refresh_start")
	if !a.requireUnsafe(w, r) {
		return
	}
	cookie, err := r.Cookie(a.refreshCookieName())
	if err != nil || cookie.Value == "" {
		a.clearAuthCookies(w)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	hash := a.hashOpaque("refresh", cookie.Value)
	sess, err := a.store.SessionByRefreshHash(r.Context(), hash)
	if err != nil {
		a.clearAuthCookies(w)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	if sess.Revoked {
		_ = a.store.RevokeFamily(r.Context(), sess.FamilyID, "reuse")
		a.clearAuthCookies(w)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	now := time.Now().UTC()
	if now.After(sess.ExpiresAt) || now.After(sess.AbsoluteExpiresAt) {
		_ = a.store.RevokeFamily(r.Context(), sess.FamilyID, "expired")
		a.clearAuthCookies(w)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	if !a.refreshLimit.allow(sess.SessionID) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	user, err := a.store.UserByID(r.Context(), sess.UserID)
	if err != nil || user.Status != statusVerified {
		_ = a.store.RevokeFamily(r.Context(), sess.FamilyID, "disable")
		a.clearAuthCookies(w)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	if _, err := a.rotateSession(w, sess, user); err != nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	writeJSON(w, http.StatusOK, a.safeProfile(user))
}

func (a *App) issueOTP(user *User, purpose, emailNorm string) (string, error) {
	code, err := randomOTP()
	if err != nil {
		return "", err
	}
	_ = a.store.InvalidateOTPs(context.Background(), purpose, emailNorm)
	now := time.Now().UTC()
	rec := &OTPRecord{
		ID:              randomID(12),
		Purpose:         purpose,
		EmailNormalized: emailNorm,
		UserID:          user.ID,
		OTPHash:         a.hashOpaque("otp:"+purpose+":"+emailNorm, code),
		ExpiresAt:       now.Add(otpTTL),
		CreatedAt:       now,
	}
	if err := a.store.InsertOTP(context.Background(), rec); err != nil {
		return "", err
	}
	return code, nil
}

func (a *App) sendOTPMail(to, purpose, code string) error {
	subject := "Your verification code"
	intro := "email verification"
	if purpose == otpPasswordReset {
		subject = "Your password reset code"
		intro = "password reset"
	}
	body := "Your " + intro + " code expires in 10 minutes.\n\n" + code + "\n"
	return a.mailer.Send(to, subject, body)
}

func (a *App) consumeOTP(purpose, emailNorm, code string) (*OTPRecord, error) {
	otp, err := a.store.LatestOTP(context.Background(), purpose, emailNorm)
	if err != nil {
		return nil, errNotFound
	}
	if otp.ConsumedAt != nil {
		return nil, errNotFound
	}
	if otp.Attempts >= otpMaxAttempts {
		return nil, errOTPLocked
	}
	if time.Now().UTC().After(otp.ExpiresAt) {
		return nil, errOTPExpired
	}
	want := a.hashOpaque("otp:"+purpose+":"+emailNorm, strings.TrimSpace(code))
	if !hmacEqual(want, otp.OTPHash) {
		otp.Attempts++
		if otp.Attempts >= otpMaxAttempts {
			now := time.Now().UTC()
			otp.ConsumedAt = &now
		}
		_ = a.store.UpdateOTP(context.Background(), otp)
		if otp.Attempts >= otpMaxAttempts {
			return nil, errOTPLocked
		}
		return nil, errNotFound
	}
	now := time.Now().UTC()
	otp.ConsumedAt = &now
	_ = a.store.UpdateOTP(context.Background(), otp)
	return otp, nil
}

var (
	errOTPExpired = errors.New("otp expired")
	errOTPLocked  = errors.New("otp locked")
)
