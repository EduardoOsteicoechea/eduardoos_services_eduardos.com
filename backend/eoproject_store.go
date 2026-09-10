package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)


type eoprojectStore interface {
	CreateProject(ctx context.Context, p *eoprojectProject) error
	UpdateProject(ctx context.Context, p *eoprojectProject) error
	GetProject(ctx context.Context, id string) (*eoprojectProject, error)
	ListProjectsByUser(ctx context.Context, userID string) ([]*eoprojectProject, error)
	DeleteProject(ctx context.Context, id string) error

	CreateStage(ctx context.Context, s *eoprojectStage) error
	UpdateStage(ctx context.Context, s *eoprojectStage) error
	GetStage(ctx context.Context, id string) (*eoprojectStage, error)
	ListStages(ctx context.Context, projectID string) ([]*eoprojectStage, error)
	DeleteStage(ctx context.Context, id string) error
	DeleteStagesByProject(ctx context.Context, projectID string) error

	CreatePhoto(ctx context.Context, p *eoprojectPhoto) error
	GetPhoto(ctx context.Context, id string) (*eoprojectPhoto, error)
	ListPhotos(ctx context.Context, stageID string) ([]*eoprojectPhoto, error)
	DeletePhoto(ctx context.Context, id string) error
	DeletePhotosByProject(ctx context.Context, projectID string) error
	DeletePhotosByStage(ctx context.Context, stageID string) error

	CreateIFC(ctx context.Context, v *eoprojectIFCVersion) error
	GetIFC(ctx context.Context, id string) (*eoprojectIFCVersion, error)
	ListIFC(ctx context.Context, stageID string) ([]*eoprojectIFCVersion, error)
	NextIFCVersion(ctx context.Context, stageID string) (int, error)
	DeleteIFC(ctx context.Context, id string) error
	DeleteIFCByProject(ctx context.Context, projectID string) error
	DeleteIFCByStage(ctx context.Context, stageID string) error

	CreateShare(ctx context.Context, s *eoprojectShare) error
	GetShareByTokenHash(ctx context.Context, tokenHash string) (*eoprojectShare, error)
	ListSharesByProject(ctx context.Context, projectID string) ([]*eoprojectShare, error)
	DeleteShare(ctx context.Context, id string) error
	DeleteSharesByProject(ctx context.Context, projectID string) error
}

type eoprojectFS struct {
	root string
}

func newEoprojectFS(root string) *eoprojectFS {
	return &eoprojectFS{root: root}
}

func (fs *eoprojectFS) abs(parts ...string) (string, error) {
	joined := filepath.Join(append([]string{fs.root}, parts...)...)
	clean := filepath.Clean(joined)
	rootClean := filepath.Clean(fs.root)
	rel, err := filepath.Rel(rootClean, clean)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("path escape")
	}
	return clean, nil
}

func (fs *eoprojectFS) stageDir(userID, projectID, stageID string) (string, error) {
	return fs.abs(userID, projectID, "stages", stageID)
}

func (fs *eoprojectFS) photosDir(userID, projectID, stageID string) (string, error) {
	return fs.abs(userID, projectID, "stages", stageID, "photos")
}

func (fs *eoprojectFS) ifcDir(userID, projectID, stageID string) (string, error) {
	return fs.abs(userID, projectID, "stages", stageID, "ifc")
}

func (fs *eoprojectFS) ensureStage(userID, projectID, stageID string) error {
	photos, err := fs.photosDir(userID, projectID, stageID)
	if err != nil {
		return err
	}
	ifc, err := fs.ifcDir(userID, projectID, stageID)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(photos, 0o750); err != nil {
		return err
	}
	return os.MkdirAll(ifc, 0o750)
}

func (fs *eoprojectFS) removeProject(userID, projectID string) error {
	dir, err := fs.abs(userID, projectID)
	if err != nil {
		return err
	}
	return os.RemoveAll(dir)
}

func (fs *eoprojectFS) removeStage(userID, projectID, stageID string) error {
	dir, err := fs.stageDir(userID, projectID, stageID)
	if err != nil {
		return err
	}
	return os.RemoveAll(dir)
}

