package pdf

import (
	"fmt"
	"strings"
)

// MPPE curriculum day sheet: one US Letter portrait page (EoschoolPage*), 1 cm margins,
// variable cards (3 / 4 / 5) from scheduledSections.
//
// Layout policy (measure ≡ draw): row heights are the max measured card height per row — never
// uniformly scaled below measured content (that caused silent clipping). If the grid exceeds the
// page, typography compacts in steps (smaller body pt / line height) until measure fits.
const (
	mppeDayAreaPt         = 11.0
	mppeDayMetaPt         = 10.0
	mppeDayCardGapMm          = 3.0
	mppeDayCardPadMm          = 3.0
	mppeDayCardPadBottomExtraMm = 2.0 // extra inset below last line (measure ≡ draw)
	mppeDayCanDoMaxLines  = 2
	mppeDayHeaderBelowMm  = 10.0
)

// MPPECurriculumDaySection is one of the five daily areas on the sheet.
type MPPECurriculumDaySection struct {
	ID         string
	Label      string
	Objective  string
	Learning   string
	CanDo      string
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
	areaLH         float64
	bodyLH         float64
	bodyPt         float64
	sectionGap     float64
	pad            float64
	padBottom      float64
	innerW         float64
	objMaxLines    int
	bulletMaxLines int
	canDoMaxLines  int
}

// compaction steps: same values used for measure and draw (approach A).
var mppeDayCompactionSteps = []struct {
	bodyLHmm       float64
	bodyPt         float64
	areaLHmm       float64
	sectionGapF    float64
	objMaxLines    int
	bulletMaxLines int
}{
	{3.4, 8.0, 4.6, 0.42, 5, 4},
	{3.2, 7.5, 4.4, 0.36, 5, 5},
	{3.0, 7.0, 4.2, 0.30, 6, 5},
	{2.85, 6.75, 4.0, 0.26, 6, 6},
	{2.65, 6.5, 3.8, 0.22, 7, 6},
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
	lines := wrapPlain(toWinAnsi(text), l.innerW, l.bodyPt)
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
	return float64(lineCount) * l.bodyLH
}

func (l mppeDayLayout) measureCard(sec MPPECurriculumDaySection) float64 {
	h := l.pad + l.padBottom + l.areaLH + l.sectionGap

	obj := strings.TrimSpace(sec.Objective)
	if obj != "" {
		h += l.bodyLH + l.textBlockHeight(len(l.wrappedLines(obj, l.objMaxLines)))
		h += l.sectionGap
	}

	learnings := mppeSplitLearnings(sec.Learning)
	if len(learnings) > 0 {
		h += l.bodyLH
		for _, item := range learnings {
			h += l.textBlockHeight(len(l.wrappedLines("- "+item, l.bulletMaxLines)))
		}
		h += l.sectionGap
	}

	canDo := strings.TrimSpace(sec.CanDo)
	if canDo != "" {
		h += l.bodyLH + l.textBlockHeight(len(l.wrappedLines(canDo, l.canDoMaxLines)))
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
			h += l.textBlockHeight(len(l.wrappedLines("- "+act, l.bulletMaxLines)))
		}
	}

	return h
}

type mppeDayGridPlan struct {
	layout      mppeDayLayout
	cols        int
	positions   [][2]int
	rowHeights  []float64
	cardHeights []float64
	maxGridH    float64
}

// mppeDayPositions returns column count and (col,row) for n scheduled sections.
func mppeDayPositions(n int) (cols int, positions [][2]int) {
	if n < 1 {
		n = 1
	}
	if n > 5 {
		n = 5
	}
	switch n {
	case 1:
		return 1, [][2]int{{0, 0}}
	case 2:
		return 2, [][2]int{{0, 0}, {1, 0}}
	case 3:
		return 3, [][2]int{{0, 0}, {1, 0}, {2, 0}}
	case 4:
		return 2, [][2]int{{0, 0}, {1, 0}, {0, 1}, {1, 1}}
	default: // 5
		return 3, [][2]int{{0, 0}, {1, 0}, {2, 0}, {0, 1}, {1, 1}}
	}
}

