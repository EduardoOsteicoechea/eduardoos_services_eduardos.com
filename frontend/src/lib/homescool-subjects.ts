/**
 * Canonical Homescool subject order (cambios/1).
 * Class numbers stay fixed even when some subjects are paused from the menu.
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

/** Fixed class numbers (do not renumber when pausing subjects). */
export const HOMESCOOL_SUBJECT_CLASS_NO: Record<HomescoolSubject, number> = {
  teb: 1,
  exe: 2,
  LT: 3,
  his: 4,
  geo: 5,
  art: 6,
  mat: 7,
  esp: 8,
  ing: 9,
  lat: 10,
  cie: 11,
  pro: 12,
};

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

/**
 * Paused subjects: hidden from Homescool menu; do not generate new cell JSON
 * or Mongo upserts for these until the user re-enables them.
 */
export const HOMESCOOL_SUBJECTS_PAUSED = ["teb", "exe"] as const;

export type HomescoolPausedSubject = (typeof HOMESCOOL_SUBJECTS_PAUSED)[number];

export const HOMESCOOL_SUBJECTS_ACTIVE = HOMESCOOL_SUBJECTS.filter(
  (s) => !(HOMESCOOL_SUBJECTS_PAUSED as readonly string[]).includes(s),
);

export function isHomescoolSubjectPaused(subject: string): boolean {
  return (HOMESCOOL_SUBJECTS_PAUSED as readonly string[]).includes(subject);
}

export function subjectClassNumber(subject: string): number {
  if (subject in HOMESCOOL_SUBJECT_CLASS_NO) {
    return HOMESCOOL_SUBJECT_CLASS_NO[subject as HomescoolSubject];
  }
  return 0;
}

export function subjectDisplayName(subject: string): string {
  if (subject in HOMESCOOL_SUBJECT_LABELS) {
    return HOMESCOOL_SUBJECT_LABELS[subject as HomescoolSubject];
  }
  return subject;
}