func (fs *eoprojectFS) putPhoto(userID, projectID, stageID, storageName string, body []byte) error {
	dir, err := fs.photosDir(userID, projectID, stageID)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return err
	}
	path := filepath.Join(dir, filepath.Base(storageName))
	tmp := path + ".tmp-" + randomID(8)
	if err := os.WriteFile(tmp, body, 0o640); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (fs *eoprojectFS) putIFC(userID, projectID, stageID, storageName string, body []byte) error {
	dir, err := fs.ifcDir(userID, projectID, stageID)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return err
	}
	path := filepath.Join(dir, filepath.Base(storageName))
	tmp := path + ".tmp-" + randomID(8)
	if err := os.WriteFile(tmp, body, 0o640); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (fs *eoprojectFS) deletePhoto(userID, projectID, stageID, storageName string) error {
	dir, err := fs.photosDir(userID, projectID, stageID)
	if err != nil {
		return err
	}
	path := filepath.Join(dir, filepath.Base(storageName))
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (fs *eoprojectFS) deleteIFC(userID, projectID, stageID, storageName string) error {
	dir, err := fs.ifcDir(userID, projectID, stageID)
	if err != nil {
		return err
	}
	path := filepath.Join(dir, filepath.Base(storageName))
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (fs *eoprojectFS) openPhoto(userID, projectID, stageID, storageName string) (*os.File, os.FileInfo, error) {
	dir, err := fs.photosDir(userID, projectID, stageID)
	if err != nil {
		return nil, nil, err
	}
	path := filepath.Join(dir, filepath.Base(storageName))
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, nil, err
	}
	return f, info, nil
}

func (fs *eoprojectFS) openIFC(userID, projectID, stageID, storageName string) (*os.File, os.FileInfo, error) {
	dir, err := fs.ifcDir(userID, projectID, stageID)
	if err != nil {
		return nil, nil, err
	}
	path := filepath.Join(dir, filepath.Base(storageName))
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, nil, err
	}
	return f, info, nil
}

// --- memory ---

type memoryEoprojectStore struct {
	mu       sync.Mutex
	projects map[string]*eoprojectProject
	stages   map[string]*eoprojectStage
	photos   map[string]*eoprojectPhoto
	ifc      map[string]*eoprojectIFCVersion
	shares   map[string]*eoprojectShare
}

func newMemoryEoprojectStore() *memoryEoprojectStore {
	return &memoryEoprojectStore{
		projects: map[string]*eoprojectProject{},
		stages:   map[string]*eoprojectStage{},
		photos:   map[string]*eoprojectPhoto{},
		ifc:      map[string]*eoprojectIFCVersion{},
		shares:   map[string]*eoprojectShare{},
	}
}

func (s *memoryEoprojectStore) CreateProject(_ context.Context, p *eoprojectProject) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *p
	s.projects[p.ID] = &cp
	return nil
}

func (s *memoryEoprojectStore) UpdateProject(_ context.Context, p *eoprojectProject) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.projects[p.ID]; !ok {
		return errNotFound
	}
	cp := *p
	s.projects[p.ID] = &cp
	return nil
}

func (s *memoryEoprojectStore) GetProject(_ context.Context, id string) (*eoprojectProject, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.projects[id]
	if !ok {
		return nil, errNotFound
	}
	cp := *p
	return &cp, nil
}

func (s *memoryEoprojectStore) ListProjectsByUser(_ context.Context, userID string) ([]*eoprojectProject, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eoprojectProject, 0)
	for _, p := range s.projects {
		if p.UserID == userID {
			cp := *p
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].UpdatedAt.After(out[j].UpdatedAt) })
	return out, nil
}

func (s *memoryEoprojectStore) DeleteProject(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.projects, id)
	return nil
}

func (s *memoryEoprojectStore) CreateStage(_ context.Context, st *eoprojectStage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *st
	s.stages[st.ID] = &cp
	return nil
}

func (s *memoryEoprojectStore) UpdateStage(_ context.Context, st *eoprojectStage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.stages[st.ID]; !ok {
		return errNotFound
	}
	cp := *st
	s.stages[st.ID] = &cp
	return nil
}

func (s *memoryEoprojectStore) GetStage(_ context.Context, id string) (*eoprojectStage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	st, ok := s.stages[id]
	if !ok {
		return nil, errNotFound
	}
	cp := *st
	return &cp, nil
}

