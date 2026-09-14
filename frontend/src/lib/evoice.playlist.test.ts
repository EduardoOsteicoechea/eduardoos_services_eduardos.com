import { describe, expect, it } from "vitest";
import {
  audioDocStem,
  audioVersion,
  buildDocPlaylists,
  docsNeedingAudio,
  filterSuperPremiumTargets,
  isPlayableAudio,
  parseAudioName,
  stemOf,
} from "./evoice.playlist";
import type { EvoiceObjectMeta } from "./evoice";

function audio(name: string, size = 1000, lastModified?: string): EvoiceObjectMeta {
  return { name, key: `evoice/u/p/audios/${name}`, size, lastModified };
}

function doc(name: string, lastModified?: string): EvoiceObjectMeta {
  return { name, key: `evoice/u/p/docs/${name}`, size: 10, lastModified };
}

describe("evoice audio filename parsing", () => {
  it("parses standard versioned mono audio", () => {
    expect(parseAudioName("hello.v1.mp3")).toEqual({ stem: "hello", version: 1 });
    expect(audioDocStem("hello.v1.mp3")).toBe("hello");
    expect(audioVersion("hello.v1.mp3")).toBe(1);
  });

  it("keeps the full stem when the document name contains .v<digits>", () => {
    // Worker writes informe.v2.v1.mp3 for doc "informe.v2.txt".
    expect(parseAudioName("informe.v2.v1.mp3")).toEqual({
      stem: "informe.v2",
      version: 1,
    });
  });

  it("parses versioned chapter audio", () => {
    expect(parseAudioName("hello.v3.c01-intro.mp3")).toEqual({
      stem: "hello",
      version: 3,
    });
  });

  it("parses legacy chapter and mono audio", () => {
    expect(parseAudioName("hello.c01-intro.mp3")).toEqual({
      stem: "hello",
      version: "legacy",
    });
    expect(parseAudioName("hello.mp3")).toEqual({
      stem: "hello",
      version: "legacy",
    });
  });

  it("stemOf strips the last extension", () => {
    expect(stemOf("report.final.pdf")).toBe("report.final");
    expect(stemOf("noext")).toBe("noext");
  });
});

describe("buildDocPlaylists", () => {
  it("groups audio under its source document stem", () => {
    const playlists = buildDocPlaylists(
      [doc("hello.txt")],
      [audio("hello.v1.mp3"), audio("hello.v1.c01-intro.mp3")],
    );
    expect(playlists).toHaveLength(1);
    expect(playlists[0].stem).toBe("hello");
    expect(playlists[0].sourceDoc?.name).toBe("hello.txt");
    expect(playlists[0].buckets[0].version).toBe(1);
    expect(playlists[0].allTracks.map((t) => t.name)).toEqual([
      "hello.v1.c01-intro.mp3",
      "hello.v1.mp3",
    ]);
  });

  it("groups a stem that itself contains .v2 correctly", () => {
    const playlists = buildDocPlaylists(
      [doc("informe.v2.txt")],
      [audio("informe.v2.v1.mp3")],
    );
    expect(playlists).toHaveLength(1);
    expect(playlists[0].stem).toBe("informe.v2");
    expect(playlists[0].buckets[0].version).toBe(1);
  });

  it("ignores generated premium/vision text as source docs", () => {
    const playlists = buildDocPlaylists(
      [doc("hello.premium.txt"), doc("hello.vision.txt"), doc("hello.txt")],
      [],
    );
    expect(playlists.map((p) => p.stem)).toEqual(["hello"]);
  });
});

describe("docsNeedingAudio", () => {
  it("includes documents with no audio", () => {
    expect(docsNeedingAudio([doc("new.txt", "2026-01-02T00:00:00Z")], [])).toEqual([
      "new.txt",
    ]);
  });

  it("excludes documents whose audio is newer", () => {
    const docs = [doc("hello.txt", "2026-01-01T00:00:00Z")];
    const audios = [audio("hello.v1.mp3", 1000, "2026-01-02T00:00:00Z")];
    expect(docsNeedingAudio(docs, audios)).toEqual([]);
  });

  it("includes documents changed after their audio", () => {
    const docs = [doc("hello.txt", "2026-01-03T00:00:00Z")];
    const audios = [audio("hello.v1.mp3", 1000, "2026-01-02T00:00:00Z")];
    expect(docsNeedingAudio(docs, audios)).toEqual(["hello.txt"]);
  });

  it("honors an explicit only-list", () => {
    const docs = [doc("a.txt"), doc("b.txt")];
    expect(docsNeedingAudio(docs, [], ["b.txt"])).toEqual(["b.txt"]);
  });
});

describe("filterSuperPremiumTargets", () => {
  it("splits eligible and rejected documents", () => {
    expect(filterSuperPremiumTargets(["a.pdf", "b.txt", "c.png"])).toEqual({
      ok: ["a.pdf", "c.png"],
      rejected: ["b.txt"],
    });
  });
});

describe("isPlayableAudio", () => {
  it("rejects empty encodes", () => {
    expect(isPlayableAudio(audio("hello.v1.mp3", 0))).toBe(false);
    expect(isPlayableAudio(audio("hello.v1.mp3", 100))).toBe(true);
  });
});
