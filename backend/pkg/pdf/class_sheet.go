package pdf

import (
	_ "embed"
	"fmt"
	"regexp"
	"strings"
	"unicode"
)

// Class sheet: the same landscape Letter layout as txt-to-pdf-len.py
// build_pdf(..., gutter=20, styled=True). Left column is the exposition.
// Right column is the questions. A retry sheet keeps that page and writes
// the child's correct answer on the blank line. A wrong answer stays blank.

const (
	classPageWmm      = 279.4
	classPageHmm      = 215.9
	classMarginXmm    = 11.0
	classMarginTop    = 12.0
	classMarginBottom = 12.0
	classGutterMm     = 20.0
	classLineHmm      = 4.55
	classFontPt       = 9.0
	classCellPadMm    = 1.0 // fpdf c_margin
)

//go:embed fonts/LiberationSans-Regular.ttf
var liberationRegularTTF []byte

//go:embed fonts/LiberationSans-Bold.ttf
var liberationBoldTTF []byte

//go:embed classsrc/d40/biblia.txt
var classD40Biblia string

//go:embed classsrc/d40/identidad.txt
var classD40Identidad string

//go:embed classsrc/d40/lenguaje.txt
var classD40Lenguaje string

//go:embed classsrc/d40/matematica.txt
var classD40Matematica string

//go:embed classsrc/d40/ciencias.txt
var classD40Ciencias string

//go:embed classsrc/d40/ingles.txt
var classD40Ingles string

//go:embed classsrc/d40/ia.txt
var classD40IA string

var (
	liberationRegular *ttfFace
	liberationBold    *ttfFace
)

func init() {
	var err error
	liberationRegular, err = parseTTF(liberationRegularTTF)
	if err != nil {
		panic("pdf: LiberationSans-Regular.ttf: " + err.Error())
	}
	liberationBold, err = parseTTF(liberationBoldTTF)
	if err != nil {
		panic("pdf: LiberationSans-Bold.ttf: " + err.Error())
	}
}

// ClassRetryAnswer is one graded written line. Correct answers are printed
// on the blank. Incorrect answers are not.
type ClassRetryAnswer struct {
	Prompt  string
	Answer  string
	Correct bool
}

type classSheetSource struct {
	section string
	text    string
}

func classSources(planDay int) []classSheetSource {
	if planDay != 40 {
		return nil
	}
	return []classSheetSource{
		{"bib", classD40Biblia},
		{"ide", classD40Identidad},
		{"len", classD40Lenguaje},
		{"mat", classD40Matematica},
		{"cie", classD40Ciencias},
		{"eng", classD40Ingles},
		{"ia", classD40IA},
	}
}

// ClassRetryAvailable reports whether this plan day has the original class text.
func ClassRetryAvailable(planDay int) bool {
	return len(classSources(planDay)) > 0
}

// ClassRetrySectionIDs is the page order of that class.
func ClassRetrySectionIDs(planDay int) []string {
	src := classSources(planDay)
	out := make([]string, 0, len(src))
	for _, s := range src {
		out = append(out, s.section)
	}
	return out
}

// ApplyClassRetryLines returns the class text with correct answers written
// on their blank lines. Wrong and unmatched questions keep the underscore line.
func ApplyClassRetryLines(src string, fills []ClassRetryAnswer) string {
	lines := strings.Split(strings.ReplaceAll(src, "\r\n", "\n"), "\n")
	prev := ""
	for i, line := range lines {
		trim := strings.TrimSpace(line)
		if trim == "" || strings.HasPrefix(trim, "@@") || strings.HasPrefix(trim, "## ") {
			continue
		}
		if isUnderscoreLine(trim) {
			if words := retryWords(prev, fills); words != "" {
				lines[i] = words
			}
			prev = ""
			continue
		}
		prev = trim
	}
	return strings.Join(lines, "\n")
}

func isUnderscoreLine(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r != '_' {
			return false
		}
	}
	return true
}

