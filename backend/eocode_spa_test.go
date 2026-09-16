package main

import (
	"strings"
	"testing"
)

func TestEocodeNormalizeSPACollapsesStackedBodies(t *testing.T) {
	html := `<!DOCTYPE html><html><head><title>x</title></head>` +
		`<body><h2>Inicio</h2><p>casa</p>` +
		`<body><h2>Sobre mi</h2><p>bio</p>` +
		`<script>var x=1;</script></body></html>`
	got := eocodeNormalizeSPA(html)
	if strings.Count(strings.ToLower(got), "<body") != 1 {
		t.Fatalf("expected a single body, got %s", got)
	}
	if !strings.Contains(got, `data-view="inicio"`) || !strings.Contains(got, `data-view="sobre-mi"`) {
		t.Fatalf("expected named views, got %s", got)
	}
	if !strings.Contains(got, eocodeSPACSS) {
		t.Fatal("expected injected view CSS")
	}
	if !strings.Contains(got, "data-eocode-spa-js") {
		t.Fatal("expected injected router")
	}
	if !strings.Contains(got, "var x=1;") {
		t.Fatal("expected original script kept")
	}
}

func TestEocodeNormalizeSPAIsIdempotent(t *testing.T) {
	html := `<!DOCTYPE html><html><head></head><body>` +
		`<section data-view="inicio" class="view active"><h2>Hola</h2></section>` +
		`<section data-view="otra" class="view"><h2>Otra</h2></section>` +
		`</body></html>`
	once := eocodeNormalizeSPA(html)
	twice := eocodeNormalizeSPA(once)
	if strings.Count(once, eocodeSPACSSMarker) != 1 || strings.Count(twice, eocodeSPACSSMarker) != 1 {
		t.Fatalf("css marker duplicated: once=%d twice=%d", strings.Count(once, eocodeSPACSSMarker), strings.Count(twice, eocodeSPACSSMarker))
	}
	if strings.Count(once, eocodeSPAJSMarker) != 1 || strings.Count(twice, eocodeSPAJSMarker) != 1 {
		t.Fatal("js marker duplicated")
	}
}

func TestEocodeSlug(t *testing.T) {
	if got := eocodeSlug("Sobre mi"); got != "sobre-mi" {
		t.Fatalf("slug=%q", got)
	}
}
