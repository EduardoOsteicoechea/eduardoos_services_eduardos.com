package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	homescoolProgressOCRWindow  = time.Hour
	homescoolProgressOCRUserMax = 20
	homescoolProgressTimeout    = 120 * time.Second
	homescoolProgressOCRMaxTok  = 3000
	homescoolProgressLongMaxTok = 3000
)

type homescoolProgressSummary struct {
	Cycle              int                            `json:"cycle"`
	Week               int                            `json:"week"`
	StudentKey         string                         `json:"studentKey"`
	AverageScore       float64                        `json:"averageScore"`
	ScoredCount        int                            `json:"scoredCount"`
	BySubject          map[string]float64             `json:"bySubject"`
	ByDay              map[string]float64             `json:"byDay"`
	Items              []homescoolProgressSummaryItem `json:"items"`
	Strengths          []string                       `json:"strengths"`
	Weaknesses         []string                       `json:"weaknesses"`
	TeacherSuggestions []string                       `json:"teacherSuggestions"`
}

type homescoolProgressSummaryItem struct {
	CellKey            string   `json:"cellKey"`
	Cycle              int      `json:"cycle"`
	Week               int      `json:"week"`
	Day                int      `json:"day"`
	Subject            string   `json:"subject"`
	Score              int      `json:"score"`
	PhotoCount         int      `json:"photoCount"`
	Summary            string   `json:"summary"`
	UpdatedAt          string   `json:"updatedAt"`
	Strengths          []string `json:"strengths"`
	Weaknesses         []string `json:"weaknesses"`
	TeacherSuggestions []string `json:"teacherSuggestions"`
}

func progressWithURLs(progress HomescoolProgress) HomescoolProgress {
	for i := range progress.Photos {
		progress.Photos[i].URL = homescoolProgressPhotoURL(progress.Photos[i].ID)
		progress.Photos[i].ThumbURL = homescoolProgressThumbURL(progress.Photos[i].ID)
	}
	return progress
}

func parseHomescoolProgressCell(r *http.Request) (int, int, int, string, error) {
	cycle, err1 := strconv.Atoi(strings.TrimSpace(r.FormValue("cycle")))
	week, err2 := strconv.Atoi(strings.TrimSpace(r.FormValue("week")))
	day, err3 := strconv.Atoi(strings.TrimSpace(r.FormValue("day")))
	subject := eoschoolNormalizeSubject(r.FormValue("subject"))
	if err1 != nil || err2 != nil || err3 != nil || cycle < 1 || cycle > 3 || week < 1 || week > 24 || day < 1 || day > 5 || !eoschoolSubjectOK(subject) {
		return 0, 0, 0, "", errors.New("invalid progress cell")
	}
	return cycle, week, day, subject, nil
}

func (a *App) getHomescoolProgressHandler(w http.ResponseWriter, r *http.Request) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	cycle, week, day, subject, err := parseHomescoolProgressCell(r)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	row, found, err := a.progress.Get(r.Context(), user.ID, homescoolProgressDefaultStudent, cycle, week, day, subject)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		writeJSON(w, http.StatusOK, map[string]any{"progress": nil})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"progress": progressWithURLs(row)})
}

func (a *App) postHomescoolProgressPhotoHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user, owners, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	if a.progressOCRLimit != nil && !a.progressOCRLimit.allow(user.ID) {
		a.auditEvent(r, "homescool_progress_ocr", "rate_limited", user.ID)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, homescoolProgressMaxBytes+(1<<20)+homescoolRevisionMaxDocJSON)
	if err := r.ParseMultipartForm(homescoolProgressMaxBytes + (1 << 20)); err != nil {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	cycle, week, day, subject, err := parseHomescoolProgressCell(r)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	doc, err := a.resolveHomescoolRevisionDocument(r, owners, cycle, week, day, subject)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	raw, err := io.ReadAll(io.LimitReader(file, homescoolProgressMaxBytes+1))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	kind, err := detectHomescoolProgressImage(raw)
	if err != nil {
		if errors.Is(err, errAvatarTooLarge) {
			a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		} else {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		}
		return
	}
	webpBody, err := homescoolProgressToWebp(raw, kind.mime)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	thumbBody, err := homescoolProgressThumbWebp(raw, kind.mime)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	client := a.chat["deepseek"]
	if client == nil {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), homescoolProgressTimeout)
	defer cancel()
	ocr, err := completeVisionParts(client, ctx, homescoolProgressOCRSystem, buildHomescoolRevisionVisionPrompt(doc), []visionImagePart{{MIME: "image/webp", Data: webpBody}}, homescoolProgressOCRMaxTok)
	if err != nil {
		a.auditEvent(r, "homescool_progress_ocr", "vision_failed", user.ID)
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	extraction, err := parseHomescoolProgressExtraction(ocr.Text)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	cellKey := homescoolProgressCellKey(cycle, week, day, subject)
	row, found, err := a.progress.Get(r.Context(), user.ID, homescoolProgressDefaultStudent, cycle, week, day, subject)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := time.Now().UTC()
	if !found {
		row = HomescoolProgress{
			ID:          randomID(16),
			OwnerUserID: user.ID,
			StudentKey:  homescoolProgressDefaultStudent,
			Cycle:       cycle,
			Week:        week,
			Day:         day,
			Subject:     subject,
			CellKey:     cellKey,
			CreatedAt:   now,
		}
	}
	photoID := randomID(16)
	photo := HomescoolProgressPhoto{
		ID:          photoID,
		StorageName: photoID + ".webp",
		ThumbName:   photoID + ".thumb.webp",
		ContentType: "image/webp",
		Bytes:       int64(len(webpBody)),
		CreatedAt:   now,
		Extraction:  extraction,
		Status:      "ready",
	}
	if err := a.progressFS.put(user.ID, row.StudentKey, row.CellKey, photo.StorageName, webpBody); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.progressFS.put(user.ID, row.StudentKey, row.CellKey, photo.ThumbName, thumbBody); err != nil {
		_ = a.progressFS.delete(user.ID, row.StudentKey, row.CellKey, photo.StorageName)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	row.Photos = append(row.Photos, photo)
	interpretPrompt := fmt.Sprintf("Lesson document:\n%+v\n\nOCR:\n%s", doc, extraction.RawText)
	interpretResult, err := completeLong(client, ctx, homescoolProgressInterpretSystem, []ChatMessage{{Role: "user", Content: interpretPrompt}}, homescoolProgressLongMaxTok)
	if err != nil {
		_ = a.progressFS.delete(user.ID, row.StudentKey, row.CellKey, photo.StorageName)
		_ = a.progressFS.delete(user.ID, row.StudentKey, row.CellKey, photo.ThumbName)
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	state, score, err := parseHomescoolProgressInterpretation(interpretResult.Text)
	if err != nil {
		_ = a.progressFS.delete(user.ID, row.StudentKey, row.CellKey, photo.StorageName)
		_ = a.progressFS.delete(user.ID, row.StudentKey, row.CellKey, photo.ThumbName)
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	row.StudyState = state
	row.Score = score
	row.UpdatedAt = now
	stored, err := a.progress.Upsert(r.Context(), row)
	if err != nil {
		_ = a.progressFS.delete(user.ID, row.StudentKey, row.CellKey, photo.StorageName)
		_ = a.progressFS.delete(user.ID, row.StudentKey, row.CellKey, photo.ThumbName)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "homescool_progress_ocr", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"progress": progressWithURLs(stored)})
}

func (a *App) deleteHomescoolProgressPhotoHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	photoID := strings.TrimSpace(r.PathValue("photoId"))
	if photoID == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	row, found, err := a.progress.GetByPhoto(r.Context(), user.ID, photoID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var photo HomescoolProgressPhoto
	for _, item := range row.Photos {
		if item.ID == photoID {
			photo = item
			break
		}
	}
	updated, _, err := a.progress.DeletePhoto(r.Context(), user.ID, photoID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	_ = a.progressFS.delete(user.ID, row.StudentKey, row.CellKey, photo.StorageName)
	_ = a.progressFS.delete(user.ID, row.StudentKey, row.CellKey, photo.ThumbName)
	a.auditEvent(r, "homescool_progress_photo", "deleted", user.ID)
	if updated.ID == "" {
		writeJSON(w, http.StatusOK, map[string]any{"progress": nil, "deleted": true})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"progress": progressWithURLs(updated)})
}

func (a *App) getHomescoolProgressPhotoHandler(w http.ResponseWriter, r *http.Request) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	photoID := strings.TrimSpace(r.PathValue("photoId"))
	row, found, err := a.progress.GetByPhoto(r.Context(), user.ID, photoID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	thumb := r.PathValue("variant") == "thumb"
	for _, photo := range row.Photos {
		if photo.ID != photoID {
			continue
		}
		name := photo.StorageName
		if thumb {
			name = photo.ThumbName
		}
		f, info, err := a.progressFS.open(user.ID, row.StudentKey, row.CellKey, name)
		if err != nil {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		defer f.Close()
		w.Header().Set("Content-Type", "image/webp")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		http.ServeContent(w, r, name, info.ModTime(), f)
		return
	}
	a.writeSafeError(w, r, http.StatusNotFound, "not_found")
}

func (a *App) getHomescoolProgressSummaryHandler(w http.ResponseWriter, r *http.Request) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	cycle, err1 := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("cycle")))
	week, err2 := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("week")))
	if err1 != nil || err2 != nil || cycle < 1 || cycle > 3 || week < 1 || week > 24 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	rows, err := a.progress.ListWeek(r.Context(), user.ID, homescoolProgressDefaultStudent, cycle, week)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	summary := summarizeHomescoolProgress(cycle, week, rows)
	writeJSON(w, http.StatusOK, summary)
}

