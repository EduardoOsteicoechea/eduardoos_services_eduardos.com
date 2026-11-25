package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
)

const (
	eoschoolActivityPhotoName = "activity.webp"
	eoschoolActivityPhotoMax  = 40
)

var errEoschoolActivityPhotoLimit = errors.New("activity photo limit")

var eoschoolActivityPhotoFileRe = regexp.MustCompile(`^p[0-9a-f]{16}\.webp$`)

func validEoschoolActivityPhotoName(name string) bool {
	return name == eoschoolActivityPhotoName || eoschoolActivityPhotoFileRe.MatchString(name)
}

func dropEoschoolActivityPhoto(row *EoschoolCurriculumProgressDoc, key, name string) bool {
	names := eoschoolActivityPhotoNames(*row, key)
	next := make([]string, 0, len(names))
	found := false
	for _, item := range names {
		if item == name {
			found = true
			continue
		}
		next = append(next, item)
	}
	if !found {
		return false
	}
	if row.ActivityPhotoList == nil {
		row.ActivityPhotoList = map[string][]string{}
	}
	if row.ActivityPhotos == nil {
		row.ActivityPhotos = map[string]string{}
	}
	if len(next) == 0 {
		delete(row.ActivityPhotoList, key)
		delete(row.ActivityPhotos, key)
		return true
	}
	row.ActivityPhotoList[key] = next
	row.ActivityPhotos[key] = next[len(next)-1]
	return true
}

func eoschoolActivityPhotoNames(doc EoschoolCurriculumProgressDoc, key string) []string {
	if names := doc.ActivityPhotoList[key]; len(names) > 0 {
		out := make([]string, 0, len(names))
		for _, name := range names {
			if validEoschoolActivityPhotoName(name) {
				out = append(out, name)
			}
		}
		if len(out) > 0 {
			return out
		}
	}
	if name := doc.ActivityPhotos[key]; validEoschoolActivityPhotoName(name) {
		return []string{name}
	}
	return nil
}

func prepareEoschoolActivityPhoto(data []byte) ([]byte, error) {
	if int64(len(data)) > eoschoolCurriculumStudentMaxPhoto {
		return nil, errAvatarTooLarge
	}
	kind, err := detectHomescoolProgressImage(data)
	if err != nil {
		return nil, err
	}
	out, err := homescoolProgressToWebp(data, kind.mime)
	if err != nil {
		return nil, errAvatarInvalid
	}
	return out, nil
}

