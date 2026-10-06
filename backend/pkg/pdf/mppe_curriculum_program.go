package pdf

import (
	"fmt"
	"strings"
)

// BuildMPPECurriculumProgramPDF builds cover + week index pages + one page per day sheet.
func BuildMPPECurriculumProgramPDF(docs []MPPECurriculumDayDoc) ([]byte, error) {
	if len(docs) == 0 {
		return nil, fmt.Errorf("no days")
	}
	pageW := MmToPoints(EoschoolPageWidthMm)
	pageH := MmToPoints(EoschoolPageHeightMm)
	margin := MmToPoints(EoschoolMarginMm)
	gap := MmToPoints(mppeDayCardGapMm)
	pad := MmToPoints(mppeDayCardPadMm)
	usableW := pageW - 2*margin
	colW := (usableW - 2*gap) / 3

	var streams []string
	streams = append(streams, renderMPPEProgramCover(docs, pageW, pageH, margin))

	weeks := groupMPPEDocsByWeek(docs)
	for _, w := range weeks {
		streams = append(streams, renderMPPEWeekIndexPage(w.week, w.docs, pageW, pageH, margin))
	}
	for _, doc := range docs {
		streams = append(streams, renderMPPECurriculumDayPageContent(doc, pageW, pageH, margin, gap, colW, pad))
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

type mppeWeekGroup struct {
	week int
	docs []MPPECurriculumDayDoc
}

func groupMPPEDocsByWeek(docs []MPPECurriculumDayDoc) []mppeWeekGroup {
	order := make([]int, 0)
	byWeek := map[int][]MPPECurriculumDayDoc{}
	for _, d := range docs {
		w := d.Week
		if w <= 0 {
			w = 1
		}
		if _, ok := byWeek[w]; !ok {
			order = append(order, w)
		}
		byWeek[w] = append(byWeek[w], d)
	}
	out := make([]mppeWeekGroup, 0, len(order))
	for _, w := range order {
		out = append(out, mppeWeekGroup{week: w, docs: byWeek[w]})
	}
	return out
}

func renderMPPEProgramCover(docs []MPPECurriculumDayDoc, pageW, pageH, margin float64) string {
	var sb strings.Builder
	y := pageH - margin - MmToPoints(20)
	write := func(font string, size float64, text string) {
		text = strings.TrimSpace(toWinAnsi(text))
		if text == "" {
			return
		}
		sb.WriteString(fmt.Sprintf("BT /%s %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
			font, size, margin, y, escape(text)))
		y -= size + MmToPoints(4)
	}
	write("F2", 18, "Curriculo MPPE 40 semanas")
	write("F1", 12, "Programa completo · 3er grado")
	write("F1", 11, fmt.Sprintf("%d dias escolares · %d semanas", len(docs), len(groupMPPEDocsByWeek(docs))))
	write("F1", 10, "Hoja por dia: Biblia, Identidad, Lenguaje, Matematicas, Ciencias")
	return sb.String()
}

func renderMPPEWeekIndexPage(week int, docs []MPPECurriculumDayDoc, pageW, pageH, margin float64) string {
	var sb strings.Builder
	y := pageH - margin - MmToPoints(12)
	write := func(font string, size float64, text string) {
		text = strings.TrimSpace(toWinAnsi(text))
		if text == "" {
			return
		}
		sb.WriteString(fmt.Sprintf("BT /%s %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
			font, size, margin, y, escape(text)))
		y -= size + MmToPoints(3)
	}
	write("F2", 14, fmt.Sprintf("Semana %d · indice", week))
	for _, d := range docs {
		title := strings.TrimSpace(d.Title)
		if title == "" {
			title = fmt.Sprintf("Dia %d", d.PlanDay)
		}
		write("F1", 10, fmt.Sprintf("Dia %d · %s", d.PlanDay, trimLineEllipsis(title)))
		if y < margin+MmToPoints(20) {
			break
		}
	}
	return sb.String()
}
