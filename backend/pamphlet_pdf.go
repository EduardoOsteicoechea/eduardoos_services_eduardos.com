package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

var allowedPamphletTypes = map[string]struct{}{
	"":                           {},
	"pamphlet_single_sheet":      {},
	"pamphlet_structured_images": {},
}

func (a *App) pamphletPDFHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	a.mustLogf(r, "documents.pamphlet_pdf.begin", "user_id", user.ID, "content_length", r.ContentLength)

	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 16<<20))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	trimmed := []byte(strings.TrimSpace(string(raw)))
	if len(trimmed) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	var doc pdf.PamphletDocument
	if err := json.Unmarshal(trimmed, &doc); err != nil {
		a.mustLogf(r, "documents.pamphlet_pdf.json_error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	t := strings.TrimSpace(doc.Type)
	if _, ok := allowedPamphletTypes[t]; !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	data := pdf.BuildPamphletPDF(doc)
	downloadName := "panfleto.pdf"
	if title := strings.TrimSpace(doc.Header.Title); title != "" {
		downloadName = title + ".pdf"
	}
	a.mustLogf(r, "documents.pamphlet_pdf.ok",
		"user_id", user.ID,
		"pdf_bytes", len(data),
		"ink", strings.TrimSpace(doc.InkColor),
		"type", t,
	)
	a.auditEvent(r, "pamphlet_pdf", "ok", user.ID)

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", contentDispositionAttachment(downloadName))
	w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func contentDispositionAttachment(rawName string) string {
	base := sanitizeDownloadBase(rawName)
	if base == "" {
		base = "download"
	}
	ascii := asciiFilenameFallback(base)
	encoded := url.PathEscape(base)
	encoded = strings.ReplaceAll(encoded, "+", "%20")
	return `attachment; filename="` + ascii + `"; filename*=UTF-8''` + encoded
}

func sanitizeDownloadBase(name string) string {
	name = strings.TrimSpace(name)
	name = path.Base(name)
	var b strings.Builder
	for _, r := range name {
		switch r {
		case '/', '\\', ':', '*', '?', '"', '<', '>', '|', '\n', '\r', '\t':
			b.WriteByte('_')
		default:
			if unicode.IsControl(r) {
				continue
			}
			b.WriteRune(r)
		}
	}
	out := strings.TrimSpace(b.String())
	out = strings.Trim(out, " .")
	if out == "" {
		return ""
	}
	const maxRunes = 80
	if utf8.RuneCountInString(out) > maxRunes {
		runes := []rune(out)
		out = string(runes[:maxRunes])
		out = strings.TrimRight(out, " .")
	}
	return out
}

func asciiFilenameFallback(name string) string {
	var b strings.Builder
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '.', r == '-', r == '_':
			b.WriteRune(r)
		case r == ' ':
			b.WriteByte('_')
		default:
			b.WriteByte('_')
		}
	}
	out := strings.Trim(b.String(), "._")
	if out == "" {
		return "download"
	}
	return out
}
