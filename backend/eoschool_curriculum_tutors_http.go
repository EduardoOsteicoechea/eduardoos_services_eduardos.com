package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type eoschoolTutorRow struct {
	UserID      string   `json:"userId"`
	Email       string   `json:"email"`
	Username    string   `json:"username"`
	DisplayName string   `json:"displayName"`
	StudentKeys []string `json:"studentKeys"`
}

func (a *App) listEoschoolCurriculumTutorsHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	users, err := a.store.ListUsers(r.Context())
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	assignments, err := a.curriculumTutors.ListByOwner(r.Context(), admin.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	byTutor := map[string][]string{}
	for _, asg := range assignments {
		byTutor[asg.TutorUserID] = append(byTutor[asg.TutorUserID], asg.StudentKey)
	}
	rows := make([]eoschoolTutorRow, 0)
	for _, u := range users {
		if u == nil || u.ID == admin.ID || u.Role == roleAdmin || u.Status != statusVerified {
			continue
		}
		keys := byTutor[u.ID]
		if keys == nil {
			keys = []string{}
		}
		display := strings.TrimSpace(u.DisplayName)
		if display == "" {
			display = u.Username
		}
		rows = append(rows, eoschoolTutorRow{
			UserID:      u.ID,
			Email:       u.Email,
			Username:    u.Username,
			DisplayName: display,
			StudentKeys: keys,
		})
	}
	students, err := a.eoschoolCurriculum.ListStudents(r.Context(), admin.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoschool_tutors_list", "ok", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"tutors":    rows,
		"students":  students,
		"ownerId":   admin.ID,
	})
}

func (a *App) putEoschoolCurriculumTutorStudentsHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	tutorID := strings.TrimSpace(r.PathValue("userId"))
	tutor, err := a.store.UserByID(r.Context(), tutorID)
	if err != nil || tutor == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if tutor.Role == roleAdmin || tutor.ID == admin.ID {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		StudentKeys []string `json:"studentKeys"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	ownStudents, err := a.eoschoolCurriculum.ListStudents(r.Context(), admin.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	allowed := map[string]struct{}{}
	for _, s := range ownStudents {
		allowed[s.StudentKey] = struct{}{}
	}
	keys := make([]string, 0, len(body.StudentKeys))
	for _, raw := range body.StudentKeys {
		key := normalizeEoschoolCurriculumStudentKey(raw)
		if _, ok := allowed[key]; !ok {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		keys = append(keys, key)
	}
	if err := a.ensureHomescoolAdminGrant(r, tutor); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.curriculumTutors.ReplaceTutorStudents(r.Context(), admin.ID, tutor.ID, tutor.EmailNormalized, keys); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoschool_tutor_assign", "ok", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"userId":      tutor.ID,
		"email":       tutor.Email,
		"studentKeys": keys,
	})
}

func (a *App) ensureHomescoolAdminGrant(r *http.Request, tutor *User) error {
	pref, err := a.store.UserPreferenceByKey(r.Context(), tutor.ID, "admin_services")
	services := []string{}
	if err == nil && pref != nil {
		services = preferenceServiceIDs(pref.Value)
	}
	has := false
	for _, s := range services {
		if s == productHomescool {
			has = true
			break
		}
	}
	if has {
		return nil
	}
	services = append(services, productHomescool)
	services = normalizeServiceIDs(services)
	return a.store.UpsertUserPreference(r.Context(), &UserPreference{
		ID:        tutor.ID + "\x00admin_services",
		UserID:    tutor.ID,
		Key:       "admin_services",
		Value:     services,
		UpdatedAt: time.Now().UTC(),
	})
}
