package main

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"
)

var (
	errDuplicateEmail    = errors.New("duplicate email")
	errDuplicateUsername = errors.New("duplicate username")
	errNotFound          = errors.New("not found")
)

const (
	statusPending    = "pending"
	statusVerified   = "verified"
	statusDisabled   = "disabled"
	roleUser         = "user"
	roleAdmin        = "admin"
	otpEmailVerify   = "email_verify"
	otpPasswordReset = "password_reset"
	refreshRolling   = 30 * 24 * time.Hour
	refreshAbsolute  = 90 * 24 * time.Hour
	accessTTL        = 15 * time.Minute
	otpTTL           = 10 * time.Minute
	otpMaxAttempts   = 5
	maxAvatarBytes   = 5 << 20
	maxAvatarEdge    = 2048
)

type User struct {
	ID                 string     `bson:"_id"`
	Email              string     `bson:"email"`
	EmailNormalized    string     `bson:"email_normalized"`
	Username           string     `bson:"username"`
	UsernameNormalized string     `bson:"username_normalized"`
	PasswordHash       string     `bson:"password_hash"`
	Role               string     `bson:"role"`
	Status             string     `bson:"status"`
	EmailVerified      bool       `bson:"email_verified"`
	DisplayName        string     `bson:"display_name"`
	Phone              string     `bson:"phone"`
	AvatarKey          string     `bson:"avatar_key,omitempty"`
	AvatarContentType  string     `bson:"avatar_content_type,omitempty"`
	AvatarBytes        int64      `bson:"avatar_bytes,omitempty"`
	AvatarFilename     string     `bson:"avatar_filename,omitempty"`
	AvatarUpdatedAt    *time.Time `bson:"avatar_updated_at,omitempty"`
	CreatedAt          time.Time  `bson:"created_at"`
	UpdatedAt          time.Time  `bson:"updated_at"`
	DisabledAt         *time.Time `bson:"disabled_at,omitempty"`
}

func (u *User) clone() *User {
	if u == nil {
		return nil
	}
	cp := *u
	if u.DisabledAt != nil {
		t := *u.DisabledAt
		cp.DisabledAt = &t
	}
	if u.AvatarUpdatedAt != nil {
		t := *u.AvatarUpdatedAt
		cp.AvatarUpdatedAt = &t
	}
	return &cp
}

type Session struct {
	SessionID           string    `bson:"session_id"`
	FamilyID            string    `bson:"family_id"`
	UserID              string    `bson:"user_id"`
	RefreshTokenHash    string    `bson:"refresh_token_hash"`
	ReplacedBySessionID string    `bson:"replaced_by_session_id,omitempty"`
	Revoked             bool      `bson:"revoked"`
	RevokeReason        string    `bson:"revoke_reason,omitempty"`
	CSRFHash            string    `bson:"csrf_hash"`
	CSRF                string    `bson:"-"`
	ExpiresAt           time.Time `bson:"expires_at"`
	AbsoluteExpiresAt   time.Time `bson:"absolute_expires_at"`
	FamilyCreatedAt     time.Time `bson:"family_created_at"`
	CreatedAt           time.Time `bson:"created_at"`
	LastUsedAt          time.Time `bson:"last_used_at"`
}

func (s *Session) clone() *Session {
	if s == nil {
		return nil
	}
	cp := *s
	return &cp
}

type OTPRecord struct {
	ID              string     `bson:"_id"`
	Purpose         string     `bson:"purpose"`
	EmailNormalized string     `bson:"email_normalized"`
	UserID          string     `bson:"user_id"`
	OTPHash         string     `bson:"otp_hash"`
	Attempts        int        `bson:"attempts"`
	ExpiresAt       time.Time  `bson:"expires_at"`
	ConsumedAt      *time.Time `bson:"consumed_at,omitempty"`
	CreatedAt       time.Time  `bson:"created_at"`
}

func (o *OTPRecord) clone() *OTPRecord {
	if o == nil {
		return nil
	}
	cp := *o
	if o.ConsumedAt != nil {
		t := *o.ConsumedAt
		cp.ConsumedAt = &t
	}
	return &cp
}

type CSRFChallenge struct {
	ID        string    `bson:"_id"`
	Hash      string    `bson:"hash"`
	ExpiresAt time.Time `bson:"expires_at"`
}

func (c *CSRFChallenge) clone() *CSRFChallenge {
	if c == nil {
		return nil
	}
	cp := *c
	return &cp
}

