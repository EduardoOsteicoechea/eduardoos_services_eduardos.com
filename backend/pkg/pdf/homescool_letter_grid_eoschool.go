package pdf

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	// Floor 8 pt for all Letter ink (body, header, images band).
	hcLetterContentFontPt      = 8.0
	hcLetterHeaderFontPt       = 8.0
	hcLetterImagesFontPt       = 8.0
	hcImageInstructionMaxLines = 6
)

// homescoolSubjectLabel matches frontend HOMESCOOL_SUBJECT_LABELS.
func homescoolSubjectLabel(code string) string {
	switch strings.TrimSpace(code) {
	case "teb":
		return "Teología bíblica"
	case "exe":
		return "Exégesis"
	case "LT":
		return "Línea de tiempo"
	case "his":
		return "Historia de Venezuela"
	case "geo":
		return "Geografía"
	case "art":
		return "Bellas artes"
	case "mat":
		return "Matemáticas"
	case "esp":
		return "Español"
	case "ing":
		return "Inglés"
	case "lat":
		return "Latín"
	case "cie":
		return "Ciencias"
	case "pro":
		return "Proyecto"
	default:
		if code == "" {
			return "Materia"
		}
		return code
	}
}

// HCLetterColumnInk is one main column: line ink, bold headings, question gutter rows.
type HCLetterColumnInk struct {
	QuestionLines HCLetterColumnQuestionLines
	LineText      map[int]string // 1-based line index
	BoldLines     map[int]bool
	// QuizSeparatorBeforeLine: 1-based line where quiz starts; separator on that row's top. 0 = none.
	QuizSeparatorBeforeLine int
}

// HCLetterPageInk is lesson content mapped onto the v2 Letter grid.
type HCLetterPageInk struct {
	SubjectLabel        string
	TopicLabel          string
	SheetCode           string
	Columns             [3]HCLetterColumnInk
	ImageBandText       string // optional caption when no practice JPEG
	PracticeImageJPEG   []byte
	PracticeImageWidth  int
	PracticeImageHeight int
}

type eoschoolSlotJSON struct {
	Index        int    `json:"index"`
	Column       int    `json:"column"`
	Line         int    `json:"line"`
	Kind         string `json:"kind"`
	Text         string `json:"text"`
	QuestionID   string `json:"questionId"`
	QuestionType string `json:"questionType"`
	OptionIndex  int    `json:"optionIndex"`
}

type eoschoolQuestionJSON struct {
	ID      string   `json:"id"`
	Type    string   `json:"type"`
	Prompt  string   `json:"prompt"`
	Choices []string `json:"choices"`
}

type eoschoolLessonJSON struct {
	Title                string             `json:"title"`
	ImageBandInstruction string             `json:"imageBandInstruction"`
	SlotSequence         []eoschoolSlotJSON `json:"slotSequence"`
}

type eoschoolFileJSON struct {
	Title   string             `json:"title"`
	Subject string             `json:"subject"`
	Week    int                `json:"week"`
	Day     int                `json:"day"`
	Level   int                `json:"level"`
	Lesson  eoschoolLessonJSON `json:"lesson"`
	Quiz    struct {
		Questions []eoschoolQuestionJSON `json:"questions"`
	} `json:"quiz"`
}

func stripHomescoolInkMarkdown(s string) string {
	s = strings.ReplaceAll(s, "**", "")
	s = strings.ReplaceAll(s, "##", "")
	return strings.TrimSpace(s)
}

func isHomescoolQuestionSlotKind(kind string) bool {
	return kind == "question"
}

func isHomescoolHeadingKind(kind string) bool {
	return kind == "heading"
}

func isHomescoolResponseSlotKind(kind string) bool {
	switch kind {
	case "option", "answerLine", "answer":
		return true
	default:
		return false
	}
}

func isHomescoolImageInstructionKind(kind string) bool {
	return kind == "drawing" || kind == "imageInstruction"
}

func newEmptyColumnInk() HCLetterColumnInk {
	return HCLetterColumnInk{
		LineText:      make(map[int]string),
		BoldLines:     make(map[int]bool),
		QuestionLines: make(HCLetterColumnQuestionLines),
	}
}

func slotKey(col, line int) string {
	return fmt.Sprintf("%d:%d", col, line)
}

func indexSlotsByColLine(slots []eoschoolSlotJSON) map[string]eoschoolSlotJSON {
	m := make(map[string]eoschoolSlotJSON, len(slots))
	for _, slot := range slots {
		if slot.Column < 1 || slot.Column > 3 || slot.Line < 1 || slot.Line > 52 {
			continue
		}
		m[slotKey(slot.Column, slot.Line)] = slot
	}
	return m
}

