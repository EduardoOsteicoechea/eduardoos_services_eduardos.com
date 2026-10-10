package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func TestSessionCacheGetPutInvalidate(t *testing.T) {
	c := newSessionCache()
	now := time.Now().UTC()
	sess := &Session{
		SessionID:         "sid-1",
		FamilyID:          "fam-1",
		UserID:            "user-1",
		ExpiresAt:         now.Add(time.Hour),
		AbsoluteExpiresAt: now.Add(24 * time.Hour),
	}
	user := &User{ID: "user-1", Status: statusVerified, Email: "a@b.c"}
	c.put(sess, user)

	gotSess, gotUser, ok := c.get("sid-1")
	if !ok || gotSess == nil || gotUser == nil {
		t.Fatal("expected cache hit")
	}
	if gotSess.SessionID != "sid-1" || gotUser.ID != "user-1" {
		t.Fatalf("unexpected entry: %+v %+v", gotSess, gotUser)
	}
	gotSess.Revoked = true
	gotUser.Status = statusDisabled
	againSess, againUser, ok := c.get("sid-1")
	if !ok || againSess.Revoked || againUser.Status != statusVerified {
		t.Fatal("cache must return clones, not shared pointers")
	}

	c.invalidate("sid-1")
	if _, _, ok := c.get("sid-1"); ok {
		t.Fatal("invalidate(sid) should clear entry")
	}
}

func TestSessionCacheInvalidateUser(t *testing.T) {
	c := newSessionCache()
	now := time.Now().UTC()
	c.put(&Session{SessionID: "a", FamilyID: "f1", UserID: "u1", ExpiresAt: now.Add(time.Hour), AbsoluteExpiresAt: now.Add(time.Hour)}, &User{ID: "u1"})
	c.put(&Session{SessionID: "b", FamilyID: "f2", UserID: "u1", ExpiresAt: now.Add(time.Hour), AbsoluteExpiresAt: now.Add(time.Hour)}, &User{ID: "u1"})
	c.put(&Session{SessionID: "c", FamilyID: "f3", UserID: "u2", ExpiresAt: now.Add(time.Hour), AbsoluteExpiresAt: now.Add(time.Hour)}, &User{ID: "u2"})

	c.invalidateUser("u1")
	if _, _, ok := c.get("a"); ok {
		t.Fatal("u1 session a should be cleared")
	}
	if _, _, ok := c.get("b"); ok {
		t.Fatal("u1 session b should be cleared")
	}
	if _, _, ok := c.get("c"); !ok {
		t.Fatal("u2 session should remain")
	}
}

func TestSessionCacheTTLExpiry(t *testing.T) {
	c := newSessionCache()
	now := time.Now().UTC()
	c.put(&Session{SessionID: "sid", FamilyID: "f", UserID: "u", ExpiresAt: now.Add(time.Hour), AbsoluteExpiresAt: now.Add(time.Hour)}, &User{ID: "u"})
	c.mu.Lock()
	c.entries["sid"].expiresAt = time.Now().UTC().Add(-time.Second)
	c.mu.Unlock()
	if _, _, ok := c.get("sid"); ok {
		t.Fatal("expired entry must miss")
	}
}

type countingDataStore struct {
	DataStore
	mu           sync.Mutex
	sessionByID  int
	userByID     int
}

func (s *countingDataStore) SessionByID(ctx context.Context, id string) (*Session, error) {
	s.mu.Lock()
	s.sessionByID++
	s.mu.Unlock()
	return s.DataStore.SessionByID(ctx, id)
}

func (s *countingDataStore) UserByID(ctx context.Context, id string) (*User, error) {
	s.mu.Lock()
	s.userByID++
	s.mu.Unlock()
	return s.DataStore.UserByID(ctx, id)
}

func (s *countingDataStore) counts() (sessions, users int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.sessionByID, s.userByID
}

