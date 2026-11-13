// Package arithsheet builds a two-sheet US Letter landscape worksheet.
// Sheet 1 is multiplication (left) and division (right). Sheet 2 is plane
// figures (left) and solid figures (right). It does not use package pdf.
package arithsheet

// US Letter landscape, millimetres. 279.4 = 11 in, 215.9 = 8.5 in.
const (
	pageWidthMm    = 279.4
	pageHeightMm   = 215.9
	marginOuterMm  = 10
	marginGutterMm = 20
	headerHeightMm = 8
	headerGapMm    = 1.5
	gridCols       = 4
	gridRows       = 8
	sampleSeed     = 20261113
)

// sheetGeom is the shared chrome of both physical sheets.
type sheetGeom struct {
	contentW float64
	contentH float64
	leftX    float64
	rightX   float64
	gridTop  float64
	cellW    float64
	cellH    float64
}

func newGeom() sheetGeom {
	contentW := (pageWidthMm - 2*marginOuterMm - marginGutterMm) / 2
	contentH := pageHeightMm - 2*marginOuterMm
	gridH := contentH - headerHeightMm - headerGapMm
	return sheetGeom{
		contentW: contentW,
		contentH: contentH,
		leftX:    marginOuterMm,
		rightX:   marginOuterMm + contentW + marginGutterMm,
		gridTop:  marginOuterMm + headerHeightMm + headerGapMm,
		cellW:    contentW / gridCols,
		cellH:    gridH / gridRows,
	}
}

// rectMm is a CSS-top box: Top is the distance from the page top.
type rectMm struct {
	X, Top, W, H float64
}

func (g sheetGeom) cell(originX float64, col, row int) rectMm {
	return rectMm{
		X:   originX + float64(col)*g.cellW,
		Top: g.gridTop + float64(row)*g.cellH,
		W:   g.cellW,
		H:   g.cellH,
	}
}

func (g sheetGeom) gutter() (left, right float64) {
	left = marginOuterMm + g.contentW
	right = left + marginGutterMm
	return left, right
}
