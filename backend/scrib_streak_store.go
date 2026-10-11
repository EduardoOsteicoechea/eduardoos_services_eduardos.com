package main

import (
	"context"
	"sync"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	colScribStreakConfigs    = "scrib_streak_configs"
	colScribStreakDays       = "scrib_streak_days"
	colScribStreakSnapshots  = "scrib_streak_snapshots"
	colScribStreakReminders  = "scrib_streak_reminders"
)

// ScribStreakStore persists streak config, days, snapshots, and reminder logs.
type ScribStreakStore interface {
	GetConfig(ctx context.Context, userID string) (*scribStreakConfig, error)
	SaveConfig(ctx context.Context, cfg *scribStreakConfig) error
	ListEnabledReminderConfigs(ctx context.Context) ([]scribStreakConfig, error)
	GetDay(ctx context.Context, userID, date string) (*scribStreakDay, error)
	SaveDay(ctx context.Context, day *scribStreakDay) error
	ListCompletedDates(ctx context.Context, userID string) ([]string, error)
	SaveSnapshot(ctx context.Context, snap *scribStreakSnapshot) error
	GetSnapshot(ctx context.Context, userID, snapshotID string) (*scribStreakSnapshot, error)
	GetReminder(ctx context.Context, userID, date string) (*scribStreakReminder, error)
	SaveReminder(ctx context.Context, rem *scribStreakReminder) error
}

func openScribStreakStore(store DataStore) ScribStreakStore {
	if ms, ok := store.(*mongoStore); ok && ms != nil && ms.db != nil {
		return newMongoScribStreakStore(ms.db)
	}
	return newMemoryScribStreakStore()
}

type memoryScribStreakStore struct {
	mu        sync.Mutex
	configs   map[string]*scribStreakConfig
	days      map[string]*scribStreakDay
	snapshots map[string]*scribStreakSnapshot
	reminders map[string]*scribStreakReminder
}

func newMemoryScribStreakStore() *memoryScribStreakStore {
	return &memoryScribStreakStore{
		configs:   map[string]*scribStreakConfig{},
		days:      map[string]*scribStreakDay{},
		snapshots: map[string]*scribStreakSnapshot{},
		reminders: map[string]*scribStreakReminder{},
	}
}

func (s *memoryScribStreakStore) GetConfig(_ context.Context, userID string) (*scribStreakConfig, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cfg, ok := s.configs[userID]
	if !ok {
		return &scribStreakConfig{UserID: userID, Items: []scribStreakItem{}}, nil
	}
	cp := *cfg
	cp.Items = append([]scribStreakItem{}, cfg.Items...)
	return &cp, nil
}

func (s *memoryScribStreakStore) SaveConfig(_ context.Context, cfg *scribStreakConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *cfg
	cp.Items = append([]scribStreakItem{}, cfg.Items...)
	s.configs[cfg.UserID] = &cp
	return nil
}

func (s *memoryScribStreakStore) ListEnabledReminderConfigs(_ context.Context) ([]scribStreakConfig, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]scribStreakConfig, 0)
	for _, cfg := range s.configs {
		if cfg.Enabled && cfg.ReminderEnabled && len(cfg.Items) > 0 {
			cp := *cfg
			cp.Items = append([]scribStreakItem{}, cfg.Items...)
			out = append(out, cp)
		}
	}
	return out, nil
}

func (s *memoryScribStreakStore) GetDay(_ context.Context, userID, date string) (*scribStreakDay, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	day, ok := s.days[scribStreakDayKey(userID, date)]
	if !ok {
		return nil, errNotFound
	}
	cp := *day
	cp.Assignments = append([]scribStreakDayAssignment{}, day.Assignments...)
	return &cp, nil
}

func (s *memoryScribStreakStore) SaveDay(_ context.Context, day *scribStreakDay) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *day
	cp.Assignments = append([]scribStreakDayAssignment{}, day.Assignments...)
	if cp.Key == "" {
		cp.Key = scribStreakDayKey(day.UserID, day.Date)
	}
	s.days[cp.Key] = &cp
	return nil
}

func (s *memoryScribStreakStore) ListCompletedDates(_ context.Context, userID string) ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]string, 0)
	prefix := userID + ":"
	for key, day := range s.days {
		if !day.Completed || len(key) < len(prefix) || key[:len(prefix)] != prefix {
			continue
		}
		out = append(out, day.Date)
	}
	return out, nil
}

func (s *memoryScribStreakStore) SaveSnapshot(_ context.Context, snap *scribStreakSnapshot) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *snap
	s.snapshots[snap.ID] = &cp
	return nil
}

func (s *memoryScribStreakStore) GetSnapshot(_ context.Context, userID, snapshotID string) (*scribStreakSnapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	snap, ok := s.snapshots[snapshotID]
	if !ok || snap.UserID != userID {
		return nil, errNotFound
	}
	cp := *snap
	return &cp, nil
}

func (s *memoryScribStreakStore) GetReminder(_ context.Context, userID, date string) (*scribStreakReminder, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rem, ok := s.reminders[scribStreakReminderKey(userID, date)]
	if !ok {
		return nil, errNotFound
	}
	cp := *rem
	return &cp, nil
}