func (a *App) postEoschoolCurriculumActivityPhotoHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, eoschoolCurriculumStudentMaxPhoto+1<<20)
	if err := r.ParseMultipartForm(eoschoolCurriculumStudentMaxPhoto + 1<<20); err != nil {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(r.FormValue("studentKey"))
	dayID := strings.TrimSpace(r.FormValue("dayId"))
	sectionID := strings.TrimSpace(r.FormValue("sectionId"))
	if !validateEoschoolCurriculumSectionToggle(dayID, sectionID) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	file, header, err := r.FormFile("photo")
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	if header != nil && strings.Contains(header.Filename, "..") {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	data, err := io.ReadAll(io.LimitReader(file, eoschoolCurriculumStudentMaxPhoto+1))
	if err != nil || int64(len(data)) > eoschoolCurriculumStudentMaxPhoto {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	prepared, prepErr := prepareEoschoolActivityPhoto(data)
	if prepErr != nil {
		status, code := mapEoschoolStudentPhotoErr(prepErr)
		a.writeSafeError(w, r, status, code)
		return
	}
	name := "p" + randomID(8) + ".webp"
	key := eoschoolCurriculumSectionKey(dayID, sectionID)
	if _, err = a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	current, _, err := a.eoschoolCurriculum.Get(r.Context(), ownerID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if len(eoschoolActivityPhotoNames(current, key)) >= eoschoolActivityPhotoMax {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if err = a.curriculumMaterialsFS.put(ownerID, studentKey, dayID, sectionID, name, prepared); err != nil {
		a.mustLogf(r, "eoschool.activity.photo.put_err", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(row *EoschoolCurriculumProgressDoc) error {
		if row.ActivityPhotos == nil {
			row.ActivityPhotos = map[string]string{}
		}
		if row.ActivityPhotoList == nil {
			row.ActivityPhotoList = map[string][]string{}
		}
		names := append([]string{}, eoschoolActivityPhotoNames(*row, key)...)
		if len(names) >= eoschoolActivityPhotoMax {
			return errEoschoolActivityPhotoLimit
		}
		row.ActivityPhotoList[key] = append(names, name)
		row.ActivityPhotos[key] = name
		return nil
	})
	if errors.Is(err, errEoschoolActivityPhotoLimit) {
		_ = a.curriculumMaterialsFS.delete(ownerID, studentKey, dayID, sectionID, name)
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoschool_curriculum_activity_photo", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

type eoschoolCurriculumActivityPhotoDelete struct {
	StudentKey string `json:"studentKey"`
	DayID      string `json:"dayId"`
	SectionID  string `json:"sectionId"`
	Name       string `json:"name"`
}

func (a *App) deleteEoschoolCurriculumActivityPhotoHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8192))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body eoschoolCurriculumActivityPhotoDelete
	if err = json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	dayID := strings.TrimSpace(body.DayID)
	sectionID := strings.TrimSpace(body.SectionID)
	name := strings.TrimSpace(body.Name)
	if !validateEoschoolCurriculumSectionToggle(dayID, sectionID) || !validEoschoolActivityPhotoName(name) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	key := eoschoolCurriculumSectionKey(dayID, sectionID)
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(row *EoschoolCurriculumProgressDoc) error {
		if !dropEoschoolActivityPhoto(row, key, name) {
			return errEoschoolCurriculumStudentNotFound
		}
		return nil
	})
	if errors.Is(err, errEoschoolCurriculumStudentNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if delErr := a.curriculumMaterialsFS.delete(ownerID, studentKey, dayID, sectionID, name); delErr != nil {
		a.mustLogf(r, "eoschool.activity.photo.delete_err", "err", delErr.Error())
	}
	a.auditEvent(r, "eoschool_curriculum_activity_photo_delete", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func (a *App) getEoschoolCurriculumActivityPhotoHandler(w http.ResponseWriter, r *http.Request) {
	studentKey := normalizeEoschoolCurriculumStudentKey(r.URL.Query().Get("studentKey"))
	dayID := strings.TrimSpace(r.URL.Query().Get("dayId"))
	sectionID := strings.TrimSpace(r.URL.Query().Get("sectionId"))
	if !validateEoschoolCurriculumSectionToggle(dayID, sectionID) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	doc, found, err := a.eoschoolCurriculum.Get(r.Context(), ownerID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	key := eoschoolCurriculumSectionKey(dayID, sectionID)
	names := eoschoolActivityPhotoNames(doc, key)
	if !found || len(names) == 0 {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if name == "" {
		name = names[len(names)-1]
	}
	allowed := false
	for _, item := range names {
		if item == name {
			allowed = true
			break
		}
	}
	if !allowed || !validEoschoolActivityPhotoName(name) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	f, info, err := a.curriculumMaterialsFS.open(ownerID, studentKey, dayID, sectionID, name)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	w.Header().Set("Content-Type", "image/webp")
	w.Header().Set("Cache-Control", "private, no-store")
	if r.URL.Query().Get("download") == "1" {
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-%s.webp"`, dayID, sectionID))
	}
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}

type eoschoolCurriculumActivityScorePatch struct {
	StudentKey string `json:"studentKey"`
	DayID      string `json:"dayId"`
	SectionID  string `json:"sectionId"`
	Score      int    `json:"score"`
}

func (a *App) patchEoschoolCurriculumActivityScoreHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8192))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body eoschoolCurriculumActivityScorePatch
	if err = json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	dayID := strings.TrimSpace(body.DayID)
	sectionID := strings.TrimSpace(body.SectionID)
	if !validateEoschoolCurriculumSectionToggle(dayID, sectionID) || body.Score < 0 || body.Score > 100 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	if _, err = a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	key := eoschoolCurriculumSectionKey(dayID, sectionID)
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(row *EoschoolCurriculumProgressDoc) error {
		if row.ActivityScores == nil {
			row.ActivityScores = map[string]int{}
		}
		row.ActivityScores[key] = body.Score
		return nil
	})
	if err != nil {
		if errors.Is(err, errEoschoolCurriculumStudentNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoschool_curriculum_activity_score", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}
