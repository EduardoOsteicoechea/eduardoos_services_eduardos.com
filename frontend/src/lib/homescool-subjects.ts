/**
 * Canonical Homescool subject order (cambios/1).
 * Index + 1 = número grande en cabecera.
 */

export const HOMESCOOL_SUBJECTS = [
  "teb",
  "exe",
  "LT",
  "his",
  "geo",
  "art",
  "mat",
  "esp",
  "ing",
  "lat",
  "cie",
  "pro",
] as const;

export type HomescoolSubject = (typeof HOMESCOOL_SUBJECTS)[number];

/** Full Spanish names for DHS chips / tooltips. */
export const HOMESCOOL_SUBJECT_LABELS: Record<HomescoolSubject, string> = {
  teb: "Teología bíblica",
  exe: "Exégesis",
  LT: "Línea de tiempo",
  his: "Historia de Venezuela",
  geo: "Geografía",
  art: "Bellas artes",
  mat: "Matemáticas",
  esp: "Español",
  ing: "Inglés",
  lat: "Latín",
  cie: "Ciencias",
  pro: "Proyecto",
};

export function subjectClassNumber(subject: string): number {
  const i = HOMESCOOL_SUBJECTS.indexOf(subject as HomescoolSubject);
  return i >= 0 ? i + 1 : 0;
}

export function subjectDisplayName(subject: string): string {
  if (subject in HOMESCOOL_SUBJECT_LABELS) {
    return HOMESCOOL_SUBJECT_LABELS[subject as HomescoolSubject];
  }
  return subject;
}
