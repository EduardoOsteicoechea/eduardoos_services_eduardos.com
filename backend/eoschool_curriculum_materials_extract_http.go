package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const (
	eoschoolMaterialExtractWindow  = time.Hour
	eoschoolMaterialExtractUserMax = 20
	eoschoolMaterialExtractTimeout = 120 * time.Second
)

func (a *App) postEoschoolCurriculumMaterialExtractHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	if a.materialExtractLimit != nil && !a.materialExtractLimit.allow(user.ID) {
		a.auditEvent(r, "eoschool_curriculum_material_extract", "rate_limited", user.ID)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	m, found, err := a.curriculumMaterials.GetByID(r.Context(), id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found || m.OwnerUserID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if !eoschoolCurriculumMaterialExtractable(m.Kind) {
		a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
		return
	}
	if m.StorageName == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	data, err := a.curriculumMaterialsFS.readAll(user.ID, m.StudentKey, m.DayID, m.SectionID, m.StorageName)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}

	client := a.chat["deepseek"]
	if client == nil {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), eoschoolMaterialExtractTimeout)
	defer cancel()

	var extraction EoschoolMaterialExtraction
	switch m.Kind {
	case eoschoolCurriculumMaterialKindDocument:
		extraction, err = a.extractCurriculumMaterialDocument(ctx, client, data, m)
	case eoschoolCurriculumMaterialKindImage:
		extraction, err = a.extractCurriculumMaterialImage(ctx, client, data, m)
	case eoschoolCurriculumMaterialKindAudio:
		extraction, err = a.extractCurriculumMaterialAudio(ctx, client, data, m)
	default:
		a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
		return
	}
	if err != nil {
		if a.cfg.MustLog {
			a.log.Info("eoschool.material_extract_failed",
				"request_id", requestIDFrom(r, w),
				"material_id", m.ID,
				"kind", m.Kind,
				"cause", redactLogValue(err.Error()),
			)
		}
		failed := failedEoschoolMaterialExtraction(extractionSourceKind(m.Kind), safeExtractFailureMessage(err))
		failed.ExtractedAt = time.Now().UTC()
		updated, okUpd, updErr := a.curriculumMaterials.UpdateExtraction(r.Context(), user.ID, m.ID, failed)
		if updErr == nil && okUpd {
			a.auditEvent(r, "eoschool_curriculum_material_extract", "failed", user.ID)
			writeJSON(w, http.StatusOK, map[string]any{"material": materialWithURLs(updated)})
			return
		}
		status := http.StatusBadGateway
		if errors.Is(err, errExtractUnavailable) {
			status = http.StatusServiceUnavailable
		}
		a.writeSafeError(w, r, status, "internal_error")
		return
	}

	extraction.ExtractedAt = time.Now().UTC()
	extraction = sanitizeEoschoolMaterialExtraction(extraction)
	updated, okUpd, err := a.curriculumMaterials.UpdateExtraction(r.Context(), user.ID, m.ID, extraction)
	if err != nil || !okUpd {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoschool_curriculum_material_extract", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"material": materialWithURLs(updated)})
}

var errExtractUnavailable = errors.New("extract_unavailable")

func extractionSourceKind(kind string) string {
	switch kind {
	case eoschoolCurriculumMaterialKindDocument:
		return eoschoolMaterialExtractionSourceDocument
	case eoschoolCurriculumMaterialKindImage:
		return eoschoolMaterialExtractionSourceImage
	case eoschoolCurriculumMaterialKindAudio:
		return eoschoolMaterialExtractionSourceAudio
	default:
		return kind
	}
}

func safeExtractFailureMessage(err error) string {
	if err == nil {
		return "No se pudo extraer el texto."
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "no_text_in_document"):
		return "No se encontró texto en el documento."
	case strings.Contains(msg, "ffmpeg_unavailable"), strings.Contains(msg, "stt_unavailable"):
		return "El reconocimiento de audio no está disponible ahora."
	case strings.Contains(msg, "empty_transcript"), strings.Contains(msg, "empty_audio"):
		return "No se pudo transcribir el audio."
	case strings.Contains(msg, "unsupported"):
		return "Este tipo de archivo no admite extracción."
	default:
		return "No se pudo extraer el texto. Inténtalo de nuevo."
	}
}

func (a *App) extractCurriculumMaterialDocument(ctx context.Context, client ChatClient, data []byte, m EoschoolCurriculumMaterial) (EoschoolMaterialExtraction, error) {
	raw, err := extractEoschoolCurriculumDocumentText(data, m.ContentType, m.StorageName)
	if err != nil {
		return EoschoolMaterialExtraction{SourceKind: eoschoolMaterialExtractionSourceDocument}, err
	}
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return EoschoolMaterialExtraction{SourceKind: eoschoolMaterialExtractionSourceDocument}, fmt.Errorf("no_text_in_document")
	}
	prompt := "Source document text:\n" + clipRunes(raw, 12000)
	result, err := completeLong(client, ctx, eoschoolMaterialExtractStructSystem, []ChatMessage{{Role: "user", Content: prompt}}, eoschoolMaterialExtractMaxTok)
	if err != nil {
		// Persist local text even if structuring fails.
		return EoschoolMaterialExtraction{
			Status:     eoschoolMaterialExtractionStatusReady,
			SourceKind: eoschoolMaterialExtractionSourceDocument,
			RawText:    raw,
			CleanText:  raw,
			Provider:   "local",
			Model:      "document-text",
		}, nil
	}
	parsed, err := parseEoschoolMaterialExtractionJSON(result.Text)
	if err != nil {
		return EoschoolMaterialExtraction{
			Status:     eoschoolMaterialExtractionStatusReady,
			SourceKind: eoschoolMaterialExtractionSourceDocument,
			RawText:    raw,
			CleanText:  sanitizeModelTextMax(result.Text, eoschoolMaterialExtractRawMax),
			Provider:   "deepseek",
			Model:      a.cfg.DeepSeekModel,
		}, nil
	}
	if parsed.RawText == "" {
		parsed.RawText = raw
	}
	if parsed.CleanText == "" {
		parsed.CleanText = parsed.RawText
	}
	parsed.Status = eoschoolMaterialExtractionStatusReady
	parsed.SourceKind = eoschoolMaterialExtractionSourceDocument
	parsed.Provider = "deepseek"
	parsed.Model = a.cfg.DeepSeekModel
	return parsed, nil
}

