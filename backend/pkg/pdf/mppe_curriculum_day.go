package pdf

import (
	"fmt"
	"strings"
)

// MPPE curriculum day sheet: one US Letter page, five subject cards (3+2 grid).
const (
	mppeDayAreaPt      = 11.0
	mppeDayBodyPt      = 8.0
	mppeDayMetaPt      = 10.0
	mppeDayCardGapMm   = 3.0
	mppeDayCardPadMm   = 3.0
	mppeDaySectionGapF = 0.45
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
	areaLH    float64
	bodyLH    float64
	sectionGap float64
	pad       float64
	innerW    float64
}

func mppeSplitLearnings(learn string) []string {
	learn = strings.TrimSpace(learn)
	if learn == "" {
		return nil
	}
	parts := strings.Split(learn, "·")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return []string{learn}
	}
	return out
}

func (l mppeDayLayout) wrappedLines(text string, maxLines int) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	lines := wrapPlain(toWinAnsi(text), l.innerW, mppeDayBodyPt)
	if maxLines > 0 && len(lines) > maxLines {
		lines = lines[:maxLines]
		if len(lines) > 0 {
			lines[len(lines)-1] = trimLineEllipsis(lines[len(lines)-1])
		}
	}
	return lines
}

func (l mppeDayLayout) textBlockHeight(lineCount int) float64 {
	if lineCount <= 0 {
		return 0
	}
	return float64(lineCount)*l.bodyLH
}

func (l mppeDayLayout) measureCard(sec MPPECurriculumDaySection) float64 {
	h := 2*l.pad + l.areaLH + l.sectionGap

	obj := strings.TrimSpace(sec.Objective)
	if obj != "" {
		h += l.bodyLH + l.textBlockHeight(len(l.wrappedLines(obj, 4)))
		h += l.sectionGap
	}

	learnings := mppeSplitLearnings(sec.Learning)
	if len(learnings) > 0 {
		h += l.bodyLH
		for _, item := range learnings {
			h += l.textBlockHeight(len(l.wrappedLines("- "+item, 3)))
		}
		h += l.sectionGap
	}

	acts := 0
	for i, act := range sec.Activities {
		if i >= 2 {
			break
		}
		if strings.TrimSpace(act) != "" {
			acts++
		}
	}
	if acts > 0 {
		h += l.bodyLH
		for i, act := range sec.Activities {
			if i >= 2 {
				break
			}
			act = strings.TrimSpace(act)
			if act == "" {
				continue
			}
			h += l.textBlockHeight(len(l.wrappedLines("- "+act, 3)))
		}
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

	areaLH := MmToPoints(4.6)
	bodyLH := MmToPoints(3.4)
	layout := mppeDayLayout{
		areaLH:     areaLH,
		bodyLH:     bodyLH,
		sectionGap: bodyLH * mppeDaySectionGapF,
		pad:        pad,
		innerW:     colW - 2*pad,
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
			meta = toWinAnsi(fmt.Sprintf("Semana %d · %s", doc.Week, meta))
		} else {
			meta = toWinAnsi(fmt.Sprintf("Semana %d", doc.Week))
		}
	}

	writeText := func(font string, x, y, size float64, text string) {
		text = strings.TrimSpace(toWinAnsi(text))
		if text == "" {
			return
		}
		sb.WriteString(fmt.Sprintf("BT /%s %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
			font, size, x, y, escape(text)))
	}

	writeWrapped := func(font string, x, y, maxW, size, lineH float64, text string, maxLines int) float64 {
		lines := wrapPlain(toWinAnsi(text), maxW, size)
		if maxLines > 0 && len(lines) > maxLines {
			lines = lines[:maxLines]
			if len(lines) > 0 {
				lines[len(lines)-1] = trimLineEllipsis(lines[len(lines)-1])
			}
		}
		curY := y
		for _, line := range lines {
			writeText(font, x, curY, size, line)
			curY -= lineH
		}
		return curY
	}

	metaY := yTop - MmToPoints(5)
	writeText("F1", margin, metaY, mppeDayMetaPt, title)
	if meta != "" {
		writeText("F1", margin, metaY-MmToPoints(5), mppeDayBodyPt, meta)
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
	minCardH := areaLH + 2*pad + bodyLH*3
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

		tx := x + pad
		ty := y + cardH - pad - areaLH

		label := toWinAnsi(strings.TrimSpace(sec.Label))
		if label == "" {
			label = toWinAnsi(sec.ID)
		}
		writeText("F2", tx, ty, mppeDayAreaPt, label)
		ty -= areaLH + layout.sectionGap

		obj := strings.TrimSpace(sec.Objective)
		if obj != "" {
			writeText("F2", tx, ty, mppeDayBodyPt, "Objetivo:")
			ty -= bodyLH
			ty = writeWrapped("F1", tx, ty, layout.innerW, mppeDayBodyPt, bodyLH, obj, 0)
			ty -= layout.sectionGap
		}

		learnings := mppeSplitLearnings(sec.Learning)
		if len(learnings) > 0 {
			writeText("F2", tx, ty, mppeDayBodyPt, "Aprendizajes:")
			ty -= bodyLH
			for _, item := range learnings {
				ty = writeWrapped("F1", tx, ty, layout.innerW, mppeDayBodyPt, bodyLH, "- "+item, 0)
			}
			ty -= layout.sectionGap
		}

		hasAct := false
		for i, act := range sec.Activities {
			if i >= 2 {
				break
			}
			if strings.TrimSpace(act) != "" {
				hasAct = true
				break
			}
		}
		if hasAct {
			writeText("F2", tx, ty, mppeDayBodyPt, "Actividad sugerida:")
			ty -= bodyLH
			for i, act := range sec.Activities {
				if i >= 2 {
					break
				}
				act = strings.TrimSpace(act)
				if act == "" {
					continue
				}
				ty = writeWrapped("F1", tx, ty, layout.innerW, mppeDayBodyPt, bodyLH, "- "+act, 0)
			}
		}
	}

	for i, pos := range positions {
		drawCard(pos[0], pos[1], secs[i], rowHeights[pos[1]])
	}

	content := sb.String()
	objs := [][]byte{
		[]byte("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
		[]byte("2 0 obj\n<< /Type /Pages /Kids [5 0 R] /Count 1 >>\nendobj\n"),
		[]byte("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"),
		[]byte("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n"),
		[]byte(fmt.Sprintf(
			"5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents 6 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n",
			pageW, pageH,
		)),
		buildStreamObject(6, content),
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
