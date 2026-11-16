package arithsheet

import "math"

func renderFigures() (string, []sheetImage) {
	c := newCanvas()
	g := newGeom()
	drawFigureSide(c, g, g.leftX, planeFigs)
	drawFigureCells(c, g, g.rightX, solidFigs, loadSolidPhotos())
	drawGrid(c, g, g.leftX)
	drawGrid(c, g, g.rightX)
	return c.b.String(), c.images
}

// renderFiguresScrambled mixes plane and solid figures across both halves
// so a later class does not repeat the catalog order.
func renderFiguresScrambled(seed int64) (string, []sheetImage) {
	c := newCanvas()
	g := newGeom()
	order := scrambledSceneOrder(seed)
	solids := loadSolidPhotos()
	half := (len(order) + 1) / 2
	drawMixedFigures(c, g, g.leftX, order[:half], solids)
	drawMixedFigures(c, g, g.rightX, order[half:], solids)
	drawGrid(c, g, g.leftX)
	drawGrid(c, g, g.rightX)
	return c.b.String(), c.images
}

func drawMixedFigures(c *canvas, g sheetGeom, originX float64, ids []int, solids [][]byte) {
	for i, id := range ids {
		cell := g.cell(originX, i%gridCols, i/gridCols)
		drawNameLine(c, cell)
		box := figureArea(cell)
		if id < len(planeFigs) {
			c.figureStroke()
			planeFigs[id](c, box)
			c.resetColor()
			continue
		}
		si := id - len(planeFigs)
		if si < len(solids) && len(solids[si]) > 0 {
			c.drawPNG(box, solids[si])
			continue
		}
		if si < len(solidFigs) {
			c.figureStroke()
			solidFigs[si](c, box)
			c.resetColor()
		}
	}
}

func drawFigureSide(c *canvas, g sheetGeom, originX float64, figs []func(*canvas, rectMm)) {
	drawFigureCells(c, g, originX, figs, nil)
}

func drawFigureCells(c *canvas, g sheetGeom, originX float64, figs []func(*canvas, rectMm), photos [][]byte) {
	for row := 0; row < gridRows; row++ {
		for col := 0; col < gridCols; col++ {
			cell := g.cell(originX, col, row)
			drawNameLine(c, cell)
			i := row*gridCols + col
			if i >= len(figs) && (photos == nil || i >= len(photos)) {
				continue
			}
			if photos != nil && i < len(photos) && len(photos[i]) > 0 {
				c.drawPNG(figureArea(cell), photos[i])
				continue
			}
			if i >= len(figs) {
				continue
			}
			c.figureStroke()
			figs[i](c, figureArea(cell))
			c.resetColor()
		}
	}
}

func figureArea(cell rectMm) rectMm {
	h := cell.H * 0.75
	return rectMm{
		X:   cell.X + 1.5,
		Top: cell.Top + 0.4,
		W:   cell.W - 3,
		H:   h,
	}
}

func drawNameLine(c *canvas, cell rectMm) {
	y := cell.Top + cell.H*0.77
	c.sharpStroke(0.25)
	c.seg(pt{cell.X + 2.5, y}, pt{cell.X + cell.W - 2.5, y})
}

var planeFigs = []func(*canvas, rectMm){
	drawCircle,
	drawEllipse,
	drawSemicircle,
	drawSquare,
	drawRectangle,
	drawEquilateral,
	drawIsosceles,
	drawScalene,
	drawRightTriangle,
	drawRhombus,
	drawParallelogram,
	drawIsoTrapezoid,
	drawRightTrapezoid,
	drawKite,
	func(c *canvas, box rectMm) { drawRegular(c, box, 5) },
	func(c *canvas, box rectMm) { drawRegular(c, box, 6) },
	func(c *canvas, box rectMm) { drawRegular(c, box, 7) },
	func(c *canvas, box rectMm) { drawRegular(c, box, 8) },
	func(c *canvas, box rectMm) { drawRegular(c, box, 9) },
	func(c *canvas, box rectMm) { drawRegular(c, box, 10) },
	drawQuarter,
	drawAnnulus,
	drawStar,
	drawGreekCross,
}

var solidFigs = []func(*canvas, rectMm){
	drawCube,
	drawCuboid,
	drawSphere,
	drawHemisphere,
	drawCylinder,
	drawCone,
	drawConeFrustum,
	func(c *canvas, box rectMm) { drawPyramid(c, box, 4) },
	func(c *canvas, box rectMm) { drawPyramid(c, box, 3) },
	func(c *canvas, box rectMm) { drawPrism(c, box, 3) },
	func(c *canvas, box rectMm) { drawPrism(c, box, 5) },
	func(c *canvas, box rectMm) { drawPrism(c, box, 6) },
	drawOctahedron,
	drawPyramidFrustum,
	func(c *canvas, box rectMm) { drawPyramid(c, box, 5) },
	drawTorus,
}

