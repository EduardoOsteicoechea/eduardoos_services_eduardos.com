package main

import (
	"context"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const colEoschoolCurriculumTutorAssignments = "eoschool_curriculum_tutor_assignments"

type EoschoolCurriculumTutorAssignment struct {
	ID                   string    `json:"id" bson:"_id"`
	OwnerUserID          string    `json:"ownerUserId" bson:"owner_user_id"`
	TutorUserID          string    `json:"tutorUserId" bson:"tutor_user_id"`
	TutorEmailNormalized string    `json:"tutorEmailNormalized" bson:"tutor_email_normalized"`
	StudentKey           string    `json:"studentKey" bson:"student_key"`
	CreatedAt            time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt            time.Time `json:"updatedAt" bson:"updated_at"`
}

type EoschoolCurriculumTutorStore interface {
	ListByTutor(ctx context.Context, tutorUserID string) ([]EoschoolCurriculumTutorAssignment, error)
	ListByOwner(ctx context.Context, ownerUserID string) ([]EoschoolCurriculumTutorAssignment, error)
	GetByTutorStudent(ctx context.Context, tutorUserID, studentKey string) (EoschoolCurriculumTutorAssignment, bool, error)
	ReplaceTutorStudents(ctx context.Context, ownerUserID, tutorUserID, tutorEmailNorm string, studentKeys []string) error
	HasAssignment(ctx context.Context, tutorUserID, ownerUserID, studentKey string) (bool, error)
}

func newEoschoolCurriculumTutorStore(store DataStore) EoschoolCurriculumTutorStore {
	if s, ok := store.(*mongoStore); ok && s != nil && s.db != nil {
		return &mongoEoschoolCurriculumTutorStore{col: s.db.Collection(colEoschoolCurriculumTutorAssignments)}
	}
	return newMemoryEoschoolCurriculumTutorStore()
}

type memoryEoschoolCurriculumTutorStore struct {
	mu   sync.RWMutex
	rows map[string]EoschoolCurriculumTutorAssignment
}

func newMemoryEoschoolCurriculumTutorStore() *memoryEoschoolCurriculumTutorStore {
	return &memoryEoschoolCurriculumTutorStore{rows: map[string]EoschoolCurriculumTutorAssignment{}}
}

func tutorAssignmentKey(owner, tutor, student string) string {
	return owner + "|" + tutor + "|" + student
}

func (s *memoryEoschoolCurriculumTutorStore) ListByTutor(_ context.Context, tutorUserID string) ([]EoschoolCurriculumTutorAssignment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EoschoolCurriculumTutorAssignment, 0)
	for _, row := range s.rows {
		if row.TutorUserID == tutorUserID {
			out = append(out, row)
		}
	}
	return out, nil
}

func (s *memoryEoschoolCurriculumTutorStore) ListByOwner(_ context.Context, ownerUserID string) ([]EoschoolCurriculumTutorAssignment, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EoschoolCurriculumTutorAssignment, 0)
	for _, row := range s.rows {
		if row.OwnerUserID == ownerUserID {
			out = append(out, row)
		}
	}
	return out, nil
}

func (s *memoryEoschoolCurriculumTutorStore) GetByTutorStudent(_ context.Context, tutorUserID, studentKey string) (EoschoolCurriculumTutorAssignment, bool, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, row := range s.rows {
		if row.TutorUserID == tutorUserID && row.StudentKey == studentKey {
			return row, true, nil
		}
	}
	return EoschoolCurriculumTutorAssignment{}, false, nil
}

func (s *memoryEoschoolCurriculumTutorStore) HasAssignment(_ context.Context, tutorUserID, ownerUserID, studentKey string) (bool, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.rows[tutorAssignmentKey(ownerUserID, tutorUserID, studentKey)]
	return ok, nil
}

