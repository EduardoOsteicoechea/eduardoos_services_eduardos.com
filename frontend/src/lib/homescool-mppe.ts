/**
 * MPPE Venezuela grade-3 checklist + coverage against eoschool class declarations.
 */

import { mustLog } from "./dev-log";
import type { EoschoolDocument } from "./homescool";
import type { HomescoolCurriculumClass } from "./homescool-curriculum";

export type MppeObjective = {
  id: string;
  content: string;
  aprendizaje: string;
};

export type MppeComponent = {
  id: string;
  title: string;
  objectives: MppeObjective[];
};

export type MppeArea = {
  id: string;
  title: string;
  components: MppeComponent[];
};

export type MppeChecklist = {
  format: string;
  version: number;
  grade: number;
  locale?: string;
  source?: string;
  areas: MppeArea[];
};

export type MppeCoverageRow = {
  objective: MppeObjective;
  areaId: string;
  areaTitle: string;
  componentId: string;
  componentTitle: string;
  classKeys: string[];
  status: "imbued" | "gap";
};

const CHECKLIST_URL = "/homescool/mppe-grade3-checklist.json";

let cached: MppeChecklist | null = null;

export async function loadMppeChecklist(force = false): Promise<MppeChecklist | null> {
  if (cached && !force) return cached;
  try {
    if (mustLog) console.log("[homescool-mppe] load.start", { url: CHECKLIST_URL });
    const res = await fetch(CHECKLIST_URL, { credentials: "same-origin" });
    if (!res.ok) {
      if (mustLog) console.log("[homescool-mppe] load.fail", { status: res.status });
      return null;
    }
    const data = (await res.json()) as MppeChecklist;
    if (data.format !== "homescool-mppe-checklist" || !Array.isArray(data.areas)) {
      if (mustLog) console.log("[homescool-mppe] load.invalid");
      return null;
    }
    cached = data;
    if (mustLog) console.log("[homescool-mppe] load.ok", { areas: data.areas.length });
    return cached;
  } catch (err) {
    if (mustLog) console.log("[homescool-mppe] load.error", { err: String(err) });
    return null;
  }
}

export function flattenMppeObjectives(checklist: MppeChecklist): MppeCoverageRow[] {
  const rows: MppeCoverageRow[] = [];
  for (const area of checklist.areas) {
    for (const comp of area.components) {
      for (const objective of comp.objectives) {
        rows.push({
          objective,
          areaId: area.id,
          areaTitle: area.title,
          componentId: comp.id,
          componentTitle: comp.title,
          classKeys: [],
          status: "gap",
        });
      }
    }
  }
  return rows;
}

/** Extract mppe objective ids declared on a curriculum class entry (full eoschool or nested). */
export function classMppeIds(cls: HomescoolCurriculumClass | EoschoolDocument | Record<string, unknown>): string[] {
  const raw = (cls as { mppe?: { objectives?: { id?: string }[] } }).mppe;
  if (!raw?.objectives?.length) return [];
  return raw.objectives.map((o) => String(o.id || "").trim()).filter(Boolean);
}

export function buildMppeCoverage(
  checklist: MppeChecklist,
  classes: Array<HomescoolCurriculumClass | EoschoolDocument | Record<string, unknown>>,
): {
  rows: MppeCoverageRow[];
  total: number;
  imbued: number;
  byArea: Record<string, { total: number; imbued: number; title: string }>;
} {
  const rows = flattenMppeObjectives(checklist);
  const byId = new Map(rows.map((r) => [r.objective.id, r]));
  for (const cls of classes) {
    const key =
      String((cls as HomescoolCurriculumClass).key || "").trim() ||
      [
        `c${(cls as EoschoolDocument).cycle}`,
        `w${(cls as EoschoolDocument).week}`,
        `d${(cls as EoschoolDocument).day}`,
        `l${(cls as EoschoolDocument).level}`,
        String((cls as EoschoolDocument).subject || ""),
      ].join("-");
    for (const id of classMppeIds(cls)) {
      const row = byId.get(id);
      if (!row) continue;
      if (!row.classKeys.includes(key)) row.classKeys.push(key);
      row.status = "imbued";
    }
  }
  const byArea: Record<string, { total: number; imbued: number; title: string }> = {};
  for (const row of rows) {
    if (!byArea[row.areaId]) {
      byArea[row.areaId] = { total: 0, imbued: 0, title: row.areaTitle };
    }
    byArea[row.areaId].total += 1;
    if (row.status === "imbued") byArea[row.areaId].imbued += 1;
  }
  const imbued = rows.filter((r) => r.status === "imbued").length;
  return { rows, total: rows.length, imbued, byArea };
}

