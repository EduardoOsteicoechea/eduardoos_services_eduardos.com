package main

import (
	"net/url"
	"path"
	"regexp"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

const productEmusic = "emusic"

var emusicSlugRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type EmusicCatalogTrack struct {
	ID        string
	SectionID string
	Title     string
	FileName  string
	Slug      string
	Src       string
}

type EmusicCatalogSection struct {
	ID     string
	Title  string
	Tracks []EmusicCatalogTrack
}

func stripEmusicDiacritics(raw string) string {
	decomposed := norm.NFD.String(raw)
	var b strings.Builder
	b.Grow(len(decomposed))
	for _, r := range decomposed {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func cleanEmusicSlug(raw string) string {
	raw = strings.TrimSuffix(strings.ToLower(strings.TrimSpace(raw)), ".emusic")
	raw = strings.TrimSuffix(raw, path.Ext(raw))
	raw = stripEmusicDiacritics(raw)
	raw = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(raw, "-")
	return strings.Trim(raw, "-")
}

func emusicTrackSrc(sectionID, fileName string) string {
	return "/emusic/" + sectionID + "/" + url.PathEscape(fileName)
}

func emusicCatalogTrack(sectionID, id, title, fileName string) EmusicCatalogTrack {
	return EmusicCatalogTrack{
		ID:        id,
		SectionID: sectionID,
		Title:     title,
		FileName:  fileName,
		Slug:      id,
		Src:       emusicTrackSrc(sectionID, fileName),
	}
}

// emusicCatalog mirrors frontend/src/lib/emusic.ts — keep in lockstep.
func emusicCatalog() []EmusicCatalogSection {
	const (
		salmo1  = "salmo1"
		salmo2  = "salmo2"
		dreamer = "dreamer"
		learner = "learner"
	)
	return []EmusicCatalogSection{
		{
			ID: salmo1, Title: "Salmo 1",
			Tracks: []EmusicCatalogTrack{
				emusicCatalogTrack(salmo1, "renovado", "Renovado", "Salmo 1 - Renovado.mp3"),
				emusicCatalogTrack(salmo1, "medito", "Medito", "Salmo 1 - medito.mp3"),
				emusicCatalogTrack(salmo1, "quiero", "Quiero (Acoustic Pop Rock)", "Salmo 1 - Quiero - Acoustic Pop Rock - D.mp3"),
				emusicCatalogTrack(salmo1, "fruto", "Fruto", "Salmo 1 - fruto.mp3"),
				emusicCatalogTrack(salmo1, "resucitado", "Resucitado", "Salmo 1 - Resucitado.mp3"),
				emusicCatalogTrack(salmo1, "justificado", "Justificado (Balada)", "Salmo 1 - Justificado - Balada - D.mp3"),
				emusicCatalogTrack(salmo1, "prosperado", "Prosperado", "Salmo 1 - Prosperado.mp3"),
			},
		},
		{
			ID: salmo2, Title: "Salmo 2",
			Tracks: []EmusicCatalogTrack{
				emusicCatalogTrack(salmo2, "amonestacion", "Amonestación", "Salmo 2 - Amonestación.mp3"),
				emusicCatalogTrack(salmo2, "amonestado", "Amonestado", "Salmo 2 - Amonestado - G.mp3"),
				emusicCatalogTrack(salmo2, "bienaventurado", "Bienaventurado", "Salmo 2 - Bienaventurado.mp3"),
				emusicCatalogTrack(salmo2, "conflicto", "Conflicto", "Salmo 2 - Conflicto - G.mp3"),
				emusicCatalogTrack(salmo2, "posesion", "Posesión", "Salmo 2 - Posesión.mp3"),
				emusicCatalogTrack(salmo2, "recibimos-el-reino", "Recibimos el Reino", "Salmo 2 - Recibimos el Reino.mp3"),
				emusicCatalogTrack(salmo2, "refugio", "Refugio", "Salmo 2 - Refugio..mp3"),
				emusicCatalogTrack(salmo2, "viene", "Viene", "Salmo 2 - Viene.mp3"),
			},
		},
		{
			ID: dreamer, Title: "Dreamer",
			Tracks: []EmusicCatalogTrack{
				emusicCatalogTrack(dreamer, "dreamer-me-ha-hecho-bien", "Me ha hecho bien", "Me ha hecho bien E 2.m4a.mp3"),
				emusicCatalogTrack(dreamer, "sigueme-remix", "Sígueme (Remix)", "sígueme  (Remix).mp3"),
			},
		},
		{
			ID: learner, Title: "Learner",
			Tracks: []EmusicCatalogTrack{
				emusicCatalogTrack(learner, "learner-me-ha-hecho-bien", "Me ha hecho bien", "Me ha hecho bien E 2.m4a.mp3"),
			},
		},
	}
}

func allEmusicCatalogTracks() []EmusicCatalogTrack {
	sections := emusicCatalog()
	out := make([]EmusicCatalogTrack, 0, 18)
	for _, section := range sections {
		out = append(out, section.Tracks...)
	}
	return out
}

func emusicCatalogByID(id string) (EmusicCatalogTrack, bool) {
	for _, track := range allEmusicCatalogTracks() {
		if track.ID == id {
			return track, true
		}
	}
	return EmusicCatalogTrack{}, false
}

func emusicCatalogBySlug(slug string) (EmusicCatalogTrack, bool) {
	slug = strings.TrimSpace(slug)
	for _, track := range allEmusicCatalogTracks() {
		if track.Slug == slug {
			return track, true
		}
	}
	return EmusicCatalogTrack{}, false
}

func knownEmusicCatalogIDs() map[string]struct{} {
	known := make(map[string]struct{}, 18)
	for _, track := range allEmusicCatalogTracks() {
		known[track.ID] = struct{}{}
	}
	return known
}
