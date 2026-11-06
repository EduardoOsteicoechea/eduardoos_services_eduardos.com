package main

import (
	"context"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type eeyesStore interface {
	InsertPairing(ctx context.Context, p *eeyesPairing) error
	PairingByID(ctx context.Context, id string) (*eeyesPairing, error)
	PairingByCode1Hash(ctx context.Context, hash string) (*eeyesPairing, error)
	UpdatePairing(ctx context.Context, p *eeyesPairing) error

	InsertDevice(ctx context.Context, d *eeyesDevice) error
	DeviceByID(ctx context.Context, id string) (*eeyesDevice, error)
	DeviceByTokenHash(ctx context.Context, hash string) (*eeyesDevice, error)
	DevicesByOwner(ctx context.Context, ownerID string) ([]*eeyesDevice, error)
	UpdateDevice(ctx context.Context, d *eeyesDevice) error

	InsertTask(ctx context.Context, t *eeyesTask) error
	TaskByID(ctx context.Context, id string) (*eeyesTask, error)
	TasksByOwner(ctx context.Context, ownerID string) ([]*eeyesTask, error)
	TasksByDevice(ctx context.Context, deviceID string) ([]*eeyesTask, error)
	UpdateTask(ctx context.Context, t *eeyesTask) error
	DeleteTask(ctx context.Context, id string) error

	InsertMedia(ctx context.Context, m *eeyesMedia) error
	UpdateMedia(ctx context.Context, m *eeyesMedia) error
	MediaByID(ctx context.Context, id string) (*eeyesMedia, error)
	MediaByClientID(ctx context.Context, deviceID, clientMediaID string) (*eeyesMedia, error)
	MediaByTask(ctx context.Context, taskID string) ([]*eeyesMedia, error)
	MediaByOwner(ctx context.Context, ownerID string) ([]*eeyesMedia, error)
}

func newEeyesStoreFromDataStore(store DataStore) eeyesStore {
	if ms, ok := store.(*mongoStore); ok && ms != nil && ms.db != nil {
		return newMongoEeyesStore(ms.db)
	}
	return newMemoryEeyesStore()
}

// --- memory ---

type memoryEeyesStore struct {
	mu       sync.Mutex
	pairings map[string]*eeyesPairing
	devices  map[string]*eeyesDevice
	tasks    map[string]*eeyesTask
	media    map[string]*eeyesMedia
}

func newMemoryEeyesStore() *memoryEeyesStore {
	return &memoryEeyesStore{
		pairings: map[string]*eeyesPairing{},
		devices:  map[string]*eeyesDevice{},
		tasks:    map[string]*eeyesTask{},
		media:    map[string]*eeyesMedia{},
	}
}

func cloneEeyesPairing(p *eeyesPairing) *eeyesPairing {
	if p == nil {
		return nil
	}
	cp := *p
	if p.ConsumedAt != nil {
		t := *p.ConsumedAt
		cp.ConsumedAt = &t
	}
	return &cp
}

func cloneEeyesDevice(d *eeyesDevice) *eeyesDevice {
	if d == nil {
		return nil
	}
	cp := *d
	if d.RevokedAt != nil {
		t := *d.RevokedAt
		cp.RevokedAt = &t
	}
	return &cp
}

func cloneEeyesTask(t *eeyesTask) *eeyesTask {
	if t == nil {
		return nil
	}
	cp := *t
	cp.Reminders = append([]time.Time(nil), t.Reminders...)
	cp.NotifiedKeys = append([]string(nil), t.NotifiedKeys...)
	if t.NotifyAt != nil {
		x := *t.NotifyAt
		cp.NotifyAt = &x
	}
	if t.DueAt != nil {
		x := *t.DueAt
		cp.DueAt = &x
	}
	if t.StartedAt != nil {
		x := *t.StartedAt
		cp.StartedAt = &x
	}
	if t.CompletedAt != nil {
		x := *t.CompletedAt
		cp.CompletedAt = &x
	}
	return &cp
}

func cloneEeyesMedia(m *eeyesMedia) *eeyesMedia {
	if m == nil {
		return nil
	}
	cp := *m
	return &cp
}

func (s *memoryEeyesStore) InsertPairing(_ context.Context, p *eeyesPairing) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pairings[p.ID] = cloneEeyesPairing(p)
	return nil
}

