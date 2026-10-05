import type { CurriculumBlock, CurriculumLearningRef, CurriculumWeek } from "./eoschool-mppe-28week-curriculum";

export type SubjectObjectiveGroup = {
  objective: string;
  learnings: string[];
};

export type WeekIndexRow = {
  week: number;
  ide: string;
  len: string;
  mat: string;
  cie: string;
};

function clip(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

export function groupLearningRefs(refs: CurriculumLearningRef[]): SubjectObjectiveGroup[] {
  const order: string[] = [];
  const map = new Map<string, string[]>();
  for (const ref of refs) {
    const objective = ref.unitTitle?.trim() || ref.text;
    if (!map.has(objective)) {
      order.push(objective);
      map.set(objective, []);
    }
    const list = map.get(objective)!;
    if (!list.includes(ref.text)) list.push(ref.text);
  }
  return order.map((objective) => ({ objective, learnings: map.get(objective) ?? [] }));
}

function mergeRefs(a: CurriculumLearningRef[], b: CurriculumLearningRef[]): CurriculumLearningRef[] {
  const seen = new Set<string>();
  const out: CurriculumLearningRef[] = [];
  for (const ref of [...a, ...b]) {
    if (seen.has(ref.id)) continue;
    seen.add(ref.id);
    out.push(ref);
  }
  return out;
}

function firstObjectiveLabel(groups: SubjectObjectiveGroup[]): string {
  if (!groups.length) return "—";
  const g = groups[0];
  const extra = groups.length > 1 ? ` +${groups.length - 1}` : "";
  return clip(`${g.objective}${extra}`, 24);
}

export function buildWeekIndexRow(week: CurriculumWeek): WeekIndexRow {
  const [b1, b2] = week.blocks;
  const ide = clip([b1?.identity.title, b2?.identity.title].filter(Boolean).join(" · "), 22);
  const len = firstObjectiveLabel(groupLearningRefs(mergeRefs(b1?.len ?? [], b2?.len ?? [])));
  const mat = firstObjectiveLabel(groupLearningRefs(mergeRefs(b1?.mat ?? [], b2?.mat ?? [])));
  const cie = firstObjectiveLabel(groupLearningRefs(mergeRefs(b1?.cie ?? [], b2?.cie ?? [])));
  return { week: week.week, ide, len, mat, cie };
}

export function identityGroups(block: CurriculumBlock): SubjectObjectiveGroup[] {
  return [{ objective: block.identity.title, learnings: block.identity.learnings }];
}
