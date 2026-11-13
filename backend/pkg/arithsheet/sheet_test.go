package arithsheet

import (
	"math"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"
)

func TestGeometry(t *testing.T) {
	g := newGeom()
	if math.Abs(g.contentW-119.7) > 0.001 {
		t.Fatalf("content width %v", g.contentW)
	}
	if math.Abs(g.rightX-149.7) > 0.001 {
		t.Fatalf("right page x %v", g.rightX)
	}
	if math.Abs(g.cellW-29.925) > 0.001 {
		t.Fatalf("cell width %v", g.cellW)
	}
	if math.Abs(g.cellH-23.3) > 0.001 {
		t.Fatalf("cell height %v", g.cellH)
	}
	gutterL, gutterR := g.gutter()
	for row := 0; row < gridRows; row++ {
		for col := 0; col < gridCols; col++ {
			left := g.cell(g.leftX, col, row)
			if left.X+left.W > gutterL+0.01 {
				t.Fatalf("left cell enters gutter: %+v", left)
			}
			right := g.cell(g.rightX, col, row)
			if right.X < gutterR-0.01 {
				t.Fatalf("right cell enters gutter: %+v", right)
			}
		}
	}
}

func TestSampleFactors(t *testing.T) {
	mult, div := SampleFactors(sampleSeed)
	if len(mult) != 32 || len(div) != 32 {
		t.Fatalf("counts %d %d", len(mult), len(div))
	}
	for i, p := range mult {
		if p.A < 10 || p.A > 99 || p.B < 10 || p.B > 99 {
			t.Fatalf("mult %d out of range %+v", i, p)
		}
	}
	same := true
	for i, p := range div {
		if p.B < 10 || p.B > 99 || p.A < p.B || p.A > 99 {
			t.Fatalf("div %d out of range %+v", i, p)
		}
		if p != mult[i] {
			same = false
		}
	}
	if same {
		t.Fatal("multiplication and division series are identical")
	}
	again, _ := SampleFactors(sampleSeed)
	if again[0] != mult[0] {
		t.Fatal("seed is not stable")
	}
}

func TestBuildSample(t *testing.T) {
	pdf, arith, figures := renderSample()
	again := BuildSample()
	if string(pdf) != string(again) {
		t.Fatal("sample PDF is not deterministic")
	}
	raw := string(pdf)
	if strings.Count(raw, "/Type /Page ") != 2 {
		t.Fatalf("page count marker %d", strings.Count(raw, "/Type /Page "))
	}
	if strings.Count(raw, "MediaBox [0 0 792.00 612.00]") != 2 {
		t.Fatal("expected two landscape letter pages")
	}
	if strings.Count(arith, `\327`) != 32 {
		t.Fatalf("multiply signs %d", strings.Count(arith, `\327`))
	}
	if strings.Count(arith, `\367`) != 32 {
		t.Fatalf("divide signs %d", strings.Count(arith, `\367`))
	}
	if strings.Contains(figures, `\327`) || strings.Contains(figures, `\367`) {
		t.Fatal("figure sheet contains arithmetic operators")
	}
	if !strings.Contains(arith, `Multiplicaci\363n`) || !strings.Contains(arith, `Divisi\363n`) {
		t.Fatal("arithmetic topics missing")
	}
	if !strings.Contains(figures, "Figuras planas") || !strings.Contains(figures, `geom\351tricos`) {
		t.Fatal("figure topics missing")
	}
	if strings.Contains(arith, " c\n") {
		t.Fatal("arithmetic sheet drew curves")
	}
	if !strings.Contains(figures, " c\n") {
		t.Fatal("figure sheet drew no curves")
	}
	mult, div := SampleFactors(sampleSeed)
	for _, p := range mult {
		prod := strconv.Itoa(p.A * p.B)
		if strings.Contains(raw, "("+prod+")") {
			t.Fatalf("product %s was printed", prod)
		}
	}
	for _, p := range div {
		if p.A >= 10 && strings.Contains(raw, "("+strconv.Itoa(p.A/p.B)+")") && p.A/p.B >= 10 {
			t.Fatalf("quotient printed for %+v", p)
		}
	}
	for _, name := range []string{"circulo", "círculo", "cuadrado", "cubo", "esfera", "cilindro", "triangulo", "rombo"} {
		if strings.Contains(raw, name) {
			t.Fatalf("figure name %q printed", name)
		}
	}
	if len(planeFigs) != 24 || len(solidFigs) != 16 {
		t.Fatalf("catalog %d %d", len(planeFigs), len(solidFigs))
	}

	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller")
	}
	out := filepath.Join(filepath.Dir(file), "..", "..", ".data", "arithsheet-sample.pdf")
	if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(out, pdf, 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestPackageDoesNotImportSitePDF(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller")
	}
	matches, err := filepath.Glob(filepath.Join(filepath.Dir(file), "*.go"))
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range matches {
		body, err := os.ReadFile(name)
		if err != nil {
			t.Fatal(err)
		}
		if strings.HasSuffix(name, "_test.go") {
			continue
		}
		if strings.Contains(string(body), "pkg/pdf") {
			t.Fatalf("%s imports site pdf package", name)
		}
	}
}