func innerSquare(box rectMm, scale float64) rectMm {
	side := math.Min(box.W, box.H) * scale
	return rectMm{
		X:   box.X + (box.W-side)/2,
		Top: box.Top + (box.H-side)/2,
		W:   side,
		H:   side,
	}
}

func drawNorm(c *canvas, box rectMm, pts [][2]float64) {
	sq := innerSquare(box, 0.98)
	out := make([]pt, len(pts))
	for i, p := range pts {
		out[i] = pt{x: sq.X + p[0]*sq.W, top: sq.Top + (1-p[1])*sq.H}
	}
	c.poly(out, true)
}

func drawRegular(c *canvas, box rectMm, n int) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	ctop := sq.Top + sq.H/2
	a0 := -math.Pi/2 + math.Pi/float64(n)
	half := sq.W / 2
	r := half * 0.98 / polyExtent(n, a0)
	c.poly(ellipsePoly(cx, ctop, r, r, n, a0), true)
}

func fillStrokeRegular(c *canvas, box rectMm, n int, fr, fg, fb, sr, sg, sb, widthMm float64) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	ctop := sq.Top + sq.H/2
	a0 := -math.Pi/2 + math.Pi/float64(n)
	half := sq.W / 2
	r := half * 0.98 / polyExtent(n, a0)
	c.fillStrokePoly(ellipsePoly(cx, ctop, r, r, n, a0), fr, fg, fb, sr, sg, sb, widthMm)
}

func fillStrokeStar(c *canvas, box rectMm, fr, fg, fb, sr, sg, sb, widthMm float64) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	ctop := sq.Top + sq.H/2
	outer := sq.W * 0.48
	inner := outer * 0.4
	pts := make([]pt, 10)
	for i := 0; i < 10; i++ {
		ang := math.Pi/2 + float64(i)*math.Pi/5
		rad := outer
		if i%2 == 1 {
			rad = inner
		}
		pts[i] = pt{x: cx + rad*math.Cos(ang), top: ctop - rad*math.Sin(ang)}
	}
	c.fillStrokePoly(pts, fr, fg, fb, sr, sg, sb, widthMm)
}

func fillStrokeGreekCross(c *canvas, box rectMm, fr, fg, fb, sr, sg, sb, widthMm float64) {
	sq := innerSquare(box, 0.98)
	normPts := [][2]float64{
		{0.34, 1}, {0.66, 1}, {0.66, 0.66}, {1, 0.66}, {1, 0.34}, {0.66, 0.34},
		{0.66, 0}, {0.34, 0}, {0.34, 0.34}, {0, 0.34}, {0, 0.66}, {0.34, 0.66},
	}
	pts := make([]pt, len(normPts))
	for i, p := range normPts {
		pts[i] = pt{x: sq.X + p[0]*sq.W, top: sq.Top + (1-p[1])*sq.H}
	}
	c.fillStrokePoly(pts, fr, fg, fb, sr, sg, sb, widthMm)
}

func polyExtent(n int, a0 float64) float64 {
	maxE := 0.0
	for i := 0; i < n; i++ {
		a := a0 + 2*math.Pi*float64(i)/float64(n)
		maxE = math.Max(maxE, math.Abs(math.Cos(a)))
		maxE = math.Max(maxE, math.Abs(math.Sin(a)))
	}
	if maxE < 1e-6 {
		return 1
	}
	return maxE
}

func ellipsePoly(cx, ctop, rx, ry float64, n int, a0 float64) []pt {
	pts := make([]pt, n)
	for i := 0; i < n; i++ {
		ang := a0 + 2*math.Pi*float64(i)/float64(n)
		pts[i] = pt{x: cx + rx*math.Cos(ang), top: ctop - ry*math.Sin(ang)}
	}
	return pts
}

func drawCircle(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	r := sq.W / 2
	c.ellipse(sq.X+r, sq.Top+r, r, r)
}

func drawEllipse(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	rx := sq.W * 0.48
	ry := sq.H * 0.38
	c.ellipse(box.X+box.W/2, box.Top+box.H/2, rx, ry)
}

func drawSemicircle(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	r := sq.W * 0.49
	cx := sq.X + sq.W/2
	ctop := sq.Top + sq.H*0.58
	c.arc(cx, ctop, r, r, 0, math.Pi)
	eastX, eastT := polar(cx, ctop, r, r, 0)
	c.lineTo(eastX, eastT)
	c.stroke()
}

