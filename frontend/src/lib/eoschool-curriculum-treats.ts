import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";

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

/** Placeholder samples so the modal works before the 1000-item corpus lands. */
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

const TREATS_URL = "/eoschool/requirements/curriculum/treats.json";

let treatsByKey: Map<string, CurriculumTreat> | null = null;
let loadPromise: Promise<Map<string, CurriculumTreat>> | null = null;

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

async function loadTreatsMap(): Promise<Map<string, CurriculumTreat>> {
  if (treatsByKey) return treatsByKey;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch(TREATS_URL, { credentials: "same-origin" });
      if (!res.ok) {
        treatsByKey = buildMap(SAMPLE_TREATS);
        return treatsByKey;
      }
      const data: unknown = await res.json();
      const list = Array.isArray(data) ? data.filter(isTreat) : [];
      treatsByKey = buildMap(list.length ? list : SAMPLE_TREATS);
      return treatsByKey;
    } catch {
      treatsByKey = buildMap(SAMPLE_TREATS);
      return treatsByKey;
    }
  })();

  return loadPromise;
}

export function treatKey(dayId: string, sectionId: string): string {
  return `${dayId}:${sectionId}`;
}

export async function getCurriculumTreat(
  dayId: string,
  sectionId: string,
): Promise<CurriculumTreat> {
  const map = await loadTreatsMap();
  const hit = map.get(treatKey(dayId, sectionId));
  if (hit) return hit;
  // Stable fallback by day number so every activity still gets something.
  const n = Number.parseInt(dayId.replace(/^d/, ""), 10);
  const sample = SAMPLE_TREATS[(Number.isFinite(n) ? n : 0) % SAMPLE_TREATS.length];
  return {
    ...sample,
    key: treatKey(dayId, sectionId),
    dayId,
    sectionId,
  };
}

/** Test/helper: replace corpus in memory (e.g. after the 1000-item file is ready). */
export function setCurriculumTreatsForTests(items: CurriculumTreat[]): void {
  treatsByKey = buildMap(items);
  loadPromise = Promise.resolve(treatsByKey);
}
