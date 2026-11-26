package main

import (
	"encoding/json"
	"io"
	"net/http"
	"sort"
	"strings"
)

type eoschoolCurriculumProgressResponse struct {
	Student            EoschoolCurriculumStudent         `json:"student"`
	SectionsDone       []string                          `json:"sectionsDone"`
	ActivityScores     map[string]int                    `json:"activityScores"`
	ActivityScoreNotes map[string]string                 `json:"activityScoreNotes"`
	ActivityRecords    map[string]EoschoolActivityRecord `json:"activityRecords"`
	ActivityFacts      []EoschoolActivityFact            `json:"activityFacts"`
	ActivityPhotos     []string                          `json:"activityPhotos"`
	ActivityPhotoFiles map[string][]string               `json:"activityPhotoFiles"`
	SemesterWorks      []EoschoolSemesterWork            `json:"semesterWorks"`
	OutingYear         string                            `json:"outingYear"`
	Outings            []EoschoolOuting                  `json:"outings"`
}

func curriculumProgressJSON(doc EoschoolCurriculumProgressDoc) eoschoolCurriculumProgressResponse {
	scores := doc.ActivityScores
	if scores == nil {
		scores = map[string]int{}
	}
	notes := map[string]string{}
	for key, note := range doc.ActivityScoreNotes {
		text := strings.TrimSpace(note)
		if text == "" || len(text) > 2000 {
			continue
		}
		notes[key] = text
	}
	records, facts := eoschoolActivityRecordsView(doc)
	if facts == nil {
		facts = []EoschoolActivityFact{}
	}
	files := map[string][]string{}
	for key, names := range doc.ActivityPhotoList {
		clean := make([]string, 0, len(names))
		for _, name := range names {
			if validEoschoolActivityPhotoName(name) {
				clean = append(clean, name)
			}
		}
		if len(clean) > 0 {
			files[key] = clean
		}
	}
	for key, name := range doc.ActivityPhotos {
		if _, ok := files[key]; ok || !validEoschoolActivityPhotoName(name) {
			continue
		}
		files[key] = []string{name}
	}
	photos := make([]string, 0, len(files))
	for key := range files {
		photos = append(photos, key)
	}
	sort.Strings(photos)
	works := doc.SemesterWorks
	if works == nil {
		works = []EoschoolSemesterWork{}
	}
	outings := doc.Outings
	if outings == nil {
		outings = []EoschoolOuting{}
	}
	return eoschoolCurriculumProgressResponse{
		Student:            doc.studentView(),
		SectionsDone:       doc.SectionsDone,
		ActivityScores:     scores,
		ActivityScoreNotes: notes,
		ActivityRecords:    records,
		ActivityFacts:      facts,
		ActivityPhotos:     photos,
		ActivityPhotoFiles: files,
		SemesterWorks:      works,
		OutingYear:         doc.OutingYear,
		Outings:            outings,
	}
}

type eoschoolCurriculumSectionPatch struct {
	StudentKey string `json:"studentKey"`
	DayID      string `json:"dayId"`
	SectionID  string `json:"sectionId"`
	Completed  bool   `json:"completed"`
}

// getEoschoolCurriculumProgressHandler returns owner-scoped section completion
// for the MPPE curriculum UI (cookie session + Homescool entitlement).
func (a *App) getEoschoolCurriculumProgressHandler(w http.ResponseWriter, r *http.Request) {
	studentKey := normalizeEoschoolCurriculumStudentKey(r.URL.Query().Get("studentKey"))
	_, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	doc, err := a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func (a *App) listEoschoolCurriculumStudentsHandler(w http.ResponseWriter, r *http.Request) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	students, err := a.listEoschoolCurriculumStudentsVisible(r.Context(), user)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"students": students})
}

func (a *App) patchEoschoolCurriculumSectionHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4096))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body eoschoolCurriculumSectionPatch
	if err := json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	dayID := strings.TrimSpace(body.DayID)
	sectionID := strings.TrimSpace(body.SectionID)
	if !validateEoschoolCurriculumSectionToggle(dayID, sectionID) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	_, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	doc, err := a.eoschoolCurriculum.SetSectionDone(r.Context(), ownerID, studentKey, dayID, sectionID, body.Completed)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}
