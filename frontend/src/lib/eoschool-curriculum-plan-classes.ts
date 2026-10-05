/** Plan-day class JSON manifest (loaded from public static file). */

export type CurriculumPlanSectionId = "bib" | "ide" | "len" | "mat" | "cie";

export type CurriculumPlanSectionManifest = {
  sectionId: CurriculumPlanSectionId;
  label: string;
  jsonUrl: string;
};

export type CurriculumPlanDayManifest = {
  planDay: number;
  mppeWeek: number;
  sections: CurriculumPlanSectionManifest[];
};

const SECTION_LABELS: Record<CurriculumPlanSectionId, string> = {
  bib: "Biblia",
  ide: "Identidad",
  len: "Prácticas del Lenguaje",
  mat: "Matemáticas",
  cie: "Ciencias Naturales",
};

const MANIFEST_URL = "/eoschool/requirements/curriculum/plan-classes-manifest.json";

let manifestCache: Map<number, CurriculumPlanDayManifest> | null = null;
let manifestLoad: Promise<Map<number, CurriculumPlanDayManifest>> | null = null;

function mapFromManifest(raw: {
  planDays?: Array<{
    planDay: number;
    mppeWeek?: number;
    sections: Array<{ sectionId: CurriculumPlanSectionId; jsonUrl: string }>;
  }>;
}): Map<number, CurriculumPlanDayManifest> {
  const map = new Map<number, CurriculumPlanDayManifest>();
  for (const row of raw.planDays ?? []) {
    map.set(row.planDay, {
      planDay: row.planDay,
      mppeWeek: row.mppeWeek ?? Math.ceil(row.planDay / 5),
      sections: row.sections.map((s) => ({
        sectionId: s.sectionId,
        label: SECTION_LABELS[s.sectionId],
        jsonUrl: s.jsonUrl,
      })),
    });
  }
  return map;
}

export async function loadCurriculumPlanManifest(): Promise<Map<number, CurriculumPlanDayManifest>> {
  if (manifestCache) return manifestCache;
  if (!manifestLoad) {
    manifestLoad = fetch(MANIFEST_URL, { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Manifest ${res.status}`);
        return mapFromManifest((await res.json()) as Parameters<typeof mapFromManifest>[0]);
      })
      .then((map) => {
        manifestCache = map;
        return map;
      });
  }
  return manifestLoad;
}

export async function planDayManifest(planDay: number): Promise<CurriculumPlanDayManifest | null> {
  const map = await loadCurriculumPlanManifest();
  return map.get(planDay) ?? null;
}

export const CURRICULUM_SECTION_IDS: CurriculumPlanSectionId[] = ["bib", "ide", "len", "mat", "cie"];