func retryWords(question string, fills []ClassRetryAnswer) string {
	fill, ok := matchRetryFill(question, fills)
	if !ok || !fill.Correct {
		return ""
	}
	return childRetryAnswer(fill.Answer)
}

func matchRetryFill(question string, fills []ClassRetryAnswer) (ClassRetryAnswer, bool) {
	q := normRetryText(question)
	var best ClassRetryAnswer
	bestLen := 0
	found := false
	for _, fill := range fills {
		p := normRetryText(fill.Prompt)
		if len([]rune(p)) < 8 {
			continue
		}
		if strings.Contains(q, p) || strings.Contains(p, q) {
			if n := len([]rune(p)); n > bestLen {
				best = fill
				bestLen = n
				found = true
			}
		}
	}
	return best, found
}

var retryNumberPrefix = regexp.MustCompile(`^\d+\.\s*`)

func normRetryText(s string) string {
	s = retryNumberPrefix.ReplaceAllString(strings.TrimSpace(s), "")
	var b strings.Builder
	prevSpace := false
	for _, r := range strings.ToLower(s) {
		switch r {
		case '¿', '?', '¡', '!', '«', '»', '"', '\'', '“', '”', '‘', '’', '.', ',', ':', ';':
			continue
		case '—', '–', '-', '·':
			r = ' '
		}
		if unicode.IsSpace(r) {
			if prevSpace || b.Len() == 0 {
				continue
			}
			b.WriteByte(' ')
			prevSpace = true
			continue
		}
		b.WriteRune(r)
		prevSpace = false
	}
	return strings.TrimSpace(b.String())
}

func childRetryAnswer(answer string) string {
	cut := answer
	for _, mark := range []string{"Esperado:", "Falta "} {
		if i := strings.Index(cut, mark); i >= 0 {
			cut = cut[:i]
		}
	}
	return strings.TrimSpace(cut)
}

// BuildClassRetryPDF renders one landscape page per subject, in class order.
func BuildClassRetryPDF(planDay int, answers map[string][]ClassRetryAnswer) ([]byte, error) {
	sources := classSources(planDay)
	if len(sources) == 0 {
		return nil, fmt.Errorf("no class sheet")
	}
	var pages []string
	for _, src := range sources {
		text := src.text
		if answers != nil {
			text = ApplyClassRetryLines(text, answers[src.section])
		}
		rendered, err := renderClassSheet(text)
		if err != nil {
			return nil, err
		}
		pages = append(pages, rendered...)
	}
	if len(pages) == 0 {
		return nil, fmt.Errorf("empty class sheet")
	}
	return assembleClassSheetPDF(pages), nil
}

type classLayout struct {
	pages   []string
	cur     strings.Builder
	started bool
	side    string
	leftY   float64
	rightY  float64
	font    string
	fontPt  float64
	face    *ttfFace
}

func renderClassSheet(src string) ([]string, error) {
	lines := strings.Split(strings.ReplaceAll(src, "\r\n", "\n"), "\n")
	lay := &classLayout{}
	lay.setFont(false, classFontPt)
	lay.newSheet()
	colW, maxY, leftX, rightX := classGeom()
	skipUntil := -1
	for i, raw := range lines {
		if i < skipUntil {
			continue
		}
		line := strings.TrimRight(raw, "\r")
		if strings.HasPrefix(line, "@@TITULO ") {
			subtitle := ""
			if i+1 < len(lines) && strings.HasPrefix(lines[i+1], "@@SUB ") {
				subtitle = lines[i+1][6:]
			}
			lay.drawBanner(line[9:], subtitle)
			continue
		}
		if strings.HasPrefix(line, "@@SUB ") || strings.TrimSpace(line) == "@@MAPA" {
			continue
		}
		if strings.TrimSpace(line) == "@@HOJA" {
			if lay.pageHasContent() {
				lay.newSheet()
			}
			continue
		}
		if strings.TrimSpace(line) == "@@COL" {
			if lay.side == "left" {
				lay.side = "right"
			}
			continue
		}
		if strings.TrimSpace(line) == "" {
			lay.gap(classLineHmm * 0.35)
			continue
		}
		if strings.HasPrefix(line, "## ") {
			lay.gap(classLineHmm * 0.55)
			lay.setFont(true, 11)
			lay.writeLine(line[3:], colW, maxY, leftX, rightX)
			lay.setFont(false, classFontPt)
			continue
		}
		lay.writeLine(line, colW, maxY, leftX, rightX)
	}
	lay.flush()
	if len(lay.pages) == 0 {
		return nil, fmt.Errorf("blank class page")
	}
	return lay.pages, nil
}

