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

func TestValidateEoschoolDocumentDay5(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Day = 5
	doc.Lesson.Kind = eoschoolKindReview
	doc.Lesson.Summary = ""
	doc.Lesson.Points = make([]EoschoolPoint, 5)
	for i := range doc.Lesson.Points {
		doc.Lesson.Points[i] = EoschoolPoint{ID: "p", Heading: "h", Body: "b"}
	}
	fillLetterQuizDay5(&doc)
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func TestValidateEoschoolDocumentProDay5AllowsOnePoint(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Subject = "pro"
	doc.Day = 5
	doc.Lesson.Kind = eoschoolKindReview
	doc.Lesson.Summary = ""
	doc.Lesson.Points = []EoschoolPoint{{ID: "p1", Heading: "Presenta el proyecto", Body: "Continúa el mismo experimento."}}
	fillLetterQuizDay5(&doc)
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
	doc.Subject = "mat"
	if err := validateEoschoolDocument(&doc); err == nil {
		t.Fatal("non-pro day 5 with 1 point should fail")
	}
}

func TestValidateEoschoolDocumentDay4Write(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Day = 4
	doc.Lesson.Kind = eoschoolKindDeepen
	fp := 3
	doc.Lesson.FocusPoint = &fp
	doc.Lesson.Summary = ""
	doc.Lesson.Points = []EoschoolPoint{{ID: "p1", Heading: "h", Body: "b"}}
	fillLetterQuizDay(&doc, 4)
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
	doc.Quiz.QuestionCount = 16
	doc.Quiz.Questions = make([]EoschoolQuestion, 16)
	for i := 0; i < 6; i++ {
		doc.Quiz.Questions[i] = EoschoolQuestion{
			ID: "q1", OriginDay: 1, Type: "mcq", Prompt: "p?",
			Choices: []string{"a", "b", "c", "d"}, Answer: "a",
		}
	}
	for i := 0; i < 6; i++ {
		doc.Quiz.Questions[6+i] = EoschoolQuestion{
			ID: "qd", OriginDay: day, Type: "mcq", Prompt: "p?",
			Choices: []string{"a", "b", "c", "d"}, Answer: "a",
		}
	}
	for i := 0; i < 4; i++ {
		doc.Quiz.Questions[12+i] = EoschoolQuestion{
			ID: "w", OriginDay: day, Type: "write", Prompt: "cita y explica?",
		}
	}
}

func fillLetterQuizDay5(doc *EoschoolDocument) {
	fillLetterQuizDay(doc, 5)
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
	doc.Quiz.QuestionCount = 16
	doc.Quiz.Questions = make([]EoschoolQuestion, 16)
	for i := 0; i < 12; i++ {
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
		doc.Quiz.Questions[12+i] = EoschoolQuestion{
			ID: "w", OriginDay: 1, Type: "write", Prompt: "Escribe tu idea",
		}
	}
	return doc
}
