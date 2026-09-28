package pdf

import (
	"bytes"
	_ "embed"
	"image"
	"image/jpeg"
	"sync"
)

//go:embed assets/panfletbg.png
var panfletbgPNG []byte

const pamphletSheetBgName = "ImBg"

var (
	sheetBgOnce sync.Once
	sheetBgImg  pdfImage
	sheetBgOK   bool
)

// loadPamphletSheetBackground JPEG-encodes the embedded page art once.
func loadPamphletSheetBackground() (pdfImage, bool) {
	sheetBgOnce.Do(func() {
		img, _, err := image.Decode(bytes.NewReader(panfletbgPNG))
		if err != nil {
			return
		}
		bounds := img.Bounds()
		w, h := bounds.Dx(), bounds.Dy()
		if w < 1 || h < 1 {
			return
		}
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
			return
		}
		sheetBgImg = pdfImage{
			key:    pamphletSheetBgName,
			name:   pamphletSheetBgName,
			jpeg:   buf.Bytes(),
			width:  w,
			height: h,
		}
		sheetBgOK = true
	})
	return sheetBgImg, sheetBgOK
}
