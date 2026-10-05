package main

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

type eoschoolCurriculumProgressResponse struct {
	Student      EoschoolCurriculumStudent `json:"student"`
	SectionsDone []string                  `json:"sectionsDone"`
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
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(r.URL.Query().Get("studentKey"))
	doc, err := a.eoschoolCurriculum.GetOrCreate(r.Context(), user.ID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, eoschoolCurriculumProgressResponse{
		Student:      doc.studentView(),
		SectionsDone: doc.SectionsDone,
	})
}

func (a *App) listEoschoolCurriculumStudentsHandler(w http.ResponseWriter, r *http.Request) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	students, err := a.eoschoolCurriculum.ListStudents(r.Context(), user.ID)
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
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
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
	doc, err := a.eoschoolCurriculum.SetSectionDone(r.Context(), user.ID, studentKey, dayID, sectionID, body.Completed)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, eoschoolCurriculumProgressResponse{
		Student:      doc.studentView(),
		SectionsDone: doc.SectionsDone,
	})
}
