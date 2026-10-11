package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"sort"
	"strings"
	"time"
)

func (a *App) scribStreakGetConfigHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	cfg, err := a.scribStreak.GetConfig(r.Context(), user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, cfg)
}

func (a *App) scribStreakPutConfigHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	var body scribStreakConfig
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	normalized, err := a.normalizeStreakConfig(r, user.ID, &body)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	normalized.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	if err := a.scribStreak.SaveConfig(r.Context(), normalized); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.scribMustLog(r, "scrib.streak.config.saved", "user_id", user.ID, "items", len(normalized.Items))
	writeJSON(w, http.StatusOK, normalized)
}

func (a *App) normalizeStreakConfig(r *http.Request, userID string, in *scribStreakConfig) (*scribStreakConfig, error) {
	out := &scribStreakConfig{
		UserID:          userID,
		Enabled:         in.Enabled,
		StartDate:       strings.TrimSpace(in.StartDate),
		ReminderEnabled: in.ReminderEnabled,
		Items:           make([]scribStreakItem, 0, len(in.Items)),
	}
	if out.StartDate == "" {
		out.StartDate = scribStreakTodayDate(time.Now())
	}
	if _, err := time.ParseInLocation("2006-01-02", out.StartDate, scribStreakCaracasLocation()); err != nil {
		return nil, err
	}
	if len(in.Items) > 20 {
		return nil, errors.New("too many items")
	}
	seenSheets := map[string]bool{}
	for _, item := range in.Items {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			id = randomID(12)
		}
		kind := strings.TrimSpace(item.Kind)
		label := strings.TrimSpace(item.Label)
		bookID := strings.TrimSpace(item.ScribBookID)
		sheetID := strings.TrimSpace(item.ScribSheetID)
		qty := item.QuantityPerDay
		if qty < 1 {
			qty = 1
		}
		if qty > 50 {
			return nil, errors.New("quantity too large")
		}
		if bookID == "" || sheetID == "" {
			return nil, errors.New("sheet required")
		}
		sheetKey := bookID + ":" + sheetID
		if seenSheets[sheetKey] {
			return nil, errors.New("duplicate sheet")
		}
		seenSheets[sheetKey] = true
		if _, err := a.scrib.GetSheet(r.Context(), userID, bookID, sheetID); err != nil {
			return nil, errors.New("sheet not found")
		}
		norm := scribStreakItem{
			ID:             id,
			Kind:           kind,
			Label:          label,
			QuantityPerDay: qty,
			ScribBookID:    bookID,
			ScribSheetID:   sheetID,
			Cursor:         item.Cursor,
			StartCursor:    item.StartCursor,
		}
		switch kind {
		case scribStreakKindBible:
			if item.Cursor.Bible == nil {
				return nil, errors.New("bible cursor required")
			}
			bc := *item.Cursor.Bible
			bc.BibleBookID = strings.TrimSpace(bc.BibleBookID)
			if bc.BibleBookID == "" || bc.Chapter < 1 || bc.Verse < 1 {
				return nil, errors.New("invalid bible cursor")
			}
			if _, _, err := listBibleUnits(bc, 1); err != nil {
				return nil, err
			}
			norm.Cursor.Bible = &bc
			if item.StartCursor.Bible == nil {
				sc := bc
				norm.StartCursor.Bible = &sc
			} else {
				sc := *item.StartCursor.Bible
				sc.BibleBookID = strings.TrimSpace(sc.BibleBookID)
				norm.StartCursor.Bible = &sc
			}
			if norm.Label == "" {
				norm.Label = bibleAssignmentLabel(bc.BibleBookID, bc.Chapter, bc.Verse)
			}
		case scribStreakKindInstitutes:
			if item.Cursor.Institutes == nil {
				return nil, errors.New("institutes cursor required")
			}
			ic := *item.Cursor.Institutes
			ic.ParagraphID = strings.TrimSpace(ic.ParagraphID)
			if ic.ParagraphID == "" {
				return nil, errors.New("invalid institutes cursor")
			}
			if _, _, err := listInstitutesUnits(a.calvinRoot(), ic, 1); err != nil {
				return nil, err
			}
			norm.Cursor.Institutes = &ic
			if item.StartCursor.Institutes == nil {
				sc := ic
				norm.StartCursor.Institutes = &sc
			} else {
				sc := *item.StartCursor.Institutes
				sc.ParagraphID = strings.TrimSpace(sc.ParagraphID)
				norm.StartCursor.Institutes = &sc
			}
			if norm.Label == "" {
				norm.Label = "Institutes " + ic.ParagraphID
			}
		default:
			return nil, errors.New("invalid kind")
		}
		out.Items = append(out.Items, norm)
	}
	return out, nil
}