type DataStore interface {
	ApplySafeMigrations(ctx context.Context, log *slog.Logger, appEnv string) error
	ApplyDestructiveMigrations(ctx context.Context, log *slog.Logger, appEnv, confirmBackup string) error
	MigrationStatus(ctx context.Context) ([]schemaMigrationRecord, error)
	Close(ctx context.Context) error
	InsertUser(ctx context.Context, user *User) error
	UpdateUser(ctx context.Context, user *User) error
	UserByID(ctx context.Context, id string) (*User, error)
	UserByEmail(ctx context.Context, emailNorm string) (*User, error)
	UserByUsername(ctx context.Context, usernameNorm string) (*User, error)
	CountAdmins(ctx context.Context) (int64, error)
	InsertSession(ctx context.Context, sess *Session) error
	UpdateSession(ctx context.Context, sess *Session) error
	SessionByID(ctx context.Context, id string) (*Session, error)
	SessionByRefreshHash(ctx context.Context, hash string) (*Session, error)
	RevokeFamily(ctx context.Context, familyID, reason string) error
	RevokeUserSessions(ctx context.Context, userID, reason string) error
	InsertOTP(ctx context.Context, otp *OTPRecord) error
	LatestOTP(ctx context.Context, purpose, emailNorm string) (*OTPRecord, error)
	UpdateOTP(ctx context.Context, otp *OTPRecord) error
	InvalidateOTPs(ctx context.Context, purpose, emailNorm string) error
	InsertCSRF(ctx context.Context, challenge *CSRFChallenge) error
	CSRFByID(ctx context.Context, id string) (*CSRFChallenge, error)
	UpsertEntitlement(ctx context.Context, ent *Entitlement) error
	EntitlementsByUser(ctx context.Context, userID string) ([]*Entitlement, error)
	InsertAPIKey(ctx context.Context, key *APIKeyRecord) error
	UpdateAPIKey(ctx context.Context, key *APIKeyRecord) error
	APIKeyByID(ctx context.Context, id string) (*APIKeyRecord, error)
	APIKeyByHash(ctx context.Context, hash string) (*APIKeyRecord, error)
	APIKeysByUser(ctx context.Context, userID string) ([]*APIKeyRecord, error)
}

type memoryStore struct {
	mu           sync.Mutex
	users        map[string]*User
	email        map[string]string
	username     map[string]string
	sessions     map[string]*Session
	refresh      map[string]string
	otps         map[string]*OTPRecord
	csrf         map[string]*CSRFChallenge
	entitlements map[string]*Entitlement
	apiKeys      map[string]*APIKeyRecord
	apiKeyHash   map[string]string
}

func newMemoryStore() *memoryStore {
	return &memoryStore{
		users:    map[string]*User{},
		email:    map[string]string{},
		username: map[string]string{},
		sessions: map[string]*Session{},
		refresh:  map[string]string{},
		otps:         map[string]*OTPRecord{},
		csrf:         map[string]*CSRFChallenge{},
		entitlements: map[string]*Entitlement{},
		apiKeys:      map[string]*APIKeyRecord{},
		apiKeyHash:   map[string]string{},
	}
}

func (s *memoryStore) Close(context.Context) error { return nil }

func (s *memoryStore) InsertUser(_ context.Context, user *User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.email[user.EmailNormalized]; ok {
		return errDuplicateEmail
	}
	if _, ok := s.username[user.UsernameNormalized]; ok {
		return errDuplicateUsername
	}
	s.users[user.ID] = user.clone()
	s.email[user.EmailNormalized] = user.ID
	s.username[user.UsernameNormalized] = user.ID
	return nil
}

func (s *memoryStore) UpdateUser(_ context.Context, user *User) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	old, ok := s.users[user.ID]
	if !ok {
		return errNotFound
	}
	if old.EmailNormalized != user.EmailNormalized {
		if _, taken := s.email[user.EmailNormalized]; taken {
			return errDuplicateEmail
		}
		delete(s.email, old.EmailNormalized)
		s.email[user.EmailNormalized] = user.ID
	}
	if old.UsernameNormalized != user.UsernameNormalized {
		if _, taken := s.username[user.UsernameNormalized]; taken {
			return errDuplicateUsername
		}
		delete(s.username, old.UsernameNormalized)
		s.username[user.UsernameNormalized] = user.ID
	}
	s.users[user.ID] = user.clone()
	return nil
}

func (s *memoryStore) UserByID(_ context.Context, id string) (*User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	user, ok := s.users[id]
	if !ok {
		return nil, errNotFound
	}
	return user.clone(), nil
}

func (s *memoryStore) UserByEmail(_ context.Context, emailNorm string) (*User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.email[emailNorm]
	if !ok {
		return nil, errNotFound
	}
	return s.users[id].clone(), nil
}

func (s *memoryStore) UserByUsername(_ context.Context, usernameNorm string) (*User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.username[usernameNorm]
	if !ok {
		return nil, errNotFound
	}
	return s.users[id].clone(), nil
}

func (s *memoryStore) CountAdmins(context.Context) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var n int64
	for _, user := range s.users {
		if user.Role == roleAdmin {
			n++
		}
	}
	return n, nil
}

func (s *memoryStore) InsertSession(_ context.Context, sess *Session) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := sess.clone()
	s.sessions[sess.SessionID] = cp
	s.refresh[sess.RefreshTokenHash] = sess.SessionID
	return nil
}

