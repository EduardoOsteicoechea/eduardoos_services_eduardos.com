import { describe, expect, it } from "vitest";
import { EMUSIC_SECTIONS, allEmusicTracks } from "./emusic";

describe("emusic catalog", () => {
  it("exposes four sections with matching track counts", () => {
    expect(EMUSIC_SECTIONS).toHaveLength(4);

    const salmo1 = EMUSIC_SECTIONS.find((s) => s.id === "salmo1");
    expect(salmo1?.title).toBe("Salmo 1");
    expect(salmo1?.tracks).toHaveLength(7);

    const salmo2 = EMUSIC_SECTIONS.find((s) => s.id === "salmo2");
    expect(salmo2?.title).toBe("Salmo 2");
    expect(salmo2?.tracks).toHaveLength(8);

    const dreamer = EMUSIC_SECTIONS.find((s) => s.id === "dreamer");
    expect(dreamer?.title).toBe("Dreamer");
    expect(dreamer?.tracks).toHaveLength(2);

    const learner = EMUSIC_SECTIONS.find((s) => s.id === "learner");
    expect(learner?.title).toBe("Learner");
    expect(learner?.tracks).toHaveLength(1);

    expect(allEmusicTracks()).toHaveLength(18);
  });

  it("keeps track ids unique across sections", () => {
    const ids = allEmusicTracks().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("encodes spaces in track URLs", () => {
    const renovado = allEmusicTracks().find((t) => t.id === "renovado");
    expect(renovado?.src).toBe("/emusic/salmo1/Salmo%201%20-%20Renovado.mp3");
    const quiero = allEmusicTracks().find((t) => t.id === "quiero");
    expect(quiero?.src).toContain("%20");
    expect(quiero?.src).toContain("Quiero");

    const refugio = allEmusicTracks().find((t) => t.id === "refugio");
    expect(refugio?.src).toBe("/emusic/salmo2/Salmo%202%20-%20Refugio..mp3");

    const sigueme = allEmusicTracks().find((t) => t.id === "sigueme-remix");
    expect(sigueme?.src).toContain("/emusic/dreamer/");
    expect(sigueme?.src).toContain("Remix");
  });
});
