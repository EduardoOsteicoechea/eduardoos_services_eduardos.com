import { CURRICULUM_SECTION_IDS, type CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";

export type DayTrafficStatus = "green" | "yellow" | "red";

export function sectionProgressKey(dayId: string, sectionId: CurriculumPlanSectionId): string {
  return `${dayId}:${sectionId}`;
}

function normalizeScheduled(
  scheduledSections?: Iterable<CurriculumPlanSectionId> | null,
): CurriculumPlanSectionId[] {
  if (!scheduledSections) return [...CURRICULUM_SECTION_IDS];
  const list = [...scheduledSections].filter((id): id is CurriculumPlanSectionId =>
    CURRICULUM_SECTION_IDS.includes(id),
  );
  return list.length ? list : [...CURRICULUM_SECTION_IDS];
}

/** Green = all scheduled sections done; yellow = some; red = 0. */
export function dayTrafficStatus(
  dayId: string,
  sectionsDone: Iterable<string>,
  scheduledSections?: Iterable<CurriculumPlanSectionId> | null,
): DayTrafficStatus {
  const done = sectionsDone instanceof Set ? sectionsDone : new Set(sectionsDone);
  const scheduled = normalizeScheduled(scheduledSections);
  let count = 0;
  for (const sectionId of scheduled) {
    if (done.has(sectionProgressKey(dayId, sectionId))) count++;
  }
  if (count >= scheduled.length && scheduled.length > 0) return "green";
  if (count > 0) return "yellow";
  return "red";
}

export function daySectionsComplete(
  dayId: string,
  sectionsDone: Iterable<string>,
  scheduledSections?: Iterable<CurriculumPlanSectionId> | null,
): boolean {
  return dayTrafficStatus(dayId, sectionsDone, scheduledSections) === "green";
}

export function sectionDone(dayId: string, sectionId: CurriculumPlanSectionId, sectionsDone: Iterable<string>): boolean {
  const done = sectionsDone instanceof Set ? sectionsDone : new Set(sectionsDone);
  return done.has(sectionProgressKey(dayId, sectionId));
}
