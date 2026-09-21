package pdf

import (
	"bytes"
	"testing"
)

func TestNTildeInPamphletPDF(t *testing.T) {
	doc := PamphletDocument{
		Type:   "pamphlet_single_sheet",
		Header: PamphletHeader{Title: "Titulo", Subtitle: "sub", Author: "auth"},
		Column1: []PamphletItem{
			{Type: "paragraph", Content: "El niño español."},
		},
	}
	data := BuildPamphletPDF(doc)

	// Content stream must use PDF octal for ñ (WinAnsi 0xF1 → \361), not raw 0xF1.
	if !bytes.Contains(data, []byte(`\361`)) {
		t.Fatal("expected PDF octal \\361 for ñ in content stream")
	}
	if !bytes.Contains(data, []byte(`ni\361o`)) && !bytes.Contains(data, []byte(`n\361o`)) {
		idx := bytes.Index(data, []byte(`\361`))
		snip := []byte("(missing)")
		if idx >= 4 && idx+12 <= len(data) {
			snip = data[idx-4 : idx+12]
		}
		t.Fatalf("expected ni\\361o / n\\361o near accent, snip=%q", snip)
	}
	// Raw high byte must not sit in a Tj literal next to ASCII letters.
	if bytes.Contains(data, []byte{'n', 0xF1, 'o'}) {
		t.Fatal("raw WinAnsi 0xF1 still present in content stream")
	}
}

func TestToWinAnsiNTilde(t *testing.T) {
	got := toWinAnsi("niño")
	raw := []byte(got)
	if !bytes.Equal(raw, []byte{'n', 'i', 0xF1, 'o'}) {
		t.Fatalf("toWinAnsi(niño)=%v", raw)
	}
}

func TestEscapeWinAnsiOctal(t *testing.T) {
	in := string([]byte{'n', 'i', 0xF1, 'o'})
	got := escape(in)
	if got != `ni\361o` {
		t.Fatalf("escape=%q want ni\\361o", got)
	}
	if escape("a(b)c\\d") != `a\(b\)c\\d` {
		t.Fatalf("paren/backslash escape failed: %q", escape("a(b)c\\d"))
	}
}
