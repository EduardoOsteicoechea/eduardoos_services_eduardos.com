package main

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	colEpams       = "epams"
	colEpamFooters = "epam_footers"
)

// PamphletStore persists epam metadata + footer profiles; bodies live on disk.
type PamphletStore interface {
	SaveEpam(ctx context.Context, rec EpamRecord, correlationID string) (EpamRecord, error)
	GetEpam(ctx context.Context, userID, epamID, correlationID string) (EpamRecord, bool, error)
	ListEpams(ctx context.Context, userID, correlationID string) ([]EpamRecord, error)
	DeleteEpam(ctx context.Context, userID, epamID, correlationID string) error

	SaveFooter(ctx context.Context, rec FooterProfile, correlationID string) (FooterProfile, error)
	GetFooter(ctx context.Context, userID, footerID, correlationID string) (FooterProfile, bool, error)
	ListFooters(ctx context.Context, userID, correlationID string) ([]FooterProfile, error)
	DeleteFooter(ctx context.Context, userID, footerID, correlationID string) error
}

func openPamphletStore(store DataStore, mediaRoot string) PamphletStore {
	if ms, ok := store.(*mongoStore); ok && ms != nil && ms.db != nil {
		return &mongoPamphletStore{db: ms.db, mediaRoot: mediaRoot}
	}
	return newMemoryPamphletStore(mediaRoot)
}

type memoryPamphletStore struct {
	mu        sync.RWMutex
	mediaRoot string
	epams     map[string]EpamRecord     // userID:epamID
	footers   map[string]FooterProfile  // userID:footerID
}

func newMemoryPamphletStore(mediaRoot string) *memoryPamphletStore {
	return &memoryPamphletStore{
		mediaRoot: mediaRoot,
		epams:     map[string]EpamRecord{},
		footers:   map[string]FooterProfile{},
	}
}

func (s *memoryPamphletStore) SaveEpam(_ context.Context, rec EpamRecord, correlationID string) (EpamRecord, error) {
	now := pamphletNow()
	if rec.EpamID == "" {
		rec.EpamID = randomID(16)
	}
	if rec.CreatedAt == "" {
		rec.CreatedAt = now
	}
	rec.UpdatedAt = now
	rec.LastCorrelationID = correlationID
	if rec.BodyPath == "" {
		rec.BodyPath = pamphletBodyRelPath(rec.UserID, rec.EpamID)
	}
	rec.S3Key = rec.BodyPath
	body := rec.Body
	if body != nil {
		if err := writePamphletBody(s.mediaRoot, rec.BodyPath, body); err != nil {
			return EpamRecord{}, err
		}
		raw, _ := json.Marshal(body)
		rec.ContentSizeBytes = int64(len(raw))
	}
	meta := rec
	meta.Body = nil
	s.mu.Lock()
	s.epams[epamDocID(rec.UserID, rec.EpamID)] = meta
	s.mu.Unlock()
	rec.Body = body
	return rec, nil
}

func (s *memoryPamphletStore) GetEpam(_ context.Context, userID, epamID, _ string) (EpamRecord, bool, error) {
	s.mu.RLock()
	rec, ok := s.epams[epamDocID(userID, epamID)]
	s.mu.RUnlock()
	if !ok {
		return EpamRecord{}, false, nil
	}
	path := rec.BodyPath
	if path == "" {
		path = pamphletBodyRelPath(userID, epamID)
	}
	body, err := readPamphletBody(s.mediaRoot, path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return EpamRecord{}, false, nil
		}
		return EpamRecord{}, false, err
	}
	rec.Body = body
	rec.BodyPath = path
	rec.S3Key = path
	return rec, true, nil
}

func (s *memoryPamphletStore) ListEpams(_ context.Context, userID, _ string) ([]EpamRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EpamRecord, 0)
	for _, rec := range s.epams {
		if rec.UserID == userID {
			cp := rec
			cp.Body = nil
			out = append(out, cp)
		}
	}
	return out, nil
}