func classGeom() (colW, maxY, leftX, rightX float64) {
	colW = (classPageWmm - (2 * classMarginXmm) - classGutterMm) / 2
	maxY = classPageHmm - classMarginBottom
	leftX = classMarginXmm
	rightX = classMarginXmm + colW + classGutterMm
	return colW, maxY, leftX, rightX
}

func (l *classLayout) setFont(bold bool, pt float64) {
	l.fontPt = pt
	if bold {
		l.font = "F2"
		l.face = liberationBold
		return
	}
	l.font = "F1"
	l.face = liberationRegular
}

func (l *classLayout) newSheet() {
	if l.started {
		l.pages = append(l.pages, l.cur.String())
		l.cur.Reset()
	}
	l.started = true
	l.side = "left"
	l.leftY = classMarginTop
	l.rightY = classMarginTop
	l.cur.WriteString("0 0 0 rg\n")
}

func (l *classLayout) flush() {
	if !l.started {
		return
	}
	l.pages = append(l.pages, l.cur.String())
	l.cur.Reset()
	l.started = false
}

func (l *classLayout) pageHasContent() bool {
	return l.leftY > classMarginTop+0.01 || l.rightY > classMarginTop+0.01
}

func (l *classLayout) gap(amount float64) {
	if l.side == "left" {
		if l.leftY > classMarginTop+0.2 {
			l.leftY += amount
		}
		return
	}
	if l.rightY > classMarginTop+0.2 {
		l.rightY += amount
	}
}

func (l *classLayout) drawBanner(title, subtitle string) {
	l.setFont(true, 14)
	l.drawCell(classMarginXmm, 8, classPageWmm-(2*classMarginXmm), 6.5, title)
	l.setFont(false, classFontPt)
	l.drawCell(classMarginXmm, 15, classPageWmm-(2*classMarginXmm), 4.5, subtitle)
	l.cur.WriteString(classRule(21, classMarginXmm, classPageWmm-classMarginXmm, 0.35))
	l.leftY = 24.5
	l.rightY = 24.5
	l.side = "left"
}

func (l *classLayout) writeLine(text string, colW, maxY, leftX, rightX float64) {
	for _, sub := range wrapClassLine(l.face, l.fontPt, text, colW) {
		l.placeLine(sub, colW, maxY, leftX, rightX)
	}
}

func (l *classLayout) placeLine(text string, colW, maxY, leftX, rightX float64) {
	for {
		if l.side == "left" {
			y := l.leftY
			if y+classLineHmm <= maxY {
				l.drawCell(leftX, y, colW, classLineHmm, text)
				l.leftY = y + classLineHmm
				return
			}
			l.side = "right"
			continue
		}
		y := l.rightY
		if y+classLineHmm <= maxY {
			l.drawCell(rightX, y, colW, classLineHmm, text)
			l.rightY = y + classLineHmm
			return
		}
		l.newSheet()
	}
}

func (l *classLayout) drawCell(x, y, w, h float64, text string) {
	_ = w
	text = toWinAnsi(text)
	if text == "" {
		return
	}
	base := classPageHmm - (y + 0.5*h + 0.3*classPtToMm(l.fontPt))
	fmt.Fprintf(&l.cur, "BT /%s %.2f Tf %.2f %.2f Td (%s) Tj ET\n",
		l.font, l.fontPt, MmToPoints(x+classCellPadMm), MmToPoints(base), escape(text))
}