func summarizeHomescoolProgress(cycle, week int, rows []HomescoolProgress) homescoolProgressSummary {
	out := homescoolProgressSummary{
		Cycle: cycle, Week: week, StudentKey: homescoolProgressDefaultStudent,
		BySubject: map[string]float64{}, ByDay: map[string]float64{}, Items: make([]homescoolProgressSummaryItem, 0, len(rows)),
	}
	subjectTotals, subjectCounts := map[string]float64{}, map[string]int{}
	dayTotals, dayCounts := map[string]float64{}, map[string]int{}
	for _, row := range rows {
		if row.Score.Value < 1 {
			continue
		}
		out.ScoredCount++
		out.AverageScore += row.Score.Value
		subjectTotals[row.Subject] += row.Score.Value
		subjectCounts[row.Subject]++
		dayKey := strconv.Itoa(row.Day)
		dayTotals[dayKey] += row.Score.Value
		dayCounts[dayKey]++
		out.Items = append(out.Items, homescoolProgressSummaryItem{
			CellKey: row.CellKey, Cycle: row.Cycle, Week: row.Week, Day: row.Day, Subject: row.Subject,
			Score: int(row.Score.Value + 0.5), PhotoCount: len(row.Photos), Summary: row.StudyState.Summary,
			UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339),
			Strengths: row.StudyState.Strengths, Weaknesses: row.StudyState.Weaknesses, TeacherSuggestions: row.StudyState.TeacherSuggestions,
		})
		out.Strengths = append(out.Strengths, row.StudyState.Strengths...)
		out.Weaknesses = append(out.Weaknesses, row.StudyState.Weaknesses...)
		out.TeacherSuggestions = append(out.TeacherSuggestions, row.StudyState.TeacherSuggestions...)
	}
	if out.ScoredCount > 0 {
		out.AverageScore /= float64(out.ScoredCount)
	}
	for key, total := range subjectTotals {
		out.BySubject[key] = total / float64(subjectCounts[key])
	}
	for key, total := range dayTotals {
		out.ByDay[key] = total / float64(dayCounts[key])
	}
	out.Strengths = sanitizeProgressStrings(out.Strengths)
	out.Weaknesses = sanitizeProgressStrings(out.Weaknesses)
	out.TeacherSuggestions = sanitizeProgressStrings(out.TeacherSuggestions)
	return out
}
