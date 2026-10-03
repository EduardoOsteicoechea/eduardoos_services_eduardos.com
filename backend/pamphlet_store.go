package main

import (
	"context"
	"encoding/json"
	"errors"
	"sync"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	colEpams        = "epams"
	colEpamBodies   = "epam_bodies"
	colEpamFooters  = "epam_footers"
	colEpamSeries   = "epam_series"
	colEpamAuthors  = "epam_authors"
)

// PamphletStore persists pamphlet metadata, bodies, and footer profiles in MongoDB.
type PamphletStore interface {
	SaveEpam(ctx context.Context, rec EpamRecord, correlationID string) (EpamRecord, error)
	GetEpam(ctx context.Context, userID, epamID, correlationID string) (EpamRecord, bool, error)
	ListEpams(ctx context.Context, userID, correlationID string) ([]EpamRecord, error)
	DeleteEpam(ctx context.Context, userID, epamID, correlationID string) error

	SaveFooter(ctx context.Context, rec FooterProfile, correlationID string) (FooterProfile, error)
	GetFooter(ctx context.Context, userID, footerID, correlationID string) (FooterProfile, bool, error)
	ListFooters(ctx context.Context, userID, correlationID string) ([]FooterProfile, error)
	DeleteFooter(ctx context.Context, userID, footerID, correlationID string) error

	SaveSeries(ctx context.Context, rec EpamSeriesProfile, correlationID string) (EpamSeriesProfile, error)
	GetSeries(ctx context.Context, userID, seriesID, correlationID string) (EpamSeriesProfile, bool, error)
	ListSeries(ctx context.Context, userID, correlationID string) ([]EpamSeriesProfile, error)
	DeleteSeries(ctx context.Context, userID, seriesID, correlationID string) error

	SaveAuthor(ctx context.Context, rec EpamAuthorProfile, correlationID string) (EpamAuthorProfile, error)
	GetAuthor(ctx context.Context, userID, authorID, correlationID string) (EpamAuthorProfile, bool, error)
	ListAuthors(ctx context.Context, userID, correlationID string) ([]EpamAuthorProfile, error)
	DeleteAuthor(ctx context.Context, userID, authorID, correlationID string) error
}

func openPamphletStore(store DataStore, _ string) PamphletStore {
	if ms, ok := store.(*mongoStore); ok && ms != nil && ms.db != nil {
		return &mongoPamphletStore{db: ms.db}
	}
	return newMemoryPamphletStore()
}

type memoryPamphletStore struct {
	mu      sync.RWMutex
	epams   map[string]EpamRecord        // userID:epamID
	bodies  map[string]map[string]any    // userID:epamID
	footers map[string]FooterProfile     // userID:footerID
	series  map[string]EpamSeriesProfile // userID:seriesID
	authors map[string]EpamAuthorProfile // userID:authorID
}

func newMemoryPamphletStore() *memoryPamphletStore {
	return &memoryPamphletStore{
		epams:   map[string]EpamRecord{},
		bodies:  map[string]map[string]any{},
		footers: map[string]FooterProfile{},
		series:  map[string]EpamSeriesProfile{},
		authors: map[string]EpamAuthorProfile{},
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
	if rec.Body != nil {
		raw, _ := json.Marshal(rec.Body)
		rec.ContentSizeBytes = int64(len(raw))
	}
	meta := rec
	meta.Body = nil
	s.mu.Lock()
	s.epams[epamDocID(rec.UserID, rec.EpamID)] = meta
	if rec.Body != nil {
		s.bodies[epamDocID(rec.UserID, rec.EpamID)] = rec.Body
	}
	s.mu.Unlock()
	return rec, nil
}

func (s *memoryPamphletStore) GetEpam(_ context.Context, userID, epamID, _ string) (EpamRecord, bool, error) {
	s.mu.RLock()
	rec, ok := s.epams[epamDocID(userID, epamID)]
	if !ok {
		s.mu.RUnlock()
		return EpamRecord{}, false, nil
	}
	body, ok := s.bodies[epamDocID(userID, epamID)]
	s.mu.RUnlock()
	if !ok {
		return EpamRecord{}, false, nil
	}
	rec.Body = body
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
	_, ok := s.epams[epamDocID(userID, epamID)]
	if ok {
		delete(s.epams, epamDocID(userID, epamID))
		delete(s.bodies, epamDocID(userID, epamID))
	}
	s.mu.Unlock()
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

func seriesDocID(userID, seriesID string) string { return userID + ":" + seriesID }
func authorDocID(userID, authorID string) string { return userID + ":" + authorID }

func (s *memoryPamphletStore) SaveSeries(_ context.Context, rec EpamSeriesProfile, _ string) (EpamSeriesProfile, error) {
	now := pamphletNow()
	if rec.SeriesID == "" {
		rec.SeriesID = randomID(16)
	}
	if rec.CreatedAt == "" {
		rec.CreatedAt = now
	}
	rec.UpdatedAt = now
	rec.Chapters = normalizeSeriesChapters(rec.Chapters)
	s.mu.Lock()
	s.series[seriesDocID(rec.UserID, rec.SeriesID)] = rec
	s.mu.Unlock()
	return rec, nil
}

func (s *memoryPamphletStore) GetSeries(_ context.Context, userID, seriesID, _ string) (EpamSeriesProfile, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.series[seriesDocID(userID, seriesID)]
	return rec, ok, nil
}

func (s *memoryPamphletStore) ListSeries(_ context.Context, userID, _ string) ([]EpamSeriesProfile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EpamSeriesProfile, 0)
	for _, rec := range s.series {
		if rec.UserID == userID {
			out = append(out, rec)
		}
	}
	return out, nil
}

func (s *memoryPamphletStore) DeleteSeries(_ context.Context, userID, seriesID, _ string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.series, seriesDocID(userID, seriesID))
	return nil
}

