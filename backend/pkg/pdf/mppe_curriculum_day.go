package pdf

import (
	"fmt"
	"strings"
)

// MPPE curriculum day sheet: one US Letter page, five subject cards (3+2 grid).
const (
	mppeDayHeadingPt = 9.0
	mppeDayBodyPt    = 8.0
	mppeDayMetaPt    = 10.0
	mppeDayCardGapMm = 3.0
	mppeDayCardPadMm = 2.5
)

// MPPECurriculumDaySection is one of the five daily areas on the sheet.
type MPPECurriculumDaySection struct {
	ID         string
	Label      string
	Objective  string
	Learning   string
	Activities []string
}

// MPPECurriculumDayDoc is the MPPE requirements route payload (not Homescool eoschool).
type MPPECurriculumDayDoc struct {
	PlanDay  int
	Week     int
	Grade    string
	Title    string
	Sections []MPPECurriculumDaySection
}

type mppeDayLayout struct {
	headingLH float64
	bodyLH    float64
	pad       float64
	innerW    float64
}

func (l mppeDayLayout) wrappedBlockHeight(text string, maxLines int) float64 {
	text = strings.TrimSpace(text)
	if text == "" {
		return 0
	}
	lines := wrapPlain(toWinAnsi(text), l.innerW, mppeDayBodyPt)
	if maxLines > 0 && len(lines) > maxLines {
		lines = lines[:maxLines]
	}
	if len(lines) == 0 {
		return 0
	}
	return float64(len(lines))*l.bodyLH + l.bodyLH*0.3
}

func (l mppeDayLayout) measureCard(sec MPPECurriculumDaySection) float64 {
	h := 2 * l.pad + l.headingLH
	if obj := strings.TrimSpace(sec.Objective); obj != "" {
		h += l.wrappedBlockHeight("Objetivo: "+obj, 3)
	}
	if learn := strings.TrimSpace(sec.Learning); learn != "" {
		h += l.wrappedBlockHeight("Aprendizaje: "+learn, 4)
	}
	for i, act := range sec.Activities {
		if i >= 2 {
			break
		}
		act = strings.TrimSpace(act)
		if act == "" {
			continue
		}
		h += l.wrappedBlockHeight("• "+act, 2)
	}
	return h
}

// BuildMPPECurriculumDayPDF renders 5 cards on one portrait letter page.
func BuildMPPECurriculumDayPDF(doc MPPECurriculumDayDoc) ([]byte, error) {
	pageW := MmToPoints(EoschoolPageWidthMm)
	pageH := MmToPoints(EoschoolPageHeightMm)
	margin := MmToPoints(EoschoolMarginMm)
	gap := MmToPoints(mppeDayCardGapMm)
	pad := MmToPoints(mppeDayCardPadMm)

	usableW := pageW - 2*margin
	colW := (usableW - 2*gap) / 3

	headingLH := MmToPoints(3.8)
	bodyLH := MmToPoints(3.4)
	layout := mppeDayLayout{
		headingLH: headingLH,
		bodyLH:    bodyLH,
		pad:       pad,
		innerW:    colW - 2*pad,
	}

	var sb strings.Builder
	yTop := pageH - margin

	title := toWinAnsi(strings.TrimSpace(doc.Title))
	if title == "" {
		title = fmt.Sprintf("Dia %d", doc.PlanDay)
	}
	meta := toWinAnsi(strings.TrimSpace(doc.Grade))
	if doc.Week > 0 {
		if meta != "" {
			meta = fmt.Sprintf("Semana %d · %s", doc.Week, meta)
		} else {
			meta = fmt.Sprintf("Semana %d", doc.Week)
		}
	}

	writeText := func(x, y, size float64, text string) {
		text = strings.TrimSpace(text)
		if text == "" {
			return
		}
		sb.WriteString(fmt.Sprintf("BT /F1 %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
			size, x, y, escape(text)))
	}

	writeWrapped := func(x, y, maxW, size, lineH float64, text string, maxLines int) float64 {
		lines := wrapPlain(toWinAnsi(text), maxW, size)
		if maxLines > 0 && len(lines) > maxLines {
			lines = lines[:maxLines]
			if len(lines) > 0 {
				lines[len(lines)-1] = trimLineEllipsis(lines[len(lines)-1])
			}
		}
		curY := y
		for _, line := range lines {
			writeText(x, curY, size, line)
			curY -= lineH
		}
		return curY
	}

	metaY := yTop - MmToPoints(5)
	writeText(margin, metaY, mppeDayMetaPt, title)
	if meta != "" {
		writeText(margin, metaY-MmToPoints(5), mppeDayBodyPt, meta)
	}

	gridTop := metaY - MmToPoints(10)

	secs := doc.Sections
	for len(secs) < 5 {
		secs = append(secs, MPPECurriculumDaySection{})
	}
	positions := [][2]int{{0, 0}, {1, 0}, {2, 0}, {0, 1}, {1, 1}}

	cardHeights := make([]float64, 5)
	for i := range positions {
		cardHeights[i] = layout.measureCard(secs[i])
	}
	minCardH := headingLH + 2*pad + bodyLH
	rowHeights := []float64{minCardH, minCardH}
	for i, pos := range positions {
		row := pos[1]
		if cardHeights[i] > rowHeights[row] {
			rowHeights[row] = cardHeights[i]
		}
	}

	rowBottomY := func(row int) float64 {
		y := gridTop
		for r := 0; r < row; r++ {
			y -= rowHeights[r] + gap
		}
		y -= rowHeights[row]
		return y
	}

	drawCard := func(col, row int, sec MPPECurriculumDaySection, cardH float64) {
		x := margin + float64(col)*(colW+gap)
		y := rowBottomY(row)
		sb.WriteString(fmt.Sprintf("%.2f %.2f %.2f %.2f re S\n", x, y, colW, cardH))

		innerW := colW - 2*pad
		tx := x + pad
		ty := y + cardH - pad - headingLH

		label := toWinAnsi(strings.TrimSpace(sec.Label))
		if label == "" {
			label = toWinAnsi(sec.ID)
		}
		writeText(tx, ty, mppeDayHeadingPt, label)
		ty -= headingLH

		obj := strings.TrimSpace(sec.Objective)
		if obj != "" {
			ty = writeWrapped(tx, ty, innerW, mppeDayBodyPt, bodyLH, "Objetivo: "+obj, 3)
			ty -= bodyLH * 0.3
		}
		learn := strings.TrimSpace(sec.Learning)
		if learn != "" {
			ty = writeWrapped(tx, ty, innerW, mppeDayBodyPt, bodyLH, "Aprendizaje: "+learn, 4)
			ty -= bodyLH * 0.3
		}
		for i, act := range sec.Activities {
			if i >= 2 {
				break
			}
			act = strings.TrimSpace(act)
			if act == "" {
				continue
			}
			ty = writeWrapped(tx, ty, innerW, mppeDayBodyPt, bodyLH, "• "+act, 2)
		}
	}

	for i, pos := range positions {
		drawCard(pos[0], pos[1], secs[i], rowHeights[pos[1]])
	}

	content := sb.String()
	objs := [][]byte{
		[]byte("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
		[]byte("2 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n"),
		[]byte("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"),
		[]byte(fmt.Sprintf(
			"4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents 5 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n",
			pageW, pageH,
		)),
		buildStreamObject(5, content),
	}
	return assemblePDF(objs), nil
}

func trimLineEllipsis(s string) string {
	s = strings.TrimSpace(s)
	if len(s) <= 3 {
		return s + "..."
	}
	return s[:len(s)-3] + "..."
}
