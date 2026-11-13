package arithsheet

import "strconv"

const (
	cellInsetMm = 0.4
	ruleBandMm  = 0.35
	opColMm     = 4.0
	arithFontPt = 8.0
	nameBandMm  = 4.6
)

func renderArith(mult, div []Factors) string {
	c := newCanvas()
	g := newGeom()
	drawHalfChrome(c, g, g.leftX, "Multiplicación")
	drawHalfChrome(c, g, g.rightX, "División")
	drawArithSide(c, g, g.leftX, mult, "×", true)
	drawArithSide(c, g, g.rightX, div, "÷", false)
	drawGrid(c, g, g.leftX)
	drawGrid(c, g, g.rightX)
	return c.b.String()
}

func drawHalfChrome(c *canvas, g sheetGeom, x float64, topic string) {
	fields := headerFields(x, g.contentW)
	labels := []string{"Nombre", "Fecha", "Tema: " + topic}
	c.sharpStroke(0.2)
	for i, field := range fields {
		field.Top = marginOuterMm
		field.H = headerHeightMm
		c.rect(field.X, field.Top, field.W, field.H)
		c.text(labels[i], field.X, field.Top, field.W, field.H, arithFontPt, false)
	}
}

func headerFields(x, w float64) []rectMm {
	const gap = 1.5
	weights := []float64{0.34, 0.28, 0.38}
	usable := w - 2*gap
	out := make([]rectMm, len(weights))
	cursor := x
	for i, wt := range weights {
		fw := usable * wt
		out[i] = rectMm{X: cursor, W: fw}
		cursor += fw + gap
	}
	return out
}

func drawGrid(c *canvas, g sheetGeom, originX float64) {
	c.sharpStroke(0.2)
	gridH := g.cellH * gridRows
	for col := 0; col <= gridCols; col++ {
		x := originX + float64(col)*g.cellW
		c.seg(pt{x, g.gridTop}, pt{x, g.gridTop + gridH})
	}
	for row := 0; row <= gridRows; row++ {
		y := g.gridTop + float64(row)*g.cellH
		c.seg(pt{originX, y}, pt{originX + g.contentW, y})
	}
}

func drawArithSide(c *canvas, g sheetGeom, originX float64, items []Factors, op string, shadeShift bool) {
	for i, item := range items {
		col := i % gridCols
		row := i / gridCols
		drawArithCell(c, g.cell(originX, col, row), item, op, shadeShift)
	}
}

func drawArithCell(c *canvas, cell rectMm, item Factors, op string, shadeShift bool) {
	inner := inset(cell, cellInsetMm)
	rowH := (inner.H - 2*ruleBandMm) / 6
	digW := (inner.W - opColMm) / 4

	tops := make([]float64, 6)
	cursor := inner.Top
	for i := 0; i < 3; i++ {
		tops[i] = cursor
		cursor += rowH
	}
	rule1 := cursor + ruleBandMm/2
	cursor += ruleBandMm
	for i := 3; i < 5; i++ {
		tops[i] = cursor
		cursor += rowH
	}
	rule2 := cursor + ruleBandMm/2
	cursor += ruleBandMm
	tops[5] = cursor

	if shadeShift {
		c.fillRect(inner.X+opColMm+3*digW, tops[4], digW, rowH, 0.86)
	}

	c.setStroke(0.1, 0.55)
	c.b.WriteString("0 J 0 j\n")
	for i := 0; i <= 4; i++ {
		x := inner.X + opColMm + float64(i)*digW
		c.seg(pt{x, inner.Top}, pt{x, inner.Top + inner.H})
	}

	c.sharpStroke(0.3)
	c.seg(pt{inner.X, rule1}, pt{inner.X + inner.W, rule1})
	c.seg(pt{inner.X, rule2}, pt{inner.X + inner.W, rule2})

	drawTwoDigit(c, item.A, inner.X, tops[1], rowH, digW)
	drawTwoDigit(c, item.B, inner.X, tops[2], rowH, digW)
	c.text(op, inner.X, tops[2], opColMm, rowH, arithFontPt, true)
}

func drawTwoDigit(c *canvas, n int, innerX, rowTop, rowH, digW float64) {
	tens := strconv.Itoa(n / 10)
	ones := strconv.Itoa(n % 10)
	c.text(tens, innerX+opColMm+2*digW, rowTop, digW, rowH, arithFontPt, true)
	c.text(ones, innerX+opColMm+3*digW, rowTop, digW, rowH, arithFontPt, true)
}

func inset(r rectMm, pad float64) rectMm {
	return rectMm{X: r.X + pad, Top: r.Top + pad, W: r.W - 2*pad, H: r.H - 2*pad}
}
