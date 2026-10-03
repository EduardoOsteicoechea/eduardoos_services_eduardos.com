package main

import "testing"

func TestValidateEoschoolDocumentDay1(t *testing.T) {
	doc := sampleEoschoolDay1()
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func TestValidateEoschoolDocumentRejectsNonLetterQuizTypes(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Media = []EoschoolMedia{{ID: "img1", Path: "/homescool/media/sample.png", Alt: "mapa"}}
	doc.Quiz.Questions[0] = EoschoolQuestion{
		ID: "cw", OriginDay: 1, Type: "crossword", Prompt: "Resuelve el crucigrama",
		Crossword: &EoschoolCrossword{
			Rows: 3, Cols: 3,
			Grid: [][]string{
				{"", ".", ""},
				{"", "", ""},
				{".", "", "."},
			},
			CluesAcross: []EoschoolClue{{Num: 1, Clue: "Horizontal"}},
			CluesDown:   []EoschoolClue{{Num: 2, Clue: "Vertical"}},
		},
	}
	if err := validateEoschoolDocument(&doc); err == nil {
		t.Fatal("expected letter-quiz type error")
	}
}

func TestValidateEoschoolDocumentRejectsIncompleteCrossword(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Quiz.Questions[0] = EoschoolQuestion{
		ID: "cw", OriginDay: 1, Type: "crossword", Prompt: "Crucigrama",
	}
	if err := validateEoschoolDocument(&doc); err == nil {
		t.Fatal("expected crossword payload error")
	}
}

func TestValidateEoschoolDocumentRejectsDrawImageWithoutMedia(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Media = []EoschoolMedia{{ID: "img1", Path: "/homescool/media/sample.png", Alt: "mapa"}}
	doc.Quiz.Questions[0] = EoschoolQuestion{
		ID: "di", OriginDay: 1, Type: "draw_image", Prompt: "Dibuja",
		DrawImage: &EoschoolDrawImage{MediaID: "missing"},
	}
	if err := validateEoschoolDocument(&doc); err == nil {
		t.Fatal("expected missing mediaId error")
	}
}

func TestValidateEoschoolDocumentDay1AllowsWrite(t *testing.T) {
	doc := sampleEoschoolDay1()
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func TestValidateEoschoolDocumentRejectsDay4And5(t *testing.T) {
	for _, day := range []int{4, 5} {
		doc := sampleEoschoolDay1()
		doc.Day = day
		doc.Lesson.Kind = eoschoolKindDeepen
		fp := day - 1
		doc.Lesson.FocusPoint = &fp
		doc.Lesson.Summary = ""
		doc.Lesson.Points = []EoschoolPoint{{ID: "p1", Heading: "h", Body: "b"}}
		fillLetterQuizDay(&doc, 1)
		if err := validateEoschoolDocument(&doc); err == nil {
			t.Fatalf("day %d must be rejected in method v3", day)
		}
	}
}

func TestValidateEoschoolDocumentProOnlyDay1(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Subject = "pro"
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
	doc.Day = 2
	doc.Lesson.Kind = eoschoolKindDeepen
	fp := 1
	doc.Lesson.FocusPoint = &fp
	doc.Lesson.Summary = ""
	doc.Lesson.Points = []EoschoolPoint{{ID: "p1", Heading: "h", Body: "b"}}
	fillLetterQuizDay(&doc, 2)
	if err := validateEoschoolDocument(&doc); err == nil {
		t.Fatal("pro day 2 must be rejected")
	}
}

func TestValidateEoschoolDocumentFinAllowsEmptySupportURL(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Subject = "fin"
	doc.SupportURL = ""
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func TestValidateEoschoolDocumentDay2Deepen(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Day = 2
	doc.Lesson.Kind = eoschoolKindDeepen
	fp := 1
	doc.Lesson.FocusPoint = &fp
	doc.Lesson.Summary = ""
	doc.Lesson.Points = []EoschoolPoint{{ID: "p1", Heading: "h", Body: "b"}}
	fillLetterQuizDay(&doc, 2)
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func TestValidateEoschoolDocumentWeek2Day1Sheet(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Week = 2
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func TestValidateEoschoolDocumentWeek2Day3Sheet(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Week = 2
	doc.Day = 3
	doc.Lesson.Kind = eoschoolKindDeepen
	fp := 2
	doc.Lesson.FocusPoint = &fp
	doc.Lesson.Summary = ""
	doc.Lesson.Points = []EoschoolPoint{{ID: "p1", Heading: "h", Body: "b"}}
	fillLetterQuizDay(&doc, 3)
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func fillLetterQuizDay(doc *EoschoolDocument, day int) {
	doc.Quiz.QuestionCount = 12
	doc.Quiz.Questions = make([]EoschoolQuestion, 12)
	for i := 0; i < 2; i++ {
		doc.Quiz.Questions[i] = EoschoolQuestion{
			ID: "q1", OriginDay: 1, Type: "mcq", Prompt: "p?",
			Choices: []string{"a", "b", "c", "d"}, Answer: "a",
		}
	}
	for i := 0; i < 6; i++ {
		doc.Quiz.Questions[2+i] = EoschoolQuestion{
			ID: "qd", OriginDay: day, Type: "mcq", Prompt: "p?",
			Choices: []string{"a", "b", "c", "d"}, Answer: "a",
		}
	}
	for i := 0; i < 4; i++ {
		doc.Quiz.Questions[8+i] = EoschoolQuestion{
			ID: "w", OriginDay: day, Type: "write", Prompt: "cita y explica?",
		}
	}
}

func sampleEoschoolDay1() EoschoolDocument {
	doc := EoschoolDocument{
		Format:  eoschoolFormatName,
		Version: eoschoolVersion,
		Cycle:   1,
		Week:    1,
		Day:     1,
		Level:   eoschoolLevelV1,
		Subject: "mat",
		Locale:  "es",
		Title:   "Tablas de multiplicar 1–12",
		Lesson: EoschoolLesson{
			Kind: eoschoolKindIntro,
			Points: []EoschoolPoint{
				{ID: "p1", Heading: "Factores 1–4", Body: "Repaso de tablas pequeñas."},
				{ID: "p2", Heading: "Factores 5–8", Body: "Productos medios."},
				{ID: "p3", Heading: "Factores 9–12", Body: "Productos mayores."},
			},
			Summary: "Memorizar productos 1×1 a 12×12.",
		},
	}
	doc.Quiz.QuestionCount = 12
	doc.Quiz.Questions = make([]EoschoolQuestion, 12)
	for i := 0; i < 8; i++ {
		doc.Quiz.Questions[i] = EoschoolQuestion{
			ID:        "q",
			OriginDay: 1,
			Type:      "mcq",
			Prompt:    "¿2×3?",
			Choices:   []string{"5", "6", "7", "8"},
			Answer:    "6",
		}
	}
	for i := 0; i < 4; i++ {
		doc.Quiz.Questions[8+i] = EoschoolQuestion{
			ID: "w", OriginDay: 1, Type: "write", Prompt: "Escribe tu idea",
		}
	}
	return doc
}

func TestValidateEoschoolMPPE(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.MPPE = &EoschoolMPPE{Objectives: []EoschoolMPPEObjective{
		{ID: "mat-num-06", Label: "Multiplico con la unidad seguida de cero."},
	}}
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatalf("expected ok with mppe: %v", err)
	}
	doc.MPPE.Objectives[0].Label = ""
	if err := validateEoschoolDocument(&doc); err == nil {
		t.Fatal("expected error for empty mppe label")
	}
}
