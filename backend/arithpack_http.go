package main

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func (a *App) arithpack() *arithpackStore {
	return newArithpackStore(a.homescool.MediaRoot())
}

func (a *App) listArithpackDaysHandler(w http.ResponseWriter, r *http.Request) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	student, ok := arithpackStudentKey(r.URL.Query().Get("studentKey"))
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	days, err := a.arithpack().listDays(user.ID, student)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if days == nil {
		days = []ArithpackDay{}
	}
	for i := range days {
		days[i] = arithpackPublicDay(days[i], student)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"days":      days,
		"analytics": arithpackAnalytics(days),
	})
}

func (a *App) getArithpackBackupHandler(w http.ResponseWriter, r *http.Request) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	student, ok := arithpackStudentKey(r.URL.Query().Get("studentKey"))
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	raw, err := a.arithpack().readBackup(user.ID, student)
	if err != nil {
		if os.IsNotExist(err) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(raw)
}

func (a *App) postArithpackDayHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, arithpackMaxJSON+homescoolProgressMaxBytes*arithpackMaxPhotos)
	if err := r.ParseMultipartForm(arithpackMaxJSON + homescoolProgressMaxBytes*arithpackMaxPhotos); err != nil {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	student, ok := arithpackStudentKey(r.FormValue("studentKey"))
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	grades, err := parseArithpackGrades(r.FormValue("grades"))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	store := a.arithpack()
	existing, err := store.readDay(user.ID, student, grades.Date)
	if err != nil && !os.IsNotExist(err) {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	photos := map[string][]byte{}
	if r.MultipartForm != nil {
		files := r.MultipartForm.File["photos"]
		if len(files)+len(existing.Photos) > arithpackMaxPhotos && len(files) > 0 {
			kept := existing.Photos
			if len(files) >= arithpackMaxPhotos {
				kept = nil
			}
			existing.Photos = kept
		}
		if len(files) > arithpackMaxPhotos {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		if len(files) > 0 {
			existing.Photos = nil
		}
		for i, header := range files {
			file, err := header.Open()
			if err != nil {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			data, readErr := io.ReadAll(io.LimitReader(file, homescoolProgressMaxBytes+1))
			file.Close()
			if readErr != nil || len(data) > homescoolProgressMaxBytes {
				a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
				return
			}
			kind, err := detectHomescoolProgressImage(data)
			if err != nil {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			webp, err := homescoolProgressToWebp(data, kind.mime)
			if err != nil {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			name := "p" + jsonNumber(i+1) + ".webp"
			photos[name] = webp
			existing.Photos = append(existing.Photos, ArithpackPhoto{Name: name})
		}
	}
	day := ArithpackDay{
		Day:         grades.Date,
		StudentKey:  student,
		OwnerUserID: user.ID,
		Cells:       grades.Cells,
		Photos:      existing.Photos,
		UpdatedAt:   time.Now().UTC(),
	}
	if err := store.saveDay(day, photos); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "arithpack_day", "saved", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"day": arithpackPublicDay(day, student),
	})
}

func (a *App) getArithpackPhotoHandler(w http.ResponseWriter, r *http.Request) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	student, ok := arithpackStudentKey(r.URL.Query().Get("studentKey"))
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	path, err := a.arithpack().photo(user.ID, student, r.PathValue("day"), r.PathValue("name"))
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if _, err := os.Stat(path); err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	http.ServeFile(w, r, path)
}

func arithpackPublicDay(day ArithpackDay, student string) ArithpackDay {
	day.OwnerUserID = ""
	for i := range day.Photos {
		name := filepath.Base(day.Photos[i].Name)
		day.Photos[i].URL = "/api/eoschool/arithpack/days/" + day.Day + "/photos/" + name + "?studentKey=" + student
	}
	return day
}
