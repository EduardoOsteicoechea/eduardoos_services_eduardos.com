package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"
)

func (a *App) registerEoprojectRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/eoproject/me", a.eoprojectGetMe)
	mux.HandleFunc("POST /api/eoproject/me", a.eoprojectGetMe)
	mux.HandleFunc("GET /api/eoproject/projects", a.eoprojectListProjects)
	mux.HandleFunc("POST /api/eoproject/projects", a.eoprojectCreateProject)
	mux.HandleFunc("GET /api/eoproject/projects/{projectId}", a.eoprojectGetProject)
	mux.HandleFunc("PATCH /api/eoproject/projects/{projectId}", a.eoprojectUpdateProject)
	mux.HandleFunc("DELETE /api/eoproject/projects/{projectId}", a.eoprojectDeleteProject)

	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/stages", a.eoprojectListStages)
	mux.HandleFunc("POST /api/eoproject/projects/{projectId}/stages", a.eoprojectCreateStage)
	mux.HandleFunc("PATCH /api/eoproject/projects/{projectId}/stages/{stageId}", a.eoprojectUpdateStage)
	mux.HandleFunc("DELETE /api/eoproject/projects/{projectId}/stages/{stageId}", a.eoprojectDeleteStage)

	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/stages/{stageId}/photos", a.eoprojectListPhotos)
	mux.HandleFunc("POST /api/eoproject/projects/{projectId}/stages/{stageId}/photos", a.eoprojectUploadPhoto)
	mux.HandleFunc("DELETE /api/eoproject/projects/{projectId}/stages/{stageId}/photos/{photoId}", a.eoprojectDeletePhoto)
	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/stages/{stageId}/photos/{photoId}/file", a.eoprojectGetPhotoFile)

	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/stages/{stageId}/ifc", a.eoprojectListIFC)
	mux.HandleFunc("POST /api/eoproject/projects/{projectId}/stages/{stageId}/ifc", a.eoprojectUploadIFC)
	mux.HandleFunc("DELETE /api/eoproject/projects/{projectId}/stages/{stageId}/ifc/{versionId}", a.eoprojectDeleteIFC)
	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/stages/{stageId}/ifc/{versionId}/file", a.eoprojectGetIFCFile)

	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/shares", a.eoprojectListShares)
	mux.HandleFunc("POST /api/eoproject/projects/{projectId}/shares", a.eoprojectCreateShare)
	mux.HandleFunc("DELETE /api/eoproject/projects/{projectId}/shares/{shareId}", a.eoprojectDeleteShare)

	mux.HandleFunc("GET /api/eoproject/invite/{token}", a.eoprojectGetInvite)
	mux.HandleFunc("GET /api/eoproject/invite/{token}/photos/{photoId}/file", a.eoprojectInvitePhotoFile)
	mux.HandleFunc("GET /api/eoproject/invite/{token}/ifc/{versionId}/file", a.eoprojectInviteIFCFile)
}

func (a *App) hasEoprojectAccess(r *http.Request, user *User) (allowed bool, unavailable bool) {
	if a.failClosedEnt {
		return false, true
	}
	if user == nil {
		return false, false
	}
	if user.Role == roleAdmin {
		return true, false
	}
	return a.hasProductEntitlement(r, user, productEoproject)
}

