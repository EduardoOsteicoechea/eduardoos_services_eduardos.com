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
	doc.Quiz.QuestionCount = 40
	doc.Quiz.Questions = make([]EoschoolQuestion, 40)
	for i := range doc.Quiz.Questions {
		doc.Quiz.Questions[i] = EoschoolQuestion{
			ID: "q", OriginDay: (i % 5) + 1, Type: "mcq", Prompt: "p?",
			Choices: []string{"a", "b", "c", "d"}, Answer: "a",
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
