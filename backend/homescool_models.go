package main

import (
	"fmt"
	"strings"
	"time"
)

const (
	homescoolRootPrefix = "homescool"

	homescoolTaskPending  = "pending"
	homescoolTaskActioned = "actioned"
	homescoolTaskReady    = "ready"
	homescoolTaskArchived = "archived"

	homescoolGradeValidate = "validate"
	homescoolGradeReject   = "reject"

	homescoolFreqOnce         = "once"
	homescoolFreqDaily        = "daily"
	homescoolFreqDailyExcept  = "daily_except"

	homescoolCatalogPeriod    = "period"
	homescoolCatalogStudyArea = "study_area"
)

var homescoolFolderNames = []string{
	"portfolio", "period", "skills", "study_section", "tasks",
}

// HomescoolLink is one teacher→student registration.
type HomescoolLink struct {
	ID             string   `json:"id" bson:"_id"`
	TeacherUserID  string   `json:"teacherUserId" bson:"teacher_user_id"`
	StudentUserID  string   `json:"studentUserId" bson:"student_user_id"`
	TeacherEmail   string   `json:"teacherEmail" bson:"teacher_email"`
	StudentEmail   string   `json:"studentEmail" bson:"student_email"`
	StudentSlug    string   `json:"studentSlug" bson:"student_slug"`
	S3Prefix       string   `json:"s3Prefix" bson:"media_prefix"`
	Folders        []string `json:"folders" bson:"folders"`
	CreatedAt      string   `json:"createdAt" bson:"created_at"`
}

type HomescoolFolderObject struct {
	Key          string `json:"key"`
	Name         string `json:"name"`
	Size         int64  `json:"size"`
	LastModified string `json:"lastModified,omitempty"`
}

type HomescoolTaskFrequency struct {
	Kind            string `json:"kind" bson:"kind"`
	ExcludeWeekdays []int  `json:"excludeWeekdays,omitempty" bson:"exclude_weekdays,omitempty"`
}

type HomescoolTaskTemplate struct {
	ID           string   `json:"id" bson:"_id"`
	TeacherEmail string   `json:"teacherEmail" bson:"teacher_email"`
	TeacherUserID string  `json:"teacherUserId,omitempty" bson:"teacher_user_id,omitempty"`
	Name         string   `json:"name" bson:"name"`
	Description  string   `json:"description" bson:"description"`
	Period       string   `json:"period" bson:"period"`
	StudyAreas   []string `json:"studyAreas" bson:"study_areas"`
	StudyArea    string   `json:"studyArea,omitempty" bson:"study_area,omitempty"`
	DurationMin  int      `json:"durationMin" bson:"duration_min"`
	MaxScore     int      `json:"maxScore" bson:"max_score"`
	ImageKeys    []string `json:"imageKeys,omitempty" bson:"image_keys,omitempty"`
	CreatedAt    string   `json:"createdAt" bson:"created_at"`
	UpdatedAt    string   `json:"updatedAt" bson:"updated_at"`
}

type HomescoolTaskFile struct {
	Key  string `json:"key" bson:"key"`
	Name string `json:"name" bson:"name"`
	Size int64  `json:"size" bson:"size"`
}

type HomescoolTaskSubmission struct {
	Text        string              `json:"text" bson:"text"`
	Files       []HomescoolTaskFile `json:"files" bson:"files"`
	SubmittedAt string              `json:"submittedAt" bson:"submitted_at"`
}

type HomescoolTaskGrade struct {
	Decision string `json:"decision" bson:"decision"`
	Score    int    `json:"score" bson:"score"`
	GradedAt string `json:"gradedAt" bson:"graded_at"`
	Note     string `json:"note,omitempty" bson:"note,omitempty"`
}

type HomescoolAssignedTask struct {
	ID            string                   `json:"id" bson:"_id"`
	TemplateID    string                   `json:"templateId,omitempty" bson:"template_id,omitempty"`
	TeacherEmail  string                   `json:"teacherEmail" bson:"teacher_email"`
	StudentEmail  string                   `json:"studentEmail" bson:"student_email"`
	TeacherUserID string                   `json:"teacherUserId,omitempty" bson:"teacher_user_id,omitempty"`
	StudentUserID string                   `json:"studentUserId,omitempty" bson:"student_user_id,omitempty"`
	StudentSlug   string                   `json:"studentSlug" bson:"student_slug"`
	Name          string                   `json:"name" bson:"name"`
	Description   string                   `json:"description" bson:"description"`
	Period        string                   `json:"period" bson:"period"`
	StudyAreas    []string                 `json:"studyAreas" bson:"study_areas"`
	StudyArea     string                   `json:"studyArea,omitempty" bson:"study_area,omitempty"`
	StartDate     string                   `json:"startDate" bson:"start_date"`
	EndDate       string                   `json:"endDate" bson:"end_date"`
	Frequency     HomescoolTaskFrequency   `json:"frequency" bson:"frequency"`
	DurationMin   int                      `json:"durationMin" bson:"duration_min"`
	MaxScore      int                      `json:"maxScore" bson:"max_score"`
	Status        string                   `json:"status" bson:"status"`
	ImageKeys     []string                 `json:"imageKeys,omitempty" bson:"image_keys,omitempty"`
	Submission    *HomescoolTaskSubmission `json:"submission,omitempty" bson:"submission,omitempty"`
	Grade         *HomescoolTaskGrade      `json:"grade,omitempty" bson:"grade,omitempty"`
	CreatedAt     string                   `json:"createdAt" bson:"created_at"`
	UpdatedAt     string                   `json:"updatedAt" bson:"updated_at"`
}

