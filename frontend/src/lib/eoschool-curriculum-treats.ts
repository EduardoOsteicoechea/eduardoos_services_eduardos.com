import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";
import corpus from "../data/homescool/jokes-riddles-1000.json";

export type CurriculumTreatKind = "joke" | "riddle";

export type CurriculumTreat = {
  key: string;
  dayId: string;
  sectionId: CurriculumPlanSectionId | string;
  kind: CurriculumTreatKind;
  setup: string;
  punchline: string;
  locale?: string;
};

/** Tiny fallback if a key is missing from the corpus. */
const SAMPLE_TREATS: CurriculumTreat[] = [
  {
    key: "sample:joke",
    dayId: "d0",
    sectionId: "len",
    kind: "joke",
    setup: "¿Qué le dice un pez a otro pez?",
    punchline: "¡Nada!",
    locale: "es-VE",
  },
  {
    key: "sample:riddle",
    dayId: "d0",
    sectionId: "mat",
    kind: "riddle",
    setup: "Tiene agujas pero no cose, da la hora pero no habla. ¿Qué es?",
    punchline: "Un reloj.",
    locale: "es-VE",
  },
];

function isTreat(raw: unknown): raw is CurriculumTreat {
  if (!raw || typeof raw !== "object") return false;
  const t = raw as Record<string, unknown>;
  return (
    typeof t.key === "string" &&
    typeof t.dayId === "string" &&
    typeof t.sectionId === "string" &&
    (t.kind === "joke" || t.kind === "riddle") &&
    typeof t.setup === "string" &&
    typeof t.punchline === "string" &&
    t.punchline.trim() !== ""
  );
}

function buildMap(items: CurriculumTreat[]): Map<string, CurriculumTreat> {
  const map = new Map<string, CurriculumTreat>();
  for (const item of items) {
    const key = item.key.trim();
    if (!key) continue;
    map.set(key, item);
  }
  return map;
}

const CORPUS_TREATS: CurriculumTreat[] = Array.isArray(corpus)
  ? corpus.filter(isTreat)
  : [];

let treatsByKey: Map<string, CurriculumTreat> | null = null;

function treatsMap(): Map<string, CurriculumTreat> {
  if (!treatsByKey) {
    treatsByKey = buildMap(CORPUS_TREATS.length ? CORPUS_TREATS : SAMPLE_TREATS);
  }
  return treatsByKey;
}

export function treatKey(dayId: string, sectionId: string): string {
  return `${dayId}:${sectionId}`;
}

export async function getCurriculumTreat(
  dayId: string,
  sectionId: string,
): Promise<CurriculumTreat> {
  const hit = treatsMap().get(treatKey(dayId, sectionId));
  if (hit) return hit;
  const n = Number.parseInt(dayId.replace(/^d/, ""), 10);
  const sample = SAMPLE_TREATS[(Number.isFinite(n) ? n : 0) % SAMPLE_TREATS.length];
  return {
    ...sample,
    key: treatKey(dayId, sectionId),
    dayId,
    sectionId,
  };
}

/** Test/helper: replace corpus in memory. */
export function setCurriculumTreatsForTests(items: CurriculumTreat[]): void {
  treatsByKey = buildMap(items);
}
