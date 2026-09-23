package main

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestPostHomescoolPreviewHandler(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	doc := sampleEoschoolDay1()
	body, err := json.Marshal(doc)
	if err != nil {
		t.Fatal(err)
	}

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/homescool/preview", string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var out struct {
		PDFBase64    string  `json:"pdf_base64"`
		PageWidthMm  float64 `json:"page_width_mm"`
		PageHeightMm float64 `json:"page_height_mm"`
		Title        string  `json:"title"`
		Subject      string  `json:"subject"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.PDFBase64 == "" {
		t.Fatal("missing pdf_base64")
	}
	raw, err := base64.StdEncoding.DecodeString(out.PDFBase64)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(raw), "%PDF") {
		t.Fatal("decoded payload is not a PDF")
	}
	if out.PageWidthMm <= 0 || out.PageHeightMm <= 0 {
		t.Fatalf("bad page size %.2f×%.2f", out.PageWidthMm, out.PageHeightMm)
	}
	if out.Subject != doc.Subject {
		t.Fatalf("subject=%q", out.Subject)
	}
}

func TestPostHomescoolPreviewRejectsInvalidJSON(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/homescool/preview", `{"format":"nope"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want 400 body=%s", rec.Code, rec.Body.String())
	}
}
