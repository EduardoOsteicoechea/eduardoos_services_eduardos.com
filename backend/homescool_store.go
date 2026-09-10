package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	colHomescoolLinks     = "homescool_links"
	colHomescoolTasks     = "homescool_tasks"
	colHomescoolTemplates = "homescool_task_templates"
	colHomescoolCatalogs  = "homescool_catalogs"
)

var errHomescoolDuplicate = errors.New("student already registered")

// HomescoolStore persists links, templates, tasks, catalogs + media folder markers.
type HomescoolStore interface {
	IsLinkedStudent(ctx context.Context, studentUserID string) bool

	CreateLink(ctx context.Context, link HomescoolLink) (HomescoolLink, error)
	GetLinkByTeacherAndSlug(ctx context.Context, teacherUserID, studentSlug string) (HomescoolLink, bool, error)
	GetLinkByTeacherAndStudent(ctx context.Context, teacherUserID, studentUserID string) (HomescoolLink, bool, error)
	ListLinksByTeacher(ctx context.Context, teacherUserID string) ([]HomescoolLink, error)
	ListLinksByStudent(ctx context.Context, studentUserID string) ([]HomescoolLink, error)

	EnsureStudentFolders(ctx context.Context, teacherUserID, studentUserID string) error
	ListFolder(ctx context.Context, teacherUserID, studentUserID, folder string) ([]HomescoolFolderObject, error)

	CreateTemplate(ctx context.Context, tpl HomescoolTaskTemplate) (HomescoolTaskTemplate, error)
	UpdateTemplate(ctx context.Context, tpl HomescoolTaskTemplate) (HomescoolTaskTemplate, error)
	GetTemplate(ctx context.Context, teacherUserID, id string) (HomescoolTaskTemplate, bool, error)
	ListTemplates(ctx context.Context, teacherUserID, period, studyArea string) ([]HomescoolTaskTemplate, error)

	CreateTask(ctx context.Context, task HomescoolAssignedTask) (HomescoolAssignedTask, error)
	UpdateTask(ctx context.Context, task HomescoolAssignedTask) (HomescoolAssignedTask, error)
	GetTask(ctx context.Context, teacherUserID, studentUserID, id string) (HomescoolAssignedTask, bool, error)
	ListTasksByPair(ctx context.Context, teacherUserID, studentUserID string) ([]HomescoolAssignedTask, error)

	CreateCatalogEntry(ctx context.Context, entry HomescoolCatalogEntry) (HomescoolCatalogEntry, error)
	ListCatalogEntries(ctx context.Context, teacherUserID, kind string) ([]HomescoolCatalogEntry, error)
}

func openHomescoolStore(store DataStore, mediaRoot string) HomescoolStore {
	if ms, ok := store.(*mongoStore); ok && ms != nil && ms.db != nil {
		return &mongoHomescoolStore{db: ms.db, mediaRoot: mediaRoot}
	}
	return newMemoryHomescoolStore(mediaRoot)
}

type memoryHomescoolStore struct {
	mu        sync.RWMutex
	mediaRoot string
	links     map[string]HomescoolLink
	templates map[string]HomescoolTaskTemplate
	tasks     map[string]HomescoolAssignedTask
	catalogs  map[string]HomescoolCatalogEntry
}

func newMemoryHomescoolStore(mediaRoot string) *memoryHomescoolStore {
	return &memoryHomescoolStore{
		mediaRoot: mediaRoot,
		links:     map[string]HomescoolLink{},
		templates: map[string]HomescoolTaskTemplate{},
		tasks:     map[string]HomescoolAssignedTask{},
		catalogs:  map[string]HomescoolCatalogEntry{},
	}
}

func homescoolPairKey(teacherUserID, studentUserID string) string {
	return teacherUserID + "|" + studentUserID
}

func (s *memoryHomescoolStore) IsLinkedStudent(_ context.Context, studentUserID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, l := range s.links {
		if l.StudentUserID == studentUserID {
			return true
		}
	}
	return false
}