func (a *App) extractCurriculumMaterialImage(ctx context.Context, client ChatClient, data []byte, m EoschoolCurriculumMaterial) (EoschoolMaterialExtraction, error) {
	mime := m.ContentType
	if mime == "" {
		mime = "image/webp"
	}
	prompt := "Extract all readable text from this curriculum material image. Prefer handwritten student answers."
	result, err := completeVisionParts(client, ctx, eoschoolMaterialExtractOCRSystem, prompt, []visionImagePart{{MIME: mime, Data: data}}, eoschoolMaterialExtractMaxTok)
	if err != nil {
		return EoschoolMaterialExtraction{SourceKind: eoschoolMaterialExtractionSourceImage}, err
	}
	parsed, err := parseEoschoolMaterialExtractionJSON(result.Text)
	if err != nil {
		return EoschoolMaterialExtraction{SourceKind: eoschoolMaterialExtractionSourceImage}, err
	}
	parsed.Status = eoschoolMaterialExtractionStatusReady
	parsed.SourceKind = eoschoolMaterialExtractionSourceImage
	parsed.Provider = "deepseek"
	parsed.Model = a.cfg.DeepSeekVisionModel
	if parsed.CleanText == "" {
		parsed.CleanText = parsed.RawText
	}
	return parsed, nil
}

func (a *App) extractCurriculumMaterialAudio(ctx context.Context, client ChatClient, data []byte, m EoschoolCurriculumMaterial) (EoschoolMaterialExtraction, error) {
	if a.voiceSTT == nil {
		return EoschoolMaterialExtraction{SourceKind: eoschoolMaterialExtractionSourceAudio}, fmt.Errorf("%w: stt_unavailable", errExtractUnavailable)
	}
	pcm, err := curriculumMaterialAudioToPCM16k(data, m.ContentType, m.StorageName)
	if err != nil {
		if strings.Contains(err.Error(), "ffmpeg_unavailable") {
			return EoschoolMaterialExtraction{SourceKind: eoschoolMaterialExtractionSourceAudio}, fmt.Errorf("%w: %v", errExtractUnavailable, err)
		}
		return EoschoolMaterialExtraction{SourceKind: eoschoolMaterialExtractionSourceAudio}, err
	}
	lang := normalizeVoiceLang(a.cfg.VoiceSTTLangDefault, "es")
	raw, err := transcribeCurriculumMaterialPCM(ctx, a.voiceSTT, pcm, lang)
	if err != nil {
		return EoschoolMaterialExtraction{SourceKind: eoschoolMaterialExtractionSourceAudio}, err
	}
	prompt := "Speech transcript:\n" + clipRunes(raw, 8000)
	result, err := completeLong(client, ctx, eoschoolMaterialExtractAudioSystem, []ChatMessage{{Role: "user", Content: prompt}}, eoschoolMaterialExtractMaxTok)
	if err != nil {
		return EoschoolMaterialExtraction{
			Status:     eoschoolMaterialExtractionStatusReady,
			SourceKind: eoschoolMaterialExtractionSourceAudio,
			RawText:    raw,
			CleanText:  raw,
			Provider:   "stt",
			Model:      "local-stt",
		}, nil
	}
	parsed, err := parseEoschoolMaterialExtractionJSON(result.Text)
	if err != nil {
		return EoschoolMaterialExtraction{
			Status:     eoschoolMaterialExtractionStatusReady,
			SourceKind: eoschoolMaterialExtractionSourceAudio,
			RawText:    raw,
			CleanText:  sanitizeModelTextMax(result.Text, eoschoolMaterialExtractRawMax),
			Provider:   "deepseek",
			Model:      a.cfg.DeepSeekModel,
		}, nil
	}
	if parsed.RawText == "" {
		parsed.RawText = raw
	}
	if parsed.CleanText == "" {
		parsed.CleanText = parsed.RawText
	}
	parsed.Status = eoschoolMaterialExtractionStatusReady
	parsed.SourceKind = eoschoolMaterialExtractionSourceAudio
	parsed.Provider = "deepseek"
	parsed.Model = a.cfg.DeepSeekModel
	return parsed, nil
}

func transcribeCurriculumMaterialPCM(ctx context.Context, engine STTEngine, pcm []byte, lang string) (string, error) {
	if engine == nil {
		return "", fmt.Errorf("stt_unavailable")
	}
	if len(pcm) == 0 {
		return "", fmt.Errorf("empty_audio")
	}
	session, err := engine.Start(ctx, lang)
	if err != nil {
		return "", err
	}
	defer session.Cancel()
	const chunk = 3200
	for i := 0; i < len(pcm); i += chunk {
		end := i + chunk
		if end > len(pcm) {
			end = len(pcm)
		}
		if _, _, err := session.Write(pcm[i:end]); err != nil {
			return "", err
		}
	}
	final, err := session.Close()
	if err != nil {
		return "", err
	}
	final = strings.TrimSpace(final)
	if final == "" {
		return "", fmt.Errorf("empty_transcript")
	}
	return final, nil
}
