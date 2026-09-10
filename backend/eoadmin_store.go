package main

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	colEoadminOptions    = "eoadmin_options"
	colEoadminStatements = "eoadmin_statements"
)

// EoadminStore persists options and purchase statements.
type EoadminStore interface {
	EnsureSeedOptions(ctx context.Context, seed []*EoadminOption) error
	ListOptions(ctx context.Context, query string, activeOnly bool) ([]*EoadminOption, error)
	GetOption(ctx context.Context, id string) (*EoadminOption, error)
	UpsertOption(ctx context.Context, opt *EoadminOption) error
	DeactivateOption(ctx context.Context, id string) error

	InsertStatement(ctx context.Context, st *EoadminStatement) error
	UpdateStatement(ctx context.Context, st *EoadminStatement) error
	GetStatement(ctx context.Context, id string) (*EoadminStatement, error)
	ListStatements(ctx context.Context, userID, status string, adminAll bool) ([]*EoadminStatement, error)
}

func openEoadminStore(store DataStore) EoadminStore {
	if ms, ok := store.(*mongoStore); ok && ms != nil && ms.db != nil {
		return &mongoEoadminStore{db: ms.db}
	}
	return newMemoryEoadminStore()
}

type memoryEoadminStore struct {
	mu         sync.RWMutex
	options    map[string]*EoadminOption
	statements map[string]*EoadminStatement
}

func newMemoryEoadminStore() *memoryEoadminStore {
	return &memoryEoadminStore{
		options:    map[string]*EoadminOption{},
		statements: map[string]*EoadminStatement{},
	}
}

func (s *memoryEoadminStore) EnsureSeedOptions(_ context.Context, seed []*EoadminOption) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.options) > 0 {
		return nil
	}
	for _, o := range seed {
		if o == nil || o.ID == "" {
			continue
		}
		s.options[o.ID] = o.clone()
	}
	return nil
}

func (s *memoryEoadminStore) ListOptions(_ context.Context, query string, activeOnly bool) ([]*EoadminOption, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	q := strings.ToLower(strings.TrimSpace(query))
	out := make([]*EoadminOption, 0, len(s.options))
	for _, o := range s.options {
		if o == nil {
			continue
		}
		if activeOnly && !o.Active {
			continue
		}
		if q != "" {
			hay := strings.ToLower(o.Label + " " + o.Description + " " + o.ProductID)
			if !strings.Contains(hay, q) {
				continue
			}
		}
		out = append(out, o.clone())
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].SortOrder != out[j].SortOrder {
			return out[i].SortOrder < out[j].SortOrder
		}
		return out[i].Label < out[j].Label
	})
	return out, nil
}

func (s *memoryEoadminStore) GetOption(_ context.Context, id string) (*EoadminOption, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	o, ok := s.options[id]
	if !ok || o == nil {
		return nil, errNotFound
	}
	return o.clone(), nil
}

