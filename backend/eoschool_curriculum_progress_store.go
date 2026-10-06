package main

import (
	"context"
	"errors"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var errEoschoolCurriculumStudentExists = errors.New("student_exists")
var errEoschoolCurriculumStudentNotFound = errors.New("student_not_found")

type EoschoolCurriculumProgressStore interface {
	GetOrCreate(ctx context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, error)
	Get(ctx context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, bool, error)
	ListStudents(ctx context.Context, ownerUserID string) ([]EoschoolCurriculumStudent, error)
	CreateStudent(ctx context.Context, doc EoschoolCurriculumProgressDoc) (EoschoolCurriculumProgressDoc, error)
	UpdateStudent(ctx context.Context, ownerUserID, studentKey string, mutate func(*EoschoolCurriculumProgressDoc) error) (EoschoolCurriculumProgressDoc, error)
	DeleteStudent(ctx context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, error)
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

func (s *memoryEoschoolCurriculumProgressStore) Get(_ context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, bool, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	key := eoschoolCurriculumProgressStoreKey(ownerUserID, studentKey)
	s.mu.RLock()
	defer s.mu.RUnlock()
	row, ok := s.rows[key]
	return row, ok, nil
}

func (s *memoryEoschoolCurriculumProgressStore) ListStudents(_ context.Context, ownerUserID string) ([]EoschoolCurriculumStudent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]EoschoolCurriculumStudent, 0)
	for _, row := range s.rows {
		if row.OwnerUserID != ownerUserID {
			continue
		}
		out = append(out, row.studentView())
	}
	return out, nil
}

func (s *memoryEoschoolCurriculumProgressStore) CreateStudent(_ context.Context, doc EoschoolCurriculumProgressDoc) (EoschoolCurriculumProgressDoc, error) {
	doc.StudentKey = normalizeEoschoolCurriculumStudentKey(doc.StudentKey)
	key := eoschoolCurriculumProgressStoreKey(doc.OwnerUserID, doc.StudentKey)
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.rows[key]; ok {
		return EoschoolCurriculumProgressDoc{}, errEoschoolCurriculumStudentExists
	}
	if doc.ID == "" {
		doc.ID = randomID(16)
	}
	now := time.Now().UTC()
	if doc.CreatedAt.IsZero() {
		doc.CreatedAt = now
	}
	doc.UpdatedAt = now
	if doc.SectionsDone == nil {
		doc.SectionsDone = []string{}
	}
	s.rows[key] = doc
	return doc, nil
}

func (s *memoryEoschoolCurriculumProgressStore) UpdateStudent(_ context.Context, ownerUserID, studentKey string, mutate func(*EoschoolCurriculumProgressDoc) error) (EoschoolCurriculumProgressDoc, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	key := eoschoolCurriculumProgressStoreKey(ownerUserID, studentKey)
	s.mu.Lock()
	defer s.mu.Unlock()
	row, ok := s.rows[key]
	if !ok {
		return EoschoolCurriculumProgressDoc{}, errEoschoolCurriculumStudentNotFound
	}
	if err := mutate(&row); err != nil {
		return EoschoolCurriculumProgressDoc{}, err
	}
	row.UpdatedAt = time.Now().UTC()
	s.rows[key] = row
	return row, nil
}

func (s *memoryEoschoolCurriculumProgressStore) DeleteStudent(_ context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	key := eoschoolCurriculumProgressStoreKey(ownerUserID, studentKey)
	s.mu.Lock()
	defer s.mu.Unlock()
	row, ok := s.rows[key]
	if !ok {
		return EoschoolCurriculumProgressDoc{}, errEoschoolCurriculumStudentNotFound
	}
	delete(s.rows, key)
	return row, nil
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

func (s *mongoEoschoolCurriculumProgressStore) Get(ctx context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, bool, error) {
	studentKey = normalizeEoschoolCurriculumStudentKey(studentKey)
	filter := bson.M{"owner_user_id": ownerUserID, "student_key": studentKey}
	var row EoschoolCurriculumProgressDoc
	err := s.col.FindOne(ctx, filter).Decode(&row)
	if err == nil {
		return row, true, nil
	}
	if err == mongo.ErrNoDocuments {
		return row, false, nil
	}
	return row, false, err
}

func (s *mongoEoschoolCurriculumProgressStore) ListStudents(ctx context.Context, ownerUserID string) ([]EoschoolCurriculumStudent, error) {
	cur, err := s.col.Find(ctx, bson.M{"owner_user_id": ownerUserID}, options.Find().SetSort(bson.D{{Key: "display_name", Value: 1}}))
	if err != nil {
		return []EoschoolCurriculumStudent{}, err
	}
	defer cur.Close(ctx)
	var docs []EoschoolCurriculumProgressDoc
	if err := cur.All(ctx, &docs); err != nil {
		return []EoschoolCurriculumStudent{}, err
	}
	out := make([]EoschoolCurriculumStudent, 0, len(docs))
	for _, d := range docs {
		out = append(out, d.studentView())
	}
	return out, nil
}

func (s *mongoEoschoolCurriculumProgressStore) CreateStudent(ctx context.Context, doc EoschoolCurriculumProgressDoc) (EoschoolCurriculumProgressDoc, error) {
	doc.StudentKey = normalizeEoschoolCurriculumStudentKey(doc.StudentKey)
	if doc.ID == "" {
		doc.ID = randomID(16)
	}
	now := time.Now().UTC()
	if doc.CreatedAt.IsZero() {
		doc.CreatedAt = now
	}
	doc.UpdatedAt = now
	if doc.SectionsDone == nil {
		doc.SectionsDone = []string{}
	}
	_, err := s.col.InsertOne(ctx, doc)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return EoschoolCurriculumProgressDoc{}, errEoschoolCurriculumStudentExists
		}
		return EoschoolCurriculumProgressDoc{}, err
	}
	return doc, nil
}

func (s *mongoEoschoolCurriculumProgressStore) UpdateStudent(ctx context.Context, ownerUserID, studentKey string, mutate func(*EoschoolCurriculumProgressDoc) error) (EoschoolCurriculumProgressDoc, error) {
	row, found, err := s.Get(ctx, ownerUserID, studentKey)
	if err != nil {
		return row, err
	}
	if !found {
		return row, errEoschoolCurriculumStudentNotFound
	}
	if err := mutate(&row); err != nil {
		return row, err
	}
	row.UpdatedAt = time.Now().UTC()
	_, err = s.col.ReplaceOne(ctx, bson.M{"owner_user_id": ownerUserID, "student_key": row.StudentKey}, row)
	if err != nil {
		return row, err
	}
	return row, nil
}

func (s *mongoEoschoolCurriculumProgressStore) DeleteStudent(ctx context.Context, ownerUserID, studentKey string) (EoschoolCurriculumProgressDoc, error) {
	row, found, err := s.Get(ctx, ownerUserID, studentKey)
	if err != nil {
		return row, err
	}
	if !found {
		return row, errEoschoolCurriculumStudentNotFound
	}
	_, err = s.col.DeleteOne(ctx, bson.M{"owner_user_id": ownerUserID, "student_key": row.StudentKey})
	if err != nil {
		return row, err
	}
	return row, nil
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
