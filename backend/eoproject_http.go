package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
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
	mux.HandleFunc("GET /api/eoproject/invite/{token}/videos/{videoId}/file", a.eoprojectInviteVideoFile)
	mux.HandleFunc("GET /api/eoproject/invite/{token}/photos/{photoId}/documents/{docId}/file", a.eoprojectInviteDocFile)

	mux.HandleFunc("PATCH /api/eoproject/projects/{projectId}/stages/{stageId}/photos/{photoId}", a.eoprojectUpdatePhotoTag)
	mux.HandleFunc("POST /api/eoproject/projects/{projectId}/stages/reorder", a.eoprojectReorderStages)
	mux.HandleFunc("POST /api/eoproject/projects/{projectId}/stages/{stageId}/photos/reorder", a.eoprojectReorderPhotos)

	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/stages/{stageId}/videos", a.eoprojectListVideos)
	mux.HandleFunc("POST /api/eoproject/projects/{projectId}/stages/{stageId}/videos", a.eoprojectUploadVideo)
	mux.HandleFunc("DELETE /api/eoproject/projects/{projectId}/stages/{stageId}/videos/{videoId}", a.eoprojectDeleteVideo)
	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/stages/{stageId}/videos/{videoId}/file", a.eoprojectGetVideoFile)

	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/stages/{stageId}/photos/{photoId}/documents", a.eoprojectListDocs)
	mux.HandleFunc("POST /api/eoproject/projects/{projectId}/stages/{stageId}/photos/{photoId}/documents", a.eoprojectUploadDoc)
	mux.HandleFunc("DELETE /api/eoproject/projects/{projectId}/stages/{stageId}/photos/{photoId}/documents/{docId}", a.eoprojectDeleteDoc)
	mux.HandleFunc("GET /api/eoproject/projects/{projectId}/stages/{stageId}/photos/{photoId}/documents/{docId}/file", a.eoprojectGetDocFile)
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

