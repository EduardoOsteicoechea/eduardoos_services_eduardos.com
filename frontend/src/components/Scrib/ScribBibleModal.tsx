/**
 * Scrib Bible panel — Book → Chapter → Verse, docked top-right (same UX as Institutes).
 * For now only Romans (Greek / SBLGNT) is available.
 */

import { useEffect, useMemo, useState } from "react";
import {
  fetchScribBibleBook,
  SCRIB_BIBLE_BOOKS,
  type BibleBookDoc,
  type BibleVerse,
} from "../../lib/scribBible";
import { ViewLoading } from "../ViewLoading/ViewLoading";

const NAV_STORAGE_KEY = "eduardoos-scrib-bible-nav";

type StoredNav = {
  bookId: string;
  chapter: number | null;
  verse: number | null;
};

function readStoredNav(): StoredNav | null {
  try {
    const raw = localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredNav;
    if (!parsed || typeof parsed.bookId !== "string") return null;
    return {
      bookId: parsed.bookId,
      chapter: typeof parsed.chapter === "number" ? parsed.chapter : null,
      verse: typeof parsed.verse === "number" ? parsed.verse : null,
    };
  } catch {
    return null;
  }
}

function writeStoredNav(nav: StoredNav): void {
  try {
    localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(nav));
  } catch {
    /* private mode */
  }
}

type ScribBibleModalProps = {
  open: boolean;
};

export default function ScribBibleModal({ open }: ScribBibleModalProps) {
  const stored = useMemo(() => readStoredNav(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookId, setBookId] = useState(stored?.bookId ?? SCRIB_BIBLE_BOOKS[0]?.id ?? "romans");
  const [doc, setDoc] = useState<BibleBookDoc | null>(null);
  const [chapter, setChapter] = useState<number | null>(stored?.chapter ?? null);
  const [verse, setVerse] = useState<number | null>(stored?.verse ?? null);

  const chapterDoc = useMemo(() => {
    if (!doc || chapter == null) return null;
    return doc.chapters.find((c) => c.chapter === chapter) ?? null;
  }, [doc, chapter]);

  const verses = useMemo(() => chapterDoc?.verses ?? ([] as BibleVerse[]), [chapterDoc]);

  const activeVerse = useMemo(() => {
    if (verse == null) return null;
    return verses.find((v) => v.verse === verse) ?? null;
  }, [verses, verse]);

  useEffect(() => {
    writeStoredNav({ bookId, chapter, verse });
  }, [bookId, chapter, verse]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const next = await fetchScribBibleBook(bookId);
        if (cancelled) return;
        setDoc(next);
        const nav = readStoredNav();
        const preferredChapter =
          nav?.bookId === bookId && typeof nav.chapter === "number"
            ? nav.chapter
            : next.chapters[0]?.chapter ?? null;
        const matchChapter =
          next.chapters.find((c) => c.chapter === preferredChapter) ?? next.chapters[0] ?? null;
        setChapter(matchChapter?.chapter ?? null);
        if (
          matchChapter &&
          nav?.bookId === bookId &&
          typeof nav.verse === "number" &&
          matchChapter.verses.some((v) => v.verse === nav.verse)
        ) {
          setVerse(nav.verse);
        } else if (matchChapter && verse == null) {
          setVerse(null);
        }
      } catch (e) {
        if (!cancelled) {
          setDoc(null);
          setError(e instanceof Error ? e.message : "Failed to load Bible book");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bookId]);

  if (!open) return null;

  return (
    <aside className="scrib-ref-panel" aria-label="Bible">
      <header className="scrib-ref-panel__head">
        <h2>Bible</h2>
      </header>

      <div className="scrib-ref-panel__scroll">
        {error ? <p className="scrib-ref-panel__error">{error}</p> : null}

        {loading && !doc ? (
          <ViewLoading compact label="Loading Bible" />
        ) : (
          <>
            <div className="scrib-ref-panel__tabs" role="tablist" aria-label="Books">
              {SCRIB_BIBLE_BOOKS.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  role="tab"
                  aria-selected={bookId === book.id}
                  className={
                    bookId === book.id
                      ? "scrib-ref-panel__tab is-active"
                      : "scrib-ref-panel__tab"
                  }
                  onClick={() => {
                    setBookId(book.id);
                    setChapter(null);
                    setVerse(null);
                    setDoc(null);
                  }}
                >
                  {book.name}
                  <span className="scrib-ref-panel__tab-meta">{book.languageLabel}</span>
                </button>
              ))}
            </div>

            <section className="scrib-ref-panel__step" aria-label="Chapter">
              <div
                className="scrib-ref-panel__chips scrib-ref-panel__chips--chapters"
                role="listbox"
                aria-label="Chapter number"
              >
                {(doc?.chapters ?? []).map((entry) => (
                  <button
                    key={entry.chapter}
                    type="button"
                    role="option"
                    aria-selected={chapter === entry.chapter}
                    className={
                      chapter === entry.chapter
                        ? "scrib-ref-panel__chip is-active"
                        : "scrib-ref-panel__chip"
                    }
                    onClick={() => {
                      setChapter(entry.chapter);
                      setVerse(null);
                    }}
                  >
                    {entry.chapter}
                  </button>
                ))}
              </div>
              {chapter == null ? (
                <p className="scrib-ref-panel__status">Select a chapter.</p>
              ) : null}
            </section>

            {chapter != null ? (
              <section className="scrib-ref-panel__step" aria-label="Verse">
                {loading ? (
                  <ViewLoading compact label="Loading verses" />
                ) : (
                  <>
                    <div
                      className="scrib-ref-panel__chips scrib-ref-panel__chips--verses"
                      role="listbox"
                      aria-label="Verse number"
                    >
                      {verses.map((v) => (
                        <button
                          key={v.verse}
                          type="button"
                          role="option"
                          aria-selected={verse === v.verse}
                          className={
                            verse === v.verse
                              ? "scrib-ref-panel__chip is-active"
                              : "scrib-ref-panel__chip"
                          }
                          onClick={() => setVerse(v.verse)}
                        >
                          {v.verse}
                        </button>
                      ))}
                    </div>
                    {verse == null ? (
                      <p className="scrib-ref-panel__status">Select a verse.</p>
                    ) : null}
                  </>
                )}
              </section>
            ) : null}

            {activeVerse ? (
              <section className="scrib-ref-panel__text" aria-live="polite">
                <p className="scrib-ref-panel__text-id">
                  {doc?.bookName} {chapter}:{activeVerse.verse}
                  {doc?.edition ? ` · ${doc.edition}` : ""}
                </p>
                <p className="scrib-ref-panel__text-body">{activeVerse.text}</p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
