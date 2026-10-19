package main

import (
	"encoding/json"
	"strings"
	"time"
)

type EmusicRecord struct {
	TrackID   string    `bson:"track_id"`
	Slug      string    `bson:"slug"`
	Document  string    `bson:"document"`
	UpdatedBy string    `bson:"updated_by"`
	UpdatedAt time.Time `bson:"updated_at"`
}

type EmusicPlaylist struct {
	ID        string    `bson:"_id"`
	OwnerID   string    `bson:"owner_id"`
	Name      string    `bson:"name"`
	TrackIDs  []string  `bson:"track_ids"`
	CreatedAt time.Time `bson:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"`
}

func blankEmusicDocument(title string) string {
	payload, _ := json.Marshal(map[string]any{
		"type":    "emusic",
		"version": 4,
		"title":   title,
		"unidades": []any{
			map[string]any{"t": "estrofa", "l": []any{map[string]any{"p": []any{}}}},
		},
	})
	return string(payload)
}

func validEmusicDocument(raw json.RawMessage) (string, bool) {
	if len(raw) == 0 || len(raw) > 2<<20 {
		return "", false
	}
	var document map[string]any
	if json.Unmarshal(raw, &document) != nil || document["type"] != "emusic" {
		return "", false
	}
	normalized, err := json.Marshal(document)
	if err != nil {
		return "", false
	}
	return string(normalized), true
}

func normalizeEmusicJSON(raw string) (string, bool) {
	normalized, ok := validEmusicDocument(json.RawMessage(raw))
	if !ok {
		return "", false
	}
	var doc map[string]any
	if json.Unmarshal([]byte(normalized), &doc) != nil {
		return normalized, true
	}
	unidades, _ := doc["unidades"].([]any)
	doc["unidades"] = inferEmusicEnds(unidades)
	doc["type"] = "emusic"
	if _, has := doc["version"]; !has {
		doc["version"] = 4
	}
	out, err := json.Marshal(doc)
	if err != nil {
		return normalized, true
	}
	return string(out), true
}

func inferEmusicEnds(unidades []any) []any {
	out := make([]any, 0, len(unidades))
	for _, unitRaw := range unidades {
		unit, _ := unitRaw.(map[string]any)
		if unit == nil {
			continue
		}
		lines, _ := unit["l"].([]any)
		flat := flattenEmusicStarts(lines)
		cursor := 0
		nextLines := make([]any, 0, len(lines))
		for _, lineRaw := range lines {
			line, _ := lineRaw.(map[string]any)
			if line == nil {
				nextLines = append(nextLines, map[string]any{"p": []any{}})
				continue
			}
			words, _ := line["p"].([]any)
			nextWords := make([]any, 0, len(words))
			for _, wordRaw := range words {
				word, _ := wordRaw.(map[string]any)
				if word == nil {
					continue
				}
				text := strings.TrimSpace(emusicAsString(word["t"]))
				if text == "" {
					continue
				}
				start := emusicAsFloat(word["i"])
				end := emusicAsFloat(word["f"])
				if end <= start {
					if cursor+1 < len(flat) && flat[cursor+1] > start {
						end = flat[cursor+1]
					} else {
						end = start + 0.45
					}
				}
				cursor++
				nextWords = append(nextWords, map[string]any{"t": text, "i": start, "f": end})
			}
			nextLines = append(nextLines, map[string]any{"p": nextWords})
		}
		if len(nextLines) == 0 {
			nextLines = []any{map[string]any{"p": []any{}}}
		}
		kind := strings.ToLower(strings.TrimSpace(emusicAsString(unit["t"])))
		if kind == "" {
			kind = "estrofa"
		}
		out = append(out, map[string]any{"t": kind, "l": nextLines})
	}
	if len(out) == 0 {
		return []any{map[string]any{"t": "estrofa", "l": []any{map[string]any{"p": []any{}}}}}
	}
	return out
}

func flattenEmusicStarts(lines []any) []float64 {
	var starts []float64
	for _, lineRaw := range lines {
		line, _ := lineRaw.(map[string]any)
		if line == nil {
			continue
		}
		words, _ := line["p"].([]any)
		for _, wordRaw := range words {
			word, _ := wordRaw.(map[string]any)
			if word == nil || strings.TrimSpace(emusicAsString(word["t"])) == "" {
				continue
			}
			starts = append(starts, emusicAsFloat(word["i"]))
		}
	}
	return starts
}

func emusicDocumentHasWords(raw string) bool {
	normalized, ok := normalizeEmusicJSON(raw)
	if !ok {
		return false
	}
	var doc map[string]any
	if json.Unmarshal([]byte(normalized), &doc) != nil {
		return false
	}
	unidades, _ := doc["unidades"].([]any)
	for _, unitRaw := range unidades {
		unit, _ := unitRaw.(map[string]any)
		if unit == nil {
			continue
		}
		lines, _ := unit["l"].([]any)
		for _, lineRaw := range lines {
			line, _ := lineRaw.(map[string]any)
			if line == nil {
				continue
			}
			words, _ := line["p"].([]any)
			for _, wordRaw := range words {
				word, _ := wordRaw.(map[string]any)
				if word != nil && strings.TrimSpace(emusicAsString(word["t"])) != "" {
					return true
				}
			}
		}
	}
	return false
}

func emusicAsString(v any) string {
	s, _ := v.(string)
	return s
}

func emusicAsFloat(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case json.Number:
		f, _ := n.Float64()
		return f
	default:
		return 0
	}
}

func cleanEmusicPlaylistName(raw string) string {
	name := strings.Join(strings.Fields(strings.TrimSpace(raw)), " ")
	runes := []rune(name)
	if len(runes) > 80 {
		name = string(runes[:80])
	}
	return name
}

func sanitizeEmusicPlaylistTrackIDs(ids []string, known map[string]struct{}) []string {
	out := make([]string, 0, len(ids))
	seen := map[string]struct{}{}
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}
		if _, ok := known[id]; !ok {
			continue
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
		if len(out) >= 200 {
			break
		}
	}
	return out
}
