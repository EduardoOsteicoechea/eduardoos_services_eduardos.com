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
	t.Logf("sample: %q", firstLineContaining(s, "Piensa primero"))
	if !strings.Contains(s, "niña") && !strings.Contains(s, string([]byte{0xF1})) {
		// after toWinAnsi, ñ is byte 0xF1 in a Go string
		t.Fatalf("missing niña in ink; has nia=%v; snippet around nia: %q", strings.Contains(s, "nia"), snippetAround(s, "nia"))
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
