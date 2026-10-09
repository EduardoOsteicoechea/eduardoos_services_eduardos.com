import { describe, expect, it } from "vitest";
import { normalizeScribSheet, type ScribSheet } from "./scrib";
import {
  appendNoteRegion,
  centerInkPaths,
  createNoteRegion,
  hitTestNoteRegions,
  isRegionSelected,
  listNoteRegions,
  mapAnnotationInk,
  selectionOfRegion,
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
              rects: [{ x: 1, y: 2, w: 3, h: 4 }],
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
    expect(listNoteRegions(n.noteBlocks ?? [])).toHaveLength(1);
  });
});

describe("scribAnnotations helpers", () => {
  it("mapAnnotationInk does not mutate layers", () => {
    const block = createNoteRegion({ x: 10, y: 20, w: 30, h: 40 }, "#ff8800", "N");
    const sheet = withNoteBlocks(baseSheet(), [block]);
    const region = listNoteRegions(sheetNoteBlocks(sheet))[0];
    const layerPathsBefore = sheet.layers[1].paths.length;
    const next = mapAnnotationInk(
      sheet,
      selectionOfRegion(region),
      "heading",
      (paths) => [...paths, { d: "M 2 2 L 3 3", strokeWidth: 0.4 }],
    );
    expect(next.layers[1].paths).toHaveLength(layerPathsBefore);
    expect(
      sheetNoteBlocks(next)[0].areas[0].annotations[0].heading.paths,
    ).toHaveLength(1);
  });

  it("appendNoteRegion adds a rect with ink containers", () => {
    const { sheet, selection } = appendNoteRegion(
      baseSheet(),
      { x: 10, y: 20, w: 30, h: 40 },
      "#2266aa",
    );
    expect(selection).not.toBeNull();
    const regions = listNoteRegions(sheetNoteBlocks(sheet));
    expect(regions).toHaveLength(1);
    expect(regions[0].rect).toEqual({ x: 10, y: 20, w: 30, h: 40 });
    expect(regions[0].color).toBe("#2266aa");
    expect(regions[0].heading.paths).toEqual([]);
    expect(regions[0].body.paths).toEqual([]);
  });

  it("hitTestNoteRegions returns overlapping topmost-first", () => {
    const a = createNoteRegion({ x: 10, y: 20, w: 30, h: 40 }, "#111111", "A");
    const b = createNoteRegion({ x: 15, y: 25, w: 30, h: 40 }, "#222222", "B");
    const hits = hitTestNoteRegions([a, b], { x: 20, y: 30 });
    expect(hits).toHaveLength(2);
    expect(hits[0].name).toBe("B");
    expect(isRegionSelected(selectionOfRegion(hits[0]), hits[0])).toBe(true);
  });

  it("centerInkPaths moves bbox center to canvas center", () => {
    const centered = centerInkPaths(
      [{ d: "M 0 0 L 10 0", strokeWidth: 0.3 }],
      100,
      100,
    );
    expect(centered[0].d).toContain("45.000");
    expect(centered[0].d).toContain("50.000");
  });
});
