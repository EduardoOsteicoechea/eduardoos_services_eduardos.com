package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *memoryHomescoolStore) MediaRoot() string { return s.mediaRoot }

func (s *mongoHomescoolStore) MediaRoot() string { return s.mediaRoot }

func (s *mongoHomescoolStore) materialsCol() *mongo.Collection {
	return s.db.Collection(colHomescoolMaterials)
}

func homescoolWriteHTMLFile(mediaRoot, rel string, html []byte) error {
	abs := filepath.Join(mediaRoot, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(abs), 0o750); err != nil {
		return err
	}
	tmp := abs + ".tmp"
	if err := os.WriteFile(tmp, html, 0o640); err != nil {
		return err
	}
	return os.Rename(tmp, abs)
}

func homescoolReadHTMLFile(mediaRoot, rel string) ([]byte, error) {
	abs := filepath.Join(mediaRoot, filepath.FromSlash(rel))
	return os.ReadFile(abs)
}

func homescoolRemoveMaterialFile(mediaRoot, rel string) error {
	rel = strings.TrimSpace(rel)
	if rel == "" {
		return nil
	}
	abs := filepath.Join(mediaRoot, filepath.FromSlash(rel))
	if err := os.Remove(abs); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (s *memoryHomescoolStore) EnsureWebAssets(_ context.Context, sourceDir string) error {
	if strings.TrimSpace(sourceDir) == "" {
		return nil
	}
	dest := filepath.Join(s.mediaRoot, filepath.FromSlash(homescoolWebAssetsRelativePath()))
	if err := os.MkdirAll(dest, 0o750); err != nil {
		return err
	}
	entries, err := os.ReadDir(sourceDir)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		src := filepath.Join(sourceDir, name)
		b, err := os.ReadFile(src)
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dest, name), b, 0o640); err != nil {
			return err
		}
	}
	return nil
}

func (s *mongoHomescoolStore) EnsureWebAssets(ctx context.Context, sourceDir string) error {
	mem := &memoryHomescoolStore{mediaRoot: s.mediaRoot}
	return mem.EnsureWebAssets(ctx, sourceDir)
}

