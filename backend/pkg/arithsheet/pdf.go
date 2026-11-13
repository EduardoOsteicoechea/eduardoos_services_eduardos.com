package arithsheet

import (
	"fmt"
	"math"
	"strings"
)

func mmToPt(mm float64) float64 { return mm * (72.0 / 25.4) }

type canvas struct {
	b     strings.Builder
	pageH float64
}

func newCanvas() *canvas {
	c := &canvas{pageH: pageHeightMm}
	c.b.WriteString("0 J 0 j\n0 g\n0 G\n")
	return c
}

func (c *canvas) xp(mm float64) float64 { return mmToPt(mm) }

func (c *canvas) yp(top float64) float64 { return mmToPt(c.pageH - top) }

func (c *canvas) setStroke(widthMm, gray float64) {
	fmt.Fprintf(&c.b, "%.3f w\n%.3f G\n", mmToPt(widthMm), gray)
}

func (c *canvas) figureStroke() {
	c.b.WriteString("1 J 1 j\n")
	fmt.Fprintf(&c.b, "%.3f w\n0 G\n", mmToPt(0.28))
}

func (c *canvas) sharpStroke(widthMm float64) {
	c.b.WriteString("0 J 0 j\n")
	c.setStroke(widthMm, 0)
}

func (c *canvas) stroke() { c.b.WriteString("S\n") }

func (c *canvas) moveTo(x, top float64) {
	fmt.Fprintf(&c.b, "%.2f %.2f m\n", c.xp(x), c.yp(top))
}

func (c *canvas) lineTo(x, top float64) {
	fmt.Fprintf(&c.b, "%.2f %.2f l\n", c.xp(x), c.yp(top))
}

func (c *canvas) seg(a, b pt) {
	fmt.Fprintf(&c.b, "%.2f %.2f m %.2f %.2f l S\n", c.xp(a.x), c.yp(a.top), c.xp(b.x), c.yp(b.top))
}

func (c *canvas) poly(pts []pt, close bool) {
	if len(pts) < 2 {
		return
	}
	fmt.Fprintf(&c.b, "%.2f %.2f m\n", c.xp(pts[0].x), c.yp(pts[0].top))
	for _, p := range pts[1:] {
		fmt.Fprintf(&c.b, "%.2f %.2f l\n", c.xp(p.x), c.yp(p.top))
	}
	if close {
		c.b.WriteString("h\n")
	}
	c.stroke()
}

func (c *canvas) rect(x, top, w, h float64) {
	fmt.Fprintf(&c.b, "%.2f %.2f %.2f %.2f re S\n", c.xp(x), c.yp(top+h), mmToPt(w), mmToPt(h))
}

func (c *canvas) fillRect(x, top, w, h, gray float64) {
	fmt.Fprintf(&c.b, "%.3f g\n%.2f %.2f %.2f %.2f re f\n0 g\n",
		gray, c.xp(x), c.yp(top+h), mmToPt(w), mmToPt(h))
}

func (c *canvas) resetColor() {
	c.b.WriteString("0 g\n0 G\n")
}

func (c *canvas) fillRGB(r, g, b float64) {
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f rg\n", r, g, b)
}

func (c *canvas) strokeRGB(r, g, b, widthMm float64) {
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f RG\n%.3f w\n", r, g, b, mmToPt(widthMm))
}

func (c *canvas) fillRectRGB(x, top, w, h, r, g, b float64) {
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f rg\n%.2f %.2f %.2f %.2f re f\n0 g\n",
		r, g, b, c.xp(x), c.yp(top+h), mmToPt(w), mmToPt(h))
}

func (c *canvas) fillStrokeRectRGB(x, top, w, h, fr, fg, fb, sr, sg, sb, widthMm float64) {
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f rg\n%.3f %.3f %.3f RG\n%.3f w\n%.2f %.2f %.2f %.2f re b\n0 g\n0 G\n",
		fr, fg, fb, sr, sg, sb, mmToPt(widthMm), c.xp(x), c.yp(top+h), mmToPt(w), mmToPt(h))
}

func (c *canvas) fillPoly(pts []pt, r, g, b float64) {
	if len(pts) < 3 {
		return
	}
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f rg\n%.2f %.2f m\n", r, g, b, c.xp(pts[0].x), c.yp(pts[0].top))
	for _, p := range pts[1:] {
		fmt.Fprintf(&c.b, "%.2f %.2f l\n", c.xp(p.x), c.yp(p.top))
	}
	c.b.WriteString("h f\n0 g\n")
}

