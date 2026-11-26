package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"unicode/utf8"
)

const (
	eoschoolRecordTextMax = 200
	eoschoolOutingMaxRows = 40
	eoschoolDriveURLMax   = 400
)

// EoschoolSemesterWork is the Drive link of one semester evidence PDF.
type EoschoolSemesterWork struct {
	Semester int    `json:"semester" bson:"semester"`
	DriveURL string `json:"driveUrl" bson:"drive_url"`
}

const eoschoolOutingImageMax = 8

// EoschoolOuting is one row of the Olive Trees outing log.
type EoschoolOuting struct {
	ID        string   `json:"id" bson:"id"`
	Date      string   `json:"date" bson:"date"`
	Semester  int      `json:"semester" bson:"semester"`
	Place     string   `json:"place" bson:"place"`
	Objective string   `json:"objective" bson:"objective"`
	Subject   string   `json:"subject" bson:"subject"`
	Notes     string   `json:"notes" bson:"notes"`
	Drawings  []string `json:"drawings" bson:"drawings,omitempty"`
	Photos    []string `json:"photos" bson:"photos,omitempty"`
}

func clipEoschoolRecordText(raw string) string {
	text := strings.TrimSpace(raw)
	if utf8.RuneCountInString(text) <= eoschoolRecordTextMax {
		return text
	}
	runes := []rune(text)
	return string(runes[:eoschoolRecordTextMax])
}

func validEoschoolSemester(n int) bool {
	return n == 1 || n == 2
}

func validEoschoolDriveURL(raw string) bool {
	text := strings.TrimSpace(raw)
	if text == "" || len(text) > eoschoolDriveURLMax || strings.ContainsAny(text, " \t\r\n") {
		return false
	}
	parsed, err := url.Parse(text)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return false
	}
	return true
}

func validEoschoolOutingDate(raw string) bool {
	if len(raw) != 10 || raw[4] != '-' || raw[7] != '-' {
		return false
	}
	for i, c := range raw {
		if i == 4 || i == 7 {
			continue
		}
		if c < '0' || c > '9' {
			return false
		}
	}
	month := raw[5:7]
	day := raw[8:10]
	return month >= "01" && month <= "12" && day >= "01" && day <= "31"
}

func sanitizeEoschoolSemesterWorks(in []EoschoolSemesterWork) ([]EoschoolSemesterWork, bool) {
	if len(in) > 2 {
		return nil, false
	}
	seen := map[int]bool{}
	out := make([]EoschoolSemesterWork, 0, len(in))
	for _, row := range in {
		if !validEoschoolSemester(row.Semester) || seen[row.Semester] || !validEoschoolDriveURL(row.DriveURL) {
			return nil, false
		}
		seen[row.Semester] = true
		out = append(out, EoschoolSemesterWork{Semester: row.Semester, DriveURL: strings.TrimSpace(row.DriveURL)})
	}
	return out, true
}

func sanitizeEoschoolOutings(year string, in []EoschoolOuting) (string, []EoschoolOuting, bool) {
	year = clipEoschoolRecordText(year)
	if utf8.RuneCountInString(year) > 9 {
		return "", nil, false
	}
	if len(in) > eoschoolOutingMaxRows {
		return "", nil, false
	}
	out := make([]EoschoolOuting, 0, len(in))
	for _, row := range in {
		date := strings.TrimSpace(row.Date)
		if !validEoschoolOutingDate(date) || !validEoschoolSemester(row.Semester) {
			return "", nil, false
		}
		place := clipEoschoolRecordText(row.Place)
		objective := clipEoschoolRecordText(row.Objective)
		subject := clipEoschoolRecordText(row.Subject)
		notes := clipEoschoolRecordText(row.Notes)
		if place == "" || objective == "" || subject == "" || notes == "" {
			return "", nil, false
		}
		id := strings.TrimSpace(row.ID)
		if id == "" {
			id = randomID(12)
		}
		if len(id) > 40 {
			return "", nil, false
		}
		out = append(out, EoschoolOuting{
			ID: id, Date: date, Semester: row.Semester,
			Place: place, Objective: objective, Subject: subject, Notes: notes,
		})
	}
	return year, out, true
}

func (a *App) putEoschoolSemesterWorksHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8192))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		StudentKey string                 `json:"studentKey"`
		Works      []EoschoolSemesterWork `json:"works"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	works, okWorks := sanitizeEoschoolSemesterWorks(body.Works)
	if !okWorks {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	_, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	if _, err := a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(row *EoschoolCurriculumProgressDoc) error {
		row.SemesterWorks = works
		return nil
	})
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func (a *App) putEoschoolOutingsHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		StudentKey string           `json:"studentKey"`
		Year       string           `json:"year"`
		Outings    []EoschoolOuting `json:"outings"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	year, outings, okRows := sanitizeEoschoolOutings(body.Year, body.Outings)
	if !okRows {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	user, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	if _, err := a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	current, _, err := a.eoschoolCurriculum.Get(r.Context(), ownerID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	outings, removed := keepEoschoolOutingImages(current.Outings, outings)
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(row *EoschoolCurriculumProgressDoc) error {
		row.OutingYear = year
		row.Outings = outings
		return nil
	})
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	for _, row := range removed {
		a.deleteEoschoolOutingFiles(ownerID, studentKey, row)
	}
	a.auditEvent(r, "eoschool_curriculum_outings", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func validEoschoolOutingID(id string) bool {
	if len(id) < 8 || len(id) > 40 {
		return false
	}
	for _, c := range id {
		if (c < '0' || c > '9') && (c < 'a' || c > 'f') {
			return false
		}
	}
	return true
}

func validEoschoolOutingKind(kind string) bool {
	return kind == "drawing" || kind == "photo"
}

func keepEoschoolOutingImages(existing, next []EoschoolOuting) ([]EoschoolOuting, []EoschoolOuting) {
	byID := map[string]EoschoolOuting{}
	for _, row := range existing {
		byID[row.ID] = row
	}
	kept := map[string]bool{}
	for i := range next {
		prev, ok := byID[next[i].ID]
		if !ok {
			next[i].Drawings = nil
			next[i].Photos = nil
			continue
		}
		kept[next[i].ID] = true
		next[i].Drawings = append([]string{}, prev.Drawings...)
		next[i].Photos = append([]string{}, prev.Photos...)
	}
	var removed []EoschoolOuting
	for _, row := range existing {
		if !kept[row.ID] {
			removed = append(removed, row)
		}
	}
	return next, removed
}

func eoschoolOutingByID(rows []EoschoolOuting, id string) (EoschoolOuting, bool) {
	for _, row := range rows {
		if row.ID == id {
			return row, true
		}
	}
	return EoschoolOuting{}, false
}

func (a *App) deleteEoschoolOutingFiles(ownerID, studentKey string, row EoschoolOuting) {
	names := append(append([]string{}, row.Drawings...), row.Photos...)
	for _, name := range names {
		if !validEoschoolActivityPhotoName(name) {
			continue
		}
		_ = a.curriculumMaterialsFS.delete(ownerID, studentKey, "outings", row.ID, name)
	}
}

func outingImageSlot(row *EoschoolOuting, kind string) *[]string {
	if kind == "drawing" {
		return &row.Drawings
	}
	return &row.Photos
}

func (a *App) postEoschoolOutingImageHandler(w http.ResponseWriter, r *http.Request) {
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
	outingID := strings.TrimSpace(r.FormValue("outingId"))
	kind := strings.TrimSpace(r.FormValue("kind"))
	if !validEoschoolOutingID(outingID) || !validEoschoolOutingKind(kind) {
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
	current, found, err := a.eoschoolCurriculum.Get(r.Context(), ownerID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	row, rowOK := eoschoolOutingByID(current.Outings, outingID)
	if !found || !rowOK {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	slot := outingImageSlot(&row, kind)
	if len(*slot) >= eoschoolOutingImageMax {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := "p" + randomID(8) + ".webp"
	if err = a.curriculumMaterialsFS.put(ownerID, studentKey, "outings", outingID, name, prepared); err != nil {
		a.mustLogf(r, "eoschool.outing.image.put_err", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(stored *EoschoolCurriculumProgressDoc) error {
		for i := range stored.Outings {
			if stored.Outings[i].ID != outingID {
				continue
			}
			list := outingImageSlot(&stored.Outings[i], kind)
			if len(*list) >= eoschoolOutingImageMax {
				return errEoschoolActivityPhotoLimit
			}
			*list = append(*list, name)
			return nil
		}
		return errEoschoolCurriculumStudentNotFound
	})
	if err != nil {
		_ = a.curriculumMaterialsFS.delete(ownerID, studentKey, "outings", outingID, name)
		if errors.Is(err, errEoschoolActivityPhotoLimit) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoschool_curriculum_outing_image", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func (a *App) deleteEoschoolOutingImageHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8192))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		StudentKey string `json:"studentKey"`
		OutingID   string `json:"outingId"`
		Kind       string `json:"kind"`
		Name       string `json:"name"`
	}
	if err = json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	outingID := strings.TrimSpace(body.OutingID)
	name := strings.TrimSpace(body.Name)
	kind := strings.TrimSpace(body.Kind)
	if !validEoschoolOutingID(outingID) || !validEoschoolOutingKind(kind) || !validEoschoolActivityPhotoName(name) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(stored *EoschoolCurriculumProgressDoc) error {
		for i := range stored.Outings {
			if stored.Outings[i].ID != outingID {
				continue
			}
			list := outingImageSlot(&stored.Outings[i], kind)
			next := make([]string, 0, len(*list))
			foundName := false
			for _, item := range *list {
				if item == name {
					foundName = true
					continue
				}
				next = append(next, item)
			}
			if !foundName {
				return errEoschoolCurriculumStudentNotFound
			}
			*list = next
			return nil
		}
		return errEoschoolCurriculumStudentNotFound
	})
	if errors.Is(err, errEoschoolCurriculumStudentNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	_ = a.curriculumMaterialsFS.delete(ownerID, studentKey, "outings", outingID, name)
	a.auditEvent(r, "eoschool_curriculum_outing_image_delete", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}

func (a *App) getEoschoolOutingImageHandler(w http.ResponseWriter, r *http.Request) {
	studentKey := normalizeEoschoolCurriculumStudentKey(r.URL.Query().Get("studentKey"))
	outingID := strings.TrimSpace(r.URL.Query().Get("outingId"))
	kind := strings.TrimSpace(r.URL.Query().Get("kind"))
	name := strings.TrimSpace(r.URL.Query().Get("name"))
	if !validEoschoolOutingID(outingID) || !validEoschoolOutingKind(kind) || !validEoschoolActivityPhotoName(name) {
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
	row, rowOK := eoschoolOutingByID(doc.Outings, outingID)
	if !found || !rowOK {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	slot := outingImageSlot(&row, kind)
	allowed := false
	for _, item := range *slot {
		if item == name {
			allowed = true
			break
		}
	}
	if !allowed {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	f, info, err := a.curriculumMaterialsFS.open(ownerID, studentKey, "outings", outingID, name)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	w.Header().Set("Content-Type", "image/webp")
	w.Header().Set("Cache-Control", "private, no-store")
	http.ServeContent(w, r, info.Name(), info.ModTime(), f)
}