func (s *memoryPamphletStore) SaveAuthor(_ context.Context, rec EpamAuthorProfile, _ string) (EpamAuthorProfile, error) {
	now := pamphletNow()
	if rec.AuthorID == "" {
		rec.AuthorID = randomID(16)
	}
	if rec.CreatedAt == "" {
		rec.CreatedAt = now
	}
	rec.UpdatedAt = now
	s.mu.Lock()
	s.authors[authorDocID(rec.UserID, rec.AuthorID)] = rec
	s.mu.Unlock()
	return rec, nil
}

func (s *memoryPamphletStore) GetAuthor(_ context.Context, userID, authorID, _ string) (EpamAuthorProfile, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	rec, ok := s.authors[authorDocID(userID, authorID)]
	return rec, ok, nil
}

func (s *memoryPamphletStore) ListAuthors(_ context.Context, userID, _ string) ([]EpamAuthorProfile, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EpamAuthorProfile, 0)
	for _, rec := range s.authors {
		if rec.UserID == userID {
			out = append(out, rec)
		}
	}
	return out, nil
}

func (s *memoryPamphletStore) DeleteAuthor(_ context.Context, userID, authorID, _ string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.authors, authorDocID(userID, authorID))
	return nil
}

type mongoPamphletStore struct {
	db *mongo.Database
}

func (s *mongoPamphletStore) epams() *mongo.Collection {
	return s.db.Collection(colEpams)
}
func (s *mongoPamphletStore) bodies() *mongo.Collection {
	return s.db.Collection(colEpamBodies)
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
	if rec.Body != nil {
		raw, _ := json.Marshal(rec.Body)
		rec.ContentSizeBytes = int64(len(raw))
		body := rec.bodyDoc()
		if _, err := bson.Marshal(body); err != nil {
			return EpamRecord{}, err
		}
		if _, err := s.bodies().ReplaceOne(ctx, bson.M{"_id": body.ID}, body, options.Replace().SetUpsert(true)); err != nil {
			return EpamRecord{}, err
		}
	}
	doc := rec.toDoc()
	_, err := s.epams().ReplaceOne(ctx, bson.M{"_id": doc.ID}, doc, options.Replace().SetUpsert(true))
	if err != nil {
		return EpamRecord{}, err
	}
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
	var body epamBodyDoc
	err = s.bodies().FindOne(ctx, bson.M{"_id": epamDocID(userID, epamID), "user_id": userID}).Decode(&body)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return EpamRecord{}, false, nil
	}
	if err != nil {
		return EpamRecord{}, false, err
	}
	rec.Body = body.Body
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
	if _, err := s.bodies().DeleteOne(ctx, bson.M{"_id": epamDocID(userID, epamID), "user_id": userID}); err != nil {
		return err
	}
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

func (s *mongoPamphletStore) seriesCol() *mongo.Collection {
	return s.db.Collection(colEpamSeries)
}
func (s *mongoPamphletStore) authorsCol() *mongo.Collection {
	return s.db.Collection(colEpamAuthors)
}

type epamSeriesDoc struct {
	ID        string               `bson:"_id"`
	UserID    string               `bson:"user_id"`
	SeriesID  string               `bson:"series_id"`
	Name      string               `bson:"name"`
	Chapters  []EpamChapterProfile `bson:"chapters"`
	CreatedAt string               `bson:"created_at,omitempty"`
	UpdatedAt string               `bson:"updated_at,omitempty"`
}

type epamAuthorDoc struct {
	ID        string `bson:"_id"`
	UserID    string `bson:"user_id"`
	AuthorID  string `bson:"author_id"`
	Name      string `bson:"name"`
	CreatedAt string `bson:"created_at,omitempty"`
	UpdatedAt string `bson:"updated_at,omitempty"`
}

