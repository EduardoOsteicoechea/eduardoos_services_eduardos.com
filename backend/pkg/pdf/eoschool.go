package pdf

import (
	"fmt"
	"strings"
)

// Eoschool letter geometry: US Letter portrait, 1 cm page margin (METHOD_V1).
const (
	EoschoolPageWidthMm  = 215.9
	EoschoolPageHeightMm = 279.4
	EoschoolMarginMm     = 10.0 // 1 cm
)

// EoschoolPrintPage is one US Letter portrait content page.
type EoschoolPrintPage struct {
	Heading string
	Lines   []string
}

// EoschoolPrintDoc is the print model for METHOD_V1 materials.
type EoschoolPrintDoc struct {
	Title string
	Meta  string
	Pages []EoschoolPrintPage
}

// BuildEoschoolPDF renders stacked US Letter portrait pages with 1 cm margins.
func BuildEoschoolPDF(doc EoschoolPrintDoc) ([]byte, error) {
	if len(doc.Pages) == 0 {
		doc.Pages = []EoschoolPrintPage{{Heading: doc.Title, Lines: []string{doc.Meta}}}
	}
	pageW := MmToPoints(EoschoolPageWidthMm)
	pageH := MmToPoints(EoschoolPageHeightMm)
	margin := MmToPoints(EoschoolMarginMm)
	contentWidth := pageW - 2*margin
	lineH := MmToPoints(5.5)

	var pageObjs [][]byte
	var contentObjs [][]byte
	fontObjNum := 3 + len(doc.Pages)*2 // after catalog+pages+all page+content pairs
	// Layout: 1 Catalog, 2 Pages, then for each page: Page obj, Contents obj, finally Font.
	// Simpler: Catalog, Pages, Font as last shared, Page+Content pairs.

	// Rebuild with known object numbers:
	// 1 Catalog, 2 Pages, 3 Font, then for i:=0..n-1: pageObj=4+2*i, contentObj=5+2*i
	n := len(doc.Pages)
	kids := make([]string, 0, n)
	for i := 0; i < n; i++ {
		pageObj := 4 + 2*i
		kids = append(kids, fmt.Sprintf("%d 0 R", pageObj))
	}

	var objs [][]byte
	objs = append(objs, []byte("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"))
	objs = append(objs, []byte(fmt.Sprintf(
		"2 0 obj\n<< /Type /Pages /Kids [%s] /Count %d >>\nendobj\n",
		strings.Join(kids, " "), n,
	)))
	objs = append(objs, []byte("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"))

	for i, page := range doc.Pages {
		pageObj := 4 + 2*i
		contentObj := 5 + 2*i
		var sb strings.Builder
		y := pageH - margin - MmToPoints(4)
		title := toWinAnsi(strings.TrimSpace(doc.Title))
		if title == "" {
			title = "Homescool"
		}
		meta := toWinAnsi(strings.TrimSpace(doc.Meta))
		heading := toWinAnsi(strings.TrimSpace(page.Heading))

		writeLine := func(fontSize float64, text string) {
			if y < margin+lineH {
				return
			}
			sb.WriteString(fmt.Sprintf("BT /F1 %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
				fontSize, margin, y, escape(text)))
			y -= lineH * (fontSize / 10)
		}

		writeLine(14, title)
		if meta != "" {
			writeLine(9, meta)
		}
		y -= lineH * 0.5
		if heading != "" {
			writeLine(12, heading)
			y -= lineH * 0.3
		}
		for _, line := range page.Lines {
			for _, wrapped := range wrapPlain(toWinAnsi(line), contentWidth, 10) {
				writeLine(10, wrapped)
			}
			y -= lineH * 0.2
		}

		content := sb.String()
		objs = append(objs, []byte(fmt.Sprintf(
			"%d 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents %d 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n",
			pageObj, pageW, pageH, contentObj,
		)))
		objs = append(objs, buildStreamObject(contentObj, content))
		_ = pageObjs
		_ = contentObjs
		_ = fontObjNum
	}

	return assemblePDF(objs), nil
}

func wrapPlain(text string, maxWidthPt, fontSizePt float64) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	// Approximate Helvetica width ~0.5em average.
	avgChar := fontSizePt * 0.5
	maxChars := int(maxWidthPt / avgChar)
	if maxChars < 20 {
		maxChars = 20
	}
	words := strings.Fields(text)
	var lines []string
	var cur strings.Builder
	for _, w := range words {
		if cur.Len() == 0 {
			cur.WriteString(w)
			continue
		}
		if cur.Len()+1+len(w) > maxChars {
			lines = append(lines, cur.String())
			cur.Reset()
			cur.WriteString(w)
			continue
		}
		cur.WriteByte(' ')
		cur.WriteString(w)
	}
	if cur.Len() > 0 {
		lines = append(lines, cur.String())
	}
	return lines
}