func (s *memoryPamphletStore) DeleteEpam(_ context.Context, userID, epamID, _ string) error {
	s.mu.Lock()
	rec, ok := s.epams[epamDocID(userID, epamID)]
	if ok {
		delete(s.epams, epamDocID(userID, epamID))
	}
	s.mu.Unlock()
	src := rec.BodyPath
	if src == "" {
		src = pamphletBodyRelPath(userID, epamID)
	}
	_ = recyclePamphletBody(s.mediaRoot, src, pamphletRecycleRelPath(userID, epamID))
	return nil
}

func (s *memoryPamphletStore) SaveFooter(_ context.Context, rec FooterProfile, _ string) (FooterProfile, error) {
	now := pamphletNow()
	if rec.FooterID == "" {
		rec.FooterID = randomID(16)
	}
	if rec.CreatedAt == "" {
		rec.CreatedAt = now
	}
	rec.UpdatedAt = now
	rec.Footer = normalizeFooterFields(rec.Footer)
	s.mu.Lock()
	s.footers[footerDocID(rec.UserID, rec.FooterID)] = rec
	s.mu.Unlock()
	return rec, nil
}

func (s *memoryPamphletStore) GetFooter(_ context.Context, userID, footerID, _ string) (FooterProfile, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.footers[footerDocID(userID, footerID)]
	return rec, ok, nil
}

func (s *memoryPamphletStore) ListFooters(_ context.Context, userID, _ string) ([]FooterProfile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]FooterProfile, 0)
	for _, rec := range s.footers {
		if rec.UserID == userID {
			out = append(out, rec)
		}
	}
	return out, nil
}

func (s *memoryPamphletStore) DeleteFooter(_ context.Context, userID, footerID, _ string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.footers, footerDocID(userID, footerID))
	return nil
}

type mongoPamphletStore struct {
	db        *mongo.Database
	mediaRoot string
}

func (s *mongoPamphletStore) epams() *mongo.Collection {
	return s.db.Collection(colEpams)
}
func (s *mongoPamphletStore) footers() *mongo.Collection {
	return s.db.Collection(colEpamFooters)
}

func (s *mongoPamphletStore) SaveEpam(ctx context.Context, rec EpamRecord, correlationID string) (EpamRecord, error) {
	now := pamphletNow()
	if rec.EpamID == "" {
		rec.EpamID = randomID(16)
	}
	if rec.CreatedAt == "" {
		rec.CreatedAt = now
	}
	rec.UpdatedAt = now
	rec.LastCorrelationID = correlationID
	if rec.BodyPath == "" {
		rec.BodyPath = pamphletBodyRelPath(rec.UserID, rec.EpamID)
	}
	rec.S3Key = rec.BodyPath
	body := rec.Body
	if body != nil {
		if err := writePamphletBody(s.mediaRoot, rec.BodyPath, body); err != nil {
			return EpamRecord{}, err
		}
		raw, _ := json.Marshal(body)
		rec.ContentSizeBytes = int64(len(raw))
	}
	doc := rec.toDoc()
	_, err := s.epams().ReplaceOne(ctx, bson.M{"_id": doc.ID}, doc, options.Replace().SetUpsert(true))
	if err != nil {
		return EpamRecord{}, err
	}
	rec.Body = body
	return rec, nil
}

func (s *mongoPamphletStore) GetEpam(ctx context.Context, userID, epamID, _ string) (EpamRecord, bool, error) {
	var doc epamMetaDoc
	err := s.epams().FindOne(ctx, bson.M{"_id": epamDocID(userID, epamID)}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return EpamRecord{}, false, nil
	}
	if err != nil {
		return EpamRecord{}, false, err
	}
	rec := doc.toRecord()
	path := rec.BodyPath
	if path == "" {
		path = pamphletBodyRelPath(userID, epamID)
	}
	body, err := readPamphletBody(s.mediaRoot, path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return EpamRecord{}, false, nil
		}
		return EpamRecord{}, false, err
	}
	rec.Body = body
	rec.BodyPath = path
	rec.S3Key = path
	return rec, true, nil
}

