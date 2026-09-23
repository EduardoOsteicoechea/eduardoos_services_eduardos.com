package main

import (
	"strings"
	"testing"
)

func TestBuildEoschoolPDFMatWeek2(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Subject = "mat"
	doc.Week = 2
	doc.Day = 1
	doc.Title = "Tablas de multiplicar"
	raw, err := buildEoschoolPDF(doc)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(string(raw), "%PDF") {
		t.Fatal("missing PDF header")
	}
	if len(raw) < 400 {
		t.Fatalf("pdf too small: %d", len(raw))
	}
}

func TestMatPracticeDensity(t *testing.T) {
	if matPracticeDensity(1) != 3 {
		t.Fatalf("day1 dens=%d", matPracticeDensity(1))
	}
	if matPracticeDensity(4) != 12 {
		t.Fatalf("day4 dens=%d", matPracticeDensity(4))
	}
}

func TestIsMatTablesLayout(t *testing.T) {
	doc := sampleEoschoolDay1()
	doc.Subject = "mat"
	doc.Week = 2
	if !isMatTablesLayout(doc) {
		t.Fatal("expected mat week2")
	}
	doc.Week = 1
	if isMatTablesLayout(doc) {
		t.Fatal("week1 should not use mat tables")
	}
}
