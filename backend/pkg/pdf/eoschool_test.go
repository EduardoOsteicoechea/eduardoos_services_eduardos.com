package pdf

import (
	"strings"
	"testing"
)

func TestBuildEoschoolPDF(t *testing.T) {
	raw, err := BuildEoschoolPDF(EoschoolPrintDoc{
		Title: "Tablas",
		Meta:  "c1 s1 d1 mat",
		Pages: []EoschoolPrintPage{
			{Heading: "Clase", Lines: []string{"Punto 1", "Cuerpo"}},
			{Heading: "Quiz", Lines: []string{"1. 2x3?"}},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(raw), "%PDF") {
		t.Fatal("missing PDF header")
	}
}
