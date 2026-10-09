/**
 * Helpers for Scrib note regions — one rectangle + heading/body ink each.
 * Persisted as noteBlocks (block → area with one rect → one annotation).
 */

import type {
  ScribInk,
  ScribNoteAnnotation,
  ScribNoteArea,
  ScribNoteBlock,
  ScribNoteView,
  ScribRectMm,
  ScribSheet,
  StrokePath,
} from "./scrib";
import { normalizeScribNoteBlocks } from "./scrib";

export type ScribAnnotateSelection = {
  blockId: string;
  areaId: string;
  annotationId: string;
};

export type ScribNoteInkField = "heading" | "body";

export type ScribAnnotateSubtool = "select" | "rect";

export type ScribNoteRegion = {
  blockId: string;
  areaId: string;
  annotationId: string;
  name: string;
  color: string;
  visible: boolean;
  rect: ScribRectMm;
  heading: ScribInk;
  body: ScribInk;
  view: ScribNoteView;
};

const DEFAULT_REGION_COLOR = "#ff8800";

export function newScribId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyInk(): ScribInk {
  return { paths: [] };
}

export function defaultNoteView(offset = 0): ScribNoteView {
  return {
    open: false,
    x: 48 + offset * 16,
    y: 48 + offset * 16,
    w: 280,
    h: 220,
  };
}

export function createNoteAnnotation(name = "Nota"): ScribNoteAnnotation {
  return {
    id: newScribId("ann"),
    name,
    heading: emptyInk(),
    body: emptyInk(),
    view: defaultNoteView(),
  };
}

export function sheetNoteBlocks(sheet: ScribSheet): ScribNoteBlock[] {
  return normalizeScribNoteBlocks(sheet.noteBlocks);
}

export function withNoteBlocks(sheet: ScribSheet, blocks: ScribNoteBlock[]): ScribSheet {
  return { ...sheet, noteBlocks: blocks };
}

export function updateNoteBlocks(
  sheet: ScribSheet,
  updater: (blocks: ScribNoteBlock[]) => ScribNoteBlock[],
): ScribSheet {
  return withNoteBlocks(sheet, updater(sheetNoteBlocks(sheet)));
}

/** Flatten noteBlocks into drawable/editable regions (rect + ink). */
export function listNoteRegions(blocks: ScribNoteBlock[]): ScribNoteRegion[] {
  const out: ScribNoteRegion[] = [];
  for (const block of blocks) {
    if (!block.visible) continue;
    for (const area of block.areas) {
      if (!area.visible) continue;
      const ann = area.annotations[0];
      if (!ann) continue;
      const rect = area.rects[0];
      if (!rect) continue;
      out.push({
        blockId: block.id,
        areaId: area.id,
        annotationId: ann.id,
        name: ann.name || area.name || block.name || "Nota",
        color: area.color || block.color || DEFAULT_REGION_COLOR,
        visible: true,
        rect,
        heading: ann.heading,
        body: ann.body,
        view: ann.view,
      });
    }
  }
  return out;
}

export function selectionOfRegion(region: ScribNoteRegion): ScribAnnotateSelection {
  return {
    blockId: region.blockId,
    areaId: region.areaId,
    annotationId: region.annotationId,
  };
}

export function findNoteAnnotation(
  blocks: ScribNoteBlock[],
  selection: ScribAnnotateSelection,
): {
  block: ScribNoteBlock;
  area: ScribNoteArea;
  annotation: ScribNoteAnnotation;
  region: ScribNoteRegion;
} | null {
  const region = listNoteRegions(blocks).find(
    (r) =>
      r.blockId === selection.blockId &&
      r.areaId === selection.areaId &&
      r.annotationId === selection.annotationId,
  );
  if (!region) return null;
  const block = blocks.find((b) => b.id === selection.blockId);
  if (!block) return null;
  const area = block.areas.find((a) => a.id === selection.areaId);
  if (!area) return null;
  const annotation = area.annotations.find((a) => a.id === selection.annotationId);
  if (!annotation) return null;
  return { block, area, annotation, region };
}

export function createNoteRegion(
  rect: ScribRectMm,
  color = DEFAULT_REGION_COLOR,
  name = "Nota",
): ScribNoteBlock {
  const normalized = normalizeRect(rect);
  const ann = createNoteAnnotation(name);
  const areaId = newScribId("area");
  const blockId = newScribId("block");
  return {
    id: blockId,
    name,
    visible: true,
    color,
    rects: [],
    areas: [
      {
        id: areaId,
        name,
        visible: true,
        color,
        rects: [normalized],
        annotations: [ann],
      },
    ],
  };
}

function normalizeRect(rect: ScribRectMm): ScribRectMm {
  return {
    x: Math.min(rect.x, rect.x + rect.w),
    y: Math.min(rect.y, rect.y + rect.h),
    w: Math.abs(rect.w),
    h: Math.abs(rect.h),
  };
}

