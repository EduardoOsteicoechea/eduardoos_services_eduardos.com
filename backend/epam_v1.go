package main

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

type epamV1WriteBody struct {
	ConfirmOverwrite bool           `json:"confirmOverwrite"`
	Title            string         `json:"title"`
	EpamID           string         `json:"epamId"`
	FileName         string         `json:"fileName"`
	Series           string         `json:"series"`
	SeriesChapter    string         `json:"seriesChapter"`
	Author           string         `json:"author"`
	Document         map[string]any `json:"document"`
	// Allow posting the pamphlet document at the root (connector convenience).
	Type string `json:"type"`
}

func (a *App) epamV1AccessHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	writeJSON(w, http.StatusOK, map[string]any{
		"allowed":     true,
		"service":     productEpam,
		"email":       user.Email,
		"ownerUserId": user.ID,
		"ownerSafe":   displayOwnerSafe(user.Email),
	})
}

func (a *App) epamArticleURL(epamID string) string {
	base := strings.TrimRight(strings.TrimSpace(a.cfg.PublicBaseURL), "/")
	if base == "" {
		base = "https://eduardoos.com"
	}
	id := strings.TrimSpace(epamID)
	if id == "" {
		return base + "/articles"
	}
	return base + "/articles/read?id=" + id
}

func (a *App) epamViewURL(epamID string) string {
	base := strings.TrimRight(strings.TrimSpace(a.cfg.PublicBaseURL), "/")
	if base == "" {
		base = "https://eduardoos.com"
	}
	id := strings.TrimSpace(epamID)
	if id == "" {
		return base + "/documents/pamphlet"
	}
	return base + "/documents/pamphlet/open#" + id
}

func (a *App) epamV1ListHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	rid := requestIDFrom(r, nil)
	out, err := a.pamphlet.ListEpams(r.Context(), user.ID, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if out == nil {
		out = []EpamRecord{}
	}
	items := make([]map[string]any, 0, len(out))
	for _, rec := range out {
		items = append(items, map[string]any{
			"epamId":        rec.EpamID,
			"title":         rec.Title,
			"fileName":      rec.FileName,
			"series":        rec.Series,
			"seriesChapter": rec.SeriesChapter,
			"author":        rec.Author,
			"public":        rec.Public,
			"updatedAt":     rec.UpdatedAt,
			"viewUrl":       a.epamViewURL(rec.EpamID),
			"articleUrl":    a.epamArticleURL(rec.EpamID),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(items), "epams": items})
}

func (a *App) epamV1GetHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	id := strings.TrimSpace(r.PathValue("id"))
	rid := requestIDFrom(r, nil)
	rec, ok, err := a.pamphlet.GetEpam(r.Context(), user.ID, id, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	a.applyLinkedFooter(r, &rec)
	resp := epamDocumentResponse(rec)
	resp["viewUrl"] = a.epamViewURL(rec.EpamID)
	resp["articleUrl"] = a.epamArticleURL(rec.EpamID)
	resp["public"] = rec.Public
	writeJSON(w, http.StatusOK, resp)
}

func decodeEpamV1Write(r *http.Request, w http.ResponseWriter) (epamV1WriteBody, map[string]any, bool) {
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 8<<20))
	if err != nil {
		return epamV1WriteBody{}, nil, false
	}
	var asMap map[string]any
	if err := json.Unmarshal(raw, &asMap); err != nil || asMap == nil {
		return epamV1WriteBody{}, nil, false
	}
	var body epamV1WriteBody
	_ = json.Unmarshal(raw, &body)
	if doc, ok := asMap["document"].(map[string]any); ok && doc != nil {
		return body, doc, true
	}
	typ, _ := asMap["type"].(string)
	if strings.TrimSpace(typ) == "" {
		return body, nil, false
	}
	delete(asMap, "confirmOverwrite")
	return body, asMap, true
}

func (a *App) epamV1CreateHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	body, doc, ok := decodeEpamV1Write(r, w)
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	write := epamWriteBody{
		Title:         body.Title,
		EpamID:        body.EpamID,
		FileName:      body.FileName,
		Series:        body.Series,
		SeriesChapter: body.SeriesChapter,
		Author:        body.Author,
		Document:      doc,
	}
	rec := EpamRecord{UserID: user.ID}
	applyEpamWrite(&rec, write)
	if rec.Title == "" {
		rec.Title = "Untitled EPAM"
	}
	a.autoPublishEpamForArticles(user, &rec)
	saved, err := a.pamphlet.SaveEpam(r.Context(), rec, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "epam_v1_create", "ok", user.ID)
	resp := epamDocumentResponse(saved)
	resp["viewUrl"] = a.epamViewURL(saved.EpamID)
	resp["articleUrl"] = a.epamArticleURL(saved.EpamID)
	resp["public"] = saved.Public
	writeJSON(w, http.StatusCreated, resp)
}

func (a *App) epamV1UpdateHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	id := strings.TrimSpace(r.PathValue("id"))
	body, doc, ok := decodeEpamV1Write(r, w)
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !body.ConfirmOverwrite {
		a.writeSafeError(w, r, http.StatusBadRequest, "replace_confirm_required")
		return
	}
	rid := requestIDFrom(r, nil)
	existing, found, err := a.pamphlet.GetEpam(r.Context(), user.ID, id, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	write := epamWriteBody{
		Title:         body.Title,
		EpamID:        body.EpamID,
		FileName:      body.FileName,
		Series:        body.Series,
		SeriesChapter: body.SeriesChapter,
		Author:        body.Author,
		Document:      doc,
	}
	lockedID := existing.EpamID
	applyEpamWrite(&existing, write)
	existing.EpamID = lockedID
	a.autoPublishEpamForArticles(user, &existing)
	saved, err := a.pamphlet.SaveEpam(r.Context(), existing, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "epam_v1_update", "ok", user.ID)
	resp := epamDocumentResponse(saved)
	resp["viewUrl"] = a.epamViewURL(saved.EpamID)
	resp["articleUrl"] = a.epamArticleURL(saved.EpamID)
	resp["public"] = saved.Public
	writeJSON(w, http.StatusOK, resp)
}
