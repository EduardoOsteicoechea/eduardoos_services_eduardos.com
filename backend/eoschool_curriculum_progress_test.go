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

func TestNormalizeEoschoolActivityRecord(t *testing.T) {
	given := 54
	miss := false
	rec, err := normalizeEoschoolActivityRecord(EoschoolActivityRecord{
		Summary: "  7 de 10.  ",
		Rewrite: "Escribió 54.",
		Kind:    "multiplication",
		Items: []EoschoolActivityItem{{
			Kind: "mult", Page: 1, Row: 0, Col: 0, A: 7, B: 8, Given: &given, Expected: 56, Correct: &miss,
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if rec.Summary != "7 de 10." || rec.Items[0].Expected != 56 || rec.Items[0].Correct == nil || *rec.Items[0].Correct {
		t.Fatalf("record %#v", rec)
	}
	bad := rec
	bad.Items[0].Expected = 55
	if _, err = normalizeEoschoolActivityRecord(bad); err == nil {
		t.Fatal("expected mismatch")
	}
	divGiven := 4
	div, err := normalizeEoschoolActivityRecord(EoschoolActivityRecord{
		Summary: "División exacta.",
		Kind:    "prose",
		Items: []EoschoolActivityItem{{
			Kind: "div", Page: 1, A: 12, B: 3, Given: &divGiven,
		}},
	})
	if err != nil || div.Items[0].Expected != 4 || div.Items[0].Correct == nil || !*div.Items[0].Correct {
		t.Fatalf("div %#v %v", div, err)
	}
	if _, err = normalizeEoschoolActivityRecord(EoschoolActivityRecord{
		Summary: "Resto.",
		Kind:    "multiplication",
		Items:   []EoschoolActivityItem{{Kind: "div", Page: 1, A: 7, B: 2, Expected: 3}},
	}); err == nil {
		t.Fatal("uneven division")
	}
	text, err := normalizeEoschoolActivityRecord(EoschoolActivityRecord{
		Summary: "Leyó el pasaje.",
		Kind:    "prose",
		Items:   []EoschoolActivityItem{{Kind: "text", Prompt: "Idea", Answer: "El becerro", A: 4}},
	})
	if err != nil || text.Items[0].A != 0 || text.Items[0].Answer != "El becerro" {
		t.Fatalf("text %#v %v", text, err)
	}
	tooMany := EoschoolActivityRecord{Summary: "Muchas.", Kind: "prose"}
	for i := 0; i < eoschoolActivityRecordMaxItems+1; i++ {
		tooMany.Items = append(tooMany.Items, EoschoolActivityItem{Kind: "text", Answer: "x"})
	}
	if _, err = normalizeEoschoolActivityRecord(tooMany); err == nil {
		t.Fatal("item cap")
	}
}

func TestEoschoolActivityRecordSurvivesRescore(t *testing.T) {
	store := newMemoryEoschoolCurriculumProgressStore()
	ctx := context.Background()
	owner := "user-1"
	if _, err := store.GetOrCreate(ctx, owner, eoschoolCurriculumDefaultStudentKey); err != nil {
		t.Fatal(err)
	}
	given := 54
	miss := false
	hitGiven := 12
	hit := true
	rec, err := normalizeEoschoolActivityRecord(EoschoolActivityRecord{
		Summary: "Falló 7 × 8.",
		Rewrite: "Escribió 54.",
		Kind:    "multiplication",
		Items: []EoschoolActivityItem{
			{Kind: "mult", Page: 1, Row: 0, Col: 0, A: 7, B: 8, Given: &given, Expected: 56, Correct: &miss},
			{Kind: "mult", Page: 1, Row: 0, Col: 1, A: 3, B: 4, Given: &hitGiven, Expected: 12, Correct: &hit},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	score := 70
	doc, err := store.UpdateStudent(ctx, owner, eoschoolCurriculumDefaultStudentKey, func(row *EoschoolCurriculumProgressDoc) error {
		applyEoschoolActivityRecord(row, "d38:mat", rec, &score)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	view := curriculumProgressJSON(doc)
	if view.ActivityScores["d38:mat"] != 70 || view.ActivityScoreNotes["d38:mat"] != "Falló 7 × 8." {
		t.Fatalf("score/note %#v %#v", view.ActivityScores, view.ActivityScoreNotes)
	}
	if len(view.ActivityFacts) != 2 || view.ActivityFacts[0].Label != "7 × 8" || view.ActivityFacts[0].Misses != 1 {
		t.Fatalf("facts %#v", view.ActivityFacts)
	}
	if view.ActivityFacts[1].Misses != 0 || view.ActivityFacts[1].Label != "3 × 4" {
		t.Fatalf("hit %#v", view.ActivityFacts[1])
	}
	applyEoschoolActivityScore(&doc, "d38:mat", 40)
	if doc.ActivityScores["d38:mat"] != 40 {
		t.Fatal(doc.ActivityScores["d38:mat"])
	}
	if _, ok := doc.ActivityScoreNotes["d38:mat"]; ok {
		t.Fatal("manual rescore should clear the note")
	}
	if doc.ActivityRecords["d38:mat"].Items[0].A != 7 {
		t.Fatal("manual rescore wiped the record")
	}
}
