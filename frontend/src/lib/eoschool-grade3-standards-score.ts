import { MPPE_40WEEK_CURRICULUM } from "./eoschool-mppe-40week-curriculum";
import type { StandardCell } from "./eoschool-grade3-standards-crosswalk";

/** Instructional day the comparison marks as already taught. */
export const STANDARDS_PROGRESS_THROUGH_DAY = 38;

const BAND_CODE = /Y3-4|Y3–4|KS2|3-5|3–5|Spoken|MS-/;

/** Same skill at one year (Grade 3 or Year 4) scores higher than a two-year or key-stage band. */
export function foreignStars(cell: StandardCell): number {
  if (cell.fit === "directo") return BAND_CODE.test(cell.code) ? 4 : 5;
  if (cell.fit === "parcial") return 3;
  return 2;
}

/** Venezuela states the learning. It leads when the other two only name a nearby skill. */
export function venezuelaStars(us: StandardCell, uk: StandardCell): number {
  if (us.fit === "nacional" && uk.fit === "nacional") return 5;
  if (us.fit === "anterior" && uk.fit === "anterior") return 2;
  if (us.fit === "anterior" || uk.fit === "anterior") return 3;
  return 4;
}

export function learningsCoveredThroughDay(throughDay: number): Set<string> {
  const covered = new Set<string>();
  for (const week of MPPE_40WEEK_CURRICULUM.weeks) {
    for (const block of week.blocks) {
      if (block.dayKind === "holiday") continue;
      const days = (block.bible?.days ?? []).map((day) => day.dayInPlan);
      if (days.length === 0 || Math.min(...days) > throughDay) continue;
      for (const ref of [...(block.len ?? []), ...(block.mat ?? []), ...(block.cie ?? [])]) {
        covered.add(ref.text);
      }
      for (const text of block.identity?.learnings ?? []) covered.add(text);
    }
  }
  return covered;
}
