package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	colEvoiceProjects = "evoice_projects"
	colEvoiceJobs     = "evoice_jobs"
	colEvoiceShares   = "evoice_shares"
)

type evoiceMetaStore interface {
	UpsertProject(ctx context.Context, p *evoiceProjectDoc) error
	ListProjects(ctx context.Context, userID string) ([]*evoiceProjectDoc, error)
	GetProject(ctx context.Context, userID, name string) (*evoiceProjectDoc, error)
	DeleteProject(ctx context.Context, userID, name string) error

	UpsertJob(ctx context.Context, job *evoiceJobStatus) error
	GetJob(ctx context.Context, id string) (*evoiceJobStatus, error)

	UpsertShare(ctx context.Context, share *evoicePlaylistShare) error
	GetShareByTokenHash(ctx context.Context, tokenHash string) (*evoicePlaylistShare, error)
}

type evoiceFS struct {
	root string
}

func newEvoiceFS(root string) *evoiceFS {
	return &evoiceFS{root: root}
}

func (fs *evoiceFS) abs(parts ...string) (string, error) {
	joined := filepath.Join(append([]string{fs.root}, parts...)...)
	clean := filepath.Clean(joined)
	rootClean := filepath.Clean(fs.root)
	rel, err := filepath.Rel(rootClean, clean)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("path escape")
	}
	return clean, nil
}

func (fs *evoiceFS) projectDir(userID, project string) (string, error) {
	return fs.abs(userID, sanitizeEvoiceProject(project))
}

func (fs *evoiceFS) docsDir(userID, project string) (string, error) {
	return fs.abs(userID, sanitizeEvoiceProject(project), "docs")
}

func (fs *evoiceFS) audiosDir(userID, project string) (string, error) {
	return fs.abs(userID, sanitizeEvoiceProject(project), "audios")
}

func (fs *evoiceFS) ensureProject(userID, project string) error {
	docs, err := fs.docsDir(userID, project)
	if err != nil {
		return err
	}
	audios, err := fs.audiosDir(userID, project)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(docs, 0o750); err != nil {
		return err
	}
	return os.MkdirAll(audios, 0o750)
}

func (fs *evoiceFS) removeProject(userID, project string) error {
	dir, err := fs.projectDir(userID, project)
	if err != nil {
		return err
	}
	return os.RemoveAll(dir)
}

