package main

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	_ "embed"
)

//go:embed scrib-bible-outline.json
var scribBibleOutlineRaw []byte

type scribBibleOutlineBook struct {
	Name     string `json:"name"`
	Chapters []int  `json:"chapters"`
}

type scribBibleOutlineDoc struct {
	SchemaVersion int                              `json:"schemaVersion"`
	Books         map[string]scribBibleOutlineBook `json:"books"`
}

var (
	scribBibleOutlineOnce sync.Once
	scribBibleOutline     *scribBibleOutlineDoc
	scribBibleOutlineErr  error
)

func loadScribBibleOutline() (*scribBibleOutlineDoc, error) {
	scribBibleOutlineOnce.Do(func() {
		var doc scribBibleOutlineDoc
		if err := json.Unmarshal(scribBibleOutlineRaw, &doc); err != nil {
			scribBibleOutlineErr = err
			return
		}
		if doc.Books == nil {
			doc.Books = map[string]scribBibleOutlineBook{}
		}
		scribBibleOutline = &doc
	})
	return scribBibleOutline, scribBibleOutlineErr
}

func bibleAssignmentLabel(bookID string, chapter, verse int) string {
	name := bookID
	if outline, err := loadScribBibleOutline(); err == nil {
		if b, ok := outline.Books[bookID]; ok && b.Name != "" {
			name = b.Name
		}
	}
	return fmt.Sprintf("%s %d:%d", name, chapter, verse)
}

func listBibleUnits(cursor scribStreakBibleCursor, quantity int) ([]scribStreakAssignmentUnit, scribStreakBibleCursor, error) {
	if quantity < 1 {
		quantity = 1
	}
	outline, err := loadScribBibleOutline()
	if err != nil {
		return nil, cursor, err
	}
	book, ok := outline.Books[cursor.BibleBookID]
	if !ok || len(book.Chapters) == 0 {
		return nil, cursor, fmt.Errorf("unknown bible book")
	}
	ch := cursor.Chapter
	v := cursor.Verse
	if ch < 1 {
		ch = 1
	}
	if v < 1 {
		v = 1
	}
	if ch > len(book.Chapters) {
		return nil, cursor, fmt.Errorf("chapter out of range")
	}
	units := make([]scribStreakAssignmentUnit, 0, quantity)
	cur := scribStreakBibleCursor{BibleBookID: cursor.BibleBookID, Chapter: ch, Verse: v}
	for i := 0; i < quantity; i++ {
		if cur.Chapter > len(book.Chapters) {
			return nil, cursor, fmt.Errorf("end of book")
		}
		maxV := book.Chapters[cur.Chapter-1]
		if cur.Verse > maxV {
			cur.Chapter++
			cur.Verse = 1
			if cur.Chapter > len(book.Chapters) {
				return nil, cursor, fmt.Errorf("end of book")
			}
			maxV = book.Chapters[cur.Chapter-1]
		}
		units = append(units, scribStreakAssignmentUnit{
			Kind:        scribStreakKindBible,
			BibleBookID: cur.BibleBookID,
			Chapter:     cur.Chapter,
			Verse:       cur.Verse,
			Label:       bibleAssignmentLabel(cur.BibleBookID, cur.Chapter, cur.Verse),
		})
		cur.Verse++
		if cur.Verse > maxV {
			cur.Chapter++
			cur.Verse = 1
		}
	}
	return units, cur, nil
}

func buildDayAssignments(cfg *scribStreakConfig, calvinRoot string) ([]scribStreakDayAssignment, error) {
	out := make([]scribStreakDayAssignment, 0, len(cfg.Items))
	for _, item := range cfg.Items {
		qty := item.QuantityPerDay
		if qty < 1 {
			qty = 1
		}
		asg := scribStreakDayAssignment{
			ItemID:       item.ID,
			Label:        item.Label,
			Kind:         item.Kind,
			ScribBookID:  item.ScribBookID,
			ScribSheetID: item.ScribSheetID,
			Units:        []scribStreakAssignmentUnit{},
		}
		switch item.Kind {
		case scribStreakKindBible:
			if item.Cursor.Bible == nil {
				return nil, fmt.Errorf("missing bible cursor")
			}
			units, _, err := listBibleUnits(*item.Cursor.Bible, qty)
			if err != nil {
				return nil, err
			}
			asg.Units = units
		case scribStreakKindInstitutes:
			if item.Cursor.Institutes == nil {
				return nil, fmt.Errorf("missing institutes cursor")
			}
			units, _, err := listInstitutesUnits(calvinRoot, *item.Cursor.Institutes, qty)
			if err != nil {
				return nil, err
			}
			asg.Units = units
		default:
			return nil, fmt.Errorf("invalid kind")
		}
		out = append(out, asg)
	}
	return out, nil
}

func advanceStreakConfigCursors(cfg *scribStreakConfig, calvinRoot string) error {
	for i := range cfg.Items {
		item := &cfg.Items[i]
		qty := item.QuantityPerDay
		if qty < 1 {
			qty = 1
		}
		switch item.Kind {
		case scribStreakKindBible:
			if item.Cursor.Bible == nil {
				return fmt.Errorf("missing bible cursor")
			}
			_, next, err := listBibleUnits(*item.Cursor.Bible, qty)
			if err != nil {
				return err
			}
			item.Cursor.Bible = &next
		case scribStreakKindInstitutes:
			if item.Cursor.Institutes == nil {
				return fmt.Errorf("missing institutes cursor")
			}
			_, next, err := listInstitutesUnits(calvinRoot, *item.Cursor.Institutes, qty)
			if err != nil {
				return err
			}
			item.Cursor.Institutes = &next
		default:
			return fmt.Errorf("invalid kind")
		}
	}
	return nil
}

func computeStreakStats(completedDates []string, today string) scribStreakStats {
	loc := scribStreakCaracasLocation()
	set := make(map[string]bool, len(completedDates))
	for _, d := range completedDates {
		d = strings.TrimSpace(d)
		if d != "" {
			set[d] = true
		}
	}
	stats := scribStreakStats{
		CompletedDays: len(set),
		TodayDate:     today,
		TodayDone:     set[today],
	}
	if len(set) == 0 {
		return stats
	}
	dates := make([]string, 0, len(set))
	for d := range set {
		dates = append(dates, d)
	}
	sort.Strings(dates)
	stats.LastCompleted = dates[len(dates)-1]
	best := 1
	run := 1
	for i := 1; i < len(dates); i++ {
		prev, err1 := time.ParseInLocation("2006-01-02", dates[i-1], loc)
		cur, err2 := time.ParseInLocation("2006-01-02", dates[i], loc)
		if err1 != nil || err2 != nil {
			run = 1
			continue
		}
		if cur.Equal(prev.AddDate(0, 0, 1)) {
			run++
			if run > best {
				best = run
			}
		} else {
			run = 1
		}
	}
	stats.BestStreak = best

	anchor := today
	if !set[today] {
		t, err := time.ParseInLocation("2006-01-02", today, loc)
		if err != nil {
			return stats
		}
		anchor = t.AddDate(0, 0, -1).Format("2006-01-02")
		if !set[anchor] {
			stats.CurrentStreak = 0
			return stats
		}
	}
	cur := 0
	d, err := time.ParseInLocation("2006-01-02", anchor, loc)
	if err != nil {
		return stats
	}
	for {
		key := d.Format("2006-01-02")
		if !set[key] {
			break
		}
		cur++
		d = d.AddDate(0, 0, -1)
	}
	stats.CurrentStreak = cur
	return stats
}
