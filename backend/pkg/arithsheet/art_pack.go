package arithsheet

import "math"

// This pack deliberately replaces the outline-only catalogue with painted,
// child-friendly objects.  Every drawing stays inside the supplied figure box:
// page coordinates use CSS-style Top (increasing towards the bottom).
const artEdge = 0.28

func init() {
	solidFigs = []func(*canvas, rectMm){
		artCube, artCuboid, artSphere, artHemisphere, artCylinder, artCone,
		artFrustum, artSquarePyramid, artTetrahedron, artTriPrism,
		artPentPrism, artHexPrism, artOctahedron, artPyramidFrustum,
		artPentPyramid, artTorus,
	}
	sceneFigs = []func(*canvas, rectMm){
		artClock, artEye, artSunrise, artWindow, artPhone, artWarning,
		artPine, artSailboat, artSetSquare, artKite, artFlag, artPot,
		artRamp, artTop, artHouse, artHoneycomb, artMedal, artStop,
		artNineBadge, artUmbrella, artPizza, artDonut, artWand, artKit,
		artDie, artBook, artGlobe, artBowl, artCan, artIceCream, artCoffee,
		artEgypt, artTetraTent, artCamp, artTower, artPencil, artGem,
		artMaya, artCircus, artLifeRing,
	}
}

func artBox(b rectMm) rectMm {
	return rectMm{X: b.X + b.W*.01, Top: b.Top + b.H*.01, W: b.W * .98, H: b.H * .98}
}

func ap(b rectMm, x, y float64) pt { return pt{b.X + b.W*x, b.Top + b.H*y} }

func artPoly(c *canvas, b rectMm, xy [][2]float64, col [3]float64) {
	p := make([]pt, len(xy))
	for i, v := range xy {
		p[i] = ap(b, v[0], v[1])
	}
	c.fillStrokePoly(p, col[0], col[1], col[2], .10, .12, .16, artEdge)
}

func artLine(c *canvas, b rectMm, a, z [2]float64, col [3]float64, w float64) {
	c.lineRGB(ap(b, a[0], a[1]), ap(b, z[0], z[1]), col[0], col[1], col[2], w)
}

func artEllipse(c *canvas, b rectMm, x, y, rx, ry float64, col [3]float64) {
	c.fillStrokeEllipse(b.X+b.W*x, b.Top+b.H*y, b.W*rx, b.H*ry, col[0], col[1], col[2], .10, .12, .16, artEdge)
}

func artCircle(c *canvas, b rectMm, x, y, r float64, col [3]float64) {
	c.fillStrokeCircle(b.X+b.W*x, b.Top+b.H*y, b.W*r, col[0], col[1], col[2], .10, .12, .16, artEdge)
}

var (
	artInk    = [3]float64{.10, .12, .16}
	artLight  = [3]float64{.98, .98, .94}
	artIvory  = [3]float64{.92, .86, .70}
	artShadow = [3]float64{.48, .55, .68}
)

// --- Solid geometry ---------------------------------------------------------

func artCube(c *canvas, box rectMm) {
	b := artBox(box)
	// Back-to-front painter's order gives a crisp isometric solid.
	artPoly(c, b, [][2]float64{{.18, .34}, {.55, .10}, {.88, .31}, {.51, .54}}, artLight)
	artPoly(c, b, [][2]float64{{.18, .34}, {.51, .54}, {.51, .91}, {.18, .69}}, artIvory)
	artPoly(c, b, [][2]float64{{.51, .54}, {.88, .31}, {.88, .67}, {.51, .91}}, artShadow)
	artLine(c, b, [2]float64{.51, .54}, [2]float64{.51, .91}, artInk, artEdge)
}

func artCuboid(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.08, .35}, {.62, .14}, {.93, .31}, {.39, .53}}, [3]float64{.90, .95, 1})
	artPoly(c, b, [][2]float64{{.08, .35}, {.39, .53}, {.39, .85}, {.08, .68}}, [3]float64{.72, .84, .94})
	artPoly(c, b, [][2]float64{{.39, .53}, {.93, .31}, {.93, .63}, {.39, .85}}, [3]float64{.34, .51, .70})
}

