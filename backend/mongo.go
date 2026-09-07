package main

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type mongoStore struct {
	client *mongo.Client
	db     *mongo.Database
}

func newMongoStore(ctx context.Context, cfg config) (*mongoStore, error) {
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(cfg.MongoURI))
	if err != nil {
		return nil, err
	}
	if err := client.Ping(ctx, nil); err != nil {
		_ = client.Disconnect(ctx)
		return nil, err
	}
	return &mongoStore{client: client, db: client.Database(cfg.MongoDatabase)}, nil
}

func (s *mongoStore) users() *mongo.Collection       { return s.db.Collection(colUsers) }
func (s *mongoStore) sessions() *mongo.Collection    { return s.db.Collection(colSessions) }
func (s *mongoStore) emailOTPs() *mongo.Collection   { return s.db.Collection(colEmailOTPs) }
func (s *mongoStore) resetOTPs() *mongo.Collection   { return s.db.Collection(colResetOTPs) }
func (s *mongoStore) csrf() *mongo.Collection        { return s.db.Collection(colCSRF) }
func (s *mongoStore) entitlements() *mongo.Collection {
	return s.db.Collection(colEntitlements)
}
func (s *mongoStore) apiKeys() *mongo.Collection { return s.db.Collection(colAPIKeys) }

func (s *mongoStore) otpCol(purpose string) *mongo.Collection {
	if purpose == otpPasswordReset {
		return s.resetOTPs()
	}
	return s.emailOTPs()
}

func (s *mongoStore) Close(ctx context.Context) error {
	return s.client.Disconnect(ctx)
}

func isDup(err error) bool {
	var we mongo.WriteException
	if errors.As(err, &we) {
		for _, e := range we.WriteErrors {
			if e.Code == 11000 {
				return true
			}
		}
	}
	return mongo.IsDuplicateKeyError(err)
}

func (s *mongoStore) InsertUser(ctx context.Context, user *User) error {
	_, err := s.users().InsertOne(ctx, user)
	if isDup(err) {
		if existing, lookErr := s.UserByEmail(ctx, user.EmailNormalized); lookErr == nil && existing != nil {
			return errDuplicateEmail
		}
		return errDuplicateUsername
	}
	return err
}

func (s *mongoStore) UpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now().UTC()
	res, err := s.users().ReplaceOne(ctx, bson.M{"_id": user.ID}, user)
	if err != nil {
		if isDup(err) {
			return errDuplicateUsername
		}
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoStore) UserByID(ctx context.Context, id string) (*User, error) {
	var user User
	err := s.users().FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *mongoStore) UserByEmail(ctx context.Context, emailNorm string) (*User, error) {
	var user User
	err := s.users().FindOne(ctx, bson.M{"email_normalized": emailNorm}).Decode(&user)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *mongoStore) UserByUsername(ctx context.Context, usernameNorm string) (*User, error) {
	var user User
	err := s.users().FindOne(ctx, bson.M{"username_normalized": usernameNorm}).Decode(&user)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *mongoStore) CountAdmins(ctx context.Context) (int64, error) {
	return s.users().CountDocuments(ctx, bson.M{"role": roleAdmin})
}

func (s *mongoStore) InsertSession(ctx context.Context, sess *Session) error {
	_, err := s.sessions().InsertOne(ctx, sess)
	return err
}

