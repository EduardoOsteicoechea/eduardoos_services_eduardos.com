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
		row.ActivityScoreNotes = map[string]string{"d38:len": "  Faltó la trompeta.  ", "d38:eng": "   "}
		row.ActivityPhotos = map[string]string{"d38:len": "p0123456789abcdef.webp"}
		row.ActivityPhotoList = map[string][]string{"d38:len": {"p0123456789abcdef.webp", "pabcdef0123456789.webp"}}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	view := curriculumProgressJSON(doc)
	if view.ActivityScores["d38:len"] != 80 {
		t.Fatalf("score %#v", view.ActivityScores)
	}
	if view.ActivityScoreNotes["d38:len"] != "Faltó la trompeta." || len(view.ActivityScoreNotes) != 1 {
		t.Fatalf("notes %#v", view.ActivityScoreNotes)
	}
	applyEoschoolActivityScore(&doc, "d38:len", 70)
	if doc.ActivityScores["d38:len"] != 70 {
		t.Fatalf("rescore %#v", doc.ActivityScores)
	}
	if _, ok := doc.ActivityScoreNotes["d38:len"]; ok {
		t.Fatal("stale note")
	}
	if len(view.ActivityPhotos) != 1 || view.ActivityPhotos[0] != "d38:len" {
		t.Fatalf("photos %#v", view.ActivityPhotos)
	}
	if got := view.ActivityPhotoFiles["d38:len"]; len(got) != 2 || got[0] != "p0123456789abcdef.webp" {
		t.Fatalf("files %#v", view.ActivityPhotoFiles)
	}
}

func TestEoschoolActivityScoreKey(t *testing.T) {
	admin := &User{Role: roleAdmin}
	if !eoschoolActivityScoreKeyOK(admin, "20797190") {
		t.Fatal("admin key")
	}
	if eoschoolActivityScoreKeyOK(admin, "20797191") || eoschoolActivityScoreKeyOK(admin, "") {
		t.Fatal("wrong key")
	}
	if eoschoolActivityScoreKeyOK(&User{Role: "user"}, "20797190") || eoschoolActivityScoreKeyOK(nil, "20797190") {
		t.Fatal("non-admin")
	}
}

func TestDropEoschoolActivityPhoto(t *testing.T) {
	row := EoschoolCurriculumProgressDoc{
		ActivityPhotos:    map[string]string{"d38:eng": "pabcdef0123456789.webp"},
		ActivityPhotoList: map[string][]string{"d38:eng": {"p0123456789abcdef.webp", "pabcdef0123456789.webp"}},
	}
	if !dropEoschoolActivityPhoto(&row, "d38:eng", "p0123456789abcdef.webp") {
		t.Fatal("expected drop")
	}
	if got := row.ActivityPhotoList["d38:eng"]; len(got) != 1 || got[0] != "pabcdef0123456789.webp" {
		t.Fatalf("list %#v", got)
	}
	if row.ActivityPhotos["d38:eng"] != "pabcdef0123456789.webp" {
		t.Fatalf("latest %#v", row.ActivityPhotos["d38:eng"])
	}
	if !dropEoschoolActivityPhoto(&row, "d38:eng", "pabcdef0123456789.webp") {
		t.Fatal("expected last drop")
	}
	if _, ok := row.ActivityPhotoList["d38:eng"]; ok {
		t.Fatal("list should be gone")
	}
	if _, ok := row.ActivityPhotos["d38:eng"]; ok {
		t.Fatal("latest should be gone")
	}
	if dropEoschoolActivityPhoto(&row, "d38:eng", "p0123456789abcdef.webp") {
		t.Fatal("missing name should not drop")
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