export function appendNoteRegion(
  sheet: ScribSheet,
  rect: ScribRectMm,
  color: string,
): { sheet: ScribSheet; selection: ScribAnnotateSelection | null } {
  const normalized = normalizeRect(rect);
  if (normalized.w < 0.5 || normalized.h < 0.5) {
    return { sheet, selection: null };
  }
  const block = createNoteRegion(normalized, color);
  const area = block.areas[0];
  const ann = area?.annotations[0];
  if (!area || !ann) return { sheet, selection: null };
  return {
    sheet: updateNoteBlocks(sheet, (blocks) => [...blocks, block]),
    selection: {
      blockId: block.id,
      areaId: area.id,
      annotationId: ann.id,
    },
  };
}

export function mapAnnotationInk(
  sheet: ScribSheet,
  selection: ScribAnnotateSelection,
  field: ScribNoteInkField,
  mapPaths: (paths: StrokePath[]) => StrokePath[],
): ScribSheet {
  return updateNoteBlocks(sheet, (blocks) =>
    blocks.map((block) => {
      if (block.id !== selection.blockId) return block;
      return {
        ...block,
        areas: block.areas.map((area) => {
          if (area.id !== selection.areaId) return area;
          return {
            ...area,
            annotations: area.annotations.map((ann) => {
              if (ann.id !== selection.annotationId) return ann;
              const ink = ann[field];
              return {
                ...ann,
                [field]: { paths: mapPaths(ink.paths.map((p) => ({ ...p }))) },
              };
            }),
          };
        }),
      };
    }),
  );
}

export function setAnnotationView(
  sheet: ScribSheet,
  selection: ScribAnnotateSelection,
  view: Partial<ScribNoteView>,
): ScribSheet {
  return updateNoteBlocks(sheet, (blocks) =>
    blocks.map((block) => {
      if (block.id !== selection.blockId) return block;
      return {
        ...block,
        areas: block.areas.map((area) => {
          if (area.id !== selection.areaId) return area;
          return {
            ...area,
            annotations: area.annotations.map((ann) =>
              ann.id === selection.annotationId
                ? { ...ann, view: { ...ann.view, ...view } }
                : ann,
            ),
          };
        }),
      };
    }),
  );
}

export function deleteNoteRegion(
  sheet: ScribSheet,
  selection: ScribAnnotateSelection,
): ScribSheet {
  return updateNoteBlocks(sheet, (blocks) =>
    blocks.filter((b) => b.id !== selection.blockId),
  );
}

function rectContains(r: ScribRectMm, pt: { x: number; y: number }): boolean {
  return (
    pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h
  );
}

/** All visible regions under a page-mm point, topmost first. */
export function hitTestNoteRegions(
  blocks: ScribNoteBlock[],
  pt: { x: number; y: number },
): ScribNoteRegion[] {
  const regions = listNoteRegions(blocks);
  const hits: ScribNoteRegion[] = [];
  for (let i = regions.length - 1; i >= 0; i--) {
    if (rectContains(regions[i].rect, pt)) hits.push(regions[i]);
  }
  return hits;
}

export function isRegionSelected(
  selection: ScribAnnotateSelection | null,
  region: ScribNoteRegion,
): boolean {
  if (!selection) return false;
  return (
    selection.blockId === region.blockId &&
    selection.areaId === region.areaId &&
    selection.annotationId === region.annotationId
  );
}

/** Open annotations for view windows. */
export function listOpenAnnotationViews(blocks: ScribNoteBlock[]): Array<{
  selection: ScribAnnotateSelection;
  annotation: ScribNoteAnnotation;
  blockName: string;
  areaName: string;
  color: string;
}> {
  const out: Array<{
    selection: ScribAnnotateSelection;
    annotation: ScribNoteAnnotation;
    blockName: string;
    areaName: string;
    color: string;
  }> = [];
  for (const region of listNoteRegions(blocks)) {
    if (!region.view.open) continue;
    out.push({
      selection: selectionOfRegion(region),
      annotation: {
        id: region.annotationId,
        name: region.name,
        heading: region.heading,
        body: region.body,
        view: region.view,
      },
      blockName: region.name,
      areaName: region.name,
      color: region.color,
    });
  }
  return out;
}

/** Translate ink paths so their bbox center sits at the canvas center. */
export function centerInkPaths(
  paths: StrokePath[],
  canvasW: number,
  canvasH: number,
): StrokePath[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const re = /[ML]\s*([-\d.]+)\s+([-\d.]+)/gi;
  for (const path of paths) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(path.d))) {
      const x = Number(m[1]);
      const y = Number(m[2]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return paths;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const dx = canvasW / 2 - cx;
  const dy = canvasH / 2 - cy;
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return paths;
  return paths.map((path) => ({
    ...path,
    d: path.d.replace(
      /([ML])\s*([-\d.]+)\s+([-\d.]+)/gi,
      (_all, cmd: string, xs: string, ys: string) => {
        const x = Number(xs) + dx;
        const y = Number(ys) + dy;
        return `${cmd} ${x.toFixed(3)} ${y.toFixed(3)}`;
      },
    ),
  }));
}
