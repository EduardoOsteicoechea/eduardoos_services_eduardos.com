/**
 * Helpers for Scrib noteBlocks — ids, defaults, immutable tree updates.
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
  areaId?: string;
  annotationId?: string;
  /** Index into block.rects, or area.rects when areaId is set. */
  rectIndex?: number;
};

export type ScribNoteInkField = "heading" | "body";

export type ScribAnnotateSubtool = "select" | "rect";

const DEFAULT_BLOCK_COLOR = "#ff8800";
const DEFAULT_AREA_COLOR = "#2266aa";

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

export function createNoteBlock(name = "Bloque"): ScribNoteBlock {
  return {
    id: newScribId("block"),
    name,
    visible: true,
    color: DEFAULT_BLOCK_COLOR,
    rects: [],
    areas: [],
  };
}

export function createNoteArea(name = "Área"): ScribNoteArea {
  return {
    id: newScribId("area"),
    name,
    visible: true,
    color: DEFAULT_AREA_COLOR,
    rects: [],
    annotations: [],
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

export function findNoteAnnotation(
  blocks: ScribNoteBlock[],
  selection: ScribAnnotateSelection,
): {
  block: ScribNoteBlock;
  area: ScribNoteArea;
  annotation: ScribNoteAnnotation;
} | null {
  const block = blocks.find((b) => b.id === selection.blockId);
  if (!block || !selection.areaId || !selection.annotationId) return null;
  const area = block.areas.find((a) => a.id === selection.areaId);
  if (!area) return null;
  const annotation = area.annotations.find((a) => a.id === selection.annotationId);
  if (!annotation) return null;
  return { block, area, annotation };
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

export function appendRectToSelection(
  sheet: ScribSheet,
  selection: ScribAnnotateSelection,
  rect: ScribRectMm,
): ScribSheet {
  const normalized: ScribRectMm = {
    x: Math.min(rect.x, rect.x + rect.w),
    y: Math.min(rect.y, rect.y + rect.h),
    w: Math.abs(rect.w),
    h: Math.abs(rect.h),
  };
  if (normalized.w < 0.5 || normalized.h < 0.5) return sheet;
  return updateNoteBlocks(sheet, (blocks) =>
    blocks.map((block) => {
      if (block.id !== selection.blockId) return block;
      if (!selection.areaId) {
        return { ...block, rects: [...block.rects, normalized] };
      }
      return {
        ...block,
        areas: block.areas.map((area) =>
          area.id === selection.areaId
            ? { ...area, rects: [...area.rects, normalized] }
            : area,
        ),
      };
    }),
  );
}

export function popLastRectFromSelection(
  sheet: ScribSheet,
  selection: ScribAnnotateSelection,
): ScribSheet {
  return updateNoteBlocks(sheet, (blocks) =>
    blocks.map((block) => {
      if (block.id !== selection.blockId) return block;
      if (!selection.areaId) {
        return { ...block, rects: block.rects.slice(0, -1) };
      }
      return {
        ...block,
        areas: block.areas.map((area) =>
          area.id === selection.areaId
            ? { ...area, rects: area.rects.slice(0, -1) }
            : area,
        ),
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

/** Hit-test page mm against visible note rects (topmost area rects first). */
export function hitTestNoteRect(
  blocks: ScribNoteBlock[],
  pt: { x: number; y: number },
): ScribAnnotateSelection | null {
  const contains = (r: ScribRectMm) =>
    pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h;

  for (let bi = blocks.length - 1; bi >= 0; bi--) {
    const block = blocks[bi];
    if (!block.visible) continue;
    for (let ai = block.areas.length - 1; ai >= 0; ai--) {
      const area = block.areas[ai];
      if (!area.visible) continue;
      for (let ri = area.rects.length - 1; ri >= 0; ri--) {
        if (contains(area.rects[ri])) {
          return { blockId: block.id, areaId: area.id, rectIndex: ri };
        }
      }
    }
    for (let ri = block.rects.length - 1; ri >= 0; ri--) {
      if (contains(block.rects[ri])) {
        return { blockId: block.id, rectIndex: ri };
      }
    }
  }
  return null;
}

export function isRectSelected(
  selection: ScribAnnotateSelection | null,
  blockId: string,
  areaId: string | undefined,
  rectIndex: number,
): boolean {
  if (!selection || selection.blockId !== blockId) return false;
  if (typeof selection.rectIndex !== "number") return false;
  if (selection.rectIndex !== rectIndex) return false;
  if (areaId) return selection.areaId === areaId && !selection.annotationId;
  return !selection.areaId;
}

/** Open annotations for view windows (may span multiple blocks). */
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
  for (const block of blocks) {
    for (const area of block.areas) {
      for (const annotation of area.annotations) {
        if (!annotation.view.open) continue;
        out.push({
          selection: {
            blockId: block.id,
            areaId: area.id,
            annotationId: annotation.id,
          },
          annotation,
          blockName: block.name,
          areaName: area.name,
          color: area.color || block.color,
        });
      }
    }
  }
  return out;
}
