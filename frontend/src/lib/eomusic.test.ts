import { afterEach, describe, expect, it, vi } from "vitest";
import { appendUniqueId, isWordActive, lyricsFromPlainText, markWordAtTime, mergeLibraryTracks, moveItemIndex, musicTrackSlug, nextPlaylistIndex, normalizeEmusicDocument, playlistQueue, setWordEndTime, sortMusicTracks, tracksNotInPlaylist } from "./eomusic";

describe("eomusic helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("slugs accented filenames the same way as the Go API", () => {
    expect(musicTrackSlug("Ayúdame. Cánticos espirituales..mp3")).toBe("ayudame-canticos-espirituales");
  });

  it("infers word end times and highlights the active word", () => {
    const doc = normalizeEmusicDocument({
      type: "emusic",
      version: 4,
      unidades: [{ t: "estrofa", l: [{ p: [{ t: "Es", i: 0 }, { t: "más", i: 0.42 }] }] }],
    });
    const words = doc.unidades?.[0].l[0].p || [];
    expect(words[0].f).toBe(0.42);
    expect(isWordActive(words[0], 0.2)).toBe(true);
    expect(isWordActive(words[1], 0.2)).toBe(false);
  });

  it("queues every track in title order and advances through the playlist", () => {
    const queued = sortMusicTracks([
      { title: "Venid" },
      { title: "Ayúdame" },
      { title: "Cristo" },
    ]);
    expect(queued.map((track) => track.title)).toEqual(["Ayúdame", "Cristo", "Venid"]);
    expect(nextPlaylistIndex(-1, queued.length, false)).toBe(0);
    expect(nextPlaylistIndex(0, queued.length, false)).toBe(1);
    expect(nextPlaylistIndex(2, queued.length, false)).toBeNull();
    expect(nextPlaylistIndex(2, queued.length, true)).toBe(0);
  });

  it("moves a track up and keeps only checked songs in the playlist", () => {
    const library = [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
      { id: "c", title: "C" },
    ];
    expect(moveItemIndex(library, 2, -1).map((track) => track.id)).toEqual(["a", "c", "b"]);
    expect(moveItemIndex(library, 0, -1).map((track) => track.id)).toEqual(["a", "b", "c"]);
    expect(playlistQueue(library, ["c", "a"]).map((track) => track.id)).toEqual(["a", "c"]);
    expect(mergeLibraryTracks(library.slice(0, 2), [{ id: "c", title: "C" }, { id: "a", title: "A" }]).map((track) => track.id)).toEqual(["a", "c"]);
    expect(tracksNotInPlaylist(library, ["a", "c"]).map((track) => track.id)).toEqual(["b"]);
    expect(appendUniqueId(["a"], "b")).toEqual(["a", "b"]);
    expect(appendUniqueId(["a", "b"], "a")).toEqual(["a", "b"]);
  });

  it("builds timed lyrics from pasted text and stamps the playing time", () => {
    const doc = lyricsFromPlainText("Señor mi Dios\n\nCORO\nTe adoro", "Reposo");
    expect(doc.unidades?.map((unit) => unit.t)).toEqual(["estrofa", "coro"]);
    expect(doc.unidades?.[0].l[0].p.map((word) => word.t)).toEqual(["Señor", "mi", "Dios"]);
    const first = { unit: 0, line: 0, word: 0 };
    const marked = markWordAtTime(doc, first, 1.25);
    expect(marked.doc.unidades?.[0].l[0].p[0].i).toBe(1.25);
    expect(marked.next).toEqual({ unit: 0, line: 0, word: 1 });
    const ended = setWordEndTime(marked.doc, first, 1.8);
    expect(ended.unidades?.[0].l[0].p[0].f).toBe(1.8);
    const nextMark = markWordAtTime(ended, marked.next!, 2);
    expect(nextMark.doc.unidades?.[0].l[0].p[0].f).toBe(2);
    expect(nextMark.doc.unidades?.[0].l[0].p[1].i).toBe(2);
  });
});
