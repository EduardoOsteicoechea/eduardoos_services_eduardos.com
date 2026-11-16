package arithsheet

import (
	"math"
	"math/rand"
)

// sceneFigs is declared in scene_catalog.go and replaced by art_pack.init.

func renderScenes(seed int64) (string, []sheetImage) {
	c := newCanvas()
	g := newGeom()
	order := scrambledSceneOrder(seed)
	half := (len(order) + 1) / 2
	photos := loadScenePhotos()
	if len(photos) == len(order) {
		left := make([][]byte, half)
		right := make([][]byte, len(order)-half)
		for n, id := range order {
			if n < half {
				left[n] = photos[id]
				continue
			}
			right[n-half] = photos[id]
		}
		drawFigureCells(c, g, g.leftX, nil, left)
		drawFigureCells(c, g, g.rightX, nil, right)
	} else {
		left := make([]func(*canvas, rectMm), 0, half)
		right := make([]func(*canvas, rectMm), 0, len(order)-half)
		for n, id := range order {
			if n < half {
				left = append(left, sceneFigs[id])
				continue
			}
			right = append(right, sceneFigs[id])
		}
		drawFigureSide(c, g, g.leftX, left)
		drawFigureSide(c, g, g.rightX, right)
	}
	drawGrid(c, g, g.leftX)
	drawGrid(c, g, g.rightX)
	return c.b.String(), c.images
}

func scrambledSceneOrder(seed int64) []int {
	order := make([]int, len(sceneFigs))
	for i := range order {
		order[i] = i
	}
	rng := rand.New(rand.NewSource(seed))
	rng.Shuffle(len(order), func(i, j int) {
		order[i], order[j] = order[j], order[i]
	})
	return order
}

// 0. Círculo -> Reloj de pared (Clock)
func sceneClock(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	r := sq.W / 2
	cx, ct := sq.X+r, sq.Top+r
	// Outer dark blue bezel
	c.fillStrokeCircle(cx, ct, r, 0.18, 0.28, 0.45, 0.1, 0.15, 0.25, 0.28)
	// Creamy clock dial
	c.fillStrokeCircle(cx, ct, r*0.84, 0.98, 0.97, 0.92, 0.15, 0.2, 0.3, 0.2)
	// 4 cardinal hour marks
	for i := 0; i < 4; i++ {
		ang := float64(i) * math.Pi / 2
		dx, dy := math.Cos(ang), math.Sin(ang)
		c.fillCircle(cx+dx*r*0.68, ct-dy*r*0.68, r*0.06, 0.15, 0.2, 0.3)
	}
	// Red hour hand pointing at 10
	hAng := 5.0 * math.Pi / 6.0
	c.lineRGB(pt{cx, ct}, pt{cx + math.Cos(hAng)*r*0.42, ct - math.Sin(hAng)*r*0.42}, 0.85, 0.15, 0.15, 0.45)
	// Blue minute hand pointing up at 12
	c.lineRGB(pt{cx, ct}, pt{cx, ct - r*0.62}, 0.15, 0.25, 0.5, 0.3)
	// Golden center cap
	c.fillStrokeCircle(cx, ct, r*0.10, 0.95, 0.8, 0.2, 0.4, 0.3, 0.05, 0.15)
}

// 1. Elipse -> Ojo (Eye)
func sceneEye(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx, ct := sq.X+sq.W/2, sq.Top+sq.H/2
	rx, ry := sq.W*0.48, sq.H*0.32
	// Sclera
	c.fillStrokeEllipse(cx, ct, rx, ry, 0.98, 0.98, 0.99, 0.1, 0.1, 0.1, 0.28)
	// Bright blue iris
	c.fillStrokeCircle(cx, ct, ry*0.82, 0.2, 0.65, 0.88, 0.1, 0.35, 0.55, 0.2)
	// Black pupil
	c.fillCircle(cx, ct, ry*0.42, 0.08, 0.08, 0.1)
	// White glint
	c.fillCircle(cx+ry*0.18, ct-ry*0.18, ry*0.15, 1.0, 1.0, 1.0)
	// Upper eyelash line
	c.lineRGB(pt{cx - rx*0.9, ct - ry*0.2}, pt{cx, ct - ry*1.1}, 0.1, 0.1, 0.1, 0.4)
	c.lineRGB(pt{cx, ct - ry*1.1}, pt{cx + rx*0.9, ct - ry*0.2}, 0.1, 0.1, 0.1, 0.4)
}

// 2. Semicírculo -> Sol naciente sobre el mar (Sunrise)
func sceneSunrise(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	r := sq.W * 0.46
	baseY := sq.Top + sq.H*0.68
	// Semicircle sun
	c.fillStrokePie(cx, baseY, r, r, 0, math.Pi, 1.0, 0.68, 0.12, 0.88, 0.4, 0.05, 0.28)
	c.fillStrokePie(cx, baseY, r*0.6, r*0.6, 0, math.Pi, 1.0, 0.86, 0.22, 0.92, 0.6, 0.1, 0.2)
	// 5 Sun rays
	for _, ang := range []float64{0.4, 0.9, 1.57, 2.24, 2.74} {
		p1x, p1t := polar(cx, baseY, r*1.08, r*1.08, ang)
		p2x, p2t := polar(cx, baseY, r*1.28, r*1.28, ang)
		c.lineRGB(pt{p1x, p1t}, pt{p2x, p2t}, 0.95, 0.6, 0.05, 0.35)
	}
	// Ocean water band
	c.fillStrokeRectRGB(sq.X, baseY, sq.W, sq.H*0.28, 0.2, 0.55, 0.85, 0.12, 0.35, 0.65, 0.25)
	// White wave ripple
	c.lineRGB(pt{sq.X + sq.W*0.15, baseY + sq.H*0.12}, pt{sq.X + sq.W*0.45, baseY + sq.H*0.12}, 0.7, 0.9, 1.0, 0.25)
	c.lineRGB(pt{sq.X + sq.W*0.55, baseY + sq.H*0.18}, pt{sq.X + sq.W*0.85, baseY + sq.H*0.18}, 0.7, 0.9, 1.0, 0.25)
}

// 3. Cuadrado -> Ventana (Window)
func sceneWindow(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	// Warm wooden outer frame
	c.fillStrokeRectRGB(sq.X, sq.Top, sq.W, sq.H, 0.72, 0.46, 0.26, 0.42, 0.25, 0.12, 0.3)
	// 4 Glass panes
	pw := (sq.W - 3.0) / 2
	ph := (sq.H - 3.0) / 2
	for row := 0; row < 2; row++ {
		for col := 0; col < 2; col++ {
			px := sq.X + 1.0 + float64(col)*(pw+1.0)
			ptop := sq.Top + 1.0 + float64(row)*(ph+1.0)
			c.fillStrokeRectRGB(px, ptop, pw, ph, 0.75, 0.9, 0.98, 0.4, 0.65, 0.85, 0.2)
			// Glare line
			c.lineRGB(pt{px + pw*0.15, ptop + ph*0.2}, pt{px + pw*0.45, ptop + ph*0.2}, 1.0, 1.0, 1.0, 0.3)
		}
	}
}