func (a *App) requireEoprojectUser(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	ok, unavailable := a.hasEoprojectAccess(r, user)
	if unavailable {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return nil
	}
	if !ok {
		if a.cfg.MustLog {
			a.log.Info("eoproject.entitlement", "user_id", user.ID, "allowed", false)
		}
		a.auditEvent(r, "eoproject_entitlement", "denied", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	if a.cfg.MustLog {
		a.log.Info("eoproject.entitlement", "user_id", user.ID, "allowed", true)
	}
	return user
}

func (a *App) requireEoprojectUnsafe(w http.ResponseWriter, r *http.Request) *User {
	if !a.requireUnsafe(w, r) {
		return nil
	}
	return a.requireEoprojectUser(w, r)
}

func (a *App) eoprojectOwnedProject(w http.ResponseWriter, r *http.Request, user *User, projectID string, mutate bool) *eoprojectProject {
	p, err := a.eoproject.GetProject(r.Context(), projectID)
	if errors.Is(err, errNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return nil
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return nil
	}
	if mutate {
		if p.UserID != user.ID {
			a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
			return nil
		}
		return p
	}
	if p.UserID != user.ID && user.Role != roleAdmin {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	return p
}

func (a *App) eoprojectOwnedStage(w http.ResponseWriter, r *http.Request, user *User, projectID, stageID string, mutate bool) (*eoprojectProject, *eoprojectStage) {
	p := a.eoprojectOwnedProject(w, r, user, projectID, mutate)
	if p == nil {
		return nil, nil
	}
	st, err := a.eoproject.GetStage(r.Context(), stageID)
	if errors.Is(err, errNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return nil, nil
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return nil, nil
	}
	if st.ProjectID != p.ID || st.UserID != p.UserID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return nil, nil
	}
	return p, st
}

func (a *App) eoprojectInviteLandingURL(token string) string {
	base := strings.TrimRight(strings.TrimSpace(a.cfg.PublicBaseURL), "/")
	if base == "" {
		base = "https://eduardoos.com"
	}
	return base + "/eoproject/invite?token=" + url.QueryEscape(strings.TrimSpace(token))
}

func (a *App) eoprojectBuildDashboard(r *http.Request, project *eoprojectProject, shareToken string) (*eoprojectDashboard, error) {
	stages, err := a.eoproject.ListStages(r.Context(), project.ID)
	if err != nil {
		return nil, err
	}
	bundles := make([]eoprojectStageBundle, 0, len(stages))
	for _, st := range stages {
		photos, err := a.eoproject.ListPhotos(r.Context(), st.ID)
		if err != nil {
			return nil, err
		}
		photoOut := make([]eoprojectPhoto, 0, len(photos))
		for _, ph := range photos {
			cp := *ph
			if shareToken != "" {
				cp.URL = eoprojectSharePhotoURL(shareToken, ph.ID)
			} else {
				cp.URL = eoprojectPhotoURL(project.ID, st.ID, ph.ID)
			}
			photoOut = append(photoOut, cp)
		}
		versions, err := a.eoproject.ListIFC(r.Context(), st.ID)
		if err != nil {
			return nil, err
		}
		ifcOut := make([]eoprojectIFCVersion, 0, len(versions))
		for _, v := range versions {
			cp := *v
			if shareToken != "" {
				cp.URL = eoprojectShareIFCURL(shareToken, v.ID)
			} else {
				cp.URL = eoprojectIFCURL(project.ID, st.ID, v.ID)
			}
			ifcOut = append(ifcOut, cp)
		}
		bundles = append(bundles, eoprojectStageBundle{
			Stage:       *st,
			Photos:      photoOut,
			IFCVersions: ifcOut,
		})
	}
	return &eoprojectDashboard{Project: *project, Stages: bundles}, nil
}

func (a *App) eoprojectResolveShare(w http.ResponseWriter, r *http.Request, token string) (*eoprojectShare, *eoprojectProject) {
	token = strings.TrimSpace(token)
	if token == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return nil, nil
	}
	share, err := a.eoproject.GetShareByTokenHash(r.Context(), hashEoprojectToken(token))
	if errors.Is(err, errNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return nil, nil
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return nil, nil
	}
	if !time.Now().UTC().Before(share.ExpiresAt) {
		a.writeSafeError(w, r, http.StatusGone, "not_found")
		return nil, nil
	}
	project, err := a.eoproject.GetProject(r.Context(), share.ProjectID)
	if errors.Is(err, errNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return nil, nil
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return nil, nil
	}
	return share, project
}

func (a *App) eoprojectGetMe(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"email":   user.Email,
		"userId":  user.ID,
		"isAdmin": user.Role == roleAdmin,
	})
}

