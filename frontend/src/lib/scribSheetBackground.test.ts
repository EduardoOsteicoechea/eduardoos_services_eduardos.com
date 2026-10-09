import { describe, expect, it } from "vitest";
import {
  SCRIB_BACKGROUND_LAYER_ID,
  SCRIB_DRAW_LAYER_IDS,
  SCRIB_LAYER_IDS,
  SCRIB_LAYER_LABELS,
  SCRIB_PAGE_HEIGHT_MM,
  SCRIB_PAGE_WIDTH_MM,
  isScribDrawableLayer,
  normalizeScribBackgroundPattern,
  toggleScribBackgroundPattern,
} from "./scrib";
import {
  buildScribSheetBackgroundGeometry,
  buildScribSheetBackgroundSvgMarkup,
  SCRIB_SHEET_BG_DEFAULTS,
} from "./scribSheetBackground";

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

  it("keeps lateral margins at half the inter-column gap and widens columns", () => {
    expect(SCRIB_SHEET_BG_DEFAULTS.margenLateralMm).toBe(
      SCRIB_SHEET_BG_DEFAULTS.margenEntreColumnasMm / 2,
    );
    const g = buildScribSheetBackgroundGeometry();
    const usableW =
      SCRIB_PAGE_WIDTH_MM - 2 * SCRIB_SHEET_BG_DEFAULTS.margenLateralMm;
    const expectedColW =
      (usableW -
        (SCRIB_SHEET_BG_DEFAULTS.columnas - 1) *
          SCRIB_SHEET_BG_DEFAULTS.margenEntreColumnasMm) /
      SCRIB_SHEET_BG_DEFAULTS.columnas;
    expect(g.rects[0]?.width).toBeCloseTo(expectedColW, 5);
    expect(expectedColW).toBeGreaterThan(45);
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

  it("subdivides each 3 mm gap as 0.9 + 1.2 + 0.9", () => {
    const g = buildScribSheetBackgroundGeometry();
    const ml = SCRIB_SHEET_BG_DEFAULTS.margenLateralMm;
    const mv = SCRIB_SHEET_BG_DEFAULTS.margenVerticalMm;
    const alto = SCRIB_SHEET_BG_DEFAULTS.altoDeLineaMm;
    const espacio = SCRIB_SHEET_BG_DEFAULTS.espacioEntreLineasMm;
    const edge = SCRIB_SHEET_BG_DEFAULTS.bandaExtremaEspacioMm;
    const bottomOfFirstGap = mv + alto + espacio;
    const softYs = g.lines
      .filter(
        (l) =>
          l.stroke === SCRIB_SHEET_BG_DEFAULTS.colorSuave &&
          l.y1 === l.y2 &&
          Math.abs(l.x1 - ml) < 0.001,
      )
      .map((l) => l.y1);
    expect(softYs).toContain(bottomOfFirstGap - (espacio - edge));
    expect(softYs).toContain(bottomOfFirstGap - edge);
    expect(edge + (espacio - 2 * edge) + edge).toBe(espacio);
  });

  it("defaults pattern to ruled-4-3 and toggles to ruled-4-3-3", () => {
    expect(normalizeScribBackgroundPattern(undefined)).toBe("ruled-4-3");
    expect(normalizeScribBackgroundPattern("ruled-4-3-3")).toBe("ruled-4-3-3");
    expect(toggleScribBackgroundPattern("ruled-4-3")).toBe("ruled-4-3-3");
    expect(toggleScribBackgroundPattern("ruled-4-3-3")).toBe("ruled-4-3");
  });

  it("ruled-4-3-3 places two 3 mm gaps after the first 4 mm row", () => {
    const g = buildScribSheetBackgroundGeometry({ pattern: "ruled-4-3-3" });
    const ml = SCRIB_SHEET_BG_DEFAULTS.margenLateralMm;
    const mv = SCRIB_SHEET_BG_DEFAULTS.margenVerticalMm;
    const alto = SCRIB_SHEET_BG_DEFAULTS.altoDeLineaMm;
    const espacio = SCRIB_SHEET_BG_DEFAULTS.espacioEntreLineasMm;
    const edgeW = SCRIB_SHEET_BG_DEFAULTS.bandaExtremaMm;
    const edgeG = SCRIB_SHEET_BG_DEFAULTS.bandaExtremaEspacioMm;
    const darkYs = g.lines
      .filter(
        (l) =>
          l.stroke === SCRIB_SHEET_BG_DEFAULTS.colorOscuro &&
          l.y1 === l.y2 &&
          Math.abs(l.x1 - ml) < 0.001,
      )
      .map((l) => l.y1)
      .sort((a, b) => a - b);
    const softYs = g.lines
      .filter(
        (l) =>
          l.stroke === SCRIB_SHEET_BG_DEFAULTS.colorSuave &&
          l.y1 === l.y2 &&
          Math.abs(l.x1 - ml) < 0.001,
      )
      .map((l) => l.y1);

    const y0 = mv;
    const y4 = mv + alto;
    const y7 = y4 + espacio;
    const y10 = y7 + espacio;
    expect(darkYs).toContain(y0);
    expect(darkYs).toContain(y4);
    expect(darkYs).toContain(y7);
    expect(darkYs).toContain(y10);
    // Soft guides inside writing row and both gaps.
    expect(softYs).toContain(y4 - (alto - edgeW));
    expect(softYs).toContain(y4 - edgeW);
    expect(softYs).toContain(y7 - (espacio - edgeG));
    expect(softYs).toContain(y7 - edgeG);
    expect(softYs).toContain(y10 - (espacio - edgeG));
    expect(softYs).toContain(y10 - edgeG);
  });

  it("ruled-4-3 keeps a single 3 mm gap before the next 4 mm row", () => {
    const g = buildScribSheetBackgroundGeometry({ pattern: "ruled-4-3" });
    const ml = SCRIB_SHEET_BG_DEFAULTS.margenLateralMm;
    const mv = SCRIB_SHEET_BG_DEFAULTS.margenVerticalMm;
    const alto = SCRIB_SHEET_BG_DEFAULTS.altoDeLineaMm;
    const espacio = SCRIB_SHEET_BG_DEFAULTS.espacioEntreLineasMm;
    const darkYs = g.lines
      .filter(
        (l) =>
          l.stroke === SCRIB_SHEET_BG_DEFAULTS.colorOscuro &&
          l.y1 === l.y2 &&
          Math.abs(l.x1 - ml) < 0.001,
      )
      .map((l) => l.y1)
      .sort((a, b) => a - b);
    expect(darkYs).toContain(mv + alto);
    expect(darkYs).toContain(mv + alto + espacio);
    expect(darkYs).toContain(mv + alto + espacio + alto);
    expect(darkYs).not.toContain(mv + alto + espacio + espacio);
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

describe("scrib text layer labels", () => {
  it("uses ambiguous Text 1/2/3 labels for the three text layers", () => {
    expect(SCRIB_LAYER_LABELS.original).toBe("Text 1");
    expect(SCRIB_LAYER_LABELS.translation1).toBe("Text 2");
    expect(SCRIB_LAYER_LABELS.translation2).toBe("Text 3");
    expect(isScribDrawableLayer("translation2")).toBe(true);
  });
});
