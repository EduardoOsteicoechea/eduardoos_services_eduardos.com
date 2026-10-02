package main

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	homescoolRevisionOCRWindow   = time.Hour
	homescoolRevisionOCRUserMax  = 20
	homescoolRevisionOCRTimeout  = 90 * time.Second
	homescoolRevisionOCRMaxTok   = 2500
	homescoolRevisionVisionProv  = "deepseek"
)

func (a *App) postHomescoolRevisionOCRHandler(w http.ResponseWriter, r *http.Request) {
	a.mustLogf(r, "homescool.revision.ocr.enter")
	if !a.requireUnsafe(w, r) {
		return
	}
	user, owners, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		a.mustLogf(r, "homescool.revision.ocr.denied")
		return
	}
	if a.revisionOCRLimit != nil && !a.revisionOCRLimit.allow(user.ID) {
		a.auditEvent(r, "homescool_revision_ocr", "rate_limited", user.ID)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, homescoolRevisionMaxBytes*2+(1<<20)+homescoolRevisionMaxDocJSON)
	if err := r.ParseMultipartForm(homescoolRevisionMaxBytes*2 + (1 << 20)); err != nil {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}

	cycle, err1 := strconv.Atoi(strings.TrimSpace(r.FormValue("cycle")))
	week, err2 := strconv.Atoi(strings.TrimSpace(r.FormValue("week")))
	day, err3 := strconv.Atoi(strings.TrimSpace(r.FormValue("day")))
	subject := eoschoolNormalizeSubject(r.FormValue("subject"))
	if err1 != nil || err2 != nil || err3 != nil || cycle < 1 || cycle > 3 || week < 1 || week > 24 || day < 1 || day > 5 || !eoschoolSubjectOK(subject) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	doc, err := a.resolveHomescoolRevisionDocument(r, owners, cycle, week, day, subject)
	if err != nil {
		a.mustLogf(r, "homescool.revision.ocr.doc_err", "err", err.Error())
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	images, err := a.readHomescoolRevisionImages(r)
	if err != nil {
		if errors.Is(err, errAvatarTooLarge) {
			a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
			return
		}
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(images) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	client, ok := a.chat[homescoolRevisionVisionProv]
	if !ok || client == nil {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), homescoolRevisionOCRTimeout)
	defer cancel()
	prompt := buildHomescoolRevisionVisionPrompt(doc)
	result, err := completeVisionParts(client, ctx, homescoolRevisionOCRSystem, prompt, images, homescoolRevisionOCRMaxTok)
	if err != nil {
		a.mustLogf(r, "homescool.revision.ocr.vision_err", "err", err.Error())
		a.auditEvent(r, "homescool_revision_ocr", "vision_failed", user.ID)
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}

	extraction, err := parseHomescoolRevisionExtraction(result.Text)
	if err != nil {
		a.mustLogf(r, "homescool.revision.ocr.parse_err", "err", err.Error())
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	scoring := scoreHomescoolRevision(doc, extraction)
	cellKey := homescoolRevisionCellKey(doc.Cycle, doc.Week, doc.Day, doc.Subject)
	a.auditEvent(r, "homescool_revision_ocr", "ok", user.ID)
	a.mustLogf(r, "homescool.revision.ocr.ok",
		"key", cellKey,
		"images", len(images),
		"mcq_correct", scoring.MCQCorrect,
	)
	writeJSON(w, http.StatusOK, map[string]any{
		"extraction": extraction,
		"scoring":    scoring,
		"class": map[string]any{
			"cycle":   doc.Cycle,
			"week":    doc.Week,
			"day":     doc.Day,
			"subject": doc.Subject,
			"level":   doc.Level,
			"title":   doc.Title,
			"key":     cellKey,
		},
	})
}

func (a *App) resolveHomescoolRevisionDocument(r *http.Request, owners []string, cycle, week, day int, subject string) (EoschoolDocument, error) {
	for _, owner := range owners {
		m, found, err := a.homescool.GetMaterialByEoschoolKey(r.Context(), owner, cycle, week, day, eoschoolLevelV1, subject)
		if err != nil {
			return EoschoolDocument{}, err
		}
		if !found || m.Format != eoschoolFormatName {
			continue
		}
		raw, err := a.homescool.ReadMaterialDocument(r.Context(), m)
		if err != nil {
			continue
		}
		doc, err := parseEoschoolDocument(raw)
		if err != nil {
			continue
		}
		return doc, nil
	}

	rawDoc := strings.TrimSpace(r.FormValue("document"))
	if rawDoc == "" {
		return EoschoolDocument{}, errors.New("document required")
	}
	if len(rawDoc) > homescoolRevisionMaxDocJSON {
		return EoschoolDocument{}, errors.New("document too large")
	}
	doc, err := parseEoschoolDocument([]byte(rawDoc))
	if err != nil {
		return EoschoolDocument{}, err
	}
	if doc.Cycle != cycle || doc.Week != week || doc.Day != day || eoschoolNormalizeSubject(doc.Subject) != subject {
		return EoschoolDocument{}, errors.New("document meta mismatch")
	}
	return doc, nil
}

func (a *App) readHomescoolRevisionImages(r *http.Request) ([]visionImagePart, error) {
	names := []string{"file", "file2"}
	out := make([]visionImagePart, 0, 2)
	for _, name := range names {
		file, _, err := r.FormFile(name)
		if err != nil {
			if errors.Is(err, http.ErrMissingFile) {
				continue
			}
			return nil, err
		}
		data, err := io.ReadAll(io.LimitReader(file, homescoolRevisionMaxBytes+1))
		_ = file.Close()
		if err != nil {
			return nil, err
		}
		if len(data) == 0 {
			return nil, errAvatarInvalid
		}
		if len(data) > homescoolRevisionMaxBytes {
			return nil, errAvatarTooLarge
		}
		kind, err := detectHomescoolRevisionImage(data)
		if err != nil {
			return nil, err
		}
		webpBytes, err := homescoolRevisionToWebp(data, kind.mime)
		if err != nil {
			a.mustLogf(r, "homescool.revision.ocr.webp_err", "err", err.Error())
			return nil, err
		}
		out = append(out, visionImagePart{MIME: "image/webp", Data: webpBytes})
	}
	return out, nil
}
