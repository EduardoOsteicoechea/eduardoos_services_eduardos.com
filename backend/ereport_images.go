package main

import (
	"bytes"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func (a *App) ereportUploadImageHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	meta, _, ok := a.ownerLoadReport(w, r, user)
	if !ok {
		return
	}
	a.saveEreportImage(w, r, user.ID, meta.OrgID, meta.ID)
}

func (a *App) ereportInviteUploadImageHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	inv := a.requireInviteSession(w, r)
	if inv == nil || !inv.CanEdit {
		if inv == nil {
			return
		}
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	reportID := r.PathValue("reportId")
	if !a.inviteCovers(*inv, inv.OrgID, reportID) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if _, _, err := a.ereport.loadReport(inv.OwnerUserID, inv.OrgID, reportID); err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	a.saveEreportImage(w, r, inv.OwnerUserID, inv.OrgID, reportID)
}

func (a *App) saveEreportImage(w http.ResponseWriter, r *http.Request, ownerUserID, orgID, reportID string) {
	if a.ereport.countImages(ownerUserID, orgID, reportID) >= maxImagesPerReport {
		a.writeSafeError(w, r, http.StatusBadRequest, "payload_too_large")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.EreportMaxImageBytes+1<<20)
	if err := r.ParseMultipartForm(a.cfg.EreportMaxImageBytes + 1<<20); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, a.cfg.EreportMaxImageBytes+1))
	if err != nil || int64(len(data)) > a.cfg.EreportMaxImageBytes {
		a.writeSafeError(w, r, http.StatusBadRequest, "payload_too_large")
		return
	}
	kind, err := detectEreportImage(data, a.cfg.EreportMaxImageBytes, a.cfg.EreportMaxImageEdge)
	if err != nil {
		code := "invalid_request"
		if err == errAvatarTooLarge {
			code = "payload_too_large"
		}
		a.writeSafeError(w, r, http.StatusBadRequest, code)
		return
	}
	id := randomID(16)
	_, err = a.ereport.writeImage(ownerUserID, orgID, reportID, id, kind.ext, data)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	name := filepath.Base(header.Filename)
	if name == "." || name == "" {
		name = id + kind.ext
	}
	url := "/api/ereport/orgs/" + orgID + "/reports/" + reportID + "/images/" + id
	if a.currentUser(r) == nil {
		url = "/api/ereport/invite-session/reports/" + reportID + "/images/" + id
	}
	a.auditEvent(r, "ereport_image_upload", "ok", ownerUserID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":   id,
		"mime": kind.mime,
		"name": name,
		"url":  url,
	})
}

func detectEreportImage(data []byte, maxBytes int64, maxEdge int) (avatarKind, error) {
	if int64(len(data)) > maxBytes {
		return avatarKind{}, errAvatarTooLarge
	}
	if len(data) < 12 {
		return avatarKind{}, errAvatarInvalid
	}
	lower := bytes.ToLower(data[:min(512, len(data))])
	if bytes.HasPrefix(data, []byte("GIF87a")) || bytes.HasPrefix(data, []byte("GIF89a")) {
		return avatarKind{}, errAvatarInvalid
	}
	if bytes.HasPrefix(data, []byte{0x4d, 0x5a}) || bytes.HasPrefix(data, []byte{0x7f, 0x45, 0x4c, 0x46}) {
		return avatarKind{}, errAvatarInvalid
	}
	if bytes.Contains(lower, []byte("<svg")) || bytes.Contains(lower, []byte("<?xml")) {
		return avatarKind{}, errAvatarInvalid
	}
	if bytes.Contains(lower, []byte("<html")) || bytes.Contains(lower, []byte("<!doctype html")) || bytes.Contains(lower, []byte("<script")) {
		return avatarKind{}, errAvatarInvalid
	}
	kind, err := sniffImage(data)
	if err != nil {
		return avatarKind{}, err
	}
	cfg, err := decodeConfig(data, kind.mime)
	if err != nil {
		return avatarKind{}, errAvatarInvalid
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > maxEdge || cfg.Height > maxEdge {
		return avatarKind{}, errAvatarTooLarge
	}
	return kind, nil
}

func (a *App) ereportGetImageHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	meta, _, ok := a.ownerLoadReport(w, r, user)
	if !ok {
		return
	}
	a.serveEreportImage(w, r, user.ID, meta.OrgID, meta.ID, r.PathValue("imageId"))
}

func (a *App) ereportInviteGetImageHandler(w http.ResponseWriter, r *http.Request) {
	inv := a.requireInviteSession(w, r)
	if inv == nil {
		return
	}
	reportID := r.PathValue("reportId")
	if !a.inviteCovers(*inv, inv.OrgID, reportID) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	a.serveEreportImage(w, r, inv.OwnerUserID, inv.OrgID, reportID, r.PathValue("imageId"))
}

func (a *App) serveEreportImage(w http.ResponseWriter, r *http.Request, ownerUserID, orgID, reportID, imageID string) {
	full, rel, err := a.ereport.findImage(ownerUserID, orgID, reportID, imageID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if _, err := os.Stat(full); err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	ctype := "image/jpeg"
	switch strings.ToLower(filepath.Ext(full)) {
	case ".png":
		ctype = "image/png"
	case ".webp":
		ctype = "image/webp"
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if a.cfg.SecureCookies {
		w.Header().Set("X-Accel-Redirect", "/internal-media/"+rel)
		w.WriteHeader(http.StatusOK)
		return
	}
	http.ServeFile(w, r, full)
}
