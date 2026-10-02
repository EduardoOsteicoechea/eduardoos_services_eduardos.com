package pdf

import (
	"fmt"
	"strings"
)

// Homescool Letter grid v2 (US Letter portrait sample).
//
// Rows (mm): gapTop | Containercabecera1 | gapCabecera | Containercabecera2 |
//            gapCabeceraMain | Containermain | gapMainImages | Containerimages
// Cols (mm): gapLeft | ContainerHeaderMargin | ContainerCol1 | gapCol1Col2 |
//            ContainerCol2 | gapCol2Col3 | ContainerCol3

const (
	HCLetterGridStrokeMm = 0.15
	HCLetterRuleStepMm   = 3.5
	// HCLetterShowMainRules: when false, main-column ruled lines stay in the layout
	// (3.5 mm slots) but are not stroked — cleaner sheet; set true to show #ddd rules again.
	HCLetterShowMainRules = false
	// Darker full-column rule between lesson text and the first quiz prompt in a column.
	HCLetterQuizSeparatorStrokeMm = 0.35
	hcHeaderFieldGapMm            = 2.0 // gaps between cabecera1/2 and between header sub-boxes
	hcLetterContainerR            = 0xDD / 255.0
)

// Column track indices (0-based).
const (
	hcColGapLeft = iota
	hcColHeaderMargin
	hcCol1
	hcColGap12
	hcCol2
	hcColGap23
	hcCol3
)

// Row track indices (0-based).
const (
	hcRowGapTop = iota
	hcRowCabecera1
	hcRowGapCabecera
	hcRowCabecera2
	hcRowGapCabeceraMain
	hcRowMain
	hcRowGapMainImages
	hcRowImages
)

var (
	hcLetterRowHeightsMm = []float64{5, 7, 2, 5, 2, 182, 2, 70}
	hcLetterColWidthsMm  = []float64{5, 15, 48, 2, 68, 2, 68}
)

// RectMm is a CSS-top box in millimetres (x from left, top from page top).
type RectMm struct {
	X, Top, W, H float64
	Name         string
}

// HomescoolLetterGrid holds header fields and main columns.
type HomescoolLetterGrid struct {
	ColStarts []float64
	RowStarts []float64

	SignatureName     RectMm
	SignatureTopic    RectMm
	SheetCode         RectMm
	Date              RectMm
	Student           RectMm
	Reviewer          RectMm
	ReviewerSignature RectMm

	MainCol1 RectMm // HeaderMargin + Col1
	MainCol2 RectMm // Col2
	MainCol3 RectMm // Col3
	Images   RectMm // HeaderMargin → Col3 in Containerimages
}

// strokeContainerCSSTopMm strokes a square-corner box; cssTop is mm from the page top.
func strokeContainerCSSTopMm(s *strings.Builder, x, cssTop, width, height, strokeMm float64) {
	strokeRectCSSTopRGB(s, x, cssTop, width, height, strokeMm, hcLetterContainerR, hcLetterContainerR, hcLetterContainerR)
}

func strokeRectCSSTopRGB(s *strings.Builder, x, cssTop, width, height, strokeMm, sr, sg, sb float64) {
	if width <= 0 || height <= 0 || strokeMm <= 0 {
		return
	}
	pdfTopMm := EoschoolPageHeightMm - cssTop
	bottomMm := pdfTopMm - height
	left := MmToPoints(x)
	right := MmToPoints(x + width)
	bottom := MmToPoints(bottomMm)
	topPt := MmToPoints(pdfTopMm)
	s.WriteString("q\n")
	s.WriteString(fmt.Sprintf("%.3f %.3f %.3f RG\n", sr, sg, sb))
	s.WriteString(fmt.Sprintf("%.3f w\n", MmToPoints(strokeMm)))
	s.WriteString(fmt.Sprintf("%.2f %.2f m %.2f %.2f l %.2f %.2f l %.2f %.2f l %.2f %.2f l S\n",
		left, bottom, right, bottom, right, topPt, left, topPt, left, bottom))
	s.WriteString("Q\n")
}

func trackStarts(widths []float64) []float64 {
	starts := make([]float64, len(widths))
	var x float64
	for i, w := range widths {
		starts[i] = x
		x += w
	}
	return starts
}

func spanRect(colStarts, rowStarts, colW, rowH []float64, c0, c1, r0, r1 int, name string) RectMm {
	x := colStarts[c0]
	top := rowStarts[r0]
	var w float64
	for c := c0; c <= c1; c++ {
		w += colW[c]
	}
	var h float64
	for r := r0; r <= r1; r++ {
		h += rowH[r]
	}
	return RectMm{X: x, Top: top, W: w, H: h, Name: name}
}

func splitHorizontalNamed(parent RectMm, parts []float64, names []string) []RectMm {
	out := make([]RectMm, 0, len(names))
	x := parent.X
	ni := 0
	for i, w := range parts {
		if i%2 == 1 {
			x += w
			continue
		}
		name := ""
		if ni < len(names) {
			name = names[ni]
		}
		out = append(out, RectMm{X: x, Top: parent.Top, W: w, H: parent.H, Name: name})
		ni++
		x += w
	}
	return out
}

