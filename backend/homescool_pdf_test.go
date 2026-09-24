package main

import (
	"strings"
	"testing"
)

func TestBuildEoschoolPDFMatWeek2(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Subject = "mat"
	doc.Week = 2
	doc.Day = 1
	doc.Title = "Tablas de multiplicar"
	raw, err := buildEoschoolPDF(doc)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(raw), "%PDF") {
		t.Fatal("missing PDF header")
	}
	if len(raw) < 400 {
		t.Fatalf("pdf too small: %d", len(raw))
	}
}

func TestMatPracticeDensity(t *testing.T) {
	if matPracticeDensity(1) != 3 {
		t.Fatalf("day1 dens=%d", matPracticeDensity(1))
	}
	if matPracticeDensity(4) != 12 {
		t.Fatalf("day4 dens=%d", matPracticeDensity(4))
	}
}

func TestIsMatTablesLayout(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Subject = "mat"
	doc.Week = 2
	if !isMatTablesLayout(doc) {
		t.Fatal("expected mat week2")
	}
	doc.Week = 1
	if !isMatTablesLayout(doc) {
		t.Fatal("week1 should use mat tables")
	}
	doc.Week = 3
	if isMatTablesLayout(doc) {
		t.Fatal("week3 should not use mat tables layout yet")
	}
}

func TestMatLevelsForWeek(t *testing.T) {
	w1 := matLevelsForWeek(1)
	w2 := matLevelsForWeek(2)
	if len(w1) != 3 || len(w2) != 3 {
		t.Fatalf("expected 3 levels")
	}
	if w1[0].tables[0] != 1 || w1[2].tables[3] != 12 {
		t.Fatalf("week1 range want 1..12 got %#v", w1)
	}
	if w2[0].tables[0] != 5 || w2[2].tables[3] != 16 {
		t.Fatalf("week2 range want 5..16 got %#v", w2)
	}
}

func TestInlineQuizPrintCapacityDeepen(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Day = 2
	doc.Lesson.Kind = eoschoolKindDeepen
	fp := 1
	doc.Lesson.FocusPoint = &fp
	doc.Lesson.Summary = ""
	doc.Lesson.Points = []EoschoolPoint{{ID: "p1", Heading: "Deep", Body: "Short deepen body."}}
	doc.Quiz.QuestionCount = 16
	doc.Quiz.Questions = append(append([]EoschoolQuestion{}, doc.Quiz.Questions...), doc.Quiz.Questions...)
	if got := inlineQuizPrintCapacity(doc); got != 0 {
		t.Fatalf("deepen inline=%d want 0", got)
	}
	pages := buildLessonQuizPrintPages(doc)
	if len(pages) < 2 {
		t.Fatalf("expected lesson + quiz pages, got %d", len(pages))
	}
	if strings.Contains(strings.ToLower(pages[0].Heading), "cuestionario") {
		t.Fatalf("first page should be lesson only, got %q", pages[0].Heading)
	}
	if !strings.Contains(strings.ToLower(pages[1].Heading), "cuestionario") {
		t.Fatalf("second page should be quiz, got %q", pages[1].Heading)
	}
}
