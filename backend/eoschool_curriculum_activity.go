package main

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

const (
	eoschoolActivityRecordMaxItems = 96
	eoschoolActivitySummaryMax     = 500
	eoschoolActivityRewriteMax     = 4000
	eoschoolActivityPromptMax      = 300
	eoschoolActivityAnswerMax      = 800
	eoschoolActivityItemRewriteMax = 800
	eoschoolActivityNoteMax        = 160
	eoschoolActivityRecordMaxBody  = 1 << 18
)

var errEoschoolActivityRecord = errors.New("activity record")

const (
	eoschoolActivityPhotoName = "activity.webp"
	eoschoolActivityPhotoMax  = 40
	eoschoolActivityScoreKey  = "20797190"
)

var errEoschoolActivityPhotoLimit = errors.New("activity photo limit")

var eoschoolActivityPhotoFileRe = regexp.MustCompile(`^p[0-9a-f]{16}\.webp$`)

func validEoschoolActivityPhotoName(name string) bool {
	return name == eoschoolActivityPhotoName || eoschoolActivityPhotoFileRe.MatchString(name)
}

func eoschoolActivityScoreKeyOK(user *User, key string) bool {
	if user == nil || user.Role != roleAdmin {
		return false
	}
	got := []byte(strings.TrimSpace(key))
	want := []byte(eoschoolActivityScoreKey)
	if len(got) != len(want) {
		return false
	}
	return subtle.ConstantTimeCompare(got, want) == 1
}

func applyEoschoolActivityScore(row *EoschoolCurriculumProgressDoc, key string, score int) {
	if row.ActivityScores == nil {
		row.ActivityScores = map[string]int{}
	}
	row.ActivityScores[key] = score
	delete(row.ActivityScoreNotes, key)
}

func clipEoschoolText(s string, max int) string {
	s = strings.TrimSpace(s)
	runes := []rune(s)
	if len(runes) > max {
		return string(runes[:max])
	}
	return s
}

func normalizeEoschoolActivityItem(item EoschoolActivityItem) (EoschoolActivityItem, error) {
	item.Kind = strings.ToLower(strings.TrimSpace(item.Kind))
	item.Prompt = clipEoschoolText(item.Prompt, eoschoolActivityPromptMax)
	item.Answer = clipEoschoolText(item.Answer, eoschoolActivityAnswerMax)
	item.Rewrite = clipEoschoolText(item.Rewrite, eoschoolActivityItemRewriteMax)
	item.Note = clipEoschoolText(item.Note, eoschoolActivityNoteMax)
	switch item.Kind {
	case "text":
		item.Page, item.Row, item.Col = 0, 0, 0
		item.A, item.B, item.Expected = 0, 0, 0
		item.Given = nil
		item.Correct = nil
		if item.Prompt == "" && item.Answer == "" && item.Rewrite == "" {
			return item, errEoschoolActivityRecord
		}
		return item, nil
	case "mult", "div":
		if item.Page < 1 || item.Page > 3 || item.Row < 0 || item.Row > 7 || item.Col < 0 || item.Col > 3 {
			return item, errEoschoolActivityRecord
		}
		if item.A < 1 || item.A > 99 || item.B < 1 || item.B > 99 {
			return item, errEoschoolActivityRecord
		}
		expected := item.A * item.B
		if item.Kind == "div" {
			if item.A%item.B != 0 {
				return item, errEoschoolActivityRecord
			}
			expected = item.A / item.B
		}
		if item.Expected != 0 && item.Expected != expected {
			return item, errEoschoolActivityRecord
		}
		item.Expected = expected
		if item.Given != nil && (*item.Given < 0 || *item.Given > 99999) {
			return item, errEoschoolActivityRecord
		}
		if item.Correct == nil {
			ok := item.Given != nil && *item.Given == expected
			item.Correct = &ok
		}
		return item, nil
	default:
		return item, errEoschoolActivityRecord
	}
}

func normalizeEoschoolActivityRecord(rec EoschoolActivityRecord) (EoschoolActivityRecord, error) {
	rec.Summary = clipEoschoolText(rec.Summary, eoschoolActivitySummaryMax)
	rec.Rewrite = clipEoschoolText(rec.Rewrite, eoschoolActivityRewriteMax)
	rec.Kind = strings.ToLower(strings.TrimSpace(rec.Kind))
	if rec.Summary == "" {
		return rec, errEoschoolActivityRecord
	}
	switch rec.Kind {
	case "prose", "multiplication", "mixed":
	default:
		return rec, errEoschoolActivityRecord
	}
	if len(rec.Items) > eoschoolActivityRecordMaxItems {
		return rec, errEoschoolActivityRecord
	}
	if rec.Items == nil {
		rec.Items = []EoschoolActivityItem{}
	}
	for i := range rec.Items {
		item, err := normalizeEoschoolActivityItem(rec.Items[i])
		if err != nil {
			return rec, err
		}
		rec.Items[i] = item
	}
	return rec, nil
}

