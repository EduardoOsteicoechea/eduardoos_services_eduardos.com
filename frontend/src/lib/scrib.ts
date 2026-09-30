/**
 * Scrib client — library / books / layered US Letter sheets (cookie CSRF).
 */

import { apiRequest, currentCsrf, getCsrf } from "./api";
import { mustLog } from "./dev-log";

export const SCRIB_PAGE_WIDTH_MM = 215.9;
export const SCRIB_PAGE_HEIGHT_MM = 279.4;

/** Ruled background cycle persisted on each sheet. */
export type ScribBackgroundPattern = "ruled-4-3" | "ruled-4-3-3";

export const SCRIB_BACKGROUND_PATTERN_DEFAULT: ScribBackgroundPattern = "ruled-4-3";

export function normalizeScribBackgroundPattern(
  value: string | undefined | null,
): ScribBackgroundPattern {
  if (value === "ruled-4-3-3") return "ruled-4-3-3";
  return SCRIB_BACKGROUND_PATTERN_DEFAULT;
}

export function toggleScribBackgroundPattern(
  current: ScribBackgroundPattern,
): ScribBackgroundPattern {
  return current === "ruled-4-3" ? "ruled-4-3-3" : "ruled-4-3";
}

/** Ruled SVG sheet — first layer; opacity only (not drawable). */
export const SCRIB_BACKGROUND_LAYER_ID = "background" as const;

export const SCRIB_LAYER_IDS = [
  SCRIB_BACKGROUND_LAYER_ID,
  "chapter",
  "verse",
  "word",
  "original",
  "translation1",
  "translation2",
] as const;

export type ScribLayerId = (typeof SCRIB_LAYER_IDS)[number];

export const SCRIB_DRAW_LAYER_IDS = SCRIB_LAYER_IDS.filter(
  (id) => id !== SCRIB_BACKGROUND_LAYER_ID,
);

export const SCRIB_LAYER_LABELS: Record<ScribLayerId, string> = {
  background: "Fondo (líneas)",
  chapter: "Número de capítulo",
  verse: "Número de versículo",
  word: "Número de palabra",
  original: "Texto original",
  translation1: "Traducción 1",
  translation2: "Traducción 2",
};

export function isScribDrawableLayer(id: string): boolean {
  return (SCRIB_DRAW_LAYER_IDS as readonly string[]).includes(id);
}

export type StrokePath = {
  d: string;
  strokeWidth: number;
};

export type ScribLayer = {
  id: ScribLayerId | string;
  opacity: number;
  paths: StrokePath[];
};

export type SheetMeta = {
  id: string;
  name: string;
  updatedAt: string;
};

export type ScribBookCard = {
  id: string;
  name: string;
  updatedAt: string;
  sheets: SheetMeta[];
};

export type ScribInk = {
  paths: StrokePath[];
};

