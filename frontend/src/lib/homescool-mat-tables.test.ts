import { describe, expect, it } from "vitest";
import { isMatTablesLayout, matLevelsForWeek, matPracticeDensity, matTableRangeLabel } from "./homescool-mat-tables";
import type { EoschoolDocument } from "./homescool";

describe("homescool-mat-tables", () => {
  it("maps day to practice density", () => {
    expect(matPracticeDensity(1)).toBe(3);
    expect(matPracticeDensity(2)).toBe(6);
    expect(matPracticeDensity(3)).toBe(9);
    expect(matPracticeDensity(4)).toBe(12);
    expect(matPracticeDensity(5)).toBe(12);
  });

  it("detects mat week 1–2 table layout", () => {
    expect(isMatTablesLayout({ subject: "mat", week: 1, day: 1 } as EoschoolDocument)).toBe(true);
    expect(isMatTablesLayout({ subject: "mat", week: 2, day: 1 } as EoschoolDocument)).toBe(true);
    expect(isMatTablesLayout({ subject: "esp", week: 2, day: 1 } as EoschoolDocument)).toBe(false);
    expect(isMatTablesLayout({ subject: "mat", week: 3, day: 1 } as EoschoolDocument)).toBe(false);
  });

  it("uses 1–12 on week 1 and 5–16 on week 2", () => {
    expect(matTableRangeLabel(1)).toBe("1–12");
    expect(matTableRangeLabel(2)).toBe("5–16");
    expect(matLevelsForWeek(1).flatMap((l) => l.tables)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(matLevelsForWeek(2).flatMap((l) => l.tables)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });
});
