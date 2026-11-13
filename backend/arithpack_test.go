package main

import (
	"path/filepath"
	"testing"
)

func TestArithpackGradesAndEmphasis(t *testing.T) {
	raw := `{
	  "date": "2026-11-13",
	  "cells": [
	    {"page": 1, "row": 0, "col": 0, "kind": "mult", "a": 31, "b": 63, "score": 0},
	    {"page": 1, "row": 0, "col": 1, "kind": "mult", "a": 12, "b": 12, "score": 2},
	    {"page": 1, "row": 0, "col": 0, "kind": "mult", "a": 31, "b": 63, "score": 1},
	    {"page": 2, "row": 1, "col": 2, "kind": "solid", "shape": "hex-prism", "score": 0}
	  ]
	}`
	grades, err := parseArithpackGrades(raw)
	if err != nil {
		t.Fatal(err)
	}
	if grades.Date != "2026-11-13" || len(grades.Cells) != 4 {
		t.Fatalf("%+v", grades)
	}
	stats := arithpackAnalytics([]ArithpackDay{{Day: grades.Date, Cells: grades.Cells}})
	if len(stats.Emphasize) != 1 || stats.Emphasize[0].Key != "mult:31x63" || stats.Emphasize[0].Misses != 2 {
		t.Fatalf("emphasize %+v", stats.Emphasize)
	}
	if len(stats.Figures) != 1 || stats.Figures[0].Shape != "hex-prism" {
		t.Fatalf("figures %+v", stats.Figures)
	}
}

func TestArithpackStoreRoundTrip(t *testing.T) {
	dir := t.TempDir()
	store := newArithpackStore(dir)
	day := ArithpackDay{
		Day: "2026-11-13", StudentKey: "nino", OwnerUserID: "owner1",
		Cells: []ArithpackCell{{Page: 1, Row: 0, Col: 0, Kind: "div", A: 36, B: 9, Score: 2}},
	}
	if err := store.saveDay(day, map[string][]byte{"p1.webp": []byte("webp")}); err != nil {
		t.Fatal(err)
	}
	days, err := store.listDays("owner1", "nino")
	if err != nil || len(days) != 1 || days[0].Cells[0].B != 9 {
		t.Fatalf("%v %+v", err, days)
	}
	path, err := store.photo("owner1", "nino", "2026-11-13", "p1.webp")
	if err != nil || filepath.Base(path) != "p1.webp" {
		t.Fatal(err, path)
	}
	if _, err := store.photo("owner1", "nino", "2026-11-13", "../backup.json"); err == nil {
		t.Fatal("traversal accepted")
	}
	backup, err := store.readBackup("owner1", "nino")
	if err != nil || len(backup) == 0 {
		t.Fatal(err)
	}
}