export type ScribRectMm = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ScribNoteView = {
  open: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ScribNoteAnnotation = {
  id: string;
  name: string;
  heading: ScribInk;
  body: ScribInk;
  view: ScribNoteView;
};

export type ScribNoteArea = {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  rects: ScribRectMm[];
  annotations: ScribNoteAnnotation[];
};

export type ScribNoteBlock = {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  rects: ScribRectMm[];
  areas: ScribNoteArea[];
};

export type ScribSheet = {
  id: string;
  bookId: string;
  name: string;
  activeLayerId: string;
  strokeWidthMm: number;
  /** Ruled background cycle: `ruled-4-3` (default) or `ruled-4-3-3`. */
  backgroundPattern?: ScribBackgroundPattern;
  layers: ScribLayer[];
  /** Annotation tree (optional; legacy sheets omit). */
  noteBlocks?: ScribNoteBlock[];
  updatedAt: string;
};

function normalizeInk(ink: ScribInk | undefined | null): ScribInk {
  return { paths: Array.isArray(ink?.paths) ? ink!.paths.map((p) => ({ ...p })) : [] };
}

function normalizeRect(r: ScribRectMm): ScribRectMm {
  return {
    x: Number(r.x) || 0,
    y: Number(r.y) || 0,
    w: Number(r.w) || 0,
    h: Number(r.h) || 0,
  };
}

function normalizeNoteView(view: ScribNoteView | undefined | null): ScribNoteView {
  return {
    open: Boolean(view?.open),
    x: Number(view?.x) || 0,
    y: Number(view?.y) || 0,
    w: Number(view?.w) > 0 ? Number(view?.w) : 280,
    h: Number(view?.h) > 0 ? Number(view?.h) : 200,
  };
}

export function normalizeScribNoteBlocks(
  blocks: ScribNoteBlock[] | undefined | null,
): ScribNoteBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block) => ({
    id: String(block.id ?? ""),
    name: String(block.name ?? "Bloque"),
    visible: block.visible !== false,
    color: typeof block.color === "string" && block.color ? block.color : "#ff8800",
    rects: Array.isArray(block.rects) ? block.rects.map(normalizeRect) : [],
    areas: Array.isArray(block.areas)
      ? block.areas.map((area) => ({
          id: String(area.id ?? ""),
          name: String(area.name ?? "Área"),
          visible: area.visible !== false,
          color: typeof area.color === "string" && area.color ? area.color : "#2266aa",
          rects: Array.isArray(area.rects) ? area.rects.map(normalizeRect) : [],
          annotations: Array.isArray(area.annotations)
            ? area.annotations.map((ann) => ({
                id: String(ann.id ?? ""),
                name: String(ann.name ?? "Nota"),
                heading: normalizeInk(ann.heading),
                body: normalizeInk(ann.body),
                view: normalizeNoteView(ann.view),
              }))
            : [],
        }))
      : [],
  }));
}

/** Normalize API/legacy sheets that omit `backgroundPattern` / `noteBlocks`. */
export function normalizeScribSheet(sheet: ScribSheet): ScribSheet {
  return {
    ...sheet,
    backgroundPattern: normalizeScribBackgroundPattern(sheet.backgroundPattern),
    noteBlocks: normalizeScribNoteBlocks(sheet.noteBlocks),
  };
}

function errMsg(data: { message?: string }, fallback: string): string {
  return data.message || fallback;
}

export async function fetchScribLibrary(): Promise<{
  userSafe: string;
  books: ScribBookCard[];
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{
    userSafe?: string;
    books?: ScribBookCard[];
  }>("/scrib/library");
  if (mustLog) console.log("[scrib] library", { status, requestId });
  if (status < 200 || status >= 300) {
    return { userSafe: "", books: [], error: errMsg(data, "Could not load Scrib library."), requestId };
  }
  return {
    userSafe: data.userSafe ?? "",
    books: (data.books ?? []).map((b) => ({ ...b, sheets: b.sheets ?? [] })),
    requestId,
  };
}

export async function createScribBook(name: string): Promise<{
  book: ScribBookCard | null;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<ScribBookCard>("/scrib/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (status < 200 || status >= 300) {
    return { book: null, error: errMsg(data, "Could not create book."), requestId };
  }
  return { book: data ? { ...data, sheets: data.sheets ?? [] } : null, requestId };
}

export async function deleteScribBook(bookId: string): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ deleted?: boolean }>(
    `/scrib/books/${encodeURIComponent(bookId)}`,
    { method: "DELETE" },
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: errMsg(data, "Could not delete book."), requestId };
  }
  return { ok: true, requestId };
}

