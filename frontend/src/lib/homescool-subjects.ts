/**
 * Canonical Homescool subject order and class numbers (menu 1–12).
 * Order matches `cambios/1_orden_de_clases` and homescool-materials.mdc.
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

/** Class numbers on menu chips and letter headers. */
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
 * No subjects paused: full menu 1–12 (teb…pro).
 * Keep the array for callers that filter; leave empty until a future pause.
 */
export const HOMESCOOL_SUBJECTS_PAUSED = [] as const;

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