func (s *mongoPamphletStore) SaveSeries(ctx context.Context, rec EpamSeriesProfile, _ string) (EpamSeriesProfile, error) {
	now := pamphletNow()
	if rec.SeriesID == "" {
		rec.SeriesID = randomID(16)
	}
	if rec.CreatedAt == "" {
		rec.CreatedAt = now
	}
	rec.UpdatedAt = now
	rec.Chapters = normalizeSeriesChapters(rec.Chapters)
	doc := epamSeriesDoc{
		ID: seriesDocID(rec.UserID, rec.SeriesID), UserID: rec.UserID, SeriesID: rec.SeriesID,
		Name: rec.Name, Chapters: rec.Chapters, CreatedAt: rec.CreatedAt, UpdatedAt: rec.UpdatedAt,
	}
	_, err := s.seriesCol().ReplaceOne(ctx, bson.M{"_id": doc.ID}, doc, options.Replace().SetUpsert(true))
	return rec, err
}

func (s *mongoPamphletStore) GetSeries(ctx context.Context, userID, seriesID, _ string) (EpamSeriesProfile, bool, error) {
	var doc epamSeriesDoc
	err := s.seriesCol().FindOne(ctx, bson.M{"_id": seriesDocID(userID, seriesID)}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return EpamSeriesProfile{}, false, nil
	}
	if err != nil {
		return EpamSeriesProfile{}, false, err
	}
	return EpamSeriesProfile{
		UserID: doc.UserID, SeriesID: doc.SeriesID, Name: doc.Name, Chapters: doc.Chapters,
		CreatedAt: doc.CreatedAt, UpdatedAt: doc.UpdatedAt,
	}, true, nil
}

func (s *mongoPamphletStore) ListSeries(ctx context.Context, userID, _ string) ([]EpamSeriesProfile, error) {
	cur, err := s.seriesCol().Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]EpamSeriesProfile, 0)
	for cur.Next(ctx) {
		var doc epamSeriesDoc
		if err := cur.Decode(&doc); err != nil {
			return nil, err
		}
		out = append(out, EpamSeriesProfile{
			UserID: doc.UserID, SeriesID: doc.SeriesID, Name: doc.Name, Chapters: doc.Chapters,
			CreatedAt: doc.CreatedAt, UpdatedAt: doc.UpdatedAt,
		})
	}
	return out, cur.Err()
}

func (s *mongoPamphletStore) DeleteSeries(ctx context.Context, userID, seriesID, _ string) error {
	_, err := s.seriesCol().DeleteOne(ctx, bson.M{"_id": seriesDocID(userID, seriesID)})
	return err
}

func (s *mongoPamphletStore) SaveAuthor(ctx context.Context, rec EpamAuthorProfile, _ string) (EpamAuthorProfile, error) {
	now := pamphletNow()
	if rec.AuthorID == "" {
		rec.AuthorID = randomID(16)
	}
	if rec.CreatedAt == "" {
		rec.CreatedAt = now
	}
	rec.UpdatedAt = now
	doc := epamAuthorDoc{
		ID: authorDocID(rec.UserID, rec.AuthorID), UserID: rec.UserID, AuthorID: rec.AuthorID,
		Name: rec.Name, CreatedAt: rec.CreatedAt, UpdatedAt: rec.UpdatedAt,
	}
	_, err := s.authorsCol().ReplaceOne(ctx, bson.M{"_id": doc.ID}, doc, options.Replace().SetUpsert(true))
	return rec, err
}

func (s *mongoPamphletStore) GetAuthor(ctx context.Context, userID, authorID, _ string) (EpamAuthorProfile, bool, error) {
	var doc epamAuthorDoc
	err := s.authorsCol().FindOne(ctx, bson.M{"_id": authorDocID(userID, authorID)}).Decode(&doc)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return EpamAuthorProfile{}, false, nil
	}
	if err != nil {
		return EpamAuthorProfile{}, false, err
	}
	return EpamAuthorProfile{
		UserID: doc.UserID, AuthorID: doc.AuthorID, Name: doc.Name,
		CreatedAt: doc.CreatedAt, UpdatedAt: doc.UpdatedAt,
	}, true, nil
}

func (s *mongoPamphletStore) ListAuthors(ctx context.Context, userID, _ string) ([]EpamAuthorProfile, error) {
	cur, err := s.authorsCol().Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]EpamAuthorProfile, 0)
	for cur.Next(ctx) {
		var doc epamAuthorDoc
		if err := cur.Decode(&doc); err != nil {
			return nil, err
		}
		out = append(out, EpamAuthorProfile{
			UserID: doc.UserID, AuthorID: doc.AuthorID, Name: doc.Name,
			CreatedAt: doc.CreatedAt, UpdatedAt: doc.UpdatedAt,
		})
	}
	return out, cur.Err()
}

func (s *mongoPamphletStore) DeleteAuthor(ctx context.Context, userID, authorID, _ string) error {
	_, err := s.authorsCol().DeleteOne(ctx, bson.M{"_id": authorDocID(userID, authorID)})
	return err
}
