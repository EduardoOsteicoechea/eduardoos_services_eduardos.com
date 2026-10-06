package main

import (
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

const (
	colEoschoolCurriculumProgress        = "eoschool_curriculum_progress"
	eoschoolCurriculumDefaultStudentKey  = "elias-osteicoechea"
	eoschoolCurriculumDefaultStudentName = "Elías Osteicoechea"
	eoschoolCurriculumDefaultFirstName   = "Elías"
	eoschoolCurriculumDefaultLastName    = "Osteicoechea"
	eoschoolCurriculumDefaultGrade       = "3er grado"
	eoschoolCurriculumDefaultAge         = 8
	eoschoolCurriculumStudentMaxPhoto    = 5 << 20
)

var eoschoolCurriculumDayID = regexp.MustCompile(`^d[1-9][0-9]*$`)

var eoschoolCurriculumSectionIDs = map[string]bool{
	"bib": true, "ide": true, "len": true, "mat": true, "cie": true,
}

var eoschoolCurriculumStudentKeyRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type EoschoolCurriculumStudent struct {
	StudentKey  string `json:"studentKey" bson:"student_key"`
	FirstName   string `json:"firstName" bson:"first_name"`
	LastName    string `json:"lastName" bson:"last_name"`
	DisplayName string `json:"displayName" bson:"display_name"`
	Age         int    `json:"age" bson:"age"`
	Grade       string `json:"grade" bson:"grade"`
	PhotoURL    string `json:"photoUrl,omitempty" bson:"-"`
	HasPhoto    bool   `json:"hasPhoto" bson:"-"`
}

type EoschoolCurriculumProgressDoc struct {
	ID               string    `json:"id" bson:"id"`
	OwnerUserID      string    `json:"ownerUserId" bson:"owner_user_id"`
	StudentKey       string    `json:"studentKey" bson:"student_key"`
	FirstName        string    `json:"firstName" bson:"first_name"`
	LastName         string    `json:"lastName" bson:"last_name"`
	DisplayName      string    `json:"displayName" bson:"display_name"`
	Age              int       `json:"age" bson:"age"`
	Grade            string    `json:"grade" bson:"grade"`
	PhotoStorageName string    `json:"photoStorageName,omitempty" bson:"photo_storage_name,omitempty"`
	PhotoContentType string    `json:"photoContentType,omitempty" bson:"photo_content_type,omitempty"`
	SectionsDone     []string  `json:"sectionsDone" bson:"sections_done"`
	CreatedAt        time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt        time.Time `json:"updatedAt" bson:"updated_at"`
}

func eoschoolCurriculumSectionKey(dayID, sectionID string) string {
	return dayID + ":" + sectionID
}

func normalizeEoschoolCurriculumStudentKey(raw string) string {
	key := strings.TrimSpace(strings.ToLower(raw))
	if key == "" {
		return eoschoolCurriculumDefaultStudentKey
	}
	return key
}

func eoschoolCurriculumDisplayName(first, last string) string {
	return strings.TrimSpace(first + " " + last)
}

func defaultEoschoolCurriculumProgress(ownerUserID, studentKey string) EoschoolCurriculumProgressDoc {
	now := time.Now().UTC()
	first := eoschoolCurriculumDefaultFirstName
	last := eoschoolCurriculumDefaultLastName
	name := eoschoolCurriculumDefaultStudentName
	grade := eoschoolCurriculumDefaultGrade
	age := eoschoolCurriculumDefaultAge
	if studentKey != eoschoolCurriculumDefaultStudentKey {
		name = strings.TrimSpace(studentKey)
		first = name
		last = ""
	}
	return EoschoolCurriculumProgressDoc{
		OwnerUserID:  ownerUserID,
		StudentKey:   studentKey,
		FirstName:    first,
		LastName:     last,
		DisplayName:  name,
		Age:          age,
		Grade:        grade,
		SectionsDone: []string{},
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

func (d EoschoolCurriculumProgressDoc) studentView() EoschoolCurriculumStudent {
	first := strings.TrimSpace(d.FirstName)
	last := strings.TrimSpace(d.LastName)
	display := strings.TrimSpace(d.DisplayName)
	if display == "" {
		display = eoschoolCurriculumDisplayName(first, last)
	}
	if first == "" && display != "" {
		parts := strings.Fields(display)
		if len(parts) > 0 {
			first = parts[0]
		}
		if len(parts) > 1 {
			last = strings.Join(parts[1:], " ")
		}
	}
	hasPhoto := strings.TrimSpace(d.PhotoStorageName) != ""
	out := EoschoolCurriculumStudent{
		StudentKey:  d.StudentKey,
		FirstName:   first,
		LastName:    last,
		DisplayName: display,
		Age:         d.Age,
		Grade:       d.Grade,
		HasPhoto:    hasPhoto,
	}
	if hasPhoto {
		out.PhotoURL = eoschoolCurriculumStudentPhotoURL(d.StudentKey)
	}
	return out
}

func eoschoolCurriculumStudentPhotoURL(studentKey string) string {
	return "/api/eoschool/curriculum/students/" + studentKey + "/photo"
}

func validateEoschoolCurriculumSectionToggle(dayID, sectionID string) bool {
	dayID = strings.TrimSpace(dayID)
	sectionID = strings.TrimSpace(sectionID)
	if !eoschoolCurriculumDayID.MatchString(dayID) {
		return false
	}
	return eoschoolCurriculumSectionIDs[sectionID]
}

func slugifyEoschoolCurriculumStudentKey(first, last string) string {
	raw := strings.TrimSpace(first) + " " + strings.TrimSpace(last)
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	s, _, _ := transform.String(t, raw)
	s = strings.ToLower(s)
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		ok := (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')
		if ok {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if !prevDash && b.Len() > 0 {
			b.WriteByte('-')
			prevDash = true
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = "student"
	}
	if len(out) > 64 {
		out = out[:64]
		out = strings.Trim(out, "-")
	}
	return out
}

func validateEoschoolCurriculumStudentProfile(first, last, grade string, age int) error {
	first = strings.TrimSpace(first)
	last = strings.TrimSpace(last)
	grade = strings.TrimSpace(grade)
	if first == "" || last == "" {
		return fmt.Errorf("name_required")
	}
	if len(first) > 80 || len(last) > 80 {
		return fmt.Errorf("name_too_long")
	}
	if age < 3 || age > 18 {
		return fmt.Errorf("age_invalid")
	}
	if grade == "" || len(grade) > 80 {
		return fmt.Errorf("grade_invalid")
	}
	return nil
}

func validateEoschoolCurriculumStudentKeyExplicit(key string) bool {
	key = strings.TrimSpace(strings.ToLower(key))
	if key == "" || len(key) > 80 {
		return false
	}
	return eoschoolCurriculumStudentKeyRe.MatchString(key)
}
