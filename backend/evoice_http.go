package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"sort"
	"strings"
	"time"
)

func (a *App) registerEvoiceRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/evoice/me", a.evoiceGetMe)
	mux.HandleFunc("GET /api/evoice/users", a.evoiceListUsers)
	mux.HandleFunc("GET /api/evoice/projects", a.evoiceListProjects)
	mux.HandleFunc("POST /api/evoice/projects", a.evoiceCreateProject)
	mux.HandleFunc("DELETE /api/evoice/projects/{ownerSafe}/{project}", a.evoiceDeleteProject)
	mux.HandleFunc("GET /api/evoice/projects/{ownerSafe}/{project}/docs", a.evoiceListDocs)
	mux.HandleFunc("POST /api/evoice/projects/{ownerSafe}/{project}/docs", a.evoiceUploadDoc)
	mux.HandleFunc("POST /api/evoice/projects/{ownerSafe}/{project}/docs/text", a.evoicePasteDocText)
	mux.HandleFunc("DELETE /api/evoice/projects/{ownerSafe}/{project}/docs", a.evoiceDeleteDoc)
	mux.HandleFunc("GET /api/evoice/projects/{ownerSafe}/{project}/audios", a.evoiceListAudios)
	mux.HandleFunc("DELETE /api/evoice/projects/{ownerSafe}/{project}/audios", a.evoiceDeleteAudio)
	mux.HandleFunc("GET /api/evoice/file/{ownerSafe}/{project}/{kind}", a.evoiceGetFile)
	mux.HandleFunc("HEAD /api/evoice/file/{ownerSafe}/{project}/{kind}", a.evoiceGetFile)
	mux.HandleFunc("POST /api/evoice/projects/{ownerSafe}/{project}/generate", a.evoiceStartGenerate)
	mux.HandleFunc("GET /api/evoice/jobs/{jobId}", a.evoiceGetJob)
	mux.HandleFunc("POST /api/evoice/jobs/{jobId}/stop", a.evoiceStopJob)
	mux.HandleFunc("POST /api/evoice/jobs/{jobId}/resume", a.evoiceResumeJob)
	mux.HandleFunc("POST /api/evoice/projects/{ownerSafe}/{project}/shares", a.evoiceCreatePlaylistShare)
	mux.HandleFunc("GET /api/evoice/invite/{token}", a.evoiceGetPlaylistShareInvite)
	mux.HandleFunc("POST /api/evoice/invite/{token}/accept", a.evoiceAcceptPlaylistShareInvite)
}

func (a *App) hasEvoiceAccess(r *http.Request, user *User) (allowed bool, unavailable bool) {
	if a.failClosedEnt {
		return false, true
	}
	if user == nil {
		return false, false
	}
	if user.Role == roleAdmin {
		return true, false
	}
	if isEvoiceAllowlisted(user.EmailNormalized) || isEvoiceAllowlisted(user.Email) {
		return true, false
	}
	return a.hasProductEntitlement(r, user, productEvoice)
}

