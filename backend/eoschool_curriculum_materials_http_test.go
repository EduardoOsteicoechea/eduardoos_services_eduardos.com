package main

import (
	"bytes"
	"encoding/json"
	"image"
	"image/jpeg"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestEoschoolCurriculumMaterialImageUploadWebpOnly(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	img := image.NewRGBA(image.Rect(0, 0, 64, 48))
	var imageBody bytes.Buffer
	if err := jpeg.Encode(&imageBody, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("studentKey", eoschoolCurriculumDefaultStudentKey)
	_ = mw.WriteField("dayId", "d1")
	_ = mw.WriteField("sectionId", "bib")
	_ = mw.WriteField("role", "teacher_guide")
	fw, err := mw.CreateFormFile("file", "guide.jpg")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write(imageBody.Bytes()); err != nil {
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
	if created.Material.Kind != eoschoolCurriculumMaterialKindImage {
		t.Fatalf("kind=%q", created.Material.Kind)
	}
	if created.Material.ContentType != "image/webp" {
		t.Fatalf("contentType=%q", created.Material.ContentType)
	}
	if !strings.HasSuffix(created.Material.StorageName, ".webp") {
		t.Fatalf("storageName=%q", created.Material.StorageName)
	}
	if created.Material.FileURL == "" || created.Material.ThumbURL == "" {
		t.Fatalf("missing urls: %+v", created.Material)
	}

	// Original JPEG must not be retained on disk — only webp + thumb.
	dir, err := app.curriculumMaterialsFS.dir(
		created.Material.OwnerUserID,
		created.Material.StudentKey,
		created.Material.DayID,
		created.Material.SectionID,
	)
	if err != nil {
		t.Fatal(err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		name := e.Name()
		if strings.HasSuffix(name, ".jpg") || strings.HasSuffix(name, ".jpeg") {
			t.Fatalf("original jpeg retained: %s", filepath.Join(dir, name))
		}
		if !strings.HasSuffix(name, ".webp") {
			t.Fatalf("unexpected file on disk: %s", name)
		}
	}

	list := app.doJSON(t, "member@eduardoos.com", http.MethodGet,
		"/api/eoschool/curriculum/materials?studentKey="+eoschoolCurriculumDefaultStudentKey+"&dayId=d1&sectionId=bib", "")
	if list.Code != http.StatusOK {
		t.Fatalf("list status=%d body=%s", list.Code, list.Body.String())
	}
	var listed struct {
		Materials []EoschoolCurriculumMaterial `json:"materials"`
	}
	if err := json.Unmarshal(list.Body.Bytes(), &listed); err != nil {
		t.Fatal(err)
	}
	if len(listed.Materials) != 1 {
		t.Fatalf("expected 1 material, got %d", len(listed.Materials))
	}

	del := app.doJSON(t, "member@eduardoos.com", http.MethodDelete,
		"/api/eoschool/curriculum/materials/"+created.Material.ID, "")
	if del.Code != http.StatusOK {
		t.Fatalf("delete status=%d body=%s", del.Code, del.Body.String())
	}
	if app.curriculumMaterialsFS.exists(
		created.Material.OwnerUserID,
		created.Material.StudentKey,
		created.Material.DayID,
		created.Material.SectionID,
		created.Material.StorageName,
	) {
		t.Fatal("webp still on disk after delete")
	}
}

func TestEoschoolCurriculumMaterialURLHTTPSOnly(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	bad := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eoschool/curriculum/materials/url",
		`{"studentKey":"elias-osteicoechea","dayId":"d2","sectionId":"mat","role":"child","url":"http://example.com/x"}`)
	if bad.Code != http.StatusBadRequest {
		t.Fatalf("http url status=%d want 400 body=%s", bad.Code, bad.Body.String())
	}

	ok := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eoschool/curriculum/materials/url",
		`{"studentKey":"elias-osteicoechea","dayId":"d2","sectionId":"mat","role":"child","url":"https://example.com/x","title":"Video"}`)
	if ok.Code != http.StatusCreated {
		t.Fatalf("https url status=%d body=%s", ok.Code, ok.Body.String())
	}
	var created struct {
		Material EoschoolCurriculumMaterial `json:"material"`
	}
	if err := json.Unmarshal(ok.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Material.Kind != eoschoolCurriculumMaterialKindURL || created.Material.URL != "https://example.com/x" {
		t.Fatalf("material=%+v", created.Material)
	}
}

func TestEoschoolCurriculumMaterialRejectsUnsupported(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("studentKey", eoschoolCurriculumDefaultStudentKey)
	_ = mw.WriteField("dayId", "d1")
	_ = mw.WriteField("sectionId", "cie")
	_ = mw.WriteField("role", "proof")
	fw, err := mw.CreateFormFile("file", "evil.exe")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = fw.Write([]byte{0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00})
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
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want 400 body=%s", rec.Code, rec.Body.String())
	}
}

func TestEoschoolCurriculumMaterialPDFUpload(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	pdf := []byte("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n")
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("studentKey", eoschoolCurriculumDefaultStudentKey)
	_ = mw.WriteField("dayId", "d3")
	_ = mw.WriteField("sectionId", "len")
	_ = mw.WriteField("role", "child")
	fw, err := mw.CreateFormFile("file", "worksheet.pdf")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write(pdf); err != nil {
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
		t.Fatalf("pdf status=%d body=%s", rec.Code, rec.Body.String())
	}
	var created struct {
		Material EoschoolCurriculumMaterial `json:"material"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Material.Kind != eoschoolCurriculumMaterialKindDocument || created.Material.ContentType != "application/pdf" {
		t.Fatalf("material=%+v", created.Material)
	}

	get := httptest.NewRequest(http.MethodGet, "/api/eoschool/curriculum/materials/"+created.Material.ID+"/file", nil)
	for _, c := range seed.cookies {
		get.AddCookie(c)
	}
	getRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(getRec, get)
	if getRec.Code != http.StatusOK {
		t.Fatalf("file status=%d body=%s", getRec.Code, getRec.Body.String())
	}
	if ct := getRec.Header().Get("Content-Type"); ct != "application/pdf" {
		t.Fatalf("content-type=%q", ct)
	}
}

func TestEoschoolCurriculumMaterialCrossOwnerDenied(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)
	_ = app.grantEntitlement("admin-1", productHomescool)

	ok := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eoschool/curriculum/materials/url",
		`{"dayId":"d1","sectionId":"ide","role":"proof","url":"https://example.com/proof"}`)
	if ok.Code != http.StatusCreated {
		t.Fatalf("create status=%d body=%s", ok.Code, ok.Body.String())
	}
	var created struct {
		Material EoschoolCurriculumMaterial `json:"material"`
	}
	if err := json.Unmarshal(ok.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	del := app.doJSON(t, "admin@eduardoos.com", http.MethodDelete,
		"/api/eoschool/curriculum/materials/"+created.Material.ID, "")
	if del.Code != http.StatusNotFound {
		t.Fatalf("cross-owner delete status=%d want 404 body=%s", del.Code, del.Body.String())
	}
}