func (s *memoryHomescoolStore) UpsertMaterial(_ context.Context, m HomescoolMaterial, body []byte) (HomescoolMaterial, error) {
	if err := homescoolValidateMaterialMeta(&m); err != nil {
		return HomescoolMaterial{}, err
	}
	if m.OwnerUserID == "" {
		return HomescoolMaterial{}, fmt.Errorf("owner required")
	}
	if len(body) == 0 {
		return HomescoolMaterial{}, fmt.Errorf("document body required")
	}
	if m.Format == eoschoolFormatName {
		doc, err := parseEoschoolDocument(body)
		if err != nil {
			return HomescoolMaterial{}, err
		}
		m.Cycle, m.Week, m.Day, m.Level = doc.Cycle, doc.Week, doc.Day, doc.Level
		m.Subject, m.Title = doc.Subject, doc.Title
		m.Slug = doc.Subject
		body, err = marshalEoschoolDocument(doc)
		if err != nil {
			return HomescoolMaterial{}, err
		}
	} else {
		body = []byte(homescoolRewriteWebAssetLinks(string(body)))
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := homescoolNow()
	var existing *HomescoolMaterial
	for id, cur := range s.materials {
		match := false
		if m.Format == eoschoolFormatName {
			match = cur.OwnerUserID == m.OwnerUserID &&
				cur.Cycle == m.Cycle && cur.Week == m.Week && cur.Day == m.Day &&
				cur.Level == m.Level && cur.Subject == m.Subject &&
				(cur.Format == eoschoolFormatName || cur.Format == "")
		} else {
			match = cur.OwnerUserID == m.OwnerUserID &&
				cur.Cycle == m.Cycle && cur.Week == m.Week && cur.Day == m.Day &&
				strings.EqualFold(cur.Subject, m.Subject) && strings.EqualFold(cur.Slug, m.Slug)
		}
		if match {
			cp := cur
			cp.ID = id
			existing = &cp
			break
		}
	}
	if existing != nil {
		m.ID = existing.ID
		m.CreatedAt = existing.CreatedAt
	} else if m.ID == "" {
		m.ID = randomID(16)
		m.CreatedAt = now
	}
	if m.CreatedAt == "" {
		m.CreatedAt = now
	}
	m.UpdatedAt = now
	rel := homescoolMaterialRelativePath(m.OwnerUserID, m)
	if m.Format == eoschoolFormatName {
		m.DocumentPath = rel
		m.HTMLPath = ""
	} else {
		m.HTMLPath = rel
	}
	if err := homescoolWriteHTMLFile(s.mediaRoot, rel, body); err != nil {
		return HomescoolMaterial{}, err
	}
	s.materials[m.ID] = m
	return cloneHomescoolMaterial(m), nil
}

func (s *mongoHomescoolStore) UpsertMaterial(ctx context.Context, m HomescoolMaterial, body []byte) (HomescoolMaterial, error) {
	if err := homescoolValidateMaterialMeta(&m); err != nil {
		return HomescoolMaterial{}, err
	}
	if m.OwnerUserID == "" {
		return HomescoolMaterial{}, fmt.Errorf("owner required")
	}
	if len(body) == 0 {
		return HomescoolMaterial{}, fmt.Errorf("document body required")
	}
	if m.Format == eoschoolFormatName {
		doc, err := parseEoschoolDocument(body)
		if err != nil {
			return HomescoolMaterial{}, err
		}
		m.Cycle, m.Week, m.Day, m.Level = doc.Cycle, doc.Week, doc.Day, doc.Level
		m.Subject, m.Title = doc.Subject, doc.Title
		m.Slug = doc.Subject
		body, err = marshalEoschoolDocument(doc)
		if err != nil {
			return HomescoolMaterial{}, err
		}
	} else {
		body = []byte(homescoolRewriteWebAssetLinks(string(body)))
	}
	now := homescoolNow()
	var existing HomescoolMaterial
	var found bool
	var err error
	if m.Format == eoschoolFormatName {
		existing, found, err = s.GetMaterialByEoschoolKey(ctx, m.OwnerUserID, m.Cycle, m.Week, m.Day, m.Level, m.Subject)
	} else {
		existing, found, err = s.GetMaterialByLogicKey(ctx, m.OwnerUserID, m.Cycle, m.Week, m.Day, m.Subject, m.Slug)
	}
	if err != nil {
		return HomescoolMaterial{}, err
	}
	if found {
		m.ID = existing.ID
		m.CreatedAt = existing.CreatedAt
	} else if m.ID == "" {
		m.ID = randomID(16)
		m.CreatedAt = now
	}
	if m.CreatedAt == "" {
		m.CreatedAt = now
	}
	m.UpdatedAt = now
	rel := homescoolMaterialRelativePath(m.OwnerUserID, m)
	if m.Format == eoschoolFormatName {
		m.DocumentPath = rel
		m.HTMLPath = ""
	} else {
		m.HTMLPath = rel
	}
	if err := homescoolWriteHTMLFile(s.mediaRoot, rel, body); err != nil {
		return HomescoolMaterial{}, err
	}
	_, err = s.materialsCol().ReplaceOne(ctx, bson.M{"_id": m.ID}, m, options.Replace().SetUpsert(true))
	if err != nil {
		return HomescoolMaterial{}, err
	}
	return cloneHomescoolMaterial(m), nil
}

func (s *memoryHomescoolStore) GetMaterial(_ context.Context, ownerUserID, id string) (HomescoolMaterial, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	m, ok := s.materials[id]
	if !ok || (ownerUserID != "" && m.OwnerUserID != ownerUserID) {
		return HomescoolMaterial{}, false, nil
	}
	return cloneHomescoolMaterial(m), true, nil
}

func (s *mongoHomescoolStore) GetMaterial(ctx context.Context, ownerUserID, id string) (HomescoolMaterial, bool, error) {
	filter := bson.M{"_id": id}
	if ownerUserID != "" {
		filter["owner_user_id"] = ownerUserID
	}
	var m HomescoolMaterial
	err := s.materialsCol().FindOne(ctx, filter).Decode(&m)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return HomescoolMaterial{}, false, nil
	}
	if err != nil {
		return HomescoolMaterial{}, false, err
	}
	return cloneHomescoolMaterial(m), true, nil
}

func (s *memoryHomescoolStore) GetMaterialByLogicKey(_ context.Context, ownerUserID string, cycle, week, day int, subject, slug string) (HomescoolMaterial, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	subject = strings.ToLower(strings.TrimSpace(subject))
	slug = strings.ToLower(strings.TrimSpace(slug))
	for _, m := range s.materials {
		if m.OwnerUserID == ownerUserID && m.Cycle == cycle && m.Week == week && m.Day == day &&
			strings.EqualFold(m.Subject, subject) && strings.EqualFold(m.Slug, slug) {
			return cloneHomescoolMaterial(m), true, nil
		}
	}
	return HomescoolMaterial{}, false, nil
}

func (s *mongoHomescoolStore) GetMaterialByLogicKey(ctx context.Context, ownerUserID string, cycle, week, day int, subject, slug string) (HomescoolMaterial, bool, error) {
	var m HomescoolMaterial
	err := s.materialsCol().FindOne(ctx, bson.M{
		"owner_user_id": ownerUserID,
		"cycle":         cycle,
		"week":          week,
		"day":           day,
		"subject":       strings.ToLower(strings.TrimSpace(subject)),
		"slug":          strings.ToLower(strings.TrimSpace(slug)),
	}).Decode(&m)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return HomescoolMaterial{}, false, nil
	}
	if err != nil {
		return HomescoolMaterial{}, false, err
	}
	return cloneHomescoolMaterial(m), true, nil
}

func (s *memoryHomescoolStore) ListMaterials(_ context.Context, ownerUserIDs []string, cycle int) ([]HomescoolMaterial, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	allow := map[string]struct{}{}
	for _, id := range ownerUserIDs {
		allow[id] = struct{}{}
	}
	out := make([]HomescoolMaterial, 0)
	for _, m := range s.materials {
		if len(allow) > 0 {
			if _, ok := allow[m.OwnerUserID]; !ok {
				continue
			}
		}
		if cycle > 0 && m.Cycle != cycle {
			continue
		}
		out = append(out, cloneHomescoolMaterial(m))
	}
	return out, nil
}

