package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
)

func (a *App) createEoschoolCurriculumStudentHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}

	ct := r.Header.Get("Content-Type")
	var first, last, grade string
	var age int
	var photo []byte
	var photoKind avatarKind

	if strings.HasPrefix(ct, "multipart/form-data") {
		r.Body = http.MaxBytesReader(w, r.Body, eoschoolCurriculumStudentMaxPhoto+1<<20)
		if err := r.ParseMultipartForm(eoschoolCurriculumStudentMaxPhoto + 1<<20); err != nil {
			a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
			return
		}
		first = strings.TrimSpace(r.FormValue("firstName"))
		last = strings.TrimSpace(r.FormValue("lastName"))
		grade = strings.TrimSpace(r.FormValue("grade"))
		age, _ = strconv.Atoi(strings.TrimSpace(r.FormValue("age")))
		file, header, err := r.FormFile("photo")
		if err == nil {
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
			kind, prepared, prepErr := prepareEoschoolStudentPhoto(data)
			if prepErr != nil {
				status, code := mapEoschoolStudentPhotoErr(prepErr)
				a.writeSafeError(w, r, status, code)
				return
			}
			photo = prepared
			photoKind = kind
		}
	} else {
		raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8192))
		if err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		var body struct {
			FirstName string `json:"firstName"`
			LastName  string `json:"lastName"`
			Age       int    `json:"age"`
			Grade     string `json:"grade"`
		}
		if err := json.Unmarshal(raw, &body); err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		first = strings.TrimSpace(body.FirstName)
		last = strings.TrimSpace(body.LastName)
		grade = strings.TrimSpace(body.Grade)
		age = body.Age
	}

	if err := validateEoschoolCurriculumStudentProfile(first, last, grade, age); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	baseKey := slugifyEoschoolCurriculumStudentKey(first, last)
	studentKey := baseKey
	for i := 0; i < 8; i++ {
		if !validateEoschoolCurriculumStudentKeyExplicit(studentKey) {
			studentKey = baseKey + "-" + randomID(4)
		}
		_, found, err := a.eoschoolCurriculum.Get(r.Context(), user.ID, studentKey)
		if err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		if !found {
			break
		}
		studentKey = baseKey + "-" + randomID(4)
		if i == 7 {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
	}

	doc := EoschoolCurriculumProgressDoc{
		OwnerUserID:  user.ID,
		StudentKey:   studentKey,
		FirstName:    first,
		LastName:     last,
		DisplayName:  eoschoolCurriculumDisplayName(first, last),
		Age:          age,
		Grade:        grade,
		SectionsDone: []string{},
	}
	if len(photo) > 0 {
		name := "photo" + photoKind.ext
		if err := a.eoschoolStudentsFS.put(user.ID, studentKey, name, photo); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		doc.PhotoStorageName = name
		doc.PhotoContentType = photoKind.mime
	}

	created, err := a.eoschoolCurriculum.CreateStudent(r.Context(), doc)
	if err != nil {
		if errors.Is(err, errEoschoolCurriculumStudentExists) {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
		if doc.PhotoStorageName != "" {
			_ = a.eoschoolStudentsFS.delete(user.ID, studentKey, doc.PhotoStorageName)
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoschool_curriculum_student_create", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"student": created.studentView()})
}

func (a *App) patchEoschoolCurriculumStudentHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(r.PathValue("studentKey"))
	if !validateEoschoolCurriculumStudentKeyExplicit(studentKey) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	ct := r.Header.Get("Content-Type")
	var first, last, grade *string
	var age *int
	var photo []byte
	var photoKind avatarKind
	clearPhoto := false

	if strings.HasPrefix(ct, "multipart/form-data") {
		r.Body = http.MaxBytesReader(w, r.Body, eoschoolCurriculumStudentMaxPhoto+1<<20)
		if err := r.ParseMultipartForm(eoschoolCurriculumStudentMaxPhoto + 1<<20); err != nil {
			a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
			return
		}
		if v := strings.TrimSpace(r.FormValue("firstName")); v != "" {
			first = &v
		}
		if v := strings.TrimSpace(r.FormValue("lastName")); v != "" {
			last = &v
		}
		if v := strings.TrimSpace(r.FormValue("grade")); v != "" {
			grade = &v
		}
		if v := strings.TrimSpace(r.FormValue("age")); v != "" {
			n, err := strconv.Atoi(v)
			if err != nil {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			age = &n
		}
		if strings.TrimSpace(r.FormValue("clearPhoto")) == "true" {
			clearPhoto = true
		}
		file, header, err := r.FormFile("photo")
		if err == nil {
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
			kind, prepared, prepErr := prepareEoschoolStudentPhoto(data)
			if prepErr != nil {
				status, code := mapEoschoolStudentPhotoErr(prepErr)
				a.writeSafeError(w, r, status, code)
				return
			}
			photo = prepared
			photoKind = kind
		}
	} else {
		raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8192))
		if err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		var body struct {
			FirstName  *string `json:"firstName"`
			LastName   *string `json:"lastName"`
			Age        *int    `json:"age"`
			Grade      *string `json:"grade"`
			ClearPhoto bool    `json:"clearPhoto"`
		}
		if err := json.Unmarshal(raw, &body); err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		first, last, grade, age = body.FirstName, body.LastName, body.Grade, body.Age
		clearPhoto = body.ClearPhoto
	}

	var oldPhoto string
	var putFSErr error
	updated, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), user.ID, studentKey, func(doc *EoschoolCurriculumProgressDoc) error {
		hydrateEoschoolCurriculumStudentNames(doc)
		nextFirst := doc.FirstName
		nextLast := doc.LastName
		nextGrade := doc.Grade
		nextAge := doc.Age
		if first != nil {
			nextFirst = strings.TrimSpace(*first)
		}
		if last != nil {
			nextLast = strings.TrimSpace(*last)
		}
		if grade != nil {
			nextGrade = strings.TrimSpace(*grade)
		}
		if age != nil {
			nextAge = *age
		}
		if err := validateEoschoolCurriculumStudentProfile(nextFirst, nextLast, nextGrade, nextAge); err != nil {
			return err
		}
		doc.FirstName = nextFirst
		doc.LastName = nextLast
		doc.Grade = nextGrade
		doc.Age = nextAge
		doc.DisplayName = eoschoolCurriculumDisplayName(nextFirst, nextLast)
		if clearPhoto {
			oldPhoto = doc.PhotoStorageName
			doc.PhotoStorageName = ""
			doc.PhotoContentType = ""
		}
		if len(photo) > 0 {
			oldPhoto = doc.PhotoStorageName
			name := "photo" + photoKind.ext
			if err := a.eoschoolStudentsFS.put(user.ID, studentKey, name, photo); err != nil {
				putFSErr = err
				return err
			}
			doc.PhotoStorageName = name
			doc.PhotoContentType = photoKind.mime
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, errEoschoolCurriculumStudentNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		if putFSErr != nil {
			a.mustLogf(r, "eoschool.student.photo.put_err", "err", putFSErr.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if oldPhoto != "" && oldPhoto != updated.PhotoStorageName {
		_ = a.eoschoolStudentsFS.delete(user.ID, studentKey, oldPhoto)
	}
	a.auditEvent(r, "eoschool_curriculum_student_update", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"student": updated.studentView()})
}

func (a *App) deleteEoschoolCurriculumStudentHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(r.PathValue("studentKey"))
	if !validateEoschoolCurriculumStudentKeyExplicit(studentKey) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	deleted, err := a.eoschoolCurriculum.DeleteStudent(r.Context(), user.ID, studentKey)
	if err != nil {
		if errors.Is(err, errEoschoolCurriculumStudentNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if deleted.PhotoStorageName != "" {
		_ = a.eoschoolStudentsFS.delete(user.ID, studentKey, deleted.PhotoStorageName)
	}
	a.auditEvent(r, "eoschool_curriculum_student_delete", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "studentKey": studentKey})
}

func (a *App) getEoschoolCurriculumStudentPhotoHandler(w http.ResponseWriter, r *http.Request) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(r.PathValue("studentKey"))
	doc, found, err := a.eoschoolCurriculum.Get(r.Context(), user.ID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found || strings.TrimSpace(doc.PhotoStorageName) == "" {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	f, info, err := a.eoschoolStudentsFS.open(user.ID, studentKey, doc.PhotoStorageName)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	ctype := doc.PhotoContentType
	if ctype == "" {
		ctype = avatarContentType(doc.PhotoStorageName)
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "private, max-age=300")
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}