func (fs *evoiceFS) putFile(userID, project, kind, name string, body []byte) error {
	var dir string
	var err error
	switch kind {
	case "docs":
		dir, err = fs.docsDir(userID, project)
	case "audios":
		dir, err = fs.audiosDir(userID, project)
	default:
		return fmt.Errorf("invalid kind")
	}
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return err
	}
	path := filepath.Join(dir, sanitizeEvoiceFileName(name))
	tmp := path + ".tmp-" + randomID(8)
	if err := os.WriteFile(tmp, body, 0o640); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (fs *evoiceFS) deleteFile(userID, project, kind, name string) error {
	var dir string
	var err error
	switch kind {
	case "docs":
		dir, err = fs.docsDir(userID, project)
	case "audios":
		dir, err = fs.audiosDir(userID, project)
	default:
		return fmt.Errorf("invalid kind")
	}
	if err != nil {
		return err
	}
	path := filepath.Join(dir, sanitizeEvoiceFileName(name))
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (fs *evoiceFS) listKind(userID, project, kind string) ([]evoiceObjectMeta, error) {
	var dir string
	var err error
	switch kind {
	case "docs":
		dir, err = fs.docsDir(userID, project)
	case "audios":
		dir, err = fs.audiosDir(userID, project)
	default:
		return nil, fmt.Errorf("invalid kind")
	}
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []evoiceObjectMeta{}, nil
		}
		return nil, err
	}
	out := make([]evoiceObjectMeta, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if name == ".keep" {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		if kind == "audios" && info.Size() <= 0 {
			continue
		}
		meta := evoiceObjectMeta{
			Name: name,
			Key:  evoiceRelKey(userID, project, kind, name),
			Size: info.Size(),
			URL: fmt.Sprintf("/api/evoice/file/%s/%s/%s?name=%s",
				userID, project, kind, pathEscapeQuery(name)),
			LastModified: info.ModTime().UTC().Format(time.RFC3339),
		}
		out = append(out, meta)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func pathEscapeQuery(name string) string {
	return strings.ReplaceAll(name, " ", "%20")
}

func (fs *evoiceFS) openFile(userID, project, kind, name string) (*os.File, os.FileInfo, error) {
	var dir string
	var err error
	switch kind {
	case "docs":
		dir, err = fs.docsDir(userID, project)
	case "audios":
		dir, err = fs.audiosDir(userID, project)
	default:
		return nil, nil, fmt.Errorf("invalid kind")
	}
	if err != nil {
		return nil, nil, err
	}
	path := filepath.Join(dir, sanitizeEvoiceFileName(name))
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

func (fs *evoiceFS) readFile(userID, project, kind, name string) ([]byte, error) {
	f, _, err := fs.openFile(userID, project, kind, name)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return io.ReadAll(io.LimitReader(f, evoiceMaxUpload+1))
}

// --- memory meta ---

type memoryEvoiceStore struct {
	mu       sync.Mutex
	projects map[string]*evoiceProjectDoc // userID/name
	jobs     map[string]*evoiceJobStatus
	shares   map[string]*evoicePlaylistShare // token hash
}

func newMemoryEvoiceStore() *memoryEvoiceStore {
	return &memoryEvoiceStore{
		projects: map[string]*evoiceProjectDoc{},
		jobs:     map[string]*evoiceJobStatus{},
		shares:   map[string]*evoicePlaylistShare{},
	}
}

func evoiceProjectKey(userID, name string) string {
	return userID + "/" + sanitizeEvoiceProject(name)
}

func (s *memoryEvoiceStore) UpsertProject(_ context.Context, p *evoiceProjectDoc) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *p
	s.projects[evoiceProjectKey(p.UserID, p.Name)] = &cp
	return nil
}

func (s *memoryEvoiceStore) ListProjects(_ context.Context, userID string) ([]*evoiceProjectDoc, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]*evoiceProjectDoc, 0)
	for _, p := range s.projects {
		if p.UserID == userID {
			cp := *p
			out = append(out, &cp)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out, nil
}

func (s *memoryEvoiceStore) GetProject(_ context.Context, userID, name string) (*evoiceProjectDoc, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.projects[evoiceProjectKey(userID, name)]
	if !ok {
		return nil, errNotFound
	}
	cp := *p
	return &cp, nil
}

func (s *memoryEvoiceStore) DeleteProject(_ context.Context, userID, name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.projects, evoiceProjectKey(userID, name))
	return nil
}

func cloneEvoiceJob(j *evoiceJobStatus) *evoiceJobStatus {
	if j == nil {
		return nil
	}
	cp := *j
	cp.Logs = append([]string(nil), j.Logs...)
	cp.OnlyFiles = append([]string(nil), j.OnlyFiles...)
	cp.Steps = append([]evoiceJobStep(nil), j.Steps...)
	cp.Files = append([]evoiceJobFileProgress(nil), j.Files...)
	if j.Stats != nil {
		st := *j.Stats
		cp.Stats = &st
	}
	return &cp
}

func (s *memoryEvoiceStore) UpsertJob(_ context.Context, job *evoiceJobStatus) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.jobs[job.ID] = cloneEvoiceJob(job)
	return nil
}

func (s *memoryEvoiceStore) GetJob(_ context.Context, id string) (*evoiceJobStatus, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	j, ok := s.jobs[id]
	if !ok {
		return nil, errNotFound
	}
	return cloneEvoiceJob(j), nil
}

