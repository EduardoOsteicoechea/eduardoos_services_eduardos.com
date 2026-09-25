package main

import "testing"

func TestValidateEoschoolDocumentDay1(t *testing.T) {
	doc := sampleEoschoolDay1()
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func TestValidateEoschoolDocumentDay1MixedActivityTypes(t *testing.T) {
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
	doc.Quiz.Questions[1] = EoschoolQuestion{
		ID: "ws", OriginDay: 1, Type: "wordsearch", Prompt: "Encuentra las palabras",
		Wordsearch: &EoschoolWordsearch{
			Grid:  [][]string{{"A", "B"}, {"C", "D"}},
			Words: []string{"AB", "CD"},
		},
	}
	doc.Quiz.Questions[2] = EoschoolQuestion{
		ID: "mt", OriginDay: 1, Type: "match", Prompt: "Empareja",
		Match: &EoschoolMatch{
			Left:  []string{"uno", "dos", "tres"},
			Right: []string{"1", "2", "3"},
		},
	}
	doc.Quiz.Questions[3] = EoschoolQuestion{
		ID: "di", OriginDay: 1, Type: "draw_image", Prompt: "Traza sobre el mapa",
		DrawImage: &EoschoolDrawImage{MediaID: "img1"},
	}
	doc.Quiz.Questions[4] = EoschoolQuestion{
		ID: "db", OriginDay: 1, Type: "draw_box", Prompt: "Dibuja el ciclo",
		DrawBox: &EoschoolDrawBox{HeightCm: 6},
	}
	doc.Quiz.Questions[5] = EoschoolQuestion{
		ID: "gm", OriginDay: 1, Type: "grid_mark", Prompt: "Marca las celdas correctas",
		GridMark: &EoschoolGridMark{Cols: 8, Rows: 8},
		Answer:   "A6,G4",
	}
	doc.Quiz.Questions[6] = EoschoolQuestion{
		ID: "wr", OriginDay: 1, Type: "write", Prompt: "Explica en dos oraciones",
	}
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
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
	doc.Quiz.Questions[0] = EoschoolQuestion{
		ID: "w", OriginDay: 1, Type: "write", Prompt: "Escribe tu idea",
	}
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
	doc.Quiz.QuestionCount = 52
	doc.Quiz.Questions = make([]EoschoolQuestion, 52)
	for i := 0; i < 40; i++ {
		doc.Quiz.Questions[i] = EoschoolQuestion{
			ID: "q", OriginDay: (i % 5) + 1, Type: "mcq", Prompt: "p?",
			Choices: []string{"a", "b", "c", "d"}, Answer: "a",
		}
	}
	for i := 0; i < 4; i++ {
		doc.Quiz.Questions[40+i] = EoschoolQuestion{
			ID: "w4", OriginDay: 4, Type: "write", Prompt: "escribe?",
		}
	}
	for i := 0; i < 8; i++ {
		doc.Quiz.Questions[44+i] = EoschoolQuestion{
			ID: "w5", OriginDay: 5, Type: "write", Prompt: "reflexiona?",
		}
	}
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
	doc.Quiz.QuestionCount = 52
	doc.Quiz.Questions = make([]EoschoolQuestion, 52)
	for i := 0; i < 40; i++ {
		doc.Quiz.Questions[i] = EoschoolQuestion{
			ID: "q", OriginDay: (i % 5) + 1, Type: "mcq", Prompt: "p?",
			Choices: []string{"a", "b", "c", "d"}, Answer: "a",
		}
	}
	for i := 0; i < 4; i++ {
		doc.Quiz.Questions[40+i] = EoschoolQuestion{
			ID: "w4", OriginDay: 4, Type: "write", Prompt: "escribe?",
		}
	}
	for i := 0; i < 8; i++ {
		doc.Quiz.Questions[44+i] = EoschoolQuestion{
			ID: "w5", OriginDay: 5, Type: "write", Prompt: "reflexiona?",
		}
	}
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
	doc.Quiz.QuestionCount = 36
	doc.Quiz.Questions = make([]EoschoolQuestion, 36)
	for i := 0; i < 32; i++ {
		doc.Quiz.Questions[i] = EoschoolQuestion{
			ID: "q", OriginDay: (i % 4) + 1, Type: "mcq", Prompt: "p?",
			Choices: []string{"a", "b", "c", "d"}, Answer: "a",
		}
	}
	for i := 0; i < 4; i++ {
		doc.Quiz.Questions[32+i] = EoschoolQuestion{
			ID: "w", OriginDay: 4, Type: "write", Prompt: "escribe?",
		}
	}
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func sampleEoschoolDay1() EoschoolDocument {
	qs := make([]EoschoolQuestion, 8)
	for i := range qs {
		qs[i] = EoschoolQuestion{
			ID:        "q",
			OriginDay: 1,
			Type:      "mcq",
			Prompt:    "¿2×3?",
			Choices:   []string{"5", "6", "7", "8"},
			Answer:    "6",
		}
	}
	return EoschoolDocument{
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
		Quiz: EoschoolQuiz{QuestionCount: 8, Questions: qs},
	}
}