func (a *App) eoprojectListProjects(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	items, err := a.eoproject.ListProjectsByUser(r.Context(), user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if items == nil {
		items = []*eoprojectProject{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": items})
}

func (a *App) eoprojectCreateProject(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := sanitizeEoprojectText(body.Name, eoprojectMaxNameLen)
	if !validEoprojectName(name) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	p := &eoprojectProject{
		ID:          randomID(16),
		UserID:      user.ID,
		Name:        name,
		Description: sanitizeEoprojectText(body.Description, eoprojectMaxDescLen),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := a.eoproject.CreateProject(r.Context(), p); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoproject_project", "created", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"project": p})
}

func (a *App) eoprojectGetProject(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	p := a.eoprojectOwnedProject(w, r, user, r.PathValue("projectId"), false)
	if p == nil {
		return
	}
	dash, err := a.eoprojectBuildDashboard(r, p, "")
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, dash)
}

func (a *App) eoprojectUpdateProject(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p := a.eoprojectOwnedProject(w, r, user, r.PathValue("projectId"), true)
	if p == nil {
		return
	}
	var body struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if body.Name != nil {
		name := sanitizeEoprojectText(*body.Name, eoprojectMaxNameLen)
		if !validEoprojectName(name) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		p.Name = name
	}
	if body.Description != nil {
		p.Description = sanitizeEoprojectText(*body.Description, eoprojectMaxDescLen)
	}
	p.UpdatedAt = time.Now().UTC()
	if err := a.eoproject.UpdateProject(r.Context(), p); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"project": p})
}

func (a *App) eoprojectDeleteProject(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p := a.eoprojectOwnedProject(w, r, user, r.PathValue("projectId"), true)
	if p == nil {
		return
	}
	_ = a.eoproject.DeleteSharesByProject(r.Context(), p.ID)
	_ = a.eoproject.DeletePhotosByProject(r.Context(), p.ID)
	_ = a.eoproject.DeleteIFCByProject(r.Context(), p.ID)
	_ = a.eoproject.DeleteStagesByProject(r.Context(), p.ID)
	_ = a.eoproject.DeleteProject(r.Context(), p.ID)
	_ = a.eoprojectFS.removeProject(p.UserID, p.ID)
	a.auditEvent(r, "eoproject_project", "deleted", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) eoprojectListStages(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	p := a.eoprojectOwnedProject(w, r, user, r.PathValue("projectId"), false)
	if p == nil {
		return
	}
	stages, err := a.eoproject.ListStages(r.Context(), p.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if stages == nil {
		stages = []*eoprojectStage{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"stages": stages})
}

func (a *App) eoprojectCreateStage(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p := a.eoprojectOwnedProject(w, r, user, r.PathValue("projectId"), true)
	if p == nil {
		return
	}
	var body struct {
		Name      string `json:"name"`
		SortOrder *int   `json:"sortOrder"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := sanitizeEoprojectText(body.Name, eoprojectMaxNameLen)
	if !validEoprojectName(name) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	existing, err := a.eoproject.ListStages(r.Context(), p.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	order := len(existing)
	if body.SortOrder != nil {
		order = *body.SortOrder
	}
	now := time.Now().UTC()
	st := &eoprojectStage{
		ID:        randomID(16),
		ProjectID: p.ID,
		UserID:    p.UserID,
		Name:      name,
		SortOrder: order,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := a.eoprojectFS.ensureStage(p.UserID, p.ID, st.ID); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.eoproject.CreateStage(r.Context(), st); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	p.UpdatedAt = now
	_ = a.eoproject.UpdateProject(r.Context(), p)
	a.auditEvent(r, "eoproject_stage", "created", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"stage": st})
}

func (a *App) eoprojectUpdateStage(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), true)
	if p == nil || st == nil {
		return
	}
	var body struct {
		Name      *string `json:"name"`
		SortOrder *int    `json:"sortOrder"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if body.Name != nil {
		name := sanitizeEoprojectText(*body.Name, eoprojectMaxNameLen)
		if !validEoprojectName(name) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		st.Name = name
	}
	if body.SortOrder != nil {
		st.SortOrder = *body.SortOrder
	}
	st.UpdatedAt = time.Now().UTC()
	if err := a.eoproject.UpdateStage(r.Context(), st); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	p.UpdatedAt = st.UpdatedAt
	_ = a.eoproject.UpdateProject(r.Context(), p)
	writeJSON(w, http.StatusOK, map[string]any{"stage": st})
}

func (a *App) eoprojectDeleteStage(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), true)
	if p == nil || st == nil {
		return
	}
	_ = a.eoproject.DeletePhotosByStage(r.Context(), st.ID)
	_ = a.eoproject.DeleteIFCByStage(r.Context(), st.ID)
	_ = a.eoproject.DeleteStage(r.Context(), st.ID)
	_ = a.eoprojectFS.removeStage(p.UserID, p.ID, st.ID)
	p.UpdatedAt = time.Now().UTC()
	_ = a.eoproject.UpdateProject(r.Context(), p)
	a.auditEvent(r, "eoproject_stage", "deleted", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) eoprojectListPhotos(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), false)
	if p == nil || st == nil {
		return
	}
	photos, err := a.eoproject.ListPhotos(r.Context(), st.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]eoprojectPhoto, 0, len(photos))
	for _, ph := range photos {
		cp := *ph
		cp.URL = eoprojectPhotoURL(p.ID, st.ID, ph.ID)
		out = append(out, cp)
	}
	writeJSON(w, http.StatusOK, map[string]any{"photos": out})
}

