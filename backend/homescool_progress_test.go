package main

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/jpeg"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

type scriptedChat struct {
	visionText  string
	longText    string
	visionCalls int
	longCalls   int
}

func (c *scriptedChat) Chat(ctx context.Context, prompt string) (ChatResult, error) {
	return c.Complete(ctx, "", []ChatMessage{{Role: "user", Content: prompt}})
}

func (c *scriptedChat) Complete(_ context.Context, _ string, _ []ChatMessage) (ChatResult, error) {
	c.longCalls++
	return ChatResult{Text: c.longText}, nil
}

func (c *scriptedChat) Stream(ctx context.Context, system string, history []ChatMessage, emit func(string) error) (ChatResult, error) {
	result, err := c.Complete(ctx, system, history)
	if err == nil && emit != nil {
		err = emit(result.Text)
	}
	return result, err
}

func (c *scriptedChat) CompleteVision(_ context.Context, _ string, _ string, _ string, _ []byte, _ int) (ChatResult, error) {
	c.visionCalls++
	return ChatResult{Text: c.visionText}, nil
}

func (c *scriptedChat) CompleteVisionParts(ctx context.Context, system, prompt string, images []visionImagePart, maxTokens int) (ChatResult, error) {
	if len(images) == 0 {
		return ChatResult{}, http.ErrMissingFile
	}
	return c.CompleteVision(ctx, system, prompt, images[0].MIME, images[0].Data, maxTokens)
}

func TestHomescoolProgressToWebp4K(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 3840, 2160))
	var input bytes.Buffer
	if err := jpeg.Encode(&input, img, &jpeg.Options{Quality: 80}); err != nil {
		t.Fatal(err)
	}
	out, err := homescoolProgressToWebp(input.Bytes(), "image/jpeg")
	if err != nil {
		t.Fatal(err)
	}
	kind, err := detectHomescoolProgressImage(out)
	if err != nil || kind.mime != "image/webp" {
		t.Fatalf("expected WebP: kind=%#v err=%v", kind, err)
	}
}

func TestParseHomescoolProgress(t *testing.T) {
	extraction, err := parseHomescoolProgressExtraction("```json\n{\"rawText\":\"hola\",\"mcq\":[{\"n\":1,\"selectedKey\":\"b\"}],\"write\":[{\"n\":1,\"text\":\"respuesta\"}]}\n```")
	if err != nil {
		t.Fatal(err)
	}
	if extraction.MCQ[0].SelectedKey != "B" || extraction.Write[0].Text != "respuesta" {
		t.Fatalf("unexpected extraction: %#v", extraction)
	}
	state, score, err := parseHomescoolProgressInterpretation(`{"score":11,"summary":"Bien","interpretedAnswers":[{"n":1,"type":"mcq","ok":true}]}`)
	if err != nil {
		t.Fatal(err)
	}
	if score.Value != 10 || len(state.InterpretedAnswers) != 1 {
		t.Fatalf("unexpected interpret state=%#v score=%#v", state, score)
	}
}

func TestPostHomescoolProgress(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)
	chat := &scriptedChat{
		visionText: `{"rawText":"3 x 4 = 12","mcq":[{"n":1,"selectedKey":"B","selectedText":"12"}],"write":[{"n":1,"text":"grupos iguales"}]}`,
		longText:   `{"score":8,"summary":"Buen trabajo.","strengths":["Reconoce la multiplicación."],"weaknesses":[],"teacherSuggestions":["Practicar tablas."],"rationale":"Respondió bien.","interpretedAnswers":[{"n":1,"type":"mcq","prompt":"¿Cuánto es 3 × 4?","studentSaid":"12","assessment":"Correcto.","ok":true}]}`,
	}
	app.chat["openrouter"] = chat
	docJSON, err := json.Marshal(sampleEoschoolRevisionDoc())
	if err != nil {
		t.Fatal(err)
	}
	img := image.NewRGBA(image.Rect(0, 0, 40, 30))
	var imageBody bytes.Buffer
	if err := jpeg.Encode(&imageBody, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("cycle", "3")
	_ = mw.WriteField("week", "1")
	_ = mw.WriteField("day", "1")
	_ = mw.WriteField("subject", "mat")
	_ = mw.WriteField("document", string(docJSON))
	fw, err := mw.CreateFormFile("file", "worksheet.jpg")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write(imageBody.Bytes()); err != nil {
		t.Fatal(err)
	}
	_ = mw.Close()
	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/homescool/progress/photos", &body)
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
		Progress HomescoolProgress `json:"progress"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.Progress.Score.Value != 8 || len(out.Progress.Photos) != 1 {
		t.Fatalf("unexpected progress: %#v", out.Progress)
	}
	if chat.visionCalls != 1 || chat.longCalls != 1 {
		t.Fatalf("calls vision=%d long=%d", chat.visionCalls, chat.longCalls)
	}
}

func TestPostHomescoolProgressForbidden(t *testing.T) {
	app := newTestApp(false)
	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/homescool/progress/photos", nil)
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	copyCookiesFromJar(req, seed.cookies)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status=%d want=%d body=%s", rec.Code, http.StatusForbidden, rec.Body.String())
	}
}
