package pdf

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"strings"
	"testing"
)

func TestBuildHomescoolRasterPDF(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 40, 50))
	for y := 0; y < 50; y++ {
		for x := 0; x < 40; x++ {
			img.Set(x, y, color.RGBA{R: 230, G: 246, B: 239, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}
	raw, err := BuildHomescoolRasterPDF([][]byte{buf.Bytes(), buf.Bytes()})
	if err != nil {
		t.Fatal(err)
	}
	s := string(raw)
	if !strings.HasPrefix(s, "%PDF") {
		t.Fatal("missing PDF header")
	}
	if !strings.Contains(s, "/DeviceRGB") || !strings.Contains(s, "/DCTDecode") {
		t.Fatal("expected color JPEG XObject")
	}
	if !strings.Contains(s, "/Count 2") {
		t.Fatal("expected 2 pages")
	}
}
