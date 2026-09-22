/**
 * Capture Scrib sheet as light grayscale JPEG → server PDF (portrait US Letter).
 * Rasterizes ruled geometry + stroke paths on a canvas (no SVG-as-image — CSS vars
 * and blob SVG loads were producing blank pages).
 */

import { mustLog } from "./dev-log";
import {
  isScribDrawableLayer,
  postScribPrintPdf,
  SCRIB_BACKGROUND_LAYER_ID,
  SCRIB_PAGE_HEIGHT_MM,
  SCRIB_PAGE_WIDTH_MM,
  type ScribSheet,
  type StrokePath,
} from "./scrib";
import {
  buildScribSheetBackgroundGeometry,
  SCRIB_SHEET_BG_DEFAULTS,
} from "./scribSheetBackground";

/** 300 DPI — print-quality US Letter raster. */
const PRINT_DPI = 300;
const PRINT_PX_PER_MM = PRINT_DPI / 25.4;
const PRINT_INK = "#141820";

function pathPoints(d: string): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const re = /[ML]\s*([-\d.]+)\s+([-\d.]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    pts.push({ x: Number(m[1]), y: Number(m[2]) });
  }
  return pts;
}

function drawRuledBackground(
  ctx: CanvasRenderingContext2D,
  pxPerMm: number,
  opacity: number,
): void {
  if (opacity <= 0) return;
  const g = buildScribSheetBackgroundGeometry();
  const sw = Math.max(1, g.strokeWidthMm * pxPerMm);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.lineWidth = sw;

  for (const r of g.rects) {
    ctx.strokeStyle = r.stroke || SCRIB_SHEET_BG_DEFAULTS.colorSuave;
    ctx.strokeRect(
      r.x * pxPerMm,
      r.y * pxPerMm,
      r.width * pxPerMm,
      r.height * pxPerMm,
    );
  }
  for (const l of g.lines) {
    ctx.strokeStyle = l.stroke || SCRIB_SHEET_BG_DEFAULTS.colorSuave;
    ctx.beginPath();
    ctx.moveTo(l.x1 * pxPerMm, l.y1 * pxPerMm);
    ctx.lineTo(l.x2 * pxPerMm, l.y2 * pxPerMm);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStrokePaths(
  ctx: CanvasRenderingContext2D,
  paths: StrokePath[],
  pxPerMm: number,
  opacity: number,
): void {
  if (opacity <= 0 || paths.length === 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
  ctx.strokeStyle = PRINT_INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const path of paths) {
    const pts = pathPoints(path.d);
    if (pts.length < 2) continue;
    ctx.lineWidth = Math.max(0.5, path.strokeWidth * pxPerMm);
    ctx.beginPath();
    ctx.moveTo(pts[0].x * pxPerMm, pts[0].y * pxPerMm);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x * pxPerMm, pts[i].y * pxPerMm);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function canvasToGrayscale(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = y;
    d[i + 1] = y;
    d[i + 2] = y;
  }
  ctx.putImageData(data, 0, 0);
}

/** Build a portrait US Letter raster (300 DPI) from sheet model + opacity. */
export async function captureScribSheetLightGrayscale(
  _sheetEl: HTMLElement,
  sheet: ScribSheet,
): Promise<Blob> {
  const widthPx = Math.round(SCRIB_PAGE_WIDTH_MM * PRINT_PX_PER_MM);
  const heightPx = Math.round(SCRIB_PAGE_HEIGHT_MM * PRINT_PX_PER_MM);
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);

  const bgLayer = sheet.layers.find((l) => l.id === SCRIB_BACKGROUND_LAYER_ID);
  drawRuledBackground(ctx, PRINT_PX_PER_MM, bgLayer?.opacity ?? 1);

  for (const layer of sheet.layers) {
    if (!isScribDrawableLayer(layer.id)) continue;
    drawStrokePaths(ctx, layer.paths ?? [], PRINT_PX_PER_MM, layer.opacity ?? 1);
  }

  canvasToGrayscale(canvas);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("JPEG encode failed"))),
      "image/jpeg",
      0.92,
    );
  });
  return blob;
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadScribSheetPdf(sheetEl: HTMLElement, sheet: ScribSheet): Promise<void> {
  if (mustLog) console.log("[scribPrint] start", { sheetId: sheet.id });
  const jpeg = await captureScribSheetLightGrayscale(sheetEl, sheet);
  const imageBase64 = await blobToDataURL(jpeg);
  const fileName = `${(sheet.name || "scrib-sheet").replace(/[^\w.-]+/g, "_")}.pdf`;
  const result = await postScribPrintPdf(imageBase64, fileName);
  if (!result.blob) {
    throw new Error(result.error || "Print PDF failed");
  }
  triggerDownload(result.blob, fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
  if (mustLog) console.log("[scribPrint] done", { requestId: result.requestId });
}
