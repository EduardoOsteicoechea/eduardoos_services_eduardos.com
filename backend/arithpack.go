package main

import (
	"encoding/json"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"
)

// Arithpack records one photographed day of the arithmetic/geometry pack.
// Scores are pasted from chat: 0 miss, 1 partial, 2 correct.

const (
	arithpackScoreMax  = 2
	arithpackMaxCells  = 96
	arithpackMaxPhotos = 6
	arithpackMaxJSON   = 1 << 20
)

var arithpackDayPattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
var arithpackKeyPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,40}$`)

type ArithpackCell struct {
	Page  int    `json:"page"`
	Row   int    `json:"row"`
	Col   int    `json:"col"`
	Kind  string `json:"kind"`
	A     int    `json:"a,omitempty"`
	B     int    `json:"b,omitempty"`
	Shape string `json:"shape,omitempty"`
	Score int    `json:"score"`
	Note  string `json:"note,omitempty"`
}

type ArithpackPhoto struct {
	Name string `json:"name"`
	URL  string `json:"url,omitempty"`
}

type ArithpackDay struct {
	Day         string           `json:"day"`
	StudentKey  string           `json:"studentKey"`
	OwnerUserID string           `json:"ownerUserId"`
	Cells       []ArithpackCell  `json:"cells"`
	Photos      []ArithpackPhoto `json:"photos"`
	UpdatedAt   time.Time        `json:"updatedAt"`
}

type ArithpackGrades struct {
	Date  string          `json:"date"`
	Cells []ArithpackCell `json:"cells"`
}

type ArithpackFact struct {
	Key      string  `json:"key"`
	Kind     string  `json:"kind"`
	A        int     `json:"a,omitempty"`
	B        int     `json:"b,omitempty"`
	Shape    string  `json:"shape,omitempty"`
	Attempts int     `json:"attempts"`
	Misses   int     `json:"misses"`
	Avg      float64 `json:"avg"`
}

type ArithpackAnalytics struct {
	StudentKey string          `json:"studentKey"`
	Days       int             `json:"days"`
	Cells      int             `json:"cells"`
	Avg        float64         `json:"avg"`
	Emphasize  []ArithpackFact `json:"emphasize"`
	Figures    []ArithpackFact `json:"figures"`
}

func parseArithpackGrades(raw string) (ArithpackGrades, error) {
	var grades ArithpackGrades
	text := strings.TrimSpace(raw)
	if err := json.Unmarshal([]byte(text), &grades); err != nil {
		return grades, err
	}
	grades.Date = strings.TrimSpace(grades.Date)
	if !arithpackDayPattern.MatchString(grades.Date) {
		return grades, errArithpackDate
	}
	if _, err := time.Parse("2006-01-02", grades.Date); err != nil {
		return grades, errArithpackDate
	}
	if len(grades.Cells) == 0 || len(grades.Cells) > arithpackMaxCells {
		return grades, errArithpackCells
	}
	for i := range grades.Cells {
		cell := &grades.Cells[i]
		cell.Kind = arithpackKind(cell.Kind)
		cell.Shape = arithpackShape(cell.Shape)
		cell.Note = arithpackNote(cell.Note)
		if cell.Page < 1 || cell.Page > 3 || cell.Row < 0 || cell.Row > 7 || cell.Col < 0 || cell.Col > 3 {
			return grades, errArithpackCells
		}
		if cell.Score < 0 || cell.Score > arithpackScoreMax {
			return grades, errArithpackCells
		}
		if cell.Kind == "mult" || cell.Kind == "div" {
			if cell.A < 1 || cell.A > 99 || cell.B < 1 || cell.B > 99 {
				return grades, errArithpackCells
			}
		}
	}
	return grades, nil
}

func arithpackKind(kind string) string {
	switch strings.ToLower(strings.TrimSpace(kind)) {
	case "mult", "div", "plane", "solid", "scene":
		return strings.ToLower(strings.TrimSpace(kind))
	default:
		return ""
	}
}

func arithpackShape(shape string) string {
	shape = strings.TrimSpace(shape)
	if len(shape) > 40 {
		shape = shape[:40]
	}
	var b strings.Builder
	for _, r := range shape {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '_' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func arithpackNote(note string) string {
	note = strings.TrimSpace(note)
	if len(note) > 160 {
		note = note[:160]
	}
	return note
}

func arithpackStudentKey(raw string) (string, bool) {
	key := strings.TrimSpace(raw)
	if key == "" {
		key = "nino"
	}
	if !arithpackKeyPattern.MatchString(key) {
		return "", false
	}
	return key, true
}

func arithpackAnalytics(days []ArithpackDay) ArithpackAnalytics {
	type acc struct {
		fact ArithpackFact
		sum  int
	}
	by := map[string]*acc{}
	out := ArithpackAnalytics{}
	out.Days = len(days)
	for _, day := range days {
		for _, cell := range day.Cells {
			if cell.Kind == "" {
				continue
			}
			out.Cells++
			out.Avg += float64(cell.Score)
			key := arithpackFactKey(cell)
			item := by[key]
			if item == nil {
				item = &acc{fact: ArithpackFact{Key: key, Kind: cell.Kind, A: cell.A, B: cell.B, Shape: cell.Shape}}
				by[key] = item
			}
			item.fact.Attempts++
			item.sum += cell.Score
			if cell.Score < arithpackScoreMax {
				item.fact.Misses++
			}
		}
	}
	if out.Cells > 0 {
		out.Avg = out.Avg / float64(out.Cells)
	}
	var mults, figs []ArithpackFact
	for _, item := range by {
		item.fact.Avg = float64(item.sum) / float64(item.fact.Attempts)
		if item.fact.Kind == "mult" || item.fact.Kind == "div" {
			if item.fact.Misses > 0 {
				mults = append(mults, item.fact)
			}
			continue
		}
		if item.fact.Misses > 0 {
			figs = append(figs, item.fact)
		}
	}
	sort.Slice(mults, func(i, j int) bool {
		if mults[i].Misses != mults[j].Misses {
			return mults[i].Misses > mults[j].Misses
		}
		return mults[i].Avg < mults[j].Avg
	})
	sort.Slice(figs, func(i, j int) bool {
		return figs[i].Misses > figs[j].Misses
	})
	out.Emphasize = mults
	out.Figures = figs
	return out
}

func arithpackFactKey(cell ArithpackCell) string {
	if cell.Kind == "mult" || cell.Kind == "div" {
		return cell.Kind + ":" + itoa(cell.A) + "x" + itoa(cell.B)
	}
	shape := cell.Shape
	if shape == "" {
		shape = itoa(cell.Page) + "-" + itoa(cell.Row) + "-" + itoa(cell.Col)
	}
	return cell.Kind + ":" + shape
}

func itoa(n int) string {
	return strings.TrimSpace(strings.ReplaceAll(jsonNumber(n), "+", ""))
}

func jsonNumber(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}
