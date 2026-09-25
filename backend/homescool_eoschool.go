package main

import (
	"encoding/json"
	"fmt"
	"strings"
)

const (
	eoschoolFormatName = "eoschool"
	eoschoolVersion    = 1
	eoschoolLevelV1    = 6

	eoschoolKindIntro   = "intro"
	eoschoolKindDeepen  = "deepen"
	eoschoolKindReview  = "review"
)

// Canonical subject codes / menu order (METHOD_V1 + cambios/1). LT is case-sensitive.
var eoschoolSubjects = []string{
	"teb", "exe", "LT", "his", "geo", "art", "mat", "esp", "ing", "lat", "cie", "pro",
}

var eoschoolSubjectSet = func() map[string]struct{} {
	m := make(map[string]struct{}, len(eoschoolSubjects))
	for _, s := range eoschoolSubjects {
		m[s] = struct{}{}
	}
	return m
}()

// EoschoolDocument is the METHOD_V1 lesson + quiz payload.
type EoschoolDocument struct {
	Format  string           `json:"format"`
	Version int              `json:"version"`
	Cycle   int              `json:"cycle"`
	Week    int              `json:"week"`
	Day     int              `json:"day"`
	Level   int              `json:"level"`
	Subject string           `json:"subject"`
	Locale  string           `json:"locale,omitempty"`
	Title   string           `json:"title"`
	Lesson  EoschoolLesson   `json:"lesson"`
	Quiz       EoschoolQuiz    `json:"quiz"`
	Media      []EoschoolMedia `json:"media,omitempty"`
	SupportURL string          `json:"supportUrl,omitempty"`
}

type EoschoolLesson struct {
	Kind       string          `json:"kind"`
	FocusPoint *int            `json:"focusPoint"`
	Points     []EoschoolPoint `json:"points"`
	Summary    string          `json:"summary,omitempty"`
}

type EoschoolPoint struct {
	ID      string `json:"id"`
	Heading string `json:"heading"`
	Body    string `json:"body"`
}

type EoschoolQuiz struct {
	QuestionCount int                `json:"questionCount"`
	Questions     []EoschoolQuestion `json:"questions"`
}

type EoschoolQuestion struct {
	ID        string   `json:"id"`
	OriginDay int      `json:"originDay"`
	Type      string   `json:"type"`
	Prompt    string   `json:"prompt"`
	Choices   []string `json:"choices,omitempty"`
	Answer    string   `json:"answer,omitempty"`
}

type EoschoolMedia struct {
	ID   string `json:"id,omitempty"`
	Path string `json:"path"`
	Alt  string `json:"alt,omitempty"`
}

func eoschoolNormalizeSubject(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "LT" || raw == "lt" {
		return "LT"
	}
	return strings.ToLower(raw)
}

func eoschoolSubjectOK(subject string) bool {
	_, ok := eoschoolSubjectSet[subject]
	return ok
}

func eoschoolExpectedQuizCount(day int) int {
	// Days 1–3: 8 MCQ per day accumulated.
	// Day 4: 32 MCQ + 4 write. Day 5: 40 MCQ + 12 write.
	switch day {
	case 4:
		return 36
	case 5:
		return 52
	default:
		return 8 * day
	}
}

