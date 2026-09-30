package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/jpeg"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestScribLibraryBookSheetRoundTrip(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productScrib)

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/library", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("library status=%d body=%s", rec.Code, rec.Body.String())
	}
	lib := decodeMap(t, rec)
	if lib["userSafe"] != "member_at_eduardoos.com" {
		t.Fatalf("userSafe=%v", lib["userSafe"])
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/books", `{"name":"Mateo"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create book status=%d body=%s", rec.Code, rec.Body.String())
	}
	var book scribBook
	if err := json.Unmarshal(rec.Body.Bytes(), &book); err != nil {
		t.Fatal(err)
	}
	if book.ID == "" || book.Name != "Mateo" {
		t.Fatalf("unexpected book %#v", book)
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/books/"+book.ID+"/sheets", `{"name":"Hoja 1"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create sheet status=%d body=%s", rec.Code, rec.Body.String())
	}
	var sheet scribSheet
	if err := json.Unmarshal(rec.Body.Bytes(), &sheet); err != nil {
		t.Fatal(err)
	}
	if sheet.ID == "" || len(sheet.Layers) != 7 || sheet.ActiveLayerID != "chapter" {
		t.Fatalf("unexpected sheet %#v", sheet)
	}
	if sheet.Layers[0].ID != scribBackgroundLayerID {
		t.Fatalf("first layer want background got %s", sheet.Layers[0].ID)
	}

	sheet.Layers[1].Paths = append(sheet.Layers[1].Paths, scribStrokePath{D: "M 10 10 L 20 20", StrokeWidth: 0.4})
	body, _ := json.Marshal(sheet)
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/scrib/books/"+book.ID+"/sheets/"+sheet.ID, string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("put sheet status=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/books/"+book.ID+"/sheets/"+sheet.ID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get sheet status=%d", rec.Code)
	}
	var loaded scribSheet
	if err := json.Unmarshal(rec.Body.Bytes(), &loaded); err != nil {
		t.Fatal(err)
	}
	if len(loaded.Layers[1].Paths) != 1 {
		t.Fatalf("expected 1 path on chapter, got %#v", loaded.Layers)
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/scrib/books/"+book.ID, `{"name":"Marcos"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("rename book status=%d body=%s", rec.Code, rec.Body.String())
	}

	loaded.Name = "Hoja A"
	body, _ = json.Marshal(loaded)
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/scrib/books/"+book.ID+"/sheets/"+sheet.ID, string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("rename sheet status=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/library", "")
	lib = decodeMap(t, rec)
	books, _ := lib["books"].([]any)
	if len(books) != 1 {
		t.Fatalf("books=%#v", books)
	}
	row, _ := books[0].(map[string]any)
	if row["name"] != "Marcos" {
		t.Fatalf("library book name=%v", row["name"])
	}
	sheets, _ := row["sheets"].([]any)
	if len(sheets) != 1 {
		t.Fatalf("sheets=%#v", sheets)
	}
	sc, _ := sheets[0].(map[string]any)
	if sc["name"] != "Hoja A" {
		t.Fatalf("library sheet name=%v", sc["name"])
	}

	app2 := newTestApp(false)
	blocked := app2.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/library", "")
	if blocked.Code != http.StatusForbidden {
		t.Fatalf("no entitlement: %d %s", blocked.Code, blocked.Body.String())
	}

	admin := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/scrib/library", "")
	if admin.Code != http.StatusOK {
		t.Fatalf("admin bypass: %d %s", admin.Code, admin.Body.String())
	}
}

func TestScribNoteBlocksRoundTrip(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productScrib)

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/books", `{"name":"Notas"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create book status=%d body=%s", rec.Code, rec.Body.String())
	}
	var book scribBook
	if err := json.Unmarshal(rec.Body.Bytes(), &book); err != nil {
		t.Fatal(err)
	}
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/books/"+book.ID+"/sheets", `{"name":"Hoja notas"}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create sheet status=%d body=%s", rec.Code, rec.Body.String())
	}
	var sheet scribSheet
	if err := json.Unmarshal(rec.Body.Bytes(), &sheet); err != nil {
		t.Fatal(err)
	}
	sheet.NoteBlocks = []scribNoteBlock{{
		ID:      "block-1",
		Name:    "Romans 1",
		Visible: true,
		Color:   "#ff8800",
		Rects:   []scribRectMm{{X: 10, Y: 20, W: 30, H: 40}},
		Areas: []scribNoteArea{{
			ID:      "area-1",
			Name:    "v1-7",
			Visible: true,
			Color:   "#2266aa",
			Rects:   []scribRectMm{{X: 12, Y: 22, W: 20, H: 10}},
			Annotations: []scribNoteAnnotation{{
				ID:   "ann-1",
				Name: "Grace",
				Heading: scribInk{Paths: []scribStrokePath{
					{D: "M 0 0 L 1 1", StrokeWidth: 0.35},
				}},
				Body: scribInk{Paths: []scribStrokePath{}},
				View: scribNoteView{Open: true, X: 40, Y: 60, W: 280, H: 200},
			}},
		}},
	}}
	body, _ := json.Marshal(sheet)
	rec = app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/scrib/books/"+book.ID+"/sheets/"+sheet.ID, string(body))
	if rec.Code != http.StatusOK {
		t.Fatalf("put sheet status=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/scrib/books/"+book.ID+"/sheets/"+sheet.ID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get sheet status=%d body=%s", rec.Code, rec.Body.String())
	}
	var loaded scribSheet
	if err := json.Unmarshal(rec.Body.Bytes(), &loaded); err != nil {
		t.Fatal(err)
	}
	if len(loaded.NoteBlocks) != 1 {
		t.Fatalf("noteBlocks=%#v", loaded.NoteBlocks)
	}
	block := loaded.NoteBlocks[0]
	if block.ID != "block-1" || block.Color != "#ff8800" || len(block.Rects) != 1 {
		t.Fatalf("block=%#v", block)
	}
	if len(block.Areas) != 1 || len(block.Areas[0].Annotations) != 1 {
		t.Fatalf("areas=%#v", block.Areas)
	}
	ann := block.Areas[0].Annotations[0]
	if len(ann.Heading.Paths) != 1 || !ann.View.Open || ann.View.W != 280 {
		t.Fatalf("annotation=%#v", ann)
	}
	if len(loaded.Layers) != 7 {
		t.Fatalf("layers len=%d", len(loaded.Layers))
	}
}