func planMPPECurriculumDayGrid(doc MPPECurriculumDayDoc, pageW, pageH, margin, gap, pad, gridTop float64) mppeDayGridPlan {
	secs := doc.Sections
	if len(secs) == 0 {
		secs = []MPPECurriculumDaySection{{}}
	}
	if len(secs) > 5 {
		secs = secs[:5]
	}
	cols, positions := mppeDayPositions(len(secs))
	usableW := pageW - 2*margin
	colW := usableW
	if cols > 1 {
		colW = (usableW - float64(cols-1)*gap) / float64(cols)
	}
	maxGridH := gridTop - margin
	maxRow := 0
	for _, pos := range positions {
		if pos[1] > maxRow {
			maxRow = pos[1]
		}
	}
	rowCount := maxRow + 1

	var best mppeDayGridPlan
	best.maxGridH = maxGridH

	for _, step := range mppeDayCompactionSteps {
		bodyLH := MmToPoints(step.bodyLHmm)
		padBottom := pad + MmToPoints(mppeDayCardPadBottomExtraMm)
		layout := mppeDayLayout{
			areaLH:         MmToPoints(step.areaLHmm),
			bodyLH:         bodyLH,
			bodyPt:         step.bodyPt,
			sectionGap:     bodyLH * step.sectionGapF,
			pad:            pad,
			padBottom:      padBottom,
			innerW:         colW - 2*pad,
			objMaxLines:    step.objMaxLines,
			bulletMaxLines: step.bulletMaxLines,
			canDoMaxLines:  mppeDayCanDoMaxLines,
		}

		cardHeights := make([]float64, len(positions))
		for i := range positions {
			cardHeights[i] = layout.measureCard(secs[i])
		}
		minCardH := layout.areaLH + pad + padBottom + bodyLH*2
		rowHeights := make([]float64, rowCount)
		for r := range rowHeights {
			rowHeights[r] = minCardH
		}
		for i, pos := range positions {
			row := pos[1]
			if cardHeights[i] > rowHeights[row] {
				rowHeights[row] = cardHeights[i]
			}
		}
		total := 0.0
		for r, h := range rowHeights {
			total += h
			if r < len(rowHeights)-1 {
				total += gap
			}
		}
		plan := mppeDayGridPlan{
			layout:      layout,
			cols:        cols,
			positions:   positions,
			rowHeights:  rowHeights,
			cardHeights: cardHeights,
			maxGridH:    maxGridH,
		}
		best = plan
		if total <= maxGridH {
			return plan
		}
	}
	return best
}

