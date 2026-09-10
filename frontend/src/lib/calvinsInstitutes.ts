/**
 * Calvin’s Institutes (Latin) — public latin API.
 */

import { apiGet } from "./api";
import { mustLog } from "./dev-log";

export type InstitutesIndexSection = {
  id: string;
  order: number;
  volume?: number | null;
  book: string;
  section: string;
  heading: string;
  paragraphCount?: number;
  pointCount?: number;
  url: string;
};

export type InstitutesIndex = {
  schemaVersion?: number;
  sourceSha256?: string;
  sourceEdition?: string;
  sectionCount?: number;
  sections: InstitutesIndexSection[];
};

export type ParagraphsBook = {
  book: string;
  chapters: string[];
};

export type ParagraphIndexChapter = {
  id: string;
  order: number;
  book: string;
  chapter: string;
  heading: string;
  sourceSectionId?: string;
  paragraphCount?: number;
  url?: string;
};

export type ParagraphsIndex = {
  books?: ParagraphsBook[];
  chapters?: ParagraphIndexChapter[];
  chapterCount?: number;
  paragraphCount?: number;
  sourceSha256?: string;
  derivation?: string;
};

export type ParagraphUnit = {
  id?: string;
  order: number;
  text: string;
};

export type ParagraphChapter = {
  id?: string;
  book: string;
  chapter: string;
  heading?: string;
  paragraphs: ParagraphUnit[];
};

export async function fetchInstitutesIndex(): Promise<InstitutesIndex> {
  if (mustLog) console.log("[latin] institutes index");
  return apiGet<InstitutesIndex>("/latin/calvins-institutes");
}

export async function fetchParagraphsIndex(): Promise<ParagraphsIndex> {
  if (mustLog) console.log("[latin] paragraphs index");
  return apiGet<ParagraphsIndex>("/latin/calvins-institutes/paragraphs");
}

/** Alias used by Scrib Capita panel. */
export async function fetchParagraphIndex(): Promise<ParagraphsIndex> {
  return fetchParagraphsIndex();
}

export async function fetchParagraphChapter(book: string, chapter: string): Promise<ParagraphChapter> {
  if (mustLog) console.log("[latin] chapter", { book, chapter });
  return apiGet<ParagraphChapter>(
    `/latin/calvins-institutes/paragraphs/chapters/${encodeURIComponent(book)}/${encodeURIComponent(chapter)}`,
  );
}

/** Liber I–IV groups; chapters sorted by order. */
export function groupChaptersByLiber(
  chapters: ParagraphIndexChapter[],
): { book: string; entries: ParagraphIndexChapter[] }[] {
  const bookOrder = ["I", "II", "III", "IV"];
  const map = new Map<string, ParagraphIndexChapter[]>();
  for (const book of bookOrder) map.set(book, []);
  const sorted = [...chapters].sort((a, b) => a.order - b.order);
  for (const c of sorted) {
    const list = map.get(c.book);
    if (list) list.push(c);
    else {
      map.set(c.book, [c]);
      bookOrder.push(c.book);
    }
  }
  return bookOrder
    .filter((book) => (map.get(book)?.length ?? 0) > 0)
    .map((book) => ({ book, entries: map.get(book)! }));
}

export function chapterNavLabel(entry: ParagraphIndexChapter): string {
  if (entry.chapter === "PRELIMINARY") return "Prelim.";
  return entry.chapter || "";
}
