/**
 * Vector ruled US Letter background for Scrib.
 * Port of formatted_sheet_generator/app.py (columnas + renglones) to SVG mm units.
 */

import { SCRIB_PAGE_HEIGHT_MM, SCRIB_PAGE_WIDTH_MM } from "./scrib";

export type ScribSheetBgOptions = {
  margenLateralMm?: number;
  margenVerticalMm?: number;
  margenEntreColumnasMm?: number;
  columnas?: number;
  grosorDeBordeMm?: number;
  colorSuave?: string;
  colorOscuro?: string;
  altoDeLineaMm?: number;
  espacioEntreLineasMm?: number;
  /** Top/bottom band inside each writing row (mm). Middle = alto − 2×this. */
  bandaExtremaMm?: number;
  /** Top/bottom band inside each inter-row gap (mm). Middle = espacio − 2×this. */
  bandaExtremaEspacioMm?: number;
  pageWidthMm?: number;
  pageHeightMm?: number;
};

export type ScribSheetBgLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
};

export type ScribSheetBgRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
};

export type ScribSheetBgGeometry = {
  pageWidthMm: number;
  pageHeightMm: number;
  strokeWidthMm: number;
  rects: ScribSheetBgRect[];
  lines: ScribSheetBgLine[];
};

/** Defaults match formatted_sheet_generator `generar_documentos_columnas`,
 * with asymmetric row bands: 1.1 + 1.8 + 1.1 mm inside each 4 mm writing row. */
export const SCRIB_SHEET_BG_DEFAULTS = {
  /** Half of `margenEntreColumnasMm` so side gutters match half the inter-column gap. */
  margenLateralMm: 10,
  margenVerticalMm: 10,
  margenEntreColumnasMm: 20,
  columnas: 3,
  grosorDeBordeMm: 0.25,
  colorSuave: "#eeeeee",
  colorOscuro: "#dddddd",
  altoDeLineaMm: 4,
  espacioEntreLineasMm: 3,
  /** Top and bottom bands inside each writing row (middle = alto − 2×this). */
  bandaExtremaMm: 1.1,
  /** Top and bottom bands inside each 3 mm gap (middle = espacio − 2×this). */
  bandaExtremaEspacioMm: 0.9,
} as const;

/**
 * Build ruled-sheet geometry in millimetres (SVG Y grows downward, like PIL).
 */
