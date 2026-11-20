import { describe, expect, it } from "vitest";
import {
  EXPO_SHEETS,
  expoFieldIds,
  outlineFromAnswers,
  outlinePlainText,
  outlineStorageId,
  parseExpoAnswers,
} from "./expo-semana7-dia5";

describe("expo semana 7 día 5", () => {
  it("tiene una hoja por materia y los campos no se repiten", () => {
    expect(EXPO_SHEETS.map((s) => s.id)).toEqual(["bib", "ide", "len", "mat", "cie"]);
    const ids = expoFieldIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const sheet of EXPO_SHEETS) {
      expect(sheet.questions.length).toBeGreaterThan(0);
      expect(sheet.beats).toHaveLength(4);
      const placed = sheet.beats.flatMap((beat) => beat.fieldIds);
      expect(placed.sort()).toEqual(sheet.questions.map((q) => q.id).sort());
    }
  });

  it("arma el esquema solo con lo que ya está escrito", () => {
    const bib = EXPO_SHEETS[0];
    const beats = outlineFromAnswers(bib, { "bib-q1": "  El maná y el pan alimentan.  ", "bib-q3": "" });
    expect(beats[0]).toEqual({ title: "El desierto", lines: ["El maná y el pan alimentan."] });
    expect(beats[1].lines).toEqual([]);
    const saved = parseExpoAnswers(
      JSON.stringify({ [outlineStorageId("bib")]: outlinePlainText(bib, { "bib-q1": "El maná alimenta." }) }),
    );
    expect(saved[outlineStorageId("bib")]).toContain("1. El desierto");
    expect(saved[outlineStorageId("bib")]).toContain("El maná alimenta.");
  });

  it("recupera solo respuestas de campos de esta semana", () => {
    const raw = JSON.stringify({
      "bib-s1": "Dios dio maná.",
      "no-existe": "fuera",
      "bib-c1": "on",
      "meta-name": "Elías",
      malo: 4,
    });
    expect(parseExpoAnswers(raw)).toEqual({
      "bib-s1": "Dios dio maná.",
      "bib-c1": "on",
      "meta-name": "Elías",
    });
    expect(parseExpoAnswers("no-json")).toEqual({});
    expect(parseExpoAnswers(null)).toEqual({});
  });
});
