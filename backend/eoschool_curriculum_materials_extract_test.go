package main

import (
	"archive/zip"
	"bytes"
	"encoding/binary"
	"encoding/json"
	"image"
	"image/jpeg"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestExtractPlainTextAndStructureJSON(t *testing.T) {
	raw, err := extractEoschoolCurriculumDocumentText([]byte("Hola niño\nSegunda línea"), "text/plain", "note.txt")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(raw, "Hola") {
		t.Fatalf("raw=%q", raw)
	}
	parsed, err := parseEoschoolMaterialExtractionJSON(`{"rawText":"a","cleanText":"b","blocks":[{"kind":"paragraph","text":"b"}]}`)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.CleanText != "b" || len(parsed.Blocks) != 1 {
		t.Fatalf("%+v", parsed)
	}
}

func TestExtractDOCXText(t *testing.T) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	w, err := zw.Create("word/document.xml")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = w.Write([]byte(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Texto DOCX de prueba</w:t></w:r></w:p></w:body></w:document>`))
	_ = zw.Close()
	text, err := extractEoschoolCurriculumDocumentText(buf.Bytes(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "a.docx")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(text, "Texto DOCX") {
		t.Fatalf("text=%q", text)
	}
}

func TestDetectTxtUpload(t *testing.T) {
	kind, err := detectEoschoolCurriculumUpload([]byte("hola mundo"), "notes.txt")
	if err != nil {
		t.Fatal(err)
	}
	if kind.kind != eoschoolCurriculumMaterialKindDocument || kind.ext != ".txt" {
		t.Fatalf("%+v", kind)
	}
}

func TestExtractWAVPCM16k(t *testing.T) {
	pcm := make([]byte, 3200)
	for i := 0; i < len(pcm); i += 2 {
		binary.LittleEndian.PutUint16(pcm[i:i+2], 100)
	}
	wav := buildPCM16WAV(pcm, voiceSampleRate, 1)
	out, err := decodeWAVToPCM16kMono(wav)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != len(pcm) {
		t.Fatalf("len=%d want %d", len(out), len(pcm))
	}
}

func buildPCM16WAV(pcm []byte, sampleRate int, channels int) []byte {
	var b bytes.Buffer
	dataSize := len(pcm)
	_ = binary.Write(&b, binary.LittleEndian, []byte("RIFF"))
	_ = binary.Write(&b, binary.LittleEndian, uint32(36+dataSize))
	_ = binary.Write(&b, binary.LittleEndian, []byte("WAVE"))
	_ = binary.Write(&b, binary.LittleEndian, []byte("fmt "))
	_ = binary.Write(&b, binary.LittleEndian, uint32(16))
	_ = binary.Write(&b, binary.LittleEndian, uint16(1))
	_ = binary.Write(&b, binary.LittleEndian, uint16(channels))
	_ = binary.Write(&b, binary.LittleEndian, uint32(sampleRate))
	byteRate := sampleRate * channels * 2
	_ = binary.Write(&b, binary.LittleEndian, uint32(byteRate))
	_ = binary.Write(&b, binary.LittleEndian, uint16(channels*2))
	_ = binary.Write(&b, binary.LittleEndian, uint16(16))
	_ = binary.Write(&b, binary.LittleEndian, []byte("data"))
	_ = binary.Write(&b, binary.LittleEndian, uint32(dataSize))
	_, _ = b.Write(pcm)
	return b.Bytes()
}

func TestEoschoolCurriculumMaterialExtractImage(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)
	app.chat["deepseek"] = &recordingChat{
		provider: "deepseek",
		text:     `{"rawText":"respuesta manuscrita","cleanText":"Respuesta manuscrita","blocks":[{"kind":"handwriting","text":"Respuesta manuscrita","illegible":false}]}`,
		usage:    ChatUsage{PromptTokens: 1, CompletionTokens: 1},
	}

	img := image.NewRGBA(image.Rect(0, 0, 32, 24))
	var imageBody bytes.Buffer
	if err := jpeg.Encode(&imageBody, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}
	created := uploadCurriculumMaterialTest(t, app, "proof.jpg", imageBody.Bytes(), "proof")
	if created.Kind != eoschoolCurriculumMaterialKindImage {
		t.Fatalf("kind=%q", created.Kind)
	}

	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/eoschool/curriculum/materials/"+created.ID+"/extract", nil)
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	for _, c := range seed.cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var out struct {
		Material EoschoolCurriculumMaterial `json:"material"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Material.Extraction == nil || out.Material.Extraction.Status != eoschoolMaterialExtractionStatusReady {
		t.Fatalf("extraction=%+v", out.Material.Extraction)
	}
	if out.Material.Extraction.SourceKind != eoschoolMaterialExtractionSourceImage {
		t.Fatalf("source=%q", out.Material.Extraction.SourceKind)
	}
	if !strings.Contains(out.Material.Extraction.CleanText, "manuscrita") {
		t.Fatalf("clean=%q", out.Material.Extraction.CleanText)
	}
	if out.Material.Extraction.Provider != "deepseek" {
		t.Fatalf("provider=%q", out.Material.Extraction.Provider)
	}
}

func TestEoschoolCurriculumMaterialExtractDocumentTxt(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)
	app.chat["deepseek"] = &recordingChat{
		provider: "deepseek",
		text:     `{"rawText":"hola","cleanText":"Hola","blocks":[{"kind":"paragraph","text":"Hola"}]}`,
		usage:    ChatUsage{PromptTokens: 1, CompletionTokens: 1},
	}
	created := uploadCurriculumMaterialTest(t, app, "notes.txt", []byte("hola niño"), "child")
	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/eoschool/curriculum/materials/"+created.ID+"/extract", nil)
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	for _, c := range seed.cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var out struct {
		Material EoschoolCurriculumMaterial `json:"material"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Material.Extraction == nil || out.Material.Extraction.Status != eoschoolMaterialExtractionStatusReady {
		t.Fatalf("%+v", out.Material.Extraction)
	}
	if out.Material.Extraction.SourceKind != eoschoolMaterialExtractionSourceDocument {
		t.Fatalf("source=%q", out.Material.Extraction.SourceKind)
	}
}

func TestEoschoolCurriculumMaterialExtractAudio(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)
	app.voiceSTT = fakeSTTEngine{final: "el niño leyó el cuento"}
	app.chat["deepseek"] = &recordingChat{
		provider: "deepseek",
		text:     `{"rawText":"el niño leyó el cuento","cleanText":"El niño leyó el cuento.","blocks":[{"kind":"paragraph","text":"El niño leyó el cuento."}]}`,
		usage:    ChatUsage{PromptTokens: 1, CompletionTokens: 1},
	}
	pcm := make([]byte, 6400)
	wav := buildPCM16WAV(pcm, voiceSampleRate, 1)
	created := uploadCurriculumMaterialTest(t, app, "voice.wav", wav, "proof")
	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/eoschool/curriculum/materials/"+created.ID+"/extract", nil)
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	for _, c := range seed.cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var out struct {
		Material EoschoolCurriculumMaterial `json:"material"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Material.Extraction == nil || out.Material.Extraction.Status != eoschoolMaterialExtractionStatusReady {
		t.Fatalf("%+v", out.Material.Extraction)
	}
	if out.Material.Extraction.SourceKind != eoschoolMaterialExtractionSourceAudio {
		t.Fatalf("source=%q", out.Material.Extraction.SourceKind)
	}
	if !strings.Contains(strings.ToLower(out.Material.Extraction.CleanText), "cuento") {
		t.Fatalf("clean=%q", out.Material.Extraction.CleanText)
	}
}

func TestEoschoolCurriculumMaterialExtractURLRejected(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)
	created := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eoschool/curriculum/materials/url",
		`{"studentKey":"`+eoschoolCurriculumDefaultStudentKey+`","dayId":"d1","sectionId":"bib","role":"teacher_guide","url":"https://example.com/x"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create url=%d", created.Code)
	}
	var body struct {
		Material EoschoolCurriculumMaterial `json:"material"`
	}
	if err := json.Unmarshal(created.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/eoschool/curriculum/materials/"+body.Material.ID+"/extract", nil)
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	for _, c := range seed.cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestEoschoolCurriculumMaterialExtractCrossOwnerDenied(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)
	_ = app.grantEntitlement("admin-1", productHomescool)
	app.chat["deepseek"] = &recordingChat{
		provider: "deepseek",
		text:     `{"rawText":"x","cleanText":"x","blocks":[]}`,
		usage:    ChatUsage{PromptTokens: 1, CompletionTokens: 1},
	}
	created := uploadCurriculumMaterialTest(t, app, "notes.txt", []byte("privado"), "proof")
	seed := httptestSession(t, app, "admin@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/eoschool/curriculum/materials/"+created.ID+"/extract", nil)
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	for _, c := range seed.cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func uploadCurriculumMaterialTest(t *testing.T, app *App, filename string, fileBody []byte, role string) EoschoolCurriculumMaterial {
	t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("studentKey", eoschoolCurriculumDefaultStudentKey)
	_ = mw.WriteField("dayId", "d1")
	_ = mw.WriteField("sectionId", "bib")
	_ = mw.WriteField("role", role)
	fw, err := mw.CreateFormFile("file", filename)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write(fileBody); err != nil {
		t.Fatal(err)
	}
	_ = mw.Close()
	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/eoschool/curriculum/materials", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	for _, c := range seed.cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("upload status=%d body=%s", rec.Code, rec.Body.String())
	}
	var created struct {
		Material EoschoolCurriculumMaterial `json:"material"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	return created.Material
}