export async function renameScribBook(
  bookId: string,
  name: string,
): Promise<{ book: ScribBookCard | null; error?: string; requestId?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { book: null, error: "name required" };
  const { status, data, requestId } = await apiRequest<ScribBookCard>(
    `/scrib/books/${encodeURIComponent(bookId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    },
  );
  if (status < 200 || status >= 300) {
    return { book: null, error: errMsg(data, "Could not rename book."), requestId };
  }
  return { book: data ? { ...data, sheets: data.sheets ?? [] } : null, requestId };
}

export async function createScribSheet(
  bookId: string,
  name: string,
): Promise<{ sheet: ScribSheet | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<ScribSheet>(
    `/scrib/books/${encodeURIComponent(bookId)}/sheets`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  if (status < 200 || status >= 300) {
    return { sheet: null, error: errMsg(data, "Could not create sheet."), requestId };
  }
  return { sheet: data ? normalizeScribSheet(data) : null, requestId };
}

/** Full sheet JSON can be large after many strokes; default API timeout (12s) is too short. */
const scribSheetTimeoutMs = 120_000;

export async function fetchScribSheet(
  bookId: string,
  sheetId: string,
): Promise<{ sheet: ScribSheet | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<ScribSheet>(
    `/scrib/books/${encodeURIComponent(bookId)}/sheets/${encodeURIComponent(sheetId)}`,
    {},
    { timeoutMs: scribSheetTimeoutMs },
  );
  if (status < 200 || status >= 300) {
    return { sheet: null, error: errMsg(data, "Could not load sheet."), requestId };
  }
  return { sheet: data ? normalizeScribSheet(data) : null, requestId };
}

/** Rename a sheet by loading it, updating `name`, and saving the full document. */
export async function renameScribSheet(
  bookId: string,
  sheetId: string,
  name: string,
): Promise<{ sheet: ScribSheet | null; error?: string; requestId?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { sheet: null, error: "name required" };
  const loaded = await fetchScribSheet(bookId, sheetId);
  if (loaded.error || !loaded.sheet) {
    return { sheet: null, error: loaded.error ?? "sheet not found", requestId: loaded.requestId };
  }
  if (loaded.sheet.name === trimmed) return { sheet: loaded.sheet, requestId: loaded.requestId };
  return saveScribSheet({ ...loaded.sheet, name: trimmed });
}

export async function saveScribSheet(
  sheet: ScribSheet,
): Promise<{ sheet: ScribSheet | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<ScribSheet>(
    `/scrib/books/${encodeURIComponent(sheet.bookId)}/sheets/${encodeURIComponent(sheet.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sheet),
    },
    { timeoutMs: scribSheetTimeoutMs },
  );
  if (mustLog) console.log("[scrib] save sheet", { status, requestId, sheetId: sheet.id });
  if (status < 200 || status >= 300) {
    return { sheet: null, error: errMsg(data, "Could not save sheet."), requestId };
  }
  return { sheet: data ? normalizeScribSheet(data) : null, requestId };
}

export async function deleteScribSheet(
  bookId: string,
  sheetId: string,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ deleted?: boolean }>(
    `/scrib/books/${encodeURIComponent(bookId)}/sheets/${encodeURIComponent(sheetId)}`,
    { method: "DELETE" },
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: errMsg(data, "Could not delete sheet."), requestId };
  }
  return { ok: true, requestId };
}

export function scribSheetHref(userSafe: string, bookId: string, sheetId: string): string {
  const q = new URLSearchParams({ user: userSafe, book: bookId, sheet: sheetId });
  return `/scrib/sheet?${q.toString()}`;
}

/** Pretty URL used by ScribEditor (may include query string). */
export function scribSheetPrettyPath(
  userSafe: string,
  bookId: string,
  sheetId: string,
): string {
  return scribSheetHref(userSafe, bookId, sheetId);
}

export function resolveScribSheetFromLocation(loc?: {
  pathname: string;
  search: string;
}): { userSafe: string; bookId: string; sheetId: string } | null {
  if (!loc && typeof window === "undefined") return null;
  const target = loc ?? window.location;
  const params = new URLSearchParams(target.search);
  const userSafe = params.get("user") ?? "";
  const bookId = params.get("book") ?? "";
  const sheetId = params.get("sheet") ?? "";
  if (userSafe && bookId && sheetId) {
    return { userSafe, bookId, sheetId };
  }
  return null;
}

/** POST print PDF with cookie CSRF (returns blob). */
export async function postScribPrintPdf(
  imageBase64: string,
  fileName: string,
): Promise<{ blob: Blob | null; error?: string; requestId?: string }> {
  await getCsrf();
  const headers = new Headers({
    Accept: "application/pdf, application/json",
    "Content-Type": "application/json",
  });
  const csrf = currentCsrf();
  if (csrf) headers.set("X-CSRF-Token", csrf);
  const response = await fetch("/api/scrib/print/pdf", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ imageBase64, fileName }),
  });
  const requestId = response.headers.get("X-Request-ID") || "";
  if (!response.ok) {
    let message = `Print PDF failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    return { blob: null, error: message, requestId };
  }
  return { blob: await response.blob(), requestId };
}

/** Alternate names used by some Scrib islands. */
export const scribSheetUrl = scribSheetHref;
export const scribSheetPrettyUrl = scribSheetPrettyPath;
