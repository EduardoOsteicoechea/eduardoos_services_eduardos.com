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
	homescoolProgressWebpQuality  = 82
	homescoolProgressMaxPhotoEdge = 4096
	homescoolProgressThumbEdge    = 480
	homescoolProgressMaxBytes     = 50 << 20
	homescoolProgressMaxSniffEdge = 8192
)

func homescoolProgressToWebp(data []byte, mime string) ([]byte, error) {
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
	return homescoolProgressEncodeWebp(downscaleHomescoolProgressImage(src, homescoolProgressMaxPhotoEdge))
}
func homescoolProgressThumbWebp(data []byte, mime string) ([]byte, error) {
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
	return homescoolProgressEncodeWebp(downscaleHomescoolProgressImage(src, homescoolProgressThumbEdge))
}
func homescoolProgressEncodeWebp(src image.Image) ([]byte, error) {
	var buf bytes.Buffer
	if err := webp.Encode(&buf, src, webp.Options{Quality: homescoolProgressWebpQuality}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
func downscaleHomescoolProgressImage(src image.Image, maxEdge int) image.Image {
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= 0 || h <= 0 || (w <= maxEdge && h <= maxEdge) {
		return src
	}
	scale := float64(maxEdge) / float64(w)
	if h > w {
		scale = float64(maxEdge) / float64(h)
	}
	nw, nh := int(float64(w)*scale+.5), int(float64(h)*scale+.5)
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
func detectHomescoolProgressImage(data []byte) (avatarKind, error) {
	if len(data) > homescoolProgressMaxBytes {
		return avatarKind{}, errAvatarTooLarge
	}
	if len(data) < 12 {
		return avatarKind{}, errAvatarInvalid
	}
	kind, err := sniffImage(data)
	if err != nil {
		return avatarKind{}, err
	}
	cfg, err := decodeConfig(data, kind.mime)
	if err != nil || cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > homescoolProgressMaxSniffEdge || cfg.Height > homescoolProgressMaxSniffEdge {
		return avatarKind{}, errAvatarInvalid
	}
	return kind, nil
}