func artSphere(c *canvas, box rectMm) {
	b := artBox(box)
	// Nested coloured discs emulate a radial highlight without raster gradients.
	for _, v := range []struct {
		x, y, r float64
		q       [3]float64
	}{
		{.51, .53, .45, [3]float64{.16, .39, .78}},
		{.47, .48, .38, [3]float64{.20, .52, .91}},
		{.42, .42, .28, [3]float64{.38, .70, .98}},
		{.35, .33, .11, [3]float64{.88, .96, 1}},
	} {
		artCircle(c, b, v.x, v.y, v.r, v.q)
	}
}

func artHemisphere(c *canvas, box rectMm) {
	b := artBox(box)
	artEllipse(c, b, .50, .72, .43, .13, [3]float64{.25, .33, .46})
	c.fillStrokePie(b.X+b.W*.50, b.Top+b.H*.72, b.W*.43, b.H*.53, 0, math.Pi, .25, .63, .92, .10, .12, .16, artEdge)
	// Convex highlight and visible base rim.
	c.fillEllipse(b.X+b.W*.40, b.Top+b.H*.52, b.W*.15, b.H*.25, .52, .82, .98)
	artEllipse(c, b, .50, .72, .43, .13, [3]float64{.16, .42, .66})
	artEllipse(c, b, .50, .70, .33, .08, [3]float64{.68, .91, 1})
}

func artCylinder(c *canvas, box rectMm) {
	b := artBox(box)
	artEllipse(c, b, .50, .78, .38, .12, [3]float64{.19, .39, .64})
	artPoly(c, b, [][2]float64{{.12, .23}, {.88, .23}, {.88, .78}, {.12, .78}}, [3]float64{.30, .62, .91})
	// A tall bright strip and a dark side curve communicate roundness.
	c.fillRectRGB(b.X+b.W*.21, b.Top+b.H*.27, b.W*.18, b.H*.46, .64, .86, 1)
	c.fillRectRGB(b.X+b.W*.72, b.Top+b.H*.27, b.W*.12, b.H*.46, .14, .35, .63)
	artEllipse(c, b, .50, .23, .38, .12, [3]float64{.72, .91, 1})
	artEllipse(c, b, .50, .23, .25, .065, [3]float64{.30, .59, .85})
}

func artCone(c *canvas, box rectMm) {
	b := artBox(box)
	artEllipse(c, b, .50, .79, .42, .13, [3]float64{.20, .35, .60})
	artPoly(c, b, [][2]float64{{.50, .08}, {.50, .79}, {.08, .79}}, [3]float64{.30, .70, .94})
	artPoly(c, b, [][2]float64{{.50, .08}, {.92, .79}, {.50, .79}}, [3]float64{.12, .38, .70})
	artLine(c, b, [2]float64{.50, .08}, [2]float64{.50, .79}, [3]float64{.82, .94, 1}, .20)
	artEllipse(c, b, .50, .79, .42, .13, [3]float64{.24, .52, .82})
}

func artFrustum(c *canvas, box rectMm) {
	b := artBox(box)
	artEllipse(c, b, .50, .78, .42, .13, [3]float64{.25, .38, .62})
	artPoly(c, b, [][2]float64{{.28, .25}, {.50, .32}, {.50, .78}, {.08, .78}}, [3]float64{.35, .73, .91})
	artPoly(c, b, [][2]float64{{.50, .32}, {.72, .25}, {.92, .78}, {.50, .78}}, [3]float64{.13, .42, .66})
	artEllipse(c, b, .50, .25, .22, .07, [3]float64{.75, .94, 1})
	artEllipse(c, b, .50, .25, .14, .04, [3]float64{.35, .62, .80})
}

func artSquarePyramid(c *canvas, box rectMm) {
	b := artBox(box)
	a := [2]float64{.49, .08}
	artPoly(c, b, [][2]float64{a, {.88, .69}, {.50, .88}}, [3]float64{.73, .45, .16})
	artPoly(c, b, [][2]float64{a, {.50, .88}, {.10, .68}}, [3]float64{.96, .72, .30})
	artPoly(c, b, [][2]float64{a, {.10, .68}, {.49, .51}, {.88, .69}}, [3]float64{1, .86, .48})
}

func artTetrahedron(c *canvas, box rectMm) {
	b := artBox(box)
	a := [2]float64{.48, .08}
	artPoly(c, b, [][2]float64{a, {.88, .77}, {.49, .91}}, [3]float64{.24, .44, .77})
	artPoly(c, b, [][2]float64{a, {.49, .91}, {.12, .72}}, [3]float64{.54, .76, .98})
	artPoly(c, b, [][2]float64{a, {.12, .72}, {.88, .77}}, [3]float64{.81, .92, 1})
}

