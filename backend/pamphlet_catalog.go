package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
)

// EpamSeriesProfile is a named series with ordered chapters for one owner.
type EpamSeriesProfile struct {
	UserID    string              `json:"userId" bson:"user_id"`
	SeriesID  string              `json:"seriesId" bson:"series_id"`
	Name      string              `json:"name" bson:"name"`
	Chapters  []EpamChapterProfile `json:"chapters" bson:"chapters"`
	CreatedAt string              `json:"createdAt,omitempty" bson:"created_at,omitempty"`
	UpdatedAt string              `json:"updatedAt,omitempty" bson:"updated_at,omitempty"`
}

// EpamChapterProfile is a chapter name inside a series.
type EpamChapterProfile struct {
	ChapterID string `json:"chapterId" bson:"chapter_id"`
	Name      string `json:"name" bson:"name"`
}

// EpamAuthorProfile is a reusable author name for pamphlet headers / articles.
type EpamAuthorProfile struct {
	UserID    string `json:"userId" bson:"user_id"`
	AuthorID  string `json:"authorId" bson:"author_id"`
	Name      string `json:"name" bson:"name"`
	CreatedAt string `json:"createdAt,omitempty" bson:"created_at,omitempty"`
	UpdatedAt string `json:"updatedAt,omitempty" bson:"updated_at,omitempty"`
}

type seriesWriteBody struct {
	Name     string               `json:"name"`
	Chapters []EpamChapterProfile `json:"chapters"`
}

type authorWriteBody struct {
	Name string `json:"name"`
}

type epamCatalogResponse struct {
	Series  []EpamSeriesProfile `json:"series"`
	Authors []EpamAuthorProfile `json:"authors"`
}

func normalizeSeriesChapters(in []EpamChapterProfile) []EpamChapterProfile {
	out := make([]EpamChapterProfile, 0, len(in))
	seen := map[string]bool{}
	for _, ch := range in {
		name := strings.TrimSpace(ch.Name)
		if name == "" {
			continue
		}
		key := strings.ToLower(name)
		if seen[key] {
			continue
		}
		seen[key] = true
		id := strings.TrimSpace(ch.ChapterID)
		if id == "" {
			id = randomID(12)
		}
		out = append(out, EpamChapterProfile{ChapterID: id, Name: name})
	}
	return out
}

func (a *App) listEpamCatalogHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletUser(w, r)
	if user == nil {
		return
	}
	rid := requestIDFrom(r, nil)
	series, err := a.pamphlet.ListSeries(r.Context(), user.ID, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	authors, err := a.pamphlet.ListAuthors(r.Context(), user.ID, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	// Seed catalog entries from existing pamphlet metadata so dropdowns cover
	// legacy free-text values without forcing a manual migration.
	epams, err := a.pamphlet.ListEpams(r.Context(), user.ID, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	series, authors = mergeCatalogFromEpams(series, authors, epams)
	sort.SliceStable(series, func(i, j int) bool {
		return strings.ToLower(series[i].Name) < strings.ToLower(series[j].Name)
	})
	sort.SliceStable(authors, func(i, j int) bool {
		return strings.ToLower(authors[i].Name) < strings.ToLower(authors[j].Name)
	})
	if series == nil {
		series = []EpamSeriesProfile{}
	}
	if authors == nil {
		authors = []EpamAuthorProfile{}
	}
	writeJSON(w, http.StatusOK, epamCatalogResponse{Series: series, Authors: authors})
}

func mergeCatalogFromEpams(series []EpamSeriesProfile, authors []EpamAuthorProfile, epams []EpamRecord) ([]EpamSeriesProfile, []EpamAuthorProfile) {
	seriesByName := map[string]int{}
	for i, s := range series {
		seriesByName[strings.ToLower(strings.TrimSpace(s.Name))] = i
	}
	authorByName := map[string]bool{}
	for _, a := range authors {
		authorByName[strings.ToLower(strings.TrimSpace(a.Name))] = true
	}
	for _, rec := range epams {
		sName := strings.TrimSpace(rec.Series)
		cName := strings.TrimSpace(rec.SeriesChapter)
		aName := strings.TrimSpace(rec.Author)
		if sName != "" {
			key := strings.ToLower(sName)
			idx, ok := seriesByName[key]
			if !ok {
				series = append(series, EpamSeriesProfile{
					UserID:   rec.UserID,
					SeriesID: "derived-" + randomID(8),
					Name:     sName,
					Chapters: nil,
				})
				idx = len(series) - 1
				seriesByName[key] = idx
			}
			if cName != "" {
				found := false
				for _, ch := range series[idx].Chapters {
					if strings.EqualFold(strings.TrimSpace(ch.Name), cName) {
						found = true
						break
					}
				}
				if !found {
					series[idx].Chapters = append(series[idx].Chapters, EpamChapterProfile{
						ChapterID: "derived-" + randomID(8),
						Name:      cName,
					})
				}
			}
		}
		if aName != "" && !authorByName[strings.ToLower(aName)] {
			authors = append(authors, EpamAuthorProfile{
				UserID:   rec.UserID,
				AuthorID: "derived-" + randomID(8),
				Name:     aName,
			})
			authorByName[strings.ToLower(aName)] = true
		}
	}
	return series, authors
}

func (a *App) createEpamSeriesHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	var body seriesWriteBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	rec := EpamSeriesProfile{
		UserID:   user.ID,
		Name:     name,
		Chapters: normalizeSeriesChapters(body.Chapters),
	}
	saved, err := a.pamphlet.SaveSeries(r.Context(), rec, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusCreated, saved)
}

func (a *App) updateEpamSeriesHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.HasPrefix(id, "derived-") {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	rid := requestIDFrom(r, nil)
	existing, ok, err := a.pamphlet.GetSeries(r.Context(), user.ID, id, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body seriesWriteBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	oldName := existing.Name
	existing.Name = name
	existing.Chapters = normalizeSeriesChapters(body.Chapters)
	saved, err := a.pamphlet.SaveSeries(r.Context(), existing, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !strings.EqualFold(oldName, name) {
		_ = a.reassignEpamSeriesName(r, user.ID, oldName, name, rid)
	}
	writeJSON(w, http.StatusOK, saved)
}

func (a *App) deleteEpamSeriesHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.HasPrefix(id, "derived-") {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	rid := requestIDFrom(r, nil)
	existing, ok, err := a.pamphlet.GetSeries(r.Context(), user.ID, id, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err := a.pamphlet.DeleteSeries(r.Context(), user.ID, id, rid); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	_ = a.reassignEpamSeriesName(r, user.ID, existing.Name, "", rid)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "seriesId": id})
}

func (a *App) createEpamAuthorHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	var body authorWriteBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	saved, err := a.pamphlet.SaveAuthor(r.Context(), EpamAuthorProfile{UserID: user.ID, Name: name}, requestIDFrom(r, nil))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusCreated, saved)
}

