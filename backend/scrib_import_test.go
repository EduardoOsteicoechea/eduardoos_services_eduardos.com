package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestImportScribFromFiles(t *testing.T) {
	dir := t.TempDir()
	libPath := filepath.Join(dir, "library.json")
	bookPath := filepath.Join(dir, "book.json")
	sheetPath := filepath.Join(dir, "sheet.json")

	mustWriteJSON(t, libPath, map[string]any{
		"books": []map[string]string{
			{"id": "book-a", "name": "Romanos", "updatedAt": "2026-01-01T00:00:00Z"},
		},
	})
	mustWriteJSON(t, bookPath, map[string]any{
		"id": "book-a", "name": "Romanos",
		"sheets": []map[string]string{
			{"id": "sheet-1", "name": "1", "updatedAt": "2026-01-02T00:00:00Z"},
		},
		"createdAt": "2026-01-01T00:00:00Z",
		"updatedAt": "2026-01-02T00:00:00Z",
	})
	mustWriteJSON(t, sheetPath, map[string]any{
		"id": "sheet-1", "bookId": "book-a", "name": "1",
		"activeLayerId": "chapter", "strokeWidthMm": 0.4,
		"layers": []map[string]any{
			{"id": "chapter", "opacity": 1, "paths": []map[string]any{
				{"d": "M0 0 L1 1", "strokeWidth": 0.4},
			}},
			{"id": "verse", "opacity": 1, "paths": []any{}},
			{"id": "word", "opacity": 1, "paths": []any{}},
			{"id": "original", "opacity": 1, "paths": []any{}},
			{"id": "translation1", "opacity": 1, "paths": []any{}},
			{"id": "translation2", "opacity": 1, "paths": []any{}},
		},
		"updatedAt": "2026-01-02T00:00:00Z",
	})

	store := newMemoryStore()
	ctx := context.Background()
	now := time.Now().UTC()
	user := &User{
		ID: "owner-1", Email: "owner@example.com", EmailNormalized: "owner@example.com",
		Username: "owner", UsernameNormalized: "owner", PasswordHash: "hash",
		Role: roleUser, Status: statusVerified, EmailVerified: true, CreatedAt: now, UpdatedAt: now,
	}
	if err := store.InsertUser(ctx, user); err != nil {
		t.Fatal(err)
	}
	scrib := openScribStore(store)
	result, err := importScribFromFiles(ctx, store, scrib, scribImportArgs{
		Email:       "owner@example.com",
		LibraryPath: libPath,
		BookPaths:   []string{bookPath},
		SheetPaths:  []string{sheetPath},
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.OwnerUserID != user.ID || result.Books != 1 || result.Sheets != 1 {
		t.Fatalf("unexpected result: %+v", result)
	}
	lib, err := scrib.GetLibrary(ctx, user.ID)
	if err != nil || len(lib.Books) != 1 || lib.Books[0].ID != "book-a" {
		t.Fatalf("library: %+v err=%v", lib, err)
	}
	book, err := scrib.GetBook(ctx, user.ID, "book-a")
	if err != nil || book.Name != "Romanos" || len(book.Sheets) != 1 {
		t.Fatalf("book: %+v err=%v", book, err)
	}
	sheet, err := scrib.GetSheet(ctx, user.ID, "book-a", "sheet-1")
	if err != nil || sheet.Name != "1" || len(sheet.Layers[0].Paths) != 1 {
		t.Fatalf("sheet: %+v err=%v", sheet, err)
	}
}

func mustWriteJSON(t *testing.T, path string, v any) {
	t.Helper()
	data, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
}
