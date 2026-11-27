package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

type eoschoolClassRetryPut struct {
	StudentKey string `json:"studentKey"`
	PlanDay    int    `json:"planDay"`
}

func (a *App) postEoschoolClassRetryPDFHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4096))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body eoschoolClassRetryPut
	if err = json.Unmarshal(raw, &body); err != nil || body.PlanDay < 1 || body.PlanDay > 400 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !pdf.ClassRetryAvailable(body.PlanDay) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	_, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	doc, err := a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !eoschoolDayHasActivityPhotos(doc, body.PlanDay) {
		a.writeSafeError(w, r, http.StatusConflict, "conflict")
		return
	}
	bytes, err := pdf.BuildClassRetryPDF(body.PlanDay, eoschoolClassRetryAnswers(doc, body.PlanDay))
	if err != nil {
		a.mustLogf(r, "eoschool.class_retry.pdf", "day", body.PlanDay)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"pdf_base64": base64.StdEncoding.EncodeToString(bytes),
		"filename":   fmt.Sprintf("dia-%d-repaso.pdf", body.PlanDay),
		"plan_day":   body.PlanDay,
	})
}

func eoschoolDayHasActivityPhotos(doc EoschoolCurriculumProgressDoc, planDay int) bool {
	prefix := fmt.Sprintf("d%d:", planDay)
	for key, names := range doc.ActivityPhotoList {
		if strings.HasPrefix(key, prefix) && len(names) > 0 {
			return true
		}
	}
	for key, name := range doc.ActivityPhotos {
		if strings.HasPrefix(key, prefix) && strings.TrimSpace(name) != "" {
			return true
		}
	}
	return false
}

func eoschoolClassRetryAnswers(doc EoschoolCurriculumProgressDoc, planDay int) map[string][]pdf.ClassRetryAnswer {
	dayID := fmt.Sprintf("d%d", planDay)
	out := map[string][]pdf.ClassRetryAnswer{}
	for _, sectionID := range pdf.ClassRetrySectionIDs(planDay) {
		rec, ok := doc.ActivityRecords[eoschoolCurriculumSectionKey(dayID, sectionID)]
		if !ok {
			continue
		}
		for _, item := range rec.Items {
			if item.Kind != "text" || item.Correct == nil {
				continue
			}
			out[sectionID] = append(out[sectionID], pdf.ClassRetryAnswer{
				Prompt:  item.Prompt,
				Answer:  item.Answer,
				Correct: *item.Correct,
			})
		}
	}
	return out
}
