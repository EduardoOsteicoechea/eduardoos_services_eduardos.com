package arithsheet

import (
	"bytes"
	"compress/zlib"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"os"
	"path/filepath"
	"runtime"
)

var solidPhotoNames = []string{
	"01-cubo.png",
	"02-ortoedro.png",
	"03-esfera.png",
	"04-hemisferio.png",
	"05-cilindro.png",
	"06-cono.png",
	"07-tronco-cono.png",
	"08-piramide-cuadrada.png",
	"09-tetraedro.png",
	"10-prisma-triangular.png",
	"11-prisma-pentagonal.png",
	"12-prisma-hexagonal.png",
	"13-octaedro.png",
	"14-tronco-piramide.png",
	"15-piramide-pentagonal.png",
	"16-toro.png",
}

func loadScenePhotos() [][]byte {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return nil
	}
	dir := filepath.Join(filepath.Dir(file), "..", "..", ".data", "arithsheet-scenes")
	out := make([][]byte, 40)
	n := 0
	for i := range out {
		b, err := os.ReadFile(filepath.Join(dir, fmt.Sprintf("%02d.png", i+1)))
		if err != nil || len(b) == 0 {
			continue
		}
		out[i] = b
		n++
	}
	if n != len(out) {
		return nil
	}
	return out
}

func loadSolidPhotos() [][]byte {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return nil
	}
	dir := filepath.Join(filepath.Dir(file), "..", "..", ".data", "arithsheet-solids")
	out := make([][]byte, len(solidPhotoNames))
	any := false
	for i, name := range solidPhotoNames {
		b, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil || len(b) == 0 {
			continue
		}
		out[i] = b
		any = true
	}
	if !any {
		return nil
	}
	return out
}

func fitRect(box rectMm, iw, ih int) rectMm {
	if iw < 1 || ih < 1 {
		return box
	}
	ar := float64(iw) / float64(ih)
	if box.W/box.H > ar {
		w := box.H * ar
		return rectMm{X: box.X + (box.W-w)/2, Top: box.Top, W: w, H: box.H}
	}
	h := box.W / ar
	return rectMm{X: box.X, Top: box.Top + (box.H-h)/2, W: box.W, H: h}
}

func isSheetBackdrop(r, g, b, a uint32) bool {
	if a < 2000 {
		return true
	}
	// Light plate is about 234,235,236. Shaded faces stay darker than that.
	const white = 248 * 257
	if r >= white && g >= white && b >= white {
		return true
	}
	const tol = 14 * 257
	dr := int(r) - 234*257
	dg := int(g) - 235*257
	db := int(b) - 236*257
	if dr < 0 {
		dr = -dr
	}
	if dg < 0 {
		dg = -dg
	}
	if db < 0 {
		db = -db
	}
	return dr <= tol && dg <= tol && db <= tol
}

func opaqueBounds(src image.Image) image.Rectangle {
	b := src.Bounds()
	minx, miny := b.Max.X, b.Max.Y
	maxx, maxy := b.Min.X, b.Min.Y
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			r, g, bl, a := src.At(x, y).RGBA()
			if isSheetBackdrop(r, g, bl, a) {
				continue
			}
			if x < minx {
				minx = x
			}
			if y < miny {
				miny = y
			}
			if x+1 > maxx {
				maxx = x + 1
			}
			if y+1 > maxy {
				maxy = y + 1
			}
		}
	}
	if minx >= maxx || miny >= maxy {
		return b
	}
	const pad = 28
	minx -= pad
	miny -= pad
	maxx += pad
	maxy += pad
	if minx < b.Min.X {
		minx = b.Min.X
	}
	if miny < b.Min.Y {
		miny = b.Min.Y
	}
	if maxx > b.Max.X {
		maxx = b.Max.X
	}
	if maxy > b.Max.Y {
		maxy = b.Max.Y
	}
	return image.Rect(minx, miny, maxx, maxy)
}

func (c *canvas) drawPNG(box rectMm, raw []byte) {
	src, err := png.Decode(bytes.NewReader(raw))
	if err != nil {
		return
	}
	b := opaqueBounds(src)
	w, h := b.Dx(), b.Dy()
	rgba := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(rgba, rgba.Bounds(), image.White, image.Point{}, draw.Src)
	draw.Draw(rgba, rgba.Bounds(), src, b.Min, draw.Over)
	rgb := make([]byte, w*h*3)
	n := 0
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			p := rgba.RGBAAt(x, y)
			r, g, b, a := p.RGBA()
			if isSheetBackdrop(r, g, b, a) {
				p = color.RGBA{R: 255, G: 255, B: 255, A: 255}
			}
			rgb[n] = p.R
			rgb[n+1] = p.G
			rgb[n+2] = p.B
			n += 3
		}
	}
	var buf bytes.Buffer
	zw, err := zlib.NewWriterLevel(&buf, zlib.BestSpeed)
	if err != nil {
		return
	}
	if _, err := zw.Write(rgb); err != nil {
		return
	}
	if err := zw.Close(); err != nil {
		return
	}
	c.images = append(c.images, sheetImage{w: w, h: h, data: buf.String()})
	fitted := fitRect(box, w, h)
	fmt.Fprintf(&c.b, "q\n%.2f 0 0 %.2f %.2f %.2f cm\n/Im%d Do\nQ\n",
		mmToPt(fitted.W), mmToPt(fitted.H), c.xp(fitted.X), c.yp(fitted.Top+fitted.H), len(c.images))
}