// ComputeHomescoolLetterGrid returns the v2 Letter frames from the fixed tracks.
func ComputeHomescoolLetterGrid() HomescoolLetterGrid {
	colStarts := trackStarts(hcLetterColWidthsMm)
	rowStarts := trackStarts(hcLetterRowHeightsMm)

	// Header bands span ContainerCol1 → ContainerCol3 (cols 2→6).
	header1 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm,
		hcCol1, hcCol3, hcRowCabecera1, hcRowCabecera1, "Containercabecera1")
	header2 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm,
		hcCol1, hcCol3, hcRowCabecera2, hcRowCabecera2, "Containercabecera2")

	// SignatureName 45 | gap 2 | SignatureTopic 98 | gap 2 | SheetCode remainder
	gap := hcHeaderFieldGapMm
	restH1 := header1.W - (45 + gap + 98 + gap)
	h1 := splitHorizontalNamed(header1, []float64{45, gap, 98, gap, restH1},
		[]string{"SignatureName", "SignatureTopic", "SheetCode"})

	// Date 23 | gap 2 | Student 70 | gap 2 | Reviewer 70 | gap 2 | ReviewerSignature remainder
	restH2 := header2.W - (23 + gap + 70 + gap + 70 + gap)
	h2 := splitHorizontalNamed(header2, []float64{23, gap, 70, gap, 70, gap, restH2},
		[]string{"Date", "Student", "Reviewer", "ReviewerSignature"})

	main1 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm,
		hcColHeaderMargin, hcCol1, hcRowMain, hcRowMain, "MainCol1")
	main2 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm,
		hcCol2, hcCol2, hcRowMain, hcRowMain, "MainCol2")
	main3 := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm,
		hcCol3, hcCol3, hcRowMain, hcRowMain, "MainCol3")
	images := spanRect(colStarts, rowStarts, hcLetterColWidthsMm, hcLetterRowHeightsMm,
		hcColHeaderMargin, hcCol3, hcRowImages, hcRowImages, "Containerimages")

	g := HomescoolLetterGrid{
		ColStarts: colStarts,
		RowStarts: rowStarts,
		MainCol1:  main1,
		MainCol2:  main2,
		MainCol3:  main3,
		Images:    images,
	}
	if len(h1) == 3 {
		g.SignatureName, g.SignatureTopic, g.SheetCode = h1[0], h1[1], h1[2]
	}
	if len(h2) == 4 {
		g.Date, g.Student, g.Reviewer, g.ReviewerSignature = h2[0], h2[1], h2[2], h2[3]
	}
	return g
}

func strokeRuleRGB(s *strings.Builder, x1, y1, x2, y2, strokeMm, r, g, b float64) {
	s.WriteString("q\n")
	s.WriteString(fmt.Sprintf("%.3f %.3f %.3f RG\n", r, g, b))
	s.WriteString(fmt.Sprintf("%.3f w\n", MmToPoints(strokeMm)))
	s.WriteString(fmt.Sprintf("%.2f %.2f m %.2f %.2f l S\n",
		MmToPoints(x1), MmToPoints(y1), MmToPoints(x2), MmToPoints(y2)))
	s.WriteString("Q\n")
}

func homescoolPDFYMm(cssTopMm float64) float64 {
	return EoschoolPageHeightMm - cssTopMm
}

func writeTextFillMm(s *strings.Builder, font string, sizePt float64, xMm, pdfYMm float64, r, g, b float64, text string) {
	text = toWinAnsi(text)
	if text == "" {
		return
	}
	s.WriteString(fmt.Sprintf("%.3f %.3f %.3f rg\n", r, g, b))
	s.WriteString(fmt.Sprintf("BT /%s %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
		font, sizePt, MmToPoints(xMm), MmToPoints(pdfYMm), escape(text)))
}

// HCLetterColumnQuestionLines marks 1-based line indices that use question-marker chrome in a main column.
type HCLetterColumnQuestionLines map[int]bool

// drawLinedBox optionally strokes #ddd rules every stepMm across the full column width
// (top edge + interior rules; no side/bottom outer border; no gutter boxes).
// Slot geometry always uses stepMm; visibility is gated by HCLetterShowMainRules.
func drawLinedBox(s *strings.Builder, box RectMm, stepMm float64, _ HCLetterColumnQuestionLines) {
	if box.W <= 0 || box.H <= 0 || !HCLetterShowMainRules {
		return
	}

	inset := HCLetterGridStrokeMm
	topY := homescoolPDFYMm(box.Top)
	strokeRuleRGB(s,
		box.X, topY,
		box.X+box.W, topY,
		HCLetterGridStrokeMm, hcLetterContainerR, hcLetterContainerR, hcLetterContainerR,
	)
	nRows := int(box.H / stepMm)
	for i := 0; i < nRows; i++ {
		rowTop := box.Top + float64(i)*stepMm
		yTop := rowTop + stepMm
		pdfY := homescoolPDFYMm(yTop)
		strokeRuleRGB(s,
			box.X+inset, pdfY,
			box.X+box.W-inset, pdfY,
			HCLetterGridStrokeMm, hcLetterContainerR, hcLetterContainerR, hcLetterContainerR,
		)
	}
}