func (s *memoryHomescoolStore) CreateLink(_ context.Context, link HomescoolLink) (HomescoolLink, error) {
	if link.TeacherUserID == "" || link.StudentUserID == "" {
		return HomescoolLink{}, fmt.Errorf("teacher and student required")
	}
	if link.TeacherUserID == link.StudentUserID {
		return HomescoolLink{}, fmt.Errorf("cannot register yourself as a student")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	key := homescoolPairKey(link.TeacherUserID, link.StudentUserID)
	if _, ok := s.links[key]; ok {
		return HomescoolLink{}, errHomescoolDuplicate
	}
	if link.ID == "" {
		link.ID = randomID(16)
	}
	if link.StudentSlug == "" {
		link.StudentSlug = homescoolStudentSlug(link.StudentEmail)
	}
	if link.S3Prefix == "" {
		link.S3Prefix = homescoolRelationshipPrefix(link.TeacherUserID, link.StudentUserID)
	}
	if len(link.Folders) == 0 {
		link.Folders = append([]string(nil), homescoolFolderNames...)
	}
	if link.CreatedAt == "" {
		link.CreatedAt = homescoolNow()
	}
	s.links[key] = cloneHomescoolLink(link)
	return cloneHomescoolLink(link), nil
}

func (s *memoryHomescoolStore) GetLinkByTeacherAndSlug(_ context.Context, teacherUserID, studentSlug string) (HomescoolLink, bool, error) {
	studentSlug = strings.Trim(strings.TrimSpace(studentSlug), "/")
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, l := range s.links {
		if l.TeacherUserID == teacherUserID && l.StudentSlug == studentSlug {
			return cloneHomescoolLink(l), true, nil
		}
	}
	return HomescoolLink{}, false, nil
}

func (s *memoryHomescoolStore) GetLinkByTeacherAndStudent(_ context.Context, teacherUserID, studentUserID string) (HomescoolLink, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	l, ok := s.links[homescoolPairKey(teacherUserID, studentUserID)]
	if !ok {
		return HomescoolLink{}, false, nil
	}
	return cloneHomescoolLink(l), true, nil
}

func (s *memoryHomescoolStore) ListLinksByTeacher(_ context.Context, teacherUserID string) ([]HomescoolLink, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]HomescoolLink, 0)
	for _, l := range s.links {
		if l.TeacherUserID == teacherUserID {
			out = append(out, cloneHomescoolLink(l))
		}
	}
	return out, nil
}

func (s *memoryHomescoolStore) ListLinksByStudent(_ context.Context, studentUserID string) ([]HomescoolLink, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]HomescoolLink, 0)
	for _, l := range s.links {
		if l.StudentUserID == studentUserID {
			out = append(out, cloneHomescoolLink(l))
		}
	}
	return out, nil
}

func (s *memoryHomescoolStore) EnsureStudentFolders(_ context.Context, teacherUserID, studentUserID string) error {
	for _, folder := range homescoolFolderNames {
		key := homescoolKeepKey(teacherUserID, studentUserID, folder)
		abs := filepath.Join(s.mediaRoot, filepath.FromSlash(key))
		if err := os.MkdirAll(filepath.Dir(abs), 0750); err != nil {
			return err
		}
		if err := os.WriteFile(abs, []byte{}, 0640); err != nil {
			return err
		}
	}
	return nil
}

func (s *memoryHomescoolStore) ListFolder(_ context.Context, teacherUserID, studentUserID, folder string) ([]HomescoolFolderObject, error) {
	if !homescoolIsValidFolder(folder) {
		return nil, fmt.Errorf("invalid folder")
	}
	prefix := homescoolFolderPrefix(teacherUserID, studentUserID, folder) + "/"
	root := filepath.Join(s.mediaRoot, filepath.FromSlash(strings.TrimSuffix(prefix, "/")))
	entries, err := os.ReadDir(root)
	if err != nil {
		if os.IsNotExist(err) {
			return []HomescoolFolderObject{}, nil
		}
		return nil, err
	}
	out := make([]HomescoolFolderObject, 0)
	for _, e := range entries {
		name := e.Name()
		if name == ".keep" || e.IsDir() {
			continue
		}
		info, _ := e.Info()
		size := int64(0)
		if info != nil {
			size = info.Size()
		}
		out = append(out, HomescoolFolderObject{
			Key:  prefix + name,
			Name: name,
			Size: size,
		})
	}
	return out, nil
}

