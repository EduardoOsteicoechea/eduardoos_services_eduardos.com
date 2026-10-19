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
	if a.cfg.MustLog || a.cfg.EnableAuthDebug || a.cfg.AppEnv == "development" {
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
	if sess, _, ok := a.sessionCache.get(claims.SID); ok {
		if sessionCacheAlive(sess, claims.Subject) {
			return sess
		}
		a.sessionCache.invalidate(claims.SID)
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
	cookie, err := r.Cookie(a.accessCookieName())
	if err != nil || cookie.Value == "" {
		return nil
	}
	claims, err := a.parseAccess(cookie.Value)
	if err != nil {
		return nil
	}
	if sess, user, ok := a.sessionCache.get(claims.SID); ok {
		if sessionCacheAlive(sess, claims.Subject) {
			if user != nil && user.Status != statusDisabled {
				return user
			}
			if user != nil && user.Status == statusDisabled {
				a.sessionCache.invalidate(claims.SID)
				return nil
			}
		} else {
			a.sessionCache.invalidate(claims.SID)
		}
	}
	sess, err := a.store.SessionByID(r.Context(), claims.SID)
	if err != nil || sess.Revoked || sess.UserID != claims.Subject {
		return nil
	}
	now := time.Now().UTC()
	if now.After(sess.ExpiresAt) || now.After(sess.AbsoluteExpiresAt) {
		return nil
	}
	user, err := a.store.UserByID(r.Context(), sess.UserID)
	if err != nil || user.Status == statusDisabled {
		return nil
	}
	a.sessionCache.put(sess, user)
	return user
}

// revokeFamily revokes a refresh-token family and drops matching cache entries.
func (a *App) revokeFamily(ctx context.Context, familyID, reason string) error {
	err := a.store.RevokeFamily(ctx, familyID, reason)
	a.sessionCache.invalidateFamily(familyID)
	return err
}

// revokeUserSessions revokes every session for a user and clears their cache entries.
func (a *App) revokeUserSessions(ctx context.Context, userID, reason string) error {
	err := a.store.RevokeUserSessions(ctx, userID, reason)
	a.sessionCache.invalidateUser(userID)
	return err
}

// updateUser persists a user and invalidates cached /me material for that account.
func (a *App) updateUser(ctx context.Context, user *User) error {
	err := a.store.UpdateUser(ctx, user)
	if err == nil && user != nil {
		a.sessionCache.invalidateUser(user.ID)
	}
	return err
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
		UpdatedAt:         now,
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
		UpdatedAt:         now,
		LastUsedAt:        now,
	}
	// Insert successor first so grace lookups never see a dangling ReplacedBySessionID.
	if err := a.store.InsertSession(context.Background(), next); err != nil {
		return nil, err
	}
	// CAS: only one concurrent rotator may claim the old session.
	if err := a.store.ClaimSessionRotation(context.Background(), old.SessionID, old.RefreshTokenHash, next.SessionID); err != nil {
		next.Revoked = true
		next.RevokeReason = "rotate_abort"
		next.UpdatedAt = time.Now().UTC()
		_ = a.store.UpdateSession(context.Background(), next)
		a.sessionCache.invalidate(next.SessionID)
		return nil, err
	}
	a.sessionCache.invalidate(old.SessionID)
	a.sessionCache.invalidate(next.SessionID)
	a.sessionCache.invalidateFamily(old.FamilyID)
	token, err := a.signAccess(user.ID, next.SessionID)
	if err != nil {
		return nil, err
	}
	a.setCookie(w, a.accessCookieName(), token, int(accessTTL.Seconds()))
	a.setCookie(w, a.refreshCookieName(), refresh, int(time.Until(expires).Seconds()))
	return next, nil
}

func rotationGraceEligible(sess *Session) bool {
	if sess == nil || !sess.Revoked || sess.RevokeReason != "rotation" || sess.ReplacedBySessionID == "" {
		return false
	}
	if sess.UpdatedAt.IsZero() {
		return false
	}
	return time.Since(sess.UpdatedAt.UTC()) <= refreshRotationGrace
}