func validateEoschoolDocument(doc *EoschoolDocument) error {
	if doc == nil {
		return fmt.Errorf("document required")
	}
	if doc.Format != eoschoolFormatName {
		return fmt.Errorf("format must be eoschool")
	}
	if doc.Version != eoschoolVersion {
		return fmt.Errorf("version must be %d", eoschoolVersion)
	}
	if doc.Cycle < 1 || doc.Cycle > 3 {
		return fmt.Errorf("cycle must be 1–3")
	}
	if doc.Week < 1 || doc.Week > 24 {
		return fmt.Errorf("week must be 1–24")
	}
	if doc.Day < 1 || doc.Day > 5 {
		return fmt.Errorf("day must be 1–5")
	}
	if doc.Level != eoschoolLevelV1 {
		return fmt.Errorf("level must be %d in method v1", eoschoolLevelV1)
	}
	doc.Subject = eoschoolNormalizeSubject(doc.Subject)
	if !eoschoolSubjectOK(doc.Subject) {
		return fmt.Errorf("subject must be one of the 12 method v1 codes")
	}
	doc.Title = strings.TrimSpace(doc.Title)
	if doc.Title == "" {
		return fmt.Errorf("title required")
	}
	doc.Locale = strings.TrimSpace(doc.Locale)
	if doc.Locale == "" {
		doc.Locale = "es"
	}
	doc.SupportURL = strings.TrimSpace(doc.SupportURL)
	if doc.SupportURL != "" {
		lower := strings.ToLower(doc.SupportURL)
		if !strings.HasPrefix(lower, "https://") && !strings.HasPrefix(lower, "http://") {
			return fmt.Errorf("supportUrl must be http(s)")
		}
		if len(doc.SupportURL) > 2000 {
			return fmt.Errorf("supportUrl too long")
		}
	}

	wantCount := eoschoolExpectedQuizCount(doc.Day)
	if doc.Quiz.QuestionCount != wantCount {
		return fmt.Errorf("quiz.questionCount must be %d for day %d", wantCount, doc.Day)
	}
	if len(doc.Quiz.Questions) != wantCount {
		return fmt.Errorf("quiz.questions length must be %d", wantCount)
	}

	kind := strings.TrimSpace(strings.ToLower(doc.Lesson.Kind))
	doc.Lesson.Kind = kind

	switch doc.Day {
	case 1:
		if kind != eoschoolKindIntro {
			return fmt.Errorf("day 1 lesson.kind must be intro")
		}
		if doc.Lesson.FocusPoint != nil {
			return fmt.Errorf("day 1 focusPoint must be null")
		}
		if len(doc.Lesson.Points) != 3 {
			return fmt.Errorf("day 1 requires exactly 3 points")
		}
		if strings.TrimSpace(doc.Lesson.Summary) == "" {
			return fmt.Errorf("day 1 summary required")
		}
	case 2, 3, 4:
		if kind != eoschoolKindDeepen {
			return fmt.Errorf("days 2–4 lesson.kind must be deepen")
		}
		wantFocus := doc.Day - 1
		if doc.Lesson.FocusPoint == nil || *doc.Lesson.FocusPoint != wantFocus {
			return fmt.Errorf("day %d focusPoint must be %d", doc.Day, wantFocus)
		}
		if len(doc.Lesson.Points) < 1 {
			return fmt.Errorf("deepen days require at least one point block")
		}
	case 5:
		if kind != eoschoolKindReview {
			return fmt.Errorf("day 5 lesson.kind must be review")
		}
		// pro = one project/week: day 5 is wrap/expo (often 1 block), not five panoramas.
		if strings.EqualFold(strings.TrimSpace(doc.Subject), "pro") {
			if len(doc.Lesson.Points) < 1 {
				return fmt.Errorf("pro day 5 requires at least one overview point")
			}
		} else if len(doc.Lesson.Points) != 5 {
			return fmt.Errorf("day 5 requires exactly 5 overview points")
		}
	}

	for i, p := range doc.Lesson.Points {
		if strings.TrimSpace(p.Heading) == "" && strings.TrimSpace(p.Body) == "" {
			return fmt.Errorf("lesson.points[%d] needs heading or body", i)
		}
		if strings.TrimSpace(p.ID) == "" {
			doc.Lesson.Points[i].ID = fmt.Sprintf("p%d", i+1)
		}
	}

	mcqN, writeN := 0, 0
	writeFrom4, writeFrom5 := 0, 0
	for i, q := range doc.Quiz.Questions {
		if strings.TrimSpace(q.Prompt) == "" {
			return fmt.Errorf("quiz.questions[%d].prompt required", i)
		}
		if q.OriginDay < 1 || q.OriginDay > doc.Day {
			return fmt.Errorf("quiz.questions[%d].originDay must be 1–%d", i, doc.Day)
		}
		typ := strings.TrimSpace(strings.ToLower(q.Type))
		doc.Quiz.Questions[i].Type = typ
		switch typ {
		case "mcq":
			mcqN++
			if len(q.Choices) < 2 {
				return fmt.Errorf("quiz.questions[%d].choices must have at least 2 options", i)
			}
		case "write":
			writeN++
			if q.OriginDay == 4 {
				writeFrom4++
			}
			if q.OriginDay == 5 {
				writeFrom5++
			}
		default:
			return fmt.Errorf("quiz.questions[%d].type must be mcq or write", i)
		}
		if strings.TrimSpace(q.ID) == "" {
			doc.Quiz.Questions[i].ID = fmt.Sprintf("d%d-q%d", q.OriginDay, i+1)
		}
	}
	switch doc.Day {
	case 1, 2, 3:
		if writeN != 0 || mcqN != wantCount {
			return fmt.Errorf("day %d requires %d mcq and 0 write", doc.Day, wantCount)
		}
	case 4:
		if mcqN != 32 || writeN != 4 || writeFrom4 != 4 {
			return fmt.Errorf("day 4 requires 32 mcq + 4 write (originDay 4)")
		}
	case 5:
		if mcqN != 40 || writeN != 12 || writeFrom4 != 4 || writeFrom5 != 8 {
			return fmt.Errorf("day 5 requires 40 mcq + 12 write (4 from day 4, 8 from day 5)")
		}
	}
	return nil
}

func parseEoschoolDocument(raw []byte) (EoschoolDocument, error) {
	var doc EoschoolDocument
	if err := json.Unmarshal(raw, &doc); err != nil {
		return EoschoolDocument{}, fmt.Errorf("invalid eoschool json")
	}
	if err := validateEoschoolDocument(&doc); err != nil {
		return EoschoolDocument{}, err
	}
	return doc, nil
}

func marshalEoschoolDocument(doc EoschoolDocument) ([]byte, error) {
	if err := validateEoschoolDocument(&doc); err != nil {
		return nil, err
	}
	return json.MarshalIndent(doc, "", "  ")
}

func homescoolEoschoolLogicKey(cycle, week, day, level int, subject string) string {
	return fmt.Sprintf("%d|%d|%d|%d|%s", cycle, week, day, level, eoschoolNormalizeSubject(subject))
}
