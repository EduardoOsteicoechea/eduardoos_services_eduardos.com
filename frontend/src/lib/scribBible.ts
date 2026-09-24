/**
 * Scrib Bible panel data — Greek Romans (SBLGNT) for now.
 */

export type BibleVerse = {
  verse: number;
  text: string;
};

export type BibleChapter = {
  chapter: number;
  verses: BibleVerse[];
};

export type BibleBookDoc = {
  bookId: string;
  bookName: string;
  language: string;
  edition: string;
  source?: string;
  chapters: BibleChapter[];
};

export type BibleBookOption = {
  id: string;
  name: string;
  languageLabel: string;
  url: string;
};

/** Available books in the Scrib Bible tray (expand later). */
export const SCRIB_BIBLE_BOOKS: BibleBookOption[] = [
  {
    id: "romans",
    name: "Romans",
    languageLabel: "Greek",
    url: "/scrib/bible/romans-greek.json",
  },
];

let cachedRomans: BibleBookDoc | null = null;

export async function fetchScribBibleBook(bookId: string): Promise<BibleBookDoc> {
  const meta = SCRIB_BIBLE_BOOKS.find((b) => b.id === bookId);
  if (!meta) {
    throw new Error(`Bible book not available: ${bookId}`);
  }
  if (bookId === "romans" && cachedRomans) {
    return cachedRomans;
  }
  const res = await fetch(meta.url, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Failed to load ${meta.name} (${res.status})`);
  }
  const doc = (await res.json()) as BibleBookDoc;
  if (!doc?.chapters?.length) {
    throw new Error(`${meta.name} has no chapters`);
  }
  if (bookId === "romans") cachedRomans = doc;
  return doc;
}
