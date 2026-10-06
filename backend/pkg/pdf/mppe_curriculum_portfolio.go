package pdf

import (
	"fmt"
	"strings"
)

// MPPEPortfolioSection is one subject block in a portfolio day page.
type MPPEPortfolioSection struct {
	ID       string
	Label    string
	Learning string
	Status   string // done | partial | missing (unused per section; day-level used)
	Done     bool
}

// MPPEPortfolioDay is one day summary for the student portfolio.
type MPPEPortfolioDay struct {
	PlanDay  int
	Week     int
	Title    string
	DayStatus string // green | yellow | red
	Sections []MPPEPortfolioSection
}

// MPPEPortfolioDoc is the portfolio preview model.
type MPPEPortfolioDoc struct {
	StudentName string
	Age         int
	Grade       string
	PercentDone float64
	Days        []MPPEPortfolioDay
	// ProofJPEGs optional demo photos keyed as "d{N}:{sectionId}" → JPEG bytes.
	ProofJPEGs map[string][]byte
}

// BuildMPPECurriculumPortfolioPDF renders cover + day summary pages + proof image pages.
func BuildMPPECurriculumPortfolioPDF(doc MPPEPortfolioDoc) ([]byte, error) {
	pageW := MmToPoints(EoschoolPageWidthMm)
	pageH := MmToPoints(EoschoolPageHeightMm)
	margin := MmToPoints(EoschoolMarginMm)

	type page struct {
		content string
		jpeg    []byte
		jw, jh  int
	}
	var pages []page
	pages = append(pages, page{content: renderMPPEPortfolioCover(doc, pageW, pageH, margin)})

	for _, day := range doc.Days {
		pages = append(pages, page{content: renderMPPEPortfolioDayPage(day, pageW, pageH, margin)})
		for _, sec := range day.Sections {
			key := fmt.Sprintf("d%d:%s", day.PlanDay, sec.ID)
			raw, ok := doc.ProofJPEGs[key]
			if !ok || len(raw) == 0 {
				continue
			}
			jpegBytes, w, h, err := normalizeColorJPEG(raw)
			if err != nil || len(jpegBytes) == 0 {
				continue
			}
			caption := fmt.Sprintf("Dia %d · %s · %s", day.PlanDay, sec.Label, sec.Learning)
			pages = append(pages, page{
				content: renderMPPEPortfolioImagePage(caption, pageW, pageH, margin, w, h),
				jpeg:    jpegBytes,
				jw:      w,
				jh:      h,
			})
		}
	}

	n := len(pages)
	if n == 0 {
		return nil, fmt.Errorf("no pages")
	}

	// Object layout: 1 Catalog, 2 Pages, 3 F1, 4 F2; then per page Page+Contents[+Image]
	var objs [][]byte
	objs = append(objs, nil, nil, // placeholders for catalog/pages
		[]byte("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"),
		[]byte("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n"),
	)

	kids := make([]string, 0, n)
	nextObj := 5
	for _, p := range pages {
		pageObj := nextObj
		contentObj := nextObj + 1
		nextObj += 2
		kids = append(kids, fmt.Sprintf("%d 0 R", pageObj))
		if len(p.jpeg) > 0 {
			imageObj := nextObj
			nextObj++
			objs = append(objs, []byte(fmt.Sprintf(
				"%d 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents %d 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im0 %d 0 R >> >> >>\nendobj\n",
				pageObj, pageW, pageH, contentObj, imageObj,
			)))
			objs = append(objs, buildStreamObject(contentObj, p.content))
			objs = append(objs, buildColorJPEGXObject(imageObj, p.jw, p.jh, p.jpeg))
		} else {
			objs = append(objs, []byte(fmt.Sprintf(
				"%d 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents %d 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n",
				pageObj, pageW, pageH, contentObj,
			)))
			objs = append(objs, buildStreamObject(contentObj, p.content))
		}
	}

	objs[0] = []byte("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
	objs[1] = []byte(fmt.Sprintf(
		"2 0 obj\n<< /Type /Pages /Kids [%s] /Count %d >>\nendobj\n",
		strings.Join(kids, " "), n,
	))
	return assemblePDF(objs), nil
}

func renderMPPEPortfolioCover(doc MPPEPortfolioDoc, pageW, pageH, margin float64) string {
	var sb strings.Builder
	y := pageH - margin - MmToPoints(24)
	write := func(font string, size float64, text string) {
		text = strings.TrimSpace(toWinAnsi(text))
		if text == "" {
			return
		}
		sb.WriteString(fmt.Sprintf("BT /%s %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
			font, size, margin, y, escape(text)))
		y -= size + MmToPoints(4)
	}
	write("F2", 18, "Portafolio del estudiante")
	write("F1", 14, doc.StudentName)
	write("F1", 11, fmt.Sprintf("%d anos · %s", doc.Age, doc.Grade))
	write("F1", 11, fmt.Sprintf("Avance: %.0f%% de secciones completadas", doc.PercentDone))
	write("F1", 10, "Temas del plan MPPE y fotos de demostracion por materia.")
	return sb.String()
}

func renderMPPEPortfolioDayPage(day MPPEPortfolioDay, pageW, pageH, margin float64) string {
	var sb strings.Builder
	y := pageH - margin - MmToPoints(12)
	write := func(font string, size float64, text string) {
		text = strings.TrimSpace(toWinAnsi(text))
		if text == "" {
			return
		}
		sb.WriteString(fmt.Sprintf("BT /%s %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
			font, size, margin, y, escape(text)))
		y -= size + MmToPoints(2.5)
	}
	title := strings.TrimSpace(day.Title)
	if title == "" {
		title = fmt.Sprintf("Dia %d", day.PlanDay)
	}
	statusLabel := map[string]string{"green": "completo", "yellow": "incompleto", "red": "pendiente"}[day.DayStatus]
	if statusLabel == "" {
		statusLabel = day.DayStatus
	}
	write("F2", 13, fmt.Sprintf("Semana %d · Dia %d · %s", day.Week, day.PlanDay, statusLabel))
	write("F1", 10, trimLineEllipsis(title))
	for _, sec := range day.Sections {
		mark := "[ ]"
		if sec.Done {
			mark = "[x]"
		}
		write("F2", 10, fmt.Sprintf("%s %s", mark, sec.Label))
		if learning := strings.TrimSpace(sec.Learning); learning != "" {
			for _, line := range wrapWordsToWidth(learning, 9, pageW-2*margin, false) {
				write("F1", 9, line)
				if y < margin+MmToPoints(16) {
					return sb.String()
				}
			}
		}
	}
	return sb.String()
}

func renderMPPEPortfolioImagePage(caption string, pageW, pageH, margin float64, imgW, imgH int) string {
	var sb strings.Builder
	y := pageH - margin - MmToPoints(8)
	cap := trimLineEllipsis(toWinAnsi(caption))
	sb.WriteString(fmt.Sprintf("BT /F1 9 Tf %.2f %.2f Td (%s) Tj ET\n", margin, y, escape(cap)))

	availW := pageW - 2*margin
	availH := pageH - 2*margin - MmToPoints(16)
	scale := availW / float64(imgW)
	if float64(imgH)*scale > availH {
		scale = availH / float64(imgH)
	}
	drawW := float64(imgW) * scale
	drawH := float64(imgH) * scale
	x := margin + (availW-drawW)/2
	yImg := margin
	sb.WriteString(fmt.Sprintf("q\n%.2f 0 0 %.2f %.2f %.2f cm\n/Im0 Do\nQ\n", drawW, drawH, x, yImg))
	return sb.String()
}