func (s *mongoStore) UpdateSession(ctx context.Context, sess *Session) error {
	res, err := s.sessions().ReplaceOne(ctx, bson.M{"session_id": sess.SessionID}, sess)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoStore) SessionByID(ctx context.Context, id string) (*Session, error) {
	var sess Session
	err := s.sessions().FindOne(ctx, bson.M{"session_id": id}).Decode(&sess)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

func (s *mongoStore) SessionByRefreshHash(ctx context.Context, hash string) (*Session, error) {
	var sess Session
	err := s.sessions().FindOne(ctx, bson.M{"refresh_token_hash": hash}).Decode(&sess)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

func (s *mongoStore) RevokeFamily(ctx context.Context, familyID, reason string) error {
	_, err := s.sessions().UpdateMany(ctx, bson.M{"family_id": familyID, "revoked": false}, bson.M{
		"$set": bson.M{"revoked": true, "revoke_reason": reason},
	})
	return err
}

func (s *mongoStore) RevokeUserSessions(ctx context.Context, userID, reason string) error {
	_, err := s.sessions().UpdateMany(ctx, bson.M{"user_id": userID, "revoked": false}, bson.M{
		"$set": bson.M{"revoked": true, "revoke_reason": reason},
	})
	return err
}

func (s *mongoStore) InsertOTP(ctx context.Context, otp *OTPRecord) error {
	_, err := s.otpCol(otp.Purpose).InsertOne(ctx, otp)
	return err
}

func (s *mongoStore) LatestOTP(ctx context.Context, purpose, emailNorm string) (*OTPRecord, error) {
	opts := options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}})
	var otp OTPRecord
	err := s.otpCol(purpose).FindOne(ctx, bson.M{"email_normalized": emailNorm, "purpose": purpose, "consumed_at": nil}, opts).Decode(&otp)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &otp, nil
}

func (s *mongoStore) UpdateOTP(ctx context.Context, otp *OTPRecord) error {
	res, err := s.otpCol(otp.Purpose).ReplaceOne(ctx, bson.M{"_id": otp.ID}, otp)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoStore) InvalidateOTPs(ctx context.Context, purpose, emailNorm string) error {
	now := time.Now().UTC()
	_, err := s.otpCol(purpose).UpdateMany(ctx, bson.M{
		"email_normalized": emailNorm,
		"purpose":          purpose,
		"consumed_at":      bson.M{"$eq": nil},
	}, bson.M{"$set": bson.M{"consumed_at": now}})
	return err
}

func (s *mongoStore) InsertCSRF(ctx context.Context, challenge *CSRFChallenge) error {
	_, err := s.csrf().InsertOne(ctx, challenge)
	return err
}

func (s *mongoStore) CSRFByID(ctx context.Context, id string) (*CSRFChallenge, error) {
	var ch CSRFChallenge
	err := s.csrf().FindOne(ctx, bson.M{"_id": id}).Decode(&ch)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &ch, nil
}

func (s *mongoStore) UpsertEntitlement(ctx context.Context, ent *Entitlement) error {
	_, err := s.entitlements().ReplaceOne(ctx, bson.M{"_id": ent.ID}, ent, options.Replace().SetUpsert(true))
	return err
}

func (s *mongoStore) EntitlementsByUser(ctx context.Context, userID string) ([]*Entitlement, error) {
	cur, err := s.entitlements().Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*Entitlement
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []*Entitlement{}
	}
	return out, nil
}

func (s *mongoStore) InsertAPIKey(ctx context.Context, key *APIKeyRecord) error {
	_, err := s.apiKeys().InsertOne(ctx, key)
	return err
}

func (s *mongoStore) UpdateAPIKey(ctx context.Context, key *APIKeyRecord) error {
	res, err := s.apiKeys().ReplaceOne(ctx, bson.M{"_id": key.ID}, key)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoStore) APIKeyByID(ctx context.Context, id string) (*APIKeyRecord, error) {
	var key APIKeyRecord
	err := s.apiKeys().FindOne(ctx, bson.M{"_id": id}).Decode(&key)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &key, nil
}

func (s *mongoStore) APIKeyByHash(ctx context.Context, hash string) (*APIKeyRecord, error) {
	var key APIKeyRecord
	err := s.apiKeys().FindOne(ctx, bson.M{"secret_hash": hash}).Decode(&key)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &key, nil
}

func (s *mongoStore) APIKeysByUser(ctx context.Context, userID string) ([]*APIKeyRecord, error) {
	cur, err := s.apiKeys().Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*APIKeyRecord
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []*APIKeyRecord{}
	}
	return out, nil
}
