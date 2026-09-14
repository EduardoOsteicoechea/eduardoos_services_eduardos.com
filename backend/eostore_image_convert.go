package main

import (
	"bytes"
	"image"
	_ "image/jpeg"
	_ "image/png"

	"github.com/gen2brain/webp"
	"golang.org/x/image/draw"
)

const (
	eostoreWebpQuality  = 82
	eostoreMaxPhotoEdge = 2560
)

func eostoreToWebp(data []byte, mime string) ([]byte, error) {
	var src image.Image
	var err error
	if mime == "image/webp" {
		src, err = webp.Decode(bytes.NewReader(data))
	} else {
		src, _, err = image.Decode(bytes.NewReader(data))
	}
	if err != nil {
		return nil, err
	}
	src = downscaleEostoreImage(src, eostoreMaxPhotoEdge)
	var buf bytes.Buffer
	if err := webp.Encode(&buf, src, webp.Options{Quality: eostoreWebpQuality}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func downscaleEostoreImage(src image.Image, maxEdge int) image.Image {
	b := src.Bounds()
	w := b.Dx()
	h := b.Dy()
	if w <= 0 || h <= 0 || (w <= maxEdge && h <= maxEdge) {
		return src
	}
	scale := float64(maxEdge) / float64(w)
	if h > w {
		scale = float64(maxEdge) / float64(h)
	}
	nw := int(float64(w)*scale + 0.5)
	nh := int(float64(h)*scale + 0.5)
	if nw < 1 {
		nw = 1
	}
	if nh < 1 {
		nh = 1
	}
	dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, b, draw.Over, nil)
	return dst
}
