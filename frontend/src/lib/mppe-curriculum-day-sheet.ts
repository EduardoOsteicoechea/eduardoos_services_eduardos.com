/** MPPE requirements route day sheet (independent from Homescool eoschool). */

export type MppeCurriculumSectionId = "bib" | "ide" | "len" | "mat" | "cie";

export type MppeCurriculumDaySection = {
  id: MppeCurriculumSectionId;
  label: string;
  objective: string;
  learning: string;
  /** Meta observable para el niño («Al terminar puedes…»). */
  canDo?: string;
  mode?: "directo" | "apalancado" | "fragmentado";
  activityKind?: string;
  minutesEstimate?: number;
  topicShort?: string;
  activities: string[];
};

export type MppeCurriculumDaySheet = {
  format: "mppe-curriculum-day";
  version: number;
  planDay: number;
  week: number;
  grade: string;
  title: string;
  sections: MppeCurriculumDaySection[];
};

const MANIFEST_URL = "/eoschool/requirements/curriculum/day-sheets-manifest.json";

type ManifestCache = {
  revision: number;
  urlByDay: Map<number, string>;
};

let manifestCache: ManifestCache | null = null;
let manifestLoad: Promise<ManifestCache> | null = null;

async function loadManifest(): Promise<ManifestCache> {
  if (manifestCache) return manifestCache;
  if (!manifestLoad) {
    manifestLoad = fetch(MANIFEST_URL, { credentials: "same-origin", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Manifiesto ${res.status}`);
        const raw = (await res.json()) as {
          contentRevision?: number;
          version?: number;
          planDays?: Array<{ planDay: number; jsonUrl: string }>;
        };
        const revision = raw.contentRevision ?? raw.version ?? 1;
        const map = new Map<number, string>();
        for (const row of raw.planDays ?? []) {
          map.set(row.planDay, row.jsonUrl);
        }
        return { revision, urlByDay: map };
      })
      .then((loaded) => {
        manifestCache = loaded;
        return loaded;
      });
  }
  return manifestLoad;
}

export async function fetchMppeDaySheet(planDay: number): Promise<MppeCurriculumDaySheet | null> {
  const { revision, urlByDay } = await loadManifest();
  const base = urlByDay.get(planDay);
  if (!base) return null;
  const url = `${base}?v=${revision}`;
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as MppeCurriculumDaySheet;
}

export const MPPE_CURRICULUM_SECTION_IDS: MppeCurriculumSectionId[] = ["bib", "ide", "len", "mat", "cie"];
