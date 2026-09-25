package main

import (
	"fmt"
	"strings"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

func buildEoschoolPDF(doc EoschoolDocument) ([]byte, error) {
	meta := fmt.Sprintf("Ciclo %d · Semana %d · Día %d · Nivel %d · %s",
		doc.Cycle, doc.Week, doc.Day, doc.Level, doc.Subject)

	var pages []pdf.EoschoolPrintPage
	if isMatTablesLayout(doc) {
		pages = append(pages, buildMatTablesPrintPages(doc)...)
	} else {
		pages = append(pages, buildLessonQuizPrintPages(doc)...)
	}

	return pdf.BuildEoschoolPDF(pdf.EoschoolPrintDoc{
		Title: doc.Title,
		Meta:  meta,
		Pages: pages,
	})
}

func isMatTablesLayout(doc EoschoolDocument) bool {
	// Week 1: tables 1–12. Week 2: tables 5–16.
	subj := strings.EqualFold(strings.TrimSpace(doc.Subject), "mat")
	return subj && (doc.Week == 1 || doc.Week == 2)
}

func buildLessonQuizPrintPages(doc EoschoolDocument) []pdf.EoschoolPrintPage {
	pages := make([]pdf.EoschoolPrintPage, 0, 1+len(doc.Quiz.Questions)/8+1)

	lessonLines := make([]string, 0, len(doc.Lesson.Points)*4+4)
	if doc.Lesson.Kind == eoschoolKindDeepen && doc.Lesson.FocusPoint != nil {
		lessonLines = append(lessonLines,
			fmt.Sprintf("Profundización · punto %d", *doc.Lesson.FocusPoint),
			"",
		)
	}
	for _, p := range doc.Lesson.Points {
		h := strings.TrimSpace(p.Heading)
		b := strings.TrimSpace(p.Body)
		if h != "" {
			lessonLines = append(lessonLines, h)
		}
		if b != "" {
			lessonLines = append(lessonLines, formatRichLessonLines(b)...)
		}
		lessonLines = append(lessonLines, "")
	}
	if s := strings.TrimSpace(doc.Lesson.Summary); s != "" {
		lessonLines = append(lessonLines, "Resumen", s)
	}

	const questionsPerPage = 16
	inline := inlineQuizPrintCapacity(doc)
	if inline > len(doc.Quiz.Questions) {
		inline = len(doc.Quiz.Questions)
	}

	if inline > 0 {
		lines := append([]string{}, lessonLines...)
		lines = append(lines, "")
		lines = append(lines, fmt.Sprintf("Cuestionario — %d preguntas (días 1–%d) · 1–%d",
			doc.Quiz.QuestionCount, doc.Day, inline))
		lines = append(lines, "")
		lines = append(lines, formatQuizLines(doc.Quiz.Questions[:inline], 1)...)
		pages = append(pages, pdf.EoschoolPrintPage{
			Heading: "Clase + cuestionario · " + doc.Lesson.Kind,
			Lines:   lines,
		})
	} else {
		pages = append(pages, pdf.EoschoolPrintPage{
			Heading: "Clase · " + doc.Lesson.Kind,
			Lines:   lessonLines,
		})
	}

	for i := inline; i < len(doc.Quiz.Questions); i += questionsPerPage {
		end := i + questionsPerPage
		if end > len(doc.Quiz.Questions) {
			end = len(doc.Quiz.Questions)
		}
		pages = append(pages, pdf.EoschoolPrintPage{
			Heading: fmt.Sprintf("Cuestionario — %d preguntas (días 1–%d) · %d–%d",
				doc.Quiz.QuestionCount, doc.Day, i+1, end),
			Lines: formatQuizLines(doc.Quiz.Questions[i:end], i+1),
		})
	}
	return pages
}

// formatRichLessonLines splits a lesson body into labeled sections for the PDF
// (mirrors the FE box/card layout in plain text).
func formatRichLessonLines(body string) []string {
	parts := strings.Split(body, "\n\n")
	out := make([]string, 0, len(parts)*2)
	for i, raw := range parts {
		p := strings.TrimSpace(raw)
		if p == "" {
			continue
		}
		label := ""
		switch {
		case i == 0:
			label = "▸ Idea central"
		case hasLessonPrefix(p, "Error a corregir", "Error to fix", "Error común", "Error:"):
			label = "▸ Error a corregir"
		case hasLessonPrefix(p, "Práctica", "Ejercicio", "Practice", "Class practice", "Método", "Method:"):
			label = "▸ Práctica"
		case hasLessonPrefix(p, "Consejo", "Tip", "Detalle útil", "Señal", "Nota", "Atención:"):
			label = "▸ Consejo"
		case hasLessonPrefix(p, "Meta", "Goal", "Criterio de éxito"):
			label = "▸ Meta"
		case strings.Contains(strings.ToLower(p), "frente a") ||
			strings.Contains(strings.ToLower(p), " vs ") ||
			strings.Contains(p, "↔"):
			label = "▸ Contraste"
		default:
			label = "▸ Explora"
		}
		out = append(out, label, p, "")
	}
	return out
}

func hasLessonPrefix(text string, prefixes ...string) bool {
	lower := strings.ToLower(strings.TrimSpace(text))
	for _, p := range prefixes {
		if strings.HasPrefix(lower, strings.ToLower(p)) {
			return true
		}
	}
	return false
}

// inlineQuizPrintCapacity: short deepen/review sheets absorb the first quiz cards
// so accumulated questions do not force an empty new page.
func inlineQuizPrintCapacity(doc EoschoolDocument) int {
	switch doc.Lesson.Kind {
	case eoschoolKindDeepen:
		// Full letter deepen class; quiz on following pages (matches FE).
		return 0
	case eoschoolKindReview:
		chars := 0
		for _, p := range doc.Lesson.Points {
			chars += len(p.Heading) + len(p.Body)
		}
		if chars < 1800 {
			return 4
		}
		return 0
	default:
		return 0
	}
}

func formatQuizLines(questions []EoschoolQuestion, startIndex int) []string {
	lines := make([]string, 0, len(questions)*3)
	for j, q := range questions {
		n := startIndex + j
		lines = append(lines, fmt.Sprintf("%d. %s", n, strings.TrimSpace(q.Prompt)))
		typ := strings.ToLower(strings.TrimSpace(q.Type))
		switch typ {
		case "write":
			lines = append(lines, "   _______________________________________________")
			lines = append(lines, "   _______________________________________________")
		case "crossword":
			if q.Crossword != nil {
				lines = append(lines, fmt.Sprintf("   [crucigrama %d×%d]", q.Crossword.Rows, q.Crossword.Cols))
				for _, c := range q.Crossword.CluesAcross {
					lines = append(lines, fmt.Sprintf("   → %d. %s", c.Num, strings.TrimSpace(c.Clue)))
				}
				for _, c := range q.Crossword.CluesDown {
					lines = append(lines, fmt.Sprintf("   ↓ %d. %s", c.Num, strings.TrimSpace(c.Clue)))
				}
			} else {
				lines = append(lines, "   [crucigrama]")
			}
		case "wordsearch":
			if q.Wordsearch != nil {
				rows := len(q.Wordsearch.Grid)
				cols := 0
				if rows > 0 {
					cols = len(q.Wordsearch.Grid[0])
				}
				lines = append(lines, fmt.Sprintf("   [sopa de letras %d×%d]", rows, cols))
				if len(q.Wordsearch.Words) > 0 {
					lines = append(lines, "   Palabras: "+strings.Join(q.Wordsearch.Words, ", "))
				}
			} else {
				lines = append(lines, "   [sopa de letras]")
			}
		case "match":
			if q.Match != nil {
				lines = append(lines, "   [emparejar]")
				for i := range q.Match.Left {
					right := ""
					if i < len(q.Match.Right) {
						right = q.Match.Right[i]
					}
					lines = append(lines, fmt.Sprintf("   %d) %s  ↔  %s", i+1, strings.TrimSpace(q.Match.Left[i]), strings.TrimSpace(right)))
				}
			} else {
				lines = append(lines, "   [emparejar]")
			}
		case "draw_image":
			mid := ""
			if q.DrawImage != nil {
				mid = strings.TrimSpace(q.DrawImage.MediaID)
			}
			if mid != "" {
				lines = append(lines, fmt.Sprintf("   [dibuja sobre imagen: %s]", mid))
			} else {
				lines = append(lines, "   [dibuja sobre imagen]")
			}
		case "draw_box":
			h := 8.0
			if q.DrawBox != nil && q.DrawBox.HeightCm > 0 {
				h = q.DrawBox.HeightCm
			}
			lines = append(lines, fmt.Sprintf("   [dibuja en recuadro · %.1f cm]", h))
		case "grid_mark":
			if q.GridMark != nil {
				lines = append(lines, fmt.Sprintf("   [retícula %d×%d — marca casillas]", q.GridMark.Cols, q.GridMark.Rows))
			} else {
				lines = append(lines, "   [retícula — marca casillas]")
			}
		default:
			if len(q.Choices) > 0 {
				letters := []string{"A", "B", "C", "D", "E", "F"}
				parts := make([]string, 0, len(q.Choices))
				for ci, c := range q.Choices {
					mark := letters[ci]
					if ci >= len(letters) {
						mark = fmt.Sprintf("%d", ci+1)
					}
					parts = append(parts, fmt.Sprintf("%s) %s", mark, strings.TrimSpace(c)))
				}
				lines = append(lines, "   "+strings.Join(parts, "   "))
			}
		}
		lines = append(lines, "")
	}
	return lines
}

type matLevel struct {
	label  string
	tables []int
}

func matLevelsForWeek(week int) []matLevel {
	if week == 2 {
		return []matLevel{
			{label: "nivel 1", tables: []int{5, 6, 7, 8}},
			{label: "nivel 2", tables: []int{9, 10, 11, 12}},
			{label: "nivel 3", tables: []int{13, 14, 15, 16}},
		}
	}
	return []matLevel{
		{label: "nivel 1", tables: []int{1, 2, 3, 4}},
		{label: "nivel 2", tables: []int{5, 6, 7, 8}},
		{label: "nivel 3", tables: []int{9, 10, 11, 12}},
	}
}

func matPracticeDensity(day int) int {
	switch {
	case day <= 1:
		return 3
	case day == 2:
		return 6
	case day == 3:
		return 9
	default:
		return 12
	}
}

func buildMatTablesPrintPages(doc EoschoolDocument) []pdf.EoschoolPrintPage {
	density := matPracticeDensity(doc.Day)
	task := "Leer o cantar en voz alta: una vez el nivel 1 (tablas del 1 al 4); dos veces el nivel 2 (tablas del 5 al 8); tres veces el nivel 3 (tablas del 9 al 12)."
	if doc.Week == 2 {
		task = "Leer o cantar en voz alta: una vez el nivel 1 (tablas del 5 al 8); dos veces el nivel 2 (tablas del 9 al 12); tres veces el nivel 3 (tablas del 13 al 16)."
	}
	if doc.Day > 1 {
		task = fmt.Sprintf("%s Día %d: en la hoja 2 practica %d productos por tabla (espacios en blanco).", task, doc.Day, density)
	}

	readLines := []string{task, "", "Hoja 1 · leer/cantar", ""}
	readLines = append(readLines, matModeLines(doc, "read", 12)...)

	practiceLines := []string{task, "", fmt.Sprintf("Hoja 2 · practicar (%d productos por tabla)", density), ""}
	practiceLines = append(practiceLines, matModeLines(doc, "practice", density)...)

	return []pdf.EoschoolPrintPage{
		{Heading: "Tablas · leer/cantar", Lines: readLines},
		{Heading: "Tablas · practicar", Lines: practiceLines},
	}
}

func matModeLines(doc EoschoolDocument, mode string, density int) []string {
	lines := make([]string, 0, 80)
	for _, level := range matLevelsForWeek(doc.Week) {
		lines = append(lines, level.label)
		for _, factor := range level.tables {
			mults := pickMatMultipliers(doc.Day, factor, mode, density)
			parts := make([]string, 0, len(mults))
			for _, m := range mults {
				if mode == "read" {
					parts = append(parts, fmt.Sprintf("%dx%d=%d", factor, m, factor*m))
				} else {
					parts = append(parts, fmt.Sprintf("%dx%d=____", factor, m))
				}
			}
			lines = append(lines, fmt.Sprintf("  x%d: %s", factor, strings.Join(parts, "  ")))
		}
		lines = append(lines, "")
	}
	return lines
}

func pickMatMultipliers(day, factor int, mode string, density int) []int {
	all := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
	if mode == "read" {
		return all
	}
	seed := day*1009 + factor*17 + 42
	shuffled := seededShuffleInts(all, seed)
	if density > len(shuffled) {
		density = len(shuffled)
	}
	picked := append([]int(nil), shuffled[:density]...)
	// Ascending for scanability (same as frontend).
	for i := 0; i < len(picked); i++ {
		for j := i + 1; j < len(picked); j++ {
			if picked[j] < picked[i] {
				picked[i], picked[j] = picked[j], picked[i]
			}
		}
	}
	return picked
}

func seededShuffleInts(items []int, seed int) []int {
	arr := append([]int(nil), items...)
	s := uint32(seed)
	for i := len(arr) - 1; i > 0; i-- {
		s = s*1664525 + 1013904223
		j := int(s % uint32(i+1))
		arr[i], arr[j] = arr[j], arr[i]
	}
	return arr
}
