package pdf

import (
	"fmt"
	"strings"
)

// Homescool Letter grid v2 (US Letter portrait wireframe sample).
// Row tracks (mm): margin | header1 | gap | header2 | gap | main | gap | images
// Col tracks (mm): left | headerMargin | col1 | gap | col2 | gap | col3

const (
	HCLetterGridRadiusMm = 1.0
	HCLetterGridStrokeMm = 0.2
)

var (
	hcLetterRowHeightsMm = []float64{5, 7, 2, 5, 2, 182, 2, 70}
	hcLetterColWidthsMm  = []float64{5, 15, 48, 2, 68, 2, 68}
)

// RectMm is a CSS-top box in millimetres (x from left, top from page top).
type RectMm struct {
	X, Top, W, H float64
	Label        string
}

// HomescoolLetterGrid holds outer frames and header subdivisions.
type HomescoolLetterGrid struct {
	ColStarts []float64
	RowStarts []float64
	Box30     RectMm // header1 span cols 2→6
	Box31     RectMm // header2 span cols 2→6
	Box32     RectMm // main cols 1→2
	Box33     RectMm // main col 4
	Box34     RectMm // main col 6
	Box35     RectMm // images cols 1→6
	Sub30     []RectMm
	Sub31     []RectMm
}

func trackStarts(widths []float64) []float64 {
	starts := make([]float64, len(widths))
	var x float64
	for i, w := range widths {
		starts[i] = x
		x += w
	}
	return starts
}

func spanRect(colStarts, rowStarts, colW, rowH []float64, c0, c1, r0, r1 int, label string) RectMm {
	x := colStarts[c0]
	top := rowStarts[r0]
	var w float64
	for c := c0; c <= c1; c++ {
		w += colW[c]
	}
	var h float64
	for r := r0; r <= r1; r++ {
		h += rowH[r]
	}
	return RectMm{X: x, Top: top, W: w, H: h, Label: label}
}

func splitHorizontal(parent RectMm, parts []float64, labelPrefix string) []RectMm {
	out := make([]RectMm, 0, (len(parts)+1)/2)
	x := parent.X
	cell := 0
	for i, w := range parts {
		if i%2 == 1 {
			// gutter track — no border
			x += w
			continue
		}
		out = append(out, RectMm{
			X:     x,
			Top:   parent.Top,
			W:     w,
			H:     parent.H,
			Label: fmt.Sprintf("%s.%d", labelPrefix, cell),
		})
		cell++
		x += w
	}
	return out
}

// ComputeHomescoolLetterGrid returns the v2 Letter frames from the fixed tracks.
func ComputeHomescoolLetterGrid() HomescoolLetterGrid {
	colStarts := trackStarts(hcLetterColWidthsMm)
	rowStarts := trackStarts(hcLetterRowHeightsMm)

	box30 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm, 2, 6, 1, 1, "3.0")
	box31 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm, 2, 6, 3, 3, "3.1")
	box32 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm, 1, 2, 5, 5, "3.2")
	box33 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm, 4, 4, 5, 5, "3.3")
	box34 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm, 6, 6, 5, 5, "3.4")
	box35 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm, 1, 6, 7, 7, "3.5")

	// 3.0: 45 | 2 | 98 | 2 | remainder(41)
	rest30 := box30.W - (45 + 2 + 98 + 2)
	sub30 := splitHorizontal(box30, []float64{45, 2, 98, 2, rest30}, "3.0")

	// 3.1: 23 | 2 | 70 | 2 | 70 | 2 | remainder(19)
	rest31 := box31.W - (23 + 2 + 70 + 2 + 70 + 2)
	sub31 := splitHorizontal(box31, []float64{23, 2, 70, 2, 70, 2, rest31}, "3.1")

	return HomescoolLetterGrid{
		ColStarts: colStarts,
		RowStarts: rowStarts,
		Box30:     box30,
		Box31:     box31,
		Box32:     box32,
		Box33:     box33,
		Box34:     box34,
		Box35:     box35,
		Sub30:     sub30,
		Sub31:     sub31,
	}
}

// BuildHomescoolLetterGridSamplePDF draws a one-page wireframe of the v2 Letter grid.
func BuildHomescoolLetterGridSamplePDF() ([]byte, error) {
	g := ComputeHomescoolLetterGrid()
	pageW := MmToPoints(EoschoolPageWidthMm)
	pageH := MmToPoints(EoschoolPageHeightMm)

	var sb strings.Builder
	draw := func(r RectMm) {
		if r.W <= 0 || r.H <= 0 {
			return
		}
		strokeRoundedRectMm(&sb, r.X, r.Top, r.W, r.H, HCLetterGridRadiusMm, HCLetterGridStrokeMm)
		label := toWinAnsi(r.Label)
		if label == "" {
			return
		}
		// Label inside top-left of the box (PDF y from bottom).
		tx := MmToPoints(r.X + 1.2)
		ty := MmToPoints(EoschoolPageHeightMm - r.Top - 3.2)
		sb.WriteString(fmt.Sprintf("BT /F1 %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
			MmToPoints(2.2), tx, ty, escape(label)))
	}

	// Outer main/side/image frames (not the outer header shells — only subdivided cells).
	for _, r := range []RectMm{g.Box32, g.Box33, g.Box34, g.Box35} {
		draw(r)
	}
	for _, r := range g.Sub30 {
		draw(r)
	}
	for _, r := range g.Sub31 {
		draw(r)
	}

	content := sb.String()
	objs := [][]byte{
		[]byte("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
		[]byte("2 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n"),
		[]byte("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"),
		[]byte(fmt.Sprintf(
			"4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents 5 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n",
			pageW, pageH,
		)),
		buildStreamObject(5, content),
	}
	return assemblePDF(objs), nil
}
