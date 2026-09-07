package main

import (
	"sync"
	"time"
)

type User struct {
	ID            string
	Email         string
	PasswordHash  string
	Role          string
	EmailVerified bool
}

type Session struct {
	ID        string
	UserID    string
	CSRF      string
	ExpiresAt time.Time
	Revoked   bool
}

type AuditEvent struct {
	ID        string
	Kind      string
	UserID    string
	Provider  string
	Status    string
	PromptLen int
	CreatedAt time.Time
}

type userStore struct {
	mu    sync.RWMutex
	byID  map[string]*User
	email map[string]string
}

func newUserStore() *userStore {
	return &userStore{byID: map[string]*User{}, email: map[string]string{}}
}

func (s *userStore) put(user *User) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.byID[user.ID] = user
	s.email[stringsToLower(user.Email)] = user.ID
}

func (s *userStore) byEmail(email string) *User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, ok := s.email[stringsToLower(email)]
	if !ok {
		return nil
	}
	return s.byID[id]
}

func (s *userStore) get(id string) *User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.byID[id]
}

type sessionStore struct {
	mu   sync.RWMutex
	byID map[string]*Session
}

func newSessionStore() *sessionStore {
	return &sessionStore{byID: map[string]*Session{}}
}

func (s *sessionStore) put(sess *Session) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.byID[sess.ID] = sess
}

func (s *sessionStore) get(id string) *Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.byID[id]
}

func (s *sessionStore) revoke(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if sess, ok := s.byID[id]; ok {
		sess.Revoked = true
	}
}

type auditStore struct {
	mu     sync.Mutex
	events []AuditEvent
}

func newAuditStore() *auditStore {
	return &auditStore{}
}

func (s *auditStore) add(event AuditEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, event)
}

func (s *auditStore) all() []AuditEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]AuditEvent, len(s.events))
	copy(out, s.events)
	return out
}

type limiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	window time.Duration
	max    int
}

func newLimiter(window time.Duration, max int) *limiter {
	return &limiter{hits: map[string][]time.Time{}, window: window, max: max}
}

func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	cut := now.Add(-l.window)
	kept := l.hits[key][:0]
	for _, ts := range l.hits[key] {
		if ts.After(cut) {
			kept = append(kept, ts)
		}
	}
	if len(kept) >= l.max {
		l.hits[key] = kept
		return false
	}
	l.hits[key] = append(kept, now)
	return true
}

func stringsToLower(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		b[i] = c
	}
	return string(b)
}