func (c *canvas) fillStrokePoly(pts []pt, fr, fg, fb, sr, sg, sb, widthMm float64) {
	if len(pts) < 3 {
		return
	}
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f rg\n%.3f %.3f %.3f RG\n%.3f w\n%.2f %.2f m\n",
		fr, fg, fb, sr, sg, sb, mmToPt(widthMm), c.xp(pts[0].x), c.yp(pts[0].top))
	for _, p := range pts[1:] {
		fmt.Fprintf(&c.b, "%.2f %.2f l\n", c.xp(p.x), c.yp(p.top))
	}
	c.b.WriteString("h b\n0 g\n0 G\n")
}

func (c *canvas) fillEllipse(cx, ctop, rx, ry, r, g, b float64) {
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f rg\n", r, g, b)
	c.arc(cx, ctop, rx, ry, 0, 2*math.Pi)
	c.b.WriteString("f\n0 g\n")
}

func (c *canvas) fillStrokeEllipse(cx, ctop, rx, ry float64, fr, fg, fb, sr, sg, sb, widthMm float64) {
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f rg\n%.3f %.3f %.3f RG\n%.3f w\n",
		fr, fg, fb, sr, sg, sb, mmToPt(widthMm))
	c.arc(cx, ctop, rx, ry, 0, 2*math.Pi)
	c.b.WriteString("b\n0 g\n0 G\n")
}

func (c *canvas) fillCircle(cx, ctop, rad, r, g, b float64) {
	c.fillEllipse(cx, ctop, rad, rad, r, g, b)
}

func (c *canvas) fillStrokeCircle(cx, ctop, rad float64, fr, fg, fb, sr, sg, sb, widthMm float64) {
	c.fillStrokeEllipse(cx, ctop, rad, rad, fr, fg, fb, sr, sg, sb, widthMm)
}

func (c *canvas) fillStrokePie(cx, ctop, rx, ry, a0, a1 float64, fr, fg, fb, sr, sg, sb, widthMm float64) {
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f rg\n%.3f %.3f %.3f RG\n%.3f w\n",
		fr, fg, fb, sr, sg, sb, mmToPt(widthMm))
	fmt.Fprintf(&c.b, "%.2f %.2f m\n", c.xp(cx), c.yp(ctop))
	p0x, p0t := polar(cx, ctop, rx, ry, a0)
	fmt.Fprintf(&c.b, "%.2f %.2f l\n", c.xp(p0x), c.yp(p0t))
	const maxSeg = math.Pi / 2
	sweep := a1 - a0
	n := int(math.Ceil(math.Abs(sweep)/maxSeg - 1e-9))
	if n < 1 {
		n = 1
	}
	step := sweep / float64(n)
	for i := 0; i < n; i++ {
		c.arcSeg(cx, ctop, rx, ry, a0+float64(i)*step, a0+float64(i+1)*step, false)
	}
	fmt.Fprintf(&c.b, "%.2f %.2f l h b\n0 g\n0 G\n", c.xp(cx), c.yp(ctop))
}

func (c *canvas) lineRGB(p1, p2 pt, r, g, b, widthMm float64) {
	fmt.Fprintf(&c.b, "%.3f %.3f %.3f RG\n%.3f w\n%.2f %.2f m %.2f %.2f l S\n0 G\n",
		r, g, b, mmToPt(widthMm), c.xp(p1.x), c.yp(p1.top), c.xp(p2.x), c.yp(p2.top))
}

func (c *canvas) arc(cx, ctop, rx, ry, a0, a1 float64) {
	const maxSeg = math.Pi / 2
	sweep := a1 - a0
	n := int(math.Ceil(math.Abs(sweep)/maxSeg - 1e-9))
	if n < 1 {
		n = 1
	}
	step := sweep / float64(n)
	for i := 0; i < n; i++ {
		c.arcSeg(cx, ctop, rx, ry, a0+float64(i)*step, a0+float64(i+1)*step, i == 0)
	}
}

func (c *canvas) arcSeg(cx, ctop, rx, ry, a0, a1 float64, move bool) {
	p0x, p0t := polar(cx, ctop, rx, ry, a0)
	p3x, p3t := polar(cx, ctop, rx, ry, a1)
	k := (4.0 / 3.0) * math.Tan((a1-a0)/4)
	cp1x := p0x + k*(-rx*math.Sin(a0))
	cp1t := p0t + k*(-ry*math.Cos(a0))
	cp2x := p3x - k*(-rx*math.Sin(a1))
	cp2t := p3t - k*(-ry*math.Cos(a1))
	if move {
		fmt.Fprintf(&c.b, "%.2f %.2f m\n", c.xp(p0x), c.yp(p0t))
	}
	fmt.Fprintf(&c.b, "%.2f %.2f %.2f %.2f %.2f %.2f c\n",
		c.xp(cp1x), c.yp(cp1t), c.xp(cp2x), c.yp(cp2t), c.xp(p3x), c.yp(p3t))
}