func drawEmptyBox(s *strings.Builder, box RectMm) {
	if box.W <= 0 || box.H <= 0 {
		return
	}
	strokeContainerCSSTopMm(s, box.X, box.Top, box.W, box.H, HCLetterGridStrokeMm)
}

// BuildHomescoolLetterGridPDF renders one or more v2 Letter pages with optional slot ink.
func BuildHomescoolLetterGridPDF(pages []HCLetterPageInk) ([]byte, error) {
	if len(pages) == 0 {
		return nil, fmt.Errorf("no pages")
	}
	g := ComputeHomescoolLetterGrid()
	pageW := MmToPoints(EoschoolPageWidthMm)
	pageH := MmToPoints(EoschoolPageHeightMm)

	n := len(pages)
	// 1 Catalog, 2 Pages, 3 F1, 4 F2; then per page: Page, Contents, optional Image XObject.
	pageObjNums := make([]int, n)
	contentObjNums := make([]int, n)
	imageObjNums := make([]int, n)
	nextObj := 5
	for i := 0; i < n; i++ {
		pageObjNums[i] = nextObj
		contentObjNums[i] = nextObj + 1
		nextObj += 2
		if len(pages[i].PracticeImageJPEG) > 0 {
			imageObjNums[i] = nextObj
			nextObj++
		}
	}
	kids := make([]string, 0, n)
	for _, num := range pageObjNums {
		kids = append(kids, fmt.Sprintf("%d 0 R", num))
	}

	var objs [][]byte
	objs = append(objs, []byte("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"))
	objs = append(objs, []byte(fmt.Sprintf(
		"2 0 obj\n<< /Type /Pages /Kids [%s] /Count %d >>\nendobj\n",
		strings.Join(kids, " "), n,
	)))
	objs = append(objs, []byte("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"))
	objs = append(objs, []byte("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n"))

	for i, page := range pages {
		var sb strings.Builder
		renderHomescoolLetterGridPage(&sb, g, page)
		res := "/Font << /F1 3 0 R /F2 4 0 R >>"
		if imageObjNums[i] > 0 {
			res = fmt.Sprintf("/Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im0 %d 0 R >>", imageObjNums[i])
		}
		// assemblePDF xref assumes object N is the Nth entry in objs — emit Page, Contents, then Image.
		objs = append(objs, []byte(fmt.Sprintf(
			"%d 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents %d 0 R /Resources << %s >> >>\nendobj\n",
			pageObjNums[i], pageW, pageH, contentObjNums[i], res,
		)))
		objs = append(objs, buildStreamObject(contentObjNums[i], sb.String()))
		if imageObjNums[i] > 0 {
			objs = append(objs, buildColorJPEGXObject(imageObjNums[i], page.PracticeImageWidth, page.PracticeImageHeight, page.PracticeImageJPEG))
		}
	}
	return assemblePDF(objs), nil
}

// BuildHomescoolLetterGridPreviewPDF is a local one-page preview: español S1 D2
// (ask-first: pregunta → espacio → Punto N → Cópiala aquí) + practice JPEG.
func BuildHomescoolLetterGridPreviewPDF() ([]byte, error) {
	esp, err := LoadHCLetterPageWithPracticeImage("week1/esp-c3-w1-d2-l6.eoschool.json")
	if err != nil {
		return nil, err
	}
	return BuildHomescoolLetterGridPDF([]HCLetterPageInk{esp})
}

// BuildHomescoolLetterGridSamplePDF: page 1 teb+exe (cols 1–2), page 2 español S1 D1.
func BuildHomescoolLetterGridSamplePDF() ([]byte, error) {
	tebPath, err := resolveHomescoolMediaPath("week1/teb-c3-w1-d1-l6.eoschool.json")
	if err != nil {
		return nil, err
	}
	exePath, err := resolveHomescoolMediaPath("week1/exe-c3-w1-d1-l6.eoschool.json")
	if err != nil {
		return nil, err
	}
	espPath, err := resolveHomescoolMediaPath("week1/esp-c3-w1-d1-l6.eoschool.json")
	if err != nil {
		return nil, err
	}
	teb, err := LoadHCLetterPageInkFromEoschoolFile(tebPath)
	if err != nil {
		return nil, err
	}
	exe, err := LoadHCLetterPageInkFromEoschoolFile(exePath)
	if err != nil {
		return nil, err
	}
	esp, err := LoadHCLetterPageInkFromEoschoolFile(espPath)
	if err != nil {
		return nil, err
	}
	return BuildHomescoolLetterGridPDF([]HCLetterPageInk{
		ComposeTebExePreviewPage(teb, exe),
		esp,
	})
}
