// Package arithsheet builds a two-sheet US Letter landscape worksheet.
// Sheet 1 is multiplication (left) and division (right). Sheet 2 is plane
// figures (left) and solid figures (right). It does not use package pdf.
package arithsheet

// US Letter landscape, millimetres. 279.4 = 11 in, 215.9 = 8.5 in.
const (
	pageWidthMm    = 279.4
	pageHeightMm   = 215.9
	marginOuterMm  = 5
	marginGutterMm = 10
	gridCols       = 4
	gridRows       = 8
	arithGridCols  = 3
	arithGridRows  = 6
	sampleSeed     = 20261113
	// classSeed is the next worksheet: new arithmetic and a new geometry shuffle.
	classSeed = 20261116
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
	cols     int
	rows     int
}

func newGeom() sheetGeom {
	return newGeomGrid(gridCols, gridRows)
}

func newArithGeom() sheetGeom {
	return newGeomGrid(arithGridCols, arithGridRows)
}

func newGeomGrid(cols, rows int) sheetGeom {
	contentW := (pageWidthMm - 2*marginOuterMm - marginGutterMm) / 2
	contentH := pageHeightMm - 2*marginOuterMm
	return sheetGeom{
		contentW: contentW,
		contentH: contentH,
		leftX:    marginOuterMm,
		rightX:   marginOuterMm + contentW + marginGutterMm,
		gridTop:  marginOuterMm,
		cellW:    contentW / float64(cols),
		cellH:    contentH / float64(rows),
		cols:     cols,
		rows:     rows,
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