func (c *canvas) ellipse(cx, ctop, rx, ry float64) {
	c.arc(cx, ctop, rx, ry, 0, 2*math.Pi)
	c.stroke()
}

// text draws s in a box. center places it on the box midpoint; otherwise it
// sits on the left with a 1 mm inset. The baseline is vertically centered.
func (c *canvas) text(s string, x, top, w, h, fontPt float64, center bool) {
	if s == "" {
		return
	}
	enc := escapePDF(toWinAnsi(s))
	fontMm := fontPt * 25.4 / 72.0
	baselineTop := top + h/2 + 0.28*fontMm
	var xPt float64
	if center {
		widthPt := float64(len([]rune(s))) * fontPt * 0.56
		xPt = mmToPt(x+w/2) - widthPt/2
	} else {
		xPt = mmToPt(x + 1)
	}
	fmt.Fprintf(&c.b, "BT /F1 %.2f Tf %.2f %.2f Td (%s) Tj ET\n", fontPt, xPt, c.yp(baselineTop), enc)
}

func polar(cx, ctop, rx, ry, ang float64) (x, top float64) {
	return cx + rx*math.Cos(ang), ctop - ry*math.Sin(ang)
}

type pt struct {
	x, top float64
}

func toWinAnsi(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch r {
		case 'á':
			b.WriteByte(0xE1)
		case 'é':
			b.WriteByte(0xE9)
		case 'í':
			b.WriteByte(0xED)
		case 'ó':
			b.WriteByte(0xF3)
		case 'ú':
			b.WriteByte(0xFA)
		case 'ñ':
			b.WriteByte(0xF1)
		case 'Á':
			b.WriteByte(0xC1)
		case 'É':
			b.WriteByte(0xC9)
		case 'Í':
			b.WriteByte(0xCD)
		case 'Ó':
			b.WriteByte(0xD3)
		case 'Ú':
			b.WriteByte(0xDA)
		case 'Ñ':
			b.WriteByte(0xD1)
		case '×':
			b.WriteByte(0xD7)
		case '÷':
			b.WriteByte(0xF7)
		default:
			if r >= 0 && r < 128 {
				b.WriteByte(byte(r))
			}
		}
	}
	return b.String()
}

func escapePDF(s string) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		ch := s[i]
		switch {
		case ch == '\\':
			b.WriteString(`\\`)
		case ch == '(':
			b.WriteString(`\(`)
		case ch == ')':
			b.WriteString(`\)`)
		case ch < 0x20 || ch >= 0x7F:
			fmt.Fprintf(&b, `\%03o`, ch)
		default:
			b.WriteByte(ch)
		}
	}
	return b.String()
}

func assemble(pages []string) []byte {
	font := "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\n"
	kids := make([]string, len(pages))
	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>\n",
		"", // pages, filled once kids are known
		font,
	}
	for i, content := range pages {
		pageObj := len(objects) + 1
		contentObj := pageObj + 1
		kids[i] = fmt.Sprintf("%d 0 R", pageObj)
		objects = append(objects,
			fmt.Sprintf("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents %d 0 R /Resources << /Font << /F1 3 0 R >> >> >>\n",
				mmToPt(pageWidthMm), mmToPt(pageHeightMm), contentObj),
			contentObject(content),
		)
	}
	objects[1] = fmt.Sprintf("<< /Type /Pages /Kids [%s] /Count %d >>\n", strings.Join(kids, " "), len(pages))

	var b strings.Builder
	b.WriteString("%PDF-1.4\n")
	offsets := make([]int, len(objects)+1)
	for i, obj := range objects {
		offsets[i+1] = b.Len()
		fmt.Fprintf(&b, "%d 0 obj\n%sendobj\n", i+1, obj)
	}
	xref := b.Len()
	fmt.Fprintf(&b, "xref\n0 %d\n", len(objects)+1)
	b.WriteString("0000000000 65535 f \n")
	for i := 1; i <= len(objects); i++ {
		fmt.Fprintf(&b, "%010d 00000 n \n", offsets[i])
	}
	fmt.Fprintf(&b, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objects)+1, xref)
	return []byte(b.String())
}

func contentObject(data string) string {
	if !strings.HasSuffix(data, "\n") {
		data += "\n"
	}
	return fmt.Sprintf("<< /Length %d >>\nstream\n%sendstream\n", len(data), data)
}
