package main

import (
	"encoding/json"
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

// EoschoolOuting is one row of the Olive Trees outing log.
type EoschoolOuting struct {
	ID        string `json:"id" bson:"id"`
	Date      string `json:"date" bson:"date"`
	Semester  int    `json:"semester" bson:"semester"`
	Place     string `json:"place" bson:"place"`
	Objective string `json:"objective" bson:"objective"`
	Subject   string `json:"subject" bson:"subject"`
	Notes     string `json:"notes" bson:"notes"`
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
	_, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	if _, err := a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(row *EoschoolCurriculumProgressDoc) error {
		row.OutingYear = year
		row.Outings = outings
		return nil
	})
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}
