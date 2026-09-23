package main

import (
	"encoding/base64"
	"io"
	"net/http"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

const maxHomescoolPreviewBodyBytes = 2 << 20 // 2 MiB eoschool JSON

// postHomescoolPreviewHandler builds a US Letter PDF from an eoschool document body
// (curriculum class JSON) and returns base64 for FE pdf.js preview.
func (a *App) postHomescoolPreviewHandler(w http.ResponseWriter, r *http.Request) {
	a.mustLogf(r, "homescool.preview.enter")
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.mustLogf(r, "homescool.preview.csrf_or_origin")
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		a.mustLogf(r, "homescool.preview.denied")
		return
	}

	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxHomescoolPreviewBodyBytes+1024))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	doc, err := parseEoschoolDocument(raw)
	if err != nil {
		a.mustLogf(r, "homescool.preview.bad_doc", "err", err.Error())
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	pdfBytes, err := buildEoschoolPDF(doc)
	if err != nil {
		a.mustLogf(r, "homescool.preview.build_err", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}

	a.mustLogf(r, "homescool.preview.ok",
		"user_id", user.ID,
		"cycle", doc.Cycle,
		"week", doc.Week,
		"day", doc.Day,
		"subject", doc.Subject,
		"pdf_bytes", len(pdfBytes),
	)
	a.auditEvent(r, "homescool_preview", "ok", user.ID)

	writeJSON(w, http.StatusOK, map[string]any{
		"pdf_base64":     base64.StdEncoding.EncodeToString(pdfBytes),
		"page_width_mm":  pdf.EoschoolPageWidthMm,
		"page_height_mm": pdf.EoschoolPageHeightMm,
		"title":          doc.Title,
		"cycle":          doc.Cycle,
		"week":           doc.Week,
		"day":            doc.Day,
		"level":          doc.Level,
		"subject":        doc.Subject,
	})
}
