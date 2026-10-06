package main

import (
	"context"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type EoschoolCurriculumMaterialsStore interface {
	Insert(ctx context.Context, m EoschoolCurriculumMaterial) (EoschoolCurriculumMaterial, error)
	GetByID(ctx context.Context, id string) (EoschoolCurriculumMaterial, bool, error)
	List(ctx context.Context, ownerUserID, studentKey, dayID, sectionID string) ([]EoschoolCurriculumMaterial, error)
	ListByStudentRole(ctx context.Context, ownerUserID, studentKey, role string) ([]EoschoolCurriculumMaterial, error)
	Delete(ctx context.Context, ownerUserID, id string) (EoschoolCurriculumMaterial, bool, error)
}

func newEoschoolCurriculumMaterialsStore(store DataStore) EoschoolCurriculumMaterialsStore {
	if s, ok := store.(*mongoStore); ok && s != nil && s.db != nil {
		return &mongoEoschoolCurriculumMaterialsStore{col: s.db.Collection(colEoschoolCurriculumMaterials)}
	}
	return newMemoryEoschoolCurriculumMaterialsStore()
}

type memoryEoschoolCurriculumMaterialsStore struct {
	mu   sync.RWMutex
	rows map[string]EoschoolCurriculumMaterial
}

func newMemoryEoschoolCurriculumMaterialsStore() *memoryEoschoolCurriculumMaterialsStore {
	return &memoryEoschoolCurriculumMaterialsStore{rows: map[string]EoschoolCurriculumMaterial{}}
}

func (s *memoryEoschoolCurriculumMaterialsStore) Insert(_ context.Context, m EoschoolCurriculumMaterial) (EoschoolCurriculumMaterial, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.rows[m.ID] = m
	return m, nil
}

func (s *memoryEoschoolCurriculumMaterialsStore) GetByID(_ context.Context, id string) (EoschoolCurriculumMaterial, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m, ok := s.rows[id]
	return m, ok, nil
}

func (s *memoryEoschoolCurriculumMaterialsStore) List(_ context.Context, ownerUserID, studentKey, dayID, sectionID string) ([]EoschoolCurriculumMaterial, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EoschoolCurriculumMaterial, 0)
	for _, m := range s.rows {
		if m.OwnerUserID == ownerUserID && m.StudentKey == studentKey && m.DayID == dayID && m.SectionID == sectionID {
			out = append(out, m)
		}
	}
	// Stable order: created_at ascending
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].CreatedAt.Before(out[i].CreatedAt) {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out, nil
}

func (s *memoryEoschoolCurriculumMaterialsStore) ListByStudentRole(_ context.Context, ownerUserID, studentKey, role string) ([]EoschoolCurriculumMaterial, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	role = strings.TrimSpace(role)
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EoschoolCurriculumMaterial, 0)
	for _, m := range s.rows {
		if m.OwnerUserID == ownerUserID && m.StudentKey == studentKey && (role == "" || m.Role == role) {
			out = append(out, m)
		}
	}
	return out, nil
}

func (s *memoryEoschoolCurriculumMaterialsStore) Delete(_ context.Context, ownerUserID, id string) (EoschoolCurriculumMaterial, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	m, ok := s.rows[id]
	if !ok || m.OwnerUserID != ownerUserID {
		return EoschoolCurriculumMaterial{}, false, nil
	}
	delete(s.rows, id)
	return m, true, nil
}

type mongoEoschoolCurriculumMaterialsStore struct {
	col *mongo.Collection
}

func (s *mongoEoschoolCurriculumMaterialsStore) Insert(ctx context.Context, m EoschoolCurriculumMaterial) (EoschoolCurriculumMaterial, error) {
	_, err := s.col.InsertOne(ctx, m)
	return m, err
}

func (s *mongoEoschoolCurriculumMaterialsStore) GetByID(ctx context.Context, id string) (EoschoolCurriculumMaterial, bool, error) {
	var m EoschoolCurriculumMaterial
	err := s.col.FindOne(ctx, bson.M{"id": id}).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return m, false, nil
	}
	if err != nil {
		return m, false, err
	}
	return m, true, nil
}

func (s *mongoEoschoolCurriculumMaterialsStore) ListByStudentRole(ctx context.Context, ownerUserID, studentKey, role string) ([]EoschoolCurriculumMaterial, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	filter := bson.M{
		"owner_user_id": ownerUserID,
		"student_key":   studentKey,
	}
	if role = strings.TrimSpace(role); role != "" {
		filter["role"] = role
	}
	cur, err := s.col.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "day_id", Value: 1}, {Key: "section_id", Value: 1}, {Key: "created_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []EoschoolCurriculumMaterial
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []EoschoolCurriculumMaterial{}
	}
	return out, nil
}

func (s *mongoEoschoolCurriculumMaterialsStore) List(ctx context.Context, ownerUserID, studentKey, dayID, sectionID string) ([]EoschoolCurriculumMaterial, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	cur, err := s.col.Find(ctx, bson.M{
		"owner_user_id": ownerUserID,
		"student_key":   studentKey,
		"day_id":        dayID,
		"section_id":    sectionID,
	}, options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []EoschoolCurriculumMaterial
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []EoschoolCurriculumMaterial{}
	}
	return out, nil
}

func (s *mongoEoschoolCurriculumMaterialsStore) Delete(ctx context.Context, ownerUserID, id string) (EoschoolCurriculumMaterial, bool, error) {
	var m EoschoolCurriculumMaterial
	err := s.col.FindOneAndDelete(ctx, bson.M{"id": id, "owner_user_id": ownerUserID}).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return m, false, nil
	}
	if err != nil {
		return m, false, err
	}
	return m, true, nil
}

// ensure material timestamps helper used by HTTP layer
func newEoschoolCurriculumMaterialBase(ownerUserID, studentKey, dayID, sectionID, role, kind string) EoschoolCurriculumMaterial {
	now := time.Now().UTC()
	return EoschoolCurriculumMaterial{
		ID:          randomID(16),
		OwnerUserID: ownerUserID,
		StudentKey:  normalizeEoschoolCurriculumStudentKey(studentKey),
		DayID:       dayID,
		SectionID:   sectionID,
		Role:        role,
		Kind:        kind,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}
