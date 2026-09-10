package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
)

type epamWriteBody struct {
	Title         string         `json:"title"`
	Body          map[string]any `json:"body"`
	EpamID        string         `json:"epamId"`
	FileName      string         `json:"fileName"`
	Document      map[string]any `json:"document"`
	Series        string         `json:"series"`
	SeriesChapter string         `json:"seriesChapter"`
	Author        string         `json:"author"`
}

type footerWriteBody struct {
	Name   string       `json:"name"`
	Footer FooterFields `json:"footer"`
}

func (a *App) requirePamphletUser(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	ok, unavailable := a.hasProductEntitlement(r, user, productPamphlet)
	if unavailable {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return nil
	}
	if !ok {
		a.auditEvent(r, "pamphlet_entitlement", "denied", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	return user
}

func (a *App) requirePamphletWrite(w http.ResponseWriter, r *http.Request) *User {
	if !a.requireUnsafe(w, r) {
		return nil
	}
	return a.requirePamphletUser(w, r)
}

func epamDocumentResponse(rec EpamRecord) map[string]any {
	doc := rec.Body
	if doc == nil {
		doc = map[string]any{}
	}
	meta := rec
	meta.Body = nil
	return map[string]any{"meta": meta, "document": doc}
}

func applyEpamWrite(rec *EpamRecord, body epamWriteBody) {
	if body.EpamID != "" {
		rec.EpamID = body.EpamID
	}
	if body.FileName != "" {
		rec.FileName = body.FileName
	}
	if body.Document != nil {
		rec.Body = body.Document
		if id, ok := body.Document["id"].(string); ok && id != "" && rec.EpamID == "" {
			rec.EpamID = id
		}
		syncEpamMetaFromHeader(rec)
	} else if body.Body != nil {
		rec.Body = body.Body
		syncEpamMetaFromHeader(rec)
	}
	if body.Title != "" {
		rec.Title = body.Title
	}
	if body.Series != "" {
		rec.Series = strings.TrimSpace(body.Series)
	}
	if body.SeriesChapter != "" {
		rec.SeriesChapter = strings.TrimSpace(body.SeriesChapter)
	}
	if body.Author != "" {
		rec.Author = strings.TrimSpace(body.Author)
	}
	if raw, err := json.Marshal(rec.Body); err == nil {
		rec.ContentSizeBytes = int64(len(raw))
	}
}

func (a *App) applyLinkedFooter(r *http.Request, rec *EpamRecord) {
	if rec == nil || rec.Body == nil || a.pamphlet == nil {
		return
	}
	bind := strings.TrimSpace(stringFromAny(rec.Body["footer_bind"]))
	if bind != pamphletFooterBindLinked {
		return
	}
	pid := strings.TrimSpace(stringFromAny(rec.Body["footer_profile_id"]))
	if pid == "" {
		return
	}
	profile, ok, err := a.pamphlet.GetFooter(r.Context(), rec.UserID, pid, requestIDFrom(r, nil))
	if err != nil || !ok {
		return
	}
	cloned, err := cloneJSONMap(rec.Body)
	if err != nil {
		return
	}
	cloned["footer"] = profile.Footer.asMap()
	rec.Body = cloned
}

func cloneJSONMap(src map[string]any) (map[string]any, error) {
	if src == nil {
		return map[string]any{}, nil
	}
	raw, err := json.Marshal(src)
	if err != nil {
		return nil, err
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (a *App) listEpamsHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletUser(w, r)
	if user == nil {
		return
	}
	rid := requestIDFrom(r, nil)
	out, err := a.pamphlet.ListEpams(r.Context(), user.ID, rid)
	if err != nil {
		a.mustLogf(r, "epams.list.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if out == nil {
		out = []EpamRecord{}
	}
	a.mustLogf(r, "epams.list.ok", "user_id", user.ID, "count", len(out))
	writeJSON(w, http.StatusOK, map[string]any{"count": len(out), "epams": out, "items": out})
}

func (a *App) listEpamSeriesTreeHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletUser(w, r)
	if user == nil {
		return
	}
	rid := requestIDFrom(r, nil)
	out, err := a.pamphlet.ListEpams(r.Context(), user.ID, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	tree := buildEpamSeriesTree(out)
	a.mustLogf(r, "epams.series_tree", "user_id", user.ID, "count", tree.Count)
	writeJSON(w, http.StatusOK, tree)
}

func (a *App) createEpamHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	var body epamWriteBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	rec := EpamRecord{UserID: user.ID}
	applyEpamWrite(&rec, body)
	if rec.Title == "" {
		rec.Title = "Untitled pamphlet"
	}
	saved, err := a.pamphlet.SaveEpam(r.Context(), rec, requestIDFrom(r, nil))
	if err != nil {
		a.mustLogf(r, "epams.create.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "epam_create", "ok", user.ID)
	a.mustLogf(r, "epams.create.ok", "user_id", user.ID, "epam_id", saved.EpamID)
	if body.Document != nil {
		writeJSON(w, http.StatusCreated, epamDocumentResponse(saved))
		return
	}
	writeJSON(w, http.StatusCreated, saved)
}

func (a *App) getEpamHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletUser(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	rid := requestIDFrom(r, nil)
	rec, ok, err := a.pamphlet.GetEpam(r.Context(), user.ID, id, rid)
	if err != nil {
		a.mustLogf(r, "epams.get.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if rec.Body == nil || len(rec.Body) == 0 {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.applyLinkedFooter(r, &rec)
	a.mustLogf(r, "epams.get.ok", "epam_id", id, "bytes", rec.ContentSizeBytes)
	writeJSON(w, http.StatusOK, epamDocumentResponse(rec))
}

func (a *App) updateEpamHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	rid := requestIDFrom(r, nil)
	existing, ok, err := a.pamphlet.GetEpam(r.Context(), user.ID, id, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body epamWriteBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	applyEpamWrite(&existing, body)
	saved, err := a.pamphlet.SaveEpam(r.Context(), existing, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.mustLogf(r, "epams.update.ok", "epam_id", id)
	if body.Document != nil {
		writeJSON(w, http.StatusOK, epamDocumentResponse(saved))
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

func (a *App) deleteEpamHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	rid := requestIDFrom(r, nil)
	_, ok, err := a.pamphlet.GetEpam(r.Context(), user.ID, id, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err := a.pamphlet.DeleteEpam(r.Context(), user.ID, id, rid); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "epam_delete", "ok", user.ID)
	a.mustLogf(r, "epams.delete.ok", "epam_id", id)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "epamId": id})
}

func (a *App) copyEpamHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	sourceID := strings.TrimSpace(r.PathValue("id"))
	rid := requestIDFrom(r, nil)
	src, ok, err := a.pamphlet.GetEpam(r.Context(), user.ID, sourceID, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	a.applyLinkedFooter(r, &src)
	listed, err := a.pamphlet.ListEpams(r.Context(), user.ID, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	titles := make([]string, 0, len(listed))
	for _, rec := range listed {
		t := strings.TrimSpace(rec.Title)
		if t == "" {
			t = strings.TrimSpace(rec.FileName)
		}
		if t == "" {
			t = rec.EpamID
		}
		titles = append(titles, t)
	}
	sourceTitle := strings.TrimSpace(src.Title)
	if sourceTitle == "" {
		sourceTitle = strings.TrimSpace(src.FileName)
	}
	if sourceTitle == "" {
		sourceTitle = sourceID
	}
	newTitle := nextEpamCopyTitle(sourceTitle, titles)
	body, err := cloneJSONMap(src.Body)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	newID := randomID(16)
	body["id"] = newID
	if header, _ := body["header"].(map[string]any); header != nil {
		header["title"] = newTitle
	} else {
		body["header"] = map[string]any{"title": newTitle}
	}
	copyRec := EpamRecord{
		UserID: user.ID, EpamID: newID, FileName: sanitizeEpamFileName(newTitle),
		Title: newTitle, Series: src.Series, SeriesChapter: src.SeriesChapter,
		Author: src.Author, Date: src.Date, Body: body,
	}
	syncEpamMetaFromHeader(&copyRec)
	saved, err := a.pamphlet.SaveEpam(r.Context(), copyRec, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.mustLogf(r, "epams.copy.ok", "source", sourceID, "new_id", saved.EpamID)
	writeJSON(w, http.StatusCreated, epamDocumentResponse(saved))
}

func (a *App) listFootersHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletUser(w, r)
	if user == nil {
		return
	}
	out, err := a.pamphlet.ListFooters(r.Context(), user.ID, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if out == nil {
		out = []FooterProfile{}
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Name != out[j].Name {
			return out[i].Name < out[j].Name
		}
		return out[i].FooterID < out[j].FooterID
	})
	writeJSON(w, http.StatusOK, map[string]any{"count": len(out), "footers": out})
}

func (a *App) createFooterHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	var body footerWriteBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	saved, err := a.pamphlet.SaveFooter(r.Context(), FooterProfile{
		UserID: user.ID, Name: name, Footer: body.Footer,
	}, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusCreated, saved)
}

func (a *App) updateFooterHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	existing, ok, err := a.pamphlet.GetFooter(r.Context(), user.ID, id, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body footerWriteBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if name := strings.TrimSpace(body.Name); name != "" {
		existing.Name = name
	}
	existing.Footer = body.Footer
	saved, err := a.pamphlet.SaveFooter(r.Context(), existing, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

func (a *App) deleteFooterHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	_, ok, err := a.pamphlet.GetFooter(r.Context(), user.ID, id, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err := a.pamphlet.DeleteFooter(r.Context(), user.ID, id, requestIDFrom(r, nil)); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "footerId": id})
}