func (a *App) eoprojectUploadPhoto(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), true)
	if p == nil || st == nil {
		return
	}
	if err := r.ParseMultipartForm(int64(eoprojectMaxPhotoBytes) + (1 << 20)); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	body, err := io.ReadAll(io.LimitReader(file, int64(eoprojectMaxPhotoBytes)+1))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(body) > eoprojectMaxPhotoBytes {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	kind, err := sniffImage(body)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	photoID := randomID(16)
	storage := photoID + kind.ext
	if err := a.eoprojectFS.ensureStage(p.UserID, p.ID, st.ID); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.eoprojectFS.putPhoto(p.UserID, p.ID, st.ID, storage, body); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := time.Now().UTC()
	ph := &eoprojectPhoto{
		ID:           photoID,
		ProjectID:    p.ID,
		StageID:      st.ID,
		UserID:       p.UserID,
		StorageName:  storage,
		OriginalName: path.Base(strings.TrimSpace(hdr.Filename)),
		ContentType:  kind.mime,
		Size:         int64(len(body)),
		CreatedAt:    now,
		URL:          eoprojectPhotoURL(p.ID, st.ID, photoID),
	}
	if err := a.eoproject.CreatePhoto(r.Context(), ph); err != nil {
		_ = a.eoprojectFS.deletePhoto(p.UserID, p.ID, st.ID, storage)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	p.UpdatedAt = now
	_ = a.eoproject.UpdateProject(r.Context(), p)
	a.auditEvent(r, "eoproject_photo", "uploaded", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"photo": ph})
}

func (a *App) eoprojectDeletePhoto(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), true)
	if p == nil || st == nil {
		return
	}
	ph, err := a.eoproject.GetPhoto(r.Context(), r.PathValue("photoId"))
	if errors.Is(err, errNotFound) || (ph != nil && (ph.StageID != st.ID || ph.ProjectID != p.ID)) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	_ = a.eoproject.DeletePhoto(r.Context(), ph.ID)
	_ = a.eoprojectFS.deletePhoto(p.UserID, p.ID, st.ID, ph.StorageName)
	a.auditEvent(r, "eoproject_photo", "deleted", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) eoprojectServePhoto(w http.ResponseWriter, r *http.Request, ownerID, projectID, stageID, storageName, contentType string) {
	f, info, err := a.eoprojectFS.openPhoto(ownerID, projectID, stageID, storageName)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
	w.Header().Set("Cache-Control", "private, max-age=60")
	http.ServeContent(w, r, storageName, info.ModTime(), f)
}

