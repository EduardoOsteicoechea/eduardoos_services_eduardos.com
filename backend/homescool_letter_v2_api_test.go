package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func loadPublishedEoschool(t *testing.T, rel string) EoschoolDocument {
	t.Helper()
	path := filepath.Join("..", "frontend", "public", "homescool", "media", rel)
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	doc, err := parseEoschoolDocument(raw)
	if err != nil {
		t.Fatalf("parse %s: %v", rel, err)
	}
	if len(doc.Lesson.SlotSequence) != 156 {
		t.Fatalf("%s: want 156 slots got %d", rel, len(doc.Lesson.SlotSequence))
	}
	return doc
}

func TestEoschoolSlotSequenceRoundTripUpsert(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productAPI)
	_ = app.grantEntitlement("member-1", productHomescool)

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"slot-v2"}`)
	if keyRec.Code != http.StatusCreated {
		t.Fatalf("apikey: %d %s", keyRec.Code, keyRec.Body.String())
	}
	secret := decodeMap(t, keyRec)["key"].(string)

	path := filepath.Join("..", "frontend", "public", "homescool", "media", "week1", "esp-c3-w1-d2-l6.eoschool.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatal(err)
	}
	body, _ := json.Marshal(map[string]any{
		"confirmOverwrite": true,
		"material":         doc,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/homescool/materials", strings.NewReader(string(body)))
	req.Header.Set("Authorization", "Bearer "+secret)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	app.Handler().ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("upsert %d %s", w.Code, w.Body.String())
	}
	mid := decodeMap(t, w)["material"].(map[string]any)["id"].(string)

	gw := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/homescool/materials/"+mid+"/document", "")
	if gw.Code != http.StatusOK {
		t.Fatalf("get document %d %s", gw.Code, gw.Body.String())
	}
	got, err := parseEoschoolDocument(gw.Body.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Lesson.SlotSequence) != 156 {
		t.Fatalf("stored slots=%d", len(got.Lesson.SlotSequence))
	}
	var hasSchematic, hasSlot bool
	for _, q := range got.Quiz.Questions {
		if q.Schematic {
			hasSchematic = true
		}
		if q.Slot != nil && q.Slot.Index > 0 {
			hasSlot = true
		}
	}
	if !hasSlot {
		t.Fatal("expected quiz.slot preserved")
	}
	if !hasSchematic {
		t.Fatal("expected schematic flag preserved")
	}
}

func TestBuildEoschoolLetterV2PDFFromPublishedClass(t *testing.T) {
	doc := loadPublishedEoschool(t, "week1/esp-c3-w1-d2-l6.eoschool.json")
	raw, err := buildEoschoolPDF(doc)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(raw), "%PDF") {
		t.Fatal("missing PDF header")
	}
	s := string(raw)
	if strings.Count(s, "/Type /Page") < 1 {
		t.Fatal("expected at least one page object")
	}
	// One Letter sheet: catalog + pages + fonts + one page (+ optional image).
	if strings.Count(s, "/Type /Page\n") > 2 && strings.Count(s, "/Type /Pages") > 1 {
		t.Fatalf("unexpected multi-page tree")
	}
	for _, needle := range []string{"Punto 1", "Fecha:"} {
		if !strings.Contains(s, needle) {
			t.Fatalf("pdf missing %q", needle)
		}
	}
	// ñ is emitted as WinAnsi octal \361 in content streams.
	if !strings.Contains(s, `\361`) && !strings.Contains(s, "\\361") {
		t.Fatal("pdf missing WinAnsi ñ (\\361)")
	}
}

func TestIsMatTablesLayoutSkipsLetterV2(t *testing.T) {
	doc := loadPublishedEoschool(t, "week1/mat-c3-w1-d1-l6.eoschool.json")
	if isMatTablesLayout(doc) {
		t.Fatal("mat with slotSequence must use Letter v2, not mat-tables")
	}
}
