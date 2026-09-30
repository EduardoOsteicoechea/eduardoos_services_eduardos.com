package main

import "time"

var scribLayerIDs = []string{
	"background", "chapter", "verse", "word", "original", "translation1", "translation2",
}

const scribBackgroundLayerID = "background"
const scribDefaultActiveLayerID = "chapter"

const scribBackgroundPatternDefault = "ruled-4-3"
const scribBackgroundPatternDoubleGap = "ruled-4-3-3"

func scribNormalizeBackgroundPattern(value string) string {
	if value == scribBackgroundPatternDoubleGap {
		return scribBackgroundPatternDoubleGap
	}
	return scribBackgroundPatternDefault
}

func scribIsDrawableLayerID(id string) bool {
	if id == "" || id == scribBackgroundLayerID {
		return false
	}
	return scribIsLayerID(id)
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

type scribInk struct {
	Paths []scribStrokePath `json:"paths" bson:"paths"`
}

type scribRectMm struct {
	X float64 `json:"x" bson:"x"`
	Y float64 `json:"y" bson:"y"`
	W float64 `json:"w" bson:"w"`
	H float64 `json:"h" bson:"h"`
}

type scribNoteView struct {
	Open bool    `json:"open" bson:"open"`
	X    float64 `json:"x" bson:"x"`
	Y    float64 `json:"y" bson:"y"`
	W    float64 `json:"w" bson:"w"`
	H    float64 `json:"h" bson:"h"`
}

type scribNoteAnnotation struct {
	ID      string        `json:"id" bson:"id"`
	Name    string        `json:"name" bson:"name"`
	Heading scribInk      `json:"heading" bson:"heading"`
	Body    scribInk      `json:"body" bson:"body"`
	View    scribNoteView `json:"view" bson:"view"`
}

type scribNoteArea struct {
	ID          string                `json:"id" bson:"id"`
	Name        string                `json:"name" bson:"name"`
	Visible     bool                  `json:"visible" bson:"visible"`
	Color       string                `json:"color" bson:"color"`
	Rects       []scribRectMm         `json:"rects" bson:"rects"`
	Annotations []scribNoteAnnotation `json:"annotations" bson:"annotations"`
}

type scribNoteBlock struct {
	ID      string          `json:"id" bson:"id"`
	Name    string          `json:"name" bson:"name"`
	Visible bool            `json:"visible" bson:"visible"`
	Color   string          `json:"color" bson:"color"`
	Rects   []scribRectMm   `json:"rects" bson:"rects"`
	Areas   []scribNoteArea `json:"areas" bson:"areas"`
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
	ID                string           `json:"id" bson:"id"`
	UserID            string           `json:"-" bson:"user_id"`
	BookID            string           `json:"bookId" bson:"bookId"`
	Name              string           `json:"name" bson:"name"`
	ActiveLayerID     string           `json:"activeLayerId" bson:"activeLayerId"`
	StrokeWidthMm     float64          `json:"strokeWidthMm" bson:"strokeWidthMm"`
	BackgroundPattern string           `json:"backgroundPattern" bson:"backgroundPattern"`
	Layers            []scribLayer     `json:"layers" bson:"layers"`
	NoteBlocks        []scribNoteBlock `json:"noteBlocks,omitempty" bson:"noteBlocks,omitempty"`
	UpdatedAt         string           `json:"updatedAt" bson:"updatedAt"`
}

func scribNormalizeNoteBlocks(blocks []scribNoteBlock) []scribNoteBlock {
	if blocks == nil {
		return []scribNoteBlock{}
	}
	out := make([]scribNoteBlock, 0, len(blocks))
	for _, block := range blocks {
		if block.Rects == nil {
			block.Rects = []scribRectMm{}
		}
		if block.Areas == nil {
			block.Areas = []scribNoteArea{}
		}
		areas := make([]scribNoteArea, 0, len(block.Areas))
		for _, area := range block.Areas {
			if area.Rects == nil {
				area.Rects = []scribRectMm{}
			}
			if area.Annotations == nil {
				area.Annotations = []scribNoteAnnotation{}
			}
			anns := make([]scribNoteAnnotation, 0, len(area.Annotations))
			for _, ann := range area.Annotations {
				if ann.Heading.Paths == nil {
					ann.Heading.Paths = []scribStrokePath{}
				}
				if ann.Body.Paths == nil {
					ann.Body.Paths = []scribStrokePath{}
				}
				anns = append(anns, ann)
			}
			area.Annotations = anns
			areas = append(areas, area)
		}
		block.Areas = areas
		out = append(out, block)
	}
	return out
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
		ID:                sheetID,
		BookID:            bookID,
		Name:              name,
		ActiveLayerID:     scribDefaultActiveLayerID,
		StrokeWidthMm:     0.35,
		BackgroundPattern: scribBackgroundPatternDefault,
		Layers:            scribEmptyLayers(),
		NoteBlocks:        []scribNoteBlock{},
		UpdatedAt:         now,
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