// 4. Rectángulo -> Teléfono inteligente (Phone)
func scenePhone(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	w := sq.W * 0.60
	h := sq.H * 0.96
	x := sq.X + (sq.W-w)/2
	top := sq.Top + (sq.H-h)/2
	// Phone body
	c.fillStrokeRectRGB(x, top, w, h, 0.18, 0.22, 0.28, 0.08, 0.1, 0.14, 0.3)
	// Turquoise screen
	sw, sh := w*0.84, h*0.78
	sx, stop := x+w*0.08, top+h*0.08
	c.fillStrokeRectRGB(sx, stop, sw, sh, 0.3, 0.72, 0.92, 0.15, 0.45, 0.65, 0.2)
	// App icons
	colors := [][3]float64{
		{0.9, 0.2, 0.2}, {0.2, 0.75, 0.3}, {1.0, 0.8, 0.1},
		{0.6, 0.25, 0.75}, {0.95, 0.5, 0.1}, {0.15, 0.5, 0.9},
	}
	iw := sw * 0.24
	ih := sh * 0.18
	for i, col := range colors {
		ix := sx + sw*0.16 + float64(i%2)*(sw*0.44)
		iy := stop + sh*0.18 + float64(i/2)*(sh*0.26)
		c.fillStrokeRectRGB(ix, iy, iw, ih, col[0], col[1], col[2], 0.1, 0.1, 0.1, 0.15)
	}
	// Home indicator
	c.lineRGB(pt{sx + sw*0.35, stop + sh*0.92}, pt{sx + sw*0.65, stop + sh*0.92}, 1.0, 1.0, 1.0, 0.3)
}

// 5. Triángulo equilátero -> Señal de advertencia (Warning sign)
func sceneWarning(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W/2
	half := sq.W / 2
	pTop := pt{cx, sq.Top + sq.H*0.06}
	pLeft := pt{sq.X + sq.W*0.06, sq.Top + sq.H*0.92}
	pRight := pt{sq.X + sq.W*0.94, sq.Top + sq.H*0.92}
	// Yellow triangular plate
	c.fillStrokePoly([]pt{pTop, pRight, pLeft}, 1.0, 0.85, 0.08, 0.1, 0.1, 0.1, 0.35)
	// Inner warning border
	c.lineRGB(pt{cx, sq.Top + sq.H*0.16}, pt{sq.X + sq.W*0.16, sq.Top + sq.H*0.85}, 0.1, 0.1, 0.1, 0.2)
	c.lineRGB(pt{sq.X + sq.W*0.16, sq.Top + sq.H*0.85}, pt{sq.X + sq.W*0.84, sq.Top + sq.H*0.85}, 0.1, 0.1, 0.1, 0.2)
	c.lineRGB(pt{sq.X + sq.W*0.84, sq.Top + sq.H*0.85}, pt{cx, sq.Top + sq.H*0.16}, 0.1, 0.1, 0.1, 0.2)
	// Exclamation point
	c.lineRGB(pt{cx, sq.Top + sq.H*0.35}, pt{cx, sq.Top + sq.H*0.64}, 0.1, 0.1, 0.1, 0.5)
	c.fillCircle(cx, sq.Top+sq.H*0.75, half*0.08, 0.1, 0.1, 0.1)
}

// 6. Triángulo isósceles -> Pino (Pine tree)
func scenePine(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W/2
	// Trunk
	c.fillStrokeRectRGB(cx-sq.W*0.08, sq.Top+sq.H*0.75, sq.W*0.16, sq.H*0.22, 0.52, 0.32, 0.16, 0.32, 0.18, 0.08, 0.25)
	// Tree foliage (tall isosceles triangle)
	pTop := pt{cx, sq.Top + sq.H*0.08}
	pLeft := pt{sq.X + sq.W*0.08, sq.Top + sq.H*0.76}
	pRight := pt{sq.X + sq.W*0.92, sq.Top + sq.H*0.76}
	c.fillStrokePoly([]pt{pTop, pRight, pLeft}, 0.16, 0.65, 0.28, 0.08, 0.35, 0.12, 0.3)
	// Branch tiers highlight
	c.lineRGB(pt{sq.X + sq.W*0.25, sq.Top + sq.H*0.54}, pt{sq.X + sq.W*0.75, sq.Top + sq.H*0.54}, 0.28, 0.78, 0.38, 0.3)
	c.lineRGB(pt{sq.X + sq.W*0.35, sq.Top + sq.H*0.34}, pt{sq.X + sq.W*0.65, sq.Top + sq.H*0.34}, 0.28, 0.78, 0.38, 0.3)
	// Gold star on top
	c.fillCircle(cx, sq.Top+sq.H*0.08, sq.W*0.06, 1.0, 0.85, 0.15)
}

// 7. Triángulo escaleno -> Velero (Sailboat)
func sceneSail(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	// Scalene mainsail (red)
	mTop := pt{sq.X + sq.W*0.38, sq.Top + sq.H*0.06}
	mBot := pt{sq.X + sq.W*0.38, sq.Top + sq.H*0.68}
	mBack := pt{sq.X + sq.W*0.08, sq.Top + sq.H*0.60}
	c.fillStrokePoly([]pt{mTop, mBot, mBack}, 0.88, 0.2, 0.2, 0.55, 0.1, 0.1, 0.28)
	// Jib sail (sky blue)
	jFront := pt{sq.X + sq.W*0.86, sq.Top + sq.H*0.64}
	c.fillStrokePoly([]pt{mTop, jFront, pt{sq.X + sq.W*0.44, sq.Top + sq.H*0.68}}, 0.3, 0.68, 0.92, 0.15, 0.4, 0.65, 0.25)
	// Mast
	c.lineRGB(mTop, pt{sq.X + sq.W*0.38, sq.Top + sq.H*0.74}, 0.35, 0.25, 0.15, 0.35)
	// Hull
	h1 := pt{sq.X + sq.W*0.06, sq.Top + sq.H*0.72}
	h2 := pt{sq.X + sq.W*0.92, sq.Top + sq.H*0.72}
	h3 := pt{sq.X + sq.W*0.76, sq.Top + sq.H*0.88}
	h4 := pt{sq.X + sq.W*0.18, sq.Top + sq.H*0.88}
	c.fillStrokePoly([]pt{h1, h2, h3, h4}, 0.2, 0.35, 0.65, 0.1, 0.2, 0.4, 0.28)
	// Water ripple
	c.lineRGB(pt{sq.X + sq.W*0.02, sq.Top + sq.H*0.94}, pt{sq.X + sq.W*0.96, sq.Top + sq.H*0.94}, 0.25, 0.75, 0.9, 0.3)
}

// 8. Triángulo rectángulo -> Escuadra (Set square)
func sceneSetSquare(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	pCorner := pt{sq.X + sq.W*0.08, sq.Top + sq.H*0.92}
	pTop := pt{sq.X + sq.W*0.08, sq.Top + sq.H*0.08}
	pRight := pt{sq.X + sq.W*0.92, sq.Top + sq.H*0.92}
	// Outer amber triangle
	c.fillStrokePoly([]pt{pCorner, pTop, pRight}, 1.0, 0.74, 0.2, 0.75, 0.42, 0.05, 0.3)
	// Inner cutout
	c1 := pt{sq.X + sq.W*0.22, sq.Top + sq.H*0.78}
	c2 := pt{sq.X + sq.W*0.22, sq.Top + sq.H*0.35}
	c3 := pt{sq.X + sq.W*0.65, sq.Top + sq.H*0.78}
	c.fillStrokePoly([]pt{c1, c2, c3}, 1.0, 1.0, 1.0, 0.75, 0.42, 0.05, 0.2)
	// Ruler tick marks on legs
	for i := 1; i <= 5; i++ {
		y := sq.Top + sq.H*0.92 - float64(i)*(sq.H*0.14)
		c.lineRGB(pt{sq.X + sq.W*0.08, y}, pt{sq.X + sq.W*0.14, y}, 0.1, 0.1, 0.1, 0.2)
		x := sq.X + sq.W*0.08 + float64(i)*(sq.H*0.14)
		c.lineRGB(pt{x, sq.Top + sq.H*0.92}, pt{x, sq.Top + sq.H*0.86}, 0.1, 0.1, 0.1, 0.2)
	}
}