func (s *memoryEeyesStore) PairingByID(_ context.Context, id string) (*eeyesPairing, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.pairings[id]
	if !ok {
		return nil, errNotFound
	}
	return cloneEeyesPairing(p), nil
}

func (s *memoryEeyesStore) PairingByCode1Hash(_ context.Context, hash string) (*eeyesPairing, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, p := range s.pairings {
		if p.Code1Hash == hash {
			return cloneEeyesPairing(p), nil
		}
	}
	return nil, errNotFound
}

func (s *memoryEeyesStore) UpdatePairing(_ context.Context, p *eeyesPairing) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.pairings[p.ID]; !ok {
		return errNotFound
	}
	s.pairings[p.ID] = cloneEeyesPairing(p)
	return nil
}

func (s *memoryEeyesStore) InsertDevice(_ context.Context, d *eeyesDevice) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.devices[d.ID] = cloneEeyesDevice(d)
	return nil
}

func (s *memoryEeyesStore) DeviceByID(_ context.Context, id string) (*eeyesDevice, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	d, ok := s.devices[id]
	if !ok {
		return nil, errNotFound
	}
	return cloneEeyesDevice(d), nil
}

func (s *memoryEeyesStore) DeviceByTokenHash(_ context.Context, hash string) (*eeyesDevice, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, d := range s.devices {
		if d.TokenHash == hash {
			return cloneEeyesDevice(d), nil
		}
	}
	return nil, errNotFound
}

func (s *memoryEeyesStore) DevicesByOwner(_ context.Context, ownerID string) ([]*eeyesDevice, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eeyesDevice, 0)
	for _, d := range s.devices {
		if d.OwnerID == ownerID {
			out = append(out, cloneEeyesDevice(d))
		}
	}
	return out, nil
}

func (s *memoryEeyesStore) UpdateDevice(_ context.Context, d *eeyesDevice) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.devices[d.ID]; !ok {
		return errNotFound
	}
	s.devices[d.ID] = cloneEeyesDevice(d)
	return nil
}

func (s *memoryEeyesStore) InsertTask(_ context.Context, t *eeyesTask) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tasks[t.ID] = cloneEeyesTask(t)
	return nil
}

func (s *memoryEeyesStore) TaskByID(_ context.Context, id string) (*eeyesTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.tasks[id]
	if !ok {
		return nil, errNotFound
	}
	return cloneEeyesTask(t), nil
}

func (s *memoryEeyesStore) TasksByOwner(_ context.Context, ownerID string) ([]*eeyesTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eeyesTask, 0)
	for _, t := range s.tasks {
		if t.OwnerID == ownerID {
			out = append(out, cloneEeyesTask(t))
		}
	}
	return out, nil
}

func (s *memoryEeyesStore) TasksByDevice(_ context.Context, deviceID string) ([]*eeyesTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eeyesTask, 0)
	for _, t := range s.tasks {
		if t.DeviceID == deviceID {
			out = append(out, cloneEeyesTask(t))
		}
	}
	return out, nil
}

func (s *memoryEeyesStore) UpdateTask(_ context.Context, t *eeyesTask) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.tasks[t.ID]; !ok {
		return errNotFound
	}
	s.tasks[t.ID] = cloneEeyesTask(t)
	return nil
}

func (s *memoryEeyesStore) DeleteTask(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.tasks, id)
	return nil
}

