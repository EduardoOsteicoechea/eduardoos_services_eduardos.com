package pdf

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"strings"
)

// BuildHomescoolRasterPDF embeds one full-bleed color JPEG per US Letter portrait page.
// Used for pixel-faithful Homescool exports captured from the styled FE sheets.
func BuildHomescoolRasterPDF(pageImages [][]byte) ([]byte, error) {
	if len(pageImages) == 0 {
		return nil, fmt.Errorf("no pages")
	}
	pageW := MmToPoints(EoschoolPageWidthMm)
	pageH := MmToPoints(EoschoolPageHeightMm)

	type rasterPage struct {
		jpeg []byte
		w, h int
	}
	rasters := make([]rasterPage, 0, len(pageImages))
	for i, raw := range pageImages {
		jpegBytes, w, h, err := normalizeColorJPEG(raw)
		if err != nil {
			return nil, fmt.Errorf("page %d: %w", i+1, err)
		}
		rasters = append(rasters, rasterPage{jpeg: jpegBytes, w: w, h: h})
	}

	n := len(rasters)
	// 1 Catalog, 2 Pages, then per page: Page, Contents, Image (3 objs).
	kids := make([]string, 0, n)
	for i := 0; i < n; i++ {
		pageObj := 3 + 3*i
		kids = append(kids, fmt.Sprintf("%d 0 R", pageObj))
	}

	var objs [][]byte
	objs = append(objs, []byte("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"))
	objs = append(objs, []byte(fmt.Sprintf(
		"2 0 obj\n<< /Type /Pages /Kids [%s] /Count %d >>\nendobj\n",
		strings.Join(kids, " "), n,
	)))

	for i, rp := range rasters {
		pageObj := 3 + 3*i
		contentObj := 4 + 3*i
		imageObj := 5 + 3*i
		objs = append(objs, []byte(fmt.Sprintf(
			"%d 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents %d 0 R /Resources << /XObject << /Im0 %d 0 R >> >> >>\nendobj\n",
			pageObj, pageW, pageH, contentObj, imageObj,
		)))
		content := fmt.Sprintf("q\n%.2f 0 0 %.2f 0 0 cm\n/Im0 Do\nQ\n", pageW, pageH)
		objs = append(objs, buildStreamObject(contentObj, content))
		objs = append(objs, buildColorJPEGXObject(imageObj, rp.w, rp.h, rp.jpeg))
	}

	return assemblePDF(objs), nil
}

func buildColorJPEGXObject(objNum, width, height int, jpegBytes []byte) []byte {
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "%d 0 obj\n", objNum)
	fmt.Fprintf(&buf,
		"<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length %d >>\n",
		width, height, len(jpegBytes),
	)
	buf.WriteString("stream\n")
	buf.Write(jpegBytes)
	buf.WriteString("\nendstream\nendobj\n")
	return buf.Bytes()
}

func normalizeColorJPEG(raw []byte) (jpegBytes []byte, w, h int, err error) {
	raw = bytes.TrimSpace(raw)
	if len(raw) == 0 {
		return nil, 0, 0, fmt.Errorf("empty image")
	}
	img, _, decErr := image.Decode(bytes.NewReader(raw))
	if decErr != nil {
		if isJPEG(raw) {
			if cw, ch, ok := jpegSize(raw); ok {
				return raw, cw, ch, nil
			}
		}
		return nil, 0, 0, fmt.Errorf("decode print image: %w", decErr)
	}
	rgba := imageToRGBA(img)
	var buf bytes.Buffer
	if encErr := jpeg.Encode(&buf, rgba, &jpeg.Options{Quality: 92}); encErr != nil {
		return nil, 0, 0, encErr
	}
	b := rgba.Bounds()
	return buf.Bytes(), b.Dx(), b.Dy(), nil
}

func imageToRGBA(src image.Image) *image.RGBA {
	b := src.Bounds()
	out := image.NewRGBA(b)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			out.Set(x, y, src.At(x, y))
		}
	}
	return out
}