// eoprojectShareToken derives a deterministic, signed share token from the
// share id and expiry. Because it is reproducible, the client view panel can
// display the magic link at any time without storing the raw token (only its
// hash is persisted, matching the rest of the auth surface).
func (a *App) eoprojectShareToken(shareID string, expiresAt time.Time) string {
	exp := strconv.FormatInt(expiresAt.UTC().Unix(), 10)
	msg := shareID + "." + exp
	mac := hmac.New(sha256.New, []byte(a.cfg.JWTSecret))
	mac.Write([]byte(msg))
	return msg + "." + hex.EncodeToString(mac.Sum(nil))
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
			docs, err := a.eoproject.ListDocsByPhoto(r.Context(), ph.ID)
			if err != nil {
				return nil, err
			}
			if len(docs) > 0 {
				cp.Documents = make([]eoprojectPhotoDocument, 0, len(docs))
				for _, d := range docs {
					dc := *d
					if shareToken != "" {
						dc.URL = eoprojectShareDocURL(shareToken, ph.ID, d.ID)
					} else {
						dc.URL = eoprojectDocURL(project.ID, st.ID, ph.ID, d.ID)
					}
					cp.Documents = append(cp.Documents, dc)
				}
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
		videos, err := a.eoproject.ListVideos(r.Context(), st.ID)
		if err != nil {
			return nil, err
		}
		videoOut := make([]eoprojectVideo, 0, len(videos))
		for _, v := range videos {
			cp := *v
			if shareToken != "" {
				cp.URL = eoprojectShareVideoURL(shareToken, v.ID)
			} else {
				cp.URL = eoprojectVideoURL(project.ID, st.ID, v.ID)
			}
			videoOut = append(videoOut, cp)
		}
		bundles = append(bundles, eoprojectStageBundle{
			Stage:       *st,
			Photos:      photoOut,
			IFCVersions: ifcOut,
			Videos:      videoOut,
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
	_ = a.eoproject.DeleteDocsByProject(r.Context(), p.ID)
	_ = a.eoproject.DeleteVideosByProject(r.Context(), p.ID)
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
	_ = a.eoproject.DeleteDocsByStage(r.Context(), st.ID)
	_ = a.eoproject.DeleteVideosByStage(r.Context(), st.ID)
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
		a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
		return
	}
	converted, err := eoprojectToWebp(body, kind.mime)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
		return
	}
	photoID := randomID(16)
	storage := photoID + ".webp"
	tag := sanitizeEoprojectText(r.FormValue("tag"), eoprojectMaxTagLen)
	if err := a.eoprojectFS.ensureStage(p.UserID, p.ID, st.ID); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.eoprojectFS.putPhoto(p.UserID, p.ID, st.ID, storage, converted); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := time.Now().UTC()
	sortOrder := 0
	if existing, err := a.eoproject.ListPhotos(r.Context(), st.ID); err == nil {
		sortOrder = len(existing)
	}
	ph := &eoprojectPhoto{
		ID:           photoID,
		ProjectID:    p.ID,
		StageID:      st.ID,
		UserID:       p.UserID,
		StorageName:  storage,
		OriginalName: eoprojectWebpOriginalName(hdr.Filename),
		ContentType:  "image/webp",
		Size:         int64(len(converted)),
		Tag:          tag,
		SortOrder:    sortOrder,
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
	docs, _ := a.eoproject.ListDocsByPhoto(r.Context(), ph.ID)
	for _, d := range docs {
		_ = a.eoprojectFS.deleteDoc(p.UserID, p.ID, st.ID, ph.ID, d.StorageName)
	}
	_ = a.eoproject.DeleteDocsByPhoto(r.Context(), ph.ID)
	_ = a.eoproject.DeletePhoto(r.Context(), ph.ID)
	_ = a.eoprojectFS.deletePhoto(p.UserID, p.ID, st.ID, ph.StorageName)
	a.auditEvent(r, "eoproject_photo", "deleted", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) eoprojectServePhoto(w http.ResponseWriter, r *http.Request, ownerID, projectID, stageID, storageName, contentType, originalName string) {
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
	filename := path.Base(strings.TrimSpace(originalName))
	if filename == "" || filename == "." || filename == ".." {
		filename = path.Base(storageName)
	}
	if strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("download")), "1") ||
		strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("download")), "true") {
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, sanitizeEoprojectDownloadName(filename)))
	} else {
		w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, sanitizeEoprojectDownloadName(filename)))
	}
	http.ServeContent(w, r, filename, info.ModTime(), f)
}

func sanitizeEoprojectDownloadName(name string) string {
	name = path.Base(strings.TrimSpace(name))
	name = strings.ReplaceAll(name, `"`, "")
	name = strings.ReplaceAll(name, "\r", "")
	name = strings.ReplaceAll(name, "\n", "")
	if name == "" || name == "." || name == ".." {
		return "photo"
	}
	return name
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
	a.eoprojectServePhoto(w, r, p.UserID, p.ID, st.ID, ph.StorageName, ph.ContentType, ph.OriginalName)
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
		token := a.eoprojectShareToken(sh.ID, sh.ExpiresAt)
		link := ""
		if hashEoprojectToken(token) == sh.TokenHash {
			link = a.eoprojectInviteLandingURL(token)
		}
		out = append(out, map[string]any{
			"id":        sh.ID,
			"label":     sh.Label,
			"expiresAt": sh.ExpiresAt.UTC().Format(time.RFC3339),
			"createdAt": sh.CreatedAt.UTC().Format(time.RFC3339),
			"expired":   !time.Now().UTC().Before(sh.ExpiresAt),
			"link":      link,
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
	sh := &eoprojectShare{
		ID:        randomID(12),
		UserID:    user.ID,
		ProjectID: p.ID,
		Label:     sanitizeEoprojectText(body.Label, eoprojectMaxLabelLen),
		ExpiresAt: now.Add(time.Duration(hours) * time.Hour),
		CreatedAt: now,
	}
	raw := a.eoprojectShareToken(sh.ID, sh.ExpiresAt)
	sh.TokenHash = hashEoprojectToken(raw)
	sh.RawToken = raw
	sh.Link = a.eoprojectInviteLandingURL(raw)
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
	a.eoprojectServePhoto(w, r, project.UserID, project.ID, ph.StageID, ph.StorageName, ph.ContentType, ph.OriginalName)
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

func eoprojectOpenFilePart(r *http.Request) (io.ReadCloser, string, string, error) {
	mr, err := r.MultipartReader()
	if err != nil {
		return nil, "", "", err
	}
	for {
		p, err := mr.NextPart()
		if err != nil {
			return nil, "", "", err
		}
		if p.FormName() != "file" {
			_ = p.Close()
			continue
		}
		return p, p.FileName(), p.Header.Get("Content-Type"), nil
	}
}

func looksLikeMP4(data []byte) bool {
	return len(data) >= 8 && string(data[4:8]) == "ftyp"
}

func (a *App) eoprojectListVideos(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), false)
	if p == nil || st == nil {
		return
	}
	videos, err := a.eoproject.ListVideos(r.Context(), st.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]eoprojectVideo, 0, len(videos))
	for _, v := range videos {
		cp := *v
		cp.URL = eoprojectVideoURL(p.ID, st.ID, v.ID)
		out = append(out, cp)
	}
	writeJSON(w, http.StatusOK, map[string]any{"videos": out})
}

