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

function pxToRem(px: number): number {
  return px / rootFontSizePx();
}

function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
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

  const stageCssPx = Math.max(host.clientWidth || 0, rootFontSizePx() * 20);
  const pageWidthRem = pxToRem(stageCssPx);
  const mmToRem = pageWidthRem / pageWidthMm;
  const pageHeightRem = pageHeightMm * mmToRem;
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);

  const pages = document.createElement("div");
  pages.className = "homescool-pdf-stage__pages";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (isStale()) {
      if (mustLog) console.log("[homescool-pdf-preview] render.abort", { pageNum });
      return 0;
    }
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const cssScale = (pageWidthRem * rootFontSizePx()) / baseViewport.width;
    const viewport = page.getViewport({ scale: cssScale * dpr });

    const pageEl = document.createElement("div");
    pageEl.className = "homescool-pdf-page";
    pageEl.dataset.page = String(pageNum);
    pageEl.style.width = `${pageWidthRem}rem`;
    pageEl.style.height = `${pageHeightRem}rem`;

    const canvas = document.createElement("canvas");
    canvas.className = "homescool-pdf-page__canvas";
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    canvas.style.width = `${pageWidthRem}rem`;
    canvas.style.height = `${pageHeightRem}rem`;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable.");
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    pageEl.append(canvas);
    pages.append(pageEl);
  }

  if (isStale()) return 0;
  host.replaceChildren(pages);
  if (mustLog) console.log("[homescool-pdf-preview] render.done", { pages: pdf.numPages });
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
