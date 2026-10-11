package main

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

func TestListBibleUnitsCrossChapter(t *testing.T) {
	units, next, err := listBibleUnits(scribStreakBibleCursor{
		BibleBookID: "romans",
		Chapter:     1,
		Verse:       32,
	}, 2)
	if err != nil {
		t.Fatal(err)
	}
	if len(units) != 2 {
		t.Fatalf("units=%d", len(units))
	}
	if units[0].Chapter != 1 || units[0].Verse != 32 {
		t.Fatalf("first=%#v", units[0])
	}
	if units[1].Chapter != 2 || units[1].Verse != 1 {
		t.Fatalf("second=%#v", units[1])
	}
	if next.Chapter != 2 || next.Verse != 2 {
		t.Fatalf("next=%#v", next)
	}
}

func TestComputeStreakStats(t *testing.T) {
	today := "2026-10-11"
	stats := computeStreakStats([]string{"2026-10-09", "2026-10-10", "2026-10-11"}, today)
	if stats.CurrentStreak != 3 || stats.BestStreak != 3 || !stats.TodayDone {
		t.Fatalf("stats=%#v", stats)
	}
	stats = computeStreakStats([]string{"2026-10-09", "2026-10-10"}, today)
	if stats.CurrentStreak != 2 || stats.TodayDone {
		t.Fatalf("yesterday chain %#v", stats)
	}
	stats = computeStreakStats([]string{"2026-10-08"}, today)
	if stats.CurrentStreak != 0 {
		t.Fatalf("broken want 0 got %#v", stats)
	}
}

func TestScribStreakConfigAndComplete(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productScrib)
	app.mailer = &recordingMailer{}

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/books", `{"name":"Romanos"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("book status=%d body=%s", rec.Code, rec.Body.String())
	}
	var book scribBook
	_ = json.Unmarshal(rec.Body.Bytes(), &book)
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/books/"+book.ID+"/sheets", `{"name":"Hoja"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("sheet status=%d", rec.Code)
	}
	var sheet scribSheet
	_ = json.Unmarshal(rec.Body.Bytes(), &sheet)

	today := scribStreakTodayDate(time.Now())
	cfgBody := map[string]any{
		"enabled":         true,
		"startDate":       today,
		"reminderEnabled": true,
		"items": []map[string]any{
			{
				"kind":           "bible",
				"label":          "Romans",
				"quantityPerDay": 1,
				"scribBookId":    book.ID,
				"scribSheetId":   sheet.ID,
				"cursor": map[string]any{
					"bible": map[string]any{
						"bibleBookId": "romans",
						"chapter":     1,
						"verse":       1,
					},
				},
			},
		},
	}
	raw, _ := json.Marshal(cfgBody)
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/scrib/streak/config", string(raw))
	if rec.Code != http.StatusOK {
		t.Fatalf("put config status=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/streak/today", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("today status=%d body=%s", rec.Code, rec.Body.String())
	}
	var todayResp map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &todayResp)
	if todayResp["completed"] != false {
		t.Fatalf("expected not completed %#v", todayResp)
	}
	asg, _ := todayResp["assignments"].([]any)
	if len(asg) != 1 {
		t.Fatalf("assignments=%#v", todayResp["assignments"])
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/streak/days/"+today+"/complete", `{}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("complete status=%d body=%s", rec.Code, rec.Body.String())
	}
	var day scribStreakDay
	_ = json.Unmarshal(rec.Body.Bytes(), &day)
	if !day.Completed || len(day.Assignments) != 1 || day.Assignments[0].SnapshotID == "" {
		t.Fatalf("day %#v", day)
	}

	// Completing must not create a new library sheet.
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/library", "")
	lib := decodeMap(t, rec)
	books, _ := lib["books"].([]any)
	if len(books) != 1 {
		t.Fatalf("books after complete=%d", len(books))
	}
	b0 := books[0].(map[string]any)
	sheets, _ := b0["sheets"].([]any)
	if len(sheets) != 1 {
		t.Fatalf("want 1 sheet got %d", len(sheets))
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/streak/config", "")
	var cfg scribStreakConfig
	_ = json.Unmarshal(rec.Body.Bytes(), &cfg)
	if cfg.Items[0].Cursor.Bible == nil || cfg.Items[0].Cursor.Bible.Verse != 2 {
		t.Fatalf("cursor not advanced %#v", cfg.Items[0].Cursor)
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/streak/stats", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("stats status=%d", rec.Code)
	}
	var stats scribStreakStats
	_ = json.Unmarshal(rec.Body.Bytes(), &stats)
	if stats.CurrentStreak != 1 || !stats.TodayDone {
		t.Fatalf("stats %#v", stats)
	}

	snapID := day.Assignments[0].SnapshotID
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/streak/snapshots/"+snapID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("snapshot status=%d body=%s", rec.Code, rec.Body.String())
	}

	// Reminder idempotent after complete (skipped because day done).
	app.runScribStreakReminders(t.Context(), time.Now())
	mailer := app.mailer.(*recordingMailer)
	if mailer.sends != 0 {
		t.Fatalf("expected no reminder after complete, got %d", mailer.sends)
	}
}

func TestScribStreakReminderSendsOnce(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productScrib)
	mailer := &recordingMailer{}
	app.mailer = mailer

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/books", `{"name":"Prov"}`)
	var book scribBook
	_ = json.Unmarshal(rec.Body.Bytes(), &book)
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/books/"+book.ID+"/sheets", `{"name":"H"}`)
	var sheet scribSheet
	_ = json.Unmarshal(rec.Body.Bytes(), &sheet)

	today := scribStreakTodayDate(time.Now())
	cfgBody, _ := json.Marshal(map[string]any{
		"enabled": true, "startDate": today, "reminderEnabled": true,
		"items": []map[string]any{{
			"kind": "bible", "label": "Proverbs", "quantityPerDay": 1,
			"scribBookId": book.ID, "scribSheetId": sheet.ID,
			"cursor": map[string]any{"bible": map[string]any{
				"bibleBookId": "proverbs", "chapter": 1, "verse": 1,
			}},
		}},
	})
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/scrib/streak/config", string(cfgBody))
	if rec.Code != http.StatusOK {
		t.Fatalf("config %d %s", rec.Code, rec.Body.String())
	}

	now := time.Now()
	app.runScribStreakReminders(t.Context(), now)
	app.runScribStreakReminders(t.Context(), now)
	if mailer.sends != 1 {
		t.Fatalf("want 1 mail got %d", mailer.sends)
	}
}

func TestNextScribStreakReminderAt(t *testing.T) {
	loc := scribStreakCaracasLocation()
	before := time.Date(2026, 10, 11, 2, 0, 0, 0, loc)
	next := nextScribStreakReminderAt(before)
	if next.Hour() != 3 || next.Day() != 11 {
		t.Fatalf("before 3am -> %#v", next)
	}
	after := time.Date(2026, 10, 11, 3, 0, 0, 0, loc)
	next = nextScribStreakReminderAt(after)
	if next.Day() != 12 || next.Hour() != 3 {
		t.Fatalf("at/after 3am -> %#v", next)
	}
}