func (a *App) eoprojectUploadVideo(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), true)
	if p == nil || st == nil {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.EoprojectMaxVideoBytes+(1<<20))
	part, filename, _, err := eoprojectOpenFilePart(r)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer part.Close()
	head := make([]byte, 12)
	n, _ := io.ReadFull(part, head)
	if n < 8 || !looksLikeMP4(head[:n]) {
		a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
		return
	}
	videoID := randomID(16)
	storage := videoID + ".mp4"
	if err := a.eoprojectFS.ensureStage(p.UserID, p.ID, st.ID); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	size, err := a.eoprojectFS.putVideoStream(p.UserID, p.ID, st.ID, storage, io.MultiReader(bytes.NewReader(head[:n]), part))
	if err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			_ = a.eoprojectFS.deleteVideo(p.UserID, p.ID, st.ID, storage)
			a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
			return
		}
		_ = a.eoprojectFS.deleteVideo(p.UserID, p.ID, st.ID, storage)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if size > a.cfg.EoprojectMaxVideoBytes {
		_ = a.eoprojectFS.deleteVideo(p.UserID, p.ID, st.ID, storage)
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	now := time.Now().UTC()
	v := &eoprojectVideo{
		ID:           videoID,
		ProjectID:    p.ID,
		StageID:      st.ID,
		UserID:       p.UserID,
		StorageName:  storage,
		OriginalName: path.Base(strings.TrimSpace(filename)),
		ContentType:  "video/mp4",
		Size:         size,
		CreatedAt:    now,
		URL:          eoprojectVideoURL(p.ID, st.ID, videoID),
	}
	if err := a.eoproject.CreateVideo(r.Context(), v); err != nil {
		_ = a.eoprojectFS.deleteVideo(p.UserID, p.ID, st.ID, storage)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	p.UpdatedAt = now
	_ = a.eoproject.UpdateProject(r.Context(), p)
	a.auditEvent(r, "eoproject_video", "uploaded", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"video": v})
}

func (a *App) eoprojectServeVideo(w http.ResponseWriter, r *http.Request, ownerID, projectID, stageID, storageName, contentType string) {
	f, info, err := a.eoprojectFS.openVideo(ownerID, projectID, stageID, storageName)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	if contentType == "" {
		contentType = "video/mp4"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
	w.Header().Set("Cache-Control", "private, max-age=60")
	http.ServeContent(w, r, storageName, info.ModTime(), f)
}

func (a *App) eoprojectGetVideoFile(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUser(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), false)
	if p == nil || st == nil {
		return
	}
	v, err := a.eoproject.GetVideo(r.Context(), r.PathValue("videoId"))
	if errors.Is(err, errNotFound) || (v != nil && (v.StageID != st.ID || v.ProjectID != p.ID)) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eoprojectServeVideo(w, r, p.UserID, p.ID, st.ID, v.StorageName, v.ContentType)
}