func (s *memoryHomescoolStore) CreateTemplate(_ context.Context, tpl HomescoolTaskTemplate) (HomescoolTaskTemplate, error) {
	tpl.Name = strings.TrimSpace(tpl.Name)
	if tpl.TeacherUserID == "" || tpl.Name == "" {
		return HomescoolTaskTemplate{}, fmt.Errorf("teacher and name required")
	}
	if tpl.ID == "" {
		tpl.ID = randomID(16)
	}
	tpl.StudyAreas = homescoolNormalizeStudyAreas(tpl.StudyAreas, tpl.StudyArea)
	tpl.StudyArea = homescoolFormatStudyAreas(tpl.StudyAreas)
	tpl.MaxScore = homescoolNormalizeMaxScore(tpl.MaxScore)
	now := homescoolNow()
	if tpl.CreatedAt == "" {
		tpl.CreatedAt = now
	}
	tpl.UpdatedAt = now
	s.mu.Lock()
	s.templates[tpl.TeacherUserID+"|"+tpl.ID] = cloneHomescoolTemplate(tpl)
	s.mu.Unlock()
	return cloneHomescoolTemplate(tpl), nil
}

func (s *memoryHomescoolStore) UpdateTemplate(_ context.Context, tpl HomescoolTaskTemplate) (HomescoolTaskTemplate, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := tpl.TeacherUserID + "|" + tpl.ID
	existing, ok := s.templates[key]
	if !ok {
		return HomescoolTaskTemplate{}, fmt.Errorf("template not found")
	}
	tpl.CreatedAt = existing.CreatedAt
	tpl.StudyAreas = homescoolNormalizeStudyAreas(tpl.StudyAreas, tpl.StudyArea)
	tpl.StudyArea = homescoolFormatStudyAreas(tpl.StudyAreas)
	tpl.MaxScore = homescoolNormalizeMaxScore(tpl.MaxScore)
	tpl.UpdatedAt = homescoolNow()
	s.templates[key] = cloneHomescoolTemplate(tpl)
	return cloneHomescoolTemplate(tpl), nil
}

func (s *memoryHomescoolStore) GetTemplate(_ context.Context, teacherUserID, id string) (HomescoolTaskTemplate, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	tpl, ok := s.templates[teacherUserID+"|"+id]
	if !ok {
		return HomescoolTaskTemplate{}, false, nil
	}
	return cloneHomescoolTemplate(tpl), true, nil
}

func (s *memoryHomescoolStore) ListTemplates(_ context.Context, teacherUserID, period, studyArea string) ([]HomescoolTaskTemplate, error) {
	period = strings.TrimSpace(period)
	studyArea = strings.TrimSpace(studyArea)
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]HomescoolTaskTemplate, 0)
	for _, tpl := range s.templates {
		if tpl.TeacherUserID != teacherUserID {
			continue
		}
		cp := cloneHomescoolTemplate(tpl)
		if period != "" && !strings.EqualFold(cp.Period, period) {
			continue
		}
		if studyArea != "" && !homescoolHasStudyArea(cp.StudyAreas, studyArea) {
			continue
		}
		out = append(out, cp)
	}
	return out, nil
}