func (s *memoryScribStreakStore) SaveReminder(_ context.Context, rem *scribStreakReminder) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *rem
	if cp.Key == "" {
		cp.Key = scribStreakReminderKey(rem.UserID, rem.Date)
	}
	s.reminders[cp.Key] = &cp
	return nil
}

type mongoScribStreakStore struct {
	db *mongo.Database
}

func newMongoScribStreakStore(db *mongo.Database) *mongoScribStreakStore {
	return &mongoScribStreakStore{db: db}
}

func (s *mongoScribStreakStore) configs() *mongo.Collection {
	return s.db.Collection(colScribStreakConfigs)
}
func (s *mongoScribStreakStore) days() *mongo.Collection {
	return s.db.Collection(colScribStreakDays)
}
func (s *mongoScribStreakStore) snapshots() *mongo.Collection {
	return s.db.Collection(colScribStreakSnapshots)
}
func (s *mongoScribStreakStore) reminders() *mongo.Collection {
	return s.db.Collection(colScribStreakReminders)
}

func (s *mongoScribStreakStore) GetConfig(ctx context.Context, userID string) (*scribStreakConfig, error) {
	var cfg scribStreakConfig
	err := s.configs().FindOne(ctx, bson.M{"_id": userID}).Decode(&cfg)
	if err == mongo.ErrNoDocuments {
		return &scribStreakConfig{UserID: userID, Items: []scribStreakItem{}}, nil
	}
	if err != nil {
		return nil, err
	}
	cfg.UserID = userID
	if cfg.Items == nil {
		cfg.Items = []scribStreakItem{}
	}
	return &cfg, nil
}

func (s *mongoScribStreakStore) SaveConfig(ctx context.Context, cfg *scribStreakConfig) error {
	if cfg.Items == nil {
		cfg.Items = []scribStreakItem{}
	}
	_, err := s.configs().ReplaceOne(ctx,
		bson.M{"_id": cfg.UserID},
		cfg,
		options.Replace().SetUpsert(true),
	)
	return err
}

func (s *mongoScribStreakStore) ListEnabledReminderConfigs(ctx context.Context) ([]scribStreakConfig, error) {
	cur, err := s.configs().Find(ctx, bson.M{
		"enabled":         true,
		"reminderEnabled": true,
		"items.0":         bson.M{"$exists": true},
	})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]scribStreakConfig, 0)
	for cur.Next(ctx) {
		var cfg scribStreakConfig
		if err := cur.Decode(&cfg); err != nil {
			return nil, err
		}
		if cfg.Items == nil {
			cfg.Items = []scribStreakItem{}
		}
		out = append(out, cfg)
	}
	return out, cur.Err()
}

func (s *mongoScribStreakStore) GetDay(ctx context.Context, userID, date string) (*scribStreakDay, error) {
	var day scribStreakDay
	err := s.days().FindOne(ctx, bson.M{"_id": scribStreakDayKey(userID, date)}).Decode(&day)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	day.UserID = userID
	if day.Assignments == nil {
		day.Assignments = []scribStreakDayAssignment{}
	}
	return &day, nil
}

func (s *mongoScribStreakStore) SaveDay(ctx context.Context, day *scribStreakDay) error {
	if day.Assignments == nil {
		day.Assignments = []scribStreakDayAssignment{}
	}
	day.Key = scribStreakDayKey(day.UserID, day.Date)
	_, err := s.days().ReplaceOne(ctx,
		bson.M{"_id": day.Key},
		day,
		options.Replace().SetUpsert(true),
	)
	return err
}

func (s *mongoScribStreakStore) ListCompletedDates(ctx context.Context, userID string) ([]string, error) {
	cur, err := s.days().Find(ctx, bson.M{"user_id": userID, "completed": true}, options.Find().SetProjection(bson.M{"date": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]string, 0)
	for cur.Next(ctx) {
		var row struct {
			Date string `bson:"date"`
		}
		if err := cur.Decode(&row); err != nil {
			return nil, err
		}
		if row.Date != "" {
			out = append(out, row.Date)
		}
	}
	return out, cur.Err()
}

func (s *mongoScribStreakStore) SaveSnapshot(ctx context.Context, snap *scribStreakSnapshot) error {
	_, err := s.snapshots().ReplaceOne(ctx,
		bson.M{"_id": snap.ID},
		snap,
		options.Replace().SetUpsert(true),
	)
	return err
}

func (s *mongoScribStreakStore) GetSnapshot(ctx context.Context, userID, snapshotID string) (*scribStreakSnapshot, error) {
	var snap scribStreakSnapshot
	err := s.snapshots().FindOne(ctx, bson.M{"_id": snapshotID, "user_id": userID}).Decode(&snap)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &snap, nil
}

func (s *mongoScribStreakStore) GetReminder(ctx context.Context, userID, date string) (*scribStreakReminder, error) {
	var rem scribStreakReminder
	err := s.reminders().FindOne(ctx, bson.M{"_id": scribStreakReminderKey(userID, date)}).Decode(&rem)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &rem, nil
}

func (s *mongoScribStreakStore) SaveReminder(ctx context.Context, rem *scribStreakReminder) error {
	rem.Key = scribStreakReminderKey(rem.UserID, rem.Date)
	_, err := s.reminders().ReplaceOne(ctx,
		bson.M{"_id": rem.Key},
		rem,
		options.Replace().SetUpsert(true),
	)
	return err
}
