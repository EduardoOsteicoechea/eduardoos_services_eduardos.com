package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEmusicLibraryRequiresEntitlement(t *testing.T) {
	app := newTestApp(false)

	guest := httptest.NewRequest(http.MethodGet, "/api/emusic/library", nil)
	guestRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(guestRec, guest)
	if guestRec.Code != http.StatusUnauthorized {
		t.Fatalf("guest library: %d", guestRec.Code)
	}

	denied := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/emusic/library", "")
	if denied.Code != http.StatusForbidden {
		t.Fatalf("member without entitlement: %d %s", denied.Code, denied.Body.String())
	}

	if err := app.grantEntitlement("member-1", productEmusic); err != nil {
		t.Fatal(err)
	}
	ok := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/emusic/library", "")
	if ok.Code != http.StatusOK {
		t.Fatalf("library: %d %s", ok.Code, ok.Body.String())
	}
	body := decodeMap(t, ok)
	sections, _ := body["sections"].([]any)
	if len(sections) != 4 {
		t.Fatalf("want 4 sections, got %d", len(sections))
	}

	admin := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/emusic/library", "")
	if admin.Code != http.StatusOK {
		t.Fatalf("admin library: %d %s", admin.Code, admin.Body.String())
	}
}

func TestEmusicLyricsPutAndNormalize(t *testing.T) {
	app := newTestApp(false)
	if err := app.grantEntitlement("member-1", productEmusic); err != nil {
		t.Fatal(err)
	}

	memberPut := app.doJSON(t, "member@eduardoos.com", http.MethodPut, "/api/emusic/renovado",
		`{"document":{"type":"emusic","version":4,"title":"Renovado","unidades":[{"t":"estrofa","l":[{"p":[{"t":"Hola","i":0},{"t":"mundo","i":0.5}]}]}]}}`)
	if memberPut.Code != http.StatusForbidden {
		t.Fatalf("member put lyrics: %d %s", memberPut.Code, memberPut.Body.String())
	}

	put := app.doJSON(t, "admin@eduardoos.com", http.MethodPut, "/api/emusic/renovado",
		`{"document":{"type":"emusic","version":4,"title":"Renovado","unidades":[{"t":"estrofa","l":[{"p":[{"t":"Hola","i":0},{"t":"mundo","i":0.5}]}]}]}}`)
	if put.Code != http.StatusOK {
		t.Fatalf("admin put lyrics: %d %s", put.Code, put.Body.String())
	}

	get := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/emusic/renovado", "")
	if get.Code != http.StatusOK {
		t.Fatalf("get lyrics: %d %s", get.Code, get.Body.String())
	}
	var doc map[string]any
	if err := json.NewDecoder(get.Body).Decode(&doc); err != nil {
		t.Fatal(err)
	}
	unidades, _ := doc["unidades"].([]any)
	unit, _ := unidades[0].(map[string]any)
	lines, _ := unit["l"].([]any)
	line, _ := lines[0].(map[string]any)
	words, _ := line["p"].([]any)
	first, _ := words[0].(map[string]any)
	if first["f"].(float64) != 0.5 {
		t.Fatalf("expected inferred end 0.5, got %v", first["f"])
	}

	lib := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/emusic/library", "")
	if !strings.Contains(lib.Body.String(), `"has_lyrics":true`) {
		t.Fatalf("library should mark renovado has_lyrics: %s", lib.Body.String())
	}
}

func TestEmusicPlaylistsAdminCRUD(t *testing.T) {
	app := newTestApp(false)
	if err := app.grantEntitlement("member-1", productEmusic); err != nil {
		t.Fatal(err)
	}

	memberCreate := app.doJSON(t, "member@eduardoos.com", http.MethodPost, "/api/emusic/playlists",
		`{"name":"Worship","track_ids":["renovado","unknown"]}`)
	if memberCreate.Code != http.StatusForbidden {
		t.Fatalf("member create playlist: %d", memberCreate.Code)
	}

	created := app.doJSON(t, "admin@eduardoos.com", http.MethodPost, "/api/emusic/playlists",
		`{"name":"Worship","track_ids":["renovado","unknown","fruto"]}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create playlist: %d %s", created.Code, created.Body.String())
	}
	createdBody := decodeMap(t, created)
	id, _ := createdBody["id"].(string)
	ids, _ := createdBody["track_ids"].([]any)
	if id == "" || len(ids) != 2 {
		t.Fatalf("expected sanitized track_ids len 2, got %#v", createdBody)
	}

	listed := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/emusic/playlists", "")
	if listed.Code != http.StatusOK || !strings.Contains(listed.Body.String(), "Worship") {
		t.Fatalf("list playlists: %d %s", listed.Code, listed.Body.String())
	}
	listedBody := decodeMap(t, listed)
	listedRows, _ := listedBody["playlists"].([]any)
	if len(listedRows) < 5 {
		t.Fatalf("want section playlists + Worship, got %d: %#v", len(listedRows), listedBody)
	}
	first, _ := listedRows[0].(map[string]any)
	if first["id"] != "section-salmo1" || first["system"] != true || first["name"] != "Salmo 1" {
		t.Fatalf("first section playlist: %#v", first)
	}
	sectionGet := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/emusic/playlists/section-salmo2", "")
	if sectionGet.Code != http.StatusOK {
		t.Fatalf("get section playlist: %d %s", sectionGet.Code, sectionGet.Body.String())
	}
	sectionBody := decodeMap(t, sectionGet)
	sectionIDs, _ := sectionBody["track_ids"].([]any)
	if sectionBody["name"] != "Salmo 2" || len(sectionIDs) != 8 {
		t.Fatalf("salmo2 section playlist: %#v", sectionBody)
	}
	sectionPut := app.doJSON(t, "admin@eduardoos.com", http.MethodPut, "/api/emusic/playlists/section-dreamer",
		`{"name":"Nope"}`)
	if sectionPut.Code != http.StatusForbidden {
		t.Fatalf("system playlist put: %d", sectionPut.Code)
	}

	updated := app.doJSON(t, "admin@eduardoos.com", http.MethodPut, "/api/emusic/playlists/"+id,
		`{"name":"Salmo set","track_ids":["viene"]}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("update playlist: %d %s", updated.Code, updated.Body.String())
	}
	updBody := decodeMap(t, updated)
	if updBody["name"] != "Salmo set" {
		t.Fatalf("name not updated: %#v", updBody)
	}

	deleted := app.doJSON(t, "admin@eduardoos.com", http.MethodDelete, "/api/emusic/playlists/"+id, "")
	if deleted.Code != http.StatusOK {
		t.Fatalf("delete playlist: %d %s", deleted.Code, deleted.Body.String())
	}
	gone := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/emusic/playlists/"+id, "")
	if gone.Code != http.StatusNotFound {
		t.Fatalf("expected gone, got %d", gone.Code)
	}
}

func TestEmusicCatalogIDsStable(t *testing.T) {
	tracks := allEmusicCatalogTracks()
	if len(tracks) != 18 {
		t.Fatalf("want 18 catalog tracks, got %d", len(tracks))
	}
	seen := map[string]struct{}{}
	for _, track := range tracks {
		if !emusicSlugRe.MatchString(track.Slug) {
			t.Fatalf("bad slug %q", track.Slug)
		}
		if _, dup := seen[track.ID]; dup {
			t.Fatalf("duplicate id %q", track.ID)
		}
		seen[track.ID] = struct{}{}
		if !strings.HasPrefix(track.Src, "/emusic/"+track.SectionID+"/") {
			t.Fatalf("bad src %q", track.Src)
		}
	}
}
