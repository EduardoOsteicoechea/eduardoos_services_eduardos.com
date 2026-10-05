package main

import (
	"context"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type EoschoolCurriculumProgressStore interface {
	GetOrCreate(ctx context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, error)
	ListStudents(ctx context.Context, ownerUserID string) ([]EoschoolCurriculumStudent, error)
	SetSectionDone(ctx context.Context, ownerUserID, studentKey, dayID, sectionID string, done bool) (EoschoolCurriculumProgressDoc, error)
}

func newEoschoolCurriculumProgressStore(store DataStore) EoschoolCurriculumProgressStore {
	if s, ok := store.(*mongoStore); ok && s != nil && s.db != nil {
		return &mongoEoschoolCurriculumProgressStore{col: s.db.Collection(colEoschoolCurriculumProgress)}
	}
	return newMemoryEoschoolCurriculumProgressStore()
}

type memoryEoschoolCurriculumProgressStore struct {
	mu   sync.RWMutex
	rows map[string]EoschoolCurriculumProgressDoc
}

func newMemoryEoschoolCurriculumProgressStore() *memoryEoschoolCurriculumProgressStore {
	return &memoryEoschoolCurriculumProgressStore{rows: map[string]EoschoolCurriculumProgressDoc{}}
}

func eoschoolCurriculumProgressStoreKey(owner, student string) string {
	return owner + "|" + student
}

func (s *memoryEoschoolCurriculumProgressStore) GetOrCreate(_ context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	key := eoschoolCurriculumProgressStoreKey(ownerUserID, studentKey)
	s.mu.Lock()
	defer s.mu.Unlock()
	if row, ok := s.rows[key]; ok {
		return row, nil
	}
	row := defaultEoschoolCurriculumProgress(ownerUserID, studentKey)
	row.ID = randomID(16)
	s.rows[key] = row
	return row, nil
}

func (s *memoryEoschoolCurriculumProgressStore) ListStudents(ctx context.Context, ownerUserID string) ([]EoschoolCurriculumStudent, error) {
	if _, err := s.GetOrCreate(ctx, ownerUserID, eoschoolCurriculumDefaultStudentKey); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EoschoolCurriculumStudent, 0)
	for _, row := range s.rows {
		if row.OwnerUserID != ownerUserID {
			continue
		}
		out = append(out, row.studentView())
	}
	if len(out) == 0 {
		return []EoschoolCurriculumStudent{}, nil
	}
	return out, nil
}

func (s *memoryEoschoolCurriculumProgressStore) SetSectionDone(ctx context.Context, ownerUserID, studentKey, dayID, sectionID string, done bool) (EoschoolCurriculumProgressDoc, error) {
	row, err := s.GetOrCreate(ctx, ownerUserID, studentKey)
	if err != nil {
		return row, err
	}
	sectionKey := eoschoolCurriculumSectionKey(dayID, sectionID)
	s.mu.Lock()
	defer s.mu.Unlock()
	key := eoschoolCurriculumProgressStoreKey(ownerUserID, row.StudentKey)
	stored := s.rows[key]
	set := map[string]bool{}
	for _, v := range stored.SectionsDone {
		set[v] = true
	}
	if done {
		set[sectionKey] = true
	} else {
		delete(set, sectionKey)
	}
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	stored.SectionsDone = out
	stored.UpdatedAt = time.Now().UTC()
	s.rows[key] = stored
	return stored, nil
}

type mongoEoschoolCurriculumProgressStore struct {
	col *mongo.Collection
}

func (s *mongoEoschoolCurriculumProgressStore) GetOrCreate(ctx context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	filter := bson.M{"owner_user_id": ownerUserID, "student_key": studentKey}
	var row EoschoolCurriculumProgressDoc
	err := s.col.FindOne(ctx, filter).Decode(&row)
	if err == nil {
		return row, nil
	}
	if err != mongo.ErrNoDocuments {
		return row, err
	}
	row = defaultEoschoolCurriculumProgress(ownerUserID, studentKey)
	row.ID = randomID(16)
	_, err = s.col.InsertOne(ctx, row)
	if err != nil {
		// Concurrent create: unique (owner_user_id, student_key) — re-read.
		if mongo.IsDuplicateKeyError(err) {
			var existing EoschoolCurriculumProgressDoc
			if findErr := s.col.FindOne(ctx, filter).Decode(&existing); findErr == nil {
				return existing, nil
			}
		}
		return row, err
	}
	return row, nil
}

func (s *mongoEoschoolCurriculumProgressStore) ListStudents(ctx context.Context, ownerUserID string) ([]EoschoolCurriculumStudent, error) {
	row, err := s.GetOrCreate(ctx, ownerUserID, eoschoolCurriculumDefaultStudentKey)
	if err != nil {
		return nil, err
	}
	cur, err := s.col.Find(ctx, bson.M{"owner_user_id": ownerUserID}, options.Find().SetSort(bson.D{{Key: "display_name", Value: 1}}))
	if err != nil {
		return []EoschoolCurriculumStudent{row.studentView()}, nil
	}
	defer cur.Close(ctx)
	var docs []EoschoolCurriculumProgressDoc
	if err := cur.All(ctx, &docs); err != nil || len(docs) == 0 {
		return []EoschoolCurriculumStudent{row.studentView()}, nil
	}
	out := make([]EoschoolCurriculumStudent, 0, len(docs))
	for _, d := range docs {
		out = append(out, d.studentView())
	}
	return out, nil
}

func (s *mongoEoschoolCurriculumProgressStore) SetSectionDone(ctx context.Context, ownerUserID, studentKey, dayID, sectionID string, done bool) (EoschoolCurriculumProgressDoc, error) {
	row, err := s.GetOrCreate(ctx, ownerUserID, studentKey)
	if err != nil {
		return row, err
	}
	sectionKey := eoschoolCurriculumSectionKey(dayID, sectionID)
	now := time.Now().UTC()
	if done {
		_, err = s.col.UpdateOne(ctx,
			bson.M{"owner_user_id": ownerUserID, "student_key": row.StudentKey},
			bson.M{
				"$addToSet": bson.M{"sections_done": sectionKey},
				"$set":      bson.M{"updated_at": now},
			},
		)
	} else {
		_, err = s.col.UpdateOne(ctx,
			bson.M{"owner_user_id": ownerUserID, "student_key": row.StudentKey},
			bson.M{
				"$pull": bson.M{"sections_done": sectionKey},
				"$set":  bson.M{"updated_at": now},
			},
		)
	}
	if err != nil {
		return row, err
	}
	return s.GetOrCreate(ctx, ownerUserID, row.StudentKey)
}
