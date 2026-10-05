package main

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

const maxMPPECurriculumWeekBodyBytes = 1536 << 10

func (a *App) postEoschoolMPPECurriculumWeekPreviewHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}

	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxMPPECurriculumWeekBodyBytes+1024))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var in struct {
		Days []json.RawMessage `json:"days"`
	}
	if err := json.Unmarshal(raw, &in); err != nil || len(in.Days) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(in.Days) > 5 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	docs := make([]pdf.MPPECurriculumDayDoc, 0, len(in.Days))
	for _, dayRaw := range in.Days {
		doc, err := parseMPPECurriculumDaySheet(dayRaw)
		if err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		docs = append(docs, doc)
	}
	pdfBytes, err := pdf.BuildMPPECurriculumDaysPDF(docs)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	week := docs[0].Week
	a.auditEvent(r, "mppe_curriculum_week_preview", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"pdf_base64":     base64.StdEncoding.EncodeToString(pdfBytes),
		"page_width_mm":  pdf.EoschoolPageWidthMm,
		"page_height_mm": pdf.EoschoolPageHeightMm,
		"week":           week,
		"page_count":     len(docs),
	})
}