func artTriPrism(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.25, .20}, {.69, .20}, {.91, .42}, {.47, .42}}, [3]float64{.89, .96, 1})
	artPoly(c, b, [][2]float64{{.47, .42}, {.91, .42}, {.91, .82}, {.47, .82}}, [3]float64{.24, .50, .79})
	artPoly(c, b, [][2]float64{{.06, .82}, {.47, .42}, {.47, .82}}, [3]float64{.31, .72, .92})
	artPoly(c, b, [][2]float64{{.06, .82}, {.25, .20}, {.47, .42}}, [3]float64{.62, .87, 1})
}

func artPrism(c *canvas, box rectMm, n int, col [3]float64) {
	b := artBox(box)
	cx, cy := b.X+b.W*.50, b.Top+b.H*.31
	top := ellipsePoly(cx, cy, b.W*.34, b.H*.17, n, -math.Pi/2+math.Pi/float64(n))
	bottom := ellipsePoly(cx, b.Top+b.H*.80, b.W*.34, b.H*.17, n, -math.Pi/2+math.Pi/float64(n))
	// Back faces first, then the three nearest vertical faces.
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		mid := (top[i].top + top[j].top) / 2
		if mid < cy {
			continue
		}
		shade := .68 + .08*float64(i%3)
		c.fillStrokePoly([]pt{top[i], top[j], bottom[j], bottom[i]}, col[0]*shade, col[1]*shade, col[2]*shade, .10, .12, .16, artEdge)
	}
	c.fillStrokePoly(top, col[0]*1.14, col[1]*1.12, math.Min(1, col[2]*1.10), .10, .12, .16, artEdge)
}

func artPentPrism(c *canvas, box rectMm) { artPrism(c, box, 5, [3]float64{.36, .67, .89}) }
func artHexPrism(c *canvas, box rectMm)  { artPrism(c, box, 6, [3]float64{.46, .62, .88}) }

func artOctahedron(c *canvas, box rectMm) {
	b := artBox(box)
	top, bot := [2]float64{.50, .06}, [2]float64{.50, .94}
	l, r, f, back := [2]float64{.08, .50}, [2]float64{.92, .50}, [2]float64{.50, .68}, [2]float64{.50, .32}
	artPoly(c, b, [][2]float64{top, back, r}, [3]float64{.50, .80, 1})
	artPoly(c, b, [][2]float64{top, l, back}, [3]float64{.80, .94, 1})
	artPoly(c, b, [][2]float64{top, f, l}, [3]float64{.35, .66, .94})
	artPoly(c, b, [][2]float64{top, r, f}, [3]float64{.18, .45, .77})
	artPoly(c, b, [][2]float64{bot, l, f}, [3]float64{.20, .45, .75})
	artPoly(c, b, [][2]float64{bot, f, r}, [3]float64{.12, .31, .61})
}

func artPyramidFrustum(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.29, .27}, {.68, .35}, {.91, .75}, {.50, .88}}, [3]float64{.27, .49, .75})
	artPoly(c, b, [][2]float64{{.10, .68}, {.29, .27}, {.50, .41}, {.50, .88}}, [3]float64{.62, .80, .96})
	artPoly(c, b, [][2]float64{{.29, .27}, {.68, .35}, {.50, .52}, {.10, .68}}, [3]float64{.88, .96, 1})
}

func artPentPyramid(c *canvas, box rectMm) {
	b := artBox(box)
	a := [2]float64{.50, .07}
	artPoly(c, b, [][2]float64{a, {.88, .67}, {.63, .89}}, [3]float64{.25, .47, .78})
	artPoly(c, b, [][2]float64{a, {.63, .89}, {.35, .89}}, [3]float64{.42, .67, .94})
	artPoly(c, b, [][2]float64{a, {.35, .89}, {.10, .67}}, [3]float64{.68, .85, 1})
	artPoly(c, b, [][2]float64{a, {.10, .67}, {.50, .46}, {.88, .67}}, [3]float64{.86, .95, 1})
}