func (s *memoryHomescoolStore) CreateTask(_ context.Context, task HomescoolAssignedTask) (HomescoolAssignedTask, error) {
	task.Name = strings.TrimSpace(task.Name)
	if task.TeacherUserID == "" || task.StudentUserID == "" || task.Name == "" {
		return HomescoolAssignedTask{}, fmt.Errorf("teacher, student, and name required")
	}
	if task.ID == "" {
		task.ID = randomID(16)
	}
	task.StudentSlug = homescoolStudentSlug(task.StudentEmail)
	task.StudyAreas = homescoolNormalizeStudyAreas(task.StudyAreas, task.StudyArea)
	task.StudyArea = homescoolFormatStudyAreas(task.StudyAreas)
	task.Frequency = homescoolNormalizeFrequency(&task.Frequency)
	task.MaxScore = homescoolNormalizeMaxScore(task.MaxScore)
	if task.Status == "" {
		task.Status = homescoolTaskPending
	}
	if !homescoolIsValidTaskStatus(task.Status) {
		return HomescoolAssignedTask{}, fmt.Errorf("invalid status")
	}
	now := homescoolNow()
	if task.CreatedAt == "" {
		task.CreatedAt = now
	}
	task.UpdatedAt = now
	s.mu.Lock()
	s.tasks[task.TeacherUserID+"|"+task.StudentUserID+"|"+task.ID] = cloneHomescoolTask(task)
	s.mu.Unlock()
	return cloneHomescoolTask(task), nil
}

func (s *memoryHomescoolStore) UpdateTask(_ context.Context, task HomescoolAssignedTask) (HomescoolAssignedTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := task.TeacherUserID + "|" + task.StudentUserID + "|" + task.ID
	existing, ok := s.tasks[key]
	if !ok {
		return HomescoolAssignedTask{}, fmt.Errorf("task not found")
	}
	task.CreatedAt = existing.CreatedAt
	task.StudentSlug = homescoolStudentSlug(task.StudentEmail)
	task.StudyAreas = homescoolNormalizeStudyAreas(task.StudyAreas, task.StudyArea)
	task.StudyArea = homescoolFormatStudyAreas(task.StudyAreas)
	task.MaxScore = homescoolNormalizeMaxScore(task.MaxScore)
	task.Frequency = homescoolNormalizeFrequency(&task.Frequency)
	if !homescoolIsValidTaskStatus(task.Status) {
		return HomescoolAssignedTask{}, fmt.Errorf("invalid status")
	}
	task.UpdatedAt = homescoolNow()
	s.tasks[key] = cloneHomescoolTask(task)
	return cloneHomescoolTask(task), nil
}

func (s *memoryHomescoolStore) GetTask(_ context.Context, teacherUserID, studentUserID, id string) (HomescoolAssignedTask, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	task, ok := s.tasks[teacherUserID+"|"+studentUserID+"|"+id]
	if !ok {
		return HomescoolAssignedTask{}, false, nil
	}
	return cloneHomescoolTask(task), true, nil
}

func (s *memoryHomescoolStore) ListTasksByPair(_ context.Context, teacherUserID, studentUserID string) ([]HomescoolAssignedTask, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]HomescoolAssignedTask, 0)
	for _, task := range s.tasks {
		if task.TeacherUserID == teacherUserID && task.StudentUserID == studentUserID {
			out = append(out, cloneHomescoolTask(task))
		}
	}
	return out, nil
}

func (s *memoryHomescoolStore) CreateCatalogEntry(_ context.Context, entry HomescoolCatalogEntry) (HomescoolCatalogEntry, error) {
	entry.Kind = strings.ToLower(strings.TrimSpace(entry.Kind))
	entry.Label = strings.TrimSpace(entry.Label)
	if entry.TeacherUserID == "" || !homescoolIsValidCatalogKind(entry.Kind) || entry.Label == "" {
		return HomescoolCatalogEntry{}, fmt.Errorf("kind must be period or study_area")
	}
	if entry.ID == "" {
		entry.ID = randomID(16)
	}
	if entry.CreatedAt == "" {
		entry.CreatedAt = homescoolNow()
	}
	s.mu.Lock()
	s.catalogs[entry.TeacherUserID+"|"+entry.Kind+"|"+entry.ID] = entry
	s.mu.Unlock()
	return entry, nil
}

func (s *memoryHomescoolStore) ListCatalogEntries(_ context.Context, teacherUserID, kind string) ([]HomescoolCatalogEntry, error) {
	kind = strings.ToLower(strings.TrimSpace(kind))
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]HomescoolCatalogEntry, 0)
	for _, e := range s.catalogs {
		if e.TeacherUserID != teacherUserID {
			continue
		}
		if kind != "" && e.Kind != kind {
			continue
		}
		out = append(out, e)
	}
	return out, nil
}

