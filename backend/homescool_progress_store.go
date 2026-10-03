package main

import (
	"context"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const colHomescoolProgress = "homescool_progress"

type HomescoolProgressStore interface {
	Get(ctx context.Context, ownerUserID, studentKey string, cycle, week, day int, subject string) (HomescoolProgress, bool, error)
	GetByPhoto(ctx context.Context, ownerUserID, photoID string) (HomescoolProgress, bool, error)
	Upsert(ctx context.Context, p HomescoolProgress) (HomescoolProgress, error)
	DeletePhoto(ctx context.Context, ownerUserID, photoID string) (HomescoolProgress, bool, error)
	List(ctx context.Context, ownerUserID, studentKey string, cycle, week int) ([]HomescoolProgress, error)
	ListWeek(ctx context.Context, ownerUserID, studentKey string, cycle, week int) ([]HomescoolProgress, error)
}

func newHomescoolProgressStore(store DataStore) HomescoolProgressStore {
	if s, ok := store.(*mongoStore); ok && s != nil && s.db != nil {
		return &mongoHomescoolProgressStore{col: s.db.Collection(colHomescoolProgress)}
	}
	return newMemoryHomescoolProgressStore()
}

type memoryHomescoolProgressStore struct {
	mu   sync.RWMutex
	rows map[string]HomescoolProgress
}

func newMemoryHomescoolProgressStore() *memoryHomescoolProgressStore {
	return &memoryHomescoolProgressStore{rows: map[string]HomescoolProgress{}}
}

func progressStoreKey(owner, student string, c, w, d int, s string) string {
	return owner + "|" + student + "|" + homescoolProgressCellKey(c, w, d, s)
}

func (s *memoryHomescoolProgressStore) Get(_ context.Context, o, st string, c, w, d int, sub string) (HomescoolProgress, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.rows[progressStoreKey(o, st, c, w, d, sub)]
	return v, ok, nil
}

func (s *memoryHomescoolProgressStore) GetByPhoto(_ context.Context, ownerUserID, photoID string) (HomescoolProgress, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, p := range s.rows {
		if p.OwnerUserID != ownerUserID {
			continue
		}
		for _, ph := range p.Photos {
			if ph.ID == photoID {
				return p, true, nil
			}
		}
	}
	return HomescoolProgress{}, false, nil
}

func (s *memoryHomescoolProgressStore) Upsert(_ context.Context, p HomescoolProgress) (HomescoolProgress, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	key := progressStoreKey(p.OwnerUserID, p.StudentKey, p.Cycle, p.Week, p.Day, p.Subject)
	if existing, ok := s.rows[key]; ok {
		p.ID = existing.ID
		p.CreatedAt = existing.CreatedAt
	}
	if p.ID == "" {
		p.ID = randomID(16)
	}
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	p.UpdatedAt = now
	s.rows[key] = p
	return p, nil
}

func (s *memoryHomescoolProgressStore) DeletePhoto(ctx context.Context, ownerUserID, photoID string) (HomescoolProgress, bool, error) {
	row, found, err := s.GetByPhoto(ctx, ownerUserID, photoID)
	if err != nil || !found {
		return HomescoolProgress{}, false, err
	}
	remaining := make([]HomescoolProgressPhoto, 0, len(row.Photos))
	for _, ph := range row.Photos {
		if ph.ID != photoID {
			remaining = append(remaining, ph)
		}
	}
	row.Photos = remaining
	if len(remaining) == 0 {
		s.mu.Lock()
		delete(s.rows, progressStoreKey(row.OwnerUserID, row.StudentKey, row.Cycle, row.Week, row.Day, row.Subject))
		s.mu.Unlock()
		return HomescoolProgress{}, true, nil
	}
	saved, err := s.Upsert(ctx, row)
	return saved, true, err
}

func (s *memoryHomescoolProgressStore) List(_ context.Context, o, st string, c, w int) ([]HomescoolProgress, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []HomescoolProgress{}
	for _, p := range s.rows {
		if p.OwnerUserID == o && p.StudentKey == st && (c == 0 || p.Cycle == c) && (w == 0 || p.Week == w) {
			out = append(out, p)
		}
	}
	return out, nil
}

func (s *memoryHomescoolProgressStore) ListWeek(ctx context.Context, o, st string, c, w int) ([]HomescoolProgress, error) {
	return s.List(ctx, o, st, c, w)
}

type mongoHomescoolProgressStore struct{ col *mongo.Collection }

func (s *mongoHomescoolProgressStore) Get(ctx context.Context, o, st string, c, w, d int, sub string) (HomescoolProgress, bool, error) {
	var p HomescoolProgress
	err := s.col.FindOne(ctx, bson.M{"owner_user_id": o, "student_key": st, "cycle": c, "week": w, "day": d, "subject": sub}).Decode(&p)
	if err == mongo.ErrNoDocuments {
		return p, false, nil
	}
	return p, err == nil, err
}

func (s *mongoHomescoolProgressStore) GetByPhoto(ctx context.Context, ownerUserID, photoID string) (HomescoolProgress, bool, error) {
	var p HomescoolProgress
	err := s.col.FindOne(ctx, bson.M{"owner_user_id": ownerUserID, "photos.id": photoID}).Decode(&p)
	if err == mongo.ErrNoDocuments {
		return p, false, nil
	}
	return p, err == nil, err
}

func (s *mongoHomescoolProgressStore) Upsert(ctx context.Context, p HomescoolProgress) (HomescoolProgress, error) {
	now := time.Now().UTC()
	filter := bson.M{"owner_user_id": p.OwnerUserID, "student_key": p.StudentKey, "cycle": p.Cycle, "week": p.Week, "day": p.Day, "subject": p.Subject}
	var existing HomescoolProgress
	err := s.col.FindOne(ctx, filter).Decode(&existing)
	if err == nil {
		p.ID = existing.ID
		p.CreatedAt = existing.CreatedAt
	} else if err != mongo.ErrNoDocuments {
		return p, err
	}
	if p.ID == "" {
		p.ID = randomID(16)
	}
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	p.UpdatedAt = now
	_, err = s.col.ReplaceOne(ctx, filter, p, options.Replace().SetUpsert(true))
	return p, err
}

func (s *mongoHomescoolProgressStore) DeletePhoto(ctx context.Context, ownerUserID, photoID string) (HomescoolProgress, bool, error) {
	row, found, err := s.GetByPhoto(ctx, ownerUserID, photoID)
	if err != nil || !found {
		return HomescoolProgress{}, false, err
	}
	remaining := make([]HomescoolProgressPhoto, 0, len(row.Photos))
	for _, ph := range row.Photos {
		if ph.ID != photoID {
			remaining = append(remaining, ph)
		}
	}
	row.Photos = remaining
	if len(remaining) == 0 {
		_, err = s.col.DeleteOne(ctx, bson.M{"id": row.ID, "owner_user_id": ownerUserID})
		if err != nil {
			_, err = s.col.DeleteOne(ctx, bson.M{"_id": row.ID, "owner_user_id": ownerUserID})
		}
		return HomescoolProgress{}, true, err
	}
	saved, err := s.Upsert(ctx, row)
	return saved, true, err
}

func (s *mongoHomescoolProgressStore) List(ctx context.Context, o, st string, c, w int) ([]HomescoolProgress, error) {
	filter := bson.M{"owner_user_id": o, "student_key": st}
	if c > 0 {
		filter["cycle"] = c
	}
	if w > 0 {
		filter["week"] = w
	}
	cur, err := s.col.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "day", Value: 1}, {Key: "subject", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []HomescoolProgress
	err = cur.All(ctx, &out)
	return out, err
}

func (s *mongoHomescoolProgressStore) ListWeek(ctx context.Context, o, st string, c, w int) ([]HomescoolProgress, error) {
	return s.List(ctx, o, st, c, w)
}
