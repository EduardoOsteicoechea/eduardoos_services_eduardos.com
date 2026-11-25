package main

import (
	"context"
	"testing"
)

func TestEoschoolCurriculumProgressToggle(t *testing.T) {
	store := newMemoryEoschoolCurriculumProgressStore()
	ctx := context.Background()
	owner := "user-1"

	doc, err := store.SetSectionDone(ctx, owner, eoschoolCurriculumDefaultStudentKey, "d1", "bib", true)
	if err != nil {
		t.Fatal(err)
	}
	if len(doc.SectionsDone) != 1 || doc.SectionsDone[0] != "d1:bib" {
		t.Fatalf("expected d1:bib, got %v", doc.SectionsDone)
	}
	if doc.DisplayName != eoschoolCurriculumDefaultStudentName {
		t.Fatalf("expected default name %q, got %q", eoschoolCurriculumDefaultStudentName, doc.DisplayName)
	}

	doc, err = store.SetSectionDone(ctx, owner, eoschoolCurriculumDefaultStudentKey, "d1", "bib", false)
	if err != nil {
		t.Fatal(err)
	}
	if len(doc.SectionsDone) != 0 {
		t.Fatalf("expected empty sections, got %v", doc.SectionsDone)
	}
}

func TestValidateEoschoolCurriculumSectionToggle(t *testing.T) {
	if !validateEoschoolCurriculumSectionToggle("d5", "mat") {
		t.Fatal("expected valid")
	}
	if validateEoschoolCurriculumSectionToggle("day5", "mat") {
		t.Fatal("expected invalid day id")
	}
	if validateEoschoolCurriculumSectionToggle("d5", "art") {
		t.Fatal("expected invalid section")
	}
	if !validateEoschoolCurriculumSectionToggle("d38", "ia") {
		t.Fatal("expected ia")
	}
	if !validateEoschoolCurriculumSectionToggle("d38", "bib") {
		t.Fatal("expected bib")
	}
}

func TestEoschoolActivityMarksPersist(t *testing.T) {
	store := newMemoryEoschoolCurriculumProgressStore()
	ctx := context.Background()
	owner := "user-1"
	if _, err := store.GetOrCreate(ctx, owner, eoschoolCurriculumDefaultStudentKey); err != nil {
		t.Fatal(err)
	}
	doc, err := store.UpdateStudent(ctx, owner, eoschoolCurriculumDefaultStudentKey, func(row *EoschoolCurriculumProgressDoc) error {
		row.ActivityScores = map[string]int{"d38:len": 80}
		row.ActivityPhotos = map[string]string{"d38:len": eoschoolActivityPhotoName}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	view := curriculumProgressJSON(doc)
	if view.ActivityScores["d38:len"] != 80 {
		t.Fatalf("score %#v", view.ActivityScores)
	}
	if len(view.ActivityPhotos) != 1 || view.ActivityPhotos[0] != "d38:len" {
		t.Fatalf("photos %#v", view.ActivityPhotos)
	}
}

func TestPrepareEoschoolActivityPhotoRejectsGarbage(t *testing.T) {
	if _, err := prepareEoschoolActivityPhoto([]byte("not-an-image")); err == nil {
		t.Fatal("expected reject")
	}
}

func TestEoschoolCurriculumProgressListStudentsEmptyUntilCreated(t *testing.T) {
	store := newMemoryEoschoolCurriculumProgressStore()
	ctx := context.Background()
	students, err := store.ListStudents(ctx, "owner-a")
	if err != nil {
		t.Fatal(err)
	}
	if len(students) != 0 {
		t.Fatalf("expected empty list, got %v", students)
	}
	_, err = store.SetSectionDone(ctx, "owner-a", "otro-nino", "d2", "cie", true)
	if err != nil {
		t.Fatal(err)
	}
	students, err = store.ListStudents(ctx, "owner-a")
	if err != nil {
		t.Fatal(err)
	}
	if len(students) != 1 {
		t.Fatalf("expected one student, got %v", students)
	}
}

func TestSlugifyEoschoolCurriculumStudentKey(t *testing.T) {
	got := slugifyEoschoolCurriculumStudentKey("Elías", "Osteicoechea")
	if got != "elias-osteicoechea" {
		t.Fatalf("got %q", got)
	}
}
