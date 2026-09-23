/**
 * Capture styled Homescool letter pages → JPEG rasters → backend PDF.
 * Uses modern-screenshot (browser paint) so color-mix / color() from site CSS work.
 */

import { domToJpeg } from "modern-screenshot";
import { currentCsrf, getCsrf } from "./api";
import { mustLog } from "./dev-log";

const CAPTURE_SCALE = 2;
const JPEG_QUALITY = 0.92;

function lockLetterGeometry(page: HTMLElement): () => void {
  const prev = {
    width: page.style.width,
    height: page.style.height,
    minHeight: page.style.minHeight,
    maxHeight: page.style.maxHeight,
    padding: page.style.padding,
    transform: page.style.transform,
    overflow: page.style.overflow,
    boxShadow: page.style.boxShadow,
  };
  page.style.width = "8.5in";
  page.style.height = "11in";
  page.style.minHeight = "11in";
  page.style.maxHeight = "11in";
  // Force METHOD_V1 margin even if a cascade override shrank padding.
  page.style.padding = "1cm";
  page.style.transform = "none";
  page.style.overflow = "hidden";
  page.style.boxShadow = "none";
  return () => {
    page.style.width = prev.width;
    page.style.height = prev.height;
    page.style.minHeight = prev.minHeight;
    page.style.maxHeight = prev.maxHeight;
    page.style.padding = prev.padding;
    page.style.transform = prev.transform;
    page.style.overflow = prev.overflow;
    page.style.boxShadow = prev.boxShadow;
  };
}

async function captureLetterPage(page: HTMLElement): Promise<string> {
  const restore = lockLetterGeometry(page);
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    // Let layout settle after geometry lock.
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    return await domToJpeg(page, {
      scale: CAPTURE_SCALE,
      quality: JPEG_QUALITY,
      backgroundColor: "#ffffff",
      // Fetch/inline styles as the browser paints them (supports color-mix).
      fetch: { requestInit: { credentials: "include" } },
    });
  } finally {
    restore();
  }
}

/** Rasterize every `.homescool-letter-page` under the sheet host (color JPEG data URLs). */
export async function captureHomescoolLetterPages(host: HTMLElement): Promise<string[]> {
  const pages = Array.from(host.querySelectorAll<HTMLElement>(".homescool-letter-page"));
  if (mustLog) console.log("[homescoolPrint] capture.start", { pages: pages.length });
  if (!pages.length) {
    throw new Error("No letter pages to capture.");
  }
  const out: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (mustLog) console.log("[homescoolPrint] capture.page", { index: i + 1, of: pages.length });
    out.push(await captureLetterPage(pages[i]));
  }
  if (mustLog) console.log("[homescoolPrint] capture.done", { pages: out.length });
  return out;
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Capture on-screen letter sheets and download a backend-assembled US Letter PDF. */
export async function downloadHomescoolStyledPdf(
  materialId: string,
  host: HTMLElement,
  fileName = "homescool.pdf",
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const id = materialId.trim();
  if (!id) return { ok: false, error: "Missing material id." };

  let pages: string[];
  try {
    pages = await captureHomescoolLetterPages(host);
  } catch (err) {
    if (mustLog) console.log("[homescoolPrint] capture.error", { err: String(err) });
    return { ok: false, error: err instanceof Error ? err.message : "Could not capture pages." };
  }

  await getCsrf();
  const headers = new Headers({
    Accept: "application/pdf, application/json",
    "Content-Type": "application/json",
  });
  const csrf = currentCsrf();
  if (csrf) headers.set("X-CSRF-Token", csrf);

  const url = `/api/homescool/materials/${encodeURIComponent(id)}/print/pdf`;
  if (mustLog) console.log("[homescoolPrint] post.start", { id, pages: pages.length, fileName });

  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ pages, fileName }),
    });
    const requestId = res.headers.get("X-Request-ID") || "";
    if (!res.ok) {
      let message = `PDF download failed (${res.status})`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        /* ignore */
      }
      if (mustLog) console.log("[homescoolPrint] post.fail", { status: res.status, requestId, message });
      return { ok: false, error: message, requestId };
    }
    const blob = await res.blob();
    triggerDownload(blob, fileName);
    if (mustLog) console.log("[homescoolPrint] post.ok", { bytes: blob.size, requestId });
    return { ok: true, requestId };
  } catch (err) {
    if (mustLog) console.log("[homescoolPrint] post.error", { err: String(err) });
    return { ok: false, error: "Could not download PDF." };
  }
}