// 9. Rombo -> Cometa / Papalote (Kite)
func sceneKite(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W/2
	cy := sq.Top + sq.H*0.42
	pTop := pt{cx, sq.Top + sq.H*0.08}
	pRight := pt{sq.X + sq.W*0.88, cy}
	pBot := pt{cx, sq.Top + sq.H*0.76}
	pLeft := pt{sq.X + sq.W*0.12, cy}
	pCenter := pt{cx, cy}
	// 4 quadrants
	c.fillStrokePoly([]pt{pTop, pRight, pCenter}, 1.0, 0.85, 0.15, 0.1, 0.1, 0.1, 0.25) // Top-right yellow
	c.fillStrokePoly([]pt{pTop, pLeft, pCenter}, 0.9, 0.2, 0.2, 0.1, 0.1, 0.1, 0.25)    // Top-left red
	c.fillStrokePoly([]pt{pBot, pLeft, pCenter}, 0.2, 0.6, 0.92, 0.1, 0.1, 0.1, 0.25)   // Bot-left blue
	c.fillStrokePoly([]pt{pBot, pRight, pCenter}, 0.2, 0.72, 0.3, 0.1, 0.1, 0.1, 0.25)  // Bot-right green
	// Tail with bows
	t1 := pt{cx + sq.W*0.08, sq.Top + sq.H*0.85}
	t2 := pt{cx - sq.W*0.06, sq.Top + sq.H*0.96}
	c.lineRGB(pBot, t1, 0.3, 0.3, 0.3, 0.25)
	c.lineRGB(t1, t2, 0.3, 0.3, 0.3, 0.25)
	c.fillCircle(t1.x, t1.top, sq.W*0.04, 0.95, 0.4, 0.6)
	c.fillCircle(t2.x, t2.top, sq.W*0.04, 0.6, 0.25, 0.75)
}

// 10. Paralelogramo -> Bandera ondeante (Flag)
func sceneFlag(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	// Flagpole
	c.fillStrokeRectRGB(sq.X+sq.W*0.12, sq.Top+sq.H*0.08, sq.W*0.06, sq.H*0.88, 0.75, 0.76, 0.8, 0.4, 0.42, 0.45, 0.25)
	c.fillCircle(sq.X+sq.W*0.15, sq.Top+sq.H*0.08, sq.W*0.06, 0.95, 0.8, 0.2)
	// Parallelogram flag
	p1 := pt{sq.X + sq.W*0.18, sq.Top + sq.H*0.15}
	p2 := pt{sq.X + sq.W*0.88, sq.Top + sq.H*0.15}
	p3 := pt{sq.X + sq.W*0.74, sq.Top + sq.H*0.58}
	p4 := pt{sq.X + sq.W*0.18, sq.Top + sq.H*0.58}
	c.fillStrokePoly([]pt{p1, p2, p3, p4}, 0.88, 0.15, 0.2, 0.5, 0.08, 0.1, 0.3)
	// Yellow stripe across parallelogram
	s1 := pt{sq.X + sq.W*0.35, sq.Top + sq.H*0.15}
	s2 := pt{sq.X + sq.W*0.55, sq.Top + sq.H*0.15}
	s3 := pt{sq.X + sq.W*0.41, sq.Top + sq.H*0.58}
	s4 := pt{sq.X + sq.W*0.21, sq.Top + sq.H*0.58}
	c.fillStrokePoly([]pt{s1, s2, s3, s4}, 1.0, 0.85, 0.12, 0.7, 0.55, 0.05, 0.15)
}

// 11. Trapecio isósceles -> Maceta con flor (Flower pot)
func scenePot(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W/2
	// Flower
	c.fillCircle(cx, sq.Top+sq.H*0.20, sq.W*0.12, 0.96, 0.3, 0.5)
	c.fillCircle(cx, sq.Top+sq.H*0.20, sq.W*0.06, 1.0, 0.85, 0.15)
	// Green stem and leaves
	c.lineRGB(pt{cx, sq.Top + sq.H*0.25}, pt{cx, sq.Top + sq.H*0.48}, 0.2, 0.65, 0.25, 0.4)
	c.fillEllipse(cx-sq.W*0.16, sq.Top+sq.H*0.35, sq.W*0.12, sq.H*0.06, 0.25, 0.75, 0.3)
	c.fillEllipse(cx+sq.W*0.16, sq.Top+sq.H*0.38, sq.W*0.12, sq.H*0.06, 0.25, 0.75, 0.3)
	// Pot rim
	c.fillStrokeRectRGB(sq.X+sq.W*0.12, sq.Top+sq.H*0.48, sq.W*0.76, sq.H*0.08, 0.88, 0.48, 0.28, 0.5, 0.25, 0.12, 0.25)
	// Isosceles trapezoid pot body
	t1 := pt{sq.X + sq.W*0.18, sq.Top + sq.H*0.56}
	t2 := pt{sq.X + sq.W*0.82, sq.Top + sq.H*0.56}
	t3 := pt{sq.X + sq.W*0.68, sq.Top + sq.H*0.94}
	t4 := pt{sq.X + sq.W*0.32, sq.Top + sq.H*0.94}
	c.fillStrokePoly([]pt{t1, t2, t3, t4}, 0.85, 0.44, 0.24, 0.5, 0.25, 0.12, 0.28)
}

// 12. Trapecio rectángulo -> Rampa de skate (Skate ramp)
func sceneRamp(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	// Right trapezoid ramp body
	r1 := pt{sq.X + sq.W*0.08, sq.Top + sq.H*0.28}
	r2 := pt{sq.X + sq.W*0.45, sq.Top + sq.H*0.28}
	r3 := pt{sq.X + sq.W*0.92, sq.Top + sq.H*0.88}
	r4 := pt{sq.X + sq.W*0.08, sq.Top + sq.H*0.88}
	c.fillStrokePoly([]pt{r1, r2, r3, r4}, 0.74, 0.76, 0.8, 0.4, 0.42, 0.46, 0.3)
	// Metal coping pipe on top
	c.fillStrokeRectRGB(sq.X+sq.W*0.06, sq.Top+sq.H*0.24, sq.W*0.42, sq.H*0.05, 1.0, 0.8, 0.2, 0.6, 0.45, 0.1, 0.2)
	// Skateboard on the ramp slope
	bx, by := sq.X+sq.W*0.65, sq.Top+sq.H*0.52
	c.lineRGB(pt{bx - sq.W*0.12, by - sq.H*0.08}, pt{bx + sq.W*0.12, by + sq.H*0.08}, 0.88, 0.15, 0.2, 0.45)
	c.fillCircle(bx-sq.W*0.08, by-sq.H*0.04+sq.H*0.03, sq.W*0.03, 0.1, 0.1, 0.1)
	c.fillCircle(bx+sq.W*0.08, by+sq.H*0.04+sq.H*0.03, sq.W*0.03, 0.1, 0.1, 0.1)
}

