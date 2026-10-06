package main

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestEoschoolCurriculumStudentCRUD(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	body := `{"firstName":"Ana","lastName":"Perez","age":9,"grade":"3er grado"}`
	create := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/eoschool/curriculum/students", body)
	if create.Code != http.StatusCreated {
		t.Fatalf("create status=%d body=%s", create.Code, create.Body.String())
	}
	var created struct {
		Student EoschoolCurriculumStudent `json:"student"`
	}
	if err := json.Unmarshal(create.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Student.StudentKey == "" || created.Student.DisplayName != "Ana Perez" {
		t.Fatalf("student=%+v", created.Student)
	}

	list := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eoschool/curriculum/students", "")
	if list.Code != http.StatusOK {
		t.Fatalf("list status=%d", list.Code)
	}
	var listed struct {
		Students []EoschoolCurriculumStudent `json:"students"`
	}
	if err := json.Unmarshal(list.Body.Bytes(), &listed); err != nil {
		t.Fatal(err)
	}
	if len(listed.Students) < 1 {
		t.Fatal("expected students")
	}

	patch := app.doJSON(t, "member@eduardoos.com", http.MethodPatch,
		"/api/eoschool/curriculum/students/"+created.Student.StudentKey,
		`{"age":10}`)
	if patch.Code != http.StatusOK {
		t.Fatalf("patch status=%d body=%s", patch.Code, patch.Body.String())
	}

	del := app.doJSON(t, "member@eduardoos.com", http.MethodDelete,
		"/api/eoschool/curriculum/students/"+created.Student.StudentKey, "")
	if del.Code != http.StatusOK {
		t.Fatalf("delete status=%d body=%s", del.Code, del.Body.String())
	}
}

func TestEoschoolCurriculumStudentPhotoRejectsInvalid(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("firstName", "Luis")
	_ = mw.WriteField("lastName", "Gomez")
	_ = mw.WriteField("age", "8")
	_ = mw.WriteField("grade", "3er grado")
	part, err := mw.CreateFormFile("photo", "x.exe")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = part.Write([]byte{0x4d, 0x5a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00})
	_ = mw.Close()

	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/eoschool/curriculum/students", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	for _, c := range seed.cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code == http.StatusCreated {
		t.Fatalf("expected rejection, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestEoschoolCurriculumStudentPhotoUploadAndGet(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)
	png := encodePNG(t, 8, 8)

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("firstName", "Elías")
	_ = mw.WriteField("lastName", "Osteicoechea")
	_ = mw.WriteField("age", "8")
	_ = mw.WriteField("grade", "3er grado")
	part, err := mw.CreateFormFile("photo", "perfil.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(png); err != nil {
		t.Fatal(err)
	}
	_ = mw.Close()

	seed := httptestSession(t, app, "member@eduardoos.com")
	req := httptest.NewRequest(http.MethodPost, "/api/eoschool/curriculum/students", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	req.Header.Set("X-CSRF-Token", seed.csrf)
	for _, c := range seed.cookies {
		req.AddCookie(c)
	}
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status=%d body=%s", rec.Code, rec.Body.String())
	}
	var created struct {
		Student EoschoolCurriculumStudent `json:"student"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if !created.Student.HasPhoto || created.Student.PhotoURL == "" {
		t.Fatalf("expected photo on student: %+v", created.Student)
	}

	getReq := httptest.NewRequest(http.MethodGet, created.Student.PhotoURL, nil)
	for _, c := range seed.cookies {
		getReq.AddCookie(c)
	}
	getRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("photo get status=%d body=%s", getRec.Code, getRec.Body.String())
	}
	if getRec.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("content-type=%q", getRec.Header().Get("Content-Type"))
	}
	if !bytes.Equal(getRec.Body.Bytes(), png) {
		t.Fatal("photo bytes mismatch")
	}

	var patchBuf bytes.Buffer
	pmw := multipart.NewWriter(&patchBuf)
	part2, err := pmw.CreateFormFile("photo", "perfil2.png")
	if err != nil {
		t.Fatal(err)
	}
	png2 := encodePNG(t, 10, 10)
	if _, err := part2.Write(png2); err != nil {
		t.Fatal(err)
	}
	_ = pmw.Close()
	patchReq := httptest.NewRequest(http.MethodPatch, "/api/eoschool/curriculum/students/"+created.Student.StudentKey, &patchBuf)
	patchReq.Header.Set("Content-Type", pmw.FormDataContentType())
	patchReq.Header.Set("Origin", app.cfg.AllowedOrigins[0])
	patchReq.Header.Set("X-CSRF-Token", seed.csrf)
	for _, c := range seed.cookies {
		patchReq.AddCookie(c)
	}
	patchRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(patchRec, patchReq)
	if patchRec.Code != http.StatusOK {
		t.Fatalf("patch photo status=%d body=%s", patchRec.Code, patchRec.Body.String())
	}
}
