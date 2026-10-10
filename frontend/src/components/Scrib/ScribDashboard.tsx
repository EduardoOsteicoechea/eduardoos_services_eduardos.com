/**
 * Scrib dashboard — sections as containers with sheet cards + new sheet.
 * Section and sheet names are inline-editable (blur / Enter persist).
 * Sections reorder via up/down; sheets drag-and-drop between sections.
 */

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import ServiceGate from "../ServiceGate/ServiceGate";
import { ViewLoading } from "../ViewLoading/ViewLoading";
import {
  createScribBook,
  createScribSheet,
  deleteScribBook,
  deleteScribSheet,
  fetchScribLibrary,
  moveScribSheet,
  renameScribBook,
  renameScribSheet,
  reorderScribLibrary,
  scribSheetHref,
  type ScribBookCard,
  type SheetMeta,
} from "../../lib/scrib";
import {
  DashboardSection,
  ProductHubShell,
} from "../ProductDashboard/ProductDashboard";
import "../ProductDashboard/ProductDashboard.css";
import "./Scrib.css";

const SHEET_DRAG_MIME = "application/x-scrib-sheet";

/** Shared rail width for every section (curriculum-index resize pattern). */
const RAIL_WIDTH_STORAGE_KEY = "eduardoos-scrib-book-rail-width";
const RAIL_WIDTH_DEFAULT_REM = 2.5;
const RAIL_WIDTH_MIN_REM = 1.75;
const RAIL_WIDTH_MAX_REM = 8;

function readRootRem(): number {
  if (typeof document === "undefined") return 16;
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(px) && px > 0 ? px : 16;
}

function clampRailWidthRem(value: number): number {
  return Math.min(RAIL_WIDTH_MAX_REM, Math.max(RAIL_WIDTH_MIN_REM, value));
}

function readStoredRailWidthRem(): number {
  try {
    const raw = localStorage.getItem(RAIL_WIDTH_STORAGE_KEY);
    if (!raw) return RAIL_WIDTH_DEFAULT_REM;
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return RAIL_WIDTH_DEFAULT_REM;
    return clampRailWidthRem(parsed);
  } catch {
    return RAIL_WIDTH_DEFAULT_REM;
  }
}

