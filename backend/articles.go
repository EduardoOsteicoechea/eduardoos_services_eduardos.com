package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
)

// Public articles are a projection of every pamphlet owned by the configured
// publisher account (legacy eduardoos behavior). Callers never see another
// account's pamphlets through these routes.
func (a *App) publicArticleOwner(r *http.Request) (*User, bool) {
	email := strings.ToLower(strings.TrimSpace(a.cfg.PublicArticlesOwnerEmail))
	if email == "" {
		return nil, false
	}
	owner, err := a.store.UserByEmail(r.Context(), email)
	return owner, err == nil && owner != nil
}

// autoPublishEpamForArticles marks pamphlets owned by the configured articles
// publisher as public on every cloud save (metadata for admin tools / imports).
func (a *App) autoPublishEpamForArticles(user *User, rec *EpamRecord) {
	if user == nil || rec == nil {
		return
	}
	email := strings.ToLower(strings.TrimSpace(a.cfg.PublicArticlesOwnerEmail))
	if email == "" || user.EmailNormalized != email {
		return
	}
	rec.Public = true
}

func asStringMap(v any) map[string]any {
	if v == nil {
		return nil
	}
	if m, ok := v.(map[string]any); ok {
		return m
	}
	raw, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	var out map[string]any
	if json.Unmarshal(raw, &out) != nil {
		return nil
	}
	return out
}

func asAnySlice(v any) []any {
	if v == nil {
		return nil
	}
	if s, ok := v.([]any); ok {
		return s
	}
	raw, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	var out []any
	if json.Unmarshal(raw, &out) != nil {
		return nil
	}
	return out
}

func articleBlocks(title string, body map[string]any) ([]map[string]string, string) {
	// Normalize Mongo/BSON shapes (bson.M / bson.A) into plain JSON maps/slices.
	body = asStringMap(body)
	var blocks []map[string]string
	appendBlock := func(kind, text string) {
		text = strings.TrimSpace(text)
		if text == "" {
			return
		}
		if kind != "heading_1" && kind != "paragraph" && kind != "image" && kind != "meta" {
			kind = "paragraph"
		}
		blocks = append(blocks, map[string]string{"type": kind, "content": text})
	}
	appendItems := func(raw any) {
		for _, rawItem := range asAnySlice(raw) {
			item := asStringMap(rawItem)
			if item == nil {
				if s := stringFromAny(rawItem); s != "" {
					appendBlock("paragraph", s)
				}
				continue
			}
			kind := stringFromAny(item["type"])
			text := stringFromAny(item["content"])
			if text == "" {
				text = stringFromAny(item["text"])
			}
			if kind == "" && text != "" {
				kind = "paragraph"
			}
			appendBlock(kind, text)
		}
	}
	header := asStringMap(body["header"])
	headerTitle := stringFromAny(header["title"])
	if headerTitle == "" {
		headerTitle = strings.TrimSpace(title)
	}
	if headerTitle != "" {
		appendBlock("heading_1", headerTitle)
	}
	metaBits := make([]string, 0, 4)
	for _, key := range []string{"subtitle", "author", "series", "series_chapter", "date"} {
		if v := stringFromAny(header[key]); v != "" {
			metaBits = append(metaBits, v)
		}
	}
	if len(metaBits) > 0 {
		appendBlock("meta", strings.Join(metaBits, " · "))
	}
	for _, key := range []string{"column_1", "column_2", "column_3", "column_4", "column_5", "column_6", "column_7", "column_8"} {
		appendItems(body[key])
	}
	footer := asStringMap(body["footer"])
	if action := stringFromAny(footer["action"]); action != "" {
		appendBlock("heading_1", action)
	}
	if message := stringFromAny(footer["message"]); message != "" {
		appendBlock("paragraph", message)
	}
	appendItems(footer["items"])
	// Legacy / iglesia-style bodies: { "blocks": [...] }.
	if len(blocks) <= 1 {
		appendItems(body["blocks"])
	}
	parts := make([]string, 0, len(blocks))
	for _, block := range blocks {
		if block["type"] != "image" {
			parts = append(parts, block["content"])
		}
	}
	return blocks, strings.Join(parts, "\n\n")
}

func (a *App) listArticlesHandler(w http.ResponseWriter, r *http.Request) {
	owner, ok := a.publicArticleOwner(r)
	if !ok {
		writeJSON(w, http.StatusOK, map[string]any{"count": 0, "articles": []EpamRecord{}})
		return
	}
	records, err := a.pamphlet.ListEpams(r.Context(), owner.ID, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]EpamRecord, 0, len(records))
	for _, record := range records {
		record.Body = nil
		out = append(out, record)
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(out), "articles": out})
}

func (a *App) getArticleHandler(w http.ResponseWriter, r *http.Request) {
	owner, ok := a.publicArticleOwner(r)
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	record, found, err := a.pamphlet.GetEpam(r.Context(), owner.ID, strings.TrimSpace(r.PathValue("id")), requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	a.applyLinkedFooter(r, &record)
	blocks, plain := articleBlocks(record.Title, record.Body)
	if plain == "" && strings.TrimSpace(record.Title) != "" {
		plain = strings.TrimSpace(record.Title)
		if len(blocks) == 0 {
			blocks = []map[string]string{{"type": "heading_1", "content": plain}}
		}
	}
	sum := sha256.Sum256([]byte(plain))
	meta := record
	meta.Body = nil
	writeJSON(w, http.StatusOK, map[string]any{
		"meta": meta, "title": record.Title, "blocks": blocks, "plainText": plain,
		"contentHash": hex.EncodeToString(sum[:]),
	})
}

type articlePublicationBody struct {
	OwnerUserID string `json:"ownerUserId"`
	Published   bool   `json:"published"`
}

func (a *App) setArticlePublicationHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	var body articlePublicationBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil || strings.TrimSpace(body.OwnerUserID) == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	owner, err := a.store.UserByID(r.Context(), strings.TrimSpace(body.OwnerUserID))
	if err != nil || owner.EmailNormalized != strings.ToLower(strings.TrimSpace(a.cfg.PublicArticlesOwnerEmail)) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	record, found, err := a.pamphlet.GetEpam(r.Context(), owner.ID, id, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	record.Public = body.Published
	if _, err := a.pamphlet.SaveEpam(r.Context(), record, requestIDFrom(r, nil)); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "article_publication", map[bool]string{true: "published", false: "unpublished"}[body.Published], admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"epamId": id, "published": body.Published})
}