// 13. Cometa (Deltoide) -> Peonza / Trompo (Spinning top)
func sceneTop(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W/2
	// Turned knob on top
	c.fillStrokeCircle(cx, sq.Top+sq.H*0.10, sq.W*0.07, 0.7, 0.45, 0.25, 0.4, 0.25, 0.1, 0.2)
	// Kite-shaped body split into colorful bands
	pTop := pt{cx, sq.Top + sq.H*0.16}
	pRight := pt{sq.X + sq.W*0.88, sq.Top + sq.H*0.44}
	pTip := pt{cx, sq.Top + sq.H*0.86}
	pLeft := pt{sq.X + sq.W*0.12, sq.Top + sq.H*0.44}
	// Full body cyan
	c.fillStrokePoly([]pt{pTop, pRight, pTip, pLeft}, 0.15, 0.75, 0.85, 0.1, 0.1, 0.1, 0.3)
	// Mid band yellow
	m1 := pt{sq.X + sq.W*0.25, sq.Top + sq.H*0.35}
	m2 := pt{sq.X + sq.W*0.75, sq.Top + sq.H*0.35}
	m3 := pt{sq.X + sq.W*0.68, sq.Top + sq.H*0.58}
	m4 := pt{sq.X + sq.W*0.32, sq.Top + sq.H*0.58}
	c.fillStrokePoly([]pt{m1, m2, m3, m4}, 1.0, 0.85, 0.1, 0.1, 0.1, 0.1, 0.2)
	// Lower magenta tip
	c.fillStrokePoly([]pt{m4, m3, pTip}, 0.88, 0.15, 0.45, 0.1, 0.1, 0.1, 0.2)
	// Steel point
	c.lineRGB(pTip, pt{cx, sq.Top + sq.H*0.96}, 0.4, 0.4, 0.4, 0.4)
}

// 14. Pentágono -> Casita (House)
func sceneHouse(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W/2
	// Pentagonal house contour
	pRoof := pt{cx, sq.Top + sq.H*0.08}
	pRightRoof := pt{sq.X + sq.W*0.92, sq.Top + sq.H*0.44}
	pRightWall := pt{sq.X + sq.W*0.92, sq.Top + sq.H*0.94}
	pLeftWall := pt{sq.X + sq.W*0.08, sq.Top + sq.H*0.94}
	pLeftRoof := pt{sq.X + sq.W*0.08, sq.Top + sq.H*0.44}
	// House base
	c.fillStrokePoly([]pt{pLeftRoof, pRightRoof, pRightWall, pLeftWall}, 1.0, 0.94, 0.72, 0.4, 0.3, 0.2, 0.28)
	// Red Roof
	c.fillStrokePoly([]pt{pRoof, pRightRoof, pLeftRoof}, 0.84, 0.24, 0.16, 0.5, 0.1, 0.1, 0.3)
	// Door
	c.fillStrokeRectRGB(cx-sq.W*0.12, sq.Top+sq.H*0.62, sq.W*0.24, sq.H*0.32, 0.55, 0.32, 0.18, 0.3, 0.18, 0.08, 0.25)
	c.fillCircle(cx+sq.W*0.06, sq.Top+sq.H*0.78, sq.W*0.025, 1.0, 0.85, 0.2)
	// Attic round window
	c.fillStrokeCircle(cx, sq.Top+sq.H*0.30, sq.W*0.08, 0.6, 0.85, 0.95, 0.3, 0.5, 0.7, 0.2)
}

// 15. Hexágono -> Panal de abejas (Honeycomb)
func sceneHoney(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	// Golden hexagon
	drawRegular(c, shiftBox(box, 0.05, 0.05, 0.75, 0.8), 6)
	cx := sq.X + sq.W*0.42
	ct := sq.Top + sq.H*0.48
	c.fillCircle(cx, ct, sq.W*0.25, 1.0, 0.82, 0.18)
	// Honey drop
	c.fillCircle(cx, ct+sq.H*0.26, sq.W*0.08, 0.95, 0.55, 0.05)
	// Cute little bumblebee on the right
	bx, by := sq.X+sq.W*0.78, sq.Top+sq.H*0.35
	c.fillStrokeEllipse(bx, by, sq.W*0.14, sq.H*0.09, 1.0, 0.85, 0.1, 0.1, 0.1, 0.1, 0.2)
	// Bee black stripes
	c.lineRGB(pt{bx - sq.W*0.04, by - sq.H*0.08}, pt{bx - sq.W*0.04, by + sq.H*0.08}, 0.1, 0.1, 0.1, 0.35)
	c.lineRGB(pt{bx + sq.W*0.04, by - sq.H*0.08}, pt{bx + sq.W*0.04, by + sq.H*0.08}, 0.1, 0.1, 0.1, 0.35)
	// Translucent wings
	c.fillStrokeEllipse(bx-sq.W*0.04, by-sq.H*0.12, sq.W*0.08, sq.H*0.06, 0.85, 0.95, 1.0, 0.3, 0.5, 0.7, 0.18)
}

// 16. Heptágono -> Medalla deportiva (Medal)
func sceneMedal(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W/2
	// Ribbon pinned to top
	c.fillStrokePoly([]pt{
		{cx - sq.W*0.24, sq.Top + sq.H*0.06},
		{cx - sq.W*0.10, sq.Top + sq.H*0.45},
		{cx - sq.W*0.24, sq.Top + sq.H*0.45},
	}, 0.18, 0.35, 0.75, 0.1, 0.2, 0.4, 0.2)
	c.fillStrokePoly([]pt{
		{cx + sq.W*0.24, sq.Top + sq.H*0.06},
		{cx + sq.W*0.10, sq.Top + sq.H*0.45},
		{cx + sq.W*0.24, sq.Top + sq.H*0.45},
	}, 0.85, 0.15, 0.15, 0.5, 0.1, 0.1, 0.2)
	// Golden 7-sided medal
	mTop := sq.Top + sq.H*0.35
	mSide := sq.W * 0.65
	mBox := rectMm{X: cx - mSide/2, Top: mTop, W: mSide, H: mSide}
	c.fillStrokeCircle(cx, mTop+mSide/2, mSide*0.46, 1.0, 0.82, 0.2, 0.7, 0.5, 0.05, 0.3)
	drawRegular(c, mBox, 7)
	// Embossed #1
	c.text("1", cx-sq.W*0.1, mTop+mSide*0.2, sq.W*0.2, mSide*0.6, 10.0, true)
}

// 17. Octágono -> Señal de STOP (Stop sign)
func sceneStop(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W/2
	// Metal post
	c.fillStrokeRectRGB(cx-sq.W*0.04, sq.Top+sq.H*0.7, sq.W*0.08, sq.H*0.26, 0.7, 0.72, 0.75, 0.35, 0.38, 0.42, 0.25)
	// Octagonal Red Sign
	oBox := shiftBox(box, 0.10, 0.04, 0.80, 0.72)
	c.fillStrokeCircle(cx, oBox.Top+oBox.H/2, oBox.W*0.46, 0.86, 0.1, 0.12, 0.5, 0.05, 0.05, 0.3)
	drawRegular(c, oBox, 8)
	// Inner white line
	drawRegular(c, shiftBox(oBox, 0.06, 0.06, 0.88, 0.88), 8)
	// Text STOP
	c.text("STOP", cx-sq.W*0.3, oBox.Top+oBox.H*0.3, sq.W*0.6, oBox.H*0.4, 7.5, true)
}