function writeStoredRailWidthRem(rem: number): void {
  try {
    localStorage.setItem(RAIL_WIDTH_STORAGE_KEY, String(clampRailWidthRem(rem)));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Legacy Institutes library entries are not shown as Scrib sections. */
function isLegacyInstitutesSection(book: ScribBookCard): boolean {
  const name = book.name.trim().toLowerCase();
  return (
    /^calvin'?s?\s*institutes\b/.test(name) ||
    name === "institutes" ||
    name.startsWith("institutio")
  );
}

type SheetDragPayload = {
  bookId: string;
  sheetId: string;
};

function readSheetDrag(e: DragEvent): SheetDragPayload | null {
  try {
    const raw = e.dataTransfer.getData(SHEET_DRAG_MIME) || e.dataTransfer.getData("text/plain");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SheetDragPayload>;
    if (typeof parsed.bookId !== "string" || typeof parsed.sheetId !== "string") {
      return null;
    }
    return { bookId: parsed.bookId, sheetId: parsed.sheetId };
  } catch {
    return null;
  }
}

export default function ScribDashboard() {
  const [userSafe, setUserSafe] = useState("");
  const [books, setBooks] = useState<ScribBookCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [busy, setBusy] = useState(false);
  const [draggingSheetId, setDraggingSheetId] = useState("");
  const [dropTargetBookId, setDropTargetBookId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [railWidthRem, setRailWidthRem] = useState(() =>
    typeof window === "undefined" ? RAIL_WIDTH_DEFAULT_REM : readStoredRailWidthRem(),
  );

  const onRailResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const handle = e.currentTarget;
      const pointerId = e.pointerId;
      try {
        handle.setPointerCapture(pointerId);
      } catch {
        /* capture optional — window listeners still drive the drag */
      }
      const startX = e.clientX;
      const startRem = railWidthRem;
      const rootRem = readRootRem();

      const onMove = (moveEv: PointerEvent) => {
        if (moveEv.pointerId !== pointerId) return;
        const deltaRem = (moveEv.clientX - startX) / rootRem;
        setRailWidthRem(clampRailWidthRem(startRem + deltaRem));
      };

      const onEnd = (endEv: PointerEvent) => {
        if (endEv.pointerId !== pointerId) return;
        try {
          if (handle.hasPointerCapture(pointerId)) {
            handle.releasePointerCapture(pointerId);
          }
        } catch {
          /* ignore */
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        const deltaRem = (endEv.clientX - startX) / rootRem;
        const next = clampRailWidthRem(startRem + deltaRem);
        setRailWidthRem(next);
        writeStoredRailWidthRem(next);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [railWidthRem],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchScribLibrary();
    if (res.error) {
      setError(res.error);
      setBooks([]);
    } else {
      setUserSafe(res.userSafe);
      setBooks(res.books.filter((b) => !isLegacyInstitutesSection(b)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onCreateSection(e: FormEvent) {
    e.preventDefault();
    const name = sectionName.trim();
    if (!name || busy) return;
    setBusy(true);
    const res = await createScribBook(name);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSectionName("");
    await reload();
  }

  function openSheet(bookId: string, sheetId: string) {
    window.location.href = scribSheetHref(userSafe, bookId, sheetId);
  }

  async function onNewSheet(bookId: string) {
    if (busy) return;
    setBusy(true);
    const res = await createScribSheet(bookId, "Hoja nueva");
    setBusy(false);
    if (res.error || !res.sheet) {
      setError(res.error ?? "Could not create sheet");
      return;
    }
    openSheet(bookId, res.sheet.id);
  }

  function openDeleteSection(bookId: string, name: string) {
    if (busy) return;
    setDeleteTarget({ id: bookId, name });
    setDeleteConfirmText("");
  }

  function closeDeleteSection() {
    setDeleteTarget(null);
    setDeleteConfirmText("");
  }

  async function confirmDeleteSection() {
    if (!deleteTarget || busy) return;
    if (deleteConfirmText.trim() !== deleteTarget.name) return;
    setBusy(true);
    const res = await deleteScribBook(deleteTarget.id);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    closeDeleteSection();
    await reload();
  }

  async function onDeleteSheet(bookId: string, sheetId: string) {
    if (busy || !window.confirm("¿Eliminar esta hoja?")) return;
    setBusy(true);
    const res = await deleteScribSheet(bookId, sheetId);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    await reload();
  }

  async function commitSectionName(bookId: string, previous: string, nextRaw: string) {
    const next = nextRaw.trim();
    if (!next || next === previous || busy) {
      if (!next) await reload();
      return;
    }
    setBusy(true);
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, name: next } : b)),
    );
    const res = await renameScribBook(bookId, next);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      await reload();
      return;
    }
  }

  async function commitSheetName(
    bookId: string,
    sheetId: string,
    previous: string,
    nextRaw: string,
  ) {
    const next = nextRaw.trim();
    if (!next || next === previous || busy) {
      if (!next) await reload();
      return;
    }
    setBusy(true);
    setBooks((prev) =>
      prev.map((b) =>
        b.id !== bookId
          ? b
          : {
              ...b,
              sheets: b.sheets.map((s) =>
                s.id === sheetId ? { ...s, name: next } : s,
              ),
            },
      ),
    );
    const res = await renameScribSheet(bookId, sheetId, next);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      await reload();
      return;
    }
  }

  async function moveSection(index: number, delta: number) {
    if (busy) return;
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= books.length) return;
    const next = [...books];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(nextIndex, 0, item);
    setBooks(next);
    setBusy(true);
    const res = await reorderScribLibrary(next.map((b) => b.id));
    setBusy(false);
    if (res.error) {
      setError(res.error);
      await reload();
    }
  }

  function onSheetDragStart(
    e: DragEvent<HTMLElement>,
    bookId: string,
    sheet: SheetMeta,
  ) {
    if (busy) {
      e.preventDefault();
      return;
    }
    // Keep Abrir / rename / delete clickable — do not start a drag from controls.
    const origin = e.target;
    if (
      origin instanceof Element &&
      origin.closest("a, button, input, textarea, select, label")
    ) {
      e.preventDefault();
      return;
    }
    const payload = JSON.stringify({ bookId, sheetId: sheet.id });
    e.dataTransfer.setData(SHEET_DRAG_MIME, payload);
    e.dataTransfer.setData("text/plain", payload);
    e.dataTransfer.effectAllowed = "move";
    setDraggingSheetId(sheet.id);
  }

  function onSheetDragEnd() {
    setDraggingSheetId("");
    setDropTargetBookId("");
  }

  function onSectionDragOver(e: DragEvent<HTMLElement>, bookId: string) {
    if (!draggingSheetId && !e.dataTransfer.types.includes(SHEET_DRAG_MIME)) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetBookId !== bookId) {
      setDropTargetBookId(bookId);
    }
  }

  function onSectionDragLeave(e: DragEvent<HTMLElement>, bookId: string) {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    if (dropTargetBookId === bookId) {
      setDropTargetBookId("");
    }
  }

  async function onSectionDrop(e: DragEvent<HTMLElement>, targetBookId: string) {
    e.preventDefault();
    setDropTargetBookId("");
    setDraggingSheetId("");
    const payload = readSheetDrag(e);
    if (!payload || busy) return;
    if (payload.bookId === targetBookId) return;

    const sourceBook = books.find((b) => b.id === payload.bookId);
    const sheetMeta = sourceBook?.sheets.find((s) => s.id === payload.sheetId);
    if (!sourceBook || !sheetMeta) return;

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === payload.bookId) {
          return {
            ...b,
            sheets: b.sheets.filter((s) => s.id !== payload.sheetId),
          };
        }
        if (b.id === targetBookId) {
          if (b.sheets.some((s) => s.id === payload.sheetId)) return b;
          return { ...b, sheets: [...b.sheets, sheetMeta] };
        }
        return b;
      }),
    );

    setBusy(true);
    const res = await moveScribSheet(payload.bookId, payload.sheetId, targetBookId);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      await reload();
    }
  }

  function onNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      void reload();
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <ServiceGate serviceId="scrib" serviceLabel="Scrib" requireSubscription>
      <ProductHubShell>
        <DashboardSection>
        <form className="scrib-dashboard__new-book" onSubmit={onCreateSection}>
          <div className="scrib-dashboard__row">
            <input
              id="scrib-section-name"
              className="scrib-dashboard__input"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="Nombre de la sección"
              aria-label="Nombre de la sección"
              maxLength={120}
              required
            />
            <button className="btn btn--primary" type="submit" disabled={busy}>
              Crear sección
            </button>
          </div>
        </form>

        {error ? <p className="scrib-dashboard__error">{error}</p> : null}
        {loading ? <ViewLoading label="Loading" /> : null}

        {!loading && books.length === 0 ? (
          <p className="scrib-dashboard__empty">
            Aún no hay secciones. Crea la primera arriba.
          </p>
        ) : null}

        <div
          className="scrib-books"
          style={
            {
              "--scrib-book-rail-width": `${railWidthRem}rem`,
            } as CSSProperties
          }
        >
          {books.map((book, index) => {
            const sectionClass =
              dropTargetBookId === book.id
                ? "scrib-book scrib-book--drop-target"
                : "scrib-book";
            return (
            <section
              key={book.id}
              className={sectionClass}
              aria-label={book.name}
              onDragOver={(e) => onSectionDragOver(e, book.id)}
              onDragLeave={(e) => onSectionDragLeave(e, book.id)}
              onDrop={(e) => void onSectionDrop(e, book.id)}
            >
              <aside className="scrib-book__rail">
                <div className="scrib-book__order" role="group" aria-label="Orden de sección">
                  <button
                    type="button"
                    className="icon-btn scrib-book__order-btn"
                    title="Subir sección"
                    aria-label={`Subir sección ${book.name}`}
                    disabled={busy || index === 0}
                    onClick={() => void moveSection(index, -1)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      arrow_upward
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn scrib-book__order-btn"
                    title="Bajar sección"
                    aria-label={`Bajar sección ${book.name}`}
                    disabled={busy || index >= books.length - 1}
                    onClick={() => void moveSection(index, 1)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      arrow_downward
                    </span>
                  </button>
                </div>
                <input
                  className="scrib-book__title-input"
                  aria-label="Nombre de la sección"
                  defaultValue={book.name}
                  key={`${book.id}:${book.name}`}
                  maxLength={120}
                  disabled={busy}
                  onBlur={(e) =>
                    void commitSectionName(book.id, book.name, e.target.value)
                  }
                  onKeyDown={onNameKeyDown}
                />
              </aside>
              <button
                type="button"
                className="scrib-book__resizer"
                title="Redimensionar barra de sección"
                aria-label="Redimensionar barra de sección"
                onPointerDown={onRailResizePointerDown}
              >
                <span className="scrib-book__resizer-dot" aria-hidden="true" />
                <span className="scrib-book__resizer-dot" aria-hidden="true" />
                <span className="scrib-book__resizer-dot" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-btn scrib-book__delete"
                title="Eliminar sección"
                aria-label={`Eliminar sección ${book.name}`}
                onClick={() => openDeleteSection(book.id, book.name)}
                disabled={busy}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  delete
                </span>
              </button>
              <div className="scrib-book__main">
                <div className="product-dash__grid scrib-sheets" role="list">
                  {(book.sheets ?? []).map((sheet) => {
                    const cardClass =
                      draggingSheetId === sheet.id
                        ? "product-dash__card scrib-sheet-card scrib-sheet-card--dragging"
                        : "product-dash__card scrib-sheet-card";
                    const sheetHref = scribSheetHref(userSafe, book.id, sheet.id);
                    return (
                    <div
                      key={sheet.id}
                      className={cardClass}
                      role="listitem"
                      draggable={!busy}
                      onDragStart={(e) => onSheetDragStart(e, book.id, sheet)}
                      onDragEnd={onSheetDragEnd}
                      onClick={(e) => {
                        const t = e.target;
                        if (
                          t instanceof Element &&
                          t.closest("a, button, input, textarea, select, label")
                        ) {
                          return;
                        }
                        openSheet(book.id, sheet.id);
                      }}
                    >
                      <span
                        className="scrib-sheet-card__drag"
                        title="Arrastrar a otra sección"
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          drag_indicator
                        </span>
                      </span>
                      <div className="scrib-sheet-card__body">
                        <input
                          className="scrib-sheet-card__name-input product-dash__card-title"
                          aria-label="Nombre de la hoja"
                          defaultValue={sheet.name}
                          key={`${sheet.id}:${sheet.name}`}
                          maxLength={120}
                          disabled={busy}
                          draggable={false}
                          onMouseDown={(e) => e.stopPropagation()}
                          onBlur={(e) =>
                            void commitSheetName(
                              book.id,
                              sheet.id,
                              sheet.name,
                              e.target.value,
                            )
                          }
                          onKeyDown={onNameKeyDown}
                        />
                        <span className="scrib-sheet-card__meta product-dash__card-desc">
                          {sheet.updatedAt
                            ? new Date(sheet.updatedAt).toLocaleString()
                            : ""}
                        </span>
                        <a
                          className="scrib-sheet-card__open"
                          href={sheetHref}
                          draggable={false}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Abrir
                        </a>
                      </div>
                      <button
                        type="button"
                        className="scrib-sheet-card__remove"
                        aria-label={`Eliminar ${sheet.name}`}
                        onClick={() => void onDeleteSheet(book.id, sheet.id)}
                        disabled={busy}
                        draggable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        ×
                      </button>
                    </div>
                    );
                  })}
                  <button
                    type="button"
                    className="product-dash__card scrib-sheet-card scrib-sheet-card--new"
                    onClick={() => void onNewSheet(book.id)}
                    disabled={busy}
                  >
                    <span className="product-dash__card-head">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        note_add
                      </span>
                      <span className="product-dash__card-title">Nueva hoja</span>
                    </span>
                  </button>
                </div>
              </div>
            </section>
            );
          })}
        </div>

        {deleteTarget ? (
          <div
            className="scrib-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scrib-delete-title"
          >
            <div className="scrib-delete-modal__panel">
              <h2 id="scrib-delete-title" className="scrib-delete-modal__title">
                Eliminar sección
              </h2>
              <p className="scrib-delete-modal__hint">
                Se borrarán todas las hojas. Para confirmar, escribe{" "}
                <strong>{deleteTarget.name}</strong>.
              </p>
              <input
                className="scrib-delete-modal__input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget.name}
                aria-label="Escribe el nombre de la sección para confirmar"
                autoFocus
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    closeDeleteSection();
                  }
                  if (
                    e.key === "Enter" &&
                    deleteConfirmText.trim() === deleteTarget.name
                  ) {
                    e.preventDefault();
                    void confirmDeleteSection();
                  }
                }}
              />
              <div className="scrib-delete-modal__actions">
                <button
                  type="button"
                  className="btn"
                  onClick={closeDeleteSection}
                  disabled={busy}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void confirmDeleteSection()}
                  disabled={
                    busy || deleteConfirmText.trim() !== deleteTarget.name
                  }
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ) : null}
        </DashboardSection>
      </ProductHubShell>
    </ServiceGate>
  );
}
