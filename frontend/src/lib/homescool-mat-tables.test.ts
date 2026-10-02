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

  it("formats mat letter header as N - Materia - Titulo", () => {
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
    expect(subjectClassNumber("mat")).toBe(7);
    const pages = renderMatTablesPages(doc);
    expect(pages[0]?.querySelector(".homescool-mat__class-no")).toBeNull();
    expect(pages[0]?.querySelector(".homescool-mat__heading")?.textContent).toBe(
      "7 - Matemáticas - Tablas de multiplicar",
    );
  });
});

describe("homescool-subjects", () => {
  it("exposes full Spanish labels for tooltips", () => {
    expect(subjectDisplayName("mat")).toBe("Matemáticas");
    expect(subjectDisplayName("pro")).toBe("Proyecto");
    expect(subjectDisplayName("teb")).toBe("Teología bíblica");
  });

  it("numbers subjects 1–12 in canonical menu order (teb…pro)", () => {
    expect(isHomescoolSubjectPaused("teb")).toBe(false);
    expect(isHomescoolSubjectPaused("exe")).toBe(false);
    expect(HOMESCOOL_SUBJECTS_ACTIVE[0]).toBe("teb");
    expect(HOMESCOOL_SUBJECTS_ACTIVE[HOMESCOOL_SUBJECTS_ACTIVE.length - 1]).toBe("pro");
    expect(subjectClassNumber("teb")).toBe(1);
    expect(subjectClassNumber("exe")).toBe(2);
    expect(subjectClassNumber("LT")).toBe(3);
    expect(subjectClassNumber("his")).toBe(4);
    expect(subjectClassNumber("geo")).toBe(5);
    expect(subjectClassNumber("art")).toBe(6);
    expect(subjectClassNumber("mat")).toBe(7);
    expect(subjectClassNumber("esp")).toBe(8);
    expect(subjectClassNumber("ing")).toBe(9);
    expect(subjectClassNumber("lat")).toBe(10);
    expect(subjectClassNumber("cie")).toBe(11);
    expect(subjectClassNumber("pro")).toBe(12);
    expect(subjectChipText("geo")).toBe("geo");
    expect(subjectChipText("LT")).toBe("LinT");
  });
});