func (s *memoryEeyesStore) InsertMedia(_ context.Context, m *eeyesMedia) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, existing := range s.media {
		if existing.DeviceID == m.DeviceID && existing.ClientMediaID == m.ClientMediaID {
			return errConflict
		}
	}
	s.media[m.ID] = cloneEeyesMedia(m)
	return nil
}

func (s *memoryEeyesStore) UpdateMedia(_ context.Context, m *eeyesMedia) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.media[m.ID]; !ok {
		return errNotFound
	}
	s.media[m.ID] = cloneEeyesMedia(m)
	return nil
}

func (s *memoryEeyesStore) MediaByID(_ context.Context, id string) (*eeyesMedia, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	m, ok := s.media[id]
	if !ok {
		return nil, errNotFound
	}
	return cloneEeyesMedia(m), nil
}

func (s *memoryEeyesStore) MediaByClientID(_ context.Context, deviceID, clientMediaID string) (*eeyesMedia, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, m := range s.media {
		if m.DeviceID == deviceID && m.ClientMediaID == clientMediaID {
			return cloneEeyesMedia(m), nil
		}
	}
	return nil, errNotFound
}

func (s *memoryEeyesStore) MediaByTask(_ context.Context, taskID string) ([]*eeyesMedia, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eeyesMedia, 0)
	for _, m := range s.media {
		if m.TaskID == taskID {
			out = append(out, cloneEeyesMedia(m))
		}
	}
	return out, nil
}

func (s *memoryEeyesStore) MediaByOwner(_ context.Context, ownerID string) ([]*eeyesMedia, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eeyesMedia, 0)
	for _, m := range s.media {
		if m.OwnerID == ownerID {
			out = append(out, cloneEeyesMedia(m))
		}
	}
	return out, nil
}

// --- mongo ---

type mongoEeyesStore struct {
	db *mongo.Database
}

func newMongoEeyesStore(db *mongo.Database) *mongoEeyesStore {
	return &mongoEeyesStore{db: db}
}

func (s *mongoEeyesStore) pairings() *mongo.Collection { return s.db.Collection(colEeyesPairings) }
func (s *mongoEeyesStore) devices() *mongo.Collection  { return s.db.Collection(colEeyesDevices) }
func (s *mongoEeyesStore) tasks() *mongo.Collection    { return s.db.Collection(colEeyesTasks) }
func (s *mongoEeyesStore) media() *mongo.Collection    { return s.db.Collection(colEeyesMedia) }

func (s *mongoEeyesStore) InsertPairing(ctx context.Context, p *eeyesPairing) error {
	_, err := s.pairings().InsertOne(ctx, p)
	return err
}

func (s *mongoEeyesStore) PairingByID(ctx context.Context, id string) (*eeyesPairing, error) {
	var p eeyesPairing
	err := s.pairings().FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *mongoEeyesStore) PairingByCode1Hash(ctx context.Context, hash string) (*eeyesPairing, error) {
	var p eeyesPairing
	err := s.pairings().FindOne(ctx, bson.M{"code1_hash": hash}).Decode(&p)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *mongoEeyesStore) UpdatePairing(ctx context.Context, p *eeyesPairing) error {
	res, err := s.pairings().ReplaceOne(ctx, bson.M{"_id": p.ID}, p)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEeyesStore) InsertDevice(ctx context.Context, d *eeyesDevice) error {
	_, err := s.devices().InsertOne(ctx, d)
	return err
}

