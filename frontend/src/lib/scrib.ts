/**
 * Scrib client — library / books / layered US Letter sheets (cookie CSRF).
 */

import { apiRequest, currentCsrf, getCsrf } from "./api";
import { mustLog } from "./dev-log";

export const SCRIB_PAGE_WIDTH_MM = 215.9;
export const SCRIB_PAGE_HEIGHT_MM = 279.4;
export const SCRIB_BG_SRC = "/documento_generado_columnas_v3.jpg";

export const SCRIB_LAYER_IDS = [
  "chapter",
  "verse",
  "word",
  "original",
  "translation1",
  "translation2",
] as const;

export type ScribLayerId = (typeof SCRIB_LAYER_IDS)[number];

export const SCRIB_LAYER_LABELS: Record<ScribLayerId, string> = {
  chapter: "Número de capítulo",
  verse: "Número de versículo",
  word: "Número de palabra",
  original: "Texto original",
  translation1: "Traducción 1",
  translation2: "Traducción 2",
};

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

export type ScribSheet = {
  id: string;
  bookId: string;
  name: string;
  activeLayerId: string;
  strokeWidthMm: number;
  layers: ScribLayer[];
  updatedAt: string;
};

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
  return { sheet: data ?? null, requestId };
}

export async function fetchScribSheet(
  bookId: string,
  sheetId: string,
): Promise<{ sheet: ScribSheet | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<ScribSheet>(
    `/scrib/books/${encodeURIComponent(bookId)}/sheets/${encodeURIComponent(sheetId)}`,
  );
  if (status < 200 || status >= 300) {
    return { sheet: null, error: errMsg(data, "Could not load sheet."), requestId };
  }
  return { sheet: data ?? null, requestId };
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
  );
  if (mustLog) console.log("[scrib] save sheet", { status, requestId, sheetId: sheet.id });
  if (status < 200 || status >= 300) {
    return { sheet: null, error: errMsg(data, "Could not save sheet."), requestId };
  }
  return { sheet: data ?? null, requestId };
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