func (s *memoryEvoiceStore) UpsertShare(_ context.Context, share *evoicePlaylistShare) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *share
	cp.Files = append([]evoicePlaylistShareFile(nil), share.Files...)
	s.shares[share.TokenHash] = &cp
	return nil
}

func (s *memoryEvoiceStore) GetShareByTokenHash(_ context.Context, tokenHash string) (*evoicePlaylistShare, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sh, ok := s.shares[tokenHash]
	if !ok {
		return nil, errNotFound
	}
	cp := *sh
	cp.Files = append([]evoicePlaylistShareFile(nil), sh.Files...)
	return &cp, nil
}

// --- mongo meta ---

type mongoEvoiceStore struct {
	db *mongo.Database
}

func newMongoEvoiceStore(db *mongo.Database) *mongoEvoiceStore {
	return &mongoEvoiceStore{db: db}
}

func (s *mongoEvoiceStore) projects() *mongo.Collection { return s.db.Collection(colEvoiceProjects) }
func (s *mongoEvoiceStore) jobs() *mongo.Collection     { return s.db.Collection(colEvoiceJobs) }
func (s *mongoEvoiceStore) shares() *mongo.Collection   { return s.db.Collection(colEvoiceShares) }

func (s *mongoEvoiceStore) UpsertProject(ctx context.Context, p *evoiceProjectDoc) error {
	_, err := s.projects().ReplaceOne(ctx, bson.M{"_id": p.ID}, p, options.Replace().SetUpsert(true))
	return err
}

func (s *mongoEvoiceStore) ListProjects(ctx context.Context, userID string) ([]*evoiceProjectDoc, error) {
	cur, err := s.projects().Find(ctx, bson.M{"user_id": userID}, options.Find().SetSort(bson.D{{Key: "name", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var out []*evoiceProjectDoc
	for cur.Next(ctx) {
		var p evoiceProjectDoc
		if err := cur.Decode(&p); err != nil {
			return nil, err
		}
		out = append(out, &p)
	}
	return out, cur.Err()
}

func (s *mongoEvoiceStore) GetProject(ctx context.Context, userID, name string) (*evoiceProjectDoc, error) {
	var p evoiceProjectDoc
	err := s.projects().FindOne(ctx, bson.M{"user_id": userID, "name": sanitizeEvoiceProject(name)}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *mongoEvoiceStore) DeleteProject(ctx context.Context, userID, name string) error {
	_, err := s.projects().DeleteOne(ctx, bson.M{"user_id": userID, "name": sanitizeEvoiceProject(name)})
	return err
}

func (s *mongoEvoiceStore) UpsertJob(ctx context.Context, job *evoiceJobStatus) error {
	job.UpdatedAt = time.Now().UTC()
	_, err := s.jobs().ReplaceOne(ctx, bson.M{"_id": job.ID}, job, options.Replace().SetUpsert(true))
	return err
}

func (s *mongoEvoiceStore) GetJob(ctx context.Context, id string) (*evoiceJobStatus, error) {
	var job evoiceJobStatus
	err := s.jobs().FindOne(ctx, bson.M{"_id": id}).Decode(&job)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &job, nil
}

func (s *mongoEvoiceStore) UpsertShare(ctx context.Context, share *evoicePlaylistShare) error {
	_, err := s.shares().ReplaceOne(ctx, bson.M{"_id": share.ID}, share, options.Replace().SetUpsert(true))
	return err
}

func (s *mongoEvoiceStore) GetShareByTokenHash(ctx context.Context, tokenHash string) (*evoicePlaylistShare, error) {
	var share evoicePlaylistShare
	err := s.shares().FindOne(ctx, bson.M{"token_hash": tokenHash}).Decode(&share)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	return &share, nil
}

func newEvoiceMetaFromStore(store DataStore) evoiceMetaStore {
	if ms, ok := store.(*mongoStore); ok {
		return newMongoEvoiceStore(ms.db)
	}
	return newMemoryEvoiceStore()
}