func (s *memoryEoadminStore) UpsertOption(_ context.Context, opt *EoadminOption) error {
	if opt == nil || opt.ID == "" {
		return fmt.Errorf("option required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.options[opt.ID] = opt.clone()
	return nil
}

func (s *memoryEoadminStore) DeactivateOption(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	o, ok := s.options[id]
	if !ok || o == nil {
		return errNotFound
	}
	cp := o.clone()
	cp.Active = false
	cp.UpdatedAt = time.Now().UTC()
	s.options[id] = cp
	return nil
}

func (s *memoryEoadminStore) InsertStatement(_ context.Context, st *EoadminStatement) error {
	if st == nil || st.ID == "" {
		return fmt.Errorf("statement required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.statements[st.ID]; exists {
		return fmt.Errorf("duplicate statement")
	}
	s.statements[st.ID] = st.clone()
	return nil
}

func (s *memoryEoadminStore) UpdateStatement(_ context.Context, st *EoadminStatement) error {
	if st == nil || st.ID == "" {
		return fmt.Errorf("statement required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.statements[st.ID]; !ok {
		return errNotFound
	}
	s.statements[st.ID] = st.clone()
	return nil
}

func (s *memoryEoadminStore) GetStatement(_ context.Context, id string) (*EoadminStatement, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	st, ok := s.statements[id]
	if !ok || st == nil {
		return nil, errNotFound
	}
	return st.clone(), nil
}

func (s *memoryEoadminStore) ListStatements(_ context.Context, userID, status string, adminAll bool) ([]*EoadminStatement, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*EoadminStatement, 0)
	for _, st := range s.statements {
		if st == nil {
			continue
		}
		if !adminAll && st.UserID != userID {
			continue
		}
		if status != "" && st.Status != status {
			continue
		}
		out = append(out, st.clone())
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].UpdatedAt.After(out[j].UpdatedAt)
	})
	return out, nil
}

type mongoEoadminStore struct {
	db *mongo.Database
}

func (s *mongoEoadminStore) options() *mongo.Collection    { return s.db.Collection(colEoadminOptions) }
func (s *mongoEoadminStore) statements() *mongo.Collection { return s.db.Collection(colEoadminStatements) }

func (s *mongoEoadminStore) EnsureSeedOptions(ctx context.Context, seed []*EoadminOption) error {
	n, err := s.options().CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	docs := make([]any, 0, len(seed))
	for _, o := range seed {
		if o != nil {
			docs = append(docs, o)
		}
	}
	if len(docs) == 0 {
		return nil
	}
	_, err = s.options().InsertMany(ctx, docs)
	return err
}

func (s *mongoEoadminStore) ListOptions(ctx context.Context, query string, activeOnly bool) ([]*EoadminOption, error) {
	filter := bson.M{}
	if activeOnly {
		filter["active"] = true
	}
	q := strings.TrimSpace(query)
	if q != "" {
		filter["$or"] = []bson.M{
			{"label": bson.M{"$regex": q, "$options": "i"}},
			{"description": bson.M{"$regex": q, "$options": "i"}},
			{"product_id": bson.M{"$regex": q, "$options": "i"}},
		}
	}
	cur, err := s.options().Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "sort_order", Value: 1}, {Key: "label", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*EoadminOption
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *mongoEoadminStore) GetOption(ctx context.Context, id string) (*EoadminOption, error) {
	var o EoadminOption
	err := s.options().FindOne(ctx, bson.M{"_id": id}).Decode(&o)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (s *mongoEoadminStore) UpsertOption(ctx context.Context, opt *EoadminOption) error {
	if opt == nil || opt.ID == "" {
		return fmt.Errorf("option required")
	}
	_, err := s.options().ReplaceOne(ctx, bson.M{"_id": opt.ID}, opt, options.Replace().SetUpsert(true))
	return err
}

func (s *mongoEoadminStore) DeactivateOption(ctx context.Context, id string) error {
	res, err := s.options().UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{"active": false, "updated_at": time.Now().UTC()},
	})
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEoadminStore) InsertStatement(ctx context.Context, st *EoadminStatement) error {
	_, err := s.statements().InsertOne(ctx, st)
	return err
}

func (s *mongoEoadminStore) UpdateStatement(ctx context.Context, st *EoadminStatement) error {
	res, err := s.statements().ReplaceOne(ctx, bson.M{"_id": st.ID}, st)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEoadminStore) GetStatement(ctx context.Context, id string) (*EoadminStatement, error) {
	var st EoadminStatement
	err := s.statements().FindOne(ctx, bson.M{"_id": id}).Decode(&st)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &st, nil
}

func (s *mongoEoadminStore) ListStatements(ctx context.Context, userID, status string, adminAll bool) ([]*EoadminStatement, error) {
	filter := bson.M{}
	if !adminAll {
		filter["user_id"] = userID
	}
	if status != "" {
		filter["status"] = status
	}
	cur, err := s.statements().Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "updated_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*EoadminStatement
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
