package pdf

import "testing"

func TestToWinAnsiNina(t *testing.T) {
	in := "Piensa primero: lee «La niña corre. Ella sonríe.»"
	got := toWinAnsi(in)
	t.Logf("len in=%d out=%d", len(in), len(got))
	raw := []byte(got)
	t.Logf("bytes: %v", raw)
	esc := escape(got)
	t.Logf("escaped: %s", esc)
	if !containsByte(got, 0xF1) {
		t.Fatal("missing 0xF1 ñ")
	}
	if !containsOctal(esc, "361") {
		t.Fatal("escape missing 361")
	}
	// Second pass must not eat accents (Homescool fitOneLine + writeText).
	again := toWinAnsi(got)
	if !containsByte(again, 0xF1) || !containsByte(again, 0xED) {
		t.Fatalf("toWinAnsi not idempotent: %v", []byte(again))
	}
}

func containsByte(s string, b byte) bool {
	for i := 0; i < len(s); i++ {
		if s[i] == b {
			return true
		}
	}
	return false
}
func containsOctal(s, oct string) bool {
	return len(s) > 0 && (stringIndex(s, `\`+oct) >= 0)
}
func stringIndex(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
