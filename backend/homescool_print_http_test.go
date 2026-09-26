package main

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/color"
	"image/jpeg"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPostHomescoolPrintPDFWithoutMaterialID(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	img := image.NewGray(image.Rect(0, 0, 32, 40))
	for y := 0; y < 40; y++ {
		for x := 0; x < 32; x++ {
			img.SetGray(x, y, color.Gray{Y: 200})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}
	page := "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
	payload := `{"pages":[` + `"` + page + `"` + `],"fileName":"clase-fe-backup"}`

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/homescool/print/pdf", payload)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/pdf" {
		t.Fatalf("Content-Type=%q", ct)
	}
	if !bytes.HasPrefix(rec.Body.Bytes(), []byte("%PDF")) {
		t.Fatalf("not pdf magic bytes")
	}
	cd := rec.Header().Get("Content-Disposition")
	if !strings.Contains(strings.ToLower(cd), "clase-fe-backup.pdf") {
		t.Fatalf("Content-Disposition=%q", cd)
	}
}

func TestPostHomescoolPrintPDFRequiresAuth(t *testing.T) {
	app := newTestApp(false)
	req := httptest.NewRequest(http.MethodPost, "/api/homescool/print/pdf", strings.NewReader(`{"pages":[]}`))
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code == http.StatusOK {
		t.Fatalf("expected auth failure, got %d", rec.Code)
	}
}