// mongoHomescoolStore — thin Mongo wrapper; media folders still on disk.
type mongoHomescoolStore struct {
	db        *mongo.Database
	mediaRoot string
}

func (s *mongoHomescoolStore) links() *mongo.Collection     { return s.db.Collection(colHomescoolLinks) }
func (s *mongoHomescoolStore) templates() *mongo.Collection { return s.db.Collection(colHomescoolTemplates) }
func (s *mongoHomescoolStore) tasks() *mongo.Collection     { return s.db.Collection(colHomescoolTasks) }
func (s *mongoHomescoolStore) catalogs() *mongo.Collection  { return s.db.Collection(colHomescoolCatalogs) }

func (s *mongoHomescoolStore) IsLinkedStudent(ctx context.Context, studentUserID string) bool {
	n, err := s.links().CountDocuments(ctx, bson.M{"student_user_id": studentUserID}, options.Count().SetLimit(1))
	return err == nil && n > 0
}

func (s *mongoHomescoolStore) CreateLink(ctx context.Context, link HomescoolLink) (HomescoolLink, error) {
	if link.ID == "" {
		link.ID = randomID(16)
	}
	if link.StudentSlug == "" {
		link.StudentSlug = homescoolStudentSlug(link.StudentEmail)
	}
	if link.S3Prefix == "" {
		link.S3Prefix = homescoolRelationshipPrefix(link.TeacherUserID, link.StudentUserID)
	}
	if len(link.Folders) == 0 {
		link.Folders = append([]string(nil), homescoolFolderNames...)
	}
	if link.CreatedAt == "" {
		link.CreatedAt = homescoolNow()
	}
	_, err := s.links().InsertOne(ctx, link)
	if isDup(err) {
		return HomescoolLink{}, errHomescoolDuplicate
	}
	return cloneHomescoolLink(link), err
}

func (s *mongoHomescoolStore) GetLinkByTeacherAndSlug(ctx context.Context, teacherUserID, studentSlug string) (HomescoolLink, bool, error) {
	var link HomescoolLink
	err := s.links().FindOne(ctx, bson.M{"teacher_user_id": teacherUserID, "student_slug": studentSlug}).Decode(&link)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return HomescoolLink{}, false, nil
	}
	if err != nil {
		return HomescoolLink{}, false, err
	}
	return cloneHomescoolLink(link), true, nil
}

func (s *mongoHomescoolStore) GetLinkByTeacherAndStudent(ctx context.Context, teacherUserID, studentUserID string) (HomescoolLink, bool, error) {
	var link HomescoolLink
	err := s.links().FindOne(ctx, bson.M{"teacher_user_id": teacherUserID, "student_user_id": studentUserID}).Decode(&link)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return HomescoolLink{}, false, nil
	}
	if err != nil {
		return HomescoolLink{}, false, err
	}
	return cloneHomescoolLink(link), true, nil
}

func (s *mongoHomescoolStore) ListLinksByTeacher(ctx context.Context, teacherUserID string) ([]HomescoolLink, error) {
	cur, err := s.links().Find(ctx, bson.M{"teacher_user_id": teacherUserID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]HomescoolLink, 0)
	for cur.Next(ctx) {
		var l HomescoolLink
		if err := cur.Decode(&l); err != nil {
			return nil, err
		}
		out = append(out, cloneHomescoolLink(l))
	}
	return out, cur.Err()
}

func (s *mongoHomescoolStore) ListLinksByStudent(ctx context.Context, studentUserID string) ([]HomescoolLink, error) {
	cur, err := s.links().Find(ctx, bson.M{"student_user_id": studentUserID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]HomescoolLink, 0)
	for cur.Next(ctx) {
		var l HomescoolLink
		if err := cur.Decode(&l); err != nil {
			return nil, err
		}
		out = append(out, cloneHomescoolLink(l))
	}
	return out, cur.Err()
}

func (s *mongoHomescoolStore) EnsureStudentFolders(ctx context.Context, teacherUserID, studentUserID string) error {
	mem := &memoryHomescoolStore{mediaRoot: s.mediaRoot}
	return mem.EnsureStudentFolders(ctx, teacherUserID, studentUserID)
}

