package main

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestRefreshRotationGraceAcceptsPriorToken(t *testing.T) {
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

	grace := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{}`))
	grace.Header.Set("Content-Type", "application/json")
	grace.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	grace.Header.Set("X-CSRF-Token", csrf)
	grace.AddCookie(&http.Cookie{Name: app.refreshCookieName(), Value: firstRefresh})
	copyCookies(grace, seed)
	graceRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(graceRec, grace)
	if graceRec.Code != http.StatusOK {
		t.Fatalf("grace refresh must succeed: %d %s", graceRec.Code, graceRec.Body.String())
	}
	if cookieNamed(graceRec, app.refreshCookieName()) == nil {
		t.Fatal("grace refresh must set a new refresh cookie")
	}
}

func TestRefreshPostGraceReuseRevokesFamily(t *testing.T) {
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
		t.Fatalf("refresh: %d", rotated.Code)
	}

	oldHash := app.hashOpaque("refresh", firstRefresh)
	oldSess, err := app.store.SessionByRefreshHash(context.Background(), oldHash)
	if err != nil {
		t.Fatal(err)
	}
	oldSess.UpdatedAt = time.Now().UTC().Add(-(refreshRotationGrace + time.Second))
	if err := app.store.UpdateSession(context.Background(), oldSess); err != nil {
		t.Fatal(err)
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
		t.Fatalf("post-grace reuse: %d %s", reuseRec.Code, reuseRec.Body.String())
	}

	alive := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{}`))
	alive.Header.Set("Content-Type", "application/json")
	alive.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	alive.Header.Set("X-CSRF-Token", csrf)
	copyCookies(alive, rotated)
	aliveRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(aliveRec, alive)
	if aliveRec.Code != http.StatusUnauthorized {
		t.Fatalf("family must die after reuse, got %d", aliveRec.Code)
	}
}

func TestConcurrentRefreshCAS(t *testing.T) {
	app := newTestApp(true)
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	csrf := app.issueCSRF(t, seed)

	const n = 8
	var wg sync.WaitGroup
	var okCount atomic.Int32
	var codes [n]int
	recs := make([]*httptest.ResponseRecorder, n)
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func(i int) {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{}`))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
			req.Header.Set("X-CSRF-Token", csrf)
			copyCookies(req, seed)
			rec := httptest.NewRecorder()
			app.Handler().ServeHTTP(rec, req)
			recs[i] = rec
			codes[i] = rec.Code
			if rec.Code == http.StatusOK {
				okCount.Add(1)
			}
		}(i)
	}
	wg.Wait()

	if okCount.Load() < 1 {
		t.Fatalf("expected at least one successful refresh, codes=%v", codes)
	}
	// Concurrent losers must not revokeFamily("reuse"). Prefer the newest OK cookie
	// (last writer wins on Set-Cookie), then fall back through earlier OK cookies via grace.
	var followOK bool
	for i := n - 1; i >= 0; i-- {
		rec := recs[i]
		if rec == nil || rec.Code != http.StatusOK {
			continue
		}
		follow := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{}`))
		follow.Header.Set("Content-Type", "application/json")
		follow.Header.Set("Origin", app.cfg.AllowedOrigins[0])
		follow.Header.Set("X-CSRF-Token", csrf)
		copyCookies(follow, rec)
		followRec := httptest.NewRecorder()
		app.Handler().ServeHTTP(followRec, follow)
		if followRec.Code == http.StatusOK {
			followOK = true
			break
		}
	}
	if !followOK {
		t.Fatalf("family must remain usable after concurrent refresh, codes=%v", codes)
	}
}

func TestCSRFFailureReasonRefreshReuseProbeAlignsWithValidCSRF(t *testing.T) {
	app := newTestApp(true)
	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser("member@eduardoos.com"))
	if err != nil {
		t.Fatal(err)
	}
	refreshVal := cookieNamed(seed, app.refreshCookieName()).Value

	// Rotate so the presented refresh hash is revoked-with-rotation.
	rot := httptest.NewRecorder()
	user := app.mustUser("member@eduardoos.com")
	if _, err := app.rotateSession(rot, sess, user); err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString(`{}`))
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", sess.CSRF)
	req.AddCookie(&http.Cookie{Name: app.refreshCookieName(), Value: refreshVal})

	if !app.validCSRF(req) {
		t.Fatal("validCSRF must accept matching CSRF on revoked refresh for /api/auth/refresh")
	}
	reason := app.csrfFailureReason(req)
	if reason != "ok_refresh_reuse_probe" {
		t.Fatalf("csrfFailureReason=%q want ok_refresh_reuse_probe", reason)
	}
}
