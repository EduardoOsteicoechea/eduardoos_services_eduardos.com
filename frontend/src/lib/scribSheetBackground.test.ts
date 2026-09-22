import { describe, expect, it } from "vitest";
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

  it("scales column count", () => {
    const g = buildScribSheetBackgroundGeometry({ columnas: 1 });
    expect(g.rects).toHaveLength(1);
  });
});
