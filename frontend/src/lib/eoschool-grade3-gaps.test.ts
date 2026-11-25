import { describe, expect, it } from "vitest";
import { GRADE3_PROGRAM_GAPS } from "./eoschool-grade3-gaps";
import { MPPE_NATIONAL_REQUIREMENTS } from "./eoschool-mppe-national-requirements";

const mppeLearnings = MPPE_NATIONAL_REQUIREMENTS.areas.flatMap((area) =>
  area.grade3Units.flatMap((unit) => unit.learnings),
);

describe("grade 3 programme gaps", () => {
  it("lists language, math, science and identity, each with a US cell and an England cell", () => {
    expect(GRADE3_PROGRAM_GAPS.areas.map((area) => area.id)).toEqual(["len", "mat", "cie", "ide"]);
    for (const area of GRADE3_PROGRAM_GAPS.areas) {
      expect(area.rows.length).toBeGreaterThan(0);
      for (const row of area.rows) {
        expect(row.learning.toLowerCase()).toContain("no pide");
        expect(mppeLearnings).not.toContain(row.learning);
        for (const cell of [row.us, row.uk]) {
          expect(cell.code.trim().length).toBeGreaterThan(0);
          expect(cell.text.trim().length).toBeGreaterThan(0);
          expect(cell.href.startsWith("https://")).toBe(true);
        }
      }
    }
  });

  it("names skills the grade-3 list does not state", () => {
    const blob = mppeLearnings.join("\n").toLowerCase();
    for (const missing of ["fracción", "perímetro", "redonde", "fósil", "imán"]) {
      expect(blob).not.toContain(missing);
    }
  });
});