export function buildScribSheetBackgroundGeometry(
  options: ScribSheetBgOptions = {},
): ScribSheetBgGeometry {
  const pageWidthMm = options.pageWidthMm ?? SCRIB_PAGE_WIDTH_MM;
  const pageHeightMm = options.pageHeightMm ?? SCRIB_PAGE_HEIGHT_MM;
  const margenLateralMm = options.margenLateralMm ?? SCRIB_SHEET_BG_DEFAULTS.margenLateralMm;
  const margenVerticalMm = options.margenVerticalMm ?? SCRIB_SHEET_BG_DEFAULTS.margenVerticalMm;
  const margenEntreColumnasMm =
    options.margenEntreColumnasMm ?? SCRIB_SHEET_BG_DEFAULTS.margenEntreColumnasMm;
  const columnas = Math.max(1, Math.floor(options.columnas ?? SCRIB_SHEET_BG_DEFAULTS.columnas));
  const strokeWidthMm = options.grosorDeBordeMm ?? SCRIB_SHEET_BG_DEFAULTS.grosorDeBordeMm;
  const colorSuave = options.colorSuave ?? SCRIB_SHEET_BG_DEFAULTS.colorSuave;
  const colorOscuro = options.colorOscuro ?? SCRIB_SHEET_BG_DEFAULTS.colorOscuro;
  const altoDeLineaMm = options.altoDeLineaMm ?? SCRIB_SHEET_BG_DEFAULTS.altoDeLineaMm;
  const espacioEntreLineasMm =
    options.espacioEntreLineasMm ?? SCRIB_SHEET_BG_DEFAULTS.espacioEntreLineasMm;
  const bandaExtremaMm = Math.min(
    options.bandaExtremaMm ?? SCRIB_SHEET_BG_DEFAULTS.bandaExtremaMm,
    altoDeLineaMm / 2,
  );
  const bandaExtremaEspacioMm = Math.min(
    options.bandaExtremaEspacioMm ?? SCRIB_SHEET_BG_DEFAULTS.bandaExtremaEspacioMm,
    espacioEntreLineasMm / 2,
  );

  const usableW = pageWidthMm - 2 * margenLateralMm;
  const usableH = pageHeightMm - 2 * margenVerticalMm;
  const colW = (usableW - (columnas - 1) * margenEntreColumnasMm) / columnas;

  const rects: ScribSheetBgRect[] = [];
  const lines: ScribSheetBgLine[] = [];

  const hLine = (x1: number, x2: number, y: number, stroke: string) => {
    lines.push({ x1, y1: y, x2, y2: y, stroke });
  };
  const vLine = (x: number, y1: number, y2: number, stroke: string) => {
    lines.push({ x1: x, y1, x2: x, y2, stroke });
  };

  for (let col = 0; col < columnas; col++) {
    const xStart = margenLateralMm + col * (colW + margenEntreColumnasMm);
    const yStart = margenVerticalMm;
    const xEnd = xStart + colW;
    const yEnd = yStart + usableH;

    rects.push({
      x: xStart,
      y: yStart,
      width: colW,
      height: usableH,
      stroke: colorSuave,
    });

    // Top edge of first row (darker, same as row bottoms in the Python source).
    hLine(xStart, xEnd, yStart, colorOscuro);

    if (col < columnas - 1) {
      const xDiv = xStart + colW + margenEntreColumnasMm / 2;
      vLine(xDiv, yStart, yEnd, colorSuave);
    }

    let yActual = yStart;
    while (true) {
      yActual += altoDeLineaMm;
      if (yActual >= yEnd) break;

      hLine(xStart, xEnd, yActual, colorOscuro);

      // Writing row: top bandaExtrema | middle | bottom bandaExtrema (default 1.1 | 1.8 | 1.1).
      hLine(xStart, xEnd, yActual - (altoDeLineaMm - bandaExtremaMm), colorSuave);
      hLine(xStart, xEnd, yActual - bandaExtremaMm, colorSuave);

      yActual += espacioEntreLineasMm;
      if (yActual >= yEnd) break;

      hLine(xStart, xEnd, yActual, colorOscuro);

      // Gap: top bandaExtremaEspacio | middle | bottom (default 0.9 | 1.2 | 0.9).
      hLine(xStart, xEnd, yActual - (espacioEntreLineasMm - bandaExtremaEspacioMm), colorSuave);
      hLine(xStart, xEnd, yActual - bandaExtremaEspacioMm, colorSuave);
    }
  }

  return { pageWidthMm, pageHeightMm, strokeWidthMm, rects, lines };
}

/** Serialize geometry to an SVG document string (for print rasterization). */
export function buildScribSheetBackgroundSvgMarkup(
  options: ScribSheetBgOptions = {},
): string {
  const g = buildScribSheetBackgroundGeometry(options);
  const sw = g.strokeWidthMm;
  const rectXml = g.rects
    .map(
      (r) =>
        `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" stroke="${r.stroke}" stroke-width="${sw}"/>`,
    )
    .join("");
  const lineXml = g.lines
    .map(
      (l) =>
        `<line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${l.stroke}" stroke-width="${sw}"/>`,
    )
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.pageWidthMm} ${g.pageHeightMm}" ` +
    `width="${g.pageWidthMm}mm" height="${g.pageHeightMm}mm">` +
    `<rect x="0" y="0" width="${g.pageWidthMm}" height="${g.pageHeightMm}" fill="#ffffff"/>` +
    `${rectXml}${lineXml}</svg>`
  );
}
