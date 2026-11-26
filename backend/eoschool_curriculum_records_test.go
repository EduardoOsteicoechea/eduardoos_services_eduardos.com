package main

import "testing"

func TestSanitizeEoschoolSemesterWorks(t *testing.T) {
	works, ok := sanitizeEoschoolSemesterWorks([]EoschoolSemesterWork{
		{Semester: 1, DriveURL: "https://drive.google.com/file/d/abc"},
	})
	if !ok || len(works) != 1 || works[0].Semester != 1 {
		t.Fatalf("works %#v ok %v", works, ok)
	}
	if _, ok := sanitizeEoschoolSemesterWorks([]EoschoolSemesterWork{
		{Semester: 1, DriveURL: "http://drive.google.com/file"},
	}); ok {
		t.Fatal("http url must be rejected")
	}
	if _, ok := sanitizeEoschoolSemesterWorks([]EoschoolSemesterWork{
		{Semester: 3, DriveURL: "https://drive.google.com/file"},
	}); ok {
		t.Fatal("semester 3 must be rejected")
	}
}

func TestSanitizeEoschoolOutings(t *testing.T) {
	year, rows, ok := sanitizeEoschoolOutings("2026", []EoschoolOuting{{
		Date: "2026-03-02", Semester: 1, Place: "Parque del Este",
		Objective: "Ver plantas", Subject: "Ciencias", Notes: "Dibujó una hoja",
	}})
	if !ok || year != "2026" || len(rows) != 1 || rows[0].ID == "" {
		t.Fatalf("year %q rows %#v ok %v", year, rows, ok)
	}
	if _, _, ok := sanitizeEoschoolOutings("2026", []EoschoolOuting{{
		Date: "02/03/2026", Semester: 1, Place: "Parque", Objective: "Ver", Subject: "Cie", Notes: "Dibujo",
	}}); ok {
		t.Fatal("slash date must be rejected")
	}
}