func (a *App) eoprojectDeleteVideo(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), true)
	if p == nil || st == nil {
		return
	}
	v, err := a.eoproject.GetVideo(r.Context(), r.PathValue("videoId"))
	if errors.Is(err, errNotFound) || (v != nil && (v.StageID != st.ID || v.ProjectID != p.ID)) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	_ = a.eoproject.DeleteVideo(r.Context(), v.ID)
	_ = a.eoprojectFS.deleteVideo(p.UserID, p.ID, st.ID, v.StorageName)
	a.auditEvent(r, "eoproject_video", "deleted", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) eoprojectInviteVideoFile(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	share, project := a.eoprojectResolveShare(w, r, token)
	if share == nil || project == nil {
		return
	}
	v, err := a.eoproject.GetVideo(r.Context(), r.PathValue("videoId"))
	if errors.Is(err, errNotFound) || (v != nil && v.ProjectID != project.ID) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eoprojectServeVideo(w, r, project.UserID, project.ID, v.StageID, v.StorageName, v.ContentType)
}

func eoprojectSameIDs(current, wanted []string) bool {
	if len(current) != len(wanted) {
		return false
	}
	seen := make(map[string]bool, len(current))
	for _, id := range current {
		seen[id] = true
	}
	for _, id := range wanted {
		if !seen[id] {
			return false
		}
		seen[id] = false
	}
	return true
}

