package pdf

import (
	"strings"
	"testing"
)

func TestHomescoolIngD1EnglishFrame(t *testing.T) {
	page, err := LoadHCLetterPageWithPracticeImage("week1/ing-c3-w1-d1-l6.eoschool.json")
	if err != nil {
		t.Fatal(err)
	}
	var all strings.Builder
	for _, col := range page.Columns {
		for i := 1; i <= 52; i++ {
			if t := col.LineText[i]; t != "" {
				all.WriteString(t)
				all.WriteByte('\n')
			}
		}
	}
	s := all.String()
	for _, needle := range []string{
		"What did you learn in the last class?",
		"Point 1: Review of the last class",
		"Write here what you learned:",
	} {
		if !strings.Contains(s, needle) {
			t.Fatalf("ing ink missing %q; sample=%q", needle, firstLineContaining(s, "What"))
		}
	}
	if page.SubjectLabel != "Inglés" {
		t.Fatalf("subject label=%q", page.SubjectLabel)
	}
	if len(page.PracticeImageJPEG) == 0 {
		t.Fatal("expected per-class practice JPEG for ing d1")
	}
	raw, err := BuildHomescoolLetterGridPDF([]HCLetterPageInk{page})
	if err != nil {
		t.Fatal(err)
	}
	out := string(raw)
	for _, needle := range []string{"What did you learn", "Point 1", "Write here what you learned", "DCTDecode"} {
		if !strings.Contains(out, needle) {
			t.Fatalf("ing PDF missing %q", needle)
		}
	}
}

func TestHomescoolEspD1KeepsAccents(t *testing.T) {
	page, err := LoadHCLetterPageWithPracticeImage("week1/esp-c3-w1-d1-l6.eoschool.json")
	if err != nil {
		t.Fatal(err)
	}
	var all strings.Builder
	for _, col := range page.Columns {
		for i := 1; i <= 52; i++ {
			if t := col.LineText[i]; t != "" {
				all.WriteString(t)
				all.WriteByte('\n')
			}
		}
	}
	s := all.String()
	t.Logf("sample: %q", firstLineContaining(s, "palabra"))
	// The class text must carry accents after toWinAnsi (ñ is byte 0xF1 in a Go string).
	// (The class copy changes between methodology versions, so accept any Spanish accent byte.)
	accents := []byte{0xE1, 0xE9, 0xED, 0xF3, 0xFA, 0xF1, 0xBF} // á é í ó ú ñ ¿
	found := false
	for _, b := range accents {
		if strings.IndexByte(s, b) >= 0 {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("no WinAnsi accent bytes in ink; snippet: %q", snippetAround(s, "aprendiste"))
	}
	raw, err := BuildHomescoolLetterGridPDF([]HCLetterPageInk{page})
	if err != nil {
		t.Fatal(err)
	}
	out := string(raw)
	if !strings.Contains(out, `\351`) && !strings.Contains(out, `\341`) && !strings.Contains(out, `\363`) && !strings.Contains(out, `\277`) {
		t.Fatalf("PDF missing WinAnsi octal for accents")
	}
}

func firstLineContaining(s, needle string) string {
	for _, line := range strings.Split(s, "\n") {
		if strings.Contains(line, needle) {
			return line
		}
	}
	return ""
}

func snippetAround(s, needle string) string {
	i := strings.Index(s, needle)
	if i < 0 {
		return ""
	}
	a := i - 10
	if a < 0 {
		a = 0
	}
	b := i + 30
	if b > len(s) {
		b = len(s)
	}
	return s[a:b]
}
