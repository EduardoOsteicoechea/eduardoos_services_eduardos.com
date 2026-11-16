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
	if math.Abs(g.contentW-129.7) > 0.001 {
		t.Fatalf("content width %v", g.contentW)
	}
	if math.Abs(g.rightX-144.7) > 0.001 {
		t.Fatalf("right page x %v", g.rightX)
	}
	if math.Abs(g.cellW-32.425) > 0.001 {
		t.Fatalf("cell width %v", g.cellW)
	}
	if math.Abs(g.cellH-25.7375) > 0.001 {
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
	if len(mult) != arithGridCols*arithGridRows || len(div) != arithGridCols*arithGridRows {
		t.Fatalf("counts %d %d", len(mult), len(div))
	}
	for i, p := range mult {
		if p.A < 10 || p.A > 99 || p.B < 10 || p.B > 99 {
			t.Fatalf("mult %d out of range %+v", i, p)
		}
	}
	same := true
	for i, p := range div {
		if p.A < 10 || p.A > 99 || p.B < 2 || p.B > 9 {
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
	if strings.Count(raw, "/Type /Page ") != 3 {
		t.Fatalf("page count marker %d", strings.Count(raw, "/Type /Page "))
	}
	if strings.Count(raw, "MediaBox [0 0 792.00 612.00]") != 3 {
		t.Fatal("expected three landscape letter pages")
	}
	if strings.Count(arith, `\327`) != arithGridCols*arithGridRows {
		t.Fatalf("multiply signs %d", strings.Count(arith, `\327`))
	}
	if strings.Count(arith, `\367`) != 0 {
		t.Fatalf("divide sign should be the bracket, found %d", strings.Count(arith, `\367`))
	}
	if strings.Contains(figures, `\327`) || strings.Contains(figures, `\367`) {
		t.Fatal("figure sheet contains arithmetic operators")
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
	if len(planeFigs) != 24 || len(solidFigs) != 16 || len(sceneFigs) != 40 {
		t.Fatalf("catalog %d %d %d", len(planeFigs), len(solidFigs), len(sceneFigs))
	}
	order := scrambledSceneOrder(sampleSeed)
	sorted := true
	planes, solids := 0, 0
	seen := map[int]bool{}
	for i, id := range order {
		if seen[id] || id < 0 || id >= len(sceneFigs) {
			t.Fatalf("bad scene order %v", order)
		}
		seen[id] = true
		if id != i {
			sorted = false
		}
		if i < 32 {
			if id < 24 {
				planes++
			} else {
				solids++
			}
		}
	}
	if sorted || planes == 0 || solids == 0 {
		t.Fatal("scenes are not mixed across the first page")
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
	key := BuildFigureKey()
	if strings.Count(string(key), "/Type /Page ") != 1 {
		t.Fatal("figure key should be one sheet")
	}
	if !strings.Contains(string(key), "Semiesfera") {
		t.Fatal("figure key captions missing")
	}
	keyPath := filepath.Join(filepath.Dir(out), "arithsheet-figuras.pdf")
	if err := os.WriteFile(keyPath, key, 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestSampleClass(t *testing.T) {
	mult, div := SampleClass(classSeed)
	n := arithGridCols * arithGridRows
	if len(mult) != n || len(div) != n {
		t.Fatalf("counts %d %d", len(mult), len(div))
	}
	prev, _ := SampleFactors(sampleSeed)
	sameMult := true
	for i, p := range mult {
		if p.A < 10 || p.A > 99 || p.B < 10 || p.B > 99 {
			t.Fatalf("mult %d out of range %+v", i, p)
		}
		if p != prev[i] {
			sameMult = false
		}
	}
	if sameMult {
		t.Fatal("class multiplications repeat the first sheet")
	}
	for i, p := range div {
		if p.A < 2 || p.A > 9 || p.B < 2 || p.B > 9 || p.A%p.B != 0 {
			t.Fatalf("div %d want exact one-digit %+v", i, p)
		}
	}
	againMult, againDiv := SampleClass(classSeed)
	if againMult[0] != mult[0] || againDiv[0] != div[0] {
		t.Fatal("class seed is not stable")
	}
}

func TestBuildClass(t *testing.T) {
	pdf, arith, figures := renderClass()
	if string(pdf) != string(BuildClass()) {
		t.Fatal("class PDF is not deterministic")
	}
	raw := string(pdf)
	if strings.Count(raw, "/Type /Page ") != 3 {
		t.Fatalf("page count marker %d", strings.Count(raw, "/Type /Page "))
	}
	if strings.Count(arith, `\327`) != arithGridCols*arithGridRows {
		t.Fatalf("multiply signs %d", strings.Count(arith, `\327`))
	}
	if strings.Contains(figures, `\327`) {
		t.Fatal("figure sheet contains arithmetic operators")
	}
	figOrder := scrambledSceneOrder(classSeed)
	sceneOrder := scrambledSceneOrder(classSeed + 53)
	if equalInts(figOrder, sceneOrder) || equalInts(figOrder, scrambledSceneOrder(sampleSeed)) {
		t.Fatal("geometry shuffle repeats another sheet")
	}
	planes, solids := 0, 0
	for _, id := range figOrder[:32] {
		if id < 24 {
			planes++
		} else {
			solids++
		}
	}
	if planes == 0 || solids == 0 {
		t.Fatal("class figures are not mixed")
	}

	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("caller")
	}
	out := filepath.Join(filepath.Dir(file), "..", "..", ".data", "arithsheet-clase.pdf")
	if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(out, pdf, 0o644); err != nil {
		t.Fatal(err)
	}
}

func equalInts(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
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
