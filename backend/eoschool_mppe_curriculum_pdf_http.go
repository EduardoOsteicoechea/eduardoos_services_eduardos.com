package main

import (
	"encoding/base64"
	"io"
	"net/http"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

const maxMPPECurriculumDayBodyBytes = 256 << 10

func (a *App) postEoschoolMPPECurriculumDayPreviewHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}

	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxMPPECurriculumDayBodyBytes+1024))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	doc, err := parseMPPECurriculumDaySheet(raw)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	pdfBytes, err := pdf.BuildMPPECurriculumDayPDF(doc)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "mppe_curriculum_day_preview", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"pdf_base64":     base64.StdEncoding.EncodeToString(pdfBytes),
		"page_width_mm":  pdf.EoschoolPageWidthMm,
		"page_height_mm": pdf.EoschoolPageHeightMm,
		"title":          doc.Title,
		"plan_day":       doc.PlanDay,
		"week":           doc.Week,
	})
}