func (a *App) eoprojectGetPhotoFile(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), false)
	if p == nil || st == nil {
		return
	}
	ph, err := a.eoproject.GetPhoto(r.Context(), r.PathValue("photoId"))
	if errors.Is(err, errNotFound) || (ph != nil && (ph.StageID != st.ID || ph.ProjectID != p.ID)) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eoprojectServePhoto(w, r, p.UserID, p.ID, st.ID, ph.StorageName, ph.ContentType)
}

func (a *App) eoprojectListIFC(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), false)
	if p == nil || st == nil {
		return
	}
	versions, err := a.eoproject.ListIFC(r.Context(), st.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]eoprojectIFCVersion, 0, len(versions))
	for _, v := range versions {
		cp := *v
		cp.URL = eoprojectIFCURL(p.ID, st.ID, v.ID)
		out = append(out, cp)
	}
	writeJSON(w, http.StatusOK, map[string]any{"versions": out})
}

func (a *App) eoprojectUploadIFC(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), true)
	if p == nil || st == nil {
		return
	}
	if err := r.ParseMultipartForm(int64(eoprojectMaxIFCBytes) + (1 << 20)); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	body, err := io.ReadAll(io.LimitReader(file, int64(eoprojectMaxIFCBytes)+1))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(body) > eoprojectMaxIFCBytes {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	if !looksLikeIFC(body) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	label := sanitizeEoprojectText(r.FormValue("label"), eoprojectMaxLabelLen)
	next, err := a.eoproject.NextIFCVersion(r.Context(), st.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	versionID := randomID(16)
	storage := versionID + ".ifc"
	if err := a.eoprojectFS.ensureStage(p.UserID, p.ID, st.ID); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.eoprojectFS.putIFC(p.UserID, p.ID, st.ID, storage, body); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := time.Now().UTC()
	v := &eoprojectIFCVersion{
		ID:           versionID,
		ProjectID:    p.ID,
		StageID:      st.ID,
		UserID:       p.UserID,
		Version:      next,
		Label:        label,
		StorageName:  storage,
		OriginalName: path.Base(strings.TrimSpace(hdr.Filename)),
		Size:         int64(len(body)),
		CreatedAt:    now,
		URL:          eoprojectIFCURL(p.ID, st.ID, versionID),
	}
	if err := a.eoproject.CreateIFC(r.Context(), v); err != nil {
		_ = a.eoprojectFS.deleteIFC(p.UserID, p.ID, st.ID, storage)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	p.UpdatedAt = now
	_ = a.eoproject.UpdateProject(r.Context(), p)
	a.auditEvent(r, "eoproject_ifc", "uploaded", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"version": v})
}

func (a *App) eoprojectDeleteIFC(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), true)
	if p == nil || st == nil {
		return
	}
	v, err := a.eoproject.GetIFC(r.Context(), r.PathValue("versionId"))
	if errors.Is(err, errNotFound) || (v != nil && (v.StageID != st.ID || v.ProjectID != p.ID)) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	_ = a.eoproject.DeleteIFC(r.Context(), v.ID)
	_ = a.eoprojectFS.deleteIFC(p.UserID, p.ID, st.ID, v.StorageName)
	a.auditEvent(r, "eoproject_ifc", "deleted", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) eoprojectServeIFC(w http.ResponseWriter, r *http.Request, ownerID, projectID, stageID, storageName string) {
	f, info, err := a.eoprojectFS.openIFC(ownerID, projectID, stageID, storageName)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	w.Header().Set("Content-Type", "application/x-step")
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
	w.Header().Set("Cache-Control", "private, max-age=60")
	http.ServeContent(w, r, storageName, info.ModTime(), f)
}

func (a *App) eoprojectGetIFCFile(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), false)
	if p == nil || st == nil {
		return
	}
	v, err := a.eoproject.GetIFC(r.Context(), r.PathValue("versionId"))
	if errors.Is(err, errNotFound) || (v != nil && (v.StageID != st.ID || v.ProjectID != p.ID)) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eoprojectServeIFC(w, r, p.UserID, p.ID, st.ID, v.StorageName)
}

