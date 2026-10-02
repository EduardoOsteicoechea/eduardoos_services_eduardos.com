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
	// MPPE lists grade-3 aprendizajes esperados this class imbues (ids from mppe-grade3-checklist.json).
	MPPE *EoschoolMPPE `json:"mppe,omitempty"`
}

// EoschoolMPPE declares which MPPE Venezuela objectives this cell fulfills.
type EoschoolMPPE struct {
	Objectives []EoschoolMPPEObjective `json:"objectives"`
}

type EoschoolMPPEObjective struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

type EoschoolLesson struct {
	Kind          string          `json:"kind"`
	FocusPoint    *int            `json:"focusPoint"`
	Points        []EoschoolPoint `json:"points"`
	Summary       string          `json:"summary,omitempty"`
	WeekRecap     string          `json:"weekRecap,omitempty"`
	PriorDayRecap string          `json:"priorDayRecap,omitempty"`
	MemoryPhrase  string          `json:"memoryPhrase,omitempty"`
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
	ID         string              `json:"id"`
	OriginDay  int                 `json:"originDay"`
	Type       string              `json:"type"`
	Prompt     string              `json:"prompt"`
	Choices    []string            `json:"choices,omitempty"`
	Answer     string              `json:"answer,omitempty"`
	Schematic  bool                `json:"schematic,omitempty"`
	Crossword  *EoschoolCrossword  `json:"crossword,omitempty"`
	Wordsearch *EoschoolWordsearch `json:"wordsearch,omitempty"`
	Match      *EoschoolMatch      `json:"match,omitempty"`
	DrawImage  *EoschoolDrawImage  `json:"drawImage,omitempty"`
	DrawBox    *EoschoolDrawBox    `json:"drawBox,omitempty"`
	GridMark   *EoschoolGridMark   `json:"gridMark,omitempty"`
}

type EoschoolClue struct {
	Num  int    `json:"num"`
	Clue string `json:"clue"`
}

type EoschoolCrossword struct {
	Rows        int            `json:"rows"`
	Cols        int            `json:"cols"`
	Grid        [][]string     `json:"grid"`
	CluesAcross []EoschoolClue `json:"cluesAcross"`
	CluesDown   []EoschoolClue `json:"cluesDown"`
}

type EoschoolWordsearch struct {
	Grid  [][]string `json:"grid"`
	Words []string   `json:"words"`
}

type EoschoolMatch struct {
	Left  []string `json:"left"`
	Right []string `json:"right"`
}

type EoschoolDrawImage struct {
	MediaID string `json:"mediaId"`
}

type EoschoolDrawBox struct {
	HeightCm float64 `json:"heightCm,omitempty"`
}

type EoschoolGridMark struct {
	Cols int `json:"cols"`
	Rows int `json:"rows"`
}

type EoschoolMedia struct {
	ID   string `json:"id,omitempty"`
	Path string `json:"path"`
	Alt  string `json:"alt,omitempty"`
}

const (
	eoschoolMaxGridDim   = 20
	eoschoolMaxWords     = 40
	eoschoolMinMatch     = 3
	eoschoolMaxMatch     = 12
	eoschoolMinGridMark  = 2
	eoschoolMaxGridMark  = 16
)

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

// Quiz size bounds. The Letter sheet fits up to 12 items (8 mcq + 2 write +
// 2 schematic); when blank lines between questions do not fit, the generator
// drops questions but always keeps the minimum mix (see validateEoschoolLetterQuizMix).
const (
	eoschoolQuizMaxCount = 12
	eoschoolQuizMinCount = 4
)

func eoschoolMediaIDSet(media []EoschoolMedia) map[string]struct{} {
	out := make(map[string]struct{}, len(media))
	for _, m := range media {
		id := strings.TrimSpace(m.ID)
		if id != "" {
			out[id] = struct{}{}
		}
	}
	return out
}

func validateEoschoolGrid(prefix string, grid [][]string, wantRows, wantCols int) error {
	if wantRows < 1 || wantCols < 1 || wantRows > eoschoolMaxGridDim || wantCols > eoschoolMaxGridDim {
		return fmt.Errorf("%s rows/cols must be 1–%d", prefix, eoschoolMaxGridDim)
	}
	if len(grid) != wantRows {
		return fmt.Errorf("%s grid must have %d rows", prefix, wantRows)
	}
	for r, row := range grid {
		if len(row) != wantCols {
			return fmt.Errorf("%s grid[%d] must have %d cols", prefix, r, wantCols)
		}
	}
	return nil
}