export function objectiveLabelMap(checklist: MppeChecklist): Map<string, string> {
  const m = new Map<string, string>();
  for (const area of checklist.areas) {
    for (const comp of area.components) {
      for (const o of comp.objectives) {
        m.set(o.id, o.aprendizaje);
      }
    }
  }
  return m;
}

export type MppeDeclaredObjective = {
  id: string;
  label: string;
  aprendizaje: string;
};

export type MppeScheduleClass = {
  key: string;
  cycle: number;
  week: number;
  day: number;
  level: number;
  subject: string;
  title: string;
  objectives: MppeDeclaredObjective[];
};

export type MppeScheduleDay = {
  day: number;
  classes: MppeScheduleClass[];
  objectiveCount: number;
  classesWithMppe: number;
};

export type MppeScheduleWeek = {
  week: number;
  days: MppeScheduleDay[];
  objectiveIds: string[];
  classesWithMppe: number;
  classCount: number;
};

export type MppeScheduleCycle = {
  cycle: number;
  weeks: MppeScheduleWeek[];
  objectiveIds: string[];
  classesWithMppe: number;
  classCount: number;
};

export type MppeScheduleReport = {
  cycles: MppeScheduleCycle[];
  classCount: number;
  classesWithMppe: number;
  uniqueObjectiveIds: string[];
};

function classCoords(cls: HomescoolCurriculumClass | EoschoolDocument | Record<string, unknown>): {
  key: string;
  cycle: number;
  week: number;
  day: number;
  level: number;
  subject: string;
  title: string;
} | null {
  const cycle = Number((cls as EoschoolDocument).cycle);
  const week = Number((cls as EoschoolDocument).week);
  const day = Number((cls as EoschoolDocument).day);
  const level = Number((cls as EoschoolDocument).level) || 6;
  const subject = String((cls as EoschoolDocument).subject || "").trim();
  if (!Number.isFinite(cycle) || !Number.isFinite(week) || !Number.isFinite(day) || !subject) {
    return null;
  }
  const key =
    String((cls as HomescoolCurriculumClass).key || "").trim() ||
    `c${cycle}-w${week}-d${day}-l${level}-${subject}`;
  const title = String((cls as EoschoolDocument).title || "").trim() || key;
  return { key, cycle, week, day, level, subject, title };
}

function classMppeObjectives(
  cls: HomescoolCurriculumClass | EoschoolDocument | Record<string, unknown>,
  labels: Map<string, string>,
): MppeDeclaredObjective[] {
  const raw = (cls as { mppe?: { objectives?: { id?: string; label?: string }[] } }).mppe;
  if (!raw?.objectives?.length) return [];
  const out: MppeDeclaredObjective[] = [];
  const seen = new Set<string>();
  for (const o of raw.objectives) {
    const id = String(o?.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label: String(o?.label || "").trim() || labels.get(id) || id,
      aprendizaje: labels.get(id) || String(o?.label || "").trim() || id,
    });
  }
  return out;
}