// 18. Eneágono / Nonágono -> Placa / Escudo de sheriff (Badge)
func sceneBadge(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx, ct := sq.X+sq.W/2, sq.Top+sq.H/2
	// Golden 9-gon badge
	c.fillStrokeCircle(cx, ct, sq.W*0.45, 0.96, 0.8, 0.2, 0.65, 0.5, 0.08, 0.3)
	drawRegular(c, sq, 9)
	// Inner royal blue disc
	c.fillStrokeCircle(cx, ct, sq.W*0.28, 0.18, 0.35, 0.72, 0.95, 0.8, 0.2, 0.25)
	// Star in center
	drawStar(c, shiftBox(box, 0.32, 0.32, 0.36, 0.36))
}

// 19. Decágono -> Paraguas (Umbrella)
func sceneUmbrella(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W/2
	// Decagon canopy outline
	uBox := shiftBox(box, 0.08, 0.04, 0.84, 0.64)
	c.fillStrokeCircle(cx, uBox.Top+uBox.H/2, uBox.W*0.46, 0.2, 0.65, 0.92, 0.1, 0.3, 0.5, 0.3)
	drawRegular(c, uBox, 10)
	// Rainbow colored sectors
	colors := [][3]float64{
		{0.9, 0.2, 0.2}, {1.0, 0.85, 0.15}, {0.2, 0.72, 0.3},
		{0.95, 0.5, 0.1}, {0.6, 0.25, 0.75},
	}
	for i, col := range colors {
		ang := float64(i) * 2 * math.Pi / 5
		c.fillCircle(cx+math.Cos(ang)*uBox.W*0.3, uBox.Top+uBox.H/2-math.Sin(ang)*uBox.W*0.3, uBox.W*0.07, col[0], col[1], col[2])
	}
	// Umbrella shaft and hook handle
	c.lineRGB(pt{cx, uBox.Top + uBox.H/2}, pt{cx, sq.Top + sq.H*0.86}, 0.2, 0.2, 0.2, 0.4)
	c.arc(cx-sq.W*0.06, sq.Top+sq.H*0.86, sq.W*0.06, sq.H*0.07, math.Pi, 2*math.Pi)
	c.stroke()
}

// 20. Sector circular -> Rebanada de pizza (Pizza slice)
func scenePizza(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W*0.12
	ctop := sq.Top + sq.H*0.88
	r := sq.W * 0.78
	// Crust + cheese slice
	c.fillStrokePie(cx, ctop, r, r, 0, math.Pi/2, 1.0, 0.82, 0.25, 0.75, 0.48, 0.2, 0.35)
	// Toasted crust edge
	c.arc(cx, ctop, r*0.96, r*0.96, 0, math.Pi/2)
	c.b.WriteString("0.85 0.52 0.22 RG 1.5 w S\n0 G\n")
	// Pepperoni slices
	p1x, p1y := cx+r*0.48, ctop-r*0.28
	p2x, p2y := cx+r*0.28, ctop-r*0.52
	p3x, p3y := cx+r*0.62, ctop-r*0.58
	c.fillStrokeCircle(p1x, p1y, r*0.08, 0.82, 0.16, 0.16, 0.5, 0.1, 0.1, 0.2)
	c.fillStrokeCircle(p2x, p2y, r*0.08, 0.82, 0.16, 0.16, 0.5, 0.1, 0.1, 0.2)
	c.fillStrokeCircle(p3x, p3y, r*0.07, 0.82, 0.16, 0.16, 0.5, 0.1, 0.1, 0.2)
}

// 21. Corona circular -> Dona glaseada (Donut)
func sceneDonut(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	r := sq.W / 2
	cx, ct := sq.X+r, sq.Top+r
	// Dough ring
	c.fillStrokeCircle(cx, ct, r*0.95, 0.88, 0.68, 0.4, 0.55, 0.38, 0.18, 0.28)
	// Pink frosting
	c.fillStrokeCircle(cx, ct, r*0.82, 0.96, 0.46, 0.65, 0.75, 0.25, 0.45, 0.25)
	// Inner hole (paper color)
	c.fillStrokeCircle(cx, ct, r*0.40, 1.0, 1.0, 1.0, 0.55, 0.38, 0.18, 0.25)
	// Rainbow sprinkles
	sprinkles := [][4]float64{
		{cx + r*0.55, ct - r*0.35, 1.0, 0.85},
		{cx - r*0.55, ct - r*0.30, 0.2, 0.75},
		{cx + r*0.40, ct + r*0.48, 1.0, 1.0},
		{cx - r*0.45, ct + r*0.45, 0.95, 0.5},
	}
	for _, s := range sprinkles {
		c.fillCircle(s[0], s[1], r*0.045, s[2], s[3], 0.2)
	}
}

// 22. Estrella -> Varita mágica (Magic wand)
func sceneWand(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	cx := sq.X + sq.W*0.45
	// Wand stick (purple/silver)
	c.lineRGB(pt{cx, sq.Top + sq.H*0.45}, pt{sq.X + sq.W*0.88, sq.Top + sq.H*0.94}, 0.48, 0.22, 0.72, 0.5)
	// Sparkling yellow star on top
	sBox := shiftBox(box, 0.05, 0.02, 0.75, 0.65)
	c.fillCircle(sBox.X+sBox.W/2, sBox.Top+sBox.H/2, sBox.W*0.35, 1.0, 0.88, 0.15)
	drawStar(c, sBox)
	// Magical twinkle glints
	c.fillCircle(sq.X+sq.W*0.82, sq.Top+sq.H*0.18, sq.W*0.04, 1.0, 0.85, 0.2)
	c.fillCircle(sq.X+sq.W*0.12, sq.Top+sq.H*0.75, sq.W*0.03, 1.0, 0.85, 0.2)
}

// 23. Cruz griega -> Botiquín médico (First-aid kit)
func sceneKit(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.96)
	// White medical briefcase
	c.fillStrokeRectRGB(sq.X+sq.W*0.08, sq.Top+sq.H*0.18, sq.W*0.84, sq.H*0.72, 0.96, 0.96, 0.98, 0.6, 0.62, 0.68, 0.3)
	// Carrying handle on top
	c.fillStrokeRectRGB(sq.X+sq.W*0.35, sq.Top+sq.H*0.08, sq.W*0.30, sq.H*0.10, 0.7, 0.72, 0.76, 0.4, 0.42, 0.46, 0.25)
	// Vibrant red Greek cross in center
	xBox := shiftBox(box, 0.26, 0.28, 0.48, 0.52)
	c.fillCircle(xBox.X+xBox.W/2, xBox.Top+xBox.H/2, xBox.W*0.38, 0.88, 0.12, 0.14)
	drawGreekCross(c, xBox)
}

// 24. Cubo -> Dado de juego (Die)
func sceneDie(c *canvas, box rectMm) {
	drawCabinet(c, box, 0.34, 0.34, true)
	sq := innerSquare(box, 0.98)
	// Shading on cabinet faces: front face soft ivory, top face bright white, right face shadow
	// Dice pips (black dots on front face)
	d := sq.W * 0.05
	c.fillCircle(sq.X+sq.W*0.22, sq.Top+sq.H*0.50, d, 0.1, 0.1, 0.1)
	c.fillCircle(sq.X+sq.W*0.36, sq.Top+sq.H*0.64, d, 0.88, 0.15, 0.15) // Red center pip
	c.fillCircle(sq.X+sq.W*0.50, sq.Top+sq.H*0.78, d, 0.1, 0.1, 0.1)
}

