package pdf

import (
	"strings"
	"testing"
)

func TestApplyClassRetryKeepsWrongLinesBlank(t *testing.T) {
	src := classD40Biblia
	got := ApplyClassRetryLines(src, []ClassRetryAnswer{
		{Prompt: "¿Por qué Moisés manda a parar las ofrendas?", Answer: "Porque es más que suficiente.", Correct: true},
		{Prompt: "Además del arca, ¿qué tres muebles hace Bezaleel?", Answer: "el tabernáculo. Esperado: la mesa.", Correct: false},
	})
	if !strings.Contains(got, "Porque es más que suficiente.") {
		t.Fatal("missing the correct answer")
	}
	if strings.Contains(got, "tabernáculo") || strings.Contains(got, "Esperado:") {
		t.Fatal("wrong answer or key was printed")
	}
	if !strings.Contains(got, "____________________________________") {
		t.Fatal("blank line was removed")
	}
	q3 := strings.Index(got, "3. Además del arca")
	if q3 < 0 {
		t.Fatal("question 3 missing")
	}
	rest := got[q3:]
	nl := strings.Index(rest, "\n")
	next := rest[nl+1:]
	end := strings.Index(next, "\n")
	if !isUnderscoreLine(strings.TrimSpace(next[:end])) {
		t.Fatalf("question 3 blank = %q", next[:end])
	}
}

func TestBuildClassRetryPDFDay40(t *testing.T) {
	raw, err := BuildClassRetryPDF(40, map[string][]ClassRetryAnswer{
		"ide": {{
			Prompt:  "¿Quién gobernaba cuando reventó el Barroso II?",
			Answer:  "Juan Vicente Gómez.",
			Correct: true,
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Count(string(raw), "/Type /Page /") != 7 {
		t.Fatalf("pages %d", strings.Count(string(raw), "/Type /Page /"))
	}
	if !strings.Contains(string(raw), "Juan Vicente") {
		t.Fatal("answer not in the pdf")
	}
	if !strings.Contains(string(raw), "LiberationSans") {
		t.Fatal("expected the class font")
	}
	if _, err := BuildClassRetryPDF(39, nil); err == nil {
		t.Fatal("day 39 has no class source")
	}
}
