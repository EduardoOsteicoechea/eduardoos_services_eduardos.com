package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestEoschoolCurriculumProgressHTTP(t *testing.T) {
	app := newTestApp(false)
	_ = app.grantEntitlement("member-1", productHomescool)

	get := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eoschool/curriculum/progress?studentKey=elias-osteicoechea", "")
	if get.Code != http.StatusOK {
		t.Fatalf("GET status=%d body=%s", get.Code, get.Body.String())
	}
	var progress eoschoolCurriculumProgressResponse
	if err := json.Unmarshal(get.Body.Bytes(), &progress); err != nil {
		t.Fatal(err)
	}
	if progress.Student.StudentKey != eoschoolCurriculumDefaultStudentKey {
		t.Fatalf("studentKey=%q", progress.Student.StudentKey)
	}
	if progress.Student.DisplayName != eoschoolCurriculumDefaultStudentName {
		t.Fatalf("displayName=%q", progress.Student.DisplayName)
	}
	if len(progress.SectionsDone) != 0 {
		t.Fatalf("expected empty sections, got %v", progress.SectionsDone)
	}

	patchBody := `{"studentKey":"elias-osteicoechea","dayId":"d1","sectionId":"bib","completed":true}`
	patch := app.doJSON(t, "member@eduardoos.com", http.MethodPatch, "/api/eoschool/curriculum/progress/sections", patchBody)
	if patch.Code != http.StatusOK {
		t.Fatalf("PATCH status=%d body=%s", patch.Code, patch.Body.String())
	}
	if err := json.Unmarshal(patch.Body.Bytes(), &progress); err != nil {
		t.Fatal(err)
	}
	if len(progress.SectionsDone) != 1 || progress.SectionsDone[0] != "d1:bib" {
		t.Fatalf("sectionsDone=%v", progress.SectionsDone)
	}

	students := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eoschool/curriculum/students", "")
	if students.Code != http.StatusOK {
		t.Fatalf("students status=%d body=%s", students.Code, students.Body.String())
	}
	var list struct {
		Students []EoschoolCurriculumStudent `json:"students"`
	}
	if err := json.Unmarshal(students.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}
	if len(list.Students) < 1 {
		t.Fatal("expected at least default student")
	}
}

func TestEoschoolCurriculumProgressRequiresAuth(t *testing.T) {
	app := newTestApp(false)
	req := httptest.NewRequest(http.MethodGet, "/api/eoschool/curriculum/progress", nil)
	rec := httptest.NewRecorder()
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d want 401 body=%s", rec.Code, rec.Body.String())
	}
}

func TestEoschoolCurriculumProgressRequiresEntitlement(t *testing.T) {
	app := newTestApp(false)
	// member without homescool entitlement
	rec := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/eoschool/curriculum/progress", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status=%d want 403 body=%s", rec.Code, rec.Body.String())
	}
}
