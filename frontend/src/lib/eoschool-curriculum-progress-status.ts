import { CURRICULUM_SECTION_IDS, type CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";

export type DayTrafficStatus = "green" | "yellow" | "red";

export function sectionProgressKey(dayId: string, sectionId: CurriculumPlanSectionId): string {
  return `${dayId}:${sectionId}`;
}

/** Green = all 5 done; yellow = 1–4; red = 0. */
export function dayTrafficStatus(dayId: string, sectionsDone: Iterable<string>): DayTrafficStatus {
  const done = sectionsDone instanceof Set ? sectionsDone : new Set(sectionsDone);
  let count = 0;
  for (const sectionId of CURRICULUM_SECTION_IDS) {
    if (done.has(sectionProgressKey(dayId, sectionId))) count++;
  }
  if (count >= 5) return "green";
  if (count > 0) return "yellow";
  return "red";
}

export function sectionDone(dayId: string, sectionId: CurriculumPlanSectionId, sectionsDone: Iterable<string>): boolean {
  const done = sectionsDone instanceof Set ? sectionsDone : new Set(sectionsDone);
  return done.has(sectionProgressKey(dayId, sectionId));
}
