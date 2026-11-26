package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// homescoolV1Owner maps the API-key user to the student namespace they may
// read and write: their own rows, or a tutor assignment. It never accepts an
// owner id from the request.
func (a *App) homescoolV1Owner(w http.ResponseWriter, r *http.Request, studentKey string) (*User, string, bool) {
	user := apiUserFrom(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil, "", false
	}
	ownerID, found, err := a.resolveEoschoolCurriculumOwner(r.Context(), user, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return nil, "", false
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return nil, "", false
	}
	return user, ownerID, true
}

func (a *App) homescoolV1StudentsHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	students, err := a.listEoschoolCurriculumStudentsVisible(r.Context(), user)
	if err != nil {
		a.mustLogf(r, "homescool.v1.students.err", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.mustLogf(r, "homescool.v1.students.ok", "user_id", user.ID, "n", len(students))
	writeJSON(w, http.StatusOK, map[string]any{"students": students})
}

func (a *App) homescoolV1ProgressHandler(w http.ResponseWriter, r *http.Request) {
	studentKey := normalizeEoschoolCurriculumStudentKey(r.URL.Query().Get("studentKey"))
	_, ownerID, ok := a.homescoolV1Owner(w, r, studentKey)
	if !ok {
		return
	}
	doc, err := a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.mustLogf(r, "homescool.v1.progress.ok", "student", studentKey)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func (a *App) homescoolV1SectionHandler(w http.ResponseWriter, r *http.Request) {
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4096))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body eoschoolCurriculumSectionPatch
	if err = json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	dayID := strings.TrimSpace(body.DayID)
	sectionID := strings.TrimSpace(body.SectionID)
	if !validateEoschoolCurriculumSectionToggle(dayID, sectionID) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	user, ownerID, ok := a.homescoolV1Owner(w, r, studentKey)
	if !ok {
		return
	}
	doc, err := a.eoschoolCurriculum.SetSectionDone(r.Context(), ownerID, studentKey, dayID, sectionID, body.Completed)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "homescool_v1_section", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func (a *App) homescoolV1ActivityRecordHandler(w http.ResponseWriter, r *http.Request) {
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, eoschoolActivityRecordMaxBody))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body eoschoolCurriculumActivityRecordPut
	if err = json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	dayID := strings.TrimSpace(body.DayID)
	sectionID := strings.TrimSpace(body.SectionID)
	if !validateEoschoolCurriculumSectionToggle(dayID, sectionID) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if body.Score != nil && (*body.Score < 0 || *body.Score > 100) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	record, normErr := normalizeEoschoolActivityRecord(body.Record, studentKey, dayID, sectionID)
	if normErr != nil {
		a.mustLogf(r, "homescool.v1.record.invalid", "day", dayID, "section", sectionID)
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user, ownerID, ok := a.homescoolV1Owner(w, r, studentKey)
	if !ok {
		return
	}
	if _, err = a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	key := eoschoolCurriculumSectionKey(dayID, sectionID)
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(row *EoschoolCurriculumProgressDoc) error {
		if refErr := ensureEoschoolActivityPhotoRefs(row, key, record.Photos); refErr != nil {
			return refErr
		}
		applyEoschoolActivityRecord(row, key, record, body.Score)
		return nil
	})
	if err != nil {
		if errors.Is(err, errEoschoolCurriculumStudentNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		if errors.Is(err, errEoschoolActivityPhotoRef) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "homescool_v1_activity_record", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func (a *App) homescoolV1ActivityPhotoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		a.homescoolV1PostActivityPhoto(w, r)
		return
	}
	a.homescoolV1GetActivityPhoto(w, r)
}

func (a *App) homescoolV1PostActivityPhoto(w http.ResponseWriter, r *http.Request) {
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
	user, ownerID, ok := a.homescoolV1Owner(w, r, studentKey)
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
		a.mustLogf(r, "homescool.v1.photo.put_err", "err", err.Error())
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
	a.auditEvent(r, "homescool_v1_activity_photo", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func (a *App) homescoolV1GetActivityPhoto(w http.ResponseWriter, r *http.Request) {
	studentKey := normalizeEoschoolCurriculumStudentKey(r.URL.Query().Get("studentKey"))
	dayID := strings.TrimSpace(r.URL.Query().Get("dayId"))
	sectionID := strings.TrimSpace(r.URL.Query().Get("sectionId"))
	if !validateEoschoolCurriculumSectionToggle(dayID, sectionID) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, ownerID, ok := a.homescoolV1Owner(w, r, studentKey)
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