func quizByID(questions []eoschoolQuestionJSON) map[string]eoschoolQuestionJSON {
	out := make(map[string]eoschoolQuestionJSON, len(questions))
	for _, q := range questions {
		if q.ID != "" {
			out[q.ID] = q
		}
	}
	return out
}

func questionBlockType(slot eoschoolSlotJSON, q eoschoolQuestionJSON) string {
	if t := strings.TrimSpace(slot.QuestionType); t != "" {
		return t
	}
	if t := strings.TrimSpace(q.Type); t != "" {
		return t
	}
	return "mcq"
}

func mcqOptionLine(label string, choice string) string {
	choice = stripHomescoolInkMarkdown(choice)
	if choice == "" {
		return label
	}
	return label + " " + choice
}

func expandQuestionResponseLines(
	ink *HCLetterColumnInk,
	col int,
	questionLine int,
	slot eoschoolSlotJSON,
	byPos map[string]eoschoolSlotJSON,
	questions map[string]eoschoolQuestionJSON,
) {
	qid := strings.TrimSpace(slot.QuestionID)
	q, ok := questions[qid]
	if !ok && qid == "" {
		return
	}
	qType := questionBlockType(slot, q)
	labels := []string{"A)", "B)", "C)", "D)"}

	for off := 1; off <= 4; off++ {
		ll := questionLine + off
		if ll > 52 {
			break
		}
		pos := byPos[slotKey(col, ll)]
		if pos.Kind != "" && !isHomescoolResponseSlotKind(pos.Kind) {
			continue
		}
		if t := stripHomescoolInkMarkdown(pos.Text); t != "" {
			// Skip dotted placeholders on write/schematic answer lines.
			if isHomescoolResponseSlotKind(pos.Kind) && (qType == "write" || qType == "schematic") && isDottedAnswerPlaceholder(t) {
				continue
			}
			ink.LineText[ll] = t
			continue
		}
		switch qType {
		case "mcq":
			if ok && off-1 < len(q.Choices) {
				ink.LineText[ll] = mcqOptionLine(labels[off-1], q.Choices[off-1])
			} else {
				ink.LineText[ll] = labels[off-1]
			}
		case "schematic", "write":
			// Leave ruled lines empty for handwriting (no dotted filler).
		default:
			if ok && q.Type == "mcq" && off-1 < len(q.Choices) {
				ink.LineText[ll] = mcqOptionLine(labels[off-1], q.Choices[off-1])
			}
		}
	}
}

func isDottedAnswerPlaceholder(text string) bool {
	t := strings.TrimSpace(text)
	if t == "" {
		return false
	}
	for _, r := range t {
		if r != '.' && r != '·' && r != '•' && r != ' ' {
			return false
		}
	}
	return strings.Contains(t, ".")
}

func placeCol3ImageInstructionTail(ink *HCLetterColumnInk, slots []eoschoolSlotJSON, imageBand string, contentWidthPt float64) {
	imageBand = stripHomescoolInkMarkdown(imageBand)
	if imageBand == "" {
		return
	}

	var explicit []eoschoolSlotJSON
	for _, slot := range slots {
		if slot.Column != 3 || !isHomescoolImageInstructionKind(slot.Kind) {
			continue
		}
		if t := stripHomescoolInkMarkdown(slot.Text); t != "" {
			explicit = append(explicit, slot)
		}
	}
	if len(explicit) > 1 {
		for _, slot := range explicit {
			ink.LineText[slot.Line] = stripHomescoolInkMarkdown(slot.Text)
			ink.BoldLines[slot.Line] = true
		}
		return
	}

	wrapped := wrapWordsToWidth(toWinAnsi(imageBand), hcLetterContentFontPt, contentWidthPt, false)
	if len(wrapped) == 0 {
		return
	}
	if len(wrapped) > hcImageInstructionMaxLines {
		wrapped = wrapped[:hcImageInstructionMaxLines]
	}
	start := 52 - len(wrapped) + 1
	if start < 1 {
		start = 1
	}
	for i, line := range wrapped {
		ln := start + i
		if ln > 52 {
			break
		}
		ink.LineText[ln] = line
		ink.BoldLines[ln] = true
	}
}