type HomescoolCatalogEntry struct {
	ID            string `json:"id" bson:"_id"`
	TeacherEmail  string `json:"teacherEmail" bson:"teacher_email"`
	TeacherUserID string `json:"teacherUserId,omitempty" bson:"teacher_user_id,omitempty"`
	Kind          string `json:"kind" bson:"kind"`
	Label         string `json:"label" bson:"label"`
	CreatedAt     string `json:"createdAt" bson:"created_at"`
}

func homescoolNow() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func homescoolSafeEmailKey(email string) string {
	email = strings.ToLower(strings.TrimSpace(email))
	email = strings.ReplaceAll(email, "@", "_at_")
	email = strings.ReplaceAll(email, "/", "_")
	return email
}

func homescoolStudentSlug(email string) string {
	return homescoolSafeEmailKey(email)
}

func homescoolIsValidFolder(name string) bool {
	name = strings.Trim(strings.ToLower(strings.TrimSpace(name)), "/")
	for _, f := range homescoolFolderNames {
		if f == name {
			return true
		}
	}
	return false
}

func homescoolRelationshipPrefix(teacherUserID, studentUserID string) string {
	return fmt.Sprintf("%s/%s/%s", homescoolRootPrefix, teacherUserID, studentUserID)
}

func homescoolFolderPrefix(teacherUserID, studentUserID, folder string) string {
	folder = strings.Trim(strings.ToLower(strings.TrimSpace(folder)), "/")
	return homescoolRelationshipPrefix(teacherUserID, studentUserID) + "/" + folder
}

func homescoolKeepKey(teacherUserID, studentUserID, folder string) string {
	return homescoolFolderPrefix(teacherUserID, studentUserID, folder) + "/.keep"
}

func homescoolIsValidTaskStatus(s string) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case homescoolTaskPending, homescoolTaskActioned, homescoolTaskReady, homescoolTaskArchived:
		return true
	default:
		return false
	}
}

func homescoolNormalizeMaxScore(n int) int {
	if n <= 0 {
		return 5
	}
	if n > 5 {
		return 5
	}
	return n
}

func homescoolValidateScore(score, maxScore int) error {
	maxScore = homescoolNormalizeMaxScore(maxScore)
	if score < 1 || score > maxScore {
		return fmt.Errorf("score must be between 1 and %d", maxScore)
	}
	return nil
}

func homescoolScoreBand(score int) string {
	switch {
	case score <= 0:
		return ""
	case score == 1:
		return "minimo"
	case score == 2:
		return "pobre"
	case score == 3:
		return "aprobado"
	default:
		return "bueno"
	}
}

func homescoolNormalizeStudyAreas(areas []string, legacy string) []string {
	out := make([]string, 0, len(areas)+1)
	seen := map[string]struct{}{}
	add := func(raw string) {
		label := strings.TrimSpace(raw)
		if label == "" {
			return
		}
		key := strings.ToLower(label)
		if _, ok := seen[key]; ok {
			return
		}
		seen[key] = struct{}{}
		out = append(out, label)
	}
	for _, a := range areas {
		add(a)
	}
	if len(out) == 0 {
		add(legacy)
	}
	return out
}

func homescoolFormatStudyAreas(areas []string) string {
	areas = homescoolNormalizeStudyAreas(areas, "")
	return strings.Join(areas, ", ")
}

func homescoolHasStudyArea(areas []string, needle string) bool {
	needle = strings.TrimSpace(needle)
	if needle == "" {
		return false
	}
	for _, a := range areas {
		if strings.EqualFold(strings.TrimSpace(a), needle) {
			return true
		}
	}
	return false
}