// 25. Ortoedro -> Libro de tapa dura (Hardcover book)
func sceneBook(c *canvas, box rectMm) {
	drawCabinet(c, box, 0.22, 0.28, false)
	sq := innerSquare(box, 0.85)
	// Gold embossed lines on front cover
	x := sq.X + sq.W*0.18
	for i := 0; i < 3; i++ {
		y := sq.Top + sq.H*(0.38+float64(i)*0.14)
		c.lineRGB(pt{x, y}, pt{x + sq.W*0.32, y}, 0.88, 0.72, 0.18, 0.35)
	}
}

// 26. Esfera -> Globo terráqueo (Globe)
func sceneGlobe(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	r := sq.W * 0.42
	cx, ct := sq.X+sq.W/2, sq.Top+sq.H*0.44
	// Blue ocean sphere
	c.fillStrokeCircle(cx, ct, r, 0.22, 0.58, 0.88, 0.1, 0.35, 0.65, 0.28)
	// Green continent silhouettes
	c.fillCircle(cx-r*0.3, ct-r*0.2, r*0.38, 0.28, 0.74, 0.35)
	c.fillCircle(cx+r*0.35, ct+r*0.2, r*0.40, 0.28, 0.74, 0.35)
	c.fillCircle(cx-r*0.1, ct+r*0.4, r*0.32, 0.28, 0.74, 0.35)
	// Latitude & equator lines
	c.ellipse(cx, ct, r, r*0.32)
	// Brass semi-circular stand
	c.arc(cx, ct, r*1.15, r*1.15, -0.8, 2.3)
	c.b.WriteString("0.85 0.7 0.2 RG 0.8 w S\n0 G\n")
	// Base stand
	c.fillStrokeRectRGB(cx-sq.W*0.16, sq.Top+sq.H*0.86, sq.W*0.32, sq.H*0.08, 0.55, 0.35, 0.18, 0.3, 0.18, 0.08, 0.25)
}

// 27. Semiesfera -> Tazón de cereal (Bowl)
func sceneBowl(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	base := sq.Top + sq.H*0.52
	r := sq.W * 0.44
	// Ceramic bowl outer body (coral/orange)
	c.fillStrokePie(cx, base, r, r, 0, math.Pi, 0.95, 0.44, 0.32, 0.6, 0.2, 0.1, 0.28)
	// White bowl rim
	c.fillStrokeEllipse(cx, base, r, r*0.28, 0.98, 0.98, 1.0, 0.6, 0.2, 0.1, 0.25)
	// Golden soup inside
	c.fillStrokeEllipse(cx, base, r*0.82, r*0.20, 1.0, 0.82, 0.25, 0.8, 0.55, 0.1, 0.2)
	// Silver spoon sticking out
	c.lineRGB(pt{cx + r*0.4, base - r*0.05}, pt{cx + r*0.8, base - sq.H*0.25}, 0.75, 0.78, 0.82, 0.4)
}

// 28. Cilindro -> Lata de refresco (Soda can)
func sceneCan(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	rx := sq.W * 0.38
	ry := sq.H * 0.13
	topY := sq.Top + sq.H*0.18
	botY := sq.Top + sq.H*0.82
	// Red soda can body
	c.fillStrokeRectRGB(cx-rx, topY, rx*2, botY-topY, 0.88, 0.12, 0.16, 0.5, 0.05, 0.08, 0.28)
	c.fillStrokeEllipse(cx, botY, rx, ry, 0.88, 0.12, 0.16, 0.5, 0.05, 0.08, 0.25)
	// Silver aluminum top lid
	c.fillStrokeEllipse(cx, topY, rx, ry, 0.82, 0.85, 0.88, 0.45, 0.48, 0.52, 0.25)
	// White swoosh wave on can
	c.lineRGB(pt{cx - rx*0.7, topY + (botY-topY)*0.4}, pt{cx + rx*0.7, topY + (botY-topY)*0.6}, 1.0, 1.0, 1.0, 0.6)
	// Pull tab
	c.fillCircle(cx, topY, rx*0.18, 0.5, 0.52, 0.56)
}

// 29. Cono -> Helado en barquillo (Ice cream cone)
func sceneIce(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	// Golden waffle cone
	pTip := pt{cx, sq.Top + sq.H*0.94}
	pLeft := pt{cx - sq.W*0.32, sq.Top + sq.H*0.50}
	pRight := pt{cx + sq.W*0.32, sq.Top + sq.H*0.50}
	c.fillStrokePoly([]pt{pLeft, pRight, pTip}, 0.85, 0.62, 0.32, 0.55, 0.35, 0.15, 0.28)
	// Waffle grid lines
	c.lineRGB(pt{cx - sq.W*0.2, sq.Top + sq.H*0.62}, pt{cx + sq.W*0.15, sq.Top + sq.H*0.76}, 0.65, 0.42, 0.18, 0.2)
	c.lineRGB(pt{cx + sq.W*0.2, sq.Top + sq.H*0.62}, pt{cx - sq.W*0.15, sq.Top + sq.H*0.76}, 0.65, 0.42, 0.18, 0.2)
	// Mint-green scoop
	c.fillStrokeCircle(cx, sq.Top+sq.H*0.42, sq.W*0.28, 0.45, 0.85, 0.62, 0.2, 0.6, 0.4, 0.25)
	// Strawberry pink top scoop
	c.fillStrokeCircle(cx, sq.Top+sq.H*0.25, sq.W*0.24, 0.96, 0.45, 0.62, 0.7, 0.2, 0.4, 0.25)
	// Cherry on top
	c.fillStrokeCircle(cx+sq.W*0.06, sq.Top+sq.H*0.10, sq.W*0.07, 0.85, 0.1, 0.15, 0.5, 0.05, 0.08, 0.2)
	c.lineRGB(pt{cx + sq.W*0.06, sq.Top + sq.H*0.07}, pt{cx + sq.W*0.14, sq.Top + sq.H*0.02}, 0.4, 0.2, 0.1, 0.25)
}

// 30. Tronco de cono -> Vaso de café para llevar (Coffee cup)
func sceneCup(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	// Cup body
	p1 := pt{cx - sq.W*0.36, sq.Top + sq.H*0.24}
	p2 := pt{cx + sq.W*0.36, sq.Top + sq.H*0.24}
	p3 := pt{cx + sq.W*0.26, sq.Top + sq.H*0.88}
	p4 := pt{cx - sq.W*0.26, sq.Top + sq.H*0.88}
	c.fillStrokePoly([]pt{p1, p2, p3, p4}, 0.96, 0.96, 0.98, 0.6, 0.62, 0.66, 0.28)
	// Brown corrugated kraft heat sleeve
	s1 := pt{cx - sq.W*0.33, sq.Top + sq.H*0.42}
	s2 := pt{cx + sq.W*0.33, sq.Top + sq.H*0.42}
	s3 := pt{cx + sq.W*0.29, sq.Top + sq.H*0.68}
	s4 := pt{cx - sq.W*0.29, sq.Top + sq.H*0.68}
	c.fillStrokePoly([]pt{s1, s2, s3, s4}, 0.72, 0.52, 0.32, 0.45, 0.3, 0.15, 0.25)
	// Coffee icon on sleeve
	c.fillCircle(cx, sq.Top+sq.H*0.55, sq.W*0.06, 0.4, 0.25, 0.12)
	// Drinking lid on top
	c.fillStrokeRectRGB(cx-sq.W*0.40, sq.Top+sq.H*0.14, sq.W*0.80, sq.H*0.10, 0.9, 0.92, 0.95, 0.5, 0.52, 0.56, 0.28)
}