/** Deduplicate class docs by key (prefer entry with more mppe objectives). */
export function dedupeClassDocs(
  classes: Array<HomescoolCurriculumClass | EoschoolDocument | Record<string, unknown>>,
): Array<HomescoolCurriculumClass | EoschoolDocument | Record<string, unknown>> {
  const byKey = new Map<string, HomescoolCurriculumClass | EoschoolDocument | Record<string, unknown>>();
  for (const cls of classes) {
    const coords = classCoords(cls);
    if (!coords) continue;
    const prev = byKey.get(coords.key);
    if (!prev) {
      byKey.set(coords.key, cls);
      continue;
    }
    const prevN = classMppeIds(prev).length;
    const nextN = classMppeIds(cls).length;
    if (nextN >= prevN) byKey.set(coords.key, cls);
  }
  return Array.from(byKey.values());
}

/**
 * Compliance tree: cycle → week → day → class, with declared MPPE objectives per class.
 */
export function buildMppeScheduleReport(
  checklist: MppeChecklist,
  classes: Array<HomescoolCurriculumClass | EoschoolDocument | Record<string, unknown>>,
): MppeScheduleReport {
  const labels = objectiveLabelMap(checklist);
  const deduped = dedupeClassDocs(classes);
  type DayMap = Map<number, MppeScheduleClass[]>;
  type WeekMap = Map<number, DayMap>;
  const cycleMap = new Map<number, WeekMap>();
  const unique = new Set<string>();
  let classesWithMppe = 0;

  for (const cls of deduped) {
    const coords = classCoords(cls);
    if (!coords) continue;
    const objectives = classMppeObjectives(cls, labels);
    if (objectives.length) classesWithMppe += 1;
    for (const o of objectives) unique.add(o.id);

    if (!cycleMap.has(coords.cycle)) cycleMap.set(coords.cycle, new Map());
    const weekMap = cycleMap.get(coords.cycle)!;
    if (!weekMap.has(coords.week)) weekMap.set(coords.week, new Map());
    const dayMap = weekMap.get(coords.week)!;
    if (!dayMap.has(coords.day)) dayMap.set(coords.day, []);
    dayMap.get(coords.day)!.push({
      key: coords.key,
      cycle: coords.cycle,
      week: coords.week,
      day: coords.day,
      level: coords.level,
      subject: coords.subject,
      title: coords.title,
      objectives,
    });
  }

  const cycles: MppeScheduleCycle[] = Array.from(cycleMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([cycle, weekMap]) => {
      const weeks: MppeScheduleWeek[] = Array.from(weekMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([week, dayMap]) => {
          const days: MppeScheduleDay[] = Array.from(dayMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([day, dayClasses]) => {
              const sorted = [...dayClasses].sort((a, b) => a.subject.localeCompare(b.subject));
              const objIds = new Set(sorted.flatMap((c) => c.objectives.map((o) => o.id)));
              return {
                day,
                classes: sorted,
                objectiveCount: objIds.size,
                classesWithMppe: sorted.filter((c) => c.objectives.length > 0).length,
              };
            });
          const weekObj = new Set(days.flatMap((d) => d.classes.flatMap((c) => c.objectives.map((o) => o.id))));
          const weekClasses = days.reduce((n, d) => n + d.classes.length, 0);
          const weekWith = days.reduce((n, d) => n + d.classesWithMppe, 0);
          return {
            week,
            days,
            objectiveIds: Array.from(weekObj).sort(),
            classesWithMppe: weekWith,
            classCount: weekClasses,
          };
        });
      const cycleObj = new Set(weeks.flatMap((w) => w.objectiveIds));
      const cycleClasses = weeks.reduce((n, w) => n + w.classCount, 0);
      const cycleWith = weeks.reduce((n, w) => n + w.classesWithMppe, 0);
      return {
        cycle,
        weeks,
        objectiveIds: Array.from(cycleObj).sort(),
        classesWithMppe: cycleWith,
        classCount: cycleClasses,
      };
    });

  return {
    cycles,
    classCount: deduped.length,
    classesWithMppe,
    uniqueObjectiveIds: Array.from(unique).sort(),
  };
}