func (s *mongoEeyesStore) DeviceByID(ctx context.Context, id string) (*eeyesDevice, error) {
	var d eeyesDevice
	err := s.devices().FindOne(ctx, bson.M{"_id": id}).Decode(&d)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *mongoEeyesStore) DeviceByTokenHash(ctx context.Context, hash string) (*eeyesDevice, error) {
	var d eeyesDevice
	err := s.devices().FindOne(ctx, bson.M{"token_hash": hash}).Decode(&d)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *mongoEeyesStore) DevicesByOwner(ctx context.Context, ownerID string) ([]*eeyesDevice, error) {
	cur, err := s.devices().Find(ctx, bson.M{"owner_id": ownerID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eeyesDevice
	for cur.Next(ctx) {
		var d eeyesDevice
		if err := cur.Decode(&d); err != nil {
			return nil, err
		}
		out = append(out, &d)
	}
	return out, cur.Err()
}

func (s *mongoEeyesStore) UpdateDevice(ctx context.Context, d *eeyesDevice) error {
	res, err := s.devices().ReplaceOne(ctx, bson.M{"_id": d.ID}, d)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEeyesStore) InsertTask(ctx context.Context, t *eeyesTask) error {
	_, err := s.tasks().InsertOne(ctx, t)
	return err
}

func (s *mongoEeyesStore) TaskByID(ctx context.Context, id string) (*eeyesTask, error) {
	var t eeyesTask
	err := s.tasks().FindOne(ctx, bson.M{"_id": id}).Decode(&t)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *mongoEeyesStore) TasksByOwner(ctx context.Context, ownerID string) ([]*eeyesTask, error) {
	cur, err := s.tasks().Find(ctx, bson.M{"owner_id": ownerID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eeyesTask
	for cur.Next(ctx) {
		var t eeyesTask
		if err := cur.Decode(&t); err != nil {
			return nil, err
		}
		out = append(out, &t)
	}
	return out, cur.Err()
}

func (s *mongoEeyesStore) TasksByDevice(ctx context.Context, deviceID string) ([]*eeyesTask, error) {
	cur, err := s.tasks().Find(ctx, bson.M{"device_id": deviceID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eeyesTask
	for cur.Next(ctx) {
		var t eeyesTask
		if err := cur.Decode(&t); err != nil {
			return nil, err
		}
		out = append(out, &t)
	}
	return out, cur.Err()
}

func (s *mongoEeyesStore) UpdateTask(ctx context.Context, t *eeyesTask) error {
	res, err := s.tasks().ReplaceOne(ctx, bson.M{"_id": t.ID}, t)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEeyesStore) DeleteTask(ctx context.Context, id string) error {
	_, err := s.tasks().DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (s *mongoEeyesStore) InsertMedia(ctx context.Context, m *eeyesMedia) error {
	_, err := s.media().InsertOne(ctx, m)
	if mongo.IsDuplicateKeyError(err) {
		return errConflict
	}
	return err
}

func (s *mongoEeyesStore) UpdateMedia(ctx context.Context, m *eeyesMedia) error {
	res, err := s.media().ReplaceOne(ctx, bson.M{"_id": m.ID}, m)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEeyesStore) MediaByID(ctx context.Context, id string) (*eeyesMedia, error) {
	var m eeyesMedia
	err := s.media().FindOne(ctx, bson.M{"_id": id}).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *mongoEeyesStore) MediaByClientID(ctx context.Context, deviceID, clientMediaID string) (*eeyesMedia, error) {
	var m eeyesMedia
	err := s.media().FindOne(ctx, bson.M{"device_id": deviceID, "client_media_id": clientMediaID}).Decode(&m)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *mongoEeyesStore) MediaByTask(ctx context.Context, taskID string) ([]*eeyesMedia, error) {
	cur, err := s.media().Find(ctx, bson.M{"task_id": taskID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eeyesMedia
	for cur.Next(ctx) {
		var m eeyesMedia
		if err := cur.Decode(&m); err != nil {
			return nil, err
		}
		out = append(out, &m)
	}
	return out, cur.Err()
}

func (s *mongoEeyesStore) MediaByOwner(ctx context.Context, ownerID string) ([]*eeyesMedia, error) {
	cur, err := s.media().Find(ctx, bson.M{"owner_id": ownerID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eeyesMedia
	for cur.Next(ctx) {
		var m eeyesMedia
		if err := cur.Decode(&m); err != nil {
			return nil, err
		}
		out = append(out, &m)
	}
	return out, cur.Err()
}
