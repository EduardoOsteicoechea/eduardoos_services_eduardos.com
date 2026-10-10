/**
 * Scrib Bible panel data — NT Greek (SBLGNT) + OT Hebrew (WLC).
 */

export type BibleCorpus = "nt-greek" | "ot-hebrew";

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
  corpus: BibleCorpus;
  languageLabel: string;
  url: string;
};

export type BibleCorpusOption = {
  id: BibleCorpus;
  label: string;
  shortLabel: string;
};

export const SCRIB_BIBLE_CORPORA: BibleCorpusOption[] = [
  { id: "nt-greek", label: "NT · Greek", shortLabel: "NT" },
  { id: "ot-hebrew", label: "OT · Hebrew", shortLabel: "OT" },
];

const NT_GREEK: Array<{ id: string; name: string }> = [
  { id: "matthew", name: "Matthew" },
  { id: "mark", name: "Mark" },
  { id: "luke", name: "Luke" },
  { id: "john", name: "John" },
  { id: "acts", name: "Acts" },
  { id: "romans", name: "Romans" },
  { id: "1corinthians", name: "1 Corinthians" },
  { id: "2corinthians", name: "2 Corinthians" },
  { id: "galatians", name: "Galatians" },
  { id: "ephesians", name: "Ephesians" },
  { id: "philippians", name: "Philippians" },
  { id: "colossians", name: "Colossians" },
  { id: "1thessalonians", name: "1 Thessalonians" },
  { id: "2thessalonians", name: "2 Thessalonians" },
  { id: "1timothy", name: "1 Timothy" },
  { id: "2timothy", name: "2 Timothy" },
  { id: "titus", name: "Titus" },
  { id: "philemon", name: "Philemon" },
  { id: "hebrews", name: "Hebrews" },
  { id: "james", name: "James" },
  { id: "1peter", name: "1 Peter" },
  { id: "2peter", name: "2 Peter" },
  { id: "1john", name: "1 John" },
  { id: "2john", name: "2 John" },
  { id: "3john", name: "3 John" },
  { id: "jude", name: "Jude" },
  { id: "revelation", name: "Revelation" },
];

const OT_HEBREW: Array<{ id: string; name: string }> = [
  { id: "genesis", name: "Genesis" },
  { id: "exodus", name: "Exodus" },
  { id: "leviticus", name: "Leviticus" },
  { id: "numbers", name: "Numbers" },
  { id: "deuteronomy", name: "Deuteronomy" },
  { id: "joshua", name: "Joshua" },
  { id: "judges", name: "Judges" },
  { id: "ruth", name: "Ruth" },
  { id: "1samuel", name: "1 Samuel" },
  { id: "2samuel", name: "2 Samuel" },
  { id: "1kings", name: "1 Kings" },
  { id: "2kings", name: "2 Kings" },
  { id: "1chronicles", name: "1 Chronicles" },
  { id: "2chronicles", name: "2 Chronicles" },
  { id: "ezra", name: "Ezra" },
  { id: "nehemiah", name: "Nehemiah" },
  { id: "esther", name: "Esther" },
  { id: "job", name: "Job" },
  { id: "psalms", name: "Psalms" },
  { id: "proverbs", name: "Proverbs" },
  { id: "ecclesiastes", name: "Ecclesiastes" },
  { id: "songofsolomon", name: "Song of Solomon" },
  { id: "isaiah", name: "Isaiah" },
  { id: "jeremiah", name: "Jeremiah" },
  { id: "lamentations", name: "Lamentations" },
  { id: "ezekiel", name: "Ezekiel" },
  { id: "daniel", name: "Daniel" },
  { id: "hosea", name: "Hosea" },
  { id: "joel", name: "Joel" },
  { id: "amos", name: "Amos" },
  { id: "obadiah", name: "Obadiah" },
  { id: "jonah", name: "Jonah" },
  { id: "micah", name: "Micah" },
  { id: "nahum", name: "Nahum" },
  { id: "habakkuk", name: "Habakkuk" },
  { id: "zephaniah", name: "Zephaniah" },
  { id: "haggai", name: "Haggai" },
  { id: "zechariah", name: "Zechariah" },
  { id: "malachi", name: "Malachi" },
];

/** Available books in the Scrib Bible tray. */
export const SCRIB_BIBLE_BOOKS: BibleBookOption[] = [
  ...NT_GREEK.map((b) => ({
    id: b.id,
    name: b.name,
    corpus: "nt-greek" as const,
    languageLabel: "Greek",
    url: `/scrib/bible/${b.id}-greek.json`,
  })),
  ...OT_HEBREW.map((b) => ({
    id: b.id,
    name: b.name,
    corpus: "ot-hebrew" as const,
    languageLabel: "Hebrew",
    url: `/scrib/bible/${b.id}-hebrew.json`,
  })),
];

export function booksForCorpus(corpus: BibleCorpus): BibleBookOption[] {
  return SCRIB_BIBLE_BOOKS.filter((b) => b.corpus === corpus);
}

/** Compact tab label: first three letters (numbered books keep the digit). */
export function bibleBookShortLabel(name: string): string {
  const trimmed = name.trim();
  const numbered = trimmed.match(/^(\d+)\s+(.+)$/);
  if (numbered) {
    const word = numbered[2] ?? "";
    return `${numbered[1]}${word.slice(0, 3)}`;
  }
  return trimmed.slice(0, 3);
}

export function resolveBibleBook(
  bookId: string,
  corpus?: BibleCorpus,
): BibleBookOption | undefined {
  if (corpus) {
    return SCRIB_BIBLE_BOOKS.find((b) => b.id === bookId && b.corpus === corpus);
  }
  return SCRIB_BIBLE_BOOKS.find((b) => b.id === bookId);
}

export function defaultBookForCorpus(corpus: BibleCorpus): BibleBookOption {
  const list = booksForCorpus(corpus);
  return list[0]!;
}

export function corpusForBookId(bookId: string): BibleCorpus {
  const match = SCRIB_BIBLE_BOOKS.find((b) => b.id === bookId);
  return match?.corpus ?? "nt-greek";
}

const bookCache = new Map<string, BibleBookDoc>();

export async function fetchScribBibleBook(bookId: string): Promise<BibleBookDoc> {
  const meta = resolveBibleBook(bookId);
  if (!meta) {
    throw new Error(`Bible book not available: ${bookId}`);
  }
  const cached = bookCache.get(meta.url);
  if (cached) {
    return cached;
  }
  const res = await fetch(meta.url, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Failed to load ${meta.name} (${res.status})`);
  }
  const doc = (await res.json()) as BibleBookDoc;
  if (!doc?.chapters?.length) {
    throw new Error(`${meta.name} has no chapters`);
  }
  bookCache.set(meta.url, doc);
  return doc;
}
