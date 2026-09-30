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