func homescoolNormalizeFrequency(f *HomescoolTaskFrequency) HomescoolTaskFrequency {
	if f == nil {
		return HomescoolTaskFrequency{Kind: homescoolFreqOnce}
	}
	kind := strings.ToLower(strings.TrimSpace(f.Kind))
	switch kind {
	case homescoolFreqOnce, homescoolFreqDaily, homescoolFreqDailyExcept:
	case "":
		kind = homescoolFreqOnce
	default:
		kind = homescoolFreqOnce
	}
	out := HomescoolTaskFrequency{Kind: kind}
	if kind == homescoolFreqDailyExcept {
		seen := map[int]struct{}{}
		for _, d := range f.ExcludeWeekdays {
			if d < 0 || d > 6 {
				continue
			}
			if _, ok := seen[d]; ok {
				continue
			}
			seen[d] = struct{}{}
			out.ExcludeWeekdays = append(out.ExcludeWeekdays, d)
		}
	}
	return out
}

func homescoolValidateFrequency(f HomescoolTaskFrequency) error {
	n := homescoolNormalizeFrequency(&f)
	switch n.Kind {
	case homescoolFreqOnce, homescoolFreqDaily, homescoolFreqDailyExcept:
		return nil
	default:
		return fmt.Errorf("frequency.kind must be once, daily, or daily_except")
	}
}

func homescoolParseDateOnly(s string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02", strings.TrimSpace(s), time.UTC)
}

func homescoolValidateFrequencyWindow(startDate, endDate string, f HomescoolTaskFrequency) error {
	n := homescoolNormalizeFrequency(&f)
	start, err := homescoolParseDateOnly(startDate)
	if err != nil {
		return fmt.Errorf("invalid startDate")
	}
	end := start
	if strings.TrimSpace(endDate) != "" {
		end, err = homescoolParseDateOnly(endDate)
		if err != nil {
			return fmt.Errorf("invalid endDate")
		}
	}
	if end.Before(start) {
		return fmt.Errorf("endDate must be on or after startDate")
	}
	if n.Kind == homescoolFreqDaily || n.Kind == homescoolFreqDailyExcept {
		if !end.After(start) {
			return fmt.Errorf("daily frequency requires endDate after startDate")
		}
	}
	return nil
}

func homescoolExpandOccurrenceDates(startDate, endDate string, f HomescoolTaskFrequency) ([]string, error) {
	n := homescoolNormalizeFrequency(&f)
	start, err := homescoolParseDateOnly(startDate)
	if err != nil {
		return nil, fmt.Errorf("invalid startDate")
	}
	end := start
	if strings.TrimSpace(endDate) != "" {
		end, err = homescoolParseDateOnly(endDate)
		if err != nil {
			return nil, fmt.Errorf("invalid endDate")
		}
	}
	if end.Before(start) {
		return nil, fmt.Errorf("endDate must be on or after startDate")
	}
	if n.Kind == homescoolFreqOnce {
		return []string{start.Format("2006-01-02")}, nil
	}
	exclude := map[int]struct{}{}
	if n.Kind == homescoolFreqDailyExcept {
		for _, d := range n.ExcludeWeekdays {
			exclude[d] = struct{}{}
		}
	}
	out := make([]string, 0)
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		if len(out) >= 400 {
			break
		}
		if _, skip := exclude[int(d.Weekday())]; skip {
			continue
		}
		out = append(out, d.Format("2006-01-02"))
	}
	return out, nil
}

func homescoolIsValidCatalogKind(kind string) bool {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case homescoolCatalogPeriod, homescoolCatalogStudyArea:
		return true
	default:
		return false
	}
}

func cloneHomescoolLink(l HomescoolLink) HomescoolLink {
	cp := l
	cp.Folders = append([]string(nil), l.Folders...)
	return cp
}

func cloneHomescoolTemplate(t HomescoolTaskTemplate) HomescoolTaskTemplate {
	cp := t
	cp.ImageKeys = append([]string(nil), t.ImageKeys...)
	cp.StudyAreas = append([]string(nil), t.StudyAreas...)
	return cp
}

func cloneHomescoolTask(t HomescoolAssignedTask) HomescoolAssignedTask {
	cp := t
	cp.ImageKeys = append([]string(nil), t.ImageKeys...)
	cp.StudyAreas = append([]string(nil), t.StudyAreas...)
	cp.Frequency = homescoolNormalizeFrequency(&t.Frequency)
	cp.Frequency.ExcludeWeekdays = append([]int(nil), cp.Frequency.ExcludeWeekdays...)
	if t.Submission != nil {
		sub := *t.Submission
		sub.Files = append([]HomescoolTaskFile(nil), t.Submission.Files...)
		cp.Submission = &sub
	}
	if t.Grade != nil {
		g := *t.Grade
		cp.Grade = &g
	}
	return cp
}
