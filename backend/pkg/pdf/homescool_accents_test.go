package pdf

import (
	"strings"
	"testing"
)

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
	if !strings.Contains(s, "Añade") && !strings.Contains(s, string([]byte{0xF1})) {
		t.Fatalf("missing ñ in ink; snippet around ade: %q", snippetAround(s, "ade un ejemplo"))
	}
	raw, err := BuildHomescoolLetterGridPDF([]HCLetterPageInk{page})
	if err != nil {
		t.Fatal(err)
	}
	out := string(raw)
	if !strings.Contains(out, `\361`) && !strings.Contains(out, "\\361") {
		t.Fatalf("PDF missing WinAnsi octal for ñ (\\361); has nia literal=%v", strings.Contains(out, "nia corre"))
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
