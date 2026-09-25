package main

import "testing"

func TestValidateEoschoolDocumentDay1(t *testing.T) {
	doc := sampleEoschoolDay1()
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatal(err)
	}
}

func TestValidateEoschoolDocumentRejectsWrongQuizCount(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Quiz.QuestionCount = 6
	doc.Quiz.Questions = doc.Quiz.Questions[:6]
	if err := validateEoschoolDocument(&doc); err == nil {
		t.Fatal("expected quiz count error")
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