func applyEoschoolActivityRecord(row *EoschoolCurriculumProgressDoc, key string, record EoschoolActivityRecord, score *int) {
	if score != nil {
		applyEoschoolActivityScore(row, key, *score)
	}
	if row.ActivityRecords == nil {
		row.ActivityRecords = map[string]EoschoolActivityRecord{}
	}
	row.ActivityRecords[key] = record
	if row.ActivityScoreNotes == nil {
		row.ActivityScoreNotes = map[string]string{}
	}
	if record.Summary == "" {
		delete(row.ActivityScoreNotes, key)
		return
	}
	row.ActivityScoreNotes[key] = record.Summary
}

func eoschoolActivityFactLabel(item EoschoolActivityItem) string {
	op := "×"
	if item.Kind == "div" {
		op = "÷"
	}
	return strconv.Itoa(item.A) + " " + op + " " + strconv.Itoa(item.B)
}

func eoschoolActivityFacts(records map[string]EoschoolActivityRecord) []EoschoolActivityFact {
	type acc struct {
		fact EoschoolActivityFact
		sum  int
	}
	by := map[string]*acc{}
	for _, rec := range records {
		for _, item := range rec.Items {
			if item.Kind != "mult" && item.Kind != "div" {
				continue
			}
			key := item.Kind + ":" + strconv.Itoa(item.A) + "x" + strconv.Itoa(item.B)
			slot := by[key]
			if slot == nil {
				slot = &acc{fact: EoschoolActivityFact{
					Key: key, Kind: item.Kind, A: item.A, B: item.B,
					Label: eoschoolActivityFactLabel(item),
				}}
				by[key] = slot
			}
			slot.fact.Attempts++
			hit := 0
			if item.Correct != nil && *item.Correct {
				hit = 1
			}
			slot.sum += hit
			if hit == 0 {
				slot.fact.Misses++
			}
		}
	}
	out := make([]EoschoolActivityFact, 0, len(by))
	for _, slot := range by {
		if slot.fact.Attempts > 0 {
			slot.fact.Avg = float64(slot.sum) / float64(slot.fact.Attempts)
		}
		out = append(out, slot.fact)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Misses != out[j].Misses {
			return out[i].Misses > out[j].Misses
		}
		if out[i].Avg != out[j].Avg {
			return out[i].Avg < out[j].Avg
		}
		return out[i].Label < out[j].Label
	})
	return out
}

func eoschoolActivityRecordsView(doc EoschoolCurriculumProgressDoc) (map[string]EoschoolActivityRecord, []EoschoolActivityFact) {
	records := map[string]EoschoolActivityRecord{}
	for key, rec := range doc.ActivityRecords {
		rec.Summary = clipEoschoolText(rec.Summary, eoschoolActivitySummaryMax)
		rec.Rewrite = clipEoschoolText(rec.Rewrite, eoschoolActivityRewriteMax)
		if rec.Summary == "" {
			continue
		}
		if rec.Items == nil {
			rec.Items = []EoschoolActivityItem{}
		}
		records[key] = rec
	}
	return records, eoschoolActivityFacts(records)
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
	Key        string `json:"key"`
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
	if !eoschoolActivityScoreKeyOK(user, body.Key) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if _, err = a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	key := eoschoolCurriculumSectionKey(dayID, sectionID)
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(row *EoschoolCurriculumProgressDoc) error {
		applyEoschoolActivityScore(row, key, body.Score)
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

type eoschoolCurriculumActivityRecordPut struct {
	StudentKey string                 `json:"studentKey"`
	DayID      string                 `json:"dayId"`
	SectionID  string                 `json:"sectionId"`
	Key        string                 `json:"key"`
	Score      *int                   `json:"score"`
	Record     EoschoolActivityRecord `json:"record"`
}

func (a *App) putEoschoolCurriculumActivityRecordHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "csrf_invalid")
		return
	}
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
	record, normErr := normalizeEoschoolActivityRecord(body.Record)
	if normErr != nil {
		a.mustLogf(r, "eoschool.activity.record.invalid", "day", dayID, "section", sectionID)
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	if !eoschoolActivityScoreKeyOK(user, body.Key) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if _, err = a.eoschoolCurriculum.GetOrCreate(r.Context(), ownerID, studentKey); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	key := eoschoolCurriculumSectionKey(dayID, sectionID)
	doc, err := a.eoschoolCurriculum.UpdateStudent(r.Context(), ownerID, studentKey, func(row *EoschoolCurriculumProgressDoc) error {
		applyEoschoolActivityRecord(row, key, record, body.Score)
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
	a.auditEvent(r, "eoschool_curriculum_activity_record", "ok", user.ID)
	writeJSON(w, http.StatusOK, curriculumProgressJSON(doc))
}
