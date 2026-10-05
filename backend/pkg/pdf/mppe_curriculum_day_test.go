package pdf

import (
	"strings"
	"testing"
)

func TestBuildMPPECurriculumDayPDF(t *testing.T) {
	raw, err := BuildMPPECurriculumDayPDF(MPPECurriculumDayDoc{
		PlanDay: 1,
		Week:    1,
		Grade:   "3er grado",
		Title:   "Dia 1",
		Sections: []MPPECurriculumDaySection{
			{ID: "bib", Label: "Biblia", Objective: "Lectura", Learning: "Génesis 1-4", Activities: []string{"Lee en voz alta"}},
			{ID: "ide", Label: "Identidad", Objective: "La Humanidad", Learning: "Periodos de Venezuela"},
			{ID: "len", Label: "Lenguaje", Objective: "Textos instruccionales", Learning: "Seguir pasos"},
			{ID: "mat", Label: "Matemáticas", Objective: "Geometría", Learning: "Orientarse"},
			{ID: "cie", Label: "Ciencias", Objective: "Alimentación", Learning: "Grupos de alimentos"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(raw), "%PDF") {
		t.Fatal("missing PDF header")
	}
}
