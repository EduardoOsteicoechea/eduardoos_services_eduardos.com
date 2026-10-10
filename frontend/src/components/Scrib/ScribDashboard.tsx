/**
 * Scrib dashboard — sections as containers with sheet cards + new sheet.
 * Section and sheet names are inline-editable (blur / Enter persist).
 * Sections reorder via up/down; sheets drag-and-drop between sections.
 */

import {
  useCallback,
  useEffect,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
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

  async function onNewSheet(bookId: string) {
    if (busy || !userSafe) return;
    setBusy(true);
    const res = await createScribSheet(bookId, "Hoja nueva");
    setBusy(false);
    if (res.error || !res.sheet) {
      setError(res.error ?? "Could not create sheet");
      return;
    }
    window.location.href = scribSheetHref(userSafe, bookId, res.sheet.id);
  }

  async function onDeleteSection(bookId: string) {
    if (busy || !window.confirm("¿Eliminar esta sección y todas sus hojas?")) return;
    setBusy(true);
    const res = await deleteScribBook(bookId);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
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

        <div className="scrib-books">
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
              <div className="scrib-book__main">
                <div className="scrib-book__toolbar">
                  <button
                    type="button"
                    className="btn scrib-book__delete"
                    onClick={() => void onDeleteSection(book.id)}
                    disabled={busy}
                  >
                    Eliminar
                  </button>
                </div>
                <div className="product-dash__grid scrib-sheets" role="list">
                  {(book.sheets ?? []).map((sheet) => {
                    const cardClass =
                      draggingSheetId === sheet.id
                        ? "product-dash__card scrib-sheet-card scrib-sheet-card--dragging"
                        : "product-dash__card scrib-sheet-card";
                    return (
                    <div
                      key={sheet.id}
                      className={cardClass}
                      role="listitem"
                      draggable={!busy}
                      onDragStart={(e) => onSheetDragStart(e, book.id, sheet)}
                      onDragEnd={onSheetDragEnd}
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
                        {userSafe ? (
                          <a
                            className="scrib-sheet-card__open"
                            href={scribSheetHref(userSafe, book.id, sheet.id)}
                            draggable={false}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            Abrir
                          </a>
                        ) : null}
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
                    disabled={busy || !userSafe}
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
        </DashboardSection>
      </ProductHubShell>
    </ServiceGate>
  );
}
