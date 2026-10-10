/**
 * Scrib Institutes panel — Liber tabs → Caput number chips → paragraph number
 * chips → plain text. Spec 056.
 *
 * Nav state (Liber / Caput / paragraph) persists across toggle and in
 * localStorage (`eduardoos-scrib-institutes-nav`) — amendment 2026-09-03.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  chapterNavLabel,
  fetchParagraphChapter,
  fetchParagraphIndex,
  groupChaptersByLiber,
  type ParagraphChapterDoc,
  type ParagraphIndexChapter,
  type ParagraphUnit,
} from "../../lib/calvinsInstitutesParagraphs";
import {
  readStoredRefPanelWidthRem,
  SCRIB_INSTITUTES_PANEL_WIDTH_KEY,
  startRefPanelResize,
} from "../../lib/scribPanelResize";
import { ViewLoading } from "../ViewLoading/ViewLoading";
import type { ScribDockSide } from "./ScribToolbar";

const NAV_STORAGE_KEY = "eduardoos-scrib-institutes-nav";

type StoredNav = {
  activeBook: string;
  chapterId: string | null;
  paraOrder: number | null;
};

function readStoredNav(): StoredNav | null {
  try {
    const raw = localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredNav;
    if (!parsed || typeof parsed.activeBook !== "string") return null;
    return {
      activeBook: parsed.activeBook,
      chapterId: typeof parsed.chapterId === "string" ? parsed.chapterId : null,
      paraOrder: typeof parsed.paraOrder === "number" ? parsed.paraOrder : null,
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

type ScribInstitutesPanelProps = {
  open: boolean;
  dockSide?: ScribDockSide;
};

export default function ScribInstitutesModal({
  open,
  dockSide = "left",
}: ScribInstitutesPanelProps) {
  const stored = useMemo(() => readStoredNav(), []);
  const [loadingIndex, setLoadingIndex] = useState(false);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [error, setError] = useState("");
  const [chapters, setChapters] = useState<ParagraphIndexChapter[]>([]);
  const [activeBook, setActiveBook] = useState(stored?.activeBook ?? "I");
  const [selected, setSelected] = useState<ParagraphIndexChapter | null>(null);
  const [doc, setDoc] = useState<ParagraphChapterDoc | null>(null);
  const [selectedParaOrder, setSelectedParaOrder] = useState<number | null>(
    stored?.paraOrder ?? null,
  );
  const [pendingChapterId, setPendingChapterId] = useState<string | null>(
    stored?.chapterId ?? null,
  );
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [panelWidthRem, setPanelWidthRem] = useState(() =>
    typeof window === "undefined"
      ? 18.25
      : readStoredRefPanelWidthRem(SCRIB_INSTITUTES_PANEL_WIDTH_KEY),
  );

  const onPanelResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      startRefPanelResize({
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startWidthRem: panelWidthRem,
        dockSide,
        storageKey: SCRIB_INSTITUTES_PANEL_WIDTH_KEY,
        onWidth: setPanelWidthRem,
        captureTarget: e.currentTarget,
      });
    },
    [dockSide, panelWidthRem],
  );

  const groups = useMemo(() => groupChaptersByLiber(chapters), [chapters]);
  const bookEntries = useMemo(() => {
    const g = groups.find((x) => x.book === activeBook);
    return g?.entries ?? [];
  }, [groups, activeBook]);

  const paragraphs = useMemo(() => {
    if (!doc?.paragraphs) return [] as ParagraphUnit[];
    return [...doc.paragraphs].sort((a, b) => a.order - b.order);
  }, [doc]);

  const activeParagraph = useMemo(() => {
    if (selectedParaOrder == null) return null;
    return paragraphs.find((p) => p.order === selectedParaOrder) ?? null;
  }, [paragraphs, selectedParaOrder]);

  useEffect(() => {
    writeStoredNav({
      activeBook,
      chapterId: selected?.id ?? pendingChapterId,
      paraOrder: selectedParaOrder,
    });
  }, [activeBook, selected, pendingChapterId, selectedParaOrder]);

  /* Load index once (or when empty) — do not wipe selection on every open. */
  useEffect(() => {
    if (!open || chapters.length > 0) return;
    let cancelled = false;
    setLoadingIndex(true);
    setError("");
    void (async () => {
      try {
        const idx = await fetchParagraphIndex();
        if (cancelled) return;
        const list = idx.chapters ?? [];
        setChapters(list);
        const grouped = groupChaptersByLiber(list);
        const nav = readStoredNav();
        const book =
          nav?.activeBook && grouped.some((g) => g.book === nav.activeBook)
            ? nav.activeBook
            : grouped[0]?.book ?? "I";
        setActiveBook(book);
        if (nav?.chapterId) {
          const match = list.find((c) => c.id === nav.chapterId) ?? null;
          if (match) {
            setSelected(match);
            setPendingChapterId(match.id);
            if (typeof nav.paraOrder === "number") {
              setSelectedParaOrder(nav.paraOrder);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load Institutes index");
          setChapters([]);
        }
      } finally {
        if (!cancelled) setLoadingIndex(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, chapters.length]);

  /* After index is warm and we only have a pending id, resolve selection. */
  useEffect(() => {
    if (!pendingChapterId || selected || chapters.length === 0) return;
    const match = chapters.find((c) => c.id === pendingChapterId) ?? null;
    if (match) setSelected(match);
  }, [pendingChapterId, selected, chapters]);

  useEffect(() => {
    if (!open || !selected) {
      if (!selected) setDoc(null);
      return;
    }
    let cancelled = false;
    setLoadingChapter(true);
    setError("");
    void (async () => {
      try {
        const chapterDoc = await fetchParagraphChapter(selected.book, selected.chapter);
        if (cancelled) return;
        setDoc(chapterDoc);
        const nav = readStoredNav();
        if (
          nav?.chapterId === selected.id &&
          typeof nav.paraOrder === "number" &&
          chapterDoc.paragraphs?.some((p) => p.order === nav.paraOrder)
        ) {
          setSelectedParaOrder(nav.paraOrder);
        }
      } catch (e) {
        if (!cancelled) {
          setDoc(null);
          setError(e instanceof Error ? e.message : "Failed to load chapter");
        }
      } finally {
        if (!cancelled) setLoadingChapter(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selected]);

  if (!open) return null;

  const dockClass =
    dockSide === "right"
      ? "scrib-ref-panel scrib-ref-panel--institutes scrib-ref-panel--dock-right"
      : "scrib-ref-panel scrib-ref-panel--institutes scrib-ref-panel--dock-left";
  const panelClass = navCollapsed
    ? `${dockClass} scrib-ref-panel--nav-collapsed`
    : dockClass;
  const collapseLabel = navCollapsed
    ? "Mostrar selector de liber, caput y párrafo"
    : "Ocultar selector de liber, caput y párrafo";

  return (
    <aside
      className={panelClass}
      aria-label="Institutes Capita"
      style={
        {
          "--scrib-ref-panel-width": `${panelWidthRem}rem`,
        } as CSSProperties
      }
    >
      <button
        type="button"
        className="scrib-resize-grip scrib-ref-panel__resizer"
        title="Redimensionar panel Institutes"
        aria-label="Redimensionar panel Institutes"
        onPointerDown={onPanelResizePointerDown}
      >
        <span className="scrib-resize-grip__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      <header className="scrib-ref-panel__head">
        <h2>Institutes</h2>
      </header>

      <div className="scrib-ref-panel__scroll">
        {error ? <p className="scrib-ref-panel__error">{error}</p> : null}

        {loadingIndex ? (
          <ViewLoading compact label="Loading Capita" />
        ) : (
          <>
            {!navCollapsed ? (
              <>
                <div className="scrib-ref-panel__tabs" role="tablist" aria-label="Libri">
                  {groups.map((g) => (
                    <button
                      key={g.book}
                      type="button"
                      role="tab"
                      aria-selected={activeBook === g.book}
                      className={
                        activeBook === g.book
                          ? "scrib-ref-panel__tab is-active"
                          : "scrib-ref-panel__tab"
                      }
                      onClick={() => {
                        setActiveBook(g.book);
                        setSelected(null);
                        setPendingChapterId(null);
                        setDoc(null);
                        setSelectedParaOrder(null);
                      }}
                    >
                      Liber {g.book}
                    </button>
                  ))}
                </div>

                <section className="scrib-ref-panel__step" aria-label="Chapter">
                  <div
                    className="scrib-ref-panel__chips scrib-ref-panel__chips--chapters"
                    role="listbox"
                    aria-label="Caput number"
                  >
                    {bookEntries.map((entry) => {
                      const label = chapterNavLabel(entry);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          role="option"
                          title={entry.heading}
                          aria-selected={selected?.id === entry.id}
                          className={
                            selected?.id === entry.id
                              ? "scrib-ref-panel__chip is-active"
                              : "scrib-ref-panel__chip"
                          }
                          onClick={() => {
                            setSelected(entry);
                            setPendingChapterId(entry.id);
                            setSelectedParaOrder(null);
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {!selected ? (
                    <p className="scrib-ref-panel__status">Select a chapter.</p>
                  ) : null}
                </section>

                {selected ? (
                  <section className="scrib-ref-panel__step" aria-label="Paragraph">
                    {loadingChapter ? (
                      <ViewLoading compact label="Loading paragraphs" />
                    ) : (
                      <>
                        <div
                          className="scrib-ref-panel__chips scrib-ref-panel__chips--paras"
                          role="listbox"
                          aria-label="Paragraph number"
                        >
                          {paragraphs.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              role="option"
                              aria-selected={selectedParaOrder === p.order}
                              className={
                                selectedParaOrder === p.order
                                  ? "scrib-ref-panel__chip is-active"
                                  : "scrib-ref-panel__chip"
                              }
                              onClick={() => setSelectedParaOrder(p.order)}
                            >
                              {p.order}
                            </button>
                          ))}
                        </div>
                        {selectedParaOrder == null ? (
                          <p className="scrib-ref-panel__status">Select a paragraph.</p>
                        ) : null}
                      </>
                    )}
                  </section>
                ) : null}
              </>
            ) : null}

            <button
              type="button"
              className="scrib-ref-panel__nav-toggle icon-btn"
              title={collapseLabel}
              aria-label={collapseLabel}
              aria-pressed={navCollapsed}
              onClick={() => setNavCollapsed((v) => !v)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {navCollapsed ? "unfold_more" : "unfold_less"}
              </span>
            </button>

            <section className="scrib-ref-panel__text" aria-live="polite">
              {activeParagraph ? (
                <p className="scrib-ref-panel__text-id">{activeParagraph.id}</p>
              ) : null}
              <textarea
                className="scrib-ref-panel__text-body"
                readOnly
                lang="la"
                value={activeParagraph?.text ?? ""}
                placeholder={activeParagraph ? undefined : "Select a paragraph."}
                aria-label="Paragraph text"
              />
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
