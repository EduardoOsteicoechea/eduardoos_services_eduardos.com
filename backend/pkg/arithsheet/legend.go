package arithsheet

import "strings"

// legendSeed shuffles the plane and solid figures of sheet 2.
const legendSeed = sampleSeed + 97

type figureCaption struct {
	name  string
	blurb string
}

// figureCaptions matches sheet 2: planes 0–23, then solids 24–39.
var figureCaptions = []figureCaption{
	{"Círculo", "Curva cerrada. Todo punto equidista del centro."},
	{"Elipse", "Óvalo cerrado, como un círculo estirado."},
	{"Semicírculo", "La mitad exacta de un círculo."},
	{"Cuadrado", "Cuatro lados iguales y cuatro ángulos rectos."},
	{"Rectángulo", "Ángulos rectos. Los lados opuestos son iguales."},
	{"Triángulo equilátero", "Tres lados y tres ángulos iguales."},
	{"Triángulo isósceles", "Tiene dos lados iguales."},
	{"Triángulo escaleno", "Sus tres lados miden distinto."},
	{"Triángulo rectángulo", "Uno de sus ángulos mide 90 grados."},
	{"Rombo", "Cuatro lados iguales, como un cuadrado inclinado."},
	{"Paralelogramo", "Lados opuestos paralelos e iguales."},
	{"Trapecio isósceles", "Un par de lados paralelos; los otros, iguales."},
	{"Trapecio rectángulo", "Un par de lados paralelos y un ángulo recto."},
	{"Cometa", "Dos pares de lados iguales que se tocan."},
	{"Pentágono", "Figura de cinco lados iguales."},
	{"Hexágono", "Figura de seis lados iguales."},
	{"Heptágono", "Figura de siete lados iguales."},
	{"Octágono", "Figura de ocho lados iguales."},
	{"Eneágono", "Figura de nueve lados iguales."},
	{"Decágono", "Figura de diez lados iguales."},
	{"Sector circular", "Una rebanada del círculo."},
	{"Corona circular", "Un anillo: círculo con un hueco en el centro."},
	{"Estrella", "Cinco puntas regulares."},
	{"Cruz griega", "Cuatro brazos iguales que se cruzan."},
	{"Cubo", "Seis caras cuadradas, todas iguales."},
	{"Ortoedro", "Como un cubo, con caras rectangulares."},
	{"Esfera", "Cuerpo redondo. Su superficie equidista del centro."},
	{"Semiesfera", "La mitad de una esfera."},
	{"Cilindro", "Dos círculos iguales unidos por una pared curva."},
	{"Cono", "Base circular que termina en un punto."},
	{"Tronco de cono", "Un cono al que se le cortó la punta."},
	{"Pirámide cuadrangular", "Base cuadrada y caras triangulares."},
	{"Tetraedro", "Cuatro caras que son triángulos."},
	{"Prisma triangular", "Dos bases triangulares y lados rectos."},
	{"Prisma pentagonal", "Dos bases de cinco lados."},
	{"Prisma hexagonal", "Dos bases de seis lados."},
	{"Octaedro", "Ocho caras triangulares."},
	{"Tronco de pirámide", "Una pirámide sin la punta."},
	{"Pirámide pentagonal", "Base de cinco lados y caras triangulares."},
	{"Toro", "Cuerpo con forma de rosquilla."},
}

// BuildFigureKey is one landscape sheet: the sheet-2 figures, scrambled,
// each image in half the cell, with its name and a short description.
func BuildFigureKey() []byte {
	content, images := renderLegend()
	return assembleDocs([]pageDoc{{content: content, images: images}})
}

func renderLegend() (string, []sheetImage) {
	c := newCanvas()
	g := newGeom()
	order := scrambledSceneOrder(legendSeed)
	solids := loadSolidPhotos()
	half := (len(order) + 1) / 2
	for n, id := range order {
		origin := g.leftX
		slot := n
		if n >= half {
			origin = g.rightX
			slot = n - half
		}
		cell := g.cell(origin, slot%gridCols, slot/gridCols)
		box := legendImageArea(cell)
		switch {
		case id < len(planeFigs):
			c.figureStroke()
			planeFigs[id](c, box)
			c.resetColor()
		case solids != nil && id-len(planeFigs) < len(solids) && len(solids[id-len(planeFigs)]) > 0:
			c.drawPNG(box, solids[id-len(planeFigs)])
		case id-len(planeFigs) < len(solidFigs):
			c.figureStroke()
			solidFigs[id-len(planeFigs)](c, box)
			c.resetColor()
		}
		if id >= 0 && id < len(figureCaptions) {
			drawCaption(c, cell, figureCaptions[id])
		}
	}
	drawGrid(c, g, g.leftX)
	drawGrid(c, g, g.rightX)
	return c.b.String(), c.images
}

func legendImageArea(cell rectMm) rectMm {
	return rectMm{
		X:   cell.X + 1.2,
		Top: cell.Top + 0.5,
		W:   cell.W - 2.4,
		H:   cell.H * 0.50,
	}
}

func drawCaption(c *canvas, cell rectMm, cap figureCaption) {
	textW := cell.W - 2.2
	namePt := 6.0
	blurbPt := 5.0
	nameH := namePt * 1.25 * 25.4 / 72
	blurbH := blurbPt * 1.15 * 25.4 / 72
	top := cell.Top + cell.H*0.53
	c.text(cap.name, cell.X+0.3, top, textW, nameH, namePt, false)
	maxRunes := int(textW / (blurbPt * 0.50 * 25.4 / 72))
	lines := wrapWords(cap.blurb, maxRunes)
	for i, line := range lines {
		if i >= 3 {
			break
		}
		c.text(line, cell.X+0.3, top+nameH+float64(i)*blurbH, textW, blurbH, blurbPt, false)
	}
}

func wrapWords(s string, maxRunes int) []string {
	if maxRunes < 8 {
		maxRunes = 8
	}
	var lines []string
	cur := ""
	for _, word := range strings.Fields(s) {
		if cur == "" {
			cur = word
			continue
		}
		if len([]rune(cur))+1+len([]rune(word)) <= maxRunes {
			cur += " " + word
			continue
		}
		lines = append(lines, cur)
		cur = word
	}
	if cur != "" {
		lines = append(lines, cur)
	}
	return lines
}
