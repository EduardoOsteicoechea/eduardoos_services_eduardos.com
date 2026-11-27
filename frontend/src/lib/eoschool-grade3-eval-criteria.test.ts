import { describe, expect, it } from "vitest";
import { GRADE3_EVAL_CRITERIA } from "./eoschool-grade3-eval-criteria";

describe("grade 3 evaluation criteria", () => {
  it("keeps the bar inside grade 3", () => {
    expect(GRADE3_EVAL_CRITERIA.grade).toBe(3);
    expect(GRADE3_EVAL_CRITERIA.groups.map((group) => group.id)).toEqual([
      "lectura",
      "escritura",
      "habla",
      "matematica",
      "ciencias",
      "ingles",
      "aprender",
      "socioemocional",
      "cuerpo",
    ]);
  });

  it("gives every item a unique id, a statement and a source", () => {
    const ids = GRADE3_EVAL_CRITERIA.groups.flatMap((group) => group.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const group of GRADE3_EVAL_CRITERIA.groups) {
      expect(group.title.trim().length).toBeGreaterThan(0);
      expect(group.lede.trim().length).toBeGreaterThan(0);
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.text.trim().length).toBeGreaterThan(20);
        expect(item.source.trim().length).toBeGreaterThan(8);
      }
    }
  });

  it("does not import fourth-grade exams into the grade-3 bar", () => {
    const blob = JSON.stringify(GRADE3_EVAL_CRITERIA);
    expect(blob).not.toMatch(/PIRLS|TIMSS|Year 4|cuarto grado|4\.º grado/);
  });
});
