package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const userContextKey contextKey = "user"

type authClaims struct {
	jwt.RegisteredClaims
}

func randomID(n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func (a *App) accessCookieName() string {
	if a.cfg.SecureCookies {
		return "__Host-access"
	}
	return "access"
}

func (a *App) csrfCookieName() string {
	if a.cfg.SecureCookies {
		return "__Host-csrf"
	}
	return "csrf"
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
}

func (a *App) clearCookie(w http.ResponseWriter, name string) {
	a.setCookie(w, name, "", -1)
}

func (a *App) signAccess(userID, sessionID string) (string, error) {
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, authClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    a.cfg.JWTIssuer,
			Subject:   userID,
			Audience:  jwt.ClaimStrings{a.cfg.JWTAudience},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
			ID:        sessionID,
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
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
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
	sess := a.sessions.get(claims.ID)
	if sess == nil || sess.Revoked || time.Now().After(sess.ExpiresAt) || sess.UserID != claims.Subject {
		return nil
	}
	user := a.users.get(claims.Subject)
	if user == nil {
		return nil
	}
	return user
}

func (a *App) currentSession(r *http.Request) *Session {
	cookie, err := r.Cookie(a.accessCookieName())
	if err != nil {
		return nil
	}
	claims, err := a.parseAccess(cookie.Value)
	if err != nil {
		return nil
	}
	return a.sessions.get(claims.ID)
}

func (a *App) issueSession(w http.ResponseWriter, user *User) (*Session, error) {
	sess := &Session{
		ID:        randomID(16),
		UserID:    user.ID,
		CSRF:      randomID(16),
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}
	a.sessions.put(sess)
	token, err := a.signAccess(user.ID, sess.ID)
	if err != nil {
		return nil, err
	}
	a.setCookie(w, a.accessCookieName(), token, int((15 * time.Minute).Seconds()))
	a.setCookie(w, a.csrfCookieName(), sess.CSRF, int((15 * time.Minute).Seconds()))
	return sess, nil
}

func (a *App) ensureCSRF(w http.ResponseWriter, r *http.Request) string {
	if sess := a.currentSession(r); sess != nil && sess.CSRF != "" {
		a.setCookie(w, a.csrfCookieName(), sess.CSRF, int((15 * time.Minute).Seconds()))
		return sess.CSRF
	}
	if cookie, err := r.Cookie(a.csrfCookieName()); err == nil && cookie.Value != "" {
		return cookie.Value
	}
	token := randomID(16)
	a.setCookie(w, a.csrfCookieName(), token, int((15 * time.Minute).Seconds()))
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
	if sess := a.currentSession(r); sess != nil {
		return header == sess.CSRF
	}
	cookie, err := r.Cookie(a.csrfCookieName())
	if err != nil {
		return false
	}
	return header == cookie.Value
}

func (a *App) writeSafeError(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}

func (a *App) meHandler(w http.ResponseWriter, r *http.Request) {
	csrf := a.ensureCSRF(w, r)
	user := a.currentUser(r)
	if user == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
			"csrf":  csrf,
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":             user.ID,
		"email":          user.Email,
		"role":           user.Role,
		"email_verified": user.EmailVerified,
		"csrf":           csrf,
	})
}

func (a *App) loginHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, http.StatusForbidden, "forbidden")
		return
	}
	if !a.loginLimit.allow(r.RemoteAddr) {
		a.writeSafeError(w, http.StatusTooManyRequests, "rate_limited")
		return
	}
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	user := a.users.byEmail(strings.TrimSpace(body.Email))
	if user == nil || !verifyPassword(user.PasswordHash, body.Password) {
		a.writeSafeError(w, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	if _, err := a.issueSession(w, user); err != nil {
		a.writeSafeError(w, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":             user.ID,
		"email":          user.Email,
		"role":           user.Role,
		"email_verified": user.EmailVerified,
	})
}

func (a *App) logoutHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, http.StatusForbidden, "forbidden")
		return
	}
	if sess := a.currentSession(r); sess != nil {
		a.sessions.revoke(sess.ID)
	}
	a.clearCookie(w, a.accessCookieName())
	a.clearCookie(w, a.csrfCookieName())
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