func (s *memoryStore) UpdateSession(_ context.Context, sess *Session) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	old, ok := s.sessions[sess.SessionID]
	if !ok {
		return errNotFound
	}
	if old.RefreshTokenHash != sess.RefreshTokenHash {
		delete(s.refresh, old.RefreshTokenHash)
		s.refresh[sess.RefreshTokenHash] = sess.SessionID
	}
	s.sessions[sess.SessionID] = sess.clone()
	return nil
}

func (s *memoryStore) SessionByID(_ context.Context, id string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[id]
	if !ok {
		return nil, errNotFound
	}
	return sess.clone(), nil
}

func (s *memoryStore) SessionByRefreshHash(_ context.Context, hash string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.refresh[hash]
	if !ok {
		return nil, errNotFound
	}
	return s.sessions[id].clone(), nil
}

func (s *memoryStore) RevokeFamily(_ context.Context, familyID, reason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, sess := range s.sessions {
		if sess.FamilyID == familyID && !sess.Revoked {
			sess.Revoked = true
			sess.RevokeReason = reason
		}
	}
	return nil
}

func (s *memoryStore) RevokeUserSessions(_ context.Context, userID, reason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, sess := range s.sessions {
		if sess.UserID == userID && !sess.Revoked {
			sess.Revoked = true
			sess.RevokeReason = reason
		}
	}
	return nil
}

func (s *memoryStore) InsertOTP(_ context.Context, otp *OTPRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.otps[otp.ID] = otp.clone()
	return nil
}

func (s *memoryStore) LatestOTP(_ context.Context, purpose, emailNorm string) (*OTPRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var latest *OTPRecord
	for _, otp := range s.otps {
		if otp.Purpose != purpose || otp.EmailNormalized != emailNorm || otp.ConsumedAt != nil {
			continue
		}
		if latest == nil || otp.CreatedAt.After(latest.CreatedAt) {
			latest = otp
		}
	}
	if latest == nil {
		return nil, errNotFound
	}
	return latest.clone(), nil
}

func (s *memoryStore) UpdateOTP(_ context.Context, otp *OTPRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.otps[otp.ID]; !ok {
		return errNotFound
	}
	s.otps[otp.ID] = otp.clone()
	return nil
}

func (s *memoryStore) InvalidateOTPs(_ context.Context, purpose, emailNorm string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	for _, otp := range s.otps {
		if otp.Purpose == purpose && otp.EmailNormalized == emailNorm && otp.ConsumedAt == nil {
			t := now
			otp.ConsumedAt = &t
		}
	}
	return nil
}

func (s *memoryStore) InsertCSRF(_ context.Context, challenge *CSRFChallenge) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.csrf[challenge.ID] = challenge.clone()
	return nil
}

func (s *memoryStore) CSRFByID(_ context.Context, id string) (*CSRFChallenge, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ch, ok := s.csrf[id]
	if !ok {
		return nil, errNotFound
	}
	return ch.clone(), nil
}

func (s *memoryStore) UpsertEntitlement(_ context.Context, ent *Entitlement) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entitlements[ent.ID] = ent.clone()
	return nil
}

func (s *memoryStore) EntitlementsByUser(_ context.Context, userID string) ([]*Entitlement, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []*Entitlement{}
	for _, ent := range s.entitlements {
		if ent.UserID == userID {
			out = append(out, ent.clone())
		}
	}
	return out, nil
}

func (s *memoryStore) InsertAPIKey(_ context.Context, key *APIKeyRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.apiKeys[key.ID] = key.clone()
	s.apiKeyHash[key.SecretHash] = key.ID
	return nil
}

func (s *memoryStore) UpdateAPIKey(_ context.Context, key *APIKeyRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	old, ok := s.apiKeys[key.ID]
	if !ok {
		return errNotFound
	}
	if old.SecretHash != key.SecretHash {
		delete(s.apiKeyHash, old.SecretHash)
		s.apiKeyHash[key.SecretHash] = key.ID
	}
	s.apiKeys[key.ID] = key.clone()
	return nil
}

func (s *memoryStore) APIKeyByID(_ context.Context, id string) (*APIKeyRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key, ok := s.apiKeys[id]
	if !ok {
		return nil, errNotFound
	}
	return key.clone(), nil
}

func (s *memoryStore) APIKeyByHash(_ context.Context, hash string) (*APIKeyRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.apiKeyHash[hash]
	if !ok {
		return nil, errNotFound
	}
	return s.apiKeys[id].clone(), nil
}

func (s *memoryStore) APIKeysByUser(_ context.Context, userID string) ([]*APIKeyRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []*APIKeyRecord{}
	for _, key := range s.apiKeys {
		if key.UserID == userID {
			out = append(out, key.clone())
		}
	}
	return out, nil
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
