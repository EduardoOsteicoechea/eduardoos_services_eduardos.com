package pdf

import (
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

func TestHomescoolLetterGridGeometry(t *testing.T) {
	var rowSum, colSum float64
	for _, h := range hcLetterRowHeightsMm {
		rowSum += h
	}
	for _, w := range hcLetterColWidthsMm {
		colSum += w
	}
	if !almostEqual(rowSum, 275) {
		t.Fatalf("row track sum=%v want 275", rowSum)
	}
	if !almostEqual(colSum, 208) {
		t.Fatalf("col track sum=%v want 208", colSum)
	}

	g := ComputeHomescoolLetterGrid()

	if !almostEqual(g.Box30.X, 20) || !almostEqual(g.Box30.Top, 5) ||
		!almostEqual(g.Box30.W, 188) || !almostEqual(g.Box30.H, 7) {
		t.Fatalf("box 3.0 = %+v", g.Box30)
	}
	if !almostEqual(g.Box31.X, 20) || !almostEqual(g.Box31.Top, 14) ||
		!almostEqual(g.Box31.W, 188) || !almostEqual(g.Box31.H, 5) {
		t.Fatalf("box 3.1 = %+v", g.Box31)
	}
	if !almostEqual(g.Box32.X, 5) || !almostEqual(g.Box32.W, 63) || !almostEqual(g.Box32.H, 182) {
		t.Fatalf("box 3.2 = %+v", g.Box32)
	}
	if !almostEqual(g.Box33.X, 70) || !almostEqual(g.Box33.W, 68) {
		t.Fatalf("box 3.3 = %+v", g.Box33)
	}
	if !almostEqual(g.Box34.X, 140) || !almostEqual(g.Box34.W, 68) {
		t.Fatalf("box 3.4 = %+v", g.Box34)
	}
	if !almostEqual(g.Box35.X, 5) || !almostEqual(g.Box35.Top, 205) ||
		!almostEqual(g.Box35.W, 203) || !almostEqual(g.Box35.H, 70) {
		t.Fatalf("box 3.5 = %+v", g.Box35)
	}

	if len(g.Sub30) != 3 {
		t.Fatalf("sub30 len=%d want 3", len(g.Sub30))
	}
	if !almostEqual(g.Sub30[0].W, 45) || !almostEqual(g.Sub30[1].W, 98) || !almostEqual(g.Sub30[2].W, 41) {
		t.Fatalf("sub30 widths = %v %v %v", g.Sub30[0].W, g.Sub30[1].W, g.Sub30[2].W)
	}
	if len(g.Sub31) != 4 {
		t.Fatalf("sub31 len=%d want 4", len(g.Sub31))
	}
	if !almostEqual(g.Sub31[0].W, 23) || !almostEqual(g.Sub31[1].W, 70) ||
		!almostEqual(g.Sub31[2].W, 70) || !almostEqual(g.Sub31[3].W, 19) {
		t.Fatalf("sub31 widths unexpected: %+v", g.Sub31)
	}
}

func TestBuildHomescoolLetterGridSamplePDF(t *testing.T) {
	raw, err := BuildHomescoolLetterGridSamplePDF()
	if err != nil {
		t.Fatal(err)
	}
	s := string(raw)
	if !strings.HasPrefix(s, "%PDF") {
		t.Fatal("missing PDF header")
	}
	if !strings.Contains(s, "/Count 1") {
		t.Fatal("expected 1 page")
	}
	if !strings.Contains(s, "3.0.0") || !strings.Contains(s, "3.5") {
		t.Fatal("expected wireframe labels in content")
	}
}

func TestWriteHomescoolLetterGridSamplePDF(t *testing.T) {
	raw, err := BuildHomescoolLetterGridSamplePDF()
	if err != nil {
		t.Fatal(err)
	}
	dir := filepath.Join("..", "..", ".data")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	out := filepath.Join(dir, "homescool-letter-grid-sample.pdf")
	if err := os.WriteFile(out, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s (%d bytes)", out, len(raw))
}
