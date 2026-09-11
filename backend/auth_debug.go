package main

import (
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func (a *App) authDebugEnabled(r *http.Request) bool {
	if a.cfg.MustLog || a.cfg.EnableAuthDebug || a.cfg.AppEnv == "development" {
		return true
	}
	origin := requestOrigin(r)
	if origin == "" {
		return false
	}
	for _, allowed := range a.cfg.AllowedOrigins {
		if strings.HasPrefix(allowed, "http://127.0.0.1:") || strings.HasPrefix(allowed, "https://127.0.0.1:") {
			if origin == allowed {
				return true
			}
		}
	}
	return false
}

func requestOrigin(r *http.Request) string {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin != "" {
		return origin
	}
	referer := strings.TrimSpace(r.Header.Get("Referer"))
	if referer == "" {
		return ""
	}
	parsed, err := url.Parse(referer)
	if err != nil {
		return ""
	}
	return parsed.Scheme + "://" + parsed.Host
}

func cookieNames(r *http.Request) []string {
	names := make([]string, 0, len(r.Cookies()))
	for _, cookie := range r.Cookies() {
		names = append(names, cookie.Name)
	}
	return names
}

func (a *App) hasCookie(r *http.Request, name string) bool {
	_, err := r.Cookie(name)
	return err == nil
}

func (a *App) logAuthDebug(r *http.Request, step string, attrs ...slog.Attr) {
	if !a.authDebugEnabled(r) {
		return
	}
	base := []slog.Attr{
		slog.String("request_id", requestIDFrom(r, nil)),
		slog.String("auth_step", step),
		slog.String("route", r.URL.Path),
		slog.String("method", r.Method),
		slog.String("origin", requestOrigin(r)),
		slog.Bool("secure_cookies", a.cfg.SecureCookies),
		slog.Any("cookie_names", cookieNames(r)),
		slog.Bool("has_access_cookie", a.hasCookie(r, a.accessCookieName())),
		slog.Bool("has_refresh_cookie", a.hasCookie(r, a.refreshCookieName())),
		slog.Bool("has_csrf_bind_cookie", a.hasCookie(r, a.csrfBindCookieName())),
	}
	base = append(base, attrs...)
	a.log.LogAttrs(r.Context(), slog.LevelInfo, "auth_debug", base...)
}

func (a *App) csrfFailureReason(r *http.Request) string {
	header := strings.TrimSpace(r.Header.Get("X-CSRF-Token"))
	if header == "" {
		return "missing_csrf_header"
	}
	want := a.hashOpaque("csrf", header)
	if sess := a.currentSession(r); sess != nil {
		if hmacEqual(want, sess.CSRFHash) {
			return "ok_session"
		}
		return "csrf_mismatch_session"
	}
	if cookie, err := r.Cookie(a.refreshCookieName()); err == nil && cookie.Value != "" {
		if sess, err := a.store.SessionByRefreshHash(r.Context(), a.hashOpaque("refresh", cookie.Value)); err == nil {
			if refreshSessionAlive(sess) {
				if hmacEqual(want, sess.CSRFHash) {
					return "ok_refresh_session"
				}
				return "csrf_mismatch_refresh_session"
			}
			if sess.Revoked {
				return "refresh_session_revoked_fallback_bind"
			}
			return "refresh_session_expired_fallback_bind"
		}
		return "refresh_session_lookup_failed"
	}
	cookie, err := r.Cookie(a.csrfBindCookieName())
	if err != nil || cookie.Value == "" {
		return "missing_csrf_bind_cookie"
	}
	ch, err := a.store.CSRFByID(r.Context(), cookie.Value)
	if err != nil {
		return "csrf_bind_lookup_failed"
	}
	if time.Now().UTC().After(ch.ExpiresAt) {
		return "csrf_bind_expired"
	}
	if hmacEqual(want, ch.Hash) {
		return "ok_csrf_bind"
	}
	return "csrf_mismatch_bind"
}

func (a *App) sessionDebugState(r *http.Request) string {
	cookie, err := r.Cookie(a.accessCookieName())
	if err != nil || cookie.Value == "" {
		return "no_access_cookie"
	}
	claims, err := a.parseAccess(cookie.Value)
	if err != nil {
		return "access_jwt_invalid"
	}
	sess, err := a.store.SessionByID(r.Context(), claims.SID)
	if err != nil {
		return "session_not_found"
	}
	if sess.Revoked {
		return "session_revoked"
	}
	if sess.UserID != claims.Subject {
		return "session_user_mismatch"
	}
	now := time.Now().UTC()
	if now.After(sess.ExpiresAt) || now.After(sess.AbsoluteExpiresAt) {
		return "session_expired"
	}
	user, err := a.store.UserByID(r.Context(), sess.UserID)
	if err != nil {
		return "user_not_found"
	}
	if user.Status == statusDisabled {
		return "user_disabled"
	}
	if user.Status != statusVerified {
		return "user_not_verified"
	}
	return "ok"
}
