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

export type ParagraphsIndex = {
  books?: ParagraphsBook[];
  chapters?: Array<{ book: string; chapter: string; heading?: string }>;
};

export type ParagraphChapter = {
  book: string;
  chapter: string;
  heading?: string;
  paragraphs: Array<{ order?: number; text: string }>;
};

export async function fetchInstitutesIndex(): Promise<InstitutesIndex> {
  if (mustLog) console.log("[latin] institutes index");
  return apiGet<InstitutesIndex>("/latin/calvins-institutes");
}

export async function fetchParagraphsIndex(): Promise<ParagraphsIndex> {
  if (mustLog) console.log("[latin] paragraphs index");
  return apiGet<ParagraphsIndex>("/latin/calvins-institutes/paragraphs");
}

export async function fetchParagraphChapter(book: string, chapter: string): Promise<ParagraphChapter> {
  if (mustLog) console.log("[latin] chapter", { book, chapter });
  return apiGet<ParagraphChapter>(
    `/latin/calvins-institutes/paragraphs/chapters/${encodeURIComponent(book)}/${encodeURIComponent(chapter)}`,
  );
}
