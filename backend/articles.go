package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

const articlesDefaultPublicPref = "articles_default_public"

// legacyPublicArticlesOwner reports whether email is the configured legacy
// Articles publisher (PUBLIC_ARTICLES_OWNER_EMAIL).
func (a *App) legacyPublicArticlesOwner(email string) bool {
	want := strings.ToLower(strings.TrimSpace(a.cfg.PublicArticlesOwnerEmail))
	return want != "" && strings.ToLower(strings.TrimSpace(email)) == want
}

// userHasArticlesPublishAccess is true when the account may contribute pamphlets
// to the Articles pipeline (subscription, admin grant, or legacy owner).
// Admin role alone does not enroll every admin account.
func (a *App) userHasArticlesPublishAccess(r *http.Request, user *User) bool {
	if user == nil {
		return false
	}
	if a.legacyPublicArticlesOwner(user.EmailNormalized) {
		return true
	}
	if a.failClosedEnt {
		return false
	}
	ents, err := a.store.EntitlementsByUser(r.Context(), user.ID)
	if err != nil {
		return false
	}
	if entitlementActiveProduct(ents, productArticles, time.Now().UTC()) {
		return true
	}
	granted, unavailable := a.hasAdminServiceGrant(r, user.ID, productArticles)
	return !unavailable && granted
}

func preferenceAsBool(value any, fallback bool) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		switch strings.ToLower(strings.TrimSpace(v)) {
		case "1", "true", "yes", "on":
			return true
		case "0", "false", "no", "off":
			return false
		}
	case float64:
		return v != 0
	case int:
		return v != 0
	case int32:
		return v != 0
	case int64:
		return v != 0
	}
	return fallback
}

// articlesDefaultPublic is an admin-only policy: when true, new pamphlets for
// that publisher are marked public on create. Missing pref: legacy owner → true.
func (a *App) articlesDefaultPublic(r *http.Request, user *User) bool {
	if user == nil {
		return false
	}
	pref, err := a.store.UserPreferenceByKey(r.Context(), user.ID, articlesDefaultPublicPref)
	if err == nil && pref != nil {
		return preferenceAsBool(pref.Value, false)
	}
	return a.legacyPublicArticlesOwner(user.EmailNormalized)
}

func (a *App) articlesPublisherUserIDs(r *http.Request) ([]string, error) {
	users, err := a.store.ListUsers(r.Context())
	if err != nil {
		return nil, err
	}
	out := make([]string, 0)
	seen := map[string]bool{}
	for _, user := range users {
		if user == nil || seen[user.ID] || !a.userHasArticlesPublishAccess(r, user) {
			continue
		}
		seen[user.ID] = true
		out = append(out, user.ID)
	}
	return out, nil
}

