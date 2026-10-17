import { describe, expect, it } from "vitest";
import { EMUSIC_SECTIONS, allEmusicTracks } from "./emusic";

describe("emusic catalog", () => {
  it("exposes Salmo 1 with seven tracks", () => {
    expect(EMUSIC_SECTIONS).toHaveLength(1);
    const salmo1 = EMUSIC_SECTIONS[0];
    expect(salmo1.id).toBe("salmo1");
    expect(salmo1.title).toBe("Salmo 1");
    expect(salmo1.tracks).toHaveLength(7);
    expect(allEmusicTracks()).toHaveLength(7);
  });

  it("encodes spaces in track URLs", () => {
    const renovado = allEmusicTracks().find((t) => t.id === "renovado");
    expect(renovado?.src).toBe("/emusic/salmo1/Salmo%201%20-%20Renovado.mp3");
    const quiero = allEmusicTracks().find((t) => t.id === "quiero");
    expect(quiero?.src).toContain("%20");
    expect(quiero?.src).toContain("Quiero");
  });
});
