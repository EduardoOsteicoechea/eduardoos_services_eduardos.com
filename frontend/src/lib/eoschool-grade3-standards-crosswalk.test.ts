import { describe, expect, it } from "vitest";
import { MPPE_NATIONAL_REQUIREMENTS } from "./eoschool-mppe-national-requirements";
import { GRADE3_STANDARDS_CROSSWALK, STANDARD_FITS } from "./eoschool-grade3-standards-crosswalk";
import {
  STANDARDS_PROGRESS_THROUGH_DAY,
  foreignStars,
  learningsCoveredThroughDay,
  venezuelaStars,
} from "./eoschool-grade3-standards-score";

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

  it("scores a single-year direct match above a band, a partial, and an earlier grade", () => {
    expect(foreignStars({ code: "RI.3.3", text: "x", fit: "directo", href: "https://example.com" })).toBe(5);
    expect(foreignStars({ code: "Ma/Y4/NPV", text: "x", fit: "directo", href: "https://example.com" })).toBe(5);
    expect(foreignStars({ code: "En/Y3-4/Reading", text: "x", fit: "directo", href: "https://example.com" })).toBe(4);
    expect(foreignStars({ code: "Hi/KS2", text: "x", fit: "directo", href: "https://example.com" })).toBe(4);
    expect(foreignStars({ code: "4.NBT.A.2", text: "x", fit: "parcial", href: "https://example.com" })).toBe(3);
    expect(foreignStars({ code: "K.G.A.1", text: "x", fit: "anterior", href: "https://example.com" })).toBe(2);
    expect(foreignStars({ code: "C3 D2.His.1.3-5", text: "x", fit: "nacional", href: "https://example.com" })).toBe(2);
    const nacional = { code: "Hi/KS2", text: "x", fit: "nacional" as const, href: "https://example.com" };
    const anterior = { code: "RF.K.1.d", text: "x", fit: "anterior" as const, href: "https://example.com" };
    const directo = { code: "RI.3.3", text: "x", fit: "directo" as const, href: "https://example.com" };
    expect(venezuelaStars(nacional, nacional)).toBe(5);
    expect(venezuelaStars(anterior, anterior)).toBe(2);
    expect(venezuelaStars(directo, directo)).toBe(4);
  });

  it("marks the grade-3 learnings already scheduled through day 38", () => {
    expect(STANDARDS_PROGRESS_THROUGH_DAY).toBe(38);
    const covered = learningsCoveredThroughDay(STANDARDS_PROGRESS_THROUGH_DAY);
    expect(covered.has("Ejecuta secuencias de acciones interpretando textos instruccionales.")).toBe(true);
    expect(
      covered.has(
        "Conoce los períodos de la Historia de Venezuela: indígena, colonial, republicano agrícola y republicano petrolero.",
      ),
    ).toBe(true);
    expect(
      covered.has(
        "Observa, describe, identifica y clasifica mezclas homogéneas y heterogéneas, a partir de experiencias prácticas.",
      ),
    ).toBe(false);
  });
});
