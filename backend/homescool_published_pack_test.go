package main

import (
	"os"
	"path/filepath"
	"testing"
)

// Every published class (weeks 1–2) must pass the same validator the upsert API uses.
func TestPublishedHomescoolPackPassesServerValidation(t *testing.T) {
	var files []string
	for _, w := range []string{"week1", "week2"} {
		m, err := filepath.Glob(filepath.Join("..", "frontend", "public", "homescool", "media", w, "*-l6.eoschool.json"))
		if err != nil {
			t.Fatal(err)
		}
		files = append(files, m...)
	}
	if len(files) != 120 {
		t.Fatalf("expected 120 published classes, got %d", len(files))
	}
	for _, f := range files {
		raw, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := parseEoschoolDocument(raw); err != nil {
			t.Errorf("%s: %v", filepath.Base(f), err)
		}
	}
}