func TestScribPrintPDFMagicBytes(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productScrib)

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
	payload := `{"imageBase64":"data:image/jpeg;base64,` + base64.StdEncoding.EncodeToString(buf.Bytes()) + `","fileName":"test-sheet"}`

	rec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/scrib/print/pdf", payload)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/pdf" {
		t.Fatalf("Content-Type=%q", ct)
	}
	if !bytes.HasPrefix(rec.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Fatalf("not pdf magic bytes")
	}
}

func TestScribPrintPDFRequiresAuth(t *testing.T) {
	app := newTestApp(false)
	req := httptest.NewRequest(http.MethodPost, "/api/scrib/print/pdf", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code == http.StatusOK {
		t.Fatalf("expected auth failure, got %d", rec.Code)
	}
}

func TestLatinInstitutesRequiresAuth(t *testing.T) {
	app := newTestApp(false)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/latin/calvins-institutes", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("guest index want 401 got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestLatinInstitutesPack(t *testing.T) {
	root, err := filepath.Abs(filepath.Join(".data", "calvin-institutes-paragraphs"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(root, "index.json")); err != nil {
		t.Skip("calvin pack not present")
	}
	app := newTestApp(false)
	app.cfg.MustLog = true
	app.cfg.CalvinParagraphsRoot = root

	seed := httptest.NewRecorder()
	if _, err := app.issueSession(seed, app.mustUser("member@eduardoos.com")); err != nil {
		t.Fatal(err)
	}
	authedGET := func(path string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		copyCookies(req, seed)
		rec := httptest.NewRecorder()
		app.Handler().ServeHTTP(rec, req)
		return rec
	}

	rec := authedGET("/api/latin/calvins-institutes")
	if rec.Code != http.StatusOK {
		t.Fatalf("index status=%d body=%s", rec.Code, rec.Body.String())
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte(`"chapterCount"`)) {
		t.Fatalf("unexpected index body")
	}

	rec = authedGET("/api/latin/calvins-institutes/paragraphs")
	if rec.Code != http.StatusOK {
		t.Fatalf("paragraphs status=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = authedGET("/api/latin/calvins-institutes/paragraphs/chapters/I/I")
	if rec.Code != http.StatusOK {
		t.Fatalf("chapter status=%d body=%s", rec.Code, rec.Body.String())
	}

	rec = authedGET("/api/latin/calvins-institutes/paragraphs/chapters/X/I")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid book want 400 got %d", rec.Code)
	}

	rec = authedGET("/api/latin/calvins-institutes/paragraphs/chapters/I/ZZZ")
	if rec.Code != http.StatusBadRequest && rec.Code != http.StatusNotFound {
		t.Fatalf("unknown chapter want 400/404 got %d", rec.Code)
	}
}

func TestEmptyScribLayers(t *testing.T) {
	layers := scribEmptyLayers()
	if len(layers) != 7 {
		t.Fatalf("len=%d", len(layers))
	}
	if layers[0].ID != scribBackgroundLayerID {
		t.Fatalf("first layer want background got %s", layers[0].ID)
	}
	if !scribIsLayerID("translation2") || scribIsLayerID("other") {
		t.Fatal("layer id validation")
	}
	if scribIsDrawableLayerID(scribBackgroundLayerID) || !scribIsDrawableLayerID("chapter") {
		t.Fatal("drawable layer validation")
	}
}

func TestScribNormalizeBackgroundPattern(t *testing.T) {
	if got := scribNormalizeBackgroundPattern(""); got != scribBackgroundPatternDefault {
		t.Fatalf("empty want %s got %s", scribBackgroundPatternDefault, got)
	}
	if got := scribNormalizeBackgroundPattern("nope"); got != scribBackgroundPatternDefault {
		t.Fatalf("unknown want %s got %s", scribBackgroundPatternDefault, got)
	}
	if got := scribNormalizeBackgroundPattern(scribBackgroundPatternDoubleGap); got != scribBackgroundPatternDoubleGap {
		t.Fatalf("double-gap want %s got %s", scribBackgroundPatternDoubleGap, got)
	}
	sheet := scribNewEmptySheet("b", "s", "Hoja", "2020-01-01T00:00:00Z")
	if sheet.BackgroundPattern != scribBackgroundPatternDefault {
		t.Fatalf("new sheet pattern=%s", sheet.BackgroundPattern)
	}
}