func classPtToMm(pt float64) float64 {
	return pt * 25.4 / 72.0
}

func classRule(yFromTop, x1, x2, widthMm float64) string {
	y := MmToPoints(classPageHmm - yFromTop)
	return fmt.Sprintf("%.3f %.3f %.3f RG %.2f w %.2f %.2f m %.2f %.2f l S\n0 0 0 rg\n",
		30.0/255, 30.0/255, 30.0/255, MmToPoints(widthMm),
		MmToPoints(x1), y, MmToPoints(x2), y)
}

func wrapClassLine(face *ttfFace, pt float64, text string, maxWmm float64) []string {
	text = strings.TrimRight(text, " \t")
	if text == "" {
		return []string{""}
	}
	maxPt := MmToPoints(maxWmm)
	var out []string
	current := ""
	for _, word := range strings.Split(text, " ") {
		if word == "" {
			continue
		}
		trial := word
		if current != "" {
			trial = current + " " + word
		}
		if classWidthPt(face, pt, trial) <= maxPt {
			current = trial
			continue
		}
		if current != "" {
			out = append(out, current)
			current = ""
		}
		chunk := []rune(word)
		for classWidthPt(face, pt, string(chunk)) > maxPt && len(chunk) > 1 {
			n := 1
			for n < len(chunk) && classWidthPt(face, pt, string(chunk[:n+1])) <= maxPt {
				n++
			}
			out = append(out, string(chunk[:n]))
			chunk = chunk[n:]
		}
		current = string(chunk)
	}
	if current != "" {
		out = append(out, current)
	}
	if len(out) == 0 {
		return []string{""}
	}
	return out
}

func classWidthPt(face *ttfFace, pt float64, text string) float64 {
	raw := toWinAnsi(text)
	total := 0.0
	for i := 0; i < len(raw); i++ {
		w := face.widths[raw[i]]
		if w <= 0 {
			w = 600
		}
		total += float64(w) / 1000.0 * pt
	}
	return total
}

func assembleClassSheetPDF(pages []string) []byte {
	n := len(pages)
	pageW := MmToPoints(classPageWmm)
	pageH := MmToPoints(classPageHmm)
	regFile, boldFile := 3, 4
	regDesc, boldDesc := 5, 6
	regFont, boldFont := 7, 8
	kids := make([]string, n)
	for i := 0; i < n; i++ {
		kids[i] = fmt.Sprintf("%d 0 R", 9+2*i)
	}
	var objs [][]byte
	objs = append(objs, []byte("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"))
	objs = append(objs, []byte(fmt.Sprintf(
		"2 0 obj\n<< /Type /Pages /Kids [%s] /Count %d >>\nendobj\n",
		strings.Join(kids, " "), n,
	)))
	objs = append(objs, buildFontFileObject(regFile, liberationRegularTTF))
	objs = append(objs, buildFontFileObject(boldFile, liberationBoldTTF))
	objs = append(objs, []byte(fontDescriptorObj(regDesc, "LiberationSans", liberationRegular, regFile)))
	objs = append(objs, []byte(fontDescriptorObj(boldDesc, "LiberationSans-Bold", liberationBold, boldFile)))
	objs = append(objs, []byte(trueTypeFontObj(regFont, "LiberationSans", liberationRegular, regDesc)))
	objs = append(objs, []byte(trueTypeFontObj(boldFont, "LiberationSans-Bold", liberationBold, boldDesc)))
	for i, content := range pages {
		pageObj := 9 + 2*i
		contentObj := 10 + 2*i
		objs = append(objs, []byte(fmt.Sprintf(
			"%d 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents %d 0 R /Resources << /Font << /F1 %d 0 R /F2 %d 0 R >> >> >>\nendobj\n",
			pageObj, pageW, pageH, contentObj, regFont, boldFont,
		)))
		objs = append(objs, buildStreamObject(contentObj, content))
	}
	return assemblePDF(objs)
}
