import { describe, expect, it } from "vitest";
import { isMatTablesLayout, matPracticeDensity } from "./homescool-mat-tables";
import type { EoschoolDocument } from "./homescool";

describe("homescool-mat-tables", () => {
  it("maps day to practice density", () => {
    expect(matPracticeDensity(1)).toBe(3);
    expect(matPracticeDensity(2)).toBe(6);
    expect(matPracticeDensity(3)).toBe(9);
    expect(matPracticeDensity(4)).toBe(12);
    expect(matPracticeDensity(5)).toBe(12);
  });

  it("detects mat week 2 layout", () => {
    const doc = { subject: "mat", week: 2, day: 1 } as EoschoolDocument;
    expect(isMatTablesLayout(doc)).toBe(true);
    expect(isMatTablesLayout({ subject: "esp", week: 2, day: 1 } as EoschoolDocument)).toBe(false);
    expect(isMatTablesLayout({ subject: "mat", week: 1, day: 1 } as EoschoolDocument)).toBe(false);
  });
});
