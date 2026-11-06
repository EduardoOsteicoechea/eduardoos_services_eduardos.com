package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	pdfcpuModel "github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

const (
	pamphletMergePDFMaxIDs   = 64
	pamphletMergePDFMaxBytes = 20 << 20 // cap on merged output size
	pamphletMergePDFDefaultInk = "black"
)

type pamphletMergePDFBody struct {
	EpamIDs  []string `json:"epamIds"`
	InkColor string   `json:"ink_color"`
	FileName string   `json:"fileName"`
}

// pamphletMergePDFHandler merges one PDF per pamphlet (same layout as POST /api/documents/pamphlet/pdf).
func (a *App) pamphletMergePDFHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	a.mustLogf(r, "documents.pamphlet_merge_pdf.begin", "user_id", user.ID, "content_length", r.ContentLength)

	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 256<<10))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body pamphletMergePDFBody
	if err := json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(body.EpamIDs) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(body.EpamIDs) > pamphletMergePDFMaxIDs {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}

	rid := requestIDFrom(r, nil)
	var readers []io.ReadSeeker
	var parts [][]byte
	defer func() {
		for _, p := range parts {
			clear(p)
		}
	}()

	for _, rawID := range body.EpamIDs {
		id := strings.TrimSpace(rawID)
		if id == "" {
			continue
		}
		rec, found, err := a.pamphlet.GetEpam(r.Context(), user.ID, id, rid)
		if err != nil {
			a.mustLogf(r, "documents.pamphlet_merge_pdf.get_error", "err", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		if !found || rec.Body == nil || len(rec.Body) == 0 {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		a.applyLinkedFooter(r, &rec)
		doc, err := epamBodyToPamphletDocument(rec.Body)
		if err != nil {
			a.mustLogf(r, "documents.pamphlet_merge_pdf.decode_error", "epam_id", id, "err", err.Error())
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		if t := strings.TrimSpace(doc.Type); t != "" {
			if _, ok := allowedPamphletTypes[t]; !ok {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
		} else {
			doc.Type = "pamphlet_single_sheet"
		}
		ink := strings.TrimSpace(body.InkColor)
		if ink == "" {
			ink = pamphletMergePDFDefaultInk
		}
		doc.InkColor = ink

		pdfBytes := pdf.BuildPamphletPDF(doc)
		if len(pdfBytes) == 0 {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		parts = append(parts, pdfBytes)
		readers = append(readers, bytes.NewReader(pdfBytes))
	}

	if len(readers) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	var merged bytes.Buffer
	conf := pdfcpuModel.NewDefaultConfiguration()
	if err := api.MergeRaw(r.Context(), readers, &merged, false, conf); err != nil {
		a.mustLogf(r, "documents.pamphlet_merge_pdf.merge_error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := merged.Bytes()
	if len(out) > pamphletMergePDFMaxBytes {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}

	downloadName := strings.TrimSpace(body.FileName)
	if downloadName == "" {
		downloadName = "serie.pdf"
	}
	if !strings.HasSuffix(strings.ToLower(downloadName), ".pdf") {
		downloadName += ".pdf"
	}

	a.mustLogf(r, "documents.pamphlet_merge_pdf.ok",
		"user_id", user.ID,
		"pdf_bytes", len(out),
		"count", len(readers),
		"ink", strings.TrimSpace(body.InkColor),
	)
	a.auditEvent(r, "pamphlet_merge_pdf", "ok", user.ID)

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", contentDispositionAttachment(downloadName))
	w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(out)
}

func epamBodyToPamphletDocument(body map[string]any) (pdf.PamphletDocument, error) {
	raw, err := json.Marshal(body)
	if err != nil {
		return pdf.PamphletDocument{}, err
	}
	var doc pdf.PamphletDocument
	if err := json.Unmarshal(raw, &doc); err != nil {
		return pdf.PamphletDocument{}, err
	}
	return doc, nil
}
