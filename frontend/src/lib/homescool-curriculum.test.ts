import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  curriculumCellKey,
  findCurriculumClass,
  toEoschoolDocument,
  type HomescoolCurriculum,
} from "./homescool-curriculum";

describe("homescool curriculum", () => {
  it("loads dedicated curriculum.json with all classes", () => {
    const raw = readFileSync(
      join(process.cwd(), "public/homescool/curriculum.json"),
      "utf8",
    );
    const data = JSON.parse(raw) as HomescoolCurriculum;
    expect(data.format).toBe("homescool-curriculum");
    expect(data.version).toBe(1);
    expect(data.classes.length).toBeGreaterThanOrEqual(60);
    expect(data.classCount).toBe(data.classes.length);
    const keys = new Set(data.classes.map((c) => c.key));
    expect(keys.size).toBe(data.classes.length);
    expect(keys.has("c3-w2-d1-l6-mat")).toBe(true);
  });

  it("finds a class and strips metadata for renderer / API body", () => {
    const raw = readFileSync(
      join(process.cwd(), "public/homescool/curriculum.json"),
      "utf8",
    );
    const data = JSON.parse(raw) as HomescoolCurriculum;
    const row = findCurriculumClass(data, { cycle: 3, week: 2, day: 1, subject: "mat" });
    expect(row?.key).toBe(curriculumCellKey(3, 2, 1, 6, "mat"));
    const doc = toEoschoolDocument(row!);
    expect(doc.format).toBe("eoschool");
    expect((doc as { key?: string }).key).toBeUndefined();
    expect(doc.subject).toBe("mat");
    expect(doc.quiz.questions.length).toBeGreaterThan(0);
  });
});
