package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

const maxPreferenceValueBytes = 32 << 10

func preferenceDocID(userID, key string) string {
	return userID + ":" + key
}

func validPreferenceKey(key string) bool {
	key = strings.TrimSpace(key)
	if key == "" || utf8.RuneCountInString(key) > 128 {
		return false
	}
	for _, r := range key {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-' {
			continue
		}
		return false
	}
	return true
}

func (a *App) preferencesGetHandler(w http.ResponseWriter, r *http.Request) {
	a.mustLogf(r, "preferences.get.start")
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	key := strings.TrimSpace(r.PathValue("key"))
	if !validPreferenceKey(key) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	pref, err := a.store.UserPreferenceGet(r.Context(), user.ID, key)
	if err != nil {
		if errors.Is(err, errNotFound) {
			a.mustLogf(r, "preferences.get.miss", "user_id", user.ID, "key", key)
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.mustLogf(r, "preferences.get.error", "key", key, "err", redactLogValue(err.Error()))
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.mustLogf(r, "preferences.get.hit", "user_id", user.ID, "key", key)
	writeJSON(w, http.StatusOK, map[string]any{
		"key":        pref.Key,
		"value":      pref.Value,
		"updated_at": pref.UpdatedAt.UTC().Format(time.RFC3339),
	})
}

func (a *App) preferencesPutHandler(w http.ResponseWriter, r *http.Request) {
	a.mustLogf(r, "preferences.put.start")
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	key := strings.TrimSpace(r.PathValue("key"))
	if !validPreferenceKey(key) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		Value json.RawMessage `json:"value"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxPreferenceValueBytes)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(body.Value) == 0 || !json.Valid(body.Value) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var decoded any
	if err := json.Unmarshal(body.Value, &decoded); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	pref := &UserPreference{
		ID:        preferenceDocID(user.ID, key),
		UserID:    user.ID,
		Key:       key,
		Value:     decoded,
		UpdatedAt: now,
	}
	if err := a.store.UserPreferencePut(r.Context(), pref); err != nil {
		a.mustLogf(r, "preferences.put.error", "key", key, "err", redactLogValue(err.Error()))
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "user_preference", "put", user.ID)
	a.mustLogf(r, "preferences.put.ok", "user_id", user.ID, "key", key)
	writeJSON(w, http.StatusOK, map[string]any{
		"key":        pref.Key,
		"value":      pref.Value,
		"updated_at": pref.UpdatedAt.UTC().Format(time.RFC3339),
	})
}
