package arithsheet

import "strconv"

const (
	cellPadMm   = 2.5
	arithCols   = 10
	ruleBandMm  = 0.35
	digitFontPt = 9.75
	nameBandMm  = 6.0
	guideGray   = 0.775
)

func renderArith(mult, div []Factors) string {
	c := newCanvas()
	g := newArithGeom()
	drawArithSide(c, g, g.leftX, mult, "×", true, false)
	drawArithSide(c, g, g.rightX, div, "÷", false, true)
	drawGrid(c, g, g.leftX)
	drawGrid(c, g, g.rightX)
	return c.b.String()
}

func drawGrid(c *canvas, g sheetGeom, originX float64) {
	c.sharpStroke(0.2)
	gridH := g.cellH * float64(g.rows)
	for col := 0; col <= g.cols; col++ {
		x := originX + float64(col)*g.cellW
		c.seg(pt{x, g.gridTop}, pt{x, g.gridTop + gridH})
	}
	for row := 0; row <= g.rows; row++ {
		y := g.gridTop + float64(row)*g.cellH
		c.seg(pt{originX, y}, pt{originX + g.contentW, y})
	}
}

func drawArithSide(c *canvas, g sheetGeom, originX float64, items []Factors, op string, shadeShift, fromLeft bool) {
	for i, item := range items {
		col := i % g.cols
		row := i / g.cols
		drawArithCell(c, g.cell(originX, col, row), item, op, shadeShift, fromLeft)
	}
}

func drawArithCell(c *canvas, cell rectMm, item Factors, op string, shadeShift, fromLeft bool) {
	inner := inset(cell, cellPadMm)
	colW := inner.W / arithCols
	rowH := inner.H / 6
	var rule1, rule2 float64
	if !fromLeft {
		rowH = (inner.H - 2*ruleBandMm) / 6
	}

	tops := make([]float64, 6)
	cursor := inner.Top
	for i := 0; i < 3; i++ {
		tops[i] = cursor
		cursor += rowH
	}
	if !fromLeft {
		rule1 = cursor + ruleBandMm/2
		cursor += ruleBandMm
	}
	for i := 3; i < 5; i++ {
		tops[i] = cursor
		cursor += rowH
	}
	if !fromLeft {
		rule2 = cursor + ruleBandMm/2
		cursor += ruleBandMm
	}
	tops[5] = cursor

	if shadeShift {
		c.fillRect(inner.X+float64(arithCols-1)*colW, tops[4], colW, rowH, 0.86)
	}

	c.setStroke(0.1, guideGray)
	c.b.WriteString("0 J 0 j\n")
	for i := 0; i <= arithCols; i++ {
		x := inner.X + float64(i)*colW
		c.seg(pt{x, inner.Top}, pt{x, inner.Top + inner.H})
	}
	for _, y := range append(append([]float64{}, tops...), inner.Top+inner.H) {
		c.seg(pt{inner.X, y}, pt{inner.X + inner.W, y})
	}

	if !fromLeft {
		c.sharpStroke(0.3)
		c.seg(pt{inner.X, rule1}, pt{inner.X + inner.W, rule1})
		c.seg(pt{inner.X, rule2}, pt{inner.X + inner.W, rule2})
	}

	if fromLeft {
		drawDivision(c, item, inner.X, tops[0], tops[1], rowH, colW)
		return
	}
	drawTwoDigit(c, item.A, inner.X, tops[1], rowH, colW, false)
	drawTwoDigit(c, item.B, inner.X, tops[2], rowH, colW, false)
	opCol := float64(arithCols - 5)
	c.text(op, inner.X+opCol*colW, tops[2], colW, rowH, digitFontPt, true)
}

// drawDivision writes the dividend in the first two columns. A one-digit
// dividend occupies only the ones column, so the tens place stays blank.
// The vertical stroke is the next column line: the one-digit divisor sits to
// its right, on the bottom stroke. That bottom stroke continues one more
// column for the quotient. The vertical stroke also drops through the row below.
func drawDivision(c *canvas, item Factors, innerX, rowTop, belowTop, rowH, colW float64) {
	if item.A >= 10 {
		c.text(strconv.Itoa(item.A/10), innerX, rowTop, colW, rowH, digitFontPt, true)
	}
	c.text(strconv.Itoa(item.A%10), innerX+colW, rowTop, colW, rowH, digitFontPt, true)
	c.text(strconv.Itoa(item.B), innerX+2*colW, rowTop, colW, rowH, digitFontPt, true)

	xBar := innerX + 2*colW
	yJoint := rowTop + rowH
	c.sharpStroke(0.35)
	c.seg(pt{xBar, rowTop}, pt{xBar, belowTop + rowH})
	c.seg(pt{xBar, yJoint}, pt{xBar + 2*colW, yJoint})
}

func drawTwoDigit(c *canvas, n int, innerX, rowTop, rowH, colW float64, fromLeft bool) {
	tens := strconv.Itoa(n / 10)
	ones := strconv.Itoa(n % 10)
	tensCol := float64(arithCols - 2)
	onesCol := float64(arithCols - 1)
	if fromLeft {
		tensCol = 1
		onesCol = 2
	}
	c.text(tens, innerX+tensCol*colW, rowTop, colW, rowH, digitFontPt, true)
	c.text(ones, innerX+onesCol*colW, rowTop, colW, rowH, digitFontPt, true)
}

func inset(r rectMm, pad float64) rectMm {
	return rectMm{X: r.X + pad, Top: r.Top + pad, W: r.W - 2*pad, H: r.H - 2*pad}
}