func buildColumnInk(
	col int,
	slots []eoschoolSlotJSON,
	byPos map[string]eoschoolSlotJSON,
	questions map[string]eoschoolQuestionJSON,
	imageBand string,
	contentWidthPt float64,
) HCLetterColumnInk {
	ink := newEmptyColumnInk()

	for _, slot := range slots {
		if slot.Column != col {
			continue
		}
		line := slot.Line
		kind := slot.Kind

		if kind == "blank" {
			continue
		}

		text := stripHomescoolInkMarkdown(slot.Text)
		if isHomescoolHeadingKind(kind) && text != "" {
			ink.LineText[line] = text
			ink.BoldLines[line] = true
			continue
		}

		if isHomescoolQuestionSlotKind(kind) {
			if text == "" && slot.QuestionID != "" {
				if q, ok := questions[slot.QuestionID]; ok {
					text = stripHomescoolInkMarkdown(q.Prompt)
				}
			}
			if text != "" {
				ink.LineText[line] = text
			}
			ink.QuestionLines[line] = true
			expandQuestionResponseLines(&ink, col, line, slot, byPos, questions)
			continue
		}

		if isHomescoolResponseSlotKind(kind) {
			if text != "" && !isDottedAnswerPlaceholder(text) {
				ink.LineText[line] = text
			}
			continue
		}

		if isHomescoolImageInstructionKind(kind) {
			// Placed on col 3 tail in placeCol3ImageInstructionTail unless single-slot fallback.
			if col != 3 {
				if text != "" {
					ink.LineText[line] = text
				}
			}
			continue
		}

		if text != "" {
			ink.LineText[line] = text
		}
	}

	if col == 3 {
		placeCol3ImageInstructionTail(&ink, slots, imageBand, contentWidthPt)
	}

	// Separator only at lesson→quiz boundary in this column (not when quiz continues from prior col).
	firstQ := 0
	for line := 1; line <= 52; line++ {
		if ink.QuestionLines[line] {
			firstQ = line
			break
		}
	}
	if firstQ > 0 {
		for _, slot := range slots {
			if slot.Column != col || slot.Line >= firstQ {
				continue
			}
			kind := slot.Kind
			if kind == "opening" || kind == "lesson" || kind == "heading" || kind == "summary" {
				if stripHomescoolInkMarkdown(slot.Text) != "" {
					ink.QuizSeparatorBeforeLine = firstQ
					break
				}
			}
		}
	}
	return ink
}

// HCLetterPageInkFromEoschoolBytes maps lesson.slotSequence + quiz onto columns 1–3.
func HCLetterPageInkFromEoschoolBytes(raw []byte) (HCLetterPageInk, error) {
	var doc eoschoolFileJSON
	if err := json.Unmarshal(raw, &doc); err != nil {
		return HCLetterPageInk{}, err
	}
	title := strings.TrimSpace(doc.Title)
	if title == "" {
		title = strings.TrimSpace(doc.Lesson.Title)
	}
	page := HCLetterPageInk{
		SubjectLabel:  homescoolSubjectLabel(doc.Subject),
		TopicLabel:    title,
		SheetCode:     fmt.Sprintf("%s-c3-w%d-d%d-l6", doc.Subject, doc.Week, doc.Day),
		ImageBandText: "Práctica visual (banda inferior)",
	}
	byPos := indexSlotsByColLine(doc.Lesson.SlotSequence)
	questions := quizByID(doc.Quiz.Questions)

	g := ComputeHomescoolLetterGrid()
	colWidths := []float64{g.MainCol1.W, g.MainCol2.W, g.MainCol3.W}
	for i := 0; i < 3; i++ {
		inset := HCLetterGridStrokeMm
		contentWPt := MmToPoints(colWidths[i] - 2*inset)
		page.Columns[i] = buildColumnInk(
			i+1,
			doc.Lesson.SlotSequence,
			byPos,
			questions,
			doc.Lesson.ImageBandInstruction,
			contentWPt,
		)
	}
	return page, nil
}

func LoadHCLetterPageInkFromEoschoolFile(path string) (HCLetterPageInk, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return HCLetterPageInk{}, err
	}
	return HCLetterPageInkFromEoschoolBytes(raw)
}

// ComposeTebExePreviewPage puts teología in main col 1 and exégesis col-1 slots in main col 2 (sample day opener).
func ComposeTebExePreviewPage(teb, exe HCLetterPageInk) HCLetterPageInk {
	out := HCLetterPageInk{
		SubjectLabel:  "Teología bíblica",
		TopicLabel:    "Teología bíblica + Exégesis · S1 D1",
		SheetCode:     "teb + exe",
		ImageBandText: teb.ImageBandText,
		Columns: [3]HCLetterColumnInk{
			teb.Columns[0],
			remapColumnInkToDisplay(exe.Columns[0]),
			teb.Columns[2],
		},
	}
	if strings.TrimSpace(out.ImageBandText) == "" {
		out.ImageBandText = exe.ImageBandText
	}
	return out
}

