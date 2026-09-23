package main

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

const (
	maxHomescoolPrintPages      = 12
	maxHomescoolPrintImageBytes = 8 << 20  // 8 MiB per page
	maxHomescoolPrintBodyBytes  = 28 << 20 // 28 MiB request body
)

func (a *App) postHomescoolMaterialPrintPDFHandler(w http.ResponseWriter, r *http.Request) {
	a.mustLogf(r, "homescool.materials.print.enter")
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.mustLogf(r, "homescool.materials.print.csrf_or_origin")
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	_, owners, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		a.mustLogf(r, "homescool.materials.print.denied")
		return
	}
	id := strings.TrimSpace(r.PathValue("materialId"))
	m, found, err := a.homescool.GetMaterial(r.Context(), "", id)
	if err != nil {
		a.mustLogf(r, "homescool.materials.print.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found || !homescoolOwnerAllowed(owners, m.OwnerUserID) {
		a.mustLogf(r, "homescool.materials.print.miss")
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxHomescoolPrintBodyBytes+1024))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var req struct {
		Pages    []string `json:"pages"`
		FileName string   `json:"fileName"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(req.Pages) == 0 || len(req.Pages) > maxHomescoolPrintPages {
		a.mustLogf(r, "homescool.materials.print.bad_page_count", "n", len(req.Pages))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	images := make([][]byte, 0, len(req.Pages))
	for i, page := range req.Pages {
		raw, decErr := decodeScribPrintImage(page)
		if decErr != nil || len(raw) == 0 {
			a.mustLogf(r, "homescool.materials.print.bad_image", "page", i+1, "err", errString(decErr))
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		if len(raw) > maxHomescoolPrintImageBytes {
			a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
			return
		}
		images = append(images, raw)
	}

	a.mustLogf(r, "homescool.materials.print.build", "id", id, "pages", len(images))
	out, err := pdf.BuildHomescoolRasterPDF(images)
	if err != nil {
		a.mustLogf(r, "homescool.materials.print.build_err", "err", err.Error())
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	name := strings.TrimSpace(req.FileName)
	if name == "" {
		name = strings.TrimSpace(m.Title)
	}
	if name == "" {
		name = "homescool.pdf"
	}
	if !strings.HasSuffix(strings.ToLower(name), ".pdf") {
		name += ".pdf"
	}
	name = sanitizeScribFileName(name)

	a.mustLogf(r, "homescool.materials.print.ok", "id", id, "pdf_bytes", len(out), "pages", len(images))
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", contentDispositionAttachment(name))
	w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(out)
}
