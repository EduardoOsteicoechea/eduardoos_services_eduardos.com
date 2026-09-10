package main

import "time"

var scribLayerIDs = []string{
	"chapter", "verse", "word", "original", "translation1", "translation2",
}

type scribStrokePath struct {
	D           string  `json:"d" bson:"d"`
	StrokeWidth float64 `json:"strokeWidth" bson:"strokeWidth"`
}

type scribLayer struct {
	ID      string            `json:"id" bson:"id"`
	Opacity float64           `json:"opacity" bson:"opacity"`
	Paths   []scribStrokePath `json:"paths" bson:"paths"`
}

type scribSheetMeta struct {
	ID        string `json:"id" bson:"id"`
	Name      string `json:"name" bson:"name"`
	UpdatedAt string `json:"updatedAt" bson:"updatedAt"`
}

type scribBookMeta struct {
	ID        string `json:"id" bson:"id"`
	Name      string `json:"name" bson:"name"`
	UpdatedAt string `json:"updatedAt" bson:"updatedAt"`
}

type scribLibrary struct {
	UserID string          `json:"-" bson:"_id"`
	Books  []scribBookMeta `json:"books" bson:"books"`
}

type scribBook struct {
	ID        string           `json:"id" bson:"id"`
	UserID    string           `json:"-" bson:"user_id"`
	Name      string           `json:"name" bson:"name"`
	Sheets    []scribSheetMeta `json:"sheets" bson:"sheets"`
	CreatedAt string           `json:"createdAt" bson:"createdAt"`
	UpdatedAt string           `json:"updatedAt" bson:"updatedAt"`
}

type scribSheet struct {
	ID            string       `json:"id" bson:"id"`
	UserID        string       `json:"-" bson:"user_id"`
	BookID        string       `json:"bookId" bson:"bookId"`
	Name          string       `json:"name" bson:"name"`
	ActiveLayerID string       `json:"activeLayerId" bson:"activeLayerId"`
	StrokeWidthMm float64      `json:"strokeWidthMm" bson:"strokeWidthMm"`
	Layers        []scribLayer `json:"layers" bson:"layers"`
	UpdatedAt     string       `json:"updatedAt" bson:"updatedAt"`
}

func scribEmptyLayers() []scribLayer {
	out := make([]scribLayer, 0, len(scribLayerIDs))
	for _, id := range scribLayerIDs {
		out = append(out, scribLayer{ID: id, Opacity: 1, Paths: []scribStrokePath{}})
	}
	return out
}

func emptyScribLayers() []scribLayer { return scribEmptyLayers() }

func scribIsLayerID(id string) bool {
	for _, known := range scribLayerIDs {
		if known == id {
			return true
		}
	}
	return false
}

func isScribLayerID(id string) bool { return scribIsLayerID(id) }

// Exported aliases for tests / FE-facing docs.
type (
	ScribStrokePath = scribStrokePath
	ScribLayer      = scribLayer
	ScribSheetMeta  = scribSheetMeta
	ScribBookMeta   = scribBookMeta
	ScribBook       = scribBook
	ScribSheet      = scribSheet
)

func scribNewEmptySheet(bookID, sheetID, name, now string) scribSheet {
	return scribSheet{
		ID:            sheetID,
		BookID:        bookID,
		Name:          name,
		ActiveLayerID: "chapter",
		StrokeWidthMm: 0.35,
		Layers:        scribEmptyLayers(),
		UpdatedAt:     now,
	}
}

func scribNow() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func scribBookDocID(userID, bookID string) string {
	return userID + ":" + bookID
}

func scribSheetDocID(userID, bookID, sheetID string) string {
	return userID + ":" + bookID + ":" + sheetID
}
