import type {
  BibleChapterRef,
  BibleDay,
  CurriculumBlock,
  CurriculumLearningRef,
  CurriculumWeek,
} from "./eoschool-mppe-28week-curriculum";

export type SubjectObjectiveGroup = {
  objective: string;
  learnings: string[];
};

export type WeekIndexRow = {
  week: number;
  bib: string;
  ide: string;
  len: string;
  mat: string;
  cie: string;
};

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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

const BOOK_SHORT: Record<string, string> = {
  Génesis: "Gén",
  Éxodo: "Éx",
  Levítico: "Lv",
  Números: "Nm",
  Deuteronomio: "Dt",
  Josué: "Jos",
  Jueces: "Jue",
  Rut: "Rt",
  "1 Samuel": "1S",
  "2 Samuel": "2S",
  "1 Reyes": "1R",
  "2 Reyes": "2R",
  "1 Crónicas": "1Cr",
  "2 Crónicas": "2Cr",
  Esdras: "Esd",
  Nehemías: "Ne",
  Ester: "Est",
  Job: "Job",
  Salmos: "Sal",
  Proverbios: "Pr",
  Eclesiastés: "Ecl",
  Cantares: "Cnt",
  Isaías: "Is",
  Jeremías: "Jer",
  Lamentaciones: "Lm",
  Ezequiel: "Ez",
  Daniel: "Dn",
  Mateo: "Mt",
  Marcos: "Mc",
  Lucas: "Lc",
  Juan: "Jn",
  Hechos: "Hch",
  Romanos: "Ro",
  "1 Corintios": "1Co",
  "2 Corintios": "2Co",
};

function shortRef(ref: BibleChapterRef): string {
  const book = BOOK_SHORT[ref.book] ?? ref.book;
  return `${book} ${ref.chapter}`;
}

function formatChapterRef(ref: BibleChapterRef): string {
  return `${ref.book} ${ref.chapter}`;
}

function formatChapterList(refs: BibleChapterRef[]): string {
  if (!refs.length) return "—";
  if (refs.length === 1) return formatChapterRef(refs[0]);
  const first = refs[0];
  const last = refs[refs.length - 1];
  if (first.book === last.book) {
    return `${first.book} ${first.chapter}–${last.chapter}`;
  }
  return refs.map(formatChapterRef).join(", ");
}

function edgeRef(refs: BibleChapterRef[]): BibleChapterRef | null {
  return refs.length ? refs[0] : null;
}

function lastRef(refs: BibleChapterRef[]): BibleChapterRef | null {
  return refs.length ? refs[refs.length - 1] : null;
}

export function bibleGroupsForDay(day: BibleDay): SubjectObjectiveGroup[] {
  return [
    {
      objective: "Lectura bíblica (tres pistas)",
      learnings: [
        `Gén–Ester: ${formatChapterList(day.genEster)}`,
        `Job–Mal: ${formatChapterList(day.jobMal)}`,
        `NT: ${formatChapterList(day.nt)}`,
      ],
    },
  ];
}

function weekBibleSummary(week: CurriculumWeek): string {
  const days = week.blocks.flatMap((block) => block.bible?.days ?? []);
  if (!days.length) return "—";
  const first = days[0];
  const last = days[days.length - 1];
  const ge0 = edgeRef(first.genEster);
  const ge1 = lastRef(last.genEster);
  const jm0 = edgeRef(first.jobMal);
  const jm1 = lastRef(last.jobMal);
  const nt0 = edgeRef(first.nt);
  const nt1 = lastRef(last.nt);
  if (!ge0 || !ge1 || !jm0 || !jm1 || !nt0 || !nt1) return "—";
  return compact(
    `${shortRef(ge0)}→${shortRef(ge1)} · ${shortRef(jm0)}→${shortRef(jm1)} · ${shortRef(nt0)}→${shortRef(nt1)}`,
  );
}

function firstObjectiveLabel(groups: SubjectObjectiveGroup[]): string {
  if (!groups.length) return "—";
  const g = groups[0];
  const extra = groups.length > 1 ? ` +${groups.length - 1}` : "";
  return compact(`${g.objective}${extra}`);
}

export function buildWeekIndexRow(week: CurriculumWeek): WeekIndexRow {
  const [b1, b2] = week.blocks;
  const bib = weekBibleSummary(week);
  const ide = compact([b1?.identity.title, b2?.identity.title].filter(Boolean).join(" · "));
  const len = firstObjectiveLabel(groupLearningRefs(mergeRefs(b1?.len ?? [], b2?.len ?? [])));
  const mat = firstObjectiveLabel(groupLearningRefs(mergeRefs(b1?.mat ?? [], b2?.mat ?? [])));
  const cie = firstObjectiveLabel(groupLearningRefs(mergeRefs(b1?.cie ?? [], b2?.cie ?? [])));
  return { week: week.week, bib, ide, len, mat, cie };
}

export function identityGroups(block: CurriculumBlock): SubjectObjectiveGroup[] {
  return [{ objective: block.identity.title, learnings: block.identity.learnings }];
}
