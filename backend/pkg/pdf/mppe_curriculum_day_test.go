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

func longMPPECurriculumDayDoc() MPPECurriculumDayDoc {
	longLearn := strings.Repeat("Contenido del aprendizaje oficial con detalle para el adulto. ", 4)
	longAct := "Dibuja un croquis de tu cuarto y marca norte, puerta y ventana; escribe 4 instrucciones para ir de la puerta a la ventana usando izquierda, derecha, delante y detrás."
	longCanDo := "Al terminar puedes leer un croquis y seguir cuatro instrucciones con palabras de posición."
	section := func(id, label string) MPPECurriculumDaySection {
		return MPPECurriculumDaySection{
			ID:         id,
			Label:      label,
			Objective:  "Objetivo extenso del plan MPPE con contexto venezolano y varias ideas para el adulto responsable.",
			Learning:   longLearn + " · " + longLearn,
			CanDo:      longCanDo,
			Activities: []string{longAct, "Intercambia con un adulto: sigue sus instrucciones en el croquis y corrige si algo no cuadra."},
		}
	}
	return MPPECurriculumDayDoc{
		PlanDay: 197,
		Week:    40,
		Grade:   "3er grado",
		Title:   "Dia 197",
		Sections: []MPPECurriculumDaySection{
			section("bib", "Biblia"),
			section("ide", "Identidad"),
			section("len", "Lenguaje"),
			section("mat", "Matemáticas"),
			section("cie", "Ciencias"),
		},
	}
}

func TestMPPECurriculumDayLayoutFitsMeasuredContent(t *testing.T) {
	doc := longMPPECurriculumDayDoc()
	pageW := MmToPoints(EoschoolPageWidthMm)
	pageH := MmToPoints(EoschoolPageHeightMm)
	margin := MmToPoints(EoschoolMarginMm)
	gap := MmToPoints(mppeDayCardGapMm)
	pad := MmToPoints(mppeDayCardPadMm)
	usableW := pageW - 2*margin
	colW := (usableW - 2 * gap) / 3
	yTop := pageH - margin
	gridTop := yTop - MmToPoints(5) - MmToPoints(5) - MmToPoints(mppeDayHeaderBelowMm)

	plan := planMPPECurriculumDayGrid(doc, pageW, pageH, margin, gap, colW, pad, gridTop)
	positions := [][2]int{{0, 0}, {1, 0}, {2, 0}, {0, 1}, {1, 1}}
	secs := doc.Sections

	for i, pos := range positions {
		row := pos[1]
		measured := plan.layout.measureCard(secs[i])
		if plan.rowHeights[row]+0.01 < measured {
			t.Fatalf("card %d row %d: row height %.2f < measured %.2f", i, row, plan.rowHeights[row], measured)
		}
	}
	total := plan.rowHeights[0] + gap + plan.rowHeights[1]
	if total > plan.maxGridH+0.5 {
		t.Fatalf("grid still overflows page: total %.2f > max %.2f", total, plan.maxGridH)
	}
}

func TestBuildMPPECurriculumDayPDFLongContentAndMeta(t *testing.T) {
	doc := longMPPECurriculumDayDoc()
	raw, err := BuildMPPECurriculumDayPDF(doc)
	if err != nil {
		t.Fatal(err)
	}
	body := string(raw)
	if !strings.Contains(body, "Meta:") {
		t.Fatal("missing Meta (canDo) label in PDF")
	}
	if !strings.Contains(body, "croquis") {
		t.Fatal("expected activity keyword croquis in PDF output")
	}
	if !strings.Contains(body, "Actividad sugerida:") {
		t.Fatal("missing Actividad sugerida label")
	}
}
