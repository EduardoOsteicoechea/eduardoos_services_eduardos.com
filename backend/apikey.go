package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

func (a *App) apikeySessionAdmin(w http.ResponseWriter, r *http.Request) *User {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		if !a.requireUnsafe(w, r) {
			return nil
		}
	}
	return a.requireAdminRead(w, r)
}

func (a *App) apiKeysListHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.apikeySessionAdmin(w, r)
	if admin == nil {
		return
	}
	keys, err := a.store.APIKeysByUser(r.Context(), admin.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]map[string]any, 0, len(keys))
	for _, key := range keys {
		if key.RevokedAt != nil {
			continue
		}
		row := map[string]any{
			"id":         key.ID,
			"label":      key.Label,
			"prefix":     key.Prefix,
			"created_at": key.CreatedAt.UTC().Format(time.RFC3339),
		}
		if key.LastUsedAt != nil {
			row["last_used_at"] = key.LastUsedAt.UTC().Format(time.RFC3339)
		}
		out = append(out, row)
	}
	writeJSON(w, http.StatusOK, map[string]any{"keys": out})
}

func (a *App) apiKeysCreateHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.apikeySessionAdmin(w, r)
	if admin == nil {
		return
	}
	var body struct {
		Label string `json:"label"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	label := strings.TrimSpace(body.Label)
	if label == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	secret := apiKeyPrefix + randomID(24)
	now := time.Now().UTC()
	rec := &APIKeyRecord{
		ID:         randomID(16),
		UserID:     admin.ID,
		Label:      label,
		Prefix:     secret[:12] + "…",
		SecretHash: a.hashOpaque("api-key", secret),
		CreatedAt:  now,
	}
	if err := a.store.InsertAPIKey(r.Context(), rec); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "apikey_create", "ok", admin.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":         rec.ID,
		"label":      rec.Label,
		"prefix":     rec.Prefix,
		"created_at": rec.CreatedAt.Format(time.RFC3339),
		"key":        secret,
	})
}

func (a *App) apiKeysDeleteHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.apikeySessionAdmin(w, r)
	if admin == nil {
		return
	}
	key, err := a.store.APIKeyByID(r.Context(), strings.TrimSpace(r.PathValue("id")))
	if err != nil || key.UserID != admin.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	now := time.Now().UTC()
	key.RevokedAt = &now
	if err := a.store.UpdateAPIKey(r.Context(), key); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "apikey_revoke", "ok", admin.ID)
	writeJSON(w, http.StatusOK, map[string]bool{"revoked": true})
}
