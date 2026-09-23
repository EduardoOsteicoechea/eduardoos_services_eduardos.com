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

	lessonLines := make([]string, 0, len(doc.Lesson.Points)*2+2)
	for _, p := range doc.Lesson.Points {
		h := strings.TrimSpace(p.Heading)
		b := strings.TrimSpace(p.Body)
		if h != "" {
			lessonLines = append(lessonLines, h)
		}
		if b != "" {
			lessonLines = append(lessonLines, b)
		}
		lessonLines = append(lessonLines, "")
	}
	if s := strings.TrimSpace(doc.Lesson.Summary); s != "" {
		lessonLines = append(lessonLines, "Resumen", s)
	}
	pages = append(pages, pdf.EoschoolPrintPage{
		Heading: "Clase · " + doc.Lesson.Kind,
		Lines:   lessonLines,
	})

	const questionsPerPage = 7
	for i := 0; i < len(doc.Quiz.Questions); i += questionsPerPage {
		end := i + questionsPerPage
		if end > len(doc.Quiz.Questions) {
			end = len(doc.Quiz.Questions)
		}
		lines := make([]string, 0, (end-i)*3)
		for j, q := range doc.Quiz.Questions[i:end] {
			n := i + j + 1
			lines = append(lines, fmt.Sprintf("%d. %s", n, strings.TrimSpace(q.Prompt)))
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
			lines = append(lines, "")
		}
		pages = append(pages, pdf.EoschoolPrintPage{
			Heading: fmt.Sprintf("Cuestionario — %d preguntas (días 1–%d) · %d–%d",
				doc.Quiz.QuestionCount, doc.Day, i+1, end),
			Lines: lines,
		})
	}

	return pdf.BuildEoschoolPDF(pdf.EoschoolPrintDoc{
		Title: doc.Title,
		Meta:  meta,
		Pages: pages,
	})
}