func (s *mongoHomescoolStore) ListFolder(ctx context.Context, teacherUserID, studentUserID, folder string) ([]HomescoolFolderObject, error) {
	mem := &memoryHomescoolStore{mediaRoot: s.mediaRoot}
	return mem.ListFolder(ctx, teacherUserID, studentUserID, folder)
}

func (s *mongoHomescoolStore) CreateTemplate(ctx context.Context, tpl HomescoolTaskTemplate) (HomescoolTaskTemplate, error) {
	tpl.Name = strings.TrimSpace(tpl.Name)
	if tpl.ID == "" {
		tpl.ID = randomID(16)
	}
	tpl.StudyAreas = homescoolNormalizeStudyAreas(tpl.StudyAreas, tpl.StudyArea)
	tpl.StudyArea = homescoolFormatStudyAreas(tpl.StudyAreas)
	tpl.MaxScore = homescoolNormalizeMaxScore(tpl.MaxScore)
	now := homescoolNow()
	if tpl.CreatedAt == "" {
		tpl.CreatedAt = now
	}
	tpl.UpdatedAt = now
	_, err := s.templates().InsertOne(ctx, tpl)
	return cloneHomescoolTemplate(tpl), err
}

func (s *mongoHomescoolStore) UpdateTemplate(ctx context.Context, tpl HomescoolTaskTemplate) (HomescoolTaskTemplate, error) {
	tpl.StudyAreas = homescoolNormalizeStudyAreas(tpl.StudyAreas, tpl.StudyArea)
	tpl.StudyArea = homescoolFormatStudyAreas(tpl.StudyAreas)
	tpl.MaxScore = homescoolNormalizeMaxScore(tpl.MaxScore)
	tpl.UpdatedAt = homescoolNow()
	res, err := s.templates().ReplaceOne(ctx, bson.M{"_id": tpl.ID, "teacher_user_id": tpl.TeacherUserID}, tpl)
	if err != nil {
		return HomescoolTaskTemplate{}, err
	}
	if res.MatchedCount == 0 {
		return HomescoolTaskTemplate{}, fmt.Errorf("template not found")
	}
	return cloneHomescoolTemplate(tpl), nil
}

func (s *mongoHomescoolStore) GetTemplate(ctx context.Context, teacherUserID, id string) (HomescoolTaskTemplate, bool, error) {
	var tpl HomescoolTaskTemplate
	err := s.templates().FindOne(ctx, bson.M{"_id": id, "teacher_user_id": teacherUserID}).Decode(&tpl)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return HomescoolTaskTemplate{}, false, nil
	}
	if err != nil {
		return HomescoolTaskTemplate{}, false, err
	}
	return cloneHomescoolTemplate(tpl), true, nil
}