func (s *mongoPamphletStore) ListEpams(ctx context.Context, userID, _ string) ([]EpamRecord, error) {
	cur, err := s.epams().Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]EpamRecord, 0)
	for cur.Next(ctx) {
		var doc epamMetaDoc
		if err := cur.Decode(&doc); err != nil {
			return nil, err
		}
		out = append(out, doc.toRecord())
	}
	return out, cur.Err()
}

func (s *mongoPamphletStore) DeleteEpam(ctx context.Context, userID, epamID, _ string) error {
	var doc epamMetaDoc
	_ = s.epams().FindOne(ctx, bson.M{"_id": epamDocID(userID, epamID)}).Decode(&doc)
	src := doc.BodyPath
	if src == "" {
		src = pamphletBodyRelPath(userID, epamID)
	}
	_ = recyclePamphletBody(s.mediaRoot, src, pamphletRecycleRelPath(userID, epamID))
	_, err := s.epams().DeleteOne(ctx, bson.M{"_id": epamDocID(userID, epamID)})
	return err
}

func (s *mongoPamphletStore) SaveFooter(ctx context.Context, rec FooterProfile, _ string) (FooterProfile, error) {
	now := pamphletNow()
	if rec.FooterID == "" {
		rec.FooterID = randomID(16)
	}
	if rec.CreatedAt == "" {
		rec.CreatedAt = now
	}
	rec.UpdatedAt = now
	rec.Footer = normalizeFooterFields(rec.Footer)
	doc := rec.toDoc()
	_, err := s.footers().ReplaceOne(ctx, bson.M{"_id": doc.ID}, doc, options.Replace().SetUpsert(true))
	return rec, err
}

func (s *mongoPamphletStore) GetFooter(ctx context.Context, userID, footerID, _ string) (FooterProfile, bool, error) {
	var doc footerDoc
	err := s.footers().FindOne(ctx, bson.M{"_id": footerDocID(userID, footerID)}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return FooterProfile{}, false, nil
	}
	if err != nil {
		return FooterProfile{}, false, err
	}
	return doc.toProfile(), true, nil
}

func (s *mongoPamphletStore) ListFooters(ctx context.Context, userID, _ string) ([]FooterProfile, error) {
	cur, err := s.footers().Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]FooterProfile, 0)
	for cur.Next(ctx) {
		var doc footerDoc
		if err := cur.Decode(&doc); err != nil {
			return nil, err
		}
		out = append(out, doc.toProfile())
	}
	return out, cur.Err()
}

func (s *mongoPamphletStore) DeleteFooter(ctx context.Context, userID, footerID, _ string) error {
	_, err := s.footers().DeleteOne(ctx, bson.M{"_id": footerDocID(userID, footerID)})
	return err
}

func writePamphletBody(mediaRoot, rel string, body map[string]any) error {
	raw, err := json.Marshal(body)
	if err != nil {
		return err
	}
	abs := filepath.Join(mediaRoot, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(abs), 0750); err != nil {
		return err
	}
	tmp := abs + ".tmp"
	if err := os.WriteFile(tmp, raw, 0640); err != nil {
		return err
	}
	return os.Rename(tmp, abs)
}

func readPamphletBody(mediaRoot, rel string) (map[string]any, error) {
	abs := filepath.Join(mediaRoot, filepath.FromSlash(rel))
	raw, err := os.ReadFile(abs)
	if err != nil {
		return nil, err
	}
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		return nil, err
	}
	return body, nil
}

func recyclePamphletBody(mediaRoot, srcRel, dstRel string) error {
	src := filepath.Join(mediaRoot, filepath.FromSlash(srcRel))
	dst := filepath.Join(mediaRoot, filepath.FromSlash(dstRel))
	raw, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0750); err != nil {
		return err
	}
	if err := os.WriteFile(dst, raw, 0640); err != nil {
		return err
	}
	_ = os.Remove(src)
	return nil
}