// aliveSuccessor walks a short rotation chain to the current alive tip.
func (a *App) aliveSuccessor(ctx context.Context, revoked *Session) *Session {
	if revoked == nil {
		return nil
	}
	id := revoked.ReplacedBySessionID
	for i := 0; i < 8 && id != ""; i++ {
		sess, err := a.store.SessionByID(ctx, id)
		if err != nil {
			return nil
		}
		if refreshSessionAlive(sess) {
			return sess
		}
		// Keep walking any linked replacement (rotation winners); skip dead ends.
		if sess.ReplacedBySessionID != "" {
			id = sess.ReplacedBySessionID
			continue
		}
		return nil
	}
	return nil
}

func (a *App) clearAuthCookies(w http.ResponseWriter) {
	a.clearCookie(w, a.accessCookieName())
	a.clearCookie(w, a.refreshCookieName())
	a.clearCookie(w, a.csrfBindCookieName())
}

func refreshSessionAlive(sess *Session) bool {
	if sess == nil || sess.Revoked {
		return false
	}
	now := time.Now().UTC()
	if now.After(sess.ExpiresAt) {
		return false
	}
	if !sess.AbsoluteExpiresAt.IsZero() && now.After(sess.AbsoluteExpiresAt) {
		return false
	}
	return true
}