func remapColumnInkToDisplay(src HCLetterColumnInk) HCLetterColumnInk {
	dst := newEmptyColumnInk()
	for line, text := range src.LineText {
		dst.LineText[line] = text
	}
	for line, on := range src.BoldLines {
		if on {
			dst.BoldLines[line] = true
		}
	}
	for line, on := range src.QuestionLines {
		if on {
			dst.QuestionLines[line] = true
		}
	}
	return dst
}

func homescoolMediaPathCandidates(rel string) []string {
	rel = filepath.FromSlash(rel)
	return []string{
		filepath.Join("..", "frontend", "public", "homescool", "media", rel),
		filepath.Join("..", "..", "..", "frontend", "public", "homescool", "media", rel),
		filepath.Join("frontend", "public", "homescool", "media", rel),
	}
}

func resolveHomescoolMediaPath(rel string) (string, error) {
	for _, p := range homescoolMediaPathCandidates(rel) {
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}
	return "", fmt.Errorf("homescool media not found: %s", rel)
}

func practiceImageRelPath(subject string, week int) string {
	return fmt.Sprintf("week%d/practice-images/%s-c3-w%d-practice.jpg", week, subject, week)
}

// LoadHCLetterPageWithPracticeImage loads .eoschool JSON and the matching practice JPEG.
func LoadHCLetterPageWithPracticeImage(eoschoolRel string) (HCLetterPageInk, error) {
	path, err := resolveHomescoolMediaPath(eoschoolRel)
	if err != nil {
		return HCLetterPageInk{}, err
	}
	page, err := LoadHCLetterPageInkFromEoschoolFile(path)
	if err != nil {
		return HCLetterPageInk{}, err
	}
	var doc eoschoolFileJSON
	raw, err := os.ReadFile(path)
	if err != nil {
		return HCLetterPageInk{}, err
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		return HCLetterPageInk{}, err
	}
	imgPath, err := resolveHomescoolMediaPath(practiceImageRelPath(doc.Subject, doc.Week))
	if err != nil {
		return page, nil
	}
	jpeg, err := os.ReadFile(imgPath)
	if err != nil {
		return page, nil
	}
	w, h, ok := jpegSize(jpeg)
	if !ok {
		return page, nil
	}
	page.PracticeImageJPEG = jpeg
	page.PracticeImageWidth = w
	page.PracticeImageHeight = h
	page.ImageBandText = ""
	return page, nil
}

func fitOneLineInk(text string, sizePt, maxWidthPt float64, bold bool) string {
	text = strings.TrimSpace(toWinAnsi(text))
	if text == "" {
		return ""
	}
	lines := wrapWordsToWidth(text, sizePt, maxWidthPt, bold)
	if len(lines) == 0 {
		return ""
	}
	if len(lines) == 1 {
		return lines[0]
	}
	first := lines[0]
	ellipsis := "..."
	if stringWidthPt(first+ellipsis, sizePt, bold) <= maxWidthPt {
		return first + ellipsis
	}
	for len(first) > 0 {
		first = first[:len(first)-1]
		if stringWidthPt(first+ellipsis, sizePt, bold) <= maxWidthPt {
			return first + ellipsis
		}
	}
	return ellipsis
}

func drawHeaderInk(s *strings.Builder, box RectMm, text string) {
	text = fitOneLineInk(text, hcLetterHeaderFontPt, MmToPoints(box.W-1.0), false)
	if text == "" {
		drawEmptyBox(s, box)
		return
	}
	drawEmptyBox(s, box)
	padX := 0.5
	baselineCss := box.Top + box.H*0.65
	writeTextFillMm(s, "F1", hcLetterHeaderFontPt, box.X+padX, homescoolPDFYMm(baselineCss),
		0, 0, 0, text)
}

func drawImagesBandInk(s *strings.Builder, box RectMm, page HCLetterPageInk) {
	drawEmptyBox(s, box)
	if len(page.PracticeImageJPEG) > 0 && page.PracticeImageWidth > 0 && page.PracticeImageHeight > 0 {
		drawJPEGInCSSBox(s, box, "Im0", page.PracticeImageWidth, page.PracticeImageHeight)
		return
	}
	text := fitOneLineInk(page.ImageBandText, hcLetterImagesFontPt, MmToPoints(box.W-2.0), false)
	if text == "" {
		return
	}
	padX := 1.0
	baselineCss := box.Top + 4.0
	writeTextFillMm(s, "F1", hcLetterImagesFontPt, box.X+padX, homescoolPDFYMm(baselineCss),
		0.4, 0.4, 0.4, text)
}