func (a *App) scribStreakGetTodayHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	today := scribStreakTodayDate(time.Now())
	cfg, err := a.scribStreak.GetConfig(r.Context(), user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	day, dayErr := a.scribStreak.GetDay(r.Context(), user.ID, today)
	completed := dayErr == nil && day != nil && day.Completed
	var assignments []scribStreakDayAssignment
	if completed && day != nil {
		assignments = day.Assignments
	} else if cfg.Enabled && len(cfg.Items) > 0 && today >= cfg.StartDate {
		asg, err := buildDayAssignments(cfg, a.calvinRoot())
		if err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		assignments = asg
	} else {
		assignments = []scribStreakDayAssignment{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"date":        today,
		"enabled":     cfg.Enabled,
		"startDate":   cfg.StartDate,
		"completed":   completed,
		"assignments": assignments,
		"items":       cfg.Items,
	})
}

func (a *App) scribStreakListDaysHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	dates, err := a.scribStreak.ListCompletedDates(r.Context(), user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	from := strings.TrimSpace(r.URL.Query().Get("from"))
	to := strings.TrimSpace(r.URL.Query().Get("to"))
	filtered := make([]string, 0, len(dates))
	for _, d := range dates {
		if from != "" && d < from {
			continue
		}
		if to != "" && d > to {
			continue
		}
		filtered = append(filtered, d)
	}
	sort.Strings(filtered)
	days := make([]map[string]any, 0, len(filtered))
	for _, d := range filtered {
		day, err := a.scribStreak.GetDay(r.Context(), user.ID, d)
		if err != nil {
			continue
		}
		days = append(days, map[string]any{
			"date":        day.Date,
			"completed":   day.Completed,
			"completedAt": day.CompletedAt,
			"assignments": day.Assignments,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"days": days})
}

func (a *App) scribStreakCompleteDayHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	date := strings.TrimSpace(r.PathValue("date"))
	today := scribStreakTodayDate(time.Now())
	if date == "" {
		date = today
	}
	if date != today {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	cfg, err := a.scribStreak.GetConfig(r.Context(), user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !cfg.Enabled || len(cfg.Items) == 0 || date < cfg.StartDate {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if existing, err := a.scribStreak.GetDay(r.Context(), user.ID, date); err == nil && existing != nil && existing.Completed {
		writeJSON(w, http.StatusOK, existing)
		return
	}
	assignments, err := buildDayAssignments(cfg, a.calvinRoot())
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	for i := range assignments {
		sheet, err := a.scrib.GetSheet(r.Context(), user.ID, assignments[i].ScribBookID, assignments[i].ScribSheetID)
		if err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		snapID := randomID(16)
		snap := &scribStreakSnapshot{
			ID:           snapID,
			UserID:       user.ID,
			Date:         date,
			ItemID:       assignments[i].ItemID,
			ScribBookID:  assignments[i].ScribBookID,
			ScribSheetID: assignments[i].ScribSheetID,
			Sheet:        *sheet,
			CreatedAt:    now,
		}
		if err := a.scribStreak.SaveSnapshot(r.Context(), snap); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		assignments[i].SnapshotID = snapID
	}
	if err := advanceStreakConfigCursors(cfg, a.calvinRoot()); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	cfg.UpdatedAt = now
	if err := a.scribStreak.SaveConfig(r.Context(), cfg); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	day := &scribStreakDay{
		UserID:      user.ID,
		Date:        date,
		Completed:   true,
		CompletedAt: now,
		Assignments: assignments,
		UpdatedAt:   now,
	}
	if err := a.scribStreak.SaveDay(r.Context(), day); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.scribMustLog(r, "scrib.streak.day.completed", "user_id", user.ID, "date", date)
	writeJSON(w, http.StatusOK, day)
}

func (a *App) scribStreakStatsHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	dates, err := a.scribStreak.ListCompletedDates(r.Context(), user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	today := scribStreakTodayDate(time.Now())
	stats := computeStreakStats(dates, today)
	writeJSON(w, http.StatusOK, stats)
}

func (a *App) scribStreakGetSnapshotHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("snapshotId"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	snap, err := a.scribStreak.GetSnapshot(r.Context(), user.ID, id)
	if err != nil {
		if errors.Is(err, errNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, snap)
}

func (a *App) scribStreakGetDayHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	date := strings.TrimSpace(r.PathValue("date"))
	if date == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	day, err := a.scribStreak.GetDay(r.Context(), user.ID, date)
	if err != nil {
		if errors.Is(err, errNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, day)
}
