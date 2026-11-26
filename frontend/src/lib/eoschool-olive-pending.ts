import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";

/** Pages per core subject so five subjects fill a ~26-page evidence PDF. */
export const EVIDENCE_PHOTOS_PER_SUBJECT = 5;

export const EVIDENCE_SUBJECTS: { id: CurriculumPlanSectionId; label: string }[] = [
  { id: "bib", label: "Biblia" },
  { id: "mat", label: "Matemáticas" },
  { id: "len", label: "Arte de la Comunicación" },
  { id: "cie", label: "Ciencias Naturales" },
  { id: "ide", label: "Ciencias Sociales" },
];

export type OlivePendingItem = {
  label: string;
  pending: boolean;
  detail: string;
};

export function photosForSubject(
  files: Record<string, string[]> | undefined,
  sectionId: string,
): number {
  if (!files) return 0;
  const suffix = `:${sectionId}`;
  let count = 0;
  for (const [key, names] of Object.entries(files)) {
    if (key.endsWith(suffix)) count += names?.length ?? 0;
  }
  return count;
}

export function olivePendingItems(input: {
  semesterWorks?: { semester: number; driveUrl: string }[];
  activityPhotoFiles?: Record<string, string[]>;
  outings?: unknown[];
}): OlivePendingItem[] {
  const works = input.semesterWorks ?? [];
  const items: OlivePendingItem[] = [1, 2].map((semester) => {
    const loaded = works.some((work) => work.semester === semester && work.driveUrl.trim() !== "");
    return {
      label: semester === 1 ? "Trabajo del 1.er semestre" : "Trabajo del 2.º semestre",
      pending: !loaded,
      detail: loaded ? "Enlace cargado en eoschool" : "Pendiente: falta el enlace del PDF",
    };
  });
  for (const subject of EVIDENCE_SUBJECTS) {
    const photos = photosForSubject(input.activityPhotoFiles, subject.id);
    const pending = photos < EVIDENCE_PHOTOS_PER_SUBJECT;
    items.push({
      label: subject.label,
      pending,
      detail: pending
        ? `Pendiente: ${photos} fotos, hacen falta ${EVIDENCE_PHOTOS_PER_SUBJECT}`
        : `${photos} fotos, alcanza para el PDF`,
    });
  }
  const outingCount = input.outings?.length ?? 0;
  items.push({
    label: "Planilla de salidas",
    pending: outingCount === 0,
    detail: outingCount === 0 ? "Pendiente: no hay filas en eoschool" : `${outingCount} filas cargadas`,
  });
  return items;
}