func (s *memoryEoprojectStore) ListStages(_ context.Context, projectID string) ([]*eoprojectStage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eoprojectStage, 0)
	for _, st := range s.stages {
		if st.ProjectID == projectID {
			cp := *st
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].SortOrder != out[j].SortOrder {
			return out[i].SortOrder < out[j].SortOrder
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *memoryEoprojectStore) DeleteStage(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.stages, id)
	return nil
}

func (s *memoryEoprojectStore) DeleteStagesByProject(_ context.Context, projectID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, st := range s.stages {
		if st.ProjectID == projectID {
			delete(s.stages, id)
		}
	}
	return nil
}

func (s *memoryEoprojectStore) CreatePhoto(_ context.Context, p *eoprojectPhoto) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *p
	s.photos[p.ID] = &cp
	return nil
}

func (s *memoryEoprojectStore) GetPhoto(_ context.Context, id string) (*eoprojectPhoto, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.photos[id]
	if !ok {
		return nil, errNotFound
	}
	cp := *p
	return &cp, nil
}

func (s *memoryEoprojectStore) ListPhotos(_ context.Context, stageID string) ([]*eoprojectPhoto, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eoprojectPhoto, 0)
	for _, p := range s.photos {
		if p.StageID == stageID {
			cp := *p
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (s *memoryEoprojectStore) DeletePhoto(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.photos, id)
	return nil
}

func (s *memoryEoprojectStore) DeletePhotosByProject(_ context.Context, projectID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, p := range s.photos {
		if p.ProjectID == projectID {
			delete(s.photos, id)
		}
	}
	return nil
}

func (s *memoryEoprojectStore) DeletePhotosByStage(_ context.Context, stageID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, p := range s.photos {
		if p.StageID == stageID {
			delete(s.photos, id)
		}
	}
	return nil
}

func (s *memoryEoprojectStore) CreateIFC(_ context.Context, v *eoprojectIFCVersion) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *v
	s.ifc[v.ID] = &cp
	return nil
}

func (s *memoryEoprojectStore) GetIFC(_ context.Context, id string) (*eoprojectIFCVersion, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.ifc[id]
	if !ok {
		return nil, errNotFound
	}
	cp := *v
	return &cp, nil
}

func (s *memoryEoprojectStore) ListIFC(_ context.Context, stageID string) ([]*eoprojectIFCVersion, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eoprojectIFCVersion, 0)
	for _, v := range s.ifc {
		if v.StageID == stageID {
			cp := *v
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Version > out[j].Version })
	return out, nil
}

func (s *memoryEoprojectStore) NextIFCVersion(_ context.Context, stageID string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	max := 0
	for _, v := range s.ifc {
		if v.StageID == stageID && v.Version > max {
			max = v.Version
		}
	}
	return max + 1, nil
}

func (s *memoryEoprojectStore) DeleteIFC(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.ifc, id)
	return nil
}

func (s *memoryEoprojectStore) DeleteIFCByProject(_ context.Context, projectID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, v := range s.ifc {
		if v.ProjectID == projectID {
			delete(s.ifc, id)
		}
	}
	return nil
}

func (s *memoryEoprojectStore) DeleteIFCByStage(_ context.Context, stageID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, v := range s.ifc {
		if v.StageID == stageID {
			delete(s.ifc, id)
		}
	}
	return nil
}

func (s *memoryEoprojectStore) CreateShare(_ context.Context, sh *eoprojectShare) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *sh
	s.shares[sh.ID] = &cp
	return nil
}

func (s *memoryEoprojectStore) GetShareByTokenHash(_ context.Context, tokenHash string) (*eoprojectShare, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, sh := range s.shares {
		if sh.TokenHash == tokenHash {
			cp := *sh
			return &cp, nil
		}
	}
	return nil, errNotFound
}

func (s *memoryEoprojectStore) ListSharesByProject(_ context.Context, projectID string) ([]*eoprojectShare, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*eoprojectShare, 0)
	for _, sh := range s.shares {
		if sh.ProjectID == projectID {
			cp := *sh
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	return out, nil
}

func (s *memoryEoprojectStore) DeleteShare(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.shares, id)
	return nil
}

func (s *memoryEoprojectStore) DeleteSharesByProject(_ context.Context, projectID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, sh := range s.shares {
		if sh.ProjectID == projectID {
			delete(s.shares, id)
		}
	}
	return nil
}

