package pdf

import (
	"fmt"
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
	if strings.Contains(string(raw), "Ã") {
		t.Fatal("PDF content stream contains UTF-8 mojibake (expected WinAnsi)")
	}
	if !strings.Contains(string(raw), "Semana 1") {
		t.Fatal("missing week meta line")
	}
	if !strings.Contains(string(raw), "Objetivo:") {
		t.Fatal("missing Objetivo label")
	}
	if !strings.Contains(string(raw), "Aprendizajes:") {
		t.Fatal("missing Aprendizajes label")
	}
	if !strings.Contains(string(raw), "Actividad sugerida:") {
		t.Fatal("missing Actividad sugerida label")
	}
	wantBox := fmt.Sprintf("%.2f %.2f", MmToPoints(EoschoolPageWidthMm), MmToPoints(EoschoolPageHeightMm))
	if !strings.Contains(string(raw), wantBox) {
		t.Fatalf("expected US Letter MediaBox %s", wantBox)
	}
	if EoschoolMarginMm != 10.0 {
		t.Fatalf("expected 1 cm margin constant, got %v", EoschoolMarginMm)
	}
}
