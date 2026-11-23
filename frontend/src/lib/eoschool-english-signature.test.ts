import { describe, expect, it } from "vitest";
import { scheduledSectionsForBlock } from "./eoschool-mppe-curriculum-view";
import type { CurriculumBlock } from "./eoschool-mppe-28week-curriculum";
import {
  ENGLISH_FROM_WEEK,
  englishGroupsForDay,
  englishOnThisDay,
  englishSheetLink,
  englishWeekday,
} from "./eoschool-english-signature";

function block(dayKind: CurriculumBlock["dayKind"]): CurriculumBlock {
  return {
    block: 1,
    days: 1,
    dayKind,
    scheduledSections: ["bib", "len"],
    bible: { days: [] },
  };
}

describe("english signature from week 8", () => {
  it("starts at week 8", () => {
    expect(ENGLISH_FROM_WEEK).toBe(8);
    expect(englishOnThisDay(7, "teach")).toBe(false);
    expect(englishOnThisDay(8, "teach")).toBe(true);
    expect(englishOnThisDay(8, "holiday")).toBe(false);
    expect(englishOnThisDay(10, "exposition")).toBe(true);
  });

  it("does not schedule english before week 8", () => {
    expect(scheduledSectionsForBlock(block("teach"), 7)).toEqual(["bib", "len"]);
    expect(scheduledSectionsForBlock(block("teach"), 8)).toEqual(["bib", "len", "eng"]);
    expect(scheduledSectionsForBlock(block("holiday"), 12)).toEqual(["bib", "len"]);
  });

  it("rotates the skill by weekday and the sentence by week", () => {
    const monday = englishGroupsForDay(8, 1, "2026-11-09");
    const tuesday = englishGroupsForDay(8, 2, "2026-11-10");
    const nextMonday = englishGroupsForDay(9, 1, "2026-11-16");
    expect(monday[0].objective.startsWith("Presente")).toBe(true);
    expect(tuesday[0].objective.startsWith("Pasado")).toBe(true);
    expect(monday[0].learnings[0]).toContain("The boy walks to school.");
    expect(nextMonday[0].learnings[0]).toContain("The cat sits under the table.");
  });

  it("keeps the printed sheet on 23 nov", () => {
    expect(englishSheetLink("2026-11-09")).toBeNull();
    expect(englishSheetLink("2026-11-23")?.label).toBe("Hoja del 23 nov");
    expect(englishGroupsForDay(10, 1, "2026-11-23")[0].learnings[0]).toContain("Hoja completa");
  });

  it("reads Monday from the calendar date", () => {
    expect(englishWeekday("2026-11-23", 4)).toBe(1);
    expect(englishWeekday("2026-11-09", 3)).toBe(1);
  });
});