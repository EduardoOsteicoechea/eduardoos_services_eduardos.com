/**
 * Homescool materials tree: ciclo → semana → día → materia → material.
 */

import type { HomescoolMaterial } from "./homescool";

export type HomescoolTreeLeaf = {
  kind: "material";
  id: string;
  title: string;
  material: HomescoolMaterial;
};

export type HomescoolTreeNode = {
  kind: "cycle" | "week" | "day" | "subject";
  key: string;
  label: string;
  children: Array<HomescoolTreeNode | HomescoolTreeLeaf>;
};

function subjectLabel(subject: string): string {
  return subject
    .split("/")
    .map((p) => p.replace(/_/g, " "))
    .join(" · ");
}

/** Build nested tree ciclo → semana → día → materia → material. */
export function buildHomescoolTree(materials: HomescoolMaterial[]): HomescoolTreeNode[] {
  const cycles = new Map<number, Map<number, Map<number, Map<string, HomescoolMaterial[]>>>>();

  for (const m of materials) {
    if (!cycles.has(m.cycle)) cycles.set(m.cycle, new Map());
    const weeks = cycles.get(m.cycle)!;
    if (!weeks.has(m.week)) weeks.set(m.week, new Map());
    const days = weeks.get(m.week)!;
    if (!days.has(m.day)) days.set(m.day, new Map());
    const subjects = days.get(m.day)!;
    const subj = m.subject || "general";
    if (!subjects.has(subj)) subjects.set(subj, []);
    subjects.get(subj)!.push(m);
  }

  // Always show cycles 1–3 even if empty.
  const out: HomescoolTreeNode[] = [];
  for (let c = 1; c <= 3; c++) {
    const weeks = cycles.get(c) ?? new Map();
    const weekNodes: HomescoolTreeNode[] = [];
    const weekKeys = [...weeks.keys()].sort((a, b) => a - b);
    for (const w of weekKeys) {
      const days = weeks.get(w)!;
      const dayNodes: HomescoolTreeNode[] = [];
      for (const d of [...days.keys()].sort((a, b) => a - b)) {
        const subjects = days.get(d)!;
        const subjectNodes: HomescoolTreeNode[] = [];
        for (const subj of [...subjects.keys()].sort((a, b) => a.localeCompare(b))) {
          const mats = subjects.get(subj)!.slice().sort((a, b) => a.title.localeCompare(b.title));
          subjectNodes.push({
            kind: "subject",
            key: `c${c}-w${w}-d${d}-s${subj}`,
            label: subjectLabel(subj),
            children: mats.map((m) => ({
              kind: "material" as const,
              id: m.id,
              title: m.title,
              material: m,
            })),
          });
        }
        dayNodes.push({
          kind: "day",
          key: `c${c}-w${w}-d${d}`,
          label: `Día ${d}`,
          children: subjectNodes,
        });
      }
      weekNodes.push({
        kind: "week",
        key: `c${c}-w${w}`,
        label: `Semana ${w}`,
        children: dayNodes,
      });
    }
    out.push({
      kind: "cycle",
      key: `c${c}`,
      label: `Ciclo ${c}`,
      children: weekNodes,
    });
  }
  return out;
}