func (a *App) eoprojectListShares(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	p := a.eoprojectOwnedProject(w, r, user, r.PathValue("projectId"), false)
	if p == nil {
		return
	}
	shares, err := a.eoproject.ListSharesByProject(r.Context(), p.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]map[string]any, 0, len(shares))
	for _, sh := range shares {
		out = append(out, map[string]any{
			"id":        sh.ID,
			"label":     sh.Label,
			"expiresAt": sh.ExpiresAt.UTC().Format(time.RFC3339),
			"createdAt": sh.CreatedAt.UTC().Format(time.RFC3339),
			"expired":   !time.Now().UTC().Before(sh.ExpiresAt),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"shares": out})
}

func (a *App) eoprojectCreateShare(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p := a.eoprojectOwnedProject(w, r, user, r.PathValue("projectId"), true)
	if p == nil {
		return
	}
	var body struct {
		Label         string `json:"label"`
		DurationHours int    `json:"durationHours"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	hours := body.DurationHours
	if hours < eoprojectShareMinHours {
		hours = 72
	}
	if hours > eoprojectShareMaxHours {
		hours = eoprojectShareMaxHours
	}
	now := time.Now().UTC()
	raw := randomID(24)
	sh := &eoprojectShare{
		ID:        randomID(12),
		TokenHash: hashEoprojectToken(raw),
		UserID:    user.ID,
		ProjectID: p.ID,
		Label:     sanitizeEoprojectText(body.Label, eoprojectMaxLabelLen),
		ExpiresAt: now.Add(time.Duration(hours) * time.Hour),
		CreatedAt: now,
		RawToken:  raw,
		Link:      a.eoprojectInviteLandingURL(raw),
	}
	if err := a.eoproject.CreateShare(r.Context(), sh); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoproject_share", "created", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"share": map[string]any{
			"id":        sh.ID,
			"label":     sh.Label,
			"token":     raw,
			"link":      sh.Link,
			"expiresAt": sh.ExpiresAt.Format(time.RFC3339),
			"createdAt": sh.CreatedAt.Format(time.RFC3339),
		},
	})
}

func (a *App) eoprojectDeleteShare(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p := a.eoprojectOwnedProject(w, r, user, r.PathValue("projectId"), true)
	if p == nil {
		return
	}
	shares, err := a.eoproject.ListSharesByProject(r.Context(), p.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	shareID := r.PathValue("shareId")
	found := false
	for _, sh := range shares {
		if sh.ID == shareID {
			found = true
			break
		}
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	_ = a.eoproject.DeleteShare(r.Context(), shareID)
	a.auditEvent(r, "eoproject_share", "deleted", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) eoprojectGetInvite(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	share, project := a.eoprojectResolveShare(w, r, token)
	if share == nil || project == nil {
		return
	}
	dash, err := a.eoprojectBuildDashboard(r, project, token)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"valid":     true,
		"expiresAt": share.ExpiresAt.UTC().Format(time.RFC3339),
		"label":     share.Label,
		"dashboard": dash,
	})
}

func (a *App) eoprojectInvitePhotoFile(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	share, project := a.eoprojectResolveShare(w, r, token)
	if share == nil || project == nil {
		return
	}
	ph, err := a.eoproject.GetPhoto(r.Context(), r.PathValue("photoId"))
	if errors.Is(err, errNotFound) || (ph != nil && ph.ProjectID != project.ID) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eoprojectServePhoto(w, r, project.UserID, project.ID, ph.StageID, ph.StorageName, ph.ContentType)
}

func (a *App) eoprojectInviteIFCFile(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	share, project := a.eoprojectResolveShare(w, r, token)
	if share == nil || project == nil {
		return
	}
	v, err := a.eoproject.GetIFC(r.Context(), r.PathValue("versionId"))
	if errors.Is(err, errNotFound) || (v != nil && v.ProjectID != project.ID) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eoprojectServeIFC(w, r, project.UserID, project.ID, v.StageID, v.StorageName)
}
