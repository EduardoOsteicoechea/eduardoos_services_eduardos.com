package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"path"
	"strings"
)

func (a *App) listEoschoolCurriculumMaterialsHandler(w http.ResponseWriter, r *http.Request) {
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
	items, err := a.curriculumMaterials.List(r.Context(), ownerID, studentKey, dayID, sectionID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"materials": materialsWithURLs(items)})
}

func (a *App) postEoschoolCurriculumMaterialURLHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8192))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		StudentKey  string `json:"studentKey"`
		DayID       string `json:"dayId"`
		SectionID   string `json:"sectionId"`
		Role        string `json:"role"`
		URL         string `json:"url"`
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	dayID := strings.TrimSpace(body.DayID)
	sectionID := strings.TrimSpace(body.SectionID)
	role := strings.TrimSpace(body.Role)
	if !validateEoschoolCurriculumMaterialScope(dayID, sectionID, role) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	href, okURL := validateEoschoolCurriculumMaterialHTTPSURL(body.URL)
	if !okURL {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, body.StudentKey)
	if !ok {
		return
	}
	if !a.ensureCurriculumMaterialCapacity(w, r, ownerID, body.StudentKey, dayID, sectionID, role) {
		return
	}
	m := newEoschoolCurriculumMaterialBase(ownerID, body.StudentKey, dayID, sectionID, role, eoschoolCurriculumMaterialKindURL)
	m.URL = href
	m.Title = sanitizeEoschoolCurriculumMaterialTitle(body.Title)
	m.Description = sanitizeEoschoolCurriculumMaterialDescription(body.Description)
	stored, err := a.curriculumMaterials.Insert(r.Context(), m)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoschool_curriculum_material_url", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"material": materialWithURLs(stored)})
}

func (a *App) postEoschoolCurriculumMaterialHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, homescoolProgressMaxBytes+(1<<20))
	if err := r.ParseMultipartForm(homescoolProgressMaxBytes + (1 << 20)); err != nil {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(r.FormValue("studentKey"))
	dayID := strings.TrimSpace(r.FormValue("dayId"))
	sectionID := strings.TrimSpace(r.FormValue("sectionId"))
	role := strings.TrimSpace(r.FormValue("role"))
	if !validateEoschoolCurriculumMaterialScope(dayID, sectionID, role) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	user, ownerID, ok := a.requireEoschoolCurriculumOwner(w, r, studentKey)
	if !ok {
		return
	}
	if !a.ensureCurriculumMaterialCapacity(w, r, ownerID, studentKey, dayID, sectionID, role) {
		return
	}
	file, header, err := r.FormFile("file")
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
	filename := ""
	if header != nil {
		filename = header.Filename
	}
	detected, err := detectEoschoolCurriculumUpload(raw, filename)
	if err != nil {
		if errors.Is(err, errAvatarTooLarge) {
			a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		} else {
			a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
		}
		return
	}

	m := newEoschoolCurriculumMaterialBase(ownerID, studentKey, dayID, sectionID, role, detected.kind)
	m.Title = sanitizeEoschoolCurriculumMaterialTitle(r.FormValue("title"))
	m.Description = sanitizeEoschoolCurriculumMaterialDescription(r.FormValue("description"))
	m.OriginalName = path.Base(strings.TrimSpace(filename))
	if len(m.OriginalName) > 200 {
		m.OriginalName = m.OriginalName[:200]
	}
	if m.Title == "" {
		m.Title = sanitizeEoschoolCurriculumMaterialTitle(m.OriginalName)
	}

	var body []byte
	var thumb []byte
	switch detected.kind {
	case eoschoolCurriculumMaterialKindImage:
		webpBody, convErr := homescoolProgressToWebp(raw, detected.mime)
		if convErr != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
			return
		}
		thumbBody, thumbErr := homescoolProgressThumbWebp(raw, detected.mime)
		if thumbErr != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
			return
		}
		body = webpBody
		thumb = thumbBody
		m.StorageName = m.ID + ".webp"
		m.ThumbName = m.ID + ".thumb.webp"
		m.ContentType = "image/webp"
		m.Bytes = int64(len(body))
	default:
		body = raw
		m.StorageName = m.ID + detected.ext
		m.ContentType = detected.mime
		m.Bytes = int64(len(body))
	}

	if err := a.curriculumMaterialsFS.put(ownerID, m.StudentKey, dayID, sectionID, m.StorageName, body); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if len(thumb) > 0 {
		if err := a.curriculumMaterialsFS.put(ownerID, m.StudentKey, dayID, sectionID, m.ThumbName, thumb); err != nil {
			_ = a.curriculumMaterialsFS.delete(ownerID, m.StudentKey, dayID, sectionID, m.StorageName)
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
	}

	stored, err := a.curriculumMaterials.Insert(r.Context(), m)
	if err != nil {
		_ = a.curriculumMaterialsFS.delete(ownerID, m.StudentKey, dayID, sectionID, m.StorageName)
		if m.ThumbName != "" {
			_ = a.curriculumMaterialsFS.delete(ownerID, m.StudentKey, dayID, sectionID, m.ThumbName)
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoschool_curriculum_material_upload", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"material": materialWithURLs(stored)})
}

func (a *App) deleteEoschoolCurriculumMaterialHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	existing, found, err := a.curriculumMaterials.GetByID(r.Context(), id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	allowed, err := a.canAccessEoschoolCurriculumMaterial(r.Context(), user, existing)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !allowed {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	m, found, err := a.curriculumMaterials.Delete(r.Context(), existing.OwnerUserID, id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if m.StorageName != "" {
		_ = a.curriculumMaterialsFS.delete(m.OwnerUserID, m.StudentKey, m.DayID, m.SectionID, m.StorageName)
	}
	if m.ThumbName != "" {
		_ = a.curriculumMaterialsFS.delete(m.OwnerUserID, m.StudentKey, m.DayID, m.SectionID, m.ThumbName)
	}
	a.auditEvent(r, "eoschool_curriculum_material_delete", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) patchEoschoolCurriculumMaterialHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8192))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	title := sanitizeEoschoolCurriculumMaterialTitle(body.Title)
	description := sanitizeEoschoolCurriculumMaterialDescription(body.Description)
	existing, found, err := a.curriculumMaterials.GetByID(r.Context(), id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	allowed, err := a.canAccessEoschoolCurriculumMaterial(r.Context(), user, existing)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !allowed {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	updated, found, err := a.curriculumMaterials.UpdateMeta(r.Context(), existing.OwnerUserID, id, title, description)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	a.auditEvent(r, "eoschool_curriculum_material_patch", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"material": materialWithURLs(updated)})
}

func (a *App) ensureCurriculumMaterialCapacity(w http.ResponseWriter, r *http.Request, ownerUserID, studentKey, dayID, sectionID, role string) bool {
	items, err := a.curriculumMaterials.List(r.Context(), ownerUserID, studentKey, dayID, sectionID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return false
	}
	if countEoschoolCurriculumMaterialsForRole(items, role) >= eoschoolCurriculumMaterialMaxPerRole {
		a.writeSafeError(w, r, http.StatusConflict, "material_limit_reached")
		return false
	}
	return true
}

func (a *App) getEoschoolCurriculumMaterialFileHandler(w http.ResponseWriter, r *http.Request) {
	a.serveEoschoolCurriculumMaterialVariant(w, r, false)
}

func (a *App) getEoschoolCurriculumMaterialThumbHandler(w http.ResponseWriter, r *http.Request) {
	a.serveEoschoolCurriculumMaterialVariant(w, r, true)
}

func (a *App) serveEoschoolCurriculumMaterialVariant(w http.ResponseWriter, r *http.Request, thumb bool) {
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
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
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	allowed, err := a.canAccessEoschoolCurriculumMaterial(r.Context(), user, m)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !allowed {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	name := m.StorageName
	ctype := m.ContentType
	if thumb {
		if m.ThumbName == "" {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		name = m.ThumbName
		ctype = "image/webp"
	}
	if name == "" {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	f, info, err := a.curriculumMaterialsFS.open(m.OwnerUserID, m.StudentKey, m.DayID, m.SectionID, name)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	if ctype == "" {
		ctype = "application/octet-stream"
	}
	w.Header().Set("Content-Type", ctype)
	if m.OriginalName != "" && !thumb {
		w.Header().Set("Content-Disposition", `inline; filename="`+sanitizeContentDispositionFilename(m.OriginalName)+`"`)
	}
	http.ServeContent(w, r, name, info.ModTime(), f)
}

func sanitizeContentDispositionFilename(name string) string {
	name = path.Base(strings.TrimSpace(name))
	name = strings.ReplaceAll(name, `"`, "")
	name = strings.ReplaceAll(name, "\n", "")
	name = strings.ReplaceAll(name, "\r", "")
	if name == "" || name == "." || name == ".." {
		return "file"
	}
	return name
}