// autoPublishEpamForArticles marks new pamphlets public only when the owner is
// an Articles publisher and admin policy defaultPublic is on. Never on updates.
func (a *App) autoPublishEpamForArticles(r *http.Request, user *User, rec *EpamRecord) {
	if user == nil || rec == nil || r == nil {
		return
	}
	if !a.userHasArticlesPublishAccess(r, user) {
		return
	}
	if a.articlesDefaultPublic(r, user) {
		rec.Public = true
	}
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

func articleBlocks(title string, body map[string]any) ([]map[string]any, string) {
	blocks, _, plain, _ := articleProjection(title, body)
	return blocks, plain
}

// articleStyleIndexes keeps pamphlet style_indexes[0] bold ranges for the
// public article reader. Bounds match the editor's JS string indexes; the
// reader clamps. Image pan/zoom slots are omitted.
func articleStyleIndexes(raw any) [][]int {
	if raw == nil {
		return nil
	}
	rows := asAnySlice(raw)
	if len(rows) == 0 {
		return nil
	}
	boldRow := asAnySlice(rows[0])
	if len(boldRow) < 2 {
		return nil
	}
	start := intFromAny(boldRow[0])
	end := intFromAny(boldRow[1])
	if end <= start || start < 0 {
		return nil
	}
	return [][]int{{start, end}}
}

func intFromAny(v any) int {
	switch n := v.(type) {
	case int:
		return n
	case int32:
		return int(n)
	case int64:
		return int(n)
	case float64:
		return int(n)
	case float32:
		return int(n)
	case json.Number:
		i, err := n.Int64()
		if err != nil {
			return 0
		}
		return int(i)
	default:
		return 0
	}
}

func articleProjection(title string, body map[string]any) (blocks, footer []map[string]any, plain string, byline map[string]string) {
	body = asStringMap(body)
	byline = map[string]string{}
	appendTo := func(dst *[]map[string]any, kind, text string, styleIndexes any) {
		if strings.TrimSpace(text) == "" {
			return
		}
		if kind != "heading_1" && kind != "paragraph" && kind != "image" && kind != "meta" {
			kind = "paragraph"
		}
		// Keep original content when bold ranges are present so indexes stay valid.
		content := text
		var styles [][]int
		if kind != "image" {
			styles = articleStyleIndexes(styleIndexes)
		}
		if styles == nil {
			content = strings.TrimSpace(text)
		}
		block := map[string]any{"type": kind, "content": content}
		if styles != nil {
			block["style_indexes"] = styles
		}
		*dst = append(*dst, block)
	}
	appendItems := func(dst *[]map[string]any, raw any) {
		for _, rawItem := range asAnySlice(raw) {
			item := asStringMap(rawItem)
			if item == nil {
				if s := stringFromAny(rawItem); s != "" {
					appendTo(dst, "paragraph", s, nil)
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
			appendTo(dst, kind, text, item["style_indexes"])
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
		appendTo(&footer, "paragraph", action, nil)
	}
	if message := stringFromAny(foot["message"]); message != "" {
		appendTo(&footer, "paragraph", message, nil)
	}
	appendItems(&footer, foot["items"])
	if len(blocks) == 0 {
		appendItems(&blocks, body["blocks"])
	}
	if len(blocks) > 0 {
		firstType := stringFromAny(blocks[0]["type"])
		firstContent := stringFromAny(blocks[0]["content"])
		if firstType == "heading_1" && strings.EqualFold(firstContent, resolvedTitle) {
			blocks = blocks[1:]
		}
	}
	parts := make([]string, 0, len(blocks)+len(footer)+1)
	if resolvedTitle != "" {
		parts = append(parts, resolvedTitle)
	}
	for _, block := range blocks {
		if stringFromAny(block["type"]) != "image" {
			parts = append(parts, stringFromAny(block["content"]))
		}
	}
	for _, block := range footer {
		if stringFromAny(block["type"]) != "image" {
			parts = append(parts, stringFromAny(block["content"]))
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
	userIDs, err := a.articlesPublisherUserIDs(r)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if len(userIDs) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"count": 0, "articles": []EpamRecord{}})
		return
	}
	records, err := a.pamphlet.ListPublicEpamsByUsers(r.Context(), userIDs, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]EpamRecord, 0, len(records))
	for _, record := range records {
		if !record.Public {
			continue
		}
		record.Body = nil
		out = append(out, record)
	}
	writeJSON(w, http.StatusOK, map[string]any{"count": len(out), "articles": out})
}

func (a *App) getArticleHandler(w http.ResponseWriter, r *http.Request) {
	userIDs, err := a.articlesPublisherUserIDs(r)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	record, found, err := a.pamphlet.GetPublicEpamByUsers(r.Context(), userIDs, id, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found || !record.Public {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	a.applyLinkedFooter(r, &record)
	title := strings.TrimSpace(record.Title)
	blocks, footer, plain, byline := articleProjection(title, record.Body)
	if title == "" && len(blocks) > 0 && stringFromAny(blocks[0]["type"]) == "heading_1" {
		title = stringFromAny(blocks[0]["content"])
		blocks = blocks[1:]
	}
	if plain == "" && title != "" {
		plain = title
	}
	sum := sha256.Sum256([]byte(plain))
	meta := record
	meta.Body = nil
	writeJSON(w, http.StatusOK, map[string]any{
		"meta": meta, "title": title, "description": articleDescription(plain, title),
		"byline": byline, "blocks": blocks, "footer": footer, "plainText": plain,
		"contentHash": hex.EncodeToString(sum[:]),
		"canonicalPath": "/articles/read?id=" + id,
	})
}

// GET /api/articles/{id}/pdf — public pamphlet PDF for a published article only.
func (a *App) getArticlePDFHandler(w http.ResponseWriter, r *http.Request) {
	userIDs, err := a.articlesPublisherUserIDs(r)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	record, found, err := a.pamphlet.GetPublicEpamByUsers(r.Context(), userIDs, id, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found || !record.Public {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	a.applyLinkedFooter(r, &record)
	raw, err := json.Marshal(record.Body)
	if err != nil || len(raw) == 0 || string(raw) == "null" {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var doc pdf.PamphletDocument
	if err := json.Unmarshal(raw, &doc); err != nil {
		a.mustLogf(r, "articles.pdf.json_error", "epam_id", id, "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if strings.TrimSpace(doc.Type) == "" {
		doc.Type = "pamphlet_single_sheet"
	}
	data := pdf.BuildPamphletPDF(doc)
	downloadName := "panfleto.pdf"
	if title := strings.TrimSpace(record.Title); title != "" {
		downloadName = title + ".pdf"
	} else if title := strings.TrimSpace(doc.Header.Title); title != "" {
		downloadName = title + ".pdf"
	}
	a.mustLogf(r, "articles.pdf.ok", "epam_id", id, "pdf_bytes", len(data))
	a.auditEvent(r, "article_pdf", "ok", id)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", contentDispositionAttachment(downloadName))
	w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

type articlePublicationBody struct {
	OwnerUserID string `json:"ownerUserId"`
	Published   bool   `json:"published"`
}

type articlesDefaultBody struct {
	DefaultPublic bool `json:"defaultPublic"`
}

func (a *App) listAdminArticlesHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	users, err := a.store.ListUsers(r.Context())
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	publishers := make([]map[string]any, 0)
	total := 0
	for _, user := range users {
		if user == nil || !a.userHasArticlesPublishAccess(r, user) {
			continue
		}
		records, err := a.pamphlet.ListEpams(r.Context(), user.ID, requestIDFrom(r, nil))
		if err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		items := make([]map[string]any, 0, len(records))
		for _, rec := range records {
			items = append(items, map[string]any{
				"epamId":        rec.EpamID,
				"title":         rec.Title,
				"series":        rec.Series,
				"seriesChapter": rec.SeriesChapter,
				"author":        rec.Author,
				"date":          rec.Date,
				"public":        rec.Public,
				"updatedAt":     rec.UpdatedAt,
			})
		}
		total += len(items)
		publishers = append(publishers, map[string]any{
			"userId":        user.ID,
			"email":         user.Email,
			"username":      user.Username,
			"defaultPublic": a.articlesDefaultPublic(r, user),
			"pamphlets":     items,
			"count":         len(items),
		})
	}
	a.auditEvent(r, "admin_articles", "listed", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"publishers": publishers,
		"count":      total,
	})
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
	if err != nil || owner == nil || !a.userHasArticlesPublishAccess(r, owner) {
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
	writeJSON(w, http.StatusOK, map[string]any{
		"epamId": id, "ownerUserId": owner.ID, "published": body.Published, "public": body.Published,
	})
}

func (a *App) setArticlesDefaultHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	targetID := strings.TrimSpace(r.PathValue("id"))
	target, err := a.store.UserByID(r.Context(), targetID)
	if err != nil || target == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if !a.userHasArticlesPublishAccess(r, target) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	var body articlesDefaultBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if err := a.store.UpsertUserPreference(r.Context(), &UserPreference{
		ID:        target.ID + "\x00" + articlesDefaultPublicPref,
		UserID:    target.ID,
		Key:       articlesDefaultPublicPref,
		Value:     body.DefaultPublic,
		UpdatedAt: time.Now().UTC(),
	}); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "articles_default_public", map[bool]string{true: "enabled", false: "disabled"}[body.DefaultPublic], admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"userId": target.ID, "defaultPublic": body.DefaultPublic,
	})
}