func (s *mongoHomescoolStore) ListMaterials(ctx context.Context, ownerUserIDs []string, cycle int) ([]HomescoolMaterial, error) {
	filter := bson.M{}
	switch len(ownerUserIDs) {
	case 0:
		// no owners → empty
		return []HomescoolMaterial{}, nil
	case 1:
		filter["owner_user_id"] = ownerUserIDs[0]
	default:
		filter["owner_user_id"] = bson.M{"$in": ownerUserIDs}
	}
	if cycle > 0 {
		filter["cycle"] = cycle
	}
	cur, err := s.materialsCol().Find(ctx, filter, options.Find().SetSort(bson.D{
		{Key: "cycle", Value: 1}, {Key: "week", Value: 1}, {Key: "subject", Value: 1}, {Key: "day", Value: 1}, {Key: "title", Value: 1},
	}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]HomescoolMaterial, 0)
	for cur.Next(ctx) {
		var m HomescoolMaterial
		if err := cur.Decode(&m); err != nil {
			return nil, err
		}
		out = append(out, cloneHomescoolMaterial(m))
	}
	return out, cur.Err()
}

func (s *memoryHomescoolStore) GetMaterialByEoschoolKey(_ context.Context, ownerUserID string, cycle, week, day, level int, subject string) (HomescoolMaterial, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	subject = eoschoolNormalizeSubject(subject)
	for _, m := range s.materials {
		if m.OwnerUserID == ownerUserID && m.Cycle == cycle && m.Week == week && m.Day == day &&
			m.Level == level && m.Subject == subject &&
			(m.Format == eoschoolFormatName || m.Format == "") {
			return cloneHomescoolMaterial(m), true, nil
		}
	}
	return HomescoolMaterial{}, false, nil
}

func (s *mongoHomescoolStore) GetMaterialByEoschoolKey(ctx context.Context, ownerUserID string, cycle, week, day, level int, subject string) (HomescoolMaterial, bool, error) {
	var m HomescoolMaterial
	err := s.materialsCol().FindOne(ctx, bson.M{
		"owner_user_id": ownerUserID,
		"cycle":         cycle,
		"week":          week,
		"day":           day,
		"level":         level,
		"subject":       eoschoolNormalizeSubject(subject),
		"format":        eoschoolFormatName,
	}).Decode(&m)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return HomescoolMaterial{}, false, nil
	}
	if err != nil {
		return HomescoolMaterial{}, false, err
	}
	return cloneHomescoolMaterial(m), true, nil
}

func (s *memoryHomescoolStore) ReadMaterialHTML(_ context.Context, m HomescoolMaterial) ([]byte, error) {
	return homescoolReadHTMLFile(s.mediaRoot, m.HTMLPath)
}

func (s *mongoHomescoolStore) ReadMaterialHTML(ctx context.Context, m HomescoolMaterial) ([]byte, error) {
	return homescoolReadHTMLFile(s.mediaRoot, m.HTMLPath)
}

func (s *memoryHomescoolStore) ReadMaterialDocument(_ context.Context, m HomescoolMaterial) ([]byte, error) {
	path := m.DocumentPath
	if path == "" {
		path = m.HTMLPath
	}
	return homescoolReadHTMLFile(s.mediaRoot, path)
}

func (s *mongoHomescoolStore) ReadMaterialDocument(ctx context.Context, m HomescoolMaterial) ([]byte, error) {
	path := m.DocumentPath
	if path == "" {
		path = m.HTMLPath
	}
	return homescoolReadHTMLFile(s.mediaRoot, path)
}

func (s *memoryHomescoolStore) DeleteMaterial(_ context.Context, ownerUserID, id string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	m, ok := s.materials[id]
	if !ok || (ownerUserID != "" && m.OwnerUserID != ownerUserID) {
		return false, nil
	}
	rel := m.DocumentPath
	if rel == "" {
		rel = m.HTMLPath
	}
	delete(s.materials, id)
	if err := homescoolRemoveMaterialFile(s.mediaRoot, rel); err != nil {
		return true, err
	}
	return true, nil
}

func (s *mongoHomescoolStore) DeleteMaterial(ctx context.Context, ownerUserID, id string) (bool, error) {
	m, found, err := s.GetMaterial(ctx, ownerUserID, id)
	if err != nil {
		return false, err
	}
	if !found {
		return false, nil
	}
	filter := bson.M{"_id": id}
	if ownerUserID != "" {
		filter["owner_user_id"] = ownerUserID
	}
	res, err := s.materialsCol().DeleteOne(ctx, filter)
	if err != nil {
		return false, err
	}
	if res.DeletedCount == 0 {
		return false, nil
	}
	rel := m.DocumentPath
	if rel == "" {
		rel = m.HTMLPath
	}
	if err := homescoolRemoveMaterialFile(s.mediaRoot, rel); err != nil {
		return true, err
	}
	return true, nil
}