func (a *App) mintCSRF(w http.ResponseWriter, r *http.Request) string {
	// Authenticated sessions: reuse the existing synchronizer token when present.
	// Reminting on every GET /auth/csrf races concurrent unsafe requests (preview+persist)
	// and yields intermittent 403 forbidden.
	if sess := a.currentSession(r); sess != nil {
		if strings.TrimSpace(sess.CSRF) != "" {
			return sess.CSRF
		}
		token := randomID(16)
		hash := a.hashOpaque("csrf", token)
		sess.CSRFHash = hash
		sess.CSRF = token
		_ = a.store.UpdateSession(r.Context(), sess)
		a.sessionCache.invalidate(sess.SessionID)
		return token
	}
	if cookie, err := r.Cookie(a.refreshCookieName()); err == nil && cookie.Value != "" {
		if sess, err := a.store.SessionByRefreshHash(r.Context(), a.hashOpaque("refresh", cookie.Value)); err == nil && refreshSessionAlive(sess) {
			if strings.TrimSpace(sess.CSRF) != "" {
				return sess.CSRF
			}
			token := randomID(16)
			hash := a.hashOpaque("csrf", token)
			sess.CSRFHash = hash
			sess.CSRF = token
			_ = a.store.UpdateSession(r.Context(), sess)
			a.sessionCache.invalidate(sess.SessionID)
			return token
		}
		// Do NOT clear access/refresh here. A concurrent /auth/refresh may have just
		// rotated the cookie; wiping it from a racing GET /auth/csrf logs the user out
		// (Homescool curriculum PDF preview is a common trigger). Dead refresh still
		// falls through to guest csrfbind; login/refresh/logout own cookie clears.
	}
	token := randomID(16)
	hash := a.hashOpaque("csrf", token)
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
	if referer != "" {
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
	// Some mobile browsers omit Origin/Referer on same-origin fetch; Sec-Fetch-Site remains reliable.
	site := strings.ToLower(strings.TrimSpace(r.Header.Get("Sec-Fetch-Site")))
	return site == "same-origin"
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
			if refreshSessionAlive(sess) {
				return hmacEqual(want, sess.CSRFHash)
			}
			// Dead refresh cookies must not block guest csrfbind (login after idle expiry).
			if sess.Revoked && r.URL.Path == "/api/auth/refresh" {
				return hmacEqual(want, sess.CSRFHash)
			}
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
	start := time.Now().UTC()
	originOK := a.validOrigin(r)
	csrfOK := a.validCSRF(r)
	csrfReason := a.csrfFailureReason(r)
	if !originOK || !csrfOK {
		a.logAuthDebug(r, "require_unsafe_denied",
			slog.Bool("origin_ok", originOK),
			slog.Bool("csrf_ok", csrfOK),
			slog.String("csrf_reason", csrfReason),
			slog.String("reason", "csrf_or_origin"),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return false
	}
	a.logAuthDebug(r, "require_unsafe_ok",
		slog.Bool("origin_ok", originOK),
		slog.Bool("csrf_ok", csrfOK),
		slog.String("csrf_reason", csrfReason),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)
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
	start := time.Now().UTC()
	token := a.mintCSRF(w, r)
	a.logAuthDebug(r, "csrf_minted",
		slog.Bool("has_token", token != ""),
		slog.String("session_state", a.sessionDebugState(r)),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)
	writeJSON(w, http.StatusOK, map[string]string{"csrf": token})
}

func (a *App) meHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now().UTC()
	user := a.currentUser(r)
	if user == nil {
		a.logAuthDebug(r, "me_guest",
			slog.String("reason", "unauthorized"),
			slog.String("session_state", a.sessionDebugState(r)),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	a.logAuthDebug(r, "me_authed",
		slog.String("reason", "ok"),
		slog.String("user_id", user.ID),
		slog.String("role", user.Role),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)
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
	start := time.Now().UTC()
	a.logAuthDebug(r, "login_start")
	if !a.requireUnsafe(w, r) {
		return
	}
	ip := clientIP(r)
	var body struct {
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.logValidation(r, "invalid_json")
		a.auditEvent(r, "login", "failure", "")
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
		a.logAuthDebug(r, "login_rate_limited",
			slog.String("reason", "rate_limited"),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		a.auditEvent(r, "login", "failure", "")
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	if (hasEmail && !emailOK) || (!hasEmail && !usernameOK) {
		a.logAuthDebug(r, "login_denied",
			slog.String("reason", "invalid_identifier"),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		a.auditEvent(r, "login", "failure", "")
		a.dummyPasswordCheck(body.Password)
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	user := a.lookupLoginUser(emailNorm, usernameNorm)
	passwordOK := user != nil && verifyPassword(user.PasswordHash, body.Password)
	if user == nil || user.Status != statusVerified || !passwordOK {
		if user == nil {
			a.dummyPasswordCheck(body.Password)
		}
		reason := loginDenialReason(user, passwordOK)
		a.logAuthDebug(r, "login_denied",
			slog.String("reason", reason),
			slog.Bool("has_user", user != nil),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		// Always-on audit uses stable success/failure; reason codes stay in auth_debug.
		a.auditEvent(r, "login", "failure", "")
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	sess, err := a.issueSessionLogged(w, r, user)
	if err != nil {
		a.logAuthDebug(r, "login_session_failed",
			slog.String("reason", "issue_session_failed"),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		a.auditEvent(r, "login", "failure", "")
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	a.auditEvent(r, "login", "success", user.ID)
	a.logAuthDebug(r, "login_success",
		slog.String("reason", "success"),
		slog.String("user_id", user.ID),
		slog.String("session_id", sess.SessionID),
		slog.String("family_id", sess.FamilyID),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)
	profile := a.safeProfile(user)
	profile["csrf"] = sess.CSRF
	writeJSON(w, http.StatusOK, profile)
}

func (a *App) logoutHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now().UTC()
	a.logAuthDebug(r, "logout_start")
	if !a.requireUnsafe(w, r) {
		return
	}
	a.logAuthDebug(r, "logout_csrf_ok")
	var sessionID, familyID string
	if sess := a.currentSession(r); sess != nil {
		sessionID, familyID = sess.SessionID, sess.FamilyID
		a.logAuthDebug(r, "logout_revoke_access_session",
			slog.String("session_id", sessionID),
			slog.String("family_id", familyID),
		)
		_ = a.revokeFamily(r.Context(), sess.FamilyID, "logout")
		a.sessionCache.invalidate(sess.SessionID)
	} else if cookie, err := r.Cookie(a.refreshCookieName()); err == nil && cookie.Value != "" {
		if sess, err := a.store.SessionByRefreshHash(r.Context(), a.hashOpaque("refresh", cookie.Value)); err == nil {
			sessionID, familyID = sess.SessionID, sess.FamilyID
			a.logAuthDebug(r, "logout_revoke_refresh_session",
				slog.String("session_id", sessionID),
				slog.String("family_id", familyID),
			)
			_ = a.revokeFamily(r.Context(), sess.FamilyID, "logout")
			a.sessionCache.invalidate(sess.SessionID)
		} else {
			a.logAuthDebug(r, "logout_refresh_lookup_failed", slog.String("reason", "session_not_found"))
		}
	} else {
		a.logAuthDebug(r, "logout_no_session", slog.String("reason", "no_session"))
	}
	a.clearAuthCookies(w)
	a.auditEvent(r, "logout", "success", "")
	a.logAuthDebug(r, "logout_success",
		slog.String("reason", "success"),
		slog.String("session_id", sessionID),
		slog.String("family_id", familyID),
		slog.Int64("duration_ms", time.Since(start).Milliseconds()),
	)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *App) refreshHandler(w http.ResponseWriter, r *http.Request) {
	start := time.Now().UTC()
	a.logAuthDebug(r, "refresh_start")
	if !a.requireUnsafe(w, r) {
		return
	}
	cookie, err := r.Cookie(a.refreshCookieName())
	if err != nil || cookie.Value == "" {
		a.logAuthDebug(r, "refresh_denied",
			slog.String("reason", "missing_refresh_cookie"),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		a.auditEvent(r, "refresh", "missing_refresh_cookie", "")
		a.clearAuthCookies(w)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	hash := a.hashOpaque("refresh", cookie.Value)
	sess, err := a.store.SessionByRefreshHash(r.Context(), hash)
	if err != nil {
		a.logAuthDebug(r, "refresh_denied",
			slog.String("reason", "session_not_found"),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		a.auditEvent(r, "refresh", "session_not_found", "")
		a.clearAuthCookies(w)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}

	finishOK := func(user *User, next *Session, reason string) {
		a.auditEvent(r, "refresh", reason, user.ID)
		a.logAuthDebug(r, "refresh_success",
			slog.String("reason", reason),
			slog.String("user_id", user.ID),
			slog.String("session_id", next.SessionID),
			slog.String("family_id", next.FamilyID),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		writeJSON(w, http.StatusOK, a.safeProfile(user))
	}

	denyReuse := func(s *Session, reason string) {
		a.logAuthDebug(r, "refresh_denied",
			slog.String("reason", reason),
			slog.String("session_id", s.SessionID),
			slog.String("family_id", s.FamilyID),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		a.auditEvent(r, "refresh", reason, "")
		_ = a.revokeFamily(r.Context(), s.FamilyID, "reuse")
		a.sessionCache.invalidate(s.SessionID)
		a.clearAuthCookies(w)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
	}

	tryGraceRotate := func(revoked *Session, user *User) bool {
		if !rotationGraceEligible(revoked) {
			return false
		}
		for attempt := 0; attempt < 8; attempt++ {
			tip := a.aliveSuccessor(r.Context(), revoked)
			if tip == nil {
				return false
			}
			a.logAuthDebug(r, "refresh_grace",
				slog.String("reason", "ok_rotation_grace"),
				slog.String("session_id", revoked.SessionID),
				slog.String("family_id", revoked.FamilyID),
				slog.String("successor_id", tip.SessionID),
				slog.Int("attempt", attempt),
			)
			next, rotErr := a.rotateSession(w, tip, user)
			if rotErr == nil {
				finishOK(user, next, "grace_ok")
				return true
			}
			if !errors.Is(rotErr, errConflict) {
				a.logAuthDebug(r, "refresh_rotate_failed",
					slog.String("reason", "rotate_fail"),
					slog.String("session_id", tip.SessionID),
				)
				a.auditEvent(r, "refresh", "rotate_fail", user.ID)
				a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
				return true // handled
			}
			// Concurrent rotator won on this tip — walk the chain and retry.
		}
		// Still inside grace but lost every CAS race: soft-fail without killing the family.
		a.logAuthDebug(r, "refresh_grace_exhausted",
			slog.String("reason", "rotate_fail"),
			slog.String("session_id", revoked.SessionID),
			slog.String("family_id", revoked.FamilyID),
		)
		a.auditEvent(r, "refresh", "rotate_fail", user.ID)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return true
	}

	loadUser := func(s *Session) (*User, bool) {
		user, uerr := a.store.UserByID(r.Context(), s.UserID)
		if uerr != nil || user.Status != statusVerified {
			a.logAuthDebug(r, "refresh_denied",
				slog.String("reason", "user_unavailable"),
				slog.String("session_id", s.SessionID),
				slog.Bool("user_found", uerr == nil),
				slog.Int64("duration_ms", time.Since(start).Milliseconds()),
			)
			a.auditEvent(r, "refresh", "user_unavailable", "")
			_ = a.revokeFamily(r.Context(), s.FamilyID, "disable")
			a.sessionCache.invalidate(s.SessionID)
			a.clearAuthCookies(w)
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return nil, false
		}
		return user, true
	}

	if sess.Revoked {
		user, ok := loadUser(sess)
		if !ok {
			return
		}
		if tryGraceRotate(sess, user) {
			return
		}
		// Inside the grace window a missing tip is a soft failure — never kill the family.
		if rotationGraceEligible(sess) {
			a.logAuthDebug(r, "refresh_grace_no_tip",
				slog.String("reason", "rotate_fail"),
				slog.String("session_id", sess.SessionID),
				slog.String("family_id", sess.FamilyID),
			)
			a.auditEvent(r, "refresh", "rotate_fail", user.ID)
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		denyReuse(sess, "reuse")
		return
	}

	now := time.Now().UTC()
	if now.After(sess.ExpiresAt) || now.After(sess.AbsoluteExpiresAt) {
		a.logAuthDebug(r, "refresh_denied",
			slog.String("reason", "expired"),
			slog.String("session_id", sess.SessionID),
			slog.String("family_id", sess.FamilyID),
			slog.Int64("duration_ms", time.Since(start).Milliseconds()),
		)
		a.auditEvent(r, "refresh", "expired", "")
		_ = a.revokeFamily(r.Context(), sess.FamilyID, "expired")
		a.sessionCache.invalidate(sess.SessionID)
		a.clearAuthCookies(w)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	if !a.refreshLimit.allow(sess.SessionID) {
		a.logAuthDebug(r, "refresh_rate_limited",
			slog.String("reason", "rate_limited"),
			slog.String("session_id", sess.SessionID),
		)
		a.auditEvent(r, "refresh", "rate_limited", "")
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	user, ok := loadUser(sess)
	if !ok {
		return
	}
	a.logAuthDebug(r, "refresh_rotating",
		slog.String("session_id", sess.SessionID),
		slog.String("family_id", sess.FamilyID),
		slog.String("user_id", user.ID),
	)
	next, rotErr := a.rotateSession(w, sess, user)
	if rotErr != nil {
		if errors.Is(rotErr, errConflict) {
			// Concurrent refresh already rotated — fall through to grace/reuse on the same hash.
			again, lookErr := a.store.SessionByRefreshHash(r.Context(), hash)
			if lookErr == nil && again.Revoked {
				if tryGraceRotate(again, user) {
					return
				}
				if rotationGraceEligible(again) {
					a.auditEvent(r, "refresh", "rotate_fail", user.ID)
					a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
					return
				}
				denyReuse(again, "reuse")
				return
			}
			a.logAuthDebug(r, "refresh_rotate_failed",
				slog.String("reason", "rotate_conflict"),
				slog.String("session_id", sess.SessionID),
			)
			a.auditEvent(r, "refresh", "rotate_fail", user.ID)
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		a.logAuthDebug(r, "refresh_rotate_failed",
			slog.String("reason", "rotate_fail"),
			slog.String("session_id", sess.SessionID),
		)
		a.auditEvent(r, "refresh", "rotate_fail", user.ID)
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	finishOK(user, next, "ok")
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

func (a *App) deliverOTPEmail(r *http.Request, auditKind, to, purpose, code, userID string) {
	a.logAuthDebug(r, auditKind+"_email_start",
		slog.String("purpose", purpose),
		slog.String("user_id", userID),
		slog.String("smtp_state", a.smtpDebugState()),
		slog.String("email_domain", emailLogDomain(strings.ToLower(strings.TrimSpace(to)))),
	)
	if err := a.sendOTPMail(to, purpose, code); err != nil {
		a.auditEvent(r, auditKind, "email_failed", userID)
		a.logAuthDebug(r, auditKind+"_email_failed", slog.String("reason", redactLogValue(err.Error())))
		return
	}
	a.auditEvent(r, auditKind, "email_sent", userID)
	a.logAuthDebug(r, auditKind+"_email_sent", slog.String("user_id", userID))
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
