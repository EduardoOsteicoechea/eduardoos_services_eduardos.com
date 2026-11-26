import { CURRICULUM_SECTION_IDS, type CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";

export type DayTrafficStatus = "green" | "yellow" | "red";

export function sectionProgressKey(dayId: string, sectionId: CurriculumPlanSectionId): string {
  return `${dayId}:${sectionId}`;
}

const CORE_SECTION_IDS = CURRICULUM_SECTION_IDS.filter((id) => id !== "eng" && id !== "ia");

function normalizeScheduled(
  scheduledSections?: Iterable<CurriculumPlanSectionId> | null,
): CurriculumPlanSectionId[] {
  if (!scheduledSections) return [...CORE_SECTION_IDS];
  const list = [...scheduledSections].filter((id): id is CurriculumPlanSectionId =>
    CURRICULUM_SECTION_IDS.includes(id),
  );
  return list.length ? list : [...CORE_SECTION_IDS];
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

export type SubjectProgressTone = "green" | "yellow" | "red";

export type SubjectProgress = {
  value: number;
  tone: SubjectProgressTone;
  scored: boolean;
};

/** Completion is 100 or 0. A saved score (0–100) replaces that value for the subject. */
export function subjectProgressValue(done: boolean, score: number | null | undefined): SubjectProgress {
  if (typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100) {
    const tone: SubjectProgressTone = score >= 80 ? "green" : score >= 50 ? "yellow" : "red";
    return { value: score, tone, scored: true };
  }
  return { value: done ? 100 : 0, tone: done ? "green" : "red", scored: false };
}

export type SubjectProgressItem = { done: boolean; score?: number | null };

export type ProgressRollup = {
  scheduled: number;
  completed: number;
  scoredCount: number;
  averageScore: number | null;
  percent: number;
};

export function rollupSubjectProgress(items: SubjectProgressItem[]): ProgressRollup {
  let completed = 0;
  let scoredCount = 0;
  let scoreSum = 0;
  let valueSum = 0;
  for (const item of items) {
    if (item.done) completed += 1;
    const measured = subjectProgressValue(item.done, item.score);
    valueSum += measured.value;
    if (measured.scored && typeof item.score === "number") {
      scoredCount += 1;
      scoreSum += item.score;
    }
  }
  const scheduled = items.length;
  return {
    scheduled,
    completed,
    scoredCount,
    averageScore: scoredCount > 0 ? Math.round(scoreSum / scoredCount) : null,
    percent: scheduled > 0 ? Math.round(valueSum / scheduled) : 0,
  };
}

export function formatProgressSummary(rollup: ProgressRollup): string {
  const materias = rollup.completed === 1 ? "materia completada" : "materias completadas";
  const base = `Avance ${rollup.percent}% · ${rollup.completed} ${materias} de ${rollup.scheduled}`;
  if (rollup.scoredCount > 0 && rollup.averageScore != null) {
    const label = rollup.scoredCount === 1 ? "materia con puntaje" : "materias con puntaje";
    return `${base} · promedio ${rollup.averageScore} en ${rollup.scoredCount} ${label}`;
  }
  return `${base} · sin puntajes`;
}
