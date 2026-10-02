package main

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	homescoolRevisionOCRSystem = `You read filled Homescool / eoschool quiz worksheets (US Letter).
Extract the student's marked multiple-choice answers and handwritten text for the write questions.
Return ONLY a single JSON object (no markdown fences) with this exact shape:
{"mcq":[{"n":1,"selectedKey":"A","selectedText":"...","illegible":false}],"write":[{"n":1,"text":"...","illegible":false}]}
Rules:
- mcq: exactly 8 items, n=1..8. selectedKey is A, B, C, D, or ? if unclear.
- selectedText is the option text you see marked (circle/cross/underline), or empty if illegible.
- write: exactly 4 items, n=1..4. text is the handwritten answer (Spanish/English as written).
- Set illegible true when you cannot read a mark or handwriting.
- Do not invent answers that are not visible on the page(s).`

	homescoolRevisionMCQCount   = 8
	homescoolRevisionWriteCount = 4

	homescoolRevisionMaxDocJSON = 400 << 10
)

var homescoolRevisionJSONFence = regexp.MustCompile("(?s)```(?:json)?\\s*(.*?)\\s*```")

type homescoolRevisionMCQExtract struct {
	N            int    `json:"n"`
	SelectedKey  string `json:"selectedKey"`
	SelectedText string `json:"selectedText"`
	Illegible    bool   `json:"illegible"`
}

type homescoolRevisionWriteExtract struct {
	N         int    `json:"n"`
	Text      string `json:"text"`
	Illegible bool   `json:"illegible"`
}

type homescoolRevisionExtraction struct {
	MCQ   []homescoolRevisionMCQExtract   `json:"mcq"`
	Write []homescoolRevisionWriteExtract `json:"write"`
}

type homescoolRevisionMCQScore struct {
	N            int    `json:"n"`
	Prompt       string `json:"prompt"`
	Expected     string `json:"expected"`
	SelectedKey  string `json:"selectedKey"`
	SelectedText string `json:"selectedText"`
	Correct      bool   `json:"correct"`
	Illegible    bool   `json:"illegible"`
}

type homescoolRevisionWriteScore struct {
	N         int    `json:"n"`
	Prompt    string `json:"prompt"`
	Text      string `json:"text"`
	Illegible bool   `json:"illegible"`
}

type homescoolRevisionScoring struct {
	MCQCorrect int                         `json:"mcqCorrect"`
	MCQTotal   int                         `json:"mcqTotal"`
	MCQ        []homescoolRevisionMCQScore `json:"mcq"`
	Write      []homescoolRevisionWriteScore `json:"write"`
}

func normalizeHomescoolRevisionChoiceKey(raw string) string {
	s := strings.ToUpper(strings.TrimSpace(raw))
	if s == "" || s == "?" {
		return "?"
	}
	if len(s) >= 1 {
		r := rune(s[0])
		if r >= 'A' && r <= 'D' {
			return string(r)
		}
	}
	return "?"
}

func normalizeHomescoolRevisionCompare(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	var b strings.Builder
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func parseHomescoolRevisionExtraction(raw string) (homescoolRevisionExtraction, error) {
	text := strings.TrimSpace(raw)
	if m := homescoolRevisionJSONFence.FindStringSubmatch(text); len(m) == 2 {
		text = strings.TrimSpace(m[1])
	}
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start < 0 || end <= start {
		return homescoolRevisionExtraction{}, fmt.Errorf("no json object")
	}
	text = text[start : end+1]
	var out homescoolRevisionExtraction
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		return homescoolRevisionExtraction{}, err
	}
	out = sanitizeHomescoolRevisionExtraction(out)
	return out, nil
}

func sanitizeHomescoolRevisionExtraction(in homescoolRevisionExtraction) homescoolRevisionExtraction {
	mcqByN := map[int]homescoolRevisionMCQExtract{}
	for _, item := range in.MCQ {
		if item.N < 1 || item.N > homescoolRevisionMCQCount {
			continue
		}
		item.SelectedKey = normalizeHomescoolRevisionChoiceKey(item.SelectedKey)
		item.SelectedText = sanitizeModelTextMax(item.SelectedText, 400)
		mcqByN[item.N] = item
	}
	writeByN := map[int]homescoolRevisionWriteExtract{}
	for _, item := range in.Write {
		if item.N < 1 || item.N > homescoolRevisionWriteCount {
			continue
		}
		item.Text = sanitizeModelTextMax(item.Text, 2000)
		writeByN[item.N] = item
	}
	out := homescoolRevisionExtraction{
		MCQ:   make([]homescoolRevisionMCQExtract, 0, homescoolRevisionMCQCount),
		Write: make([]homescoolRevisionWriteExtract, 0, homescoolRevisionWriteCount),
	}
	for n := 1; n <= homescoolRevisionMCQCount; n++ {
		if item, ok := mcqByN[n]; ok {
			out.MCQ = append(out.MCQ, item)
			continue
		}
		out.MCQ = append(out.MCQ, homescoolRevisionMCQExtract{N: n, SelectedKey: "?", Illegible: true})
	}
	for n := 1; n <= homescoolRevisionWriteCount; n++ {
		if item, ok := writeByN[n]; ok {
			out.Write = append(out.Write, item)
			continue
		}
		out.Write = append(out.Write, homescoolRevisionWriteExtract{N: n, Illegible: true})
	}
	return out
}

