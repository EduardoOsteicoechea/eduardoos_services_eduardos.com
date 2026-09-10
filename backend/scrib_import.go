package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type scribImportArgs struct {
	Email        string
	LibraryPath  string
	BookPaths    []string
	SheetPaths   []string
}

func runScribImportCLI(ctx context.Context, store DataStore, args []string) error {
	fs := flag.NewFlagSet("scrib-import", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	email := fs.String("email", "", "")
	libraryPath := fs.String("library", "", "")
	books := fs.String("books", "", "comma-separated book.json paths")
	sheets := fs.String("sheets", "", "comma-separated sheet.json paths")
	if err := fs.Parse(args); err != nil {
		return err
	}
	bookPaths := splitImportPaths(*books)
	sheetPaths := splitImportPaths(*sheets)
	scrib := openScribStore(store)
	result, err := importScribFromFiles(ctx, store, scrib, scribImportArgs{
		Email:       *email,
		LibraryPath: *libraryPath,
		BookPaths:   bookPaths,
		SheetPaths:  sheetPaths,
	})
	if err != nil {
		return err
	}
	fmt.Printf("imported scrib user=%s books=%d sheets=%d\n", result.OwnerUserID, result.Books, result.Sheets)
	return nil
}

func splitImportPaths(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

type scribImportResult struct {
	OwnerUserID string
	Books       int
	Sheets      int
}

func importScribFromFiles(ctx context.Context, store DataStore, scrib ScribStore, in scribImportArgs) (scribImportResult, error) {
	var out scribImportResult
	_, emailNorm, ok := normalizeEmail(in.Email)
	if !ok {
		return out, errors.New("invalid email")
	}
	user, err := store.UserByEmail(ctx, emailNorm)
	if err != nil || user == nil {
		return out, errors.New("user not found")
	}
	out.OwnerUserID = user.ID

	lib := &scribLibrary{UserID: user.ID, Books: []scribBookMeta{}}
	if strings.TrimSpace(in.LibraryPath) != "" {
		data, err := os.ReadFile(in.LibraryPath)
		if err != nil {
			return out, errors.New("library unreadable")
		}
		var parsed struct {
			Books []scribBookMeta `json:"books"`
		}
		if err := json.Unmarshal(data, &parsed); err != nil {
			return out, errors.New("library invalid")
		}
		lib.Books = parsed.Books
	}

	bookByID := map[string]*scribBook{}
	for _, path := range in.BookPaths {
		data, err := os.ReadFile(path)
		if err != nil {
			return out, fmt.Errorf("book unreadable: %s", filepath.Base(path))
		}
		var book scribBook
		if err := json.Unmarshal(data, &book); err != nil || strings.TrimSpace(book.ID) == "" {
			return out, fmt.Errorf("book invalid: %s", filepath.Base(path))
		}
		book.UserID = user.ID
		if book.UpdatedAt == "" {
			book.UpdatedAt = scribNow()
		}
		if book.CreatedAt == "" {
			book.CreatedAt = book.UpdatedAt
		}
		if err := scrib.SaveBook(ctx, &book); err != nil {
			return out, errors.New("book write failed")
		}
		bookByID[book.ID] = &book
		out.Books++
		upsert := true
		for i := range lib.Books {
			if lib.Books[i].ID == book.ID {
				lib.Books[i] = scribBookMeta{ID: book.ID, Name: book.Name, UpdatedAt: book.UpdatedAt}
				upsert = false
				break
			}
		}
		if upsert {
			lib.Books = append(lib.Books, scribBookMeta{ID: book.ID, Name: book.Name, UpdatedAt: book.UpdatedAt})
		}
	}

	for _, path := range in.SheetPaths {
		data, err := os.ReadFile(path)
		if err != nil {
			return out, fmt.Errorf("sheet unreadable: %s", filepath.Base(path))
		}
		var sheet scribSheet
		if err := json.Unmarshal(data, &sheet); err != nil || strings.TrimSpace(sheet.ID) == "" || strings.TrimSpace(sheet.BookID) == "" {
			return out, fmt.Errorf("sheet invalid: %s", filepath.Base(path))
		}
		sheet.UserID = user.ID
		if sheet.UpdatedAt == "" {
			sheet.UpdatedAt = scribNow()
		}
		if sheet.ActiveLayerID == "" {
			sheet.ActiveLayerID = "chapter"
		}
		if sheet.StrokeWidthMm <= 0 {
			sheet.StrokeWidthMm = 0.35
		}
		if len(sheet.Layers) == 0 {
			sheet.Layers = scribEmptyLayers()
		}
		if err := scrib.SaveSheet(ctx, &sheet); err != nil {
			return out, errors.New("sheet write failed")
		}
		out.Sheets++

		book := bookByID[sheet.BookID]
		if book == nil {
			existing, getErr := scrib.GetBook(ctx, user.ID, sheet.BookID)
			if getErr != nil {
				book = &scribBook{
					ID: sheet.BookID, UserID: user.ID, Name: sheet.BookID,
					Sheets: []scribSheetMeta{}, CreatedAt: sheet.UpdatedAt, UpdatedAt: sheet.UpdatedAt,
				}
			} else {
				book = existing
			}
			bookByID[sheet.BookID] = book
		}
		found := false
		for i := range book.Sheets {
			if book.Sheets[i].ID == sheet.ID {
				book.Sheets[i] = scribSheetMeta{ID: sheet.ID, Name: sheet.Name, UpdatedAt: sheet.UpdatedAt}
				found = true
				break
			}
		}
		if !found {
			book.Sheets = append(book.Sheets, scribSheetMeta{ID: sheet.ID, Name: sheet.Name, UpdatedAt: sheet.UpdatedAt})
		}
		book.UpdatedAt = sheet.UpdatedAt
		if err := scrib.SaveBook(ctx, book); err != nil {
			return out, errors.New("book sheet index write failed")
		}
	}

	if err := scrib.SaveLibrary(ctx, lib); err != nil {
		return out, errors.New("library write failed")
	}
	return out, nil
}
