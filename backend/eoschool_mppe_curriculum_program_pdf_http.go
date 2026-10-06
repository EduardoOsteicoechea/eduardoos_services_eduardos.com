package main

import (
	"net/http"
	"strconv"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

const mppeCurriculumProgramDayCount = 200

func (a *App) postEoschoolMPPECurriculumProgramPreviewHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}

	docs := make([]pdf.MPPECurriculumDayDoc, 0, mppeCurriculumProgramDayCount)
	for day := 1; day <= mppeCurriculumProgramDayCount; day++ {
		raw, err := loadMPPEDaySheetBytes(day)
		if err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		doc, err := parseMPPECurriculumDaySheet(raw)
		if err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		docs = append(docs, doc)
	}

	pdfBytes, err := pdf.BuildMPPECurriculumProgramPDF(docs)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "mppe_curriculum_program_preview", "ok", user.ID)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="mppe-programa-40-semanas.pdf"`)
	w.Header().Set("X-Page-Count", strconv.Itoa(len(docs)+41))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(pdfBytes)
}