func scoreHomescoolRevision(doc EoschoolDocument, extraction homescoolRevisionExtraction) homescoolRevisionScoring {
	mcqQs := make([]EoschoolQuestion, 0, homescoolRevisionMCQCount)
	writeQs := make([]EoschoolQuestion, 0, homescoolRevisionWriteCount)
	for _, q := range doc.Quiz.Questions {
		switch strings.ToLower(strings.TrimSpace(q.Type)) {
		case "mcq":
			mcqQs = append(mcqQs, q)
		case "write":
			writeQs = append(writeQs, q)
		}
	}
	out := homescoolRevisionScoring{
		MCQ:   make([]homescoolRevisionMCQScore, 0, homescoolRevisionMCQCount),
		Write: make([]homescoolRevisionWriteScore, 0, homescoolRevisionWriteCount),
	}
	for i := 0; i < homescoolRevisionMCQCount; i++ {
		ext := extraction.MCQ[i]
		row := homescoolRevisionMCQScore{
			N:            ext.N,
			SelectedKey:  ext.SelectedKey,
			SelectedText: ext.SelectedText,
			Illegible:    ext.Illegible,
		}
		if i < len(mcqQs) {
			q := mcqQs[i]
			row.Prompt = q.Prompt
			row.Expected = q.Answer
			row.Correct = homescoolRevisionMCQMatch(q, ext)
		}
		if row.Correct {
			out.MCQCorrect++
		}
		out.MCQ = append(out.MCQ, row)
	}
	out.MCQTotal = homescoolRevisionMCQCount
	for i := 0; i < homescoolRevisionWriteCount; i++ {
		ext := extraction.Write[i]
		row := homescoolRevisionWriteScore{
			N:         ext.N,
			Text:      ext.Text,
			Illegible: ext.Illegible,
		}
		if i < len(writeQs) {
			row.Prompt = writeQs[i].Prompt
		}
		out.Write = append(out.Write, row)
	}
	return out
}

func homescoolRevisionMCQMatch(q EoschoolQuestion, ext homescoolRevisionMCQExtract) bool {
	if ext.Illegible {
		return false
	}
	expectedNorm := normalizeHomescoolRevisionCompare(q.Answer)
	if expectedNorm == "" {
		return false
	}
	if selected := normalizeHomescoolRevisionCompare(ext.SelectedText); selected != "" && selected == expectedNorm {
		return true
	}
	key := normalizeHomescoolRevisionChoiceKey(ext.SelectedKey)
	if key == "?" || len(q.Choices) == 0 {
		return false
	}
	idx := int(key[0] - 'A')
	if idx < 0 || idx >= len(q.Choices) {
		return false
	}
	return normalizeHomescoolRevisionCompare(q.Choices[idx]) == expectedNorm
}

func buildHomescoolRevisionVisionPrompt(doc EoschoolDocument) string {
	var b strings.Builder
	b.WriteString("Class: ")
	b.WriteString(fmt.Sprintf("cycle=%d week=%d day=%d subject=%s title=%q\n", doc.Cycle, doc.Week, doc.Day, doc.Subject, doc.Title))
	b.WriteString("Read the attached worksheet photo(s). Map marks to these numbered items.\n\n")
	mcqN := 0
	writeN := 0
	for _, q := range doc.Quiz.Questions {
		switch strings.ToLower(strings.TrimSpace(q.Type)) {
		case "mcq":
			mcqN++
			if mcqN > homescoolRevisionMCQCount {
				continue
			}
			b.WriteString(fmt.Sprintf("MCQ %d: %s\n", mcqN, strings.TrimSpace(q.Prompt)))
			for i, choice := range q.Choices {
				if i > 3 {
					break
				}
				b.WriteString(fmt.Sprintf("  %c) %s\n", 'A'+i, strings.TrimSpace(choice)))
			}
		case "write":
			writeN++
			if writeN > homescoolRevisionWriteCount {
				continue
			}
			b.WriteString(fmt.Sprintf("WRITE %d: %s\n", writeN, strings.TrimSpace(q.Prompt)))
		}
	}
	b.WriteString("\nReturn only the JSON object.")
	out := b.String()
	if utf8.RuneCountInString(out) > 8000 {
		out = string([]rune(out)[:8000])
	}
	return out
}

func homescoolRevisionCellKey(cycle, week, day int, subject string) string {
	return fmt.Sprintf("c%d-w%d-d%d-l%d-%s", cycle, week, day, eoschoolLevelV1, eoschoolNormalizeSubject(subject))
}