func (s *memoryEoschoolCurriculumTutorStore) ReplaceTutorStudents(_ context.Context, ownerUserID, tutorUserID, tutorEmailNorm string, studentKeys []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for key, row := range s.rows {
		if row.OwnerUserID == ownerUserID && row.TutorUserID == tutorUserID {
			delete(s.rows, key)
		}
	}
	now := time.Now().UTC()
	seen := map[string]struct{}{}
	for _, raw := range studentKeys {
		key := normalizeEoschoolCurriculumStudentKey(raw)
		if key == "" {
			continue
		}
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}
		row := EoschoolCurriculumTutorAssignment{
			ID:                   randomID(16),
			OwnerUserID:          ownerUserID,
			TutorUserID:          tutorUserID,
			TutorEmailNormalized: tutorEmailNorm,
			StudentKey:           key,
			CreatedAt:            now,
			UpdatedAt:            now,
		}
		s.rows[tutorAssignmentKey(ownerUserID, tutorUserID, key)] = row
	}
	return nil
}

type mongoEoschoolCurriculumTutorStore struct {
	col *mongo.Collection
}

func (s *mongoEoschoolCurriculumTutorStore) ListByTutor(ctx context.Context, tutorUserID string) ([]EoschoolCurriculumTutorAssignment, error) {
	cur, err := s.col.Find(ctx, bson.M{"tutor_user_id": tutorUserID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []EoschoolCurriculumTutorAssignment
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []EoschoolCurriculumTutorAssignment{}
	}
	return out, nil
}

func (s *mongoEoschoolCurriculumTutorStore) ListByOwner(ctx context.Context, ownerUserID string) ([]EoschoolCurriculumTutorAssignment, error) {
	cur, err := s.col.Find(ctx, bson.M{"owner_user_id": ownerUserID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []EoschoolCurriculumTutorAssignment
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	if out == nil {
		out = []EoschoolCurriculumTutorAssignment{}
	}
	return out, nil
}

func (s *mongoEoschoolCurriculumTutorStore) GetByTutorStudent(ctx context.Context, tutorUserID, studentKey string) (EoschoolCurriculumTutorAssignment, bool, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	var row EoschoolCurriculumTutorAssignment
	err := s.col.FindOne(ctx, bson.M{"tutor_user_id": tutorUserID, "student_key": studentKey}).Decode(&row)
	if err == mongo.ErrNoDocuments {
		return EoschoolCurriculumTutorAssignment{}, false, nil
	}
	if err != nil {
		return EoschoolCurriculumTutorAssignment{}, false, err
	}
	return row, true, nil
}

func (s *mongoEoschoolCurriculumTutorStore) HasAssignment(ctx context.Context, tutorUserID, ownerUserID, studentKey string) (bool, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	n, err := s.col.CountDocuments(ctx, bson.M{
		"tutor_user_id": tutorUserID,
		"owner_user_id": ownerUserID,
		"student_key":   studentKey,
	}, options.Count().SetLimit(1))
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (s *mongoEoschoolCurriculumTutorStore) ReplaceTutorStudents(ctx context.Context, ownerUserID, tutorUserID, tutorEmailNorm string, studentKeys []string) error {
	if _, err := s.col.DeleteMany(ctx, bson.M{"owner_user_id": ownerUserID, "tutor_user_id": tutorUserID}); err != nil {
		return err
	}
	now := time.Now().UTC()
	seen := map[string]struct{}{}
	docs := make([]any, 0, len(studentKeys))
	for _, raw := range studentKeys {
		key := normalizeEoschoolCurriculumStudentKey(raw)
		if key == "" {
			continue
		}
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}
		docs = append(docs, EoschoolCurriculumTutorAssignment{
			ID:                   randomID(16),
			OwnerUserID:          ownerUserID,
			TutorUserID:          tutorUserID,
			TutorEmailNormalized: tutorEmailNorm,
			StudentKey:           key,
			CreatedAt:            now,
			UpdatedAt:            now,
		})
	}
	if len(docs) == 0 {
		return nil
	}
	_, err := s.col.InsertMany(ctx, docs)
	return err
}