func validateEoschoolClues(prefix string, clues []EoschoolClue) error {
	if len(clues) < 1 {
		return fmt.Errorf("%s needs at least one clue", prefix)
	}
	for i, c := range clues {
		if c.Num < 1 {
			return fmt.Errorf("%s[%d].num must be ≥ 1", prefix, i)
		}
		if strings.TrimSpace(c.Clue) == "" {
			return fmt.Errorf("%s[%d].clue required", prefix, i)
		}
	}
	return nil
}

func validateEoschoolQuestionPayload(i int, q *EoschoolQuestion, mediaIDs map[string]struct{}) error {
	prefix := fmt.Sprintf("quiz.questions[%d]", i)
	switch q.Type {
	case "mcq":
		if len(q.Choices) < 2 {
			return fmt.Errorf("%s.choices must have at least 2 options", prefix)
		}
	case "write":
		// prompt only
	case "crossword":
		if q.Crossword == nil {
			return fmt.Errorf("%s.crossword required", prefix)
		}
		cw := q.Crossword
		if err := validateEoschoolGrid(prefix+".crossword", cw.Grid, cw.Rows, cw.Cols); err != nil {
			return err
		}
		if err := validateEoschoolClues(prefix+".crossword.cluesAcross", cw.CluesAcross); err != nil {
			return err
		}
		if err := validateEoschoolClues(prefix+".crossword.cluesDown", cw.CluesDown); err != nil {
			return err
		}
	case "wordsearch":
		if q.Wordsearch == nil {
			return fmt.Errorf("%s.wordsearch required", prefix)
		}
		ws := q.Wordsearch
		rows := len(ws.Grid)
		if rows < 1 {
			return fmt.Errorf("%s.wordsearch.grid required", prefix)
		}
		cols := len(ws.Grid[0])
		if err := validateEoschoolGrid(prefix+".wordsearch", ws.Grid, rows, cols); err != nil {
			return err
		}
		if len(ws.Words) < 1 || len(ws.Words) > eoschoolMaxWords {
			return fmt.Errorf("%s.wordsearch.words must have 1–%d entries", prefix, eoschoolMaxWords)
		}
		for wi, w := range ws.Words {
			if strings.TrimSpace(w) == "" {
				return fmt.Errorf("%s.wordsearch.words[%d] required", prefix, wi)
			}
		}
	case "match":
		if q.Match == nil {
			return fmt.Errorf("%s.match required", prefix)
		}
		m := q.Match
		n := len(m.Left)
		if n < eoschoolMinMatch || n > eoschoolMaxMatch {
			return fmt.Errorf("%s.match.left must have %d–%d items", prefix, eoschoolMinMatch, eoschoolMaxMatch)
		}
		if len(m.Right) != n {
			return fmt.Errorf("%s.match.right length must equal left", prefix)
		}
		for j := 0; j < n; j++ {
			if strings.TrimSpace(m.Left[j]) == "" {
				return fmt.Errorf("%s.match.left[%d] required", prefix, j)
			}
			if strings.TrimSpace(m.Right[j]) == "" {
				return fmt.Errorf("%s.match.right[%d] required", prefix, j)
			}
		}
	case "draw_image":
		if q.DrawImage == nil || strings.TrimSpace(q.DrawImage.MediaID) == "" {
			return fmt.Errorf("%s.drawImage.mediaId required", prefix)
		}
		mid := strings.TrimSpace(q.DrawImage.MediaID)
		q.DrawImage.MediaID = mid
		if _, ok := mediaIDs[mid]; !ok {
			return fmt.Errorf("%s.drawImage.mediaId %q not found in media", prefix, mid)
		}
	case "draw_box":
		if q.DrawBox != nil && q.DrawBox.HeightCm < 0 {
			return fmt.Errorf("%s.drawBox.heightCm must be ≥ 0", prefix)
		}
	case "grid_mark":
		if q.GridMark == nil {
			return fmt.Errorf("%s.gridMark required", prefix)
		}
		gm := q.GridMark
		if gm.Cols < eoschoolMinGridMark || gm.Cols > eoschoolMaxGridMark ||
			gm.Rows < eoschoolMinGridMark || gm.Rows > eoschoolMaxGridMark {
			return fmt.Errorf("%s.gridMark cols/rows must be %d–%d", prefix, eoschoolMinGridMark, eoschoolMaxGridMark)
		}
	default:
		return fmt.Errorf("%s.type must be mcq, write, crossword, wordsearch, match, draw_image, draw_box, or grid_mark", prefix)
	}
	return nil
}

