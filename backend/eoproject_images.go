package main

import (
	"bytes"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"path"
	"strings"

	"github.com/chai2010/webp"
	"golang.org/x/image/draw"
)

const (
	eoprojectWebpQuality  = 82
	eoprojectMaxPhotoEdge = 2560
)

func eoprojectToWebp(data []byte, mime string) ([]byte, error) {
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
	src = downscaleEoprojectImage(src, eoprojectMaxPhotoEdge)
	var buf bytes.Buffer
	if err := webp.Encode(&buf, src, &webp.Options{Lossless: false, Quality: eoprojectWebpQuality}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func downscaleEoprojectImage(src image.Image, maxEdge int) image.Image {
	b := src.Bounds()
	w := b.Dx()
	h := b.Dy()
	if w <= 0 || h <= 0 || (w <= maxEdge && h <= maxEdge) {
		return src
	}
	scale := float64(maxEdge)
	if w >= h {
		scale = float64(maxEdge) / float64(w)
	} else {
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

func eoprojectWebpOriginalName(name string) string {
	name = path.Base(strings.TrimSpace(name))
	if ext := path.Ext(name); ext != "" {
		name = strings.TrimSuffix(name, ext)
	}
	return name + ".webp"
}
