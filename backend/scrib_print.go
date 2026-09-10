package main

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

const maxScribPrintImageBytes = 12 << 20 // 12 MiB decoded budget

func (a *App) scribPrintPDFHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxScribPrintImageBytes+1024))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var req struct {
		ImageBase64 string `json:"imageBase64"`
		FileName    string `json:"fileName"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	raw, err := decodeScribPrintImage(req.ImageBase64)
	if err != nil || len(raw) == 0 {
		a.mustLogf(r, "scrib.print.bad_image", "err", errString(err))
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(raw) > maxScribPrintImageBytes {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	out, err := pdf.BuildScribPrintPDF(raw)
	if err != nil {
		a.mustLogf(r, "scrib.print.build_failed", "err", err.Error())
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(req.FileName)
	if name == "" {
		name = "scrib-sheet.pdf"
	}
	if !strings.HasSuffix(strings.ToLower(name), ".pdf") {
		name += ".pdf"
	}
	name = sanitizeScribFileName(name)
	a.mustLogf(r, "scrib.print.ok", "user_id", user.ID, "bytes", len(out))
	a.auditEvent(r, "scrib_print_pdf", "ok", user.ID)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(out)
}

func decodeScribPrintImage(s string) ([]byte, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, io.ErrUnexpectedEOF
	}
	if i := strings.Index(s, "base64,"); i >= 0 {
		s = s[i+len("base64,"):]
	}
	return base64.StdEncoding.DecodeString(s)
}

func sanitizeScribFileName(name string) string {
	name = strings.ReplaceAll(name, `"`, "")
	name = strings.ReplaceAll(name, "/", "-")
	name = strings.ReplaceAll(name, "\\", "-")
	if name == "" {
		return "scrib-sheet.pdf"
	}
	return name
}

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