func drawSquare(c *canvas, box rectMm) { drawRegular(c, box, 4) }

func drawRectangle(c *canvas, box rectMm) {
	w := box.W * 0.90
	h := box.H * 0.65
	x := box.X + (box.W-w)/2
	top := box.Top + (box.H-h)/2
	c.rect(x, top, w, h)
}

func drawEquilateral(c *canvas, box rectMm) { drawRegular(c, box, 3) }

func drawIsosceles(c *canvas, box rectMm) {
	drawNorm(c, box, [][2]float64{{0.5, 0.96}, {0.06, 0.06}, {0.94, 0.06}})
}

func drawScalene(c *canvas, box rectMm) {
	drawNorm(c, box, [][2]float64{{0.22, 0.94}, {0.06, 0.08}, {0.94, 0.30}})
}

func drawRightTriangle(c *canvas, box rectMm) {
	drawNorm(c, box, [][2]float64{{0.08, 0.08}, {0.92, 0.08}, {0.08, 0.92}})
}

func drawRhombus(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	ctop := sq.Top + sq.H/2
	c.poly(ellipsePoly(cx, ctop, sq.W*0.32, sq.H*0.48, 4, math.Pi/2), true)
}

func drawParallelogram(c *canvas, box rectMm) {
	drawNorm(c, box, [][2]float64{{0.22, 0.14}, {0.96, 0.14}, {0.78, 0.86}, {0.04, 0.86}})
}

func drawIsoTrapezoid(c *canvas, box rectMm) {
	drawNorm(c, box, [][2]float64{{0.26, 0.86}, {0.74, 0.86}, {0.94, 0.12}, {0.06, 0.12}})
}

func drawRightTrapezoid(c *canvas, box rectMm) {
	drawNorm(c, box, [][2]float64{{0.10, 0.86}, {0.64, 0.86}, {0.92, 0.12}, {0.10, 0.12}})
}

func drawKite(c *canvas, box rectMm) {
	drawNorm(c, box, [][2]float64{{0.5, 0.96}, {0.88, 0.58}, {0.5, 0.06}, {0.12, 0.58}})
}

func drawQuarter(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W*0.10
	ctop := sq.Top + sq.H*0.90
	r := sq.W * 0.80
	c.moveTo(cx, ctop)
	ex, et := polar(cx, ctop, r, r, 0)
	c.lineTo(ex, et)
	c.arcSeg(cx, ctop, r, r, 0, math.Pi/2, false)
	c.b.WriteString("h\n")
	c.stroke()
}

func drawAnnulus(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	r := sq.W / 2
	cx := sq.X + r
	ctop := sq.Top + r
	c.ellipse(cx, ctop, r*0.98, r*0.98)
	c.ellipse(cx, ctop, r*0.52, r*0.52)
}

func drawStar(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	ctop := sq.Top + sq.H/2
	outer := sq.W * 0.48
	inner := outer * 0.4
	pts := make([]pt, 10)
	for i := 0; i < 10; i++ {
		ang := math.Pi/2 + float64(i)*math.Pi/5
		rad := outer
		if i%2 == 1 {
			rad = inner
		}
		pts[i] = pt{x: cx + rad*math.Cos(ang), top: ctop - rad*math.Sin(ang)}
	}
	c.poly(pts, true)
}

func drawGreekCross(c *canvas, box rectMm) {
	drawNorm(c, box, [][2]float64{
		{0.34, 1}, {0.66, 1}, {0.66, 0.66}, {1, 0.66}, {1, 0.34}, {0.66, 0.34},
		{0.66, 0}, {0.34, 0}, {0.34, 0.34}, {0, 0.34}, {0, 0.66}, {0.34, 0.66},
	})
}

func drawCube(c *canvas, box rectMm) { drawCabinet(c, box, 0.34, 0.34, true) }

func drawCuboid(c *canvas, box rectMm) { drawCabinet(c, box, 0.22, 0.28, false) }

// drawCabinet draws the three visible faces of a box. square forces a square front.
func drawCabinet(c *canvas, box rectMm, dxR, dyR float64, square bool) {
	var bounds rectMm
	if square {
		bounds = innerSquare(box, 0.98)
	} else {
		bounds = inset(box, box.W*0.02)
		bounds.H = math.Min(box.H*0.96, bounds.W*0.72)
		bounds.Top = box.Top + (box.H-bounds.H)/2
	}
	dx := bounds.W * dxR
	dy := bounds.H * dyR
	fw := bounds.W - dx
	fh := bounds.H - dy
	x0 := bounds.X
	bottom := bounds.Top + bounds.H
	bl := pt{x0, bottom}
	br := pt{x0 + fw, bottom}
	tr := pt{x0 + fw, bottom - fh}
	tl := pt{x0, bottom - fh}
	off := func(p pt) pt { return pt{p.x + dx, p.top - dy} }
	c.poly([]pt{bl, br, tr, tl}, true)
	c.poly([]pt{tl, tr, off(tr), off(tl)}, true)
	c.poly([]pt{tr, br, off(br), off(tr)}, true)
}

