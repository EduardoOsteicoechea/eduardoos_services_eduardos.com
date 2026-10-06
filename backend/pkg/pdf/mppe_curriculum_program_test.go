package pdf

import (
	"strings"
	"testing"
)

func TestBuildMPPECurriculumProgramPDF(t *testing.T) {
	docs := []MPPECurriculumDayDoc{
		{
			PlanDay: 1, Week: 1, Grade: "3er grado", Title: "Dia 1",
			Sections: []MPPECurriculumDaySection{
				{ID: "bib", Label: "Biblia", Learning: "Leer"},
				{ID: "ide", Label: "Identidad", Learning: "Yo"},
				{ID: "len", Label: "Lenguaje", Learning: "Palabra"},
				{ID: "mat", Label: "Mat", Learning: "Sumar"},
				{ID: "cie", Label: "Cie", Learning: "Planta"},
			},
		},
		{
			PlanDay: 2, Week: 1, Grade: "3er grado", Title: "Dia 2",
			Sections: []MPPECurriculumDaySection{
				{ID: "bib", Label: "Biblia", Learning: "Leer 2"},
				{ID: "ide", Label: "Identidad", Learning: "Yo 2"},
				{ID: "len", Label: "Lenguaje", Learning: "Palabra 2"},
				{ID: "mat", Label: "Mat", Learning: "Sumar 2"},
				{ID: "cie", Label: "Cie", Learning: "Planta 2"},
			},
		},
	}
	raw, err := BuildMPPECurriculumProgramPDF(docs)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(raw[:8]), "%PDF") {
		t.Fatalf("not a pdf")
	}
	// cover + 1 week index + 2 days
	if !strings.Contains(string(raw), "/Count 4") {
		t.Fatalf("expected 4 pages, got:\n%s", string(raw[:200]))
	}
}

func TestBuildMPPECurriculumPortfolioPDF(t *testing.T) {
	raw, err := BuildMPPECurriculumPortfolioPDF(MPPEPortfolioDoc{
		StudentName: "Ana Perez",
		Age:         9,
		Grade:       "3er grado",
		PercentDone: 20,
		Days: []MPPEPortfolioDay{
			{
				PlanDay: 1, Week: 1, Title: "Dia 1", DayStatus: "yellow",
				Sections: []MPPEPortfolioSection{
					{ID: "bib", Label: "Biblia", Learning: "Tema biblia", Done: true},
					{ID: "ide", Label: "Identidad", Learning: "Tema ide", Done: false},
				},
			},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(raw[:8]), "%PDF") {
		t.Fatalf("not a pdf")
	}
}
