import { describe, expect, it } from "vitest";
import { MPPE_NATIONAL_REQUIREMENTS } from "./eoschool-mppe-national-requirements";
import { GRADE3_STANDARDS_CROSSWALK, STANDARD_FITS } from "./eoschool-grade3-standards-crosswalk";

const fits = new Set<string>(STANDARD_FITS);

describe("grade 3 standards crosswalk", () => {
  it("covers every MPPE grade-3 learning once, in order", () => {
    const byId = new Map(GRADE3_STANDARDS_CROSSWALK.areas.map((area) => [area.id, area]));
    expect([...byId.keys()].sort()).toEqual(["cie", "ide", "len", "mat"]);
    for (const area of MPPE_NATIONAL_REQUIREMENTS.areas) {
      const rows = byId.get(area.id as "len" | "mat" | "cie" | "ide")?.rows ?? [];
      const expected = area.grade3Units.flatMap((unit) =>
        unit.learnings.map((learning) => ({ unitTitle: unit.title, learning })),
      );
      expect(rows.map((row) => ({ unitTitle: row.unitTitle, learning: row.learning }))).toEqual(expected);
    }
  });

  it("gives each row a US cell and an England cell with a known fit", () => {
    for (const area of GRADE3_STANDARDS_CROSSWALK.areas) {
      expect(area.icon.trim().length).toBeGreaterThan(0);
      for (const row of area.rows) {
        for (const cell of [row.us, row.uk]) {
          expect(fits.has(cell.fit)).toBe(true);
          expect(cell.code.trim().length).toBeGreaterThan(0);
          expect(cell.text.trim().length).toBeGreaterThan(0);
          expect(cell.href.startsWith("https://")).toBe(true);
        }
      }
    }
  });
});