// 31. Pirámide cuadrangular -> Pirámide de Egipto (Egyptian pyramid)
func sceneEgypt(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	// Blazing desert sun
	c.fillCircle(sq.X+sq.W*0.82, sq.Top+sq.H*0.16, sq.W*0.12, 1.0, 0.82, 0.15)
	// Desert sand dunes
	c.fillStrokeRectRGB(sq.X, sq.Top+sq.H*0.75, sq.W, sq.H*0.24, 0.9, 0.8, 0.48, 0.7, 0.6, 0.3, 0.25)
	// Pyramid sunlit face (golden limestone)
	apex := pt{sq.X + sq.W*0.45, sq.Top + sq.H*0.18}
	pFront := pt{sq.X + sq.W*0.42, sq.Top + sq.H*0.82}
	pRight := pt{sq.X + sq.W*0.88, sq.Top + sq.H*0.82}
	pLeft := pt{sq.X + sq.W*0.06, sq.Top + sq.H*0.82}
	c.fillStrokePoly([]pt{apex, pRight, pFront}, 0.94, 0.8, 0.48, 0.65, 0.5, 0.2, 0.3)
	// Pyramid shadow face (amber sand)
	c.fillStrokePoly([]pt{apex, pFront, pLeft}, 0.74, 0.56, 0.3, 0.5, 0.35, 0.15, 0.3)
}

// 32. Tetraedro -> Carpa de campaña (Tetra tent)
func sceneTetraTent(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	apex := pt{cx, sq.Top + sq.H*0.12}
	pFront := pt{cx + sq.W*0.06, sq.Top + sq.H*0.85}
	pLeft := pt{sq.X + sq.W*0.08, sq.Top + sq.H*0.85}
	pRight := pt{sq.X + sq.W*0.92, sq.Top + sq.H*0.85}
	// Left bright orange tent canvas
	c.fillStrokePoly([]pt{apex, pFront, pLeft}, 0.96, 0.48, 0.12, 0.6, 0.2, 0.05, 0.3)
	// Right shaded rust canvas
	c.fillStrokePoly([]pt{apex, pRight, pFront}, 0.78, 0.34, 0.08, 0.5, 0.15, 0.05, 0.3)
	// Dark entrance flap
	c.fillStrokePoly([]pt{apex, pt{cx - sq.W*0.10, sq.Top + sq.H*0.85}, pFront}, 0.2, 0.25, 0.32, 0.1, 0.15, 0.2, 0.2)
}

// 33. Prisma triangular -> Tienda canadiense (A-frame tent)
func sceneCamp(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	// Front triangle entrance
	fPeak := pt{sq.X + sq.W*0.35, sq.Top + sq.H*0.22}
	fLeft := pt{sq.X + sq.W*0.06, sq.Top + sq.H*0.84}
	fRight := pt{sq.X + sq.W*0.50, sq.Top + sq.H*0.84}
	// Back peak and corner
	bPeak := pt{sq.X + sq.W*0.78, sq.Top + sq.H*0.22}
	bRight := pt{sq.X + sq.W*0.94, sq.Top + sq.H*0.84}
	// Roof slope (green canvas)
	c.fillStrokePoly([]pt{fPeak, bPeak, bRight, fRight}, 0.18, 0.56, 0.28, 0.08, 0.32, 0.12, 0.3)
	// Front cozy interior glow
	c.fillStrokePoly([]pt{fPeak, fRight, fLeft}, 1.0, 0.85, 0.35, 0.5, 0.35, 0.1, 0.28)
	// Dark entrance door opening
	c.fillStrokePoly([]pt{fPeak, pt{sq.X + sq.W*0.35, sq.Top + sq.H*0.84}, fLeft}, 0.22, 0.32, 0.22, 0.1, 0.15, 0.1, 0.2)
}

// 34. Prisma pentagonal -> Torreón de castillo (Castle tower)
func sceneTower(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	// Stone gray bastion body
	w := sq.W * 0.58
	top := sq.Top + sq.H*0.26
	h := sq.H * 0.68
	c.fillStrokeRectRGB(cx-w/2, top, w, h, 0.78, 0.8, 0.82, 0.45, 0.48, 0.52, 0.3)
	// Shaded right facet
	c.fillStrokeRectRGB(cx, top, w/2, h, 0.65, 0.68, 0.72, 0.45, 0.48, 0.52, 0.25)
	// Battlements / crenellations on top
	for i := 0; i < 4; i++ {
		bx := cx - w/2 + float64(i)*(w/4)
		c.fillStrokeRectRGB(bx, top-sq.H*0.08, w/5, sq.H*0.08, 0.75, 0.78, 0.8, 0.45, 0.48, 0.52, 0.2)
	}
	// Red pennant flag flying from peak
	c.lineRGB(pt{cx, top - sq.H*0.08}, pt{cx, top - sq.H*0.22}, 0.3, 0.3, 0.3, 0.35)
	c.fillStrokePoly([]pt{
		{cx, top - sq.H*0.22},
		{cx + sq.W*0.22, top - sq.H*0.16},
		{cx, top - sq.H*0.10},
	}, 0.88, 0.15, 0.15, 0.5, 0.08, 0.08, 0.2)
	// Arched window
	c.fillStrokeRectRGB(cx-sq.W*0.06, top+h*0.35, sq.W*0.12, h*0.22, 0.2, 0.25, 0.3, 0.1, 0.15, 0.2, 0.25)
}

// 35. Prisma hexagonal -> Lápiz escolar (Pencil)
func scenePencil(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	// Yellow hexagonal pencil body
	bodyW := sq.W * 0.56
	bodyH := sq.H * 0.36
	bx := sq.X + sq.W*0.08
	by := sq.Top + (sq.H-bodyH)/2
	c.fillStrokeRectRGB(bx, by, bodyW, bodyH, 1.0, 0.82, 0.16, 0.6, 0.45, 0.05, 0.28)
	// Shaded facet stripe
	c.fillStrokeRectRGB(bx, by+bodyH*0.62, bodyW, bodyH*0.38, 0.88, 0.68, 0.12, 0.6, 0.45, 0.05, 0.2)
	// Silver ferrule band
	c.fillStrokeRectRGB(bx, by, sq.W*0.10, bodyH, 0.82, 0.84, 0.88, 0.45, 0.48, 0.52, 0.25)
	// Pink eraser rubber
	c.fillStrokeRectRGB(bx-sq.W*0.08, by, sq.W*0.08, bodyH, 0.95, 0.55, 0.65, 0.65, 0.3, 0.4, 0.25)
	// Sharpened wooden cone tip
	wTip := pt{bx + bodyW + sq.W*0.28, by + bodyH/2}
	c.fillStrokePoly([]pt{
		{bx + bodyW, by},
		wTip,
		{bx + bodyW, by + bodyH},
	}, 0.88, 0.72, 0.52, 0.5, 0.35, 0.2, 0.25)
	// Dark graphite lead tip
	c.fillStrokePoly([]pt{
		{bx + bodyW + sq.W*0.18, by + bodyH*0.32},
		wTip,
		{bx + bodyW + sq.W*0.18, by + bodyH*0.68},
	}, 0.15, 0.15, 0.18, 0.05, 0.05, 0.08, 0.2)
}