func renderMPPECurriculumDayPageContent(doc MPPECurriculumDayDoc, pageW, pageH, margin, gap, pad float64) string {
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

	gridTop := yTop - MmToPoints(5) - MmToPoints(5) - MmToPoints(mppeDayHeaderBelowMm)
	plan := planMPPECurriculumDayGrid(doc, pageW, pageH, margin, gap, pad, gridTop)
	layout := plan.layout
	bodyLH := layout.bodyLH
	areaLH := layout.areaLH
	cols := plan.cols
	if cols < 1 {
		cols = 1
	}
	usableW := pageW - 2*margin
	colW := usableW
	if cols > 1 {
		colW = (usableW - float64(cols-1)*gap) / float64(cols)
	}

	writeWrapped := func(font string, x, y, maxW, size, lineH float64, text string, maxLines int) float64 {
		lines := layout.wrappedLines(text, maxLines)
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
		writeText("F1", margin, metaY-MmToPoints(5), layout.bodyPt, meta)
	}

	secs := doc.Sections
	if len(secs) == 0 {
		secs = []MPPECurriculumDaySection{{}}
	}
	if len(secs) > len(plan.positions) {
		secs = secs[:len(plan.positions)]
	}

	rowBottomY := func(row int) float64 {
		y := gridTop
		for r := 0; r < row; r++ {
			y -= plan.rowHeights[r] + gap
		}
		y -= plan.rowHeights[row]
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
			writeText("F2", tx, ty, layout.bodyPt, "Objetivo:")
			ty -= bodyLH
			ty = writeWrapped("F1", tx, ty, layout.innerW, layout.bodyPt, bodyLH, obj, layout.objMaxLines)
			ty -= layout.sectionGap
		}

		learnings := mppeSplitLearnings(sec.Learning)
		if len(learnings) > 0 {
			writeText("F2", tx, ty, layout.bodyPt, "Aprendizajes:")
			ty -= bodyLH
			for _, item := range learnings {
				ty = writeWrapped("F1", tx, ty, layout.innerW, layout.bodyPt, bodyLH, "- "+item, layout.bulletMaxLines)
			}
			ty -= layout.sectionGap
		}

		canDo := strings.TrimSpace(sec.CanDo)
		if canDo != "" {
			writeText("F2", tx, ty, layout.bodyPt, "Meta:")
			ty -= bodyLH
			ty = writeWrapped("F1", tx, ty, layout.innerW, layout.bodyPt, bodyLH, canDo, layout.canDoMaxLines)
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
			writeText("F2", tx, ty, layout.bodyPt, "Actividad sugerida:")
			ty -= bodyLH
			for i, act := range sec.Activities {
				if i >= 2 {
					break
				}
				act = strings.TrimSpace(act)
				if act == "" {
					continue
				}
				ty = writeWrapped("F1", tx, ty, layout.innerW, layout.bodyPt, bodyLH, "- "+act, layout.bulletMaxLines)
			}
		}
	}

	for i, pos := range plan.positions {
		if i >= len(secs) {
			break
		}
		drawCard(pos[0], pos[1], secs[i], plan.rowHeights[pos[1]])
	}
	return sb.String()
}

// BuildMPPECurriculumDaysPDF renders one portrait letter page per day (shared fonts).
func BuildMPPECurriculumDaysPDF(docs []MPPECurriculumDayDoc) ([]byte, error) {
	if len(docs) == 0 {
		return nil, fmt.Errorf("no days")
	}
	pageW := MmToPoints(EoschoolPageWidthMm)
	pageH := MmToPoints(EoschoolPageHeightMm)
	margin := MmToPoints(EoschoolMarginMm)
	gap := MmToPoints(mppeDayCardGapMm)
	pad := MmToPoints(mppeDayCardPadMm)

	streams := make([]string, len(docs))
	for i, doc := range docs {
		streams[i] = renderMPPECurriculumDayPageContent(doc, pageW, pageH, margin, gap, pad)
	}

	n := len(streams)
	kids := make([]string, n)
	for i := 0; i < n; i++ {
		pageObj := 5 + 2*i
		kids[i] = fmt.Sprintf("%d 0 R", pageObj)
	}

	var objs [][]byte
	objs = append(objs, []byte("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"))
	objs = append(objs, []byte(fmt.Sprintf(
		"2 0 obj\n<< /Type /Pages /Kids [%s] /Count %d >>\nendobj\n",
		strings.Join(kids, " "), n,
	)))
	objs = append(objs, []byte("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"))
	objs = append(objs, []byte("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n"))

	for i, content := range streams {
		pageObj := 5 + 2*i
		contentObj := 6 + 2*i
		objs = append(objs, []byte(fmt.Sprintf(
			"%d 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents %d 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n",
			pageObj, pageW, pageH, contentObj,
		)))
		objs = append(objs, buildStreamObject(contentObj, content))
	}
	return assemblePDF(objs), nil
}

// BuildMPPECurriculumDayPDF renders scheduled section cards on one portrait letter page.
func BuildMPPECurriculumDayPDF(doc MPPECurriculumDayDoc) ([]byte, error) {
	return BuildMPPECurriculumDaysPDF([]MPPECurriculumDayDoc{doc})
}

func trimLineEllipsis(s string) string {
	s = strings.TrimSpace(s)
	const max = 96
	if len(s) <= max {
		return s
	}
	cut := s[:max]
	if i := strings.LastIndex(cut, " "); i > max/2 {
		cut = cut[:i]
	}
	return strings.TrimSpace(cut) + "..."
}
