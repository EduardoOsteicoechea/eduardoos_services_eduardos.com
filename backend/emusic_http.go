package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

func (a *App) registerEmusicRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/emusic/library", a.emusicLibraryHandler)
	mux.HandleFunc("GET /api/emusic/playlists", a.emusicPlaylistsHandler)
	mux.HandleFunc("POST /api/emusic/playlists", a.emusicPlaylistsHandler)
	mux.HandleFunc("GET /api/emusic/playlists/{id}", a.emusicPlaylistHandler)
	mux.HandleFunc("PUT /api/emusic/playlists/{id}", a.emusicPlaylistHandler)
	mux.HandleFunc("DELETE /api/emusic/playlists/{id}", a.emusicPlaylistHandler)
	mux.HandleFunc("GET /api/emusic/{slug}", a.emusicDocumentHandler)
	mux.HandleFunc("PUT /api/emusic/{slug}", a.emusicDocumentHandler)
}

func (a *App) hasEmusicAccess(r *http.Request, user *User) (allowed bool, unavailable bool) {
	if a.failClosedEnt {
		return false, true
	}
	if user == nil {
		return false, false
	}
	if user.Role == roleAdmin {
		return true, false
	}
	return a.hasProductEntitlement(r, user, productEmusic)
}

func (a *App) requireEmusicUser(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	ok, unavailable := a.hasEmusicAccess(r, user)
	if unavailable {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return nil
	}
	if !ok {
		if a.cfg.MustLog {
			a.log.Info("emusic.entitlement", "user_id", user.ID, "allowed", false)
		}
		a.auditEvent(r, "emusic_entitlement", "denied", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	return user
}

func (a *App) requireEmusicAdmin(w http.ResponseWriter, r *http.Request) *User {
	user := a.requireEmusicUser(w, r)
	if user == nil {
		return nil
	}
	if user.Role != roleAdmin {
		a.auditEvent(r, "emusic_admin", "forbidden", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	return user
}

func emusicPlaylistJSON(playlist *EmusicPlaylist) map[string]any {
	ids := playlist.TrackIDs
	if ids == nil {
		ids = []string{}
	}
	return map[string]any{
		"id": playlist.ID, "name": playlist.Name, "track_ids": ids,
		"created_at": playlist.CreatedAt.UTC().Format(time.RFC3339),
		"updated_at": playlist.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func (a *App) emusicLibraryHandler(w http.ResponseWriter, r *http.Request) {
	if a.requireEmusicUser(w, r) == nil {
		return
	}
	sections := emusicCatalog()
	outSections := make([]map[string]any, 0, len(sections))
	for _, section := range sections {
		tracks := make([]map[string]any, 0, len(section.Tracks))
		for _, track := range section.Tracks {
			hasLyrics := false
			if record, err := a.store.EmusicByTrackID(r.Context(), track.ID); err == nil && record != nil {
				hasLyrics = emusicDocumentHasWords(record.Document)
			}
			tracks = append(tracks, map[string]any{
				"id": track.ID, "slug": track.Slug, "title": track.Title,
				"file_name": track.FileName, "src": track.Src, "has_lyrics": hasLyrics,
			})
		}
		outSections = append(outSections, map[string]any{
			"id": section.ID, "title": section.Title, "tracks": tracks,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"sections": outSections})
}

func (a *App) emusicDocumentHandler(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.PathValue("slug"))
	if !emusicSlugRe.MatchString(slug) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	track, ok := emusicCatalogBySlug(slug)
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	switch r.Method {
	case http.MethodGet:
		if a.requireEmusicUser(w, r) == nil {
			return
		}
		record, err := a.store.EmusicByTrackID(r.Context(), track.ID)
		if err != nil {
			record, err = a.store.EmusicBySlug(r.Context(), slug)
		}
		if err != nil {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		document := record.Document
		if normalized, ok := normalizeEmusicJSON(document); ok {
			document = normalized
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write([]byte(document))
	case http.MethodPut:
		admin := a.requireEmusicAdmin(w, r)
		if admin == nil || !a.requireUnsafe(w, r) {
			return
		}
		var in struct {
			Document json.RawMessage `json:"document"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20)).Decode(&in) != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		raw := in.Document
		if len(raw) == 0 {
			raw = json.RawMessage(blankEmusicDocument(track.Title))
		}
		document, ok := validEmusicDocument(raw)
		if !ok {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		if normalized, ok := normalizeEmusicJSON(document); ok {
			document = normalized
		}
		record := &EmusicRecord{
			TrackID:   track.ID,
			Slug:      track.Slug,
			Document:  document,
			UpdatedBy: admin.ID,
			UpdatedAt: time.Now().UTC(),
		}
		if err := a.store.UpsertEmusic(r.Context(), record); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		a.auditEvent(r, "emusic", "updated", admin.ID)
		writeJSON(w, http.StatusOK, map[string]any{"slug": track.Slug, "document": json.RawMessage(document)})
	default:
		a.writeSafeError(w, r, http.StatusMethodNotAllowed, "not_found")
	}
}

func (a *App) emusicPlaylistsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		if a.requireEmusicUser(w, r) == nil {
			return
		}
		playlists, err := a.store.ListEmusicPlaylists(r.Context())
		if err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		rows := make([]map[string]any, 0, len(playlists))
		for _, playlist := range playlists {
			rows = append(rows, emusicPlaylistJSON(playlist))
		}
		writeJSON(w, http.StatusOK, map[string]any{"playlists": rows})
	case http.MethodPost:
		admin := a.requireEmusicAdmin(w, r)
		if admin == nil || !a.requireUnsafe(w, r) {
			return
		}
		var in struct {
			Name     string   `json:"name"`
			TrackIDs []string `json:"track_ids"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in) != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		name := cleanEmusicPlaylistName(in.Name)
		if name == "" {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		now := time.Now().UTC()
		playlist := &EmusicPlaylist{
			ID:        randomID(12),
			OwnerID:   admin.ID,
			Name:      name,
			TrackIDs:  sanitizeEmusicPlaylistTrackIDs(in.TrackIDs, knownEmusicCatalogIDs()),
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := a.store.InsertEmusicPlaylist(r.Context(), playlist); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		a.auditEvent(r, "emusic_playlist", "created", admin.ID)
		writeJSON(w, http.StatusCreated, emusicPlaylistJSON(playlist))
	default:
		a.writeSafeError(w, r, http.StatusMethodNotAllowed, "not_found")
	}
}

func (a *App) emusicPlaylistHandler(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	playlist, err := a.store.EmusicPlaylistByID(r.Context(), id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	switch r.Method {
	case http.MethodGet:
		if a.requireEmusicUser(w, r) == nil {
			return
		}
		writeJSON(w, http.StatusOK, emusicPlaylistJSON(playlist))
	case http.MethodPut:
		admin := a.requireEmusicAdmin(w, r)
		if admin == nil || !a.requireUnsafe(w, r) {
			return
		}
		var in struct {
			Name     *string  `json:"name"`
			TrackIDs []string `json:"track_ids"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&in) != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		if in.Name != nil {
			name := cleanEmusicPlaylistName(*in.Name)
			if name == "" {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			playlist.Name = name
		}
		if in.TrackIDs != nil {
			playlist.TrackIDs = sanitizeEmusicPlaylistTrackIDs(in.TrackIDs, knownEmusicCatalogIDs())
		}
		playlist.UpdatedAt = time.Now().UTC()
		if err := a.store.UpdateEmusicPlaylist(r.Context(), playlist); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		a.auditEvent(r, "emusic_playlist", "updated", admin.ID)
		writeJSON(w, http.StatusOK, emusicPlaylistJSON(playlist))
	case http.MethodDelete:
		admin := a.requireEmusicAdmin(w, r)
		if admin == nil || !a.requireUnsafe(w, r) {
			return
		}
		if err := a.store.DeleteEmusicPlaylist(r.Context(), playlist.ID); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		a.auditEvent(r, "emusic_playlist", "removed", admin.ID)
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	default:
		a.writeSafeError(w, r, http.StatusMethodNotAllowed, "not_found")
	}
}