// Letter quiz (ask-first sheets): up to 12 questions (8 mcq + 2 write + 2 schematic).
// When the sheet cannot fit them with blank lines between questions, questions are
// dropped, but every quiz keeps at least 2 selection (mcq) and 2 write items
// (1 schematic + 1 written reflection in new content). Review mcq
// (originDay < day) are allowed, not required.
func validateEoschoolLetterQuizMix(doc *EoschoolDocument) error {
	mcq, schematic, reflection := 0, 0, 0
	for i, q := range doc.Quiz.Questions {
		typ := strings.TrimSpace(strings.ToLower(q.Type))
		switch typ {
		case "mcq":
			if q.OriginDay < 1 || q.OriginDay > doc.Day {
				return fmt.Errorf("quiz.questions[%d].originDay must be 1–%d for letter-quiz mcq", i, doc.Day)
			}
			mcq++
		case "write":
			if q.OriginDay != doc.Day {
				return fmt.Errorf("quiz.questions[%d].originDay must be %d for letter-quiz write", i, doc.Day)
			}
			if q.Schematic {
				schematic++
			} else {
				reflection++
			}
		default:
			return fmt.Errorf("quiz.questions[%d].type must be mcq or write for letter quiz", i)
		}
	}
	if mcq < 2 {
		return fmt.Errorf("letter quiz needs at least 2 mcq, got %d", mcq)
	}
	// Schematic vs reflection split is enforced by the content audit
	// (scripts/audit-homescool-v2-review.mjs). Legacy stored materials have no
	// "schematic" flag, so the server only requires at least two write items.
	if schematic+reflection < 2 {
		return fmt.Errorf("letter quiz needs at least 2 write questions (schematic + reflection), got %d", schematic+reflection)
	}
	return nil
}

func validateEoschoolMPPE(mppe *EoschoolMPPE) error {
	if mppe == nil {
		return nil
	}
	if mppe.Objectives == nil {
		mppe.Objectives = []EoschoolMPPEObjective{}
	}
	if len(mppe.Objectives) > 24 {
		return fmt.Errorf("mppe.objectives: at most 24 items")
	}
	seen := map[string]struct{}{}
	for i := range mppe.Objectives {
		o := &mppe.Objectives[i]
		o.ID = strings.TrimSpace(o.ID)
		o.Label = strings.TrimSpace(o.Label)
		if o.ID == "" {
			return fmt.Errorf("mppe.objectives[%d].id required", i)
		}
		if len(o.ID) > 64 {
			return fmt.Errorf("mppe.objectives[%d].id too long", i)
		}
		if o.Label == "" {
			return fmt.Errorf("mppe.objectives[%d].label required", i)
		}
		if len(o.Label) > 280 {
			return fmt.Errorf("mppe.objectives[%d].label too long", i)
		}
		if _, ok := seen[o.ID]; ok {
			return fmt.Errorf("mppe.objectives[%d].id duplicated", i)
		}
		seen[o.ID] = struct{}{}
	}
	return nil
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
	if err := validateEoschoolMPPE(doc.MPPE); err != nil {
		return err
	}

	n := len(doc.Quiz.Questions)
	if n < eoschoolQuizMinCount || n > eoschoolQuizMaxCount {
		return fmt.Errorf("quiz.questions length must be %d–%d", eoschoolQuizMinCount, eoschoolQuizMaxCount)
	}
	if doc.Quiz.QuestionCount != n {
		return fmt.Errorf("quiz.questionCount must equal quiz.questions length (%d)", n)
	}
	if err := validateEoschoolLetterQuizMix(doc); err != nil {
		return err
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
		if len(doc.Lesson.Points) < 3 {
			return fmt.Errorf("day 1 requires at least 3 points")
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
		// pro = one project/week: day 5 is wrap/expo (often 1 block). Ask-first sheets
		// (Punto 1 = repaso de ayer + Punto 2..N) carry 5+ overview points.
		if strings.EqualFold(strings.TrimSpace(doc.Subject), "pro") {
			if len(doc.Lesson.Points) < 1 {
				return fmt.Errorf("pro day 5 requires at least one overview point")
			}
		} else if len(doc.Lesson.Points) < 5 {
			return fmt.Errorf("day 5 requires at least 5 overview points")
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

	mediaIDs := eoschoolMediaIDSet(doc.Media)
	for i := range doc.Quiz.Questions {
		q := &doc.Quiz.Questions[i]
		if strings.TrimSpace(q.Prompt) == "" {
			return fmt.Errorf("quiz.questions[%d].prompt required", i)
		}
		if q.OriginDay < 1 || q.OriginDay > doc.Day {
			return fmt.Errorf("quiz.questions[%d].originDay must be 1–%d", i, doc.Day)
		}
		q.Type = strings.TrimSpace(strings.ToLower(q.Type))
		if err := validateEoschoolQuestionPayload(i, q, mediaIDs); err != nil {
			return err
		}
		if strings.TrimSpace(q.ID) == "" {
			q.ID = fmt.Sprintf("d%d-q%d", q.OriginDay, i+1)
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
