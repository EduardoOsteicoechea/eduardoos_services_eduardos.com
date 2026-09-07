package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func (a *App) patchProfileHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	if !a.profileLimit.allow(user.ID) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	var body map[string]json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if _, exists := body["email"]; exists {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if raw, ok := body["display_name"]; ok {
		var value *string
		if err := json.Unmarshal(raw, &value); err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		if value == nil {
			user.DisplayName = ""
		} else {
			name, ok := normalizeDisplayName(*value)
			if !ok {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			user.DisplayName = name
		}
	}
	if raw, ok := body["username"]; ok {
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		username, ok := normalizeUsername(value)
		if !ok {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		user.Username = username
		user.UsernameNormalized = username
	}
	if raw, ok := body["phone"]; ok {
		var value *string
		if err := json.Unmarshal(raw, &value); err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		if value == nil || strings.TrimSpace(*value) == "" {
			user.Phone = ""
		} else {
			phone, ok := normalizePhone(*value)
			if !ok {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			user.Phone = phone
		}
	}
	user.UpdatedAt = time.Now().UTC()
	if err := a.store.UpdateUser(r.Context(), user); err != nil {
		if errors.Is(err, errDuplicateUsername) {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
		a.logUnexpected(r, "profile_update", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	fresh, err := a.store.UserByID(r.Context(), user.ID)
	if err != nil {
		fresh, err = a.store.UserByEmail(r.Context(), user.EmailNormalized)
	}
	if err != nil {
		a.logUnexpected(r, "profile_reload", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if fresh.DisplayName != user.DisplayName || fresh.Phone != user.Phone || fresh.Username != user.Username {
		a.logUnexpected(r, "profile_persist_mismatch", "store did not keep profile fields")
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "profile_update", "success", fresh.ID)
	writeJSON(w, http.StatusOK, a.safeProfile(fresh))
}

func (a *App) uploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	if !a.profileLimit.allow(user.ID) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarBytes+1<<20)
	if err := r.ParseMultipartForm(maxAvatarBytes + 1<<20); err != nil {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		a.logValidation(r, "missing_file")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	if header != nil && strings.Contains(header.Filename, "..") {
		a.logValidation(r, "avatar_invalid")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	data, err := io.ReadAll(io.LimitReader(file, maxAvatarBytes+1))
	if err != nil {
		a.logValidation(r, "avatar_invalid")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if int64(len(data)) > maxAvatarBytes {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	kind, err := detectAvatar(data)
	if errors.Is(err, errAvatarTooLarge) {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	if err != nil {
		a.logValidation(r, "avatar_invalid")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	relative, err := newAvatarRelPath(kind.ext)
	if err != nil {
		a.logValidation(r, "avatar_invalid")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if err := writeAvatarFile(a.cfg.MediaRoot, relative, data); err != nil {
		a.logValidation(r, "avatar_store_failed")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	old := user.AvatarKey
	now := time.Now().UTC()
	user.AvatarKey = relative
	user.AvatarContentType = kind.mime
	user.AvatarBytes = int64(len(data))
	user.AvatarFilename = filepath.Base(relative)
	user.AvatarUpdatedAt = &now
	user.UpdatedAt = now
	if err := a.store.UpdateUser(r.Context(), user); err != nil {
		removeAvatarFile(a.cfg.MediaRoot, relative)
		a.logValidation(r, "avatar_store_failed")
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if old != "" && old != relative {
		removeAvatarFile(a.cfg.MediaRoot, old)
	}
	a.auditEvent(r, "avatar_upload", "success", user.ID)
	writeJSON(w, http.StatusOK, a.safeProfile(user))
}

func (a *App) deleteAvatarHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	if !a.profileLimit.allow(user.ID) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	old := user.AvatarKey
	user.AvatarKey = ""
	user.AvatarContentType = ""
	user.AvatarBytes = 0
	user.AvatarFilename = ""
	user.AvatarUpdatedAt = nil
	user.UpdatedAt = time.Now().UTC()
	if err := a.store.UpdateUser(r.Context(), user); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	removeAvatarFile(a.cfg.MediaRoot, old)
	a.auditEvent(r, "avatar_delete", "success", user.ID)
	writeJSON(w, http.StatusOK, a.safeProfile(user))
}

func (a *App) getAvatarHandler(w http.ResponseWriter, r *http.Request) {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	if user.AvatarKey == "" || !safeAvatarRel.MatchString(user.AvatarKey) {
		a.writeSafeError(w, r, http.StatusNotFound, "not found")
		return
	}
	full := filepath.Join(a.cfg.MediaRoot, filepath.FromSlash(user.AvatarKey))
	if _, err := os.Stat(full); err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not found")
		return
	}
	ctype := user.AvatarContentType
	if ctype == "" {
		ctype = avatarContentType(user.AvatarKey)
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeFile(w, r, full)
}

func avatarContentType(key string) string {
	switch strings.ToLower(filepath.Ext(key)) {
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	default:
		return "image/jpeg"
	}
}
