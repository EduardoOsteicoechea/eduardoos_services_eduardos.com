package pdf

// Raleway Regular + Bold (OFL 1.1) — same family eduardoos.com loads as
// --font-family / Layout Google Fonts. Embedded as TrueType so pamphlet PDFs
// match the sheet (pamphlet-geometry-sot typography contract).

import (
	_ "embed"
	"fmt"
	"strings"
)

//go:embed fonts/Raleway-Regular.ttf
var ralewayRegularTTF []byte

//go:embed fonts/Raleway-Bold.ttf
var ralewayBoldTTF []byte

var (
	ralewayRegular *ttfFace
	ralewayBold    *ttfFace
)

func init() {
	var err error
	ralewayRegular, err = parseTTF(ralewayRegularTTF)
	if err != nil {
		panic("pdf: Raleway-Regular.ttf: " + err.Error())
	}
	ralewayBold, err = parseTTF(ralewayBoldTTF)
	if err != nil {
		panic("pdf: Raleway-Bold.ttf: " + err.Error())
	}
}

func glyphWidthEm(b byte, bold bool) float64 {
	face := ralewayRegular
	if bold {
		face = ralewayBold
	}
	w := face.widths[b]
	if w <= 0 {
		w = 600
	}
	return float64(w) / 1000.0
}

func stringWidthPt(s string, sizePt float64, bold bool) float64 {
	total := 0.0
	for i := 0; i < len(s); i++ {
		total += glyphWidthEm(s[i], bold) * sizePt
	}
	return total
}

func pdfFontName(bold bool) string {
	if bold {
		return "Raleway-Bold"
	}
	return "Raleway-Regular"
}

func buildEmbeddedFontPair(b *pdfBuilder) (regularObj, boldObj int) {
	regFile := b.add(buildFontFileObject(len(b.objects)+1, ralewayRegularTTF))
	boldFile := b.add(buildFontFileObject(len(b.objects)+1, ralewayBoldTTF))
	regDesc := b.addString(fontDescriptorObj(len(b.objects)+1, pdfFontName(false), ralewayRegular, regFile))
	boldDesc := b.addString(fontDescriptorObj(len(b.objects)+1, pdfFontName(true), ralewayBold, boldFile))
	regularObj = b.addString(trueTypeFontObj(len(b.objects)+1, pdfFontName(false), ralewayRegular, regDesc))
	boldObj = b.addString(trueTypeFontObj(len(b.objects)+1, pdfFontName(true), ralewayBold, boldDesc))
	return regularObj, boldObj
}

func buildFontFileObject(objNum int, ttf []byte) []byte {
	var buf strings.Builder
	fmt.Fprintf(&buf, "%d 0 obj\n<< /Length %d /Length1 %d >>\nstream\n", objNum, len(ttf), len(ttf))
	out := []byte(buf.String())
	out = append(out, ttf...)
	out = append(out, []byte("\nendstream\nendobj\n")...)
	return out
}

func fontDescriptorObj(objNum int, name string, face *ttfFace, fileObj int) string {
	flags := 32 // Nonsymbolic — required with WinAnsiEncoding
	return fmt.Sprintf(
		"%d 0 obj\n<< /Type /FontDescriptor /FontName /%s /Flags %d /FontBBox [%d %d %d %d] /ItalicAngle 0 /Ascent %d /Descent %d /CapHeight %d /StemV 80 /FontFile2 %d 0 R >>\nendobj\n",
		objNum, name, flags,
		face.bbox[0], face.bbox[1], face.bbox[2], face.bbox[3],
		face.ascent, face.descent, face.capHeight, fileObj,
	)
}

func trueTypeFontObj(objNum int, name string, face *ttfFace, descObj int) string {
	var w strings.Builder
	for i := 32; i <= 255; i++ {
		if i > 32 {
			w.WriteByte(' ')
		}
		fmt.Fprintf(&w, "%d", face.widths[i])
	}
	return fmt.Sprintf(
		"%d 0 obj\n<< /Type /Font /Subtype /TrueType /BaseFont /%s /Encoding /WinAnsiEncoding /FirstChar 32 /LastChar 255 /Widths [%s] /FontDescriptor %d 0 R >>\nendobj\n",
		objNum, name, w.String(), descObj,
	)
}