// 36. Octaedro -> Cristal / Gema mágica (Crystal)
func sceneCrystal(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	cy := sq.Top + sq.H/2
	pTop := pt{cx, sq.Top + sq.H*0.08}
	pBot := pt{cx, sq.Top + sq.H*0.92}
	pLeft := pt{sq.X + sq.W*0.10, cy}
	pRight := pt{sq.X + sq.W*0.90, cy}
	pMidLeft := pt{cx - sq.W*0.18, cy + sq.H*0.08}
	pMidRight := pt{cx + sq.W*0.18, cy + sq.H*0.08}
	// Top lit facets (aquamarine)
	c.fillStrokePoly([]pt{pTop, pLeft, pMidLeft}, 0.65, 0.95, 0.98, 0.15, 0.5, 0.7, 0.25)
	c.fillStrokePoly([]pt{pTop, pMidLeft, pMidRight}, 0.45, 0.85, 0.95, 0.15, 0.5, 0.7, 0.25)
	c.fillStrokePoly([]pt{pTop, pMidRight, pRight}, 0.35, 0.75, 0.90, 0.15, 0.5, 0.7, 0.25)
	// Bottom shaded facets (sapphire)
	c.fillStrokePoly([]pt{pBot, pLeft, pMidLeft}, 0.25, 0.60, 0.85, 0.1, 0.3, 0.5, 0.25)
	c.fillStrokePoly([]pt{pBot, pMidLeft, pMidRight}, 0.18, 0.48, 0.78, 0.1, 0.3, 0.5, 0.25)
	c.fillStrokePoly([]pt{pBot, pMidRight, pRight}, 0.12, 0.38, 0.68, 0.1, 0.3, 0.5, 0.25)
	// White glint
	c.fillCircle(cx+sq.W*0.08, cy-sq.H*0.15, sq.W*0.035, 1.0, 1.0, 1.0)
}

// 37. Tronco de pirámide -> Pirámide maya (Mayan temple)
func sceneMaya(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	// 4 stepped stone tiers (limestone gray)
	for i := 0; i < 4; i++ {
		stepW := sq.W * (0.92 - float64(i)*0.16)
		stepH := sq.H * 0.14
		stepTop := sq.Top + sq.H*0.82 - float64(i+1)*stepH
		c.fillStrokeRectRGB(cx-stepW/2, stepTop, stepW, stepH, 0.78, 0.76, 0.70, 0.45, 0.42, 0.38, 0.25)
	}
	// Central stairway
	sTop := sq.Top + sq.H*0.26
	sH := sq.H * 0.56
	sW := sq.W * 0.20
	c.fillStrokeRectRGB(cx-sW/2, sTop, sW, sH, 0.65, 0.62, 0.55, 0.38, 0.35, 0.30, 0.25)
	// Top temple shrine block
	c.fillStrokeRectRGB(cx-sq.W*0.15, sTop-sq.H*0.12, sq.W*0.30, sq.H*0.12, 0.85, 0.82, 0.76, 0.45, 0.42, 0.38, 0.28)
}

// 38. Pirámide pentagonal -> Carpa de circo (Big top tent)
func sceneBigTop(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	cx := sq.X + sq.W/2
	apex := pt{cx, sq.Top + sq.H*0.14}
	// Tent wall base (striped blue/white)
	c.fillStrokeRectRGB(sq.X+sq.W*0.14, sq.Top+sq.H*0.62, sq.W*0.72, sq.H*0.28, 0.96, 0.96, 0.98, 0.4, 0.42, 0.46, 0.28)
	c.fillStrokeRectRGB(sq.X+sq.W*0.28, sq.Top+sq.H*0.62, sq.W*0.14, sq.H*0.28, 0.2, 0.5, 0.85, 0.1, 0.2, 0.4, 0.2)
	c.fillStrokeRectRGB(sq.X+sq.W*0.58, sq.Top+sq.H*0.62, sq.W*0.14, sq.H*0.28, 0.2, 0.5, 0.85, 0.1, 0.2, 0.4, 0.2)
	// Pentagonal tent roof striped red and white
	p1 := pt{sq.X + sq.W*0.10, sq.Top + sq.H*0.62}
	p2 := pt{sq.X + sq.W*0.28, sq.Top + sq.H*0.62}
	p3 := pt{sq.X + sq.W*0.50, sq.Top + sq.H*0.62}
	p4 := pt{sq.X + sq.W*0.72, sq.Top + sq.H*0.62}
	p5 := pt{sq.X + sq.W*0.90, sq.Top + sq.H*0.62}
	c.fillStrokePoly([]pt{apex, p2, p1}, 0.88, 0.15, 0.16, 0.5, 0.08, 0.08, 0.25)
	c.fillStrokePoly([]pt{apex, p3, p2}, 0.98, 0.96, 0.92, 0.5, 0.08, 0.08, 0.25)
	c.fillStrokePoly([]pt{apex, p4, p3}, 0.88, 0.15, 0.16, 0.5, 0.08, 0.08, 0.25)
	c.fillStrokePoly([]pt{apex, p5, p4}, 0.98, 0.96, 0.92, 0.5, 0.08, 0.08, 0.25)
	// Gold flag waving from apex
	c.lineRGB(apex, pt{cx, sq.Top + sq.H*0.04}, 0.3, 0.3, 0.3, 0.35)
	c.fillStrokePoly([]pt{
		{cx, sq.Top + sq.H*0.04},
		{cx + sq.W*0.18, sq.Top + sq.H*0.08},
		{cx, sq.Top + sq.H*0.12},
	}, 1.0, 0.82, 0.15, 0.6, 0.4, 0.05, 0.2)
}

// 39. Toro -> Salvavidas marino (Lifebuoy ring)
func sceneTire(c *canvas, box rectMm) {
	sq := innerSquare(box, 0.98)
	r := sq.W / 2
	cx, ct := sq.X+r, sq.Top+r
	// Safety orange ring
	c.fillStrokeCircle(cx, ct, r*0.96, 0.96, 0.42, 0.10, 0.6, 0.25, 0.05, 0.3)
	// 4 White quarter sectors
	c.fillStrokePie(cx, ct, r*0.96, r*0.96, 0.35, 1.22, 0.98, 0.98, 0.98, 0.6, 0.25, 0.05, 0.25)
	c.fillStrokePie(cx, ct, r*0.96, r*0.96, 1.92, 2.79, 0.98, 0.98, 0.98, 0.6, 0.25, 0.05, 0.25)
	c.fillStrokePie(cx, ct, r*0.96, r*0.96, 3.49, 4.36, 0.98, 0.98, 0.98, 0.6, 0.25, 0.05, 0.25)
	c.fillStrokePie(cx, ct, r*0.96, r*0.96, 5.06, 5.93, 0.98, 0.98, 0.98, 0.6, 0.25, 0.05, 0.25)
	// Inner hole (paper white)
	c.fillStrokeCircle(cx, ct, r*0.48, 1.0, 1.0, 1.0, 0.6, 0.25, 0.05, 0.28)
	// Grab rope around the buoy
	c.arc(cx, ct, r*1.08, r*1.08, 0, 2*math.Pi)
	c.b.WriteString("0.85 0.85 0.9 RG 0.5 w S\n0 G\n")
}