func drawSphere(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	r := sq.W / 2
	cx := sq.X + r
	ctop := sq.Top + r
	c.ellipse(cx, ctop, r, r)
	c.ellipse(cx, ctop, r, r*0.32)
}

func drawHemisphere(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	r := sq.W * 0.48
	cx := sq.X + sq.W/2
	base := sq.Top + sq.H*0.64
	c.ellipse(cx, base, r, r*0.28)
	c.arc(cx, base, r, r, 0, math.Pi)
	c.stroke()
}

func drawCylinder(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	rx := sq.W * 0.42
	ry := sq.H * 0.14
	topY := sq.Top + sq.H*0.16
	botY := sq.Top + sq.H*0.84
	c.ellipse(cx, topY, rx, ry)
	c.ellipse(cx, botY, rx, ry)
	c.seg(pt{cx - rx, topY}, pt{cx - rx, botY})
	c.seg(pt{cx + rx, topY}, pt{cx + rx, botY})
}

func drawCone(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	rx := sq.W * 0.44
	ry := sq.H * 0.14
	base := sq.Top + sq.H*0.82
	apex := pt{cx, sq.Top + sq.H*0.06}
	c.ellipse(cx, base, rx, ry)
	c.seg(apex, pt{cx - rx, base})
	c.seg(apex, pt{cx + rx, base})
}

func drawConeFrustum(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	rx := sq.W * 0.44
	ry := sq.H * 0.13
	topY := sq.Top + sq.H*0.18
	botY := sq.Top + sq.H*0.82
	c.ellipse(cx, topY, rx*0.42, ry*0.42)
	c.ellipse(cx, botY, rx, ry)
	c.seg(pt{cx - rx*0.42, topY}, pt{cx - rx, botY})
	c.seg(pt{cx + rx*0.42, topY}, pt{cx + rx, botY})
}

func drawPyramid(c *canvas, box rectMm, n int) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	rx := sq.W * 0.44
	ry := sq.H * 0.16
	a0 := -math.Pi/2 + math.Pi/float64(n)
	base := ellipsePoly(cx, sq.Top+sq.H*0.82, rx, ry, n, a0)
	apex := pt{cx, sq.Top + sq.H*0.06}
	c.poly(base, true)
	for _, p := range base {
		c.seg(apex, p)
	}
}

func drawPrism(c *canvas, box rectMm, n int) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	rx := sq.W * 0.42
	ry := sq.H * 0.15
	a0 := -math.Pi/2 + math.Pi/float64(n)
	bot := ellipsePoly(cx, sq.Top+sq.H*0.80, rx, ry, n, a0)
	top := ellipsePoly(cx, sq.Top+sq.H*0.20, rx, ry, n, a0)
	c.poly(bot, true)
	c.poly(top, true)
	for i := range bot {
		c.seg(bot[i], top[i])
	}
}

func drawOctahedron(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	mid := sq.Top + sq.H/2
	eq := ellipsePoly(cx, mid, sq.W*0.44, sq.H*0.16, 4, math.Pi/4)
	top := pt{cx, sq.Top + sq.H*0.06}
	bot := pt{cx, sq.Top + sq.H*0.94}
	c.poly(eq, true)
	for _, p := range eq {
		c.seg(top, p)
		c.seg(bot, p)
	}
}

func drawPyramidFrustum(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	a0 := -math.Pi/2 + math.Pi/4
	bot := ellipsePoly(cx, sq.Top+sq.H*0.82, sq.W*0.44, sq.H*0.16, 4, a0)
	top := ellipsePoly(cx, sq.Top+sq.H*0.22, sq.W*0.22, sq.H*0.08, 4, a0)
	c.poly(bot, true)
	c.poly(top, true)
	for i := range bot {
		c.seg(bot[i], top[i])
	}
}

func drawTorus(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	ctop := sq.Top + sq.H/2
	rx := sq.W * 0.46
	ry := sq.H * 0.28
	c.ellipse(cx, ctop, rx, ry)
	c.ellipse(cx, ctop, rx*0.5, ry*0.5)
}
