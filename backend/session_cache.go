package main

import (
	"sync"
	"time"
)

const sessionCacheTTL = 15 * time.Second

type sessionCacheEntry struct {
	sess      *Session
	user      *User
	expiresAt time.Time
}

// sessionCache is a short-TTL in-memory cache of Session+User keyed by session id.
type sessionCache struct {
	mu      sync.RWMutex
	entries map[string]*sessionCacheEntry
}

func newSessionCache() *sessionCache {
	return &sessionCache{entries: make(map[string]*sessionCacheEntry)}
}

func (c *sessionCache) get(sid string) (*Session, *User, bool) {
	if c == nil || sid == "" {
		return nil, nil, false
	}
	now := time.Now().UTC()
	c.mu.RLock()
	e, ok := c.entries[sid]
	if !ok || e == nil || now.After(e.expiresAt) {
		c.mu.RUnlock()
		return nil, nil, false
	}
	sess := e.sess.clone()
	user := e.user.clone()
	c.mu.RUnlock()
	return sess, user, true
}

func (c *sessionCache) put(sess *Session, user *User) {
	if c == nil || sess == nil || sess.SessionID == "" {
		return
	}
	c.mu.Lock()
	c.entries[sess.SessionID] = &sessionCacheEntry{
		sess:      sess.clone(),
		user:      user.clone(),
		expiresAt: time.Now().UTC().Add(sessionCacheTTL),
	}
	c.mu.Unlock()
}

func (c *sessionCache) invalidate(sid string) {
	if c == nil || sid == "" {
		return
	}
	c.mu.Lock()
	delete(c.entries, sid)
	c.mu.Unlock()
}

func (c *sessionCache) invalidateUser(userID string) {
	if c == nil || userID == "" {
		return
	}
	c.mu.Lock()
	for sid, e := range c.entries {
		if e != nil && e.sess != nil && e.sess.UserID == userID {
			delete(c.entries, sid)
		}
		if e != nil && e.user != nil && e.user.ID == userID {
			delete(c.entries, sid)
		}
	}
	c.mu.Unlock()
}

func (c *sessionCache) invalidateFamily(familyID string) {
	if c == nil || familyID == "" {
		return
	}
	c.mu.Lock()
	for sid, e := range c.entries {
		if e != nil && e.sess != nil && e.sess.FamilyID == familyID {
			delete(c.entries, sid)
		}
	}
	c.mu.Unlock()
}

func sessionCacheAlive(sess *Session, subject string) bool {
	if sess == nil || sess.Revoked || sess.UserID != subject {
		return false
	}
	now := time.Now().UTC()
	if now.After(sess.ExpiresAt) || now.After(sess.AbsoluteExpiresAt) {
		return false
	}
	return true
}
