/** Static class JSON for MPPE plan days (days 1–5 pilot). */

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

const SECTION_FILES: { sectionId: CurriculumPlanSectionId; file: string }[] = [
  { sectionId: "bib", file: "teb" },
  { sectionId: "ide", file: "his" },
  { sectionId: "len", file: "LT" },
  { sectionId: "mat", file: "mat" },
  { sectionId: "cie", file: "cie" },
];

const PLAN_DAYS_WITH_CLASSES = [1, 2, 3, 4, 5] as const;

function manifestForPlanDay(planDay: number): CurriculumPlanDayManifest {
  const base = `/eoschool/requirements/curriculum/plan-d${planDay}`;
  return {
    planDay,
    mppeWeek: 1,
    sections: SECTION_FILES.map(({ sectionId, file }) => ({
      sectionId,
      label: SECTION_LABELS[sectionId],
      jsonUrl: `${base}/${file}.eoschool.json`,
    })),
  };
}

/** Plan day → ordered section class JSON (same order as curriculum areas 1–5). */
export const CURRICULUM_PLAN_DAY_CLASSES: Partial<Record<number, CurriculumPlanDayManifest>> =
  Object.fromEntries(PLAN_DAYS_WITH_CLASSES.map((d) => [d, manifestForPlanDay(d)]));

export function planDayManifest(planDay: number): CurriculumPlanDayManifest | null {
  return CURRICULUM_PLAN_DAY_CLASSES[planDay] ?? null;
}

export const CURRICULUM_SECTION_IDS: CurriculumPlanSectionId[] = ["bib", "ide", "len", "mat", "cie"];
