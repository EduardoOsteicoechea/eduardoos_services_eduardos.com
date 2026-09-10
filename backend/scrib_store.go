package main

import (
	"context"
	"sync"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	colScribLibraries = "scrib_libraries"
	colScribBooks     = "scrib_books"
	colScribSheets    = "scrib_sheets"
)

// ScribStore persists Scrib libraries, books, and sheets (Mongo or memory).
type ScribStore interface {
	GetLibrary(ctx context.Context, userID string) (*scribLibrary, error)
	SaveLibrary(ctx context.Context, lib *scribLibrary) error
	GetBook(ctx context.Context, userID, bookID string) (*scribBook, error)
	SaveBook(ctx context.Context, book *scribBook) error
	DeleteBook(ctx context.Context, userID, bookID string) error
	ListSheetIDs(ctx context.Context, userID, bookID string) ([]string, error)
	GetSheet(ctx context.Context, userID, bookID, sheetID string) (*scribSheet, error)
	SaveSheet(ctx context.Context, sheet *scribSheet) error
	DeleteSheet(ctx context.Context, userID, bookID, sheetID string) error
}

func openScribStore(store DataStore) ScribStore {
	if ms, ok := store.(*mongoStore); ok && ms != nil && ms.db != nil {
		return newMongoScribStore(ms.db)
	}
	return newMemoryScribStore()
}

type memoryScribStore struct {
	mu     sync.Mutex
	libs   map[string]*scribLibrary
	books  map[string]*scribBook
	sheets map[string]*scribSheet
}

func newMemoryScribStore() *memoryScribStore {
	return &memoryScribStore{
		libs:   map[string]*scribLibrary{},
		books:  map[string]*scribBook{},
		sheets: map[string]*scribSheet{},
	}
}

func (s *memoryScribStore) GetLibrary(_ context.Context, userID string) (*scribLibrary, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	lib, ok := s.libs[userID]
	if !ok {
		return &scribLibrary{UserID: userID, Books: []scribBookMeta{}}, nil
	}
	cp := *lib
	cp.Books = append([]scribBookMeta{}, lib.Books...)
	return &cp, nil
}

func (s *memoryScribStore) SaveLibrary(_ context.Context, lib *scribLibrary) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *lib
	cp.Books = append([]scribBookMeta{}, lib.Books...)
	s.libs[lib.UserID] = &cp
	return nil
}

func (s *memoryScribStore) GetBook(_ context.Context, userID, bookID string) (*scribBook, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	b, ok := s.books[scribBookDocID(userID, bookID)]
	if !ok {
		return nil, errNotFound
	}
	cp := *b
	cp.Sheets = append([]scribSheetMeta{}, b.Sheets...)
	return &cp, nil
}

func (s *memoryScribStore) SaveBook(_ context.Context, book *scribBook) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *book
	cp.Sheets = append([]scribSheetMeta{}, book.Sheets...)
	s.books[scribBookDocID(book.UserID, book.ID)] = &cp
	return nil
}

func (s *memoryScribStore) DeleteBook(_ context.Context, userID, bookID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.books, scribBookDocID(userID, bookID))
	prefix := userID + ":" + bookID + ":"
	for id := range s.sheets {
		if len(id) >= len(prefix) && id[:len(prefix)] == prefix {
			delete(s.sheets, id)
		}
	}
	return nil
}

func (s *memoryScribStore) ListSheetIDs(_ context.Context, userID, bookID string) ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	prefix := userID + ":" + bookID + ":"
	out := []string{}
	for id, sheet := range s.sheets {
		if len(id) >= len(prefix) && id[:len(prefix)] == prefix {
			out = append(out, sheet.ID)
		}
	}
	return out, nil
}

func (s *memoryScribStore) GetSheet(_ context.Context, userID, bookID, sheetID string) (*scribSheet, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sh, ok := s.sheets[scribSheetDocID(userID, bookID, sheetID)]
	if !ok {
		return nil, errNotFound
	}
	cp := *sh
	cp.Layers = append([]scribLayer{}, sh.Layers...)
	return &cp, nil
}

func (s *memoryScribStore) SaveSheet(_ context.Context, sheet *scribSheet) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := *sheet
	cp.Layers = append([]scribLayer{}, sheet.Layers...)
	s.sheets[scribSheetDocID(sheet.UserID, sheet.BookID, sheet.ID)] = &cp
	return nil
}

func (s *memoryScribStore) DeleteSheet(_ context.Context, userID, bookID, sheetID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sheets, scribSheetDocID(userID, bookID, sheetID))
	return nil
}

type mongoScribStore struct {
	db *mongo.Database
}

func newMongoScribStore(db *mongo.Database) *mongoScribStore {
	return &mongoScribStore{db: db}
}

func (s *mongoScribStore) libraries() *mongo.Collection { return s.db.Collection(colScribLibraries) }
func (s *mongoScribStore) books() *mongo.Collection     { return s.db.Collection(colScribBooks) }
func (s *mongoScribStore) sheets() *mongo.Collection    { return s.db.Collection(colScribSheets) }

type mongoScribBookDoc struct {
	Key       string           `bson:"_id"`
	ID        string           `bson:"id"`
	UserID    string           `bson:"user_id"`
	Name      string           `bson:"name"`
	Sheets    []scribSheetMeta `bson:"sheets"`
	CreatedAt string           `bson:"createdAt"`
	UpdatedAt string           `bson:"updatedAt"`
}

