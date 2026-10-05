/** MPPE requirements route day sheet (independent from Homescool eoschool). */

export type MppeCurriculumSectionId = "bib" | "ide" | "len" | "mat" | "cie";

export type MppeCurriculumDaySection = {
  id: MppeCurriculumSectionId;
  label: string;
  objective: string;
  learning: string;
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

let sheetUrlByDay: Map<number, string> | null = null;
let manifestLoad: Promise<Map<number, string>> | null = null;

async function loadManifest(): Promise<Map<number, string>> {
  if (sheetUrlByDay) return sheetUrlByDay;
  if (!manifestLoad) {
    manifestLoad = fetch(MANIFEST_URL, { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Manifiesto ${res.status}`);
        const raw = (await res.json()) as {
          planDays?: Array<{ planDay: number; jsonUrl: string }>;
        };
        const map = new Map<number, string>();
        for (const row of raw.planDays ?? []) {
          map.set(row.planDay, row.jsonUrl);
        }
        return map;
      })
      .then((map) => {
        sheetUrlByDay = map;
        return map;
      });
  }
  return manifestLoad;
}

export async function fetchMppeDaySheet(planDay: number): Promise<MppeCurriculumDaySheet | null> {
  const map = await loadManifest();
  const url = map.get(planDay);
  if (!url) return null;
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return null;
  return (await res.json()) as MppeCurriculumDaySheet;
}

export const MPPE_CURRICULUM_SECTION_IDS: MppeCurriculumSectionId[] = ["bib", "ide", "len", "mat", "cie"];
