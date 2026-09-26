/**
 * Canonical Homescool subject order and class numbers (active menu 1–10).
 * `teb` and `exe` stay paused and are not numbered in the UI.
 */

export const HOMESCOOL_SUBJECTS = [
  "pro",
  "esp",
  "ing",
  "lat",
  "mat",
  "his",
  "LT",
  "geo",
  "cie",
  "art",
  "teb",
  "exe",
] as const;

export type HomescoolSubject = (typeof HOMESCOOL_SUBJECTS)[number];

/** Class numbers on active menu chips and letter headers. */
export const HOMESCOOL_SUBJECT_CLASS_NO: Record<HomescoolSubject, number> = {
  pro: 1,
  esp: 2,
  ing: 3,
  lat: 4,
  mat: 5,
  his: 6,
  LT: 7,
  geo: 8,
  cie: 9,
  art: 10,
  teb: 0,
  exe: 0,
};

/** Short labels on DHS subject chips (e.g. `ing`, `LinT`). */
export const HOMESCOOL_SUBJECT_CHIP_LABELS: Record<HomescoolSubject, string> = {
  pro: "proy",
  esp: "esp",
  ing: "ing",
  lat: "lat",
  mat: "mat",
  his: "hist",
  LT: "LinT",
  geo: "geo",
  cie: "cienc",
  art: "art",
  teb: "teb",
  exe: "exe",
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

export function subjectChipLabel(subject: string): string {
  if (subject in HOMESCOOL_SUBJECT_CHIP_LABELS) {
    return HOMESCOOL_SUBJECT_CHIP_LABELS[subject as HomescoolSubject];
  }
  return subject;
}

export function subjectDisplayName(subject: string): string {
  if (subject in HOMESCOOL_SUBJECT_LABELS) {
    return HOMESCOOL_SUBJECT_LABELS[subject as HomescoolSubject];
  }
  return subject;
}

/** DHS chip text (short label only; class number stays in tooltip / letter header). */
export function subjectChipText(subject: string): string {
  return subjectChipLabel(subject);
}
