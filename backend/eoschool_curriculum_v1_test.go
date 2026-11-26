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
	"time"
)

func TestHomescoolV1StudentDataIsOwnerScoped(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productAPI)

	hash, err := hashPassword("correct-horse-battery")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	_ = app.store.InsertUser(context.Background(), &User{
		ID: "other-1", Email: "other@eduardoos.com", EmailNormalized: "other@eduardoos.com",
		Username: "other", UsernameNormalized: "other", PasswordHash: hash,
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	})
	_ = app.grantEntitlement("other-1", productAPI)
	_ = app.grantEntitlement("other-1", productHomescool)

	keyRec := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"eschool-data"}`)
	if keyRec.Code != http.StatusCreated {
		t.Fatalf("apikey: %d %s", keyRec.Code, keyRec.Body.String())
	}
	secret := decodeMap(t, keyRec)["key"].(string)

	denied := app.v1Authed(http.MethodGet, "/api/v1/homescool/students", secret, nil, "")
	if denied.Code != http.StatusForbidden {
		t.Fatalf("eschool missing: %d %s", denied.Code, denied.Body.String())
	}
	_ = app.grantEntitlement("member-1", productHomescool)

	docs := httptest.NewRequest(http.MethodGet, "/api/v1/docs", nil)
	dw := httptest.NewRecorder()
	app.Handler().ServeHTTP(dw, docs)
	if !bytes.Contains(dw.Body.Bytes(), []byte("/api/v1/homescool/activities/record")) {
		t.Fatal("docs missing student data routes")
	}

	score := 70
	body, _ := json.Marshal(map[string]any{
		"studentKey": eoschoolCurriculumDefaultStudentKey,
		"dayId":      "d38",
		"sectionId":  "mat",
		"score":      score,
		"record": map[string]any{
			"summary": "Falló 7 × 8.",
			"rewrite": "Escribió 54.",
			"kind":    "multiplication",
			"items": []map[string]any{{
				"kind": "mult", "page": 1, "row": 0, "col": 0,
				"a": 7, "b": 8, "given": 54, "expected": 56, "correct": false,
			}},
		},
	})
	put := app.v1Authed(http.MethodPut, "/api/v1/homescool/activities/record", secret, body, "application/json")
	if put.Code != http.StatusOK {
		t.Fatalf("record: %d %s", put.Code, put.Body.String())
	}
	got := decodeMap(t, put)
	records := got["activityRecords"].(map[string]any)
	row := records["d38:mat"].(map[string]any)
	if row["summary"] != "Falló 7 × 8." {
		t.Fatalf("summary %#v", row["summary"])
	}
	if got["activityScores"].(map[string]any)["d38:mat"] != float64(70) {
		t.Fatalf("score %#v", got["activityScores"])
	}
	facts := got["activityFacts"].([]any)
	if len(facts) != 1 || facts[0].(map[string]any)["label"] != "7 × 8" {
		t.Fatalf("facts %#v", facts)
	}

	listed := app.v1Authed(http.MethodGet, "/api/v1/homescool/students", secret, nil, "")
	if listed.Code != http.StatusOK || !bytes.Contains(listed.Body.Bytes(), []byte(eoschoolCurriculumDefaultStudentKey)) {
		t.Fatalf("students: %d %s", listed.Code, listed.Body.String())
	}

	section, _ := json.Marshal(map[string]any{
		"studentKey": eoschoolCurriculumDefaultStudentKey,
		"dayId":      "d38",
		"sectionId":  "mat",
		"completed":  true,
	})
	patched := app.v1Authed(http.MethodPatch, "/api/v1/homescool/progress/sections", secret, section, "application/json")
	if patched.Code != http.StatusOK || !bytes.Contains(patched.Body.Bytes(), []byte(`"d38:mat"`)) {
		t.Fatalf("section: %d %s", patched.Code, patched.Body.String())
	}

	img := image.NewRGBA(image.Rect(0, 0, 32, 24))
	var jpegBody bytes.Buffer
	if err = jpeg.Encode(&jpegBody, img, &jpeg.Options{Quality: 80}); err != nil {
		t.Fatal(err)
	}
	var form bytes.Buffer
	mw := multipart.NewWriter(&form)
	_ = mw.WriteField("studentKey", eoschoolCurriculumDefaultStudentKey)
	_ = mw.WriteField("dayId", "d38")
	_ = mw.WriteField("sectionId", "mat")
	fw, err := mw.CreateFormFile("photo", "tarea.jpg")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = fw.Write(jpegBody.Bytes()); err != nil {
		t.Fatal(err)
	}
	_ = mw.Close()
	uploaded := app.v1Authed(http.MethodPost, "/api/v1/homescool/activities/photo", secret, form.Bytes(), mw.FormDataContentType())
	if uploaded.Code != http.StatusOK {
		t.Fatalf("photo: %d %s", uploaded.Code, uploaded.Body.String())
	}
	files := decodeMap(t, uploaded)["activityPhotoFiles"].(map[string]any)["d38:mat"].([]any)
	name := files[0].(string)
	photo := app.v1Authed(http.MethodGet, "/api/v1/homescool/activities/photo?studentKey="+eoschoolCurriculumDefaultStudentKey+"&dayId=d38&sectionId=mat&name="+name, secret, nil, "")
	if photo.Code != http.StatusOK || photo.Header().Get("Content-Type") != "image/webp" || photo.Body.Len() == 0 {
		t.Fatalf("download: %d %s %d", photo.Code, photo.Header().Get("Content-Type"), photo.Body.Len())
	}
	photoPath := eoschoolActivityPhotoAPIPath(eoschoolCurriculumDefaultStudentKey, "d38", "mat", name)
	linkedBody, _ := json.Marshal(map[string]any{
		"studentKey": eoschoolCurriculumDefaultStudentKey,
		"dayId":      "d38",
		"sectionId":  "mat",
		"record": map[string]any{
			"summary":    "Falló 7 × 8.",
			"rewrite":    "Escribió 54.",
			"kind":       "multiplication",
			"photoPaths": []string{photoPath},
			"items": []map[string]any{{
				"kind": "mult", "page": 1, "row": 0, "col": 0,
				"a": 7, "b": 8, "given": 54, "expected": 56, "correct": false,
			}},
		},
	})
	linked := app.v1Authed(http.MethodPut, "/api/v1/homescool/activities/record", secret, linkedBody, "application/json")
	if linked.Code != http.StatusOK {
		t.Fatalf("link photo: %d %s", linked.Code, linked.Body.String())
	}
	linkedRow := decodeMap(t, linked)["activityRecords"].(map[string]any)["d38:mat"].(map[string]any)
	if linkedRow["photos"].([]any)[0] != name || linkedRow["photoPaths"].([]any)[0] != photoPath {
		t.Fatalf("photo ref %#v", linkedRow)
	}
	missingBody, _ := json.Marshal(map[string]any{
		"studentKey": eoschoolCurriculumDefaultStudentKey,
		"dayId":      "d38",
		"sectionId":  "mat",
		"record": map[string]any{
			"summary": "Foto que no existe.",
			"kind":    "prose",
			"photos":  []string{"/var/www/eduardoos.com/media/eoschool/curriculum/secret.webp"},
		},
	})
	missing := app.v1Authed(http.MethodPut, "/api/v1/homescool/activities/record", secret, missingBody, "application/json")
	if missing.Code != http.StatusBadRequest {
		t.Fatalf("disk path: %d %s", missing.Code, missing.Body.String())
	}

	otherKey := app.doJSON(t, "other@eduardoos.com", http.MethodPost, "/api/apikeys", `{"label":"other-eschool"}`)
	if otherKey.Code != http.StatusCreated {
		t.Fatalf("other key: %d %s", otherKey.Code, otherKey.Body.String())
	}
	otherSecret := decodeMap(t, otherKey)["key"].(string)
	foreign := app.v1Authed(http.MethodGet, "/api/v1/homescool/progress?studentKey="+eoschoolCurriculumDefaultStudentKey, otherSecret, nil, "")
	if foreign.Code != http.StatusOK {
		t.Fatalf("foreign progress: %d %s", foreign.Code, foreign.Body.String())
	}
	if bytes.Contains(foreign.Body.Bytes(), []byte("Falló 7 × 8.")) {
		t.Fatal("other user read the owner's reading")
	}
	stolen := app.v1Authed(http.MethodGet, "/api/v1/homescool/activities/photo?studentKey="+eoschoolCurriculumDefaultStudentKey+"&dayId=d38&sectionId=mat&name="+name, otherSecret, nil, "")
	if stolen.Code != http.StatusNotFound {
		t.Fatalf("foreign photo: %d", stolen.Code)
	}
}

func (a *App) v1Authed(method, path, secret string, body []byte, contentType string) *httptest.ResponseRecorder {
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		reader = bytes.NewReader(body)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Authorization", "Bearer "+secret)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	w := httptest.NewRecorder()
	a.Handler().ServeHTTP(w, req)
	return w
}