// --- mongo ---

type mongoEoprojectStore struct {
	db *mongo.Database
}

func newMongoEoprojectStore(db *mongo.Database) *mongoEoprojectStore {
	return &mongoEoprojectStore{db: db}
}

func (s *mongoEoprojectStore) projects() *mongo.Collection {
	return s.db.Collection(colEoprojectProjects)
}
func (s *mongoEoprojectStore) stages() *mongo.Collection {
	return s.db.Collection(colEoprojectStages)
}
func (s *mongoEoprojectStore) photos() *mongo.Collection {
	return s.db.Collection(colEoprojectPhotos)
}
func (s *mongoEoprojectStore) ifc() *mongo.Collection {
	return s.db.Collection(colEoprojectIFC)
}
func (s *mongoEoprojectStore) shares() *mongo.Collection {
	return s.db.Collection(colEoprojectShares)
}

func (s *mongoEoprojectStore) CreateProject(ctx context.Context, p *eoprojectProject) error {
	_, err := s.projects().InsertOne(ctx, p)
	return err
}

func (s *mongoEoprojectStore) UpdateProject(ctx context.Context, p *eoprojectProject) error {
	res, err := s.projects().ReplaceOne(ctx, bson.M{"_id": p.ID}, p)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEoprojectStore) GetProject(ctx context.Context, id string) (*eoprojectProject, error) {
	var p eoprojectProject
	err := s.projects().FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *mongoEoprojectStore) ListProjectsByUser(ctx context.Context, userID string) ([]*eoprojectProject, error) {
	cur, err := s.projects().Find(ctx, bson.M{"user_id": userID}, options.Find().SetSort(bson.D{{Key: "updated_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eoprojectProject
	for cur.Next(ctx) {
		var p eoprojectProject
		if err := cur.Decode(&p); err != nil {
			return nil, err
		}
		out = append(out, &p)
	}
	return out, cur.Err()
}

func (s *mongoEoprojectStore) DeleteProject(ctx context.Context, id string) error {
	_, err := s.projects().DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (s *mongoEoprojectStore) CreateStage(ctx context.Context, st *eoprojectStage) error {
	_, err := s.stages().InsertOne(ctx, st)
	return err
}

func (s *mongoEoprojectStore) UpdateStage(ctx context.Context, st *eoprojectStage) error {
	res, err := s.stages().ReplaceOne(ctx, bson.M{"_id": st.ID}, st)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errNotFound
	}
	return nil
}

func (s *mongoEoprojectStore) GetStage(ctx context.Context, id string) (*eoprojectStage, error) {
	var st eoprojectStage
	err := s.stages().FindOne(ctx, bson.M{"_id": id}).Decode(&st)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &st, nil
}

func (s *mongoEoprojectStore) ListStages(ctx context.Context, projectID string) ([]*eoprojectStage, error) {
	cur, err := s.stages().Find(ctx, bson.M{"project_id": projectID}, options.Find().SetSort(bson.D{
		{Key: "sort_order", Value: 1},
		{Key: "created_at", Value: 1},
	}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eoprojectStage
	for cur.Next(ctx) {
		var st eoprojectStage
		if err := cur.Decode(&st); err != nil {
			return nil, err
		}
		out = append(out, &st)
	}
	return out, cur.Err()
}

func (s *mongoEoprojectStore) DeleteStage(ctx context.Context, id string) error {
	_, err := s.stages().DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (s *mongoEoprojectStore) DeleteStagesByProject(ctx context.Context, projectID string) error {
	_, err := s.stages().DeleteMany(ctx, bson.M{"project_id": projectID})
	return err
}

func (s *mongoEoprojectStore) CreatePhoto(ctx context.Context, p *eoprojectPhoto) error {
	_, err := s.photos().InsertOne(ctx, p)
	return err
}

func (s *mongoEoprojectStore) GetPhoto(ctx context.Context, id string) (*eoprojectPhoto, error) {
	var p eoprojectPhoto
	err := s.photos().FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *mongoEoprojectStore) ListPhotos(ctx context.Context, stageID string) ([]*eoprojectPhoto, error) {
	cur, err := s.photos().Find(ctx, bson.M{"stage_id": stageID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eoprojectPhoto
	for cur.Next(ctx) {
		var p eoprojectPhoto
		if err := cur.Decode(&p); err != nil {
			return nil, err
		}
		out = append(out, &p)
	}
	return out, cur.Err()
}

func (s *mongoEoprojectStore) DeletePhoto(ctx context.Context, id string) error {
	_, err := s.photos().DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (s *mongoEoprojectStore) DeletePhotosByProject(ctx context.Context, projectID string) error {
	_, err := s.photos().DeleteMany(ctx, bson.M{"project_id": projectID})
	return err
}

func (s *mongoEoprojectStore) DeletePhotosByStage(ctx context.Context, stageID string) error {
	_, err := s.photos().DeleteMany(ctx, bson.M{"stage_id": stageID})
	return err
}

func (s *mongoEoprojectStore) CreateIFC(ctx context.Context, v *eoprojectIFCVersion) error {
	_, err := s.ifc().InsertOne(ctx, v)
	return err
}

func (s *mongoEoprojectStore) GetIFC(ctx context.Context, id string) (*eoprojectIFCVersion, error) {
	var v eoprojectIFCVersion
	err := s.ifc().FindOne(ctx, bson.M{"_id": id}).Decode(&v)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (s *mongoEoprojectStore) ListIFC(ctx context.Context, stageID string) ([]*eoprojectIFCVersion, error) {
	cur, err := s.ifc().Find(ctx, bson.M{"stage_id": stageID}, options.Find().SetSort(bson.D{{Key: "version", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eoprojectIFCVersion
	for cur.Next(ctx) {
		var v eoprojectIFCVersion
		if err := cur.Decode(&v); err != nil {
			return nil, err
		}
		out = append(out, &v)
	}
	return out, cur.Err()
}

func (s *mongoEoprojectStore) NextIFCVersion(ctx context.Context, stageID string) (int, error) {
	opts := options.FindOne().SetSort(bson.D{{Key: "version", Value: -1}})
	var v eoprojectIFCVersion
	err := s.ifc().FindOne(ctx, bson.M{"stage_id": stageID}, opts).Decode(&v)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return 1, nil
	}
	if err != nil {
		return 0, err
	}
	return v.Version + 1, nil
}

func (s *mongoEoprojectStore) DeleteIFC(ctx context.Context, id string) error {
	_, err := s.ifc().DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (s *mongoEoprojectStore) DeleteIFCByProject(ctx context.Context, projectID string) error {
	_, err := s.ifc().DeleteMany(ctx, bson.M{"project_id": projectID})
	return err
}

func (s *mongoEoprojectStore) DeleteIFCByStage(ctx context.Context, stageID string) error {
	_, err := s.ifc().DeleteMany(ctx, bson.M{"stage_id": stageID})
	return err
}

func (s *mongoEoprojectStore) CreateShare(ctx context.Context, sh *eoprojectShare) error {
	_, err := s.shares().InsertOne(ctx, sh)
	return err
}

func (s *mongoEoprojectStore) GetShareByTokenHash(ctx context.Context, tokenHash string) (*eoprojectShare, error) {
	var sh eoprojectShare
	err := s.shares().FindOne(ctx, bson.M{"token_hash": tokenHash}).Decode(&sh)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &sh, nil
}

func (s *mongoEoprojectStore) ListSharesByProject(ctx context.Context, projectID string) ([]*eoprojectShare, error) {
	cur, err := s.shares().Find(ctx, bson.M{"project_id": projectID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*eoprojectShare
	for cur.Next(ctx) {
		var sh eoprojectShare
		if err := cur.Decode(&sh); err != nil {
			return nil, err
		}
		out = append(out, &sh)
	}
	return out, cur.Err()
}

func (s *mongoEoprojectStore) DeleteShare(ctx context.Context, id string) error {
	_, err := s.shares().DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (s *mongoEoprojectStore) DeleteSharesByProject(ctx context.Context, projectID string) error {
	_, err := s.shares().DeleteMany(ctx, bson.M{"project_id": projectID})
	return err
}

func newEoprojectStoreFromDataStore(store DataStore) eoprojectStore {
	if ms, ok := store.(*mongoStore); ok {
		return newMongoEoprojectStore(ms.db)
	}
	return newMemoryEoprojectStore()
}
