import { describe, expect, it } from "vitest";
import {
  SCRIB_BACKGROUND_LAYER_ID,
  SCRIB_DRAW_LAYER_IDS,
  SCRIB_LAYER_IDS,
  isScribDrawableLayer,
} from "./scrib";
import {
  buildScribSheetBackgroundGeometry,
  buildScribSheetBackgroundSvgMarkup,
  SCRIB_SHEET_BG_DEFAULTS,
} from "./scribSheetBackground";
import { SCRIB_PAGE_HEIGHT_MM, SCRIB_PAGE_WIDTH_MM } from "./scrib";

describe("scribSheetBackground", () => {
  it("matches US Letter page size and default column count", () => {
    const g = buildScribSheetBackgroundGeometry();
    expect(g.pageWidthMm).toBe(SCRIB_PAGE_WIDTH_MM);
    expect(g.pageHeightMm).toBe(SCRIB_PAGE_HEIGHT_MM);
    expect(g.strokeWidthMm).toBe(SCRIB_SHEET_BG_DEFAULTS.grosorDeBordeMm);
    expect(g.rects).toHaveLength(SCRIB_SHEET_BG_DEFAULTS.columnas);
  });

  it("places first column at the lateral margin", () => {
    const g = buildScribSheetBackgroundGeometry();
    expect(g.rects[0]?.x).toBe(SCRIB_SHEET_BG_DEFAULTS.margenLateralMm);
    expect(g.rects[0]?.y).toBe(SCRIB_SHEET_BG_DEFAULTS.margenVerticalMm);
  });

  it("emits SVG markup with viewBox in millimetres", () => {
    const svg = buildScribSheetBackgroundSvgMarkup();
    expect(svg).toContain(`viewBox="0 0 ${SCRIB_PAGE_WIDTH_MM} ${SCRIB_PAGE_HEIGHT_MM}"`);
    expect(svg).toContain("<line ");
    expect(svg).toContain("<rect ");
    expect(svg).not.toContain(".jpg");
  });

  it("subdivides each 4 mm writing row as 1.1 + 1.8 + 1.1", () => {
    const g = buildScribSheetBackgroundGeometry();
    const ml = SCRIB_SHEET_BG_DEFAULTS.margenLateralMm;
    const mv = SCRIB_SHEET_BG_DEFAULTS.margenVerticalMm;
    const alto = SCRIB_SHEET_BG_DEFAULTS.altoDeLineaMm;
    const edge = SCRIB_SHEET_BG_DEFAULTS.bandaExtremaMm;
    const bottomOfFirstRow = mv + alto;
    const softYs = g.lines
      .filter(
        (l) =>
          l.stroke === SCRIB_SHEET_BG_DEFAULTS.colorSuave &&
          l.y1 === l.y2 &&
          Math.abs(l.x1 - ml) < 0.001,
      )
      .map((l) => l.y1)
      .sort((a, b) => a - b);
    expect(softYs).toContain(bottomOfFirstRow - (alto - edge)); // 1.1 from top
    expect(softYs).toContain(bottomOfFirstRow - edge); // 1.1 from bottom
    expect(edge + (alto - 2 * edge) + edge).toBe(alto);
  });
});

describe("scrib background layer", () => {
  it("lists background first and keeps it non-drawable", () => {
    expect(SCRIB_LAYER_IDS[0]).toBe(SCRIB_BACKGROUND_LAYER_ID);
    expect(isScribDrawableLayer(SCRIB_BACKGROUND_LAYER_ID)).toBe(false);
    expect(SCRIB_DRAW_LAYER_IDS).not.toContain(SCRIB_BACKGROUND_LAYER_ID);
    expect(SCRIB_DRAW_LAYER_IDS).toHaveLength(6);
  });
});
