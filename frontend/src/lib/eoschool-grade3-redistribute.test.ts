import { describe, expect, it } from "vitest";
import { MPPE_40WEEK_CURRICULUM } from "./eoschool-mppe-40week-curriculum";
import { GRADE3_PROGRAM_GAPS } from "./eoschool-grade3-gaps";
import {
  GRADE3_GAP_LESSONS,
  planBlocks,
  redistributeGrade3FromDay38,
} from "../../scripts/grade3-redistribute.mjs";
import { aiGroupsForDay, aiOnThisDay } from "./eoschool-ai-signature";

function textsOf(block: {
  dayKind?: string;
  len?: { text: string }[];
  mat?: { text: string }[];
  cie?: { text: string }[];
  identity?: { learnings?: string[] };
}): string[] {
  if (block.dayKind === "holiday") return [];
  return [
    ...(block.len ?? []).map((ref) => ref.text),
    ...(block.mat ?? []).map((ref) => ref.text),
    ...(block.cie ?? []).map((ref) => ref.text),
    ...(block.identity?.learnings ?? []),
  ];
}

describe("grade 3 redistribute from day 38", () => {
  it("keeps days 1–37, moves day 38 to 25 nov, and swaps repeats for gaps", () => {
    const before = structuredClone(MPPE_40WEEK_CURRICULUM);
    const early = planBlocks(before).filter((item) => item.dayInPlan < 38);
    const seen = new Set(early.flatMap((item) => textsOf(item.block)));
    const keepers = new Set(
      planBlocks(before)
        .filter((item) => item.dayInPlan >= 38)
        .flatMap((item) => textsOf(item.block))
        .filter((text) => !seen.has(text)),
    );
    const day38Before = planBlocks(before).find((item) => item.dayInPlan === 38);
    const bibleBefore = structuredClone(day38Before?.block.bible);

    const after = redistributeGrade3FromDay38(structuredClone(MPPE_40WEEK_CURRICULUM));
    const afterBlocks = planBlocks(after);

    expect(afterBlocks.filter((item) => item.dayInPlan < 38).map((item) => item.block)).toEqual(
      early.map((item) => item.block),
    );

    const day38 = afterBlocks.find((item) => item.dayInPlan === 38);
    expect(day38?.block.calendarDate).toBe("2026-11-25");
    expect(day38?.block.bible).toEqual(bibleBefore);

    const teachAfter = afterBlocks.filter(
      (item) => item.dayInPlan >= 38 && item.block.dayKind === "teach",
    );
    for (const item of teachAfter) {
      for (const text of textsOf(item.block)) {
        expect(seen.has(text)).toBe(false);
      }
    }

    const afterTexts = new Set(afterBlocks.filter((item) => item.dayInPlan >= 38).flatMap((item) => textsOf(item.block)));
    for (const text of keepers) expect(afterTexts.has(text)).toBe(true);

    const christmas = afterBlocks.find((item) => item.block.calendarDate === "2026-12-25");
    expect(christmas?.block.dayKind).toBe("holiday");
    expect(christmas?.block.mat).toBeUndefined();
    expect(christmas?.block.scheduledSections).toEqual(["bib"]);

    const twice = redistributeGrade3FromDay38(structuredClone(after));
    expect(planBlocks(twice).map((item) => item.block)).toEqual(afterBlocks.map((item) => item.block));
  });

  it("uses the same gap lessons as the standards list", () => {
    for (const area of GRADE3_PROGRAM_GAPS.areas) {
      const lessons = GRADE3_GAP_LESSONS[area.id as keyof typeof GRADE3_GAP_LESSONS];
      expect(lessons.map((lesson) => lesson.unitTitle)).toEqual(area.rows.map((row) => row.unitTitle));
      expect(lessons.map((lesson) => lesson.text)).toEqual(area.rows.map((row) => row.us.text));
    }
  });
});

describe("inteligencia artificial from day 38", () => {
  it("starts on day 38 with ten photos and then rotates questions", () => {
    expect(aiOnThisDay(37, "teach")).toBe(false);
    expect(aiOnThisDay(38, "holiday")).toBe(false);
    expect(aiOnThisDay(38, "teach")).toBe(true);
    expect(aiGroupsForDay(38)[0].objective).toBe("Diez fotos");
    expect(aiGroupsForDay(38)[0].learnings[0]).toBe(
      "Fotografías 10 piezas, la IA describe lo que se ve y marca repetidos, tú confirmas.",
    );
    expect(aiGroupsForDay(39)[0].objective).toBe("Inventario");
    expect(aiGroupsForDay(40)[0].objective).toBe("Página");
    expect(aiGroupsForDay(43)[0].objective).toBe("Revisión");
    expect(aiGroupsForDay(44)[0].objective).toBe("Inventario");
  });
});