func (a *App) requireEvoiceUser(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	ok, unavailable := a.hasEvoiceAccess(r, user)
	if unavailable {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return nil
	}
	if !ok {
		if a.cfg.MustLog {
			a.log.Info("evoice.entitlement", "user_id", user.ID, "allowed", false)
		}
		a.auditEvent(r, "evoice_entitlement", "denied", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	if a.cfg.MustLog {
		a.log.Info("evoice.entitlement", "user_id", user.ID, "allowed", true)
	}
	return user
}

func (a *App) requireEvoiceUnsafe(w http.ResponseWriter, r *http.Request) *User {
	if !a.requireUnsafe(w, r) {
		return nil
	}
	return a.requireEvoiceUser(w, r)
}

func (a *App) canAccessEvoiceOwner(r *http.Request, caller *User, ownerSafe string) bool {
	if caller == nil {
		return false
	}
	if caller.Role == roleAdmin {
		return true
	}
	return caller.ID == strings.TrimSpace(ownerSafe)
}

func (a *App) evoiceGetMe(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUser(w, r)
	if user == nil {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"email":    user.Email,
		"userId":   user.ID,
		"userSafe": user.ID,
		"isAdmin":  user.Role == roleAdmin,
	})
}

func (a *App) evoiceListUsers(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUser(w, r)
	if user == nil {
		return
	}
	if user.Role != roleAdmin {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	seen := map[string]struct{}{}
	add := func(id string) {
		id = strings.TrimSpace(id)
		if id != "" {
			seen[id] = struct{}{}
		}
	}
	if all, err := a.store.ListUsers(r.Context()); err == nil {
		for _, u := range all {
			add(u.ID)
		}
	}
	add(user.ID)
	users := make([]string, 0, len(seen))
	for u := range seen {
		users = append(users, u)
	}
	sort.Strings(users)
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

func (a *App) evoiceListProjects(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUser(w, r)
	if user == nil {
		return
	}
	owner := strings.TrimSpace(r.URL.Query().Get("owner"))
	if owner == "" {
		owner = user.ID
	}
	if !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	docs, err := a.evoiceMeta.ListProjects(r.Context(), owner)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	projects := make([]string, 0, len(docs))
	for _, p := range docs {
		projects = append(projects, p.Name)
	}
	if a.cfg.MustLog {
		a.log.Info("evoice.projects.list", "owner", owner, "count", len(projects))
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ownerSafe": owner,
		"projects":  projects,
	})
}

func (a *App) evoiceCreateProject(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	var body struct {
		Name  string `json:"name"`
		Owner string `json:"owner"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := sanitizeEvoiceProject(body.Name)
	if !validEvoiceProjectName(name) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	owner := strings.TrimSpace(body.Owner)
	if owner == "" {
		owner = user.ID
	}
	if !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if err := a.evoiceFS.ensureProject(owner, name); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := time.Now().UTC()
	doc := &evoiceProjectDoc{
		ID:        randomID(12),
		UserID:    owner,
		Name:      name,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if existing, err := a.evoiceMeta.GetProject(r.Context(), owner, name); err == nil && existing != nil {
		doc.ID = existing.ID
		doc.CreatedAt = existing.CreatedAt
	}
	if err := a.evoiceMeta.UpsertProject(r.Context(), doc); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if a.cfg.MustLog {
		a.log.Info("evoice.projects.create", "owner", owner, "project", name)
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"ownerSafe": owner,
		"project":   name,
	})
}

func (a *App) evoiceDeleteProject(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	owner := r.PathValue("ownerSafe")
	project := r.PathValue("project")
	if !validEvoiceProjectName(project) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	_ = a.evoiceMeta.DeleteProject(r.Context(), owner, project)
	_ = a.evoiceFS.removeProject(owner, project)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (a *App) evoiceListDocs(w http.ResponseWriter, r *http.Request) {
	a.evoiceListKind(w, r, "docs")
}

func (a *App) evoiceListAudios(w http.ResponseWriter, r *http.Request) {
	a.evoiceListKind(w, r, "audios")
}

func (a *App) evoiceListKind(w http.ResponseWriter, r *http.Request, kind string) {
	user := a.requireEvoiceUser(w, r)
	if user == nil {
		return
	}
	owner := r.PathValue("ownerSafe")
	project := r.PathValue("project")
	if !validEvoiceProjectName(project) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	items, err := a.evoiceFS.listKind(owner, project, kind)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ownerSafe": owner,
		"project":   project,
		kind:        items,
	})
}

func (a *App) evoiceUploadDoc(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	owner := r.PathValue("ownerSafe")
	project := r.PathValue("project")
	if !validEvoiceProjectName(project) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if err := r.ParseMultipartForm(evoiceMaxUpload); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	file, hdr, err := r.FormFile("file")
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	name := sanitizeEvoiceFileName(hdr.Filename)
	if !validEvoiceFileName(name) || !isEvoiceConvertible(name) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	body, err := io.ReadAll(io.LimitReader(file, evoiceMaxUpload+1))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(body) > evoiceMaxUpload {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	if err := a.evoiceFS.ensureProject(owner, project); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.evoiceFS.putFile(owner, project, "docs", name, body); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if a.cfg.MustLog {
		a.log.Info("evoice.docs.upload", "owner", owner, "project", project, "name", name, "bytes", len(body))
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"ownerSafe": owner,
		"project":   project,
		"name":      name,
		"key":       evoiceRelKey(owner, project, "docs", name),
		"size":      len(body),
		"url":       fmt.Sprintf("/api/evoice/file/%s/%s/docs?name=%s", owner, project, url.QueryEscape(name)),
	})
}

func (a *App) evoicePasteDocText(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	owner := r.PathValue("ownerSafe")
	project := r.PathValue("project")
	if !validEvoiceProjectName(project) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	var body struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, evoiceMaxUpload+1)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	text := strings.TrimSpace(body.Text)
	if text == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(text) > evoiceMaxUpload {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	name := fmt.Sprintf("paste-%s.txt", time.Now().UTC().Format("20060102-150405"))
	if err := a.evoiceFS.ensureProject(owner, project); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	raw := []byte(text)
	if err := a.evoiceFS.putFile(owner, project, "docs", name, raw); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"ownerSafe": owner,
		"project":   project,
		"name":      name,
		"key":       evoiceRelKey(owner, project, "docs", name),
		"size":      len(raw),
		"url":       fmt.Sprintf("/api/evoice/file/%s/%s/docs?name=%s", owner, project, url.QueryEscape(name)),
	})
}

func evoiceFileNameFromRequest(r *http.Request) string {
	if q := strings.TrimSpace(r.URL.Query().Get("name")); q != "" {
		return sanitizeEvoiceFileName(q)
	}
	return ""
}

func (a *App) evoiceDeleteDoc(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	owner := r.PathValue("ownerSafe")
	project := r.PathValue("project")
	name := evoiceFileNameFromRequest(r)
	if !validEvoiceProjectName(project) || !validEvoiceFileName(name) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if err := a.evoiceFS.deleteFile(owner, project, "docs", name); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true, "key": evoiceRelKey(owner, project, "docs", name)})
}

func (a *App) evoiceDeleteAudio(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	owner := r.PathValue("ownerSafe")
	project := r.PathValue("project")
	name := evoiceFileNameFromRequest(r)
	if !validEvoiceProjectName(project) || !validEvoiceFileName(name) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !strings.HasSuffix(strings.ToLower(name), ".mp3") {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if err := a.evoiceFS.deleteFile(owner, project, "audios", name); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true, "key": evoiceRelKey(owner, project, "audios", name)})
}

func (a *App) evoiceGetFile(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUser(w, r)
	if user == nil {
		return
	}
	owner := r.PathValue("ownerSafe")
	project := r.PathValue("project")
	kind := r.PathValue("kind")
	name := evoiceFileNameFromRequest(r)
	if name == "" {
		if k := strings.TrimSpace(r.URL.Query().Get("key")); k != "" {
			name = sanitizeEvoiceFileName(path.Base(k))
		}
	}
	if !validEvoiceProjectName(project) || (kind != "docs" && kind != "audios") || !validEvoiceFileName(name) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	f, info, err := a.evoiceFS.openFile(owner, project, kind, name)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	defer f.Close()
	ct := evoiceContentType(name)
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Cache-Control", "private, max-age=60")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", info.Size()))
	if r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		return
	}
	http.ServeContent(w, r, name, info.ModTime(), f)
}

func (a *App) evoiceStartGenerate(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	owner := r.PathValue("ownerSafe")
	project := r.PathValue("project")
	if !validEvoiceProjectName(project) || !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if a.evoiceJobs == nil {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	var onlyFiles []string
	opts := evoiceGenerateOpts{Mode: ModeStandard, ContentPercent: 100}
	if r.Body != nil {
		raw, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		raw = []byte(strings.TrimSpace(string(raw)))
		if len(raw) > 0 {
			var body struct {
				Files          []string `json:"files"`
				Premium        bool     `json:"premium"`
				Mode           string   `json:"mode"`
				ContentPercent int      `json:"contentPercent"`
			}
			if err := json.Unmarshal(raw, &body); err != nil {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			onlyFiles = body.Files
			opts.Mode = normalizeEvoiceMode(body.Mode, body.Premium)
			opts.ContentPercent = normalizeEvoiceContentPercent(body.ContentPercent)
			if body.ContentPercent == 0 && !strings.Contains(string(raw), "contentPercent") {
				opts.ContentPercent = 100
			}
		}
	}
	if err := a.evoiceFS.ensureProject(owner, project); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	jobID, err := a.evoiceJobs.Start(r.Context(), owner, project, onlyFiles, opts)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if a.cfg.MustLog {
		a.log.Info("evoice.generate.start", "job_id", jobID, "owner", owner, "project", project)
	}
	a.auditEvent(r, "evoice_generate", "started", jobID)
	writeJSON(w, http.StatusAccepted, map[string]any{
		"jobId":          jobID,
		"premium":        opts.PremiumCompat(),
		"mode":           opts.Mode,
		"contentPercent": opts.ContentPercent,
	})
}

func (a *App) evoiceGetJob(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUser(w, r)
	if user == nil {
		return
	}
	jobID := r.PathValue("jobId")
	job, ok := a.evoiceJobs.GetOrLoad(r.Context(), jobID)
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, job.Owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	writeJSON(w, http.StatusOK, job)
}

func (a *App) evoiceStopJob(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	jobID := r.PathValue("jobId")
	job, ok := a.evoiceJobs.GetOrLoad(r.Context(), jobID)
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, job.Owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	stopped, ok := a.evoiceJobs.Stop(r.Context(), jobID)
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, stopped)
}

func (a *App) evoiceResumeJob(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	jobID := r.PathValue("jobId")
	job, ok := a.evoiceJobs.GetOrLoad(r.Context(), jobID)
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if !a.canAccessEvoiceOwner(r, user, job.Owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if job.State == "queued" || job.State == "running" {
		a.writeSafeError(w, r, http.StatusConflict, "conflict")
		return
	}
	files := evoiceResumeFiles(job)
	if len(files) == 0 && len(job.OnlyFiles) > 0 {
		files = append([]string(nil), job.OnlyFiles...)
	}
	opts := evoiceGenerateOpts{
		Mode:           normalizeEvoiceMode(job.Mode, job.Premium),
		ContentPercent: normalizeEvoiceContentPercent(job.ContentPercent),
	}
	if job.ContentPercent == 0 {
		opts.ContentPercent = 100
	}
	newID, err := a.evoiceJobs.Start(r.Context(), job.Owner, job.Project, files, opts)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{
		"jobId":          newID,
		"premium":        opts.PremiumCompat(),
		"mode":           opts.Mode,
		"contentPercent": opts.ContentPercent,
		"files":          files,
		"resumedFrom":    jobID,
	})
}

func (a *App) evoiceInviteLandingURL(token string) string {
	base := strings.TrimRight(strings.TrimSpace(a.cfg.PublicBaseURL), "/")
	if base == "" {
		base = "https://eduardoos.com"
	}
	return base + "/evoice/invite/?token=" + url.QueryEscape(strings.TrimSpace(token))
}

func (a *App) evoiceCreatePlaylistShare(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	owner := r.PathValue("ownerSafe")
	project := r.PathValue("project")
	if !validEvoiceProjectName(project) || !a.canAccessEvoiceOwner(r, user, owner) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	var body struct {
		Email         string   `json:"email"`
		Files         []string `json:"files"`
		DurationHours int      `json:"durationHours"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, toNorm, ok := normalizeEmail(body.Email)
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	hours := body.DurationHours
	if hours < 1 {
		hours = 72
	}
	if hours > 24*30 {
		hours = 24 * 30
	}
	audios, err := a.evoiceFS.listKind(owner, project, "audios")
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	byName := map[string]evoiceObjectMeta{}
	for _, o := range audios {
		if strings.HasSuffix(strings.ToLower(o.Name), ".mp3") && o.Size > 0 {
			byName[o.Name] = o
		}
	}
	var files []evoicePlaylistShareFile
	if len(body.Files) == 0 {
		for name, o := range byName {
			files = append(files, evoicePlaylistShareFile{Name: name, Size: o.Size})
		}
	} else {
		for _, name := range body.Files {
			name = path.Base(strings.TrimSpace(name))
			o, ok := byName[name]
			if !ok || !validEvoiceFileName(name) {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			files = append(files, evoicePlaylistShareFile{Name: name, Size: o.Size})
		}
	}
	if len(files) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	sort.Slice(files, func(i, j int) bool { return files[i].Name < files[j].Name })
	now := time.Now().UTC()
	rawToken := randomID(24)
	share := &evoicePlaylistShare{
		ID:        randomID(12),
		TokenHash: hashEvoiceToken(rawToken),
		OwnerSafe: owner,
		Project:   project,
		Email:     toNorm,
		Files:     files,
		ExpiresAt: now.Add(time.Duration(hours) * time.Hour),
		CreatedAt: now,
		RawToken:  rawToken,
	}
	if err := a.evoiceMeta.UpsertShare(r.Context(), share); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	link := a.evoiceInviteLandingURL(rawToken)
	subject := "eVoice playlist share — Eduardo OS"
	mailBody := fmt.Sprintf(
		"Someone shared an eVoice audio playlist with you (%d track(s) from project %q).\n\n"+
			"Sign in with %s (eVoice access required), then open:\n%s\n\n"+
			"This link expires at %s UTC.\n",
		len(files), project, toNorm, link, share.ExpiresAt.Format(time.RFC3339),
	)
	if a.mailer != nil {
		_ = a.mailer.Send(toNorm, subject, mailBody)
	}
	a.auditEvent(r, "evoice_share", "created", share.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"invite": map[string]any{
			"token":     rawToken,
			"ownerSafe": share.OwnerSafe,
			"project":   share.Project,
			"email":     share.Email,
			"files":     share.Files,
			"expiresAt": share.ExpiresAt.Format(time.RFC3339),
			"createdAt": share.CreatedAt.Format(time.RFC3339),
		},
		"link": link,
	})
}

func (a *App) evoiceGetPlaylistShareInvite(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.PathValue("token"))
	if token == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	share, err := a.evoiceMeta.GetShareByTokenHash(r.Context(), hashEvoiceToken(token))
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	expired := !time.Now().UTC().Before(share.ExpiresAt)
	writeJSON(w, http.StatusOK, map[string]any{
		"valid":   !expired,
		"expired": expired,
		"invite": map[string]any{
			"token":     token,
			"email":     share.Email,
			"ownerSafe": share.OwnerSafe,
			"project":   share.Project,
			"files":     share.Files,
			"expiresAt": share.ExpiresAt.Format(time.RFC3339),
			"createdAt": share.CreatedAt.Format(time.RFC3339),
		},
	})
}

func (a *App) evoiceAcceptPlaylistShareInvite(w http.ResponseWriter, r *http.Request) {
	user := a.requireEvoiceUnsafe(w, r)
	if user == nil {
		return
	}
	token := strings.TrimSpace(r.PathValue("token"))
	share, err := a.evoiceMeta.GetShareByTokenHash(r.Context(), hashEvoiceToken(token))
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if !time.Now().UTC().Before(share.ExpiresAt) {
		a.writeSafeError(w, r, http.StatusGone, "not_found")
		return
	}
	if user.EmailNormalized != share.Email {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	var body struct {
		Project string `json:"project"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	project := sanitizeEvoiceProject(body.Project)
	if !validEvoiceProjectName(project) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	invitee := user.ID
	if err := a.evoiceFS.ensureProject(invitee, project); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := time.Now().UTC()
	_ = a.evoiceMeta.UpsertProject(r.Context(), &evoiceProjectDoc{
		ID: randomID(12), UserID: invitee, Name: project, CreatedAt: now, UpdatedAt: now,
	})
	existing, _ := a.evoiceFS.listKind(invitee, project, "audios")
	taken := map[string]bool{}
	for _, o := range existing {
		taken[o.Name] = true
	}
	imported := make([]string, 0, len(share.Files))
	renamed := map[string]string{}
	for _, f := range share.Files {
		if !validEvoiceFileName(f.Name) {
			continue
		}
		raw, err := a.evoiceFS.readFile(share.OwnerSafe, share.Project, "audios", f.Name)
		if err != nil || len(raw) == 0 {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		destName := uniqueEvoiceSharedAudioName(taken, f.Name)
		if destName != f.Name {
			renamed[f.Name] = destName
		}
		if err := a.evoiceFS.putFile(invitee, project, "audios", destName, raw); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		taken[destName] = true
		imported = append(imported, destName)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"project":  project,
		"imported": imported,
		"renamed":  renamed,
	})
}

func uniqueEvoiceSharedAudioName(taken map[string]bool, name string) string {
	if !taken[name] {
		return name
	}
	base := strings.TrimSuffix(name, path.Ext(name))
	ext := path.Ext(name)
	if ext == "" {
		ext = ".mp3"
	}
	for n := 2; n < 10000; n++ {
		cand := fmt.Sprintf("%s.shared%d%s", base, n, ext)
		if !taken[cand] {
			return cand
		}
	}
	return fmt.Sprintf("%s.shared-%s%s", base, randomID(8), ext)
}
