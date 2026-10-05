package main

import (
	"regexp"
	"strings"
	"time"
)

const (
	colEoschoolCurriculumProgress     = "eoschool_curriculum_progress"
	eoschoolCurriculumDefaultStudentKey  = "elias-osteicoechea"
	eoschoolCurriculumDefaultStudentName = "Elías Osteicoechea"
	eoschoolCurriculumDefaultGrade       = "3er grado"
	eoschoolCurriculumDefaultAge         = 8
)

var eoschoolCurriculumDayID = regexp.MustCompile(`^d[1-9][0-9]*$`)

var eoschoolCurriculumSectionIDs = map[string]bool{
	"bib": true, "ide": true, "len": true, "mat": true, "cie": true,
}

type EoschoolCurriculumStudent struct {
	StudentKey  string `json:"studentKey" bson:"student_key"`
	DisplayName string `json:"displayName" bson:"display_name"`
	Age         int    `json:"age" bson:"age"`
	Grade       string `json:"grade" bson:"grade"`
}

type EoschoolCurriculumProgressDoc struct {
	ID            string    `json:"id" bson:"id"`
	OwnerUserID   string    `json:"ownerUserId" bson:"owner_user_id"`
	StudentKey    string    `json:"studentKey" bson:"student_key"`
	DisplayName   string    `json:"displayName" bson:"display_name"`
	Age           int       `json:"age" bson:"age"`
	Grade         string    `json:"grade" bson:"grade"`
	SectionsDone  []string  `json:"sectionsDone" bson:"sections_done"`
	CreatedAt     time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt     time.Time `json:"updatedAt" bson:"updated_at"`
}

func eoschoolCurriculumSectionKey(dayID, sectionID string) string {
	return dayID + ":" + sectionID
}

func normalizeEoschoolCurriculumStudentKey(raw string) string {
	key := strings.TrimSpace(raw)
	if key == "" {
		return eoschoolCurriculumDefaultStudentKey
	}
	return key
}

func defaultEoschoolCurriculumProgress(ownerUserID, studentKey string) EoschoolCurriculumProgressDoc {
	now := time.Now().UTC()
	name := eoschoolCurriculumDefaultStudentName
	grade := eoschoolCurriculumDefaultGrade
	age := eoschoolCurriculumDefaultAge
	if studentKey != eoschoolCurriculumDefaultStudentKey {
		name = strings.TrimSpace(studentKey)
	}
	return EoschoolCurriculumProgressDoc{
		OwnerUserID:  ownerUserID,
		StudentKey:   studentKey,
		DisplayName:  name,
		Age:          age,
		Grade:        grade,
		SectionsDone: []string{},
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

func (d EoschoolCurriculumProgressDoc) studentView() EoschoolCurriculumStudent {
	return EoschoolCurriculumStudent{
		StudentKey:  d.StudentKey,
		DisplayName: d.DisplayName,
		Age:         d.Age,
		Grade:       d.Grade,
	}
}

func validateEoschoolCurriculumSectionToggle(dayID, sectionID string) bool {
	dayID = strings.TrimSpace(dayID)
	sectionID = strings.TrimSpace(sectionID)
	if !eoschoolCurriculumDayID.MatchString(dayID) {
		return false
	}
	return eoschoolCurriculumSectionIDs[sectionID]
}
