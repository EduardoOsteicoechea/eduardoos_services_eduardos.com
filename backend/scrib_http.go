package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

func (a *App) requireScribUser(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	ok, unavailable := a.hasProductEntitlement(r, user, productScrib)
	if unavailable {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return nil
	}
	if !ok {
		a.auditEvent(r, "scrib_entitlement", "denied", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	return user
}

func (a *App) requireScribWrite(w http.ResponseWriter, r *http.Request) *User {
	return a.requireScribUser(w, r)
}

func (a *App) scribMustLog(r *http.Request, msg string, attrs ...any) {
	if a == nil || !a.cfg.MustLog {
		return
	}
	args := []any{"request_id", requestIDFrom(r, nil)}
	args = append(args, attrs...)
	a.log.Info(msg, args...)
}

func (a *App) scribGetLibraryHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	lib, err := a.scrib.GetLibrary(r.Context(), user.ID)
	if err != nil {
		a.mustLogf(r, "scrib.library.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	books := make([]map[string]any, 0, len(lib.Books))
	for _, meta := range lib.Books {
		row := map[string]any{
			"id":        meta.ID,
			"name":      meta.Name,
			"updatedAt": meta.UpdatedAt,
			"sheets":    []scribSheetMeta{},
		}
		if book, err := a.scrib.GetBook(r.Context(), user.ID, meta.ID); err == nil && book != nil {
			row["name"] = book.Name
			row["updatedAt"] = book.UpdatedAt
			if book.Sheets != nil {
				row["sheets"] = book.Sheets
			}
		}
		books = append(books, row)
	}
	a.mustLogf(r, "scrib.library.ok", "user_id", user.ID, "books", len(books))
	writeJSON(w, http.StatusOK, map[string]any{
		"userSafe": scribSafeEmail(user.Email),
		"books":    books,
	})
}

func (a *App) scribReorderLibraryHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	var body struct {
		BookIDs []string `json:"bookIds"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	lib, err := a.scrib.GetLibrary(r.Context(), user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	byID := make(map[string]scribBookMeta, len(lib.Books))
	for _, meta := range lib.Books {
		byID[meta.ID] = meta
	}
	seen := make(map[string]bool, len(body.BookIDs))
	ordered := make([]scribBookMeta, 0, len(lib.Books))
	for _, id := range body.BookIDs {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			continue
		}
		meta, ok := byID[id]
		if !ok {
			continue
		}
		seen[id] = true
		ordered = append(ordered, meta)
	}
	for _, meta := range lib.Books {
		if !seen[meta.ID] {
			ordered = append(ordered, meta)
		}
	}
	lib.UserID = user.ID
	lib.Books = ordered
	if err := a.scrib.SaveLibrary(r.Context(), lib); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.mustLogf(r, "scrib.reorder_library", "user_id", user.ID, "books", len(ordered))
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "bookIds": bookIDsFromMeta(ordered)})
}

func bookIDsFromMeta(books []scribBookMeta) []string {
	out := make([]string, 0, len(books))
	for _, b := range books {
		out = append(out, b.ID)
	}
	return out
}

func (a *App) scribCreateBookHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := scribNow()
	book := &scribBook{
		ID:        randomID(12),
		UserID:    user.ID,
		Name:      name,
		Sheets:    []scribSheetMeta{},
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := a.scrib.SaveBook(r.Context(), book); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	lib, _ := a.scrib.GetLibrary(r.Context(), user.ID)
	lib.UserID = user.ID
	lib.Books = append(lib.Books, scribBookMeta{ID: book.ID, Name: book.Name, UpdatedAt: now})
	_ = a.scrib.SaveLibrary(r.Context(), lib)
	a.mustLogf(r, "scrib.create_book", "user_id", user.ID, "book_id", book.ID)
	writeJSON(w, http.StatusCreated, book)
}

func (a *App) scribGetBookHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	bookID := strings.TrimSpace(r.PathValue("bookId"))
	book, err := a.scrib.GetBook(r.Context(), user.ID, bookID)
	if errors.Is(err, errNotFound) || book == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if book.Sheets == nil {
		book.Sheets = []scribSheetMeta{}
	}
	writeJSON(w, http.StatusOK, book)
}

func (a *App) scribRenameBookHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	bookID := strings.TrimSpace(r.PathValue("bookId"))
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	book, err := a.scrib.GetBook(r.Context(), user.ID, bookID)
	if errors.Is(err, errNotFound) || book == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	now := scribNow()
	book.Name = name
	book.UpdatedAt = now
	_ = a.scrib.SaveBook(r.Context(), book)
	lib, _ := a.scrib.GetLibrary(r.Context(), user.ID)
	for i := range lib.Books {
		if lib.Books[i].ID == bookID {
			lib.Books[i].Name = name
			lib.Books[i].UpdatedAt = now
		}
	}
	_ = a.scrib.SaveLibrary(r.Context(), lib)
	a.mustLogf(r, "scrib.rename_book", "book_id", bookID)
	writeJSON(w, http.StatusOK, book)
}

func (a *App) scribDeleteBookHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	bookID := strings.TrimSpace(r.PathValue("bookId"))
	_ = a.scrib.DeleteBook(r.Context(), user.ID, bookID)
	lib, _ := a.scrib.GetLibrary(r.Context(), user.ID)
	filtered := make([]scribBookMeta, 0, len(lib.Books))
	for _, b := range lib.Books {
		if b.ID != bookID {
			filtered = append(filtered, b)
		}
	}
	lib.Books = filtered
	_ = a.scrib.SaveLibrary(r.Context(), lib)
	a.mustLogf(r, "scrib.delete_book", "book_id", bookID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true, "bookId": bookID})
}

func (a *App) scribCreateSheetHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	bookID := strings.TrimSpace(r.PathValue("bookId"))
	var body struct {
		Name string `json:"name"`
	}
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body)
	name := strings.TrimSpace(body.Name)
	if name == "" {
		name = "Hoja nueva"
	}
	book, err := a.scrib.GetBook(r.Context(), user.ID, bookID)
	if errors.Is(err, errNotFound) || book == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	now := scribNow()
	sheet := scribNewEmptySheet(bookID, randomID(12), name, now)
	sheet.UserID = user.ID
	if err := a.scrib.SaveSheet(r.Context(), &sheet); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	book.Sheets = append(book.Sheets, scribSheetMeta{ID: sheet.ID, Name: sheet.Name, UpdatedAt: now})
	book.UpdatedAt = now
	_ = a.scrib.SaveBook(r.Context(), book)
	a.mustLogf(r, "scrib.create_sheet", "book_id", bookID, "sheet_id", sheet.ID)
	writeJSON(w, http.StatusCreated, sheet)
}

func (a *App) scribGetSheetHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	bookID := strings.TrimSpace(r.PathValue("bookId"))
	sheetID := strings.TrimSpace(r.PathValue("sheetId"))
	sheet, err := a.scrib.GetSheet(r.Context(), user.ID, bookID, sheetID)
	if errors.Is(err, errNotFound) || sheet == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	sheet.BackgroundPattern = scribNormalizeBackgroundPattern(sheet.BackgroundPattern)
	sheet.NoteBlocks = scribNormalizeNoteBlocks(sheet.NoteBlocks)
	writeJSON(w, http.StatusOK, sheet)
}

func (a *App) scribPutSheetHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	bookID := strings.TrimSpace(r.PathValue("bookId"))
	sheetID := strings.TrimSpace(r.PathValue("sheetId"))
	var sheet scribSheet
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<20)).Decode(&sheet); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	sheet.ID = sheetID
	sheet.BookID = bookID
	sheet.UserID = user.ID
	if sheet.Name == "" {
		sheet.Name = "Hoja"
	}
	if !scribIsDrawableLayerID(sheet.ActiveLayerID) {
		sheet.ActiveLayerID = scribDefaultActiveLayerID
	}
	if sheet.StrokeWidthMm <= 0 {
		sheet.StrokeWidthMm = 0.35
	}
	sheet.BackgroundPattern = scribNormalizeBackgroundPattern(sheet.BackgroundPattern)
	if len(sheet.Layers) == 0 {
		sheet.Layers = scribEmptyLayers()
	}
	sheet.NoteBlocks = scribNormalizeNoteBlocks(sheet.NoteBlocks)
	now := scribNow()
	sheet.UpdatedAt = now
	if err := a.scrib.SaveSheet(r.Context(), &sheet); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if book, err := a.scrib.GetBook(r.Context(), user.ID, bookID); err == nil && book != nil {
		found := false
		for i := range book.Sheets {
			if book.Sheets[i].ID == sheetID {
				book.Sheets[i].Name = sheet.Name
				book.Sheets[i].UpdatedAt = now
				found = true
			}
		}
		if !found {
			book.Sheets = append(book.Sheets, scribSheetMeta{ID: sheetID, Name: sheet.Name, UpdatedAt: now})
		}
		book.UpdatedAt = now
		_ = a.scrib.SaveBook(r.Context(), book)
	}
	a.mustLogf(r, "scrib.put_sheet", "sheet_id", sheetID)
	writeJSON(w, http.StatusOK, sheet)
}

func (a *App) scribDeleteSheetHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	bookID := strings.TrimSpace(r.PathValue("bookId"))
	sheetID := strings.TrimSpace(r.PathValue("sheetId"))
	_ = a.scrib.DeleteSheet(r.Context(), user.ID, bookID, sheetID)
	if book, err := a.scrib.GetBook(r.Context(), user.ID, bookID); err == nil && book != nil {
		filtered := make([]scribSheetMeta, 0, len(book.Sheets))
		for _, s := range book.Sheets {
			if s.ID != sheetID {
				filtered = append(filtered, s)
			}
		}
		book.Sheets = filtered
		book.UpdatedAt = scribNow()
		_ = a.scrib.SaveBook(r.Context(), book)
	}
	a.mustLogf(r, "scrib.delete_sheet", "sheet_id", sheetID)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": true, "sheetId": sheetID})
}

func (a *App) scribMoveSheetHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.requireScribUser(w, r)
	if user == nil {
		return
	}
	sourceBookID := strings.TrimSpace(r.PathValue("bookId"))
	sheetID := strings.TrimSpace(r.PathValue("sheetId"))
	var body struct {
		TargetBookID string `json:"targetBookId"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	targetBookID := strings.TrimSpace(body.TargetBookID)
	if sourceBookID == "" || sheetID == "" || targetBookID == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if sourceBookID == targetBookID {
		sheet, err := a.scrib.GetSheet(r.Context(), user.ID, sourceBookID, sheetID)
		if errors.Is(err, errNotFound) || sheet == nil {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		if err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		writeJSON(w, http.StatusOK, sheet)
		return
	}
	sourceBook, err := a.scrib.GetBook(r.Context(), user.ID, sourceBookID)
	if errors.Is(err, errNotFound) || sourceBook == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	targetBook, err := a.scrib.GetBook(r.Context(), user.ID, targetBookID)
	if errors.Is(err, errNotFound) || targetBook == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	sheet, err := a.scrib.GetSheet(r.Context(), user.ID, sourceBookID, sheetID)
	if errors.Is(err, errNotFound) || sheet == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := scribNow()
	meta := scribSheetMeta{ID: sheet.ID, Name: sheet.Name, UpdatedAt: now}
	for _, s := range sourceBook.Sheets {
		if s.ID == sheetID {
			meta.Name = s.Name
			break
		}
	}
	if sheet.Name != "" {
		meta.Name = sheet.Name
	}
	meta.UpdatedAt = now

	sheet.BookID = targetBookID
	sheet.UserID = user.ID
	sheet.UpdatedAt = now
	if err := a.scrib.SaveSheet(r.Context(), sheet); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.scrib.DeleteSheet(r.Context(), user.ID, sourceBookID, sheetID); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}

	filtered := make([]scribSheetMeta, 0, len(sourceBook.Sheets))
	for _, s := range sourceBook.Sheets {
		if s.ID != sheetID {
			filtered = append(filtered, s)
		}
	}
	sourceBook.Sheets = filtered
	sourceBook.UpdatedAt = now
	_ = a.scrib.SaveBook(r.Context(), sourceBook)

	already := false
	for _, s := range targetBook.Sheets {
		if s.ID == sheetID {
			already = true
			break
		}
	}
	if !already {
		targetBook.Sheets = append(targetBook.Sheets, meta)
	}
	targetBook.UpdatedAt = now
	_ = a.scrib.SaveBook(r.Context(), targetBook)

	a.mustLogf(r, "scrib.move_sheet", "sheet_id", sheetID, "from", sourceBookID, "to", targetBookID)
	writeJSON(w, http.StatusOK, sheet)
}

func scribSafeEmail(email string) string {
	email = strings.ToLower(strings.TrimSpace(email))
	email = strings.ReplaceAll(email, "@", "_at_")
	email = strings.ReplaceAll(email, "/", "_")
	return email
}
