import { describe, expect, it } from "vitest";
import {
  isMatTablesLayout,
  matLevelsForWeek,
  matPracticeDensity,
  matTableRangeLabel,
  renderMatTablesPages,
} from "./homescool-mat-tables";
import type { EoschoolDocument } from "./homescool";
import {
  subjectChipText,
  subjectClassNumber,
  subjectDisplayName,
  HOMESCOOL_SUBJECTS_ACTIVE,
  isHomescoolSubjectPaused,
} from "./homescool-subjects";

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

  it("puts class number 5 in the mat letter header", () => {
    const doc = {
      format: "eoschool",
      version: 1,
      cycle: 3,
      week: 2,
      day: 1,
      level: 6,
      subject: "mat",
      locale: "es",
      title: "Tablas de multiplicar",
      lesson: { kind: "intro", points: [], summary: "" },
      quiz: { questionCount: 0, questions: [] },
    } as EoschoolDocument;
    expect(subjectClassNumber("mat")).toBe(5);
    const pages = renderMatTablesPages(doc);
    const num = pages[0]?.querySelector(".homescool-mat__class-no");
    expect(num?.textContent).toBe("5");
  });
});

describe("homescool-subjects", () => {
  it("exposes full Spanish labels for tooltips", () => {
    expect(subjectDisplayName("mat")).toBe("Matemáticas");
    expect(subjectDisplayName("pro")).toBe("Proyecto");
    expect(subjectDisplayName("teb")).toBe("Teología bíblica");
  });

  it("pauses teb and exe and numbers active subjects 1–10", () => {
    expect(isHomescoolSubjectPaused("teb")).toBe(true);
    expect(isHomescoolSubjectPaused("exe")).toBe(true);
    expect(isHomescoolSubjectPaused("mat")).toBe(false);
    expect(HOMESCOOL_SUBJECTS_ACTIVE).not.toContain("teb");
    expect(HOMESCOOL_SUBJECTS_ACTIVE).not.toContain("exe");
    expect(HOMESCOOL_SUBJECTS_ACTIVE[0]).toBe("pro");
    expect(subjectClassNumber("pro")).toBe(1);
    expect(subjectClassNumber("mat")).toBe(5);
    expect(subjectClassNumber("LT")).toBe(7);
    expect(subjectClassNumber("geo")).toBe(8);
    expect(subjectChipText("geo")).toBe("geo");
    expect(subjectChipText("LT")).toBe("LinT");
  });
});