func artTorus(c *canvas, box rectMm) {
	b := artBox(box)
	// Stacked ellipses form the far rim, tube body, and near opening.
	artEllipse(c, b, .50, .54, .45, .29, [3]float64{.25, .35, .64})
	artEllipse(c, b, .50, .49, .42, .24, [3]float64{.40, .66, .95})
	artEllipse(c, b, .50, .47, .28, .13, [3]float64{.12, .22, .39})
	artEllipse(c, b, .50, .44, .20, .08, [3]float64{.84, .95, 1})
	c.fillEllipse(b.X+b.W*.37, b.Top+b.H*.35, b.W*.10, b.H*.07, .88, .97, 1)
}

// --- Everyday flat illustrations -------------------------------------------

func artClock(c *canvas, box rectMm) {
	b := artBox(box)
	artCircle(c, b, .5, .5, .43, [3]float64{.20, .36, .70})
	artCircle(c, b, .5, .5, .34, artLight)
	for _, a := range []float64{0, math.Pi / 2, math.Pi, 3 * math.Pi / 2} {
		c.fillCircle(b.X+b.W*(.5+.27*math.Cos(a)), b.Top+b.H*(.5+.27*math.Sin(a)), b.W*.025, .12, .15, .22)
	}
	artLine(c, b, [2]float64{.5, .5}, [2]float64{.5, .27}, [3]float64{.18, .33, .70}, .32)
	artLine(c, b, [2]float64{.5, .5}, [2]float64{.68, .59}, [3]float64{.88, .18, .18}, .42)
}
func artEye(c *canvas, box rectMm) {
	b := artBox(box)
	artEllipse(c, b, .5, .5, .46, .27, artLight)
	artCircle(c, b, .5, .5, .18, [3]float64{.20, .66, .90})
	artCircle(c, b, .5, .5, .08, artInk)
	c.fillCircle(b.X+b.W*.56, b.Top+b.H*.43, b.W*.035, 1, 1, 1)
}
func artSunrise(c *canvas, box rectMm) {
	b := artBox(box)
	c.fillStrokePie(b.X+b.W*.5, b.Top+b.H*.65, b.W*.29, b.H*.30, 0, math.Pi, 1, .72, .10, .55, .30, .05, artEdge)
	c.fillRectRGB(b.X, b.Top+b.H*.65, b.W, b.H*.26, .20, .60, .88)
	for _, x := range []float64{.12, .38, .62} {
		artLine(c, b, [2]float64{x, .80}, [2]float64{x + .18, .80}, [3]float64{.85, .96, 1}, .18)
	}
}
func artWindow(c *canvas, box rectMm) {
	b := artBox(box)
	c.fillStrokeRectRGB(b.X+b.W*.12, b.Top+b.H*.08, b.W*.76, b.H*.82, .58, .32, .13, .20, .12, .06, artEdge)
	for _, p := range [][2]float64{{.18, .15}, {.54, .15}, {.18, .53}, {.54, .53}} {
		c.fillStrokeRectRGB(b.X+b.W*p[0], b.Top+b.H*p[1], b.W*.28, b.H*.27, .56, .84, .98, .2, .42, .62, .16)
	}
}
func artPhone(c *canvas, box rectMm) {
	b := artBox(box)
	c.fillStrokeRectRGB(b.X+b.W*.28, b.Top+b.H*.05, b.W*.44, b.H*.90, .14, .18, .26, .05, .07, .10, artEdge)
	c.fillStrokeRectRGB(b.X+b.W*.32, b.Top+b.H*.16, b.W*.36, b.H*.61, .24, .68, .91, .08, .30, .48, .18)
	c.fillCircle(b.X+b.W*.5, b.Top+b.H*.85, b.W*.03, .8, .85, .9)
}
func artWarning(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.5, .06}, {.93, .88}, {.07, .88}}, [3]float64{1, .78, .10})
	artLine(c, b, [2]float64{.5, .29}, [2]float64{.5, .62}, artInk, .35)
	artCircle(c, b, .5, .76, .035, artInk)
}
func artPine(c *canvas, box rectMm) {
	b := artBox(box)
	c.fillStrokeRectRGB(b.X+b.W*.44, b.Top+b.H*.65, b.W*.12, b.H*.25, .43, .24, .10, .20, .1, .04, artEdge)
	for _, t := range [][2]float64{{.50, .06}, {.34, .34}, {.66, .34}, {.22, .66}, {.78, .66}} {
		_ = t
	}
	artPoly(c, b, [][2]float64{{.5, .05}, {.16, .70}, {.84, .70}}, [3]float64{.12, .52, .25})
	artPoly(c, b, [][2]float64{{.5, .24}, {.10, .86}, {.90, .86}}, [3]float64{.16, .66, .31})
}
func artSailboat(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.12, .72}, {.88, .72}, {.72, .88}, {.28, .88}}, [3]float64{.26, .42, .72})
	artLine(c, b, [2]float64{.5, .16}, [2]float64{.5, .73}, artInk, .22)
	artPoly(c, b, [][2]float64{{.48, .19}, {.48, .64}, {.17, .64}}, [3]float64{1, .92, .55})
	artPoly(c, b, [][2]float64{{.52, .24}, {.52, .65}, {.81, .65}}, [3]float64{.88, .18, .22})
}
func artSetSquare(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.12, .84}, {.12, .12}, {.88, .84}}, [3]float64{.30, .72, .92})
	artPoly(c, b, [][2]float64{{.26, .70}, {.26, .36}, {.62, .70}}, artLight)
}
func artKite(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.5, .06}, {.87, .43}, {.5, .83}, {.13, .43}}, [3]float64{.82, .22, .62})
	artPoly(c, b, [][2]float64{{.5, .06}, {.5, .83}, {.13, .43}}, [3]float64{.26, .70, .94})
	artLine(c, b, [2]float64{.5, .83}, [2]float64{.76, .96}, artInk, .16)
	artPoly(c, b, [][2]float64{{.67, .89}, {.77, .92}, {.72, .98}}, [3]float64{1, .75, .12})
}
func artFlag(c *canvas, box rectMm) {
	b := artBox(box)
	artLine(c, b, [2]float64{.18, .08}, [2]float64{.18, .92}, [3]float64{.28, .30, .34}, .30)
	artPoly(c, b, [][2]float64{{.20, .12}, {.84, .24}, {.20, .50}}, [3]float64{.92, .17, .20})
}
func artPot(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.24, .50}, {.76, .50}, {.66, .90}, {.34, .90}}, [3]float64{.88, .38, .15})
	artEllipse(c, b, .5, .50, .27, .08, [3]float64{.28, .16, .08})
	artPoly(c, b, [][2]float64{{.50, .52}, {.26, .16}, {.46, .30}}, [3]float64{.20, .65, .32})
	artPoly(c, b, [][2]float64{{.50, .52}, {.74, .18}, {.56, .31}}, [3]float64{.28, .78, .39})
}
func artRamp(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.10, .82}, {.83, .82}, {.83, .62}, {.62, .35}, {.43, .35}, {.64, .62}, {.10, .62}}, [3]float64{.38, .72, .92})
	artLine(c, b, [2]float64{.10, .82}, [2]float64{.83, .82}, artInk, .30)
}
func artTop(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.50, .10}, {.76, .42}, {.59, .78}, {.50, .92}, {.41, .78}, {.24, .42}}, [3]float64{.78, .22, .62})
	artPoly(c, b, [][2]float64{{.50, .10}, {.50, .92}, {.24, .42}}, [3]float64{.28, .66, .95})
	artCircle(c, b, .5, .10, .05, [3]float64{1, .76, .10})
}
func artHouse(c *canvas, box rectMm) {
	b := artBox(box)
	c.fillStrokeRectRGB(b.X+b.W*.22, b.Top+b.H*.48, b.W*.56, b.H*.38, .96, .72, .32, .42, .22, .08, artEdge)
	artPoly(c, b, [][2]float64{{.12, .49}, {.50, .10}, {.88, .49}}, [3]float64{.84, .20, .20})
	c.fillStrokeRectRGB(b.X+b.W*.44, b.Top+b.H*.62, b.W*.13, b.H*.24, .38, .22, .12, .18, .1, .06, .16)
}
func artHoneycomb(c *canvas, box rectMm) {
	b := artBox(box)
	for _, p := range [][2]float64{{.35, .34}, {.65, .34}, {.50, .60}, {.35, .84}, {.65, .84}} {
		q := rectMm{X: b.X + b.W*(p[0]-.16), Top: b.Top + b.H*(p[1]-.16), W: b.W * .32, H: b.H * .32}
		c.fillStrokePoly(ellipsePoly(q.X+q.W/2, q.Top+q.H/2, q.W*.46, q.H*.46, 6, -math.Pi/2), 1, .73, .12, .55, .34, .04, .16)
	}
}
func artMedal(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.36, .06}, {.50, .32}, {.64, .06}, {.75, .09}, {.62, .39}, {.38, .39}, {.25, .09}}, [3]float64{.28, .52, .88})
	q := rectMm{X: b.X + b.W*.16, Top: b.Top + b.H*.28, W: b.W * .68, H: b.H * .62}
	c.fillStrokePoly(ellipsePoly(q.X+q.W/2, q.Top+q.H/2, q.W*.46, q.H*.46, 7, -math.Pi/2), 1, .76, .12, .55, .35, .05, artEdge)
	c.fillCircle(q.X+q.W/2, q.Top+q.H/2, q.W*.10, 1, .93, .45)
}
func artStop(c *canvas, box rectMm) {
	b := artBox(box)
	q := rectMm{X: b.X + b.W*.07, Top: b.Top + b.H*.05, W: b.W * .86, H: b.H * .86}
	c.fillStrokePoly(ellipsePoly(q.X+q.W/2, q.Top+q.H/2, q.W*.47, q.H*.47, 8, math.Pi/8), .88, .10, .12, .35, .04, .04, artEdge)
	c.text("STOP", b.X+b.W*.20, b.Top+b.H*.35, b.W*.60, b.H*.25, 7.2, true)
}
func artNineBadge(c *canvas, box rectMm) {
	b := artBox(box)
	q := rectMm{X: b.X + b.W*.08, Top: b.Top + b.H*.06, W: b.W * .84, H: b.H * .84}
	c.fillStrokePoly(ellipsePoly(q.X+q.W/2, q.Top+q.H/2, q.W*.47, q.H*.47, 9, -math.Pi/2), .95, .72, .14, .48, .30, .04, artEdge)
	artCircle(c, b, .5, .50, .22, [3]float64{.20, .42, .82})
}
func artUmbrella(c *canvas, box rectMm) {
	b := artBox(box)
	c.fillStrokePie(b.X+b.W*.5, b.Top+b.H*.56, b.W*.42, b.H*.36, 0, math.Pi, .25, .62, .94, .08, .24, .48, artEdge)
	for _, x := range []float64{.24, .5, .76} {
		artLine(c, b, [2]float64{x, .57}, [2]float64{x, .35}, artLight, .12)
	}
	artLine(c, b, [2]float64{.5, .56}, [2]float64{.5, .89}, artInk, .22)
	artLine(c, b, [2]float64{.5, .89}, [2]float64{.61, .89}, artInk, .22)
}
func artPizza(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.18, .12}, {.88, .50}, {.18, .88}}, [3]float64{1, .75, .18})
	artLine(c, b, [2]float64{.18, .12}, [2]float64{.18, .88}, [3]float64{.65, .32, .08}, .55)
	for _, p := range [][2]float64{{.42, .38}, {.57, .58}, {.35, .67}} {
		artCircle(c, b, p[0], p[1], .06, [3]float64{.84, .16, .10})
	}
}
func artDonut(c *canvas, box rectMm) {
	b := artBox(box)
	artEllipse(c, b, .5, .52, .42, .28, [3]float64{.72, .38, .16})
	artEllipse(c, b, .5, .46, .40, .25, [3]float64{1, .43, .68})
	artEllipse(c, b, .5, .48, .14, .09, [3]float64{.68, .25, .16})
	for _, p := range [][2]float64{{.30, .36}, {.68, .39}, {.37, .61}, {.71, .60}} {
		artCircle(c, b, p[0], p[1], .018, [3]float64{1, .88, .12})
	}
}
func artWand(c *canvas, box rectMm) {
	b := artBox(box)
	artLine(c, b, [2]float64{.25, .80}, [2]float64{.70, .32}, [3]float64{.50, .24, .78}, .42)
	q := rectMm{X: b.X + b.W*.53, Top: b.Top + b.H*.08, W: b.W * .38, H: b.H * .38}
	c.fillStrokePoly(starPts(q, 5), 1, .78, .10, .52, .34, .04, artEdge)
	artCircle(c, b, .18, .25, .035, [3]float64{.35, .74, 1})
}
func artKit(c *canvas, box rectMm) {
	b := artBox(box)
	c.fillStrokeRectRGB(b.X+b.W*.10, b.Top+b.H*.30, b.W*.80, b.H*.54, .95, .95, .92, .46, .48, .52, artEdge)
	c.fillStrokeRectRGB(b.X+b.W*.35, b.Top+b.H*.16, b.W*.30, b.H*.16, .72, .74, .78, .36, .38, .42, .18)
	c.fillStrokeRectRGB(b.X+b.W*.42, b.Top+b.H*.40, b.W*.16, b.H*.34, .88, .08, .10, .88, .08, .10, .10)
	c.fillStrokeRectRGB(b.X+b.W*.33, b.Top+b.H*.49, b.W*.34, b.H*.16, .88, .08, .10, .88, .08, .10, .10)
}