func TestMeHandlerUsesSessionCache(t *testing.T) {
	base := newMemoryStore()
	counted := &countingDataStore{DataStore: base}
	cfg := config{
		ListenAddr:    "127.0.0.1:8081",
		MongoDatabase: mongoDatabase,
		JWTSecret:     "test-jwt-secret-not-for-production",
		JWTIssuer:     jwtIssuer,
		JWTAudience:   jwtAudience,
		AppEnv:        "production",
		MediaRoot:     t.TempDir(),
	}
	app := newAppWithStore(cfg, counted)
	hash, err := hashPassword("correct-horse-battery")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	user := &User{
		ID: "member-cache-1", Email: "member-cache@eduardoos.com", EmailNormalized: "member-cache@eduardoos.com",
		Username: "membercache", UsernameNormalized: "membercache", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	}
	if err := app.store.InsertUser(context.Background(), user); err != nil {
		t.Fatal(err)
	}
	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, user); err != nil {
		t.Fatal(err)
	}

	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		copyCookies(req, seed)
		rec := httptest.NewRecorder()
		app.Handler().ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("me #%d: %d %s", i+1, rec.Code, rec.Body.String())
		}
	}
	sessions, users := counted.counts()
	if sessions != 1 || users != 1 {
		t.Fatalf("expected one SessionByID and one UserByID within TTL, got sessions=%d users=%d", sessions, users)
	}
}

func TestLogoutInvalidatesSessionCache(t *testing.T) {
	app := newTestApp(true)
	seed := httptest.NewRecorder()
	sess, err := app.issueSession(seed, app.mustUser("member@eduardoos.com"))
	if err != nil {
		t.Fatal(err)
	}
	meReq := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(meReq, seed)
	meRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(meRec, meReq)
	if meRec.Code != http.StatusOK {
		t.Fatalf("warmup me: %d", meRec.Code)
	}
	if _, _, ok := app.sessionCache.get(sess.SessionID); !ok {
		t.Fatal("expected cache populated after /me")
	}

	logoutReq := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	logoutReq.Header.Set("Content-Type", "application/json")
	logoutReq.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	logoutReq.Header.Set("X-CSRF-Token", sess.CSRF)
	copyCookies(logoutReq, seed)
	logoutRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(logoutRec, logoutReq)
	if logoutRec.Code != http.StatusOK {
		t.Fatalf("logout: %d", logoutRec.Code)
	}
	if _, _, ok := app.sessionCache.get(sess.SessionID); ok {
		t.Fatal("logout must invalidate cached session")
	}

	// Reuse the pre-logout access cookie; store is revoked and cache must not authorize.
	again := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(again, seed)
	againRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(againRec, again)
	if againRec.Code != http.StatusUnauthorized {
		t.Fatalf("me after logout must be 401, got %d", againRec.Code)
	}
}

func TestRevokeUserSessionsClearsCache(t *testing.T) {
	app := newTestApp(true)
	seed := httptest.NewRecorder()
	user := app.mustUser("member@eduardoos.com")
	sess, err := app.issueSession(seed, user)
	if err != nil {
		t.Fatal(err)
	}
	meReq := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(meReq, seed)
	meRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(meRec, meReq)
	if meRec.Code != http.StatusOK {
		t.Fatalf("warmup me: %d", meRec.Code)
	}
	if _, _, ok := app.sessionCache.get(sess.SessionID); !ok {
		t.Fatal("expected session cached after /me")
	}
	if err := app.revokeUserSessions(context.Background(), user.ID, "test"); err != nil {
		t.Fatal(err)
	}
	if _, _, ok := app.sessionCache.get(sess.SessionID); ok {
		t.Fatal("revokeUserSessions must clear cache")
	}
	again := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	copyCookies(again, seed)
	againRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(againRec, again)
	if againRec.Code != http.StatusUnauthorized {
		t.Fatalf("me after revoke must be 401, got %d", againRec.Code)
	}
}