type mongoScribSheetDoc struct {
	Key           string       `bson:"_id"`
	ID            string       `bson:"id"`
	UserID        string       `bson:"user_id"`
	BookID        string       `bson:"bookId"`
	Name          string       `bson:"name"`
	ActiveLayerID string       `bson:"activeLayerId"`
	StrokeWidthMm float64      `bson:"strokeWidthMm"`
	Layers        []scribLayer `bson:"layers"`
	UpdatedAt     string       `bson:"updatedAt"`
}

func (s *mongoScribStore) GetLibrary(ctx context.Context, userID string) (*scribLibrary, error) {
	var lib scribLibrary
	err := s.libraries().FindOne(ctx, bson.M{"_id": userID}).Decode(&lib)
	if err == mongo.ErrNoDocuments {
		return &scribLibrary{UserID: userID, Books: []scribBookMeta{}}, nil
	}
	if err != nil {
		return nil, err
	}
	lib.UserID = userID
	if lib.Books == nil {
		lib.Books = []scribBookMeta{}
	}
	return &lib, nil
}

func (s *mongoScribStore) SaveLibrary(ctx context.Context, lib *scribLibrary) error {
	if lib.Books == nil {
		lib.Books = []scribBookMeta{}
	}
	_, err := s.libraries().ReplaceOne(ctx,
		bson.M{"_id": lib.UserID},
		bson.M{"_id": lib.UserID, "books": lib.Books},
		options.Replace().SetUpsert(true),
	)
	return err
}

func (s *mongoScribStore) GetBook(ctx context.Context, userID, bookID string) (*scribBook, error) {
	var doc mongoScribBookDoc
	err := s.books().FindOne(ctx, bson.M{"_id": scribBookDocID(userID, bookID)}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	book := &scribBook{
		ID:        doc.ID,
		UserID:    doc.UserID,
		Name:      doc.Name,
		Sheets:    doc.Sheets,
		CreatedAt: doc.CreatedAt,
		UpdatedAt: doc.UpdatedAt,
	}
	if book.Sheets == nil {
		book.Sheets = []scribSheetMeta{}
	}
	return book, nil
}

func (s *mongoScribStore) SaveBook(ctx context.Context, book *scribBook) error {
	if book.Sheets == nil {
		book.Sheets = []scribSheetMeta{}
	}
	doc := mongoScribBookDoc{
		Key:       scribBookDocID(book.UserID, book.ID),
		ID:        book.ID,
		UserID:    book.UserID,
		Name:      book.Name,
		Sheets:    book.Sheets,
		CreatedAt: book.CreatedAt,
		UpdatedAt: book.UpdatedAt,
	}
	_, err := s.books().ReplaceOne(ctx,
		bson.M{"_id": doc.Key},
		doc,
		options.Replace().SetUpsert(true),
	)
	return err
}

func (s *mongoScribStore) DeleteBook(ctx context.Context, userID, bookID string) error {
	_, err := s.sheets().DeleteMany(ctx, bson.M{"user_id": userID, "bookId": bookID})
	if err != nil {
		return err
	}
	_, err = s.books().DeleteOne(ctx, bson.M{"_id": scribBookDocID(userID, bookID)})
	return err
}

func (s *mongoScribStore) ListSheetIDs(ctx context.Context, userID, bookID string) ([]string, error) {
	cur, err := s.sheets().Find(ctx, bson.M{"user_id": userID, "bookId": bookID}, options.Find().SetProjection(bson.M{"id": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	out := []string{}
	for cur.Next(ctx) {
		var row struct {
			ID string `bson:"id"`
		}
		if err := cur.Decode(&row); err != nil {
			return nil, err
		}
		if row.ID != "" {
			out = append(out, row.ID)
		}
	}
	return out, cur.Err()
}

func (s *mongoScribStore) GetSheet(ctx context.Context, userID, bookID, sheetID string) (*scribSheet, error) {
	var doc mongoScribSheetDoc
	err := s.sheets().FindOne(ctx, bson.M{"_id": scribSheetDocID(userID, bookID, sheetID)}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	sheet := &scribSheet{
		ID:            doc.ID,
		UserID:        doc.UserID,
		BookID:        doc.BookID,
		Name:          doc.Name,
		ActiveLayerID: doc.ActiveLayerID,
		StrokeWidthMm: doc.StrokeWidthMm,
		Layers:        doc.Layers,
		UpdatedAt:     doc.UpdatedAt,
	}
	if sheet.Layers == nil {
		sheet.Layers = scribEmptyLayers()
	}
	return sheet, nil
}

func (s *mongoScribStore) SaveSheet(ctx context.Context, sheet *scribSheet) error {
	if sheet.Layers == nil {
		sheet.Layers = scribEmptyLayers()
	}
	doc := mongoScribSheetDoc{
		Key:           scribSheetDocID(sheet.UserID, sheet.BookID, sheet.ID),
		ID:            sheet.ID,
		UserID:        sheet.UserID,
		BookID:        sheet.BookID,
		Name:          sheet.Name,
		ActiveLayerID: sheet.ActiveLayerID,
		StrokeWidthMm: sheet.StrokeWidthMm,
		Layers:        sheet.Layers,
		UpdatedAt:     sheet.UpdatedAt,
	}
	_, err := s.sheets().ReplaceOne(ctx,
		bson.M{"_id": doc.Key},
		doc,
		options.Replace().SetUpsert(true),
	)
	return err
}

func (s *mongoScribStore) DeleteSheet(ctx context.Context, userID, bookID, sheetID string) error {
	_, err := s.sheets().DeleteOne(ctx, bson.M{"_id": scribSheetDocID(userID, bookID, sheetID)})
	return err
}