// --- Everyday solids --------------------------------------------------------

func artDie(c *canvas, b rectMm) {
	artCube(c, b)
	q := artBox(b)
	for _, p := range [][2]float64{{.30, .56}, {.38, .70}, {.46, .84}} {
		artCircle(c, q, p[0], p[1], .035, artInk)
	}
}
func artBook(c *canvas, b rectMm) {
	artCuboid(c, b)
	q := artBox(b)
	for _, y := range []float64{.54, .65, .76} {
		artLine(c, q, [2]float64{.16, y}, [2]float64{.34, y}, [3]float64{1, .78, .18}, .14)
	}
}
func artGlobe(c *canvas, box rectMm) {
	b := artBox(box)
	artSphere(c, shiftBox(b, .12, .02, .76, .70))
	artEllipse(c, b, .5, .38, .29, .09, [3]float64{.10, .28, .53})
	artLine(c, b, [2]float64{.50, .68}, [2]float64{.50, .83}, [3]float64{.55, .36, .12}, .28)
	c.fillStrokeRectRGB(b.X+b.W*.30, b.Top+b.H*.82, b.W*.40, b.H*.08, .55, .36, .12, .26, .15, .05, artEdge)
}
func artBowl(c *canvas, box rectMm) {
	b := artBox(box)
	artEllipse(c, b, .5, .50, .42, .12, [3]float64{.95, .95, 1})
	c.fillStrokePie(b.X+b.W*.5, b.Top+b.H*.50, b.W*.42, b.H*.40, 0, math.Pi, .92, .34, .22, .50, .12, .08, artEdge)
	artEllipse(c, b, .5, .50, .34, .08, [3]float64{1, .76, .18})
	artLine(c, b, [2]float64{.73, .48}, [2]float64{.88, .20}, [3]float64{.72, .74, .78}, .18)
}
func artCan(c *canvas, box rectMm) {
	b := artBox(box)
	artCylinder(c, b)
	q := artBox(box)
	c.fillRectRGB(q.X+q.W*.25, q.Top+q.H*.38, q.W*.50, q.H*.06, 1, 1, 1)
	artEllipse(c, q, .5, .23, .12, .04, [3]float64{.50, .52, .56})
}
func artIceCream(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.25, .48}, {.75, .48}, {.50, .94}}, [3]float64{.86, .62, .30})
	for _, y := range []float64{.60, .72} {
		artLine(c, b, [2]float64{.34, y}, [2]float64{.66, y + .10}, [3]float64{.60, .38, .16}, .12)
	}
	artCircle(c, b, .5, .42, .25, [3]float64{.42, .84, .66})
	artCircle(c, b, .5, .21, .20, [3]float64{.96, .42, .62})
	artCircle(c, b, .57, .06, .06, [3]float64{.84, .08, .12})
}
func artCoffee(c *canvas, box rectMm) {
	b := artBox(box)
	artFrustum(c, b)
	c.fillStrokeRectRGB(b.X+b.W*.22, b.Top+b.H*.43, b.W*.56, b.H*.23, .63, .42, .22, .32, .18, .08, .18)
	artEllipse(c, b, .5, .24, .29, .07, [3]float64{.88, .90, .94})
}
func artEgypt(c *canvas, box rectMm) {
	b := artBox(box)
	artCircle(c, b, .80, .16, .09, [3]float64{1, .78, .12})
	c.fillRectRGB(b.X, b.Top+b.H*.78, b.W, b.H*.18, .90, .76, .40)
	artSquarePyramid(c, shiftBox(b, .05, .12, .86, .76))
}
func artTetraTent(c *canvas, box rectMm) {
	b := artBox(box)
	artTetrahedron(c, b)
	artPoly(c, b, [][2]float64{{.48, .10}, {.48, .82}, {.27, .72}}, [3]float64{.12, .18, .24})
}
func artCamp(c *canvas, box rectMm) {
	b := artBox(box)
	artTriPrism(c, b)
	artPoly(c, b, [][2]float64{{.25, .20}, {.47, .42}, {.47, .82}, {.28, .70}}, [3]float64{1, .78, .22})
}
func artTower(c *canvas, box rectMm) {
	b := artBox(box)
	artPentPrism(c, shiftBox(b, .12, .18, .76, .75))
	for _, x := range []float64{.22, .43, .64} {
		c.fillStrokeRectRGB(b.X+b.W*x, b.Top+b.H*.12, b.W*.12, b.H*.14, .70, .72, .76, .35, .38, .42, .14)
	}
	artCircle(c, b, .50, .62, .06, [3]float64{.12, .18, .28})
}
func artPencil(c *canvas, box rectMm) {
	b := artBox(box)
	artPoly(c, b, [][2]float64{{.10, .35}, {.70, .35}, {.86, .50}, {.70, .65}, {.10, .65}}, [3]float64{1, .78, .12})
	artPoly(c, b, [][2]float64{{.70, .35}, {.94, .50}, {.70, .65}}, [3]float64{.82, .66, .46})
	artPoly(c, b, [][2]float64{{.88, .46}, {.98, .50}, {.88, .54}}, artInk)
	c.fillStrokeRectRGB(b.X+b.W*.03, b.Top+b.H*.35, b.W*.10, b.H*.30, .95, .46, .58, .55, .20, .30, .16)
}
func artGem(c *canvas, box rectMm) {
	artOctahedron(c, box)
	b := artBox(box)
	artCircle(c, b, .42, .30, .035, artLight)
}
func artMaya(c *canvas, box rectMm) {
	b := artBox(box)
	for i := 0; i < 4; i++ {
		w := .90 - float64(i)*.16
		c.fillStrokeRectRGB(b.X+b.W*(.5-w/2), b.Top+b.H*(.76-float64(i)*.14), b.W*w, b.H*.15, .72, .68, .55, .35, .32, .25, .16)
	}
	c.fillStrokeRectRGB(b.X+b.W*.41, b.Top+b.H*.13, b.W*.18, b.H*.12, .52, .45, .30, .25, .20, .12, .16)
}
func artCircus(c *canvas, box rectMm) {
	b := artBox(box)
	c.fillStrokeRectRGB(b.X+b.W*.15, b.Top+b.H*.62, b.W*.70, b.H*.25, .98, .95, .90, .45, .08, .08, artEdge)
	a := [2]float64{.5, .10}
	for _, p := range [][2]float64{{.15, .62}, {.33, .62}, {.50, .62}, {.67, .62}, {.85, .62}} {
		artPoly(c, b, [][2]float64{a, p, {.5, .62}}, [3]float64{.88, .12, .14})
	}
	artPoly(c, b, [][2]float64{a, {.33, .62}, {.50, .62}}, artLight)
	artPoly(c, b, [][2]float64{a, {.67, .62}, {.50, .62}}, artLight)
}
func artLifeRing(c *canvas, box rectMm) {
	b := artBox(box)
	artEllipse(c, b, .5, .52, .43, .27, [3]float64{.95, .36, .10})
	artEllipse(c, b, .5, .52, .22, .12, artLight)
	for _, x := range []float64{.24, .70} {
		c.fillStrokeRectRGB(b.X+b.W*x, b.Top+b.H*.37, b.W*.10, b.H*.30, artLight[0], artLight[1], artLight[2], .65, .65, .65, .12)
	}
}

func starPts(b rectMm, n int) []pt {
	out := make([]pt, 0, n*2)
	cx, cy := b.X+b.W/2, b.Top+b.H/2
	for i := 0; i < n*2; i++ {
		r := b.W * .46
		if i%2 == 1 {
			r *= .44
		}
		a := -math.Pi/2 + math.Pi*float64(i)/float64(n)
		out = append(out, pt{cx + r*math.Cos(a), cy + r*math.Sin(a)})
	}
	return out
}
