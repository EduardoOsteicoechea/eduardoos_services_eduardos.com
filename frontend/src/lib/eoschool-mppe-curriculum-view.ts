import type {
  BibleChapterRef,
  BibleDay,
  CurriculumBlock,
  CurriculumLearningRef,
  CurriculumWeek,
} from "./eoschool-mppe-40week-curriculum";
import { AI_FROM_PLAN_DAY } from "./eoschool-ai-signature";

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
  Génesis: "Gén.",
  Éxodo: "Ex.",
  Levítico: "Lev.",
  Números: "Núm.",
  Deuteronomio: "Deut.",
  Josué: "Jos.",
  Jueces: "Jue.",
  Rut: "Rut",
  "1 Samuel": "1 Sam.",
  "2 Samuel": "2 Sam.",
  "1 Reyes": "1 Rey.",
  "2 Reyes": "2 Rey.",
  "1 Crónicas": "1 Crón.",
  "2 Crónicas": "2 Crón.",
  Esdras: "Esd.",
  Nehemías: "Neh.",
  Ester: "Est.",
  Job: "Job",
  Salmos: "Sal.",
  Proverbios: "Prov.",
  Eclesiastés: "Ecl.",
  Cantares: "Cant.",
  Isaías: "Is.",
  Jeremías: "Jer.",
  Lamentaciones: "Lam.",
  Ezequiel: "Ez.",
  Daniel: "Dan.",
  Oseas: "Os.",
  Joel: "Joel",
  Amós: "Am.",
  Abdías: "Abd.",
  Jonás: "Jon.",
  Miqueas: "Miq.",
  Nahúm: "Nah.",
  Habacuc: "Hab.",
  Sofonías: "Sof.",
  Hageo: "Hag.",
  Zacarías: "Zac.",
  Malaquías: "Mal.",
  Mateo: "Mt.",
  Marcos: "Mar.",
  Lucas: "Luc.",
  Juan: "Jn.",
  Hechos: "Hch.",
  Romanos: "Rom.",
  "1 Corintios": "1 Cor.",
  "2 Corintios": "2 Cor.",
  Gálatas: "Gál.",
  Efesios: "Ef.",
  Filipenses: "Fil.",
  Colosenses: "Col.",
  "1 Tesalonicenses": "1 Tes.",
  "2 Tesalonicenses": "2 Tes.",
  "1 Timoteo": "1 Tim.",
  "2 Timoteo": "2 Tim.",
  Tito: "Tit.",
  Filemón: "Flm.",
  Hebreos: "Heb.",
  Santiago: "Sant.",
  "1 Pedro": "1 Pe.",
  "2 Pedro": "2 Pe.",
  "1 Juan": "1 Jn.",
  "2 Juan": "2 Jn.",
  "3 Juan": "3 Jn.",
  Judas: "Jud.",
  Apocalipsis: "Ap.",
};

function shortBook(book: string): string {
  return BOOK_SHORT[book] ?? book;
}

function shortRef(ref: BibleChapterRef): string {
  return `${shortBook(ref.book)} ${ref.chapter}`;
}

function formatChapterRef(ref: BibleChapterRef): string {
  return shortRef(ref);
}

function formatChapterList(refs: BibleChapterRef[]): string {
  if (!refs.length) return "—";
  if (refs.length === 1) return formatChapterRef(refs[0]);
  const first = refs[0];
  const last = refs[refs.length - 1];
  if (first.book === last.book) {
    return `${shortBook(first.book)} ${first.chapter}–${last.chapter}`;
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

function mergeAllBlockRefs(week: CurriculumWeek, key: "len" | "mat" | "cie"): CurriculumLearningRef[] {
  return week.blocks.reduce((acc, block) => mergeRefs(acc, block[key] ?? []), [] as CurriculumLearningRef[]);
}

export function buildWeekIndexRow(week: CurriculumWeek): WeekIndexRow {
  const bib = weekBibleSummary(week);
  const ide = compact(
    [...new Set(week.blocks.map((b) => b.identity?.title).filter(Boolean))].join(" · "),
  );
  const len = firstObjectiveLabel(groupLearningRefs(mergeAllBlockRefs(week, "len")));
  const mat = firstObjectiveLabel(groupLearningRefs(mergeAllBlockRefs(week, "mat")));
  const cie = firstObjectiveLabel(groupLearningRefs(mergeAllBlockRefs(week, "cie")));
  return { week: week.week, bib, ide, len, mat, cie };
}

export function identityGroups(block: CurriculumBlock): SubjectObjectiveGroup[] {
  if (!block.identity?.title) return [];
  return [{ objective: block.identity.title, learnings: block.identity.learnings ?? [] }];
}

export type PlanDaySectionId = "bib" | "ide" | "len" | "mat" | "cie" | "eng" | "ia";

/** Sections scheduled for a plan block. English starts at week 8. */
export function scheduledSectionsForBlock(block: CurriculumBlock, week = 0): PlanDaySectionId[] {
  const out: PlanDaySectionId[] = block.scheduledSections?.length ? [...block.scheduledSections] : ["bib"];
  if (!block.scheduledSections?.length) {
    if (block.identity) out.push("ide");
    if (block.len?.length) out.push("len");
    if (block.mat?.length) out.push("mat");
    if (block.cie?.length) out.push("cie");
  }
  if (week >= 8 && block.dayKind !== "holiday" && !out.includes("eng")) out.push("eng");
  const planDay = block.bible?.days?.[0]?.dayInPlan ?? 0;
  if (planDay >= AI_FROM_PLAN_DAY && block.dayKind !== "holiday" && !out.includes("ia")) out.push("ia");
  return out;
}
