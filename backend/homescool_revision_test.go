package main

import (
	"bytes"
	"encoding/json"
	"image"
	"image/jpeg"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

func sampleEoschoolRevisionDoc() EoschoolDocument {
	doc := EoschoolDocument{
		Format:  eoschoolFormatName,
		Version: eoschoolVersion,
		Cycle:   3,
		Week:    1,
		Day:     1,
		Level:   eoschoolLevelV1,
		Subject: "mat",
		Locale:  "es",
		Title:   "Multiplicar con las tablas",
		Lesson: EoschoolLesson{
			Kind: eoschoolKindIntro,
			Points: []EoschoolPoint{
				{ID: "p1", Heading: "Tablas 1–4", Body: "Idea.\n\nExplora.\n\nPráctica: Ahora te toca a ti. Hazlo.\n\nError común: no sumes."},
				{ID: "p2", Heading: "Tablas 5–8", Body: "Idea.\n\nExplora.\n\nPráctica: Ahora te toca a ti. Hazlo.\n\nError común: no adivines."},
				{ID: "p3", Heading: "Tablas 9–12", Body: "Idea.\n\nExplora.\n\nPráctica: Ahora te toca a ti. Hazlo.\n\nError común: 11×11 no es 111."},
			},
			Summary: "Tablas 1 al 12.",
		},
		SupportURL: "https://www.youtube.com/watch?v=example",
	}
	doc.Quiz.QuestionCount = 12
	doc.Quiz.Questions = make([]EoschoolQuestion, 12)
	for i := 0; i < 8; i++ {
		doc.Quiz.Questions[i] = EoschoolQuestion{
			ID:        "d1-q" + strconv.Itoa(i+1),
			OriginDay: 1,
			Type:      "mcq",
			Prompt:    "¿Cuánto es 3 × 4?",
			Choices:   []string{"5", "12", "7", "8"},
			Answer:    "12",
		}
	}
	for i := 0; i < 4; i++ {
		doc.Quiz.Questions[8+i] = EoschoolQuestion{
			ID:        "d1-w" + strconv.Itoa(i+1),
			OriginDay: 1,
			Type:      "write",
			Prompt:    "Escribe tu idea " + strconv.Itoa(i+1),
		}
	}
	return doc
}

func TestHomescoolRevisionToWebp(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 32, 24))
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}
	out, err := homescoolRevisionToWebp(buf.Bytes(), "image/jpeg")
	if err != nil {
		t.Fatal(err)
	}
	if len(out) < 12 || string(out[0:4]) != "RIFF" {
		t.Fatalf("expected webp, got %d bytes", len(out))
	}
	kind, err := detectHomescoolRevisionImage(out)
	if err != nil || kind.mime != "image/webp" {
		t.Fatalf("detect webp: kind=%v err=%v", kind, err)
	}
}

func TestParseAndScoreHomescoolRevision(t *testing.T) {
	doc := sampleEoschoolRevisionDoc()
	if err := validateEoschoolDocument(&doc); err != nil {
		t.Fatalf("sample doc invalid: %v", err)
	}
	raw := `{
	  "mcq":[{"n":1,"selectedKey":"B","selectedText":"12","illegible":false}],
	  "write":[{"n":1,"text":"grupos iguales","illegible":false}]
	}`
	ext, err := parseHomescoolRevisionExtraction(raw)
	if err != nil {
		t.Fatal(err)
	}
	if len(ext.MCQ) != 8 || len(ext.Write) != 4 {
		t.Fatalf("sizes mcq=%d write=%d", len(ext.MCQ), len(ext.Write))
	}
	scoring := scoreHomescoolRevision(doc, ext)
	if !scoring.MCQ[0].Correct {
		t.Fatal("expected first mcq correct")
	}
	if scoring.Write[0].Text != "grupos iguales" {
		t.Fatalf("write text=%q", scoring.Write[0].Text)
	}
}

func TestPostHomescoolRevisionOCR(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)
	app.chat["deepseek"] = &recordingChat{
		provider: "deepseek",
		text: `{
		  "mcq":[{"n":1,"selectedKey":"B","selectedText":"12","illegible":false}],
		  "write":[{"n":1,"text":"hola","illegible":false}]
		}`,
	}

	doc := sampleEoschoolRevisionDoc()
	docJSON, err := json.Marshal(doc)
	if err != nil {
		t.Fatal(err)
	}

	img := image.NewRGBA(image.Rect(0, 0, 40, 30))
	var imgBuf bytes.Buffer
	if err := jpeg.Encode(&imgBuf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("cycle", "3")
	_ = mw.WriteField("week", "1")
	_ = mw.WriteField("day", "1")
	_ = mw.WriteField("subject", "mat")
	_ = mw.WriteField("document", string(docJSON))
	fw, err := mw.CreateFormFile("file", "quiz.jpg")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write(imgBuf.Bytes()); err != nil {
		t.Fatal(err)
	}
	_ = mw.Close()

	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/homescool/revision/ocr", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	copyCookiesFromJar(req, seed.cookies)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var out struct {
		Scoring struct {
			MCQCorrect int `json:"mcqCorrect"`
		} `json:"scoring"`
		Class struct {
			Key string `json:"key"`
		} `json:"class"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Class.Key != "c3-w1-d1-l6-mat" {
		t.Fatalf("key=%q", out.Class.Key)
	}
	if out.Scoring.MCQCorrect < 1 {
		t.Fatalf("mcqCorrect=%d", out.Scoring.MCQCorrect)
	}
	rc := app.chat["deepseek"].(*recordingChat)
	if !rc.lastVision {
		t.Fatal("expected vision call")
	}
}

func TestPostHomescoolRevisionOCRForbiddenWithoutEntitlement(t *testing.T) {
	app := newTestApp(false)
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("cycle", "3")
	_ = mw.Close()
	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/homescool/revision/ocr", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	copyCookiesFromJar(req, seed.cookies)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status=%d want 403 body=%s", rec.Code, rec.Body.String())
	}
}

func TestParseHomescoolRevisionExtractionFence(t *testing.T) {
	raw := "```json\n{\"mcq\":[],\"write\":[]}\n```"
	ext, err := parseHomescoolRevisionExtraction(raw)
	if err != nil {
		t.Fatal(err)
	}
	if len(ext.MCQ) != 8 || !strings.EqualFold(ext.MCQ[0].SelectedKey, "?") {
		t.Fatalf("unexpected %#v", ext.MCQ[0])
	}
}