func (a *App) updateEpamAuthorHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.HasPrefix(id, "derived-") {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	rid := requestIDFrom(r, nil)
	existing, ok, err := a.pamphlet.GetAuthor(r.Context(), user.ID, id, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body authorWriteBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	oldName := existing.Name
	existing.Name = name
	saved, err := a.pamphlet.SaveAuthor(r.Context(), existing, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !strings.EqualFold(oldName, name) {
		_ = a.reassignEpamAuthorName(r, user.ID, oldName, name, rid)
	}
	writeJSON(w, http.StatusOK, saved)
}

func (a *App) deleteEpamAuthorHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requirePamphletWrite(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.HasPrefix(id, "derived-") {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	rid := requestIDFrom(r, nil)
	existing, ok, err := a.pamphlet.GetAuthor(r.Context(), user.ID, id, rid)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err := a.pamphlet.DeleteAuthor(r.Context(), user.ID, id, rid); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	_ = a.reassignEpamAuthorName(r, user.ID, existing.Name, "", rid)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "authorId": id})
}

func (a *App) reassignEpamSeriesName(r *http.Request, userID, oldName, newName, rid string) error {
	oldName = strings.TrimSpace(oldName)
	if oldName == "" {
		return nil
	}
	epams, err := a.pamphlet.ListEpams(r.Context(), userID, rid)
	if err != nil {
		return err
	}
	for _, meta := range epams {
		if !strings.EqualFold(strings.TrimSpace(meta.Series), oldName) {
			continue
		}
		rec, ok, err := a.pamphlet.GetEpam(r.Context(), userID, meta.EpamID, rid)
		if err != nil || !ok {
			continue
		}
		rec.Series = strings.TrimSpace(newName)
		if header, ok := rec.Body["header"].(map[string]any); ok {
			header["series"] = rec.Series
			rec.Body["header"] = header
		}
		if _, err := a.pamphlet.SaveEpam(r.Context(), rec, rid); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) reassignEpamAuthorName(r *http.Request, userID, oldName, newName, rid string) error {
	oldName = strings.TrimSpace(oldName)
	if oldName == "" {
		return nil
	}
	epams, err := a.pamphlet.ListEpams(r.Context(), userID, rid)
	if err != nil {
		return err
	}
	for _, meta := range epams {
		if !strings.EqualFold(strings.TrimSpace(meta.Author), oldName) {
			continue
		}
		rec, ok, err := a.pamphlet.GetEpam(r.Context(), userID, meta.EpamID, rid)
		if err != nil || !ok {
			continue
		}
		rec.Author = strings.TrimSpace(newName)
		if header, ok := rec.Body["header"].(map[string]any); ok {
			header["author"] = rec.Author
			rec.Body["header"] = header
		}
		if _, err := a.pamphlet.SaveEpam(r.Context(), rec, rid); err != nil {
			return err
		}
	}
	return nil
}
