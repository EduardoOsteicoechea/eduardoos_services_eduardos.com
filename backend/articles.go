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
	blocks, _, plain, _ := articleProjection(title, body)
	return blocks, plain
}

func articleProjection(title string, body map[string]any) (blocks, footer []map[string]string, plain string, byline map[string]string) {
	body = asStringMap(body)
	byline = map[string]string{}
	appendTo := func(dst *[]map[string]string, kind, text string) {
		text = strings.TrimSpace(text)
		if text == "" {
			return
		}
		if kind != "heading_1" && kind != "paragraph" && kind != "image" && kind != "meta" {
			kind = "paragraph"
		}
		*dst = append(*dst, map[string]string{"type": kind, "content": text})
	}
	appendItems := func(dst *[]map[string]string, raw any) {
		for _, rawItem := range asAnySlice(raw) {
			item := asStringMap(rawItem)
			if item == nil {
				if s := stringFromAny(rawItem); s != "" {
					appendTo(dst, "paragraph", s)
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
			appendTo(dst, kind, text)
		}
	}
	header := asStringMap(body["header"])
	resolvedTitle := strings.TrimSpace(title)
	if t := stringFromAny(header["title"]); t != "" {
		resolvedTitle = t
	}
	for _, key := range []string{"subtitle", "author", "series", "series_chapter", "date"} {
		if v := stringFromAny(header[key]); v != "" {
			byline[key] = v
		}
	}
	for _, key := range []string{"column_1", "column_2", "column_3", "column_4", "column_5", "column_6", "column_7", "column_8"} {
		appendItems(&blocks, body[key])
	}
	foot := asStringMap(body["footer"])
	if action := stringFromAny(foot["action"]); action != "" {
		appendTo(&footer, "paragraph", action)
	}
	if message := stringFromAny(foot["message"]); message != "" {
		appendTo(&footer, "paragraph", message)
	}
	appendItems(&footer, foot["items"])
	if len(blocks) == 0 {
		appendItems(&blocks, body["blocks"])
	}
	if len(blocks) > 0 && blocks[0]["type"] == "heading_1" && strings.EqualFold(blocks[0]["content"], resolvedTitle) {
		blocks = blocks[1:]
	}
	parts := make([]string, 0, len(blocks)+len(footer)+1)
	if resolvedTitle != "" {
		parts = append(parts, resolvedTitle)
	}
	for _, block := range blocks {
		if block["type"] != "image" {
			parts = append(parts, block["content"])
		}
	}
	for _, block := range footer {
		if block["type"] != "image" {
			parts = append(parts, block["content"])
		}
	}
	plain = strings.Join(parts, "\n\n")
	return blocks, footer, plain, byline
}

func articleDescription(plain, title string) string {
	text := strings.TrimSpace(plain)
	title = strings.TrimSpace(title)
	if title != "" && strings.HasPrefix(strings.ToLower(text), strings.ToLower(title)) {
		text = strings.TrimSpace(text[len(title):])
	}
	text = strings.Join(strings.Fields(text), " ")
	runes := []rune(text)
	if len(runes) == 0 {
		if title != "" {
			return title
		}
		return "Public article."
	}
	if len(runes) > 160 {
		return string(runes[:157]) + "..."
	}
	return text
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
	title := strings.TrimSpace(record.Title)
	blocks, footer, plain, byline := articleProjection(title, record.Body)
	if title == "" && len(blocks) > 0 && blocks[0]["type"] == "heading_1" {
		title = blocks[0]["content"]
		blocks = blocks[1:]
	}
	if plain == "" && title != "" {
		plain = title
	}
	sum := sha256.Sum256([]byte(plain))
	meta := record
	meta.Body = nil
	id := strings.TrimSpace(r.PathValue("id"))
	writeJSON(w, http.StatusOK, map[string]any{
		"meta": meta, "title": title, "description": articleDescription(plain, title),
		"byline": byline, "blocks": blocks, "footer": footer, "plainText": plain,
		"contentHash": hex.EncodeToString(sum[:]),
		"canonicalPath": "/articles/read?id=" + id,
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