func drawJPEGInCSSBox(s *strings.Builder, box RectMm, xobj string, imgW, imgH int) {
	if box.W <= 0 || box.H <= 0 || imgW <= 0 || imgH <= 0 {
		return
	}
	imgAspect := float64(imgW) / float64(imgH)
	boxAspect := box.W / box.H
	var drawW, drawH float64
	if imgAspect > boxAspect {
		drawW = box.W
		drawH = box.W / imgAspect
	} else {
		drawH = box.H
		drawW = box.H * imgAspect
	}
	offsetX := box.X + (box.W-drawW)/2
	offsetTop := box.Top + (box.H-drawH)/2
	bottomMm := EoschoolPageHeightMm - (offsetTop + drawH)
	leftPt := MmToPoints(offsetX)
	bottomPt := MmToPoints(bottomMm)
	wPt := MmToPoints(drawW)
	hPt := MmToPoints(drawH)
	s.WriteString("q\n")
	s.WriteString(fmt.Sprintf("%.2f 0 0 %.2f %.2f %.2f cm\n", wPt, hPt, leftPt, bottomPt))
	s.WriteString(fmt.Sprintf("/%s Do\n", xobj))
	s.WriteString("Q\n")
}

func drawLinedBoxWithInk(s *strings.Builder, box RectMm, stepMm float64, ink HCLetterColumnInk) {
	if box.W <= 0 || box.H <= 0 {
		return
	}
	inset := HCLetterGridStrokeMm
	contentWPt := MmToPoints(box.W - 2*inset)
	textX := box.X + inset

	if HCLetterShowMainRules {
		topY := homescoolPDFYMm(box.Top)
		strokeRuleRGB(s,
			box.X, topY,
			box.X+box.W, topY,
			HCLetterGridStrokeMm, hcLetterContainerR, hcLetterContainerR, hcLetterContainerR,
		)
	}
	nRows := int(box.H / stepMm)
	for i := 0; i < nRows; i++ {
		lineNum := i + 1
		rowTop := box.Top + float64(i)*stepMm
		yTop := rowTop + stepMm

		if HCLetterShowMainRules {
			pdfY := homescoolPDFYMm(yTop)
			strokeRuleRGB(s,
				box.X+inset, pdfY,
				box.X+box.W-inset, pdfY,
				HCLetterGridStrokeMm, hcLetterContainerR, hcLetterContainerR, hcLetterContainerR,
			)
		}

		// Full-width darker rule between lesson text and first quiz row (always visible).
		if ink.QuizSeparatorBeforeLine > 0 && lineNum == ink.QuizSeparatorBeforeLine {
			sepY := homescoolPDFYMm(rowTop)
			strokeRuleRGB(s,
				box.X, sepY,
				box.X+box.W, sepY,
				HCLetterQuizSeparatorStrokeMm, 0.2, 0.2, 0.2,
			)
		}

		if ink.LineText != nil {
			if lineText, ok := ink.LineText[lineNum]; ok {
				bold := ink.BoldLines != nil && ink.BoldLines[lineNum]
				font := "F1"
				if bold {
					font = "F2"
				}
				oneLine := fitOneLineInk(lineText, hcLetterContentFontPt, contentWPt, bold)
				if oneLine != "" {
					baselineCss := rowTop + stepMm*0.72
					writeTextFillMm(s, font, hcLetterContentFontPt, textX+0.25, homescoolPDFYMm(baselineCss),
						0, 0, 0, oneLine)
				}
			}
		}
	}
}

func renderHomescoolLetterGridPage(s *strings.Builder, g HomescoolLetterGrid, page HCLetterPageInk) {
	subject := strings.TrimSpace(page.SubjectLabel)
	if subject == "" {
		subject = "Materia"
	}
	drawHeaderInk(s, g.SignatureName, subject)
	drawHeaderInk(s, g.SignatureTopic, page.TopicLabel)
	drawHeaderInk(s, g.SheetCode, page.SheetCode)
	drawHeaderInk(s, g.Date, "Fecha")
	drawHeaderInk(s, g.Student, "Estudiante")
	drawHeaderInk(s, g.Reviewer, "Revisor")
	drawHeaderInk(s, g.ReviewerSignature, "Firma")

	cols := []RectMm{g.MainCol1, g.MainCol2, g.MainCol3}
	for i := 0; i < 3; i++ {
		drawLinedBoxWithInk(s, cols[i], HCLetterRuleStepMm, page.Columns[i])
	}
	drawImagesBandInk(s, g.Images, page)
}
