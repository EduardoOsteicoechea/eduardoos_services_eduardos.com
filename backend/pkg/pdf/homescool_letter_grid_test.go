package pdf

import (
	"bytes"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
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

	if g.SignatureName.Name != "SignatureName" || !almostEqual(g.SignatureName.W, 45) {
		t.Fatalf("SignatureName = %+v", g.SignatureName)
	}
	if g.SignatureTopic.Name != "SignatureTopic" || !almostEqual(g.SignatureTopic.W, 98) {
		t.Fatalf("SignatureTopic = %+v", g.SignatureTopic)
	}
	if g.SheetCode.Name != "SheetCode" || !almostEqual(g.SheetCode.W, 41) {
		t.Fatalf("SheetCode = %+v want w=41", g.SheetCode)
	}
	if g.Date.Name != "Date" || !almostEqual(g.Date.W, 23) {
		t.Fatalf("Date = %+v", g.Date)
	}
	if g.Student.Name != "Student" || !almostEqual(g.Student.W, 70) {
		t.Fatalf("Student = %+v", g.Student)
	}
	if g.Reviewer.Name != "Reviewer" || !almostEqual(g.Reviewer.W, 70) {
		t.Fatalf("Reviewer = %+v", g.Reviewer)
	}
	if g.ReviewerSignature.Name != "ReviewerSignature" || !almostEqual(g.ReviewerSignature.W, 19) {
		t.Fatalf("ReviewerSignature = %+v want w=19", g.ReviewerSignature)
	}

	if !almostEqual(g.MainCol1.X, 5) || !almostEqual(g.MainCol1.W, 63) || !almostEqual(g.MainCol1.H, 182) {
		t.Fatalf("MainCol1 = %+v", g.MainCol1)
	}
	if !almostEqual(g.MainCol2.X, 70) || !almostEqual(g.MainCol2.W, 68) {
		t.Fatalf("MainCol2 = %+v", g.MainCol2)
	}
	if !almostEqual(g.MainCol3.X, 140) || !almostEqual(g.MainCol3.W, 68) {
		t.Fatalf("MainCol3 = %+v", g.MainCol3)
	}
	if !almostEqual(g.Images.X, 5) || !almostEqual(g.Images.W, 203) || !almostEqual(g.Images.Top, 205) || !almostEqual(g.Images.H, 70) {
		t.Fatalf("Images = %+v", g.Images)
	}
	if !almostEqual(g.SignatureName.Top, 5) || !almostEqual(g.MainCol1.Top, 21) {
		t.Fatalf("header/main tops: sig=%v main=%v", g.SignatureName.Top, g.MainCol1.Top)
	}
	if !almostEqual(HCLetterGridStrokeMm, 0.15) {
		t.Fatalf("stroke=%v want 0.15", HCLetterGridStrokeMm)
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
	if !strings.Contains(s, "/Count 2") {
		t.Fatal("expected 2 pages")
	}
	if !strings.Contains(s, "Punto 1") || !strings.Contains(s, "aprendiste") {
		t.Fatal("expected ask-first sample ink (Punto 1 / aprendiste) in PDF")
	}
	if !strings.Contains(s, "/Helvetica-Bold") {
		t.Fatal("expected bold font for section headings")
	}
	if strings.Contains(s, "SignatureName") {
		t.Fatal("sample PDF should not embed field name strings")
	}
}

func TestWriteHomescoolLetterGridSamplePDF(t *testing.T) {
	dir := filepath.Join("..", "..", ".data")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	raw, err := BuildHomescoolLetterGridSamplePDF()
	if err != nil {
		t.Fatal(err)
	}
	out := filepath.Join(dir, "homescool-letter-grid-sample.pdf")
	if err := os.WriteFile(out, raw, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s (%d bytes)", out, len(raw))

	preview, err := BuildHomescoolLetterGridPreviewPDF()
	if err != nil {
		t.Fatal(err)
	}
	previewOut := filepath.Join(dir, "homescool-letter-preview.pdf")
	if err := os.WriteFile(previewOut, preview, 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s (%d bytes) — one subject (esp S1 D2 ask-first) + practice image", previewOut, len(preview))
	assertPDFObjectsSequential(t, preview)
}

func assertPDFObjectsSequential(t *testing.T, raw []byte) {
	re := regexp.MustCompile(`(\d+) 0 obj`)
	var nums []int
	for _, m := range re.FindAllStringSubmatch(string(raw), -1) {
		n, _ := strconv.Atoi(m[1])
		nums = append(nums, n)
	}
	for i, n := range nums {
		want := i + 1
		if n != want {
			t.Fatalf("pdf object %d labeled %d 0 obj (xref requires strict 1..N order)", want, n)
		}
	}
	if !bytes.Contains(raw, []byte("/DCTDecode")) {
		t.Fatal("preview pdf missing embedded JPEG (DCTDecode)")
	}
}

func TestHCLetterMcqOptionExpansion(t *testing.T) {
	raw := []byte(`{
		"title": "Opciones bajo pregunta",
		"subject": "mat",
		"week": 1,
		"day": 1,
		"level": 6,
		"lesson": {
			"imageBandInstruction": "Dibuja un esquema.",
			"slotSequence": [
				{"index":1,"column":1,"line":1,"kind":"heading","text":"Seccion prueba"},
				{"index":2,"column":1,"line":2,"kind":"blank","text":""},
				{"index":3,"column":1,"line":3,"kind":"question","text":"Cuantas patas tiene un perro?","questionId":"q1","questionType":"mcq","gutter":{"role":"question","background":"#aaa","border":"#fff","text":"#fff"}},
				{"index":4,"column":1,"line":4,"kind":"option","text":"A) Cuatro","questionId":"q1"},
				{"index":5,"column":1,"line":5,"kind":"option","text":"B) Dos","questionId":"q1"},
				{"index":6,"column":1,"line":6,"kind":"option","text":"C) Seis","questionId":"q1"},
				{"index":7,"column":1,"line":7,"kind":"option","text":"D) Ocho","questionId":"q1"}
			]
		},
		"quiz": {
			"questions": [{
				"id": "q1",
				"type": "mcq",
				"prompt": "Cuantas patas tiene un perro?",
				"choices": ["Cuatro", "Dos", "Seis", "Ocho"],
				"answer": "Cuatro"
			}]
		}
	}`)
	page, err := HCLetterPageInkFromEoschoolBytes(raw)
	if err != nil {
		t.Fatal(err)
	}
	if page.Columns[0].LineText[4] != "A) Cuatro" {
		t.Fatalf("line 4 = %q", page.Columns[0].LineText[4])
	}
	pdf, err := BuildHomescoolLetterGridPDF([]HCLetterPageInk{page})
	if err != nil {
		t.Fatal(err)
	}
	// Parentheses are PDF-escaped: "(A\) Cuatro)".
	if !strings.Contains(string(pdf), `A\) Cuatro`) {
		t.Fatal("expected mcq option ink in PDF")
	}
}

func TestHomescoolMainTextPadding(t *testing.T) {
	if !almostEqual(HCLetterMainTextPadYMm, 2) {
		t.Fatalf("HCLetterMainTextPadYMm=%v want 2", HCLetterMainTextPadYMm)
	}
	if !almostEqual(HCLetterMainTextPadMm, 2) {
		t.Fatalf("HCLetterMainTextPadMm=%v want 2", HCLetterMainTextPadMm)
	}
	if !almostEqual(HCLetterHeaderTextPadMm, 2) {
		t.Fatalf("HCLetterHeaderTextPadMm=%v want 2", HCLetterHeaderTextPadMm)
	}
}

// Boxes with borders use a 1 mm corner radius (Bezier corners in the PDF stream) and the
// cabecera 2 write-in labels end with a colon.
func TestHomescoolRoundedBordersAndHeaderColons(t *testing.T) {
	if !almostEqual(HCLetterBorderRadiusMm, 1) {
		t.Fatalf("HCLetterBorderRadiusMm=%v want 1", HCLetterBorderRadiusMm)
	}
	var sb strings.Builder
	strokeContainerCSSTopMm(&sb, 10, 10, 20, 10, HCLetterGridStrokeMm)
	if got := strings.Count(sb.String(), " c\n"); got != 4 {
		t.Fatalf("rounded rect should have 4 curve corners, got %d", got)
	}
	var page strings.Builder
	renderHomescoolLetterGridPage(&page, ComputeHomescoolLetterGrid(), HCLetterPageInk{})
	for _, label := range []string{"(Fecha:)", "(Estudiante:)", "(Revisor:)", "(Firma:)"} {
		if !strings.Contains(page.String(), label) {
			t.Fatalf("header 2 label %s missing", label)
		}
	}
}

// Every published v2 class line must fit its column inside the 2 mm padding (no silent truncation).
func TestHomescoolPublishedClassesFitColumns(t *testing.T) {
	files, _ := filepath.Glob(filepath.Join("..", "..", "..", "frontend", "public", "homescool", "media", "week*", "*-c3-w*-d*-l6.eoschool.json"))
	if len(files) == 0 {
		t.Skip("no published classes found")
	}
	g := ComputeHomescoolLetterGrid()
	limit := MmToPoints(g.MainCol1.W - 2*HCLetterMainTextPadMm)
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		page, err := HCLetterPageInkFromEoschoolBytes(raw)
		if err != nil {
			t.Fatalf("%s: %v", filepath.Base(f), err)
		}
		for ci, col := range page.Columns {
			for ln, text := range col.LineText {
				if w := stringWidthPt(toWinAnsi(text), hcLetterContentFontPt, col.BoldLines[ln]); w > limit+0.01 {
					t.Errorf("%s col %d line %d too wide (%.1f > %.1f): %q", filepath.Base(f), ci+1, ln, w, limit, text)
				}
			}
		}
	}
}
