/**
 * Homescool PDF-first preview: curriculum class JSON → backend PDF → pdf.js canvases.
 */
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import { HOMESCOOL_ROUTES } from "../config/routes";
import { apiRequest } from "./api";
import { mustLog } from "./dev-log";
import type { EoschoolDocument } from "./homescool";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export type HomescoolPreviewResponse = {
  pdf_base64: string;
  page_width_mm?: number;
  page_height_mm?: number;
  title?: string;
  cycle?: number;
  week?: number;
  day?: number;
  level?: number;
  subject?: string;
  message?: string;
};

function rootFontSizePx(): number {
  const raw = getComputedStyle(document.documentElement).fontSize;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 16;
}

function pxToRem(px: number): string {
  return `${px / rootFontSizePx()}rem`;
}

function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Measure the visible stage (not a hidden sheet host) so Letter fills the workspace. */
function measurePreviewBox(host: HTMLElement): { widthPx: number; heightPx: number } {
  const stage = host.closest("[data-homescool-stage]") as HTMLElement | null;
  const box = stage && stage.clientWidth > 0 ? stage : host;
  const style = box ? getComputedStyle(box) : null;
  const padX = style
    ? (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
    : 0;
  const padY = style
    ? (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0)
    : 0;
  const root = rootFontSizePx();
  // Leave a small gutter so the sheet is not flush against the DHS / chrome.
  const gutter = root * 1.5;
  const widthPx = Math.max((box?.clientWidth || 0) - padX - gutter, root * 28);
  const heightPx = Math.max((box?.clientHeight || 0) - padY - gutter, root * 36);
  return { widthPx, heightPx };
}

export async function fetchHomescoolPdfPreview(doc: EoschoolDocument): Promise<{
  ok: boolean;
  data?: HomescoolPreviewResponse;
  pdfBytes?: Uint8Array;
  error?: string;
  requestId?: string;
}> {
  if (mustLog) {
    console.log("[homescool-pdf-preview] fetch.start", {
      cycle: doc.cycle,
      week: doc.week,
      day: doc.day,
      subject: doc.subject,
    });
  }
  const { status, data, requestId } = await apiRequest<HomescoolPreviewResponse>(
    HOMESCOOL_ROUTES.preview,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    },
  );
  if (status < 200 || status >= 300 || !data?.pdf_base64) {
    const message = data?.message || `Preview failed (${status})`;
    if (mustLog) console.log("[homescool-pdf-preview] fetch.fail", { status, requestId, message });
    return { ok: false, error: message, requestId };
  }
  const pdfBytes = base64ToBytes(data.pdf_base64);
  if (mustLog) {
    console.log("[homescool-pdf-preview] fetch.ok", {
      requestId,
      bytes: pdfBytes.length,
      title: data.title,
    });
  }
  return { ok: true, data, pdfBytes, requestId };
}

/** Render PDF pages into host (US Letter portrait stacks). Returns page count. */
export async function renderHomescoolPdfPreview(
  host: HTMLElement,
  pdfBytes: Uint8Array,
  opts?: { pageWidthMm?: number; pageHeightMm?: number; seq?: number; isStale?: () => boolean },
): Promise<number> {
  const pageWidthMm = opts?.pageWidthMm && opts.pageWidthMm > 0 ? opts.pageWidthMm : 215.9;
  const pageHeightMm = opts?.pageHeightMm && opts.pageHeightMm > 0 ? opts.pageHeightMm : 279.4;
  const isStale = opts?.isStale ?? (() => false);

  let pdf: PDFDocumentProxy;
  try {
    pdf = await getDocument({ data: pdfBytes }).promise;
  } catch (err) {
    if (mustLog) console.log("[homescool-pdf-preview] open.error", { err: String(err) });
    throw new Error("Could not open preview PDF.");
  }

  const { widthPx: availW, heightPx: availH } = measurePreviewBox(host);
  const aspect = pageWidthMm / pageHeightMm; // ~0.773
  // Fit Letter inside the stage: prefer height (tall page), then clamp by width.
  let cssWidthPx = availH * aspect;
  let cssHeightPx = availH;
  if (cssWidthPx > availW) {
    cssWidthPx = availW;
    cssHeightPx = availW / aspect;
  }
  // Keep a readable floor so a collapsed stage never paints a stamp-sized sheet.
  const minW = rootFontSizePx() * 32;
  if (cssWidthPx < minW) {
    cssWidthPx = minW;
    cssHeightPx = minW / aspect;
  }

  const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  const pages = document.createElement("div");
  pages.className = "homescool-pdf-stage__pages";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (isStale()) {
      if (mustLog) console.log("[homescool-pdf-preview] render.abort", { pageNum });
      return 0;
    }
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const cssScale = cssWidthPx / baseViewport.width;
    const viewport = page.getViewport({ scale: cssScale * dpr });

    const pageEl = document.createElement("div");
    pageEl.className = "homescool-pdf-page";
    pageEl.dataset.page = String(pageNum);
    pageEl.style.width = pxToRem(cssWidthPx);
    pageEl.style.height = pxToRem(cssHeightPx);

    const canvas = document.createElement("canvas");
    canvas.className = "homescool-pdf-page__canvas";
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    canvas.style.width = pxToRem(cssWidthPx);
    canvas.style.height = pxToRem(cssHeightPx);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable.");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    pageEl.append(canvas);
    pages.append(pageEl);
  }

  if (isStale()) return 0;
  host.replaceChildren(pages);
  if (mustLog) {
    console.log("[homescool-pdf-preview] render.done", {
      pages: pdf.numPages,
      cssWidthPx: Math.round(cssWidthPx),
      cssHeightPx: Math.round(cssHeightPx),
      dpr,
    });
  }
  return pdf.numPages;
}

export function downloadPdfBytes(pdfBytes: Uint8Array, fileName: string): void {
  const copy = new Uint8Array(pdfBytes.byteLength);
  copy.set(pdfBytes);
  const blob = new Blob([copy], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

/**
 * Rasterize each PDF page to a JPEG data URL for the legacy print-merge endpoint.
 * Used so Letter v2 batch print still ships the Go PDF ink (not the HTML mirror).
 */
export async function pdfBytesToJpegDataUrls(
  pdfBytes: Uint8Array,
  opts?: { scale?: number; quality?: number },
): Promise<string[]> {
  const scale = opts?.scale && opts.scale > 0 ? opts.scale : 2;
  const quality =
    opts?.quality != null && opts.quality > 0 && opts.quality <= 1 ? opts.quality : 0.92;
  const copy = new Uint8Array(pdfBytes.byteLength);
  copy.set(pdfBytes);
  const pdf = await getDocument({ data: copy }).promise;
  const out: string[] = [];
  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D unavailable.");
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      out.push(canvas.toDataURL("image/jpeg", quality));
    }
  } finally {
    try {
      pdf.cleanup();
    } catch {
      /* ignore */
    }
  }
  if (mustLog) {
    console.log("[homescool-pdf-preview] raster.done", { pages: out.length, scale });
  }
  return out;
}