func (s *mongoHomescoolStore) ListTemplates(ctx context.Context, teacherUserID, period, studyArea string) ([]HomescoolTaskTemplate, error) {
	cur, err := s.templates().Find(ctx, bson.M{"teacher_user_id": teacherUserID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	period = strings.TrimSpace(period)
	studyArea = strings.TrimSpace(studyArea)
	out := make([]HomescoolTaskTemplate, 0)
	for cur.Next(ctx) {
		var tpl HomescoolTaskTemplate
		if err := cur.Decode(&tpl); err != nil {
			return nil, err
		}
		cp := cloneHomescoolTemplate(tpl)
		if period != "" && !strings.EqualFold(cp.Period, period) {
			continue
		}
		if studyArea != "" && !homescoolHasStudyArea(cp.StudyAreas, studyArea) {
			continue
		}
		out = append(out, cp)
	}
	return out, cur.Err()
}

func (s *mongoHomescoolStore) CreateTask(ctx context.Context, task HomescoolAssignedTask) (HomescoolAssignedTask, error) {
	if task.ID == "" {
		task.ID = randomID(16)
	}
	task.StudentSlug = homescoolStudentSlug(task.StudentEmail)
	task.StudyAreas = homescoolNormalizeStudyAreas(task.StudyAreas, task.StudyArea)
	task.StudyArea = homescoolFormatStudyAreas(task.StudyAreas)
	task.Frequency = homescoolNormalizeFrequency(&task.Frequency)
	task.MaxScore = homescoolNormalizeMaxScore(task.MaxScore)
	if task.Status == "" {
		task.Status = homescoolTaskPending
	}
	now := homescoolNow()
	if task.CreatedAt == "" {
		task.CreatedAt = now
	}
	task.UpdatedAt = now
	_, err := s.tasks().InsertOne(ctx, task)
	return cloneHomescoolTask(task), err
}

func (s *mongoHomescoolStore) UpdateTask(ctx context.Context, task HomescoolAssignedTask) (HomescoolAssignedTask, error) {
	task.StudentSlug = homescoolStudentSlug(task.StudentEmail)
	task.StudyAreas = homescoolNormalizeStudyAreas(task.StudyAreas, task.StudyArea)
	task.StudyArea = homescoolFormatStudyAreas(task.StudyAreas)
	task.Frequency = homescoolNormalizeFrequency(&task.Frequency)
	task.MaxScore = homescoolNormalizeMaxScore(task.MaxScore)
	task.UpdatedAt = homescoolNow()
	res, err := s.tasks().ReplaceOne(ctx, bson.M{
		"_id": task.ID, "teacher_user_id": task.TeacherUserID, "student_user_id": task.StudentUserID,
	}, task)
	if err != nil {
		return HomescoolAssignedTask{}, err
	}
	if res.MatchedCount == 0 {
		return HomescoolAssignedTask{}, fmt.Errorf("task not found")
	}
	return cloneHomescoolTask(task), nil
}

func (s *mongoHomescoolStore) GetTask(ctx context.Context, teacherUserID, studentUserID, id string) (HomescoolAssignedTask, bool, error) {
	var task HomescoolAssignedTask
	err := s.tasks().FindOne(ctx, bson.M{
		"_id": id, "teacher_user_id": teacherUserID, "student_user_id": studentUserID,
	}).Decode(&task)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return HomescoolAssignedTask{}, false, nil
	}
	if err != nil {
		return HomescoolAssignedTask{}, false, err
	}
	return cloneHomescoolTask(task), true, nil
}

func (s *mongoHomescoolStore) ListTasksByPair(ctx context.Context, teacherUserID, studentUserID string) ([]HomescoolAssignedTask, error) {
	cur, err := s.tasks().Find(ctx, bson.M{"teacher_user_id": teacherUserID, "student_user_id": studentUserID})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]HomescoolAssignedTask, 0)
	for cur.Next(ctx) {
		var task HomescoolAssignedTask
		if err := cur.Decode(&task); err != nil {
			return nil, err
		}
		out = append(out, cloneHomescoolTask(task))
	}
	return out, cur.Err()
}

func (s *mongoHomescoolStore) CreateCatalogEntry(ctx context.Context, entry HomescoolCatalogEntry) (HomescoolCatalogEntry, error) {
	entry.Kind = strings.ToLower(strings.TrimSpace(entry.Kind))
	entry.Label = strings.TrimSpace(entry.Label)
	if !homescoolIsValidCatalogKind(entry.Kind) || entry.Label == "" {
		return HomescoolCatalogEntry{}, fmt.Errorf("kind must be period or study_area")
	}
	if entry.ID == "" {
		entry.ID = randomID(16)
	}
	if entry.CreatedAt == "" {
		entry.CreatedAt = homescoolNow()
	}
	_, err := s.catalogs().InsertOne(ctx, entry)
	return entry, err
}

func (s *mongoHomescoolStore) ListCatalogEntries(ctx context.Context, teacherUserID, kind string) ([]HomescoolCatalogEntry, error) {
	filter := bson.M{"teacher_user_id": teacherUserID}
	kind = strings.ToLower(strings.TrimSpace(kind))
	if kind != "" {
		filter["kind"] = kind
	}
	cur, err := s.catalogs().Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := make([]HomescoolCatalogEntry, 0)
	for cur.Next(ctx) {
		var e HomescoolCatalogEntry
		if err := cur.Decode(&e); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, cur.Err()
}
