import { describe, expect, it } from "vitest";
import { normalizeScribSheet, type ScribSheet } from "./scrib";
import {
  appendRectToSelection,
  createNoteAnnotation,
  createNoteArea,
  createNoteBlock,
  mapAnnotationInk,
  sheetNoteBlocks,
  withNoteBlocks,
} from "./scribAnnotations";

function baseSheet(): ScribSheet {
  return {
    id: "s1",
    bookId: "b1",
    name: "Hoja",
    activeLayerId: "chapter",
    strokeWidthMm: 0.35,
    layers: [
      { id: "background", opacity: 1, paths: [] },
      { id: "chapter", opacity: 1, paths: [{ d: "M 0 0 L 1 1", strokeWidth: 0.35 }] },
      { id: "verse", opacity: 1, paths: [] },
      { id: "word", opacity: 1, paths: [] },
      { id: "original", opacity: 1, paths: [] },
      { id: "translation1", opacity: 1, paths: [] },
      { id: "translation2", opacity: 1, paths: [] },
    ],
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("normalizeScribSheet noteBlocks", () => {
  it("defaults missing noteBlocks to []", () => {
    const n = normalizeScribSheet(baseSheet());
    expect(n.noteBlocks).toEqual([]);
    expect(n.layers[1].paths).toHaveLength(1);
  });

  it("fills ink and view defaults", () => {
    const n = normalizeScribSheet({
      ...baseSheet(),
      noteBlocks: [
        {
          id: "b",
          name: "Block",
          visible: true,
          color: "#ff8800",
          rects: [],
          areas: [
            {
              id: "a",
              name: "Area",
              visible: true,
              color: "#2266aa",
              rects: [],
              annotations: [
                {
                  id: "n",
                  name: "Note",
                  heading: { paths: [] },
                  body: { paths: [] },
                  view: { open: false, x: 0, y: 0, w: 0, h: 0 },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(n.noteBlocks?.[0]?.areas[0]?.annotations[0]?.view.w).toBe(280);
  });
});

describe("scribAnnotations helpers", () => {
  it("mapAnnotationInk does not mutate layers", () => {
    const block = createNoteBlock("B");
    const area = createNoteArea("A");
    const ann = createNoteAnnotation("N");
    area.annotations = [ann];
    block.areas = [area];
    const sheet = withNoteBlocks(baseSheet(), [block]);
    const layerPathsBefore = sheet.layers[1].paths.length;
    const next = mapAnnotationInk(
      sheet,
      { blockId: block.id, areaId: area.id, annotationId: ann.id },
      "heading",
      (paths) => [...paths, { d: "M 2 2 L 3 3", strokeWidth: 0.4 }],
    );
    expect(next.layers[1].paths).toHaveLength(layerPathsBefore);
    expect(sheetNoteBlocks(next)[0].areas[0].annotations[0].heading.paths).toHaveLength(1);
  });

  it("appendRectToSelection adds block rect", () => {
    const block = createNoteBlock("B");
    const sheet = withNoteBlocks(baseSheet(), [block]);
    const next = appendRectToSelection(
      sheet,
      { blockId: block.id },
      { x: 10, y: 20, w: 30, h: 40 },
    );
    expect(sheetNoteBlocks(next)[0].rects).toEqual([{ x: 10, y: 20, w: 30, h: 40 }]);
  });
});