func (a *App) eoprojectReorderStages(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p := a.eoprojectOwnedProject(w, r, user, r.PathValue("projectId"), true)
	if p == nil {
		return
	}
	var body struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	stages, err := a.eoproject.ListStages(r.Context(), p.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	byID := make(map[string]*eoprojectStage, len(stages))
	current := make([]string, 0, len(stages))
	for _, st := range stages {
		byID[st.ID] = st
		current = append(current, st.ID)
	}
	if !eoprojectSameIDs(current, body.IDs) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	for i, id := range body.IDs {
		st := byID[id]
		if st.SortOrder == i {
			continue
		}
		st.SortOrder = i
		st.UpdatedAt = now
		if err := a.eoproject.UpdateStage(r.Context(), st); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
	}
	p.UpdatedAt = now
	_ = a.eoproject.UpdateProject(r.Context(), p)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) eoprojectReorderPhotos(w http.ResponseWriter, r *http.Request) {
	user := a.requireEoprojectUnsafe(w, r)
	if user == nil {
		return
	}
	p, st := a.eoprojectOwnedStage(w, r, user, r.PathValue("projectId"), r.PathValue("stageId"), true)
	if p == nil || st == nil {
		return
	}
	var body struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	photos, err := a.eoproject.ListPhotos(r.Context(), st.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	byID := make(map[string]*eoprojectPhoto, len(photos))
	current := make([]string, 0, len(photos))
	for _, ph := range photos {
		byID[ph.ID] = ph
		current = append(current, ph.ID)
	}
	if !eoprojectSameIDs(current, body.IDs) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	for i, id := range body.IDs {
		ph := byID[id]
		if ph.SortOrder == i {
			continue
		}
		ph.SortOrder = i
		if err := a.eoproject.UpdatePhoto(r.Context(), ph); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
	}
	p.UpdatedAt = time.Now().UTC()
	_ = a.eoproject.UpdateProject(r.Context(), p)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) eoprojectUpdatePhotoTag(w http.ResponseWriter, r *http.Request) {
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
	var body struct {
		Tag       *string `json:"tag"`
		SortOrder *int    `json:"sortOrder"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if body.Tag != nil {
		ph.Tag = sanitizeEoprojectText(*body.Tag, eoprojectMaxTagLen)
	}
	if body.SortOrder != nil {
		ph.SortOrder = *body.SortOrder
	}
	if err := a.eoproject.UpdatePhoto(r.Context(), ph); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"photo": ph})
}

func (a *App) eoprojectListDocs(w http.ResponseWriter, r *http.Request) {
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
	docs, err := a.eoproject.ListDocsByPhoto(r.Context(), ph.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]eoprojectPhotoDocument, 0, len(docs))
	for _, d := range docs {
		cp := *d
		cp.URL = eoprojectDocURL(p.ID, st.ID, ph.ID, d.ID)
		out = append(out, cp)
	}
	writeJSON(w, http.StatusOK, map[string]any{"documents": out})
}

func (a *App) eoprojectUploadDoc(w http.ResponseWriter, r *http.Request) {
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
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.EoprojectMaxDocumentBytes+(1<<20))
	part, filename, contentType, err := eoprojectOpenFilePart(r)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer part.Close()
	docID := randomID(16)
	ext := strings.ToLower(path.Ext(strings.TrimSpace(filename)))
	if len(ext) > 16 {
		ext = ""
	}
	storage := docID + ext
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	size, err := a.eoprojectFS.putDocStream(p.UserID, p.ID, st.ID, ph.ID, storage, part)
	if err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			_ = a.eoprojectFS.deleteDoc(p.UserID, p.ID, st.ID, ph.ID, storage)
			a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
			return
		}
		_ = a.eoprojectFS.deleteDoc(p.UserID, p.ID, st.ID, ph.ID, storage)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if size > a.cfg.EoprojectMaxDocumentBytes {
		_ = a.eoprojectFS.deleteDoc(p.UserID, p.ID, st.ID, ph.ID, storage)
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	now := time.Now().UTC()
	d := &eoprojectPhotoDocument{
		ID:           docID,
		ProjectID:    p.ID,
		StageID:      st.ID,
		PhotoID:      ph.ID,
		UserID:       p.UserID,
		StorageName:  storage,
		OriginalName: path.Base(strings.TrimSpace(filename)),
		ContentType:  contentType,
		Size:         size,
		CreatedAt:    now,
		URL:          eoprojectDocURL(p.ID, st.ID, ph.ID, docID),
	}
	if err := a.eoproject.CreateDoc(r.Context(), d); err != nil {
		_ = a.eoprojectFS.deleteDoc(p.UserID, p.ID, st.ID, ph.ID, storage)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	p.UpdatedAt = now
	_ = a.eoproject.UpdateProject(r.Context(), p)
	a.auditEvent(r, "eoproject_doc", "uploaded", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"document": d})
}

func (a *App) eoprojectServeDoc(w http.ResponseWriter, r *http.Request, ownerID, projectID, stageID, photoID, storageName, contentType, originalName string) {
	f, info, err := a.eoprojectFS.openDoc(ownerID, projectID, stageID, photoID, storageName)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	filename := path.Base(strings.TrimSpace(originalName))
	if filename == "" || filename == "." || filename == ".." {
		filename = path.Base(storageName)
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, sanitizeEoprojectDownloadName(filename)))
	w.Header().Set("Cache-Control", "private, max-age=60")
	http.ServeContent(w, r, filename, info.ModTime(), f)
}

func (a *App) eoprojectGetDocFile(w http.ResponseWriter, r *http.Request) {
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
	d, err := a.eoproject.GetDoc(r.Context(), r.PathValue("docId"))
	if errors.Is(err, errNotFound) || (d != nil && (d.PhotoID != ph.ID || d.ProjectID != p.ID)) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eoprojectServeDoc(w, r, p.UserID, p.ID, st.ID, ph.ID, d.StorageName, d.ContentType, d.OriginalName)
}

func (a *App) eoprojectDeleteDoc(w http.ResponseWriter, r *http.Request) {
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
	d, err := a.eoproject.GetDoc(r.Context(), r.PathValue("docId"))
	if errors.Is(err, errNotFound) || (d != nil && (d.PhotoID != ph.ID || d.ProjectID != p.ID)) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	_ = a.eoproject.DeleteDoc(r.Context(), d.ID)
	_ = a.eoprojectFS.deleteDoc(p.UserID, p.ID, st.ID, ph.ID, d.StorageName)
	a.auditEvent(r, "eoproject_doc", "deleted", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) eoprojectInviteDocFile(w http.ResponseWriter, r *http.Request) {
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
	d, err := a.eoproject.GetDoc(r.Context(), r.PathValue("docId"))
	if errors.Is(err, errNotFound) || (d != nil && (d.PhotoID != ph.ID || d.ProjectID != project.ID)) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eoprojectServeDoc(w, r, project.UserID, project.ID, d.StageID, d.PhotoID, d.StorageName, d.ContentType, d.OriginalName)
}
