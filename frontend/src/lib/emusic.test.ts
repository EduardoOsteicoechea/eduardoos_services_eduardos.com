import { describe, expect, it } from "vitest";
import { EMUSIC_SECTIONS, allEmusicTracks } from "./emusic";

describe("emusic catalog", () => {
  it("exposes four sections with matching track counts and unique slugs", () => {
    expect(EMUSIC_SECTIONS).toHaveLength(4);

    const salmo1 = EMUSIC_SECTIONS.find((s) => s.id === "salmo1");
    expect(salmo1?.tracks).toHaveLength(7);

    const salmo2 = EMUSIC_SECTIONS.find((s) => s.id === "salmo2");
    expect(salmo2?.tracks).toHaveLength(8);

    const dreamer = EMUSIC_SECTIONS.find((s) => s.id === "dreamer");
    expect(dreamer?.tracks).toHaveLength(2);

    const learner = EMUSIC_SECTIONS.find((s) => s.id === "learner");
    expect(learner?.tracks).toHaveLength(1);

    const tracks = allEmusicTracks();
    expect(tracks).toHaveLength(18);
    const slugs = tracks.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const track of tracks) {
      expect(track.slug).toBe(track.id);
    }
  });

  it("encodes spaces in track URLs", () => {
    const renovado = allEmusicTracks().find((t) => t.id === "renovado");
    expect(renovado?.src).toBe("/emusic/salmo1/Salmo%201%20-%20Renovado.mp3");
    const quiero = allEmusicTracks().find((t) => t.id === "quiero");
    expect(quiero?.src).toContain("%20");
    expect(quiero?.src).toContain("Quiero");

    const refugio = allEmusicTracks().find((t) => t.id === "refugio");
    expect(refugio?.src).toBe("/emusic/salmo2/Salmo%202%20-%20Refugio..mp3");
  });
});
