/**
 * FE mirror of backend computePamphletGeometry (pkg/pdf/pamphlet.go).
 * Canonical SoT is the Go PDF builder — after each preview, prefer layout bands
 * from the API over this local compute. See pamphlet-geometry-sot.mdc + spec 007.
 */

import {
    PAMPHLET_FOOTER_LAYOUT_MM,
    PAMPHLET_HEADER_LAYOUT_MM,
    LEAD_IMAGE_GAP_MM,
    LEAD_IMAGE_HEIGHT_MM,
    type PamphletFooterLayoutMm,
    type PamphletHeaderLayoutMm,
} from "./pamphlet_schema";

export const PAMPHLET_PAGE_WIDTH_MM = 279.4;
export const PAMPHLET_PAGE_HEIGHT_MM = 215.9;
export const PAMPHLET_MARGIN_MM = 10;
export const PAMPHLET_FOOTER_BODY_GUTTER_DEFAULT_MM = 6;

export type PamphletGeometryMm = {
    pageWidth: number;
    pageHeight: number;
    margin: number;
    headerH: number;
    headerBodyGutter: number;
    footerH: number;
    footerBodyGutter: number;
    contentBand: number;
    page1Body: number;
    page1RightCol: number;
    page1LeftCol: number;
    page2Col: number;
    headerTop: number;
    rightBodyTop: number;
    leftBodyTop: number;
    footerTop: number;
    rightBodyFloor: number;
    leftBodyFloor: number;
    page2Floor: number;
};

/** Band fields returned on preview `layout` (schema_version >= 5). */
export type PamphletLayoutBands = {
    margin_mm?: number;
    content_band_mm?: number;
    page1_body_mm?: number;
    page1_right_col_mm?: number;
    page1_left_col_mm?: number;
    page2_col_mm?: number;
    header_h_mm?: number;
    header_body_gutter_mm?: number;
    footer_h_mm?: number;
    footer_body_gutter_mm?: number;
    right_body_top_mm?: number;
    left_body_top_mm?: number;
    footer_top_mm?: number;
    right_body_floor_mm?: number;
    left_body_floor_mm?: number;
    page2_floor_mm?: number;
    page_width_mm?: number;
    page_height_mm?: number;
};

export type PamphletGeometryInput = {
    header?: Partial<PamphletHeaderLayoutMm> | null;
    footer?: Partial<PamphletFooterLayoutMm> | null;
};

/** Must match Go computePamphletGeometry operation order. */
export function computePamphletGeometry(input: PamphletGeometryInput = {}): PamphletGeometryMm {
    const headerH = positiveOr(input.header?.height, PAMPHLET_HEADER_LAYOUT_MM.height);
    const headerBodyGutter = positiveOr(
        input.header?.body_gutter,
        PAMPHLET_HEADER_LAYOUT_MM.body_gutter,
    );
    const footerH = positiveOr(input.footer?.height, PAMPHLET_FOOTER_LAYOUT_MM.height);
    const footerBodyGutter = positiveOr(
        input.footer?.body_gutter,
        PAMPHLET_FOOTER_LAYOUT_MM.body_gutter ?? PAMPHLET_FOOTER_BODY_GUTTER_DEFAULT_MM,
    );
    const margin = PAMPHLET_MARGIN_MM;
    const contentBand = PAMPHLET_PAGE_HEIGHT_MM - 2 * margin;
    const page1RightCol = contentBand - headerH - headerBodyGutter;
    const page1LeftCol = contentBand - footerBodyGutter - footerH;
    const page1Body =
        contentBand - headerH - headerBodyGutter - footerBodyGutter - footerH;
    const rightBodyTop = margin + headerH + headerBodyGutter;
    const leftBodyTop = margin;
    const footerTop = PAMPHLET_PAGE_HEIGHT_MM - margin - footerH;
    return {
        pageWidth: PAMPHLET_PAGE_WIDTH_MM,
        pageHeight: PAMPHLET_PAGE_HEIGHT_MM,
        margin,
        headerH,
        headerBodyGutter,
        footerH,
        footerBodyGutter,
        contentBand,
        page1Body,
        page1RightCol,
        page1LeftCol,
        page2Col: contentBand,
        headerTop: margin,
        rightBodyTop,
        leftBodyTop,
        footerTop,
        rightBodyFloor: rightBodyTop + page1RightCol,
        leftBodyFloor: leftBodyTop + page1LeftCol,
        page2Floor: margin + contentBand,
    };
}

/** Prefer backend layout bands when present (preview SoT). */
export function geometryFromLayoutBands(
    layout: PamphletLayoutBands | null | undefined,
    fallbackInput: PamphletGeometryInput = {},
): PamphletGeometryMm {
    const base = computePamphletGeometry(fallbackInput);
    if (!layout) return base;
    const num = (v: number | undefined, d: number) =>
        typeof v === "number" && Number.isFinite(v) && v > 0 ? v : d;
    const pageHeight = num(layout.page_height_mm, base.pageHeight);
    const margin = num(layout.margin_mm, base.margin);
    const contentBand = num(layout.content_band_mm, base.contentBand);
    const page1RightCol = num(layout.page1_right_col_mm, base.page1RightCol);
    const page1LeftCol = num(layout.page1_left_col_mm, base.page1LeftCol);
    const headerH = num(layout.header_h_mm, base.headerH);
    const headerBodyGutter = num(layout.header_body_gutter_mm, base.headerBodyGutter);
    const footerH = num(layout.footer_h_mm, base.footerH);
    const footerBodyGutter = num(layout.footer_body_gutter_mm, base.footerBodyGutter);
    const rightBodyTop = num(layout.right_body_top_mm, base.rightBodyTop);
    const leftBodyTop = num(layout.left_body_top_mm, base.leftBodyTop);
    const footerTop = num(layout.footer_top_mm, base.footerTop);
    return {
        pageWidth: num(layout.page_width_mm, base.pageWidth),
        pageHeight,
        margin,
        headerH,
        headerBodyGutter,
        footerH,
        footerBodyGutter,
        contentBand,
        page1Body: num(layout.page1_body_mm, base.page1Body),
        page1RightCol,
        page1LeftCol,
        page2Col: num(layout.page2_col_mm, base.page2Col),
        headerTop: margin,
        rightBodyTop,
        leftBodyTop,
        footerTop,
        rightBodyFloor: num(layout.right_body_floor_mm, rightBodyTop + page1RightCol),
        leftBodyFloor: num(layout.left_body_floor_mm, leftBodyTop + page1LeftCol),
        page2Floor: num(layout.page2_floor_mm, margin + contentBand),
    };
}

/** Write CSS custom properties so the sheet grid matches geometry. */
export function applyPamphletGeometry(root: HTMLElement, g: PamphletGeometryMm): void {
    const set = (name: string, mm: number) => {
        root.style.setProperty(name, `${mm}mm`);
    };
    set("--page-margin", g.margin);
    set("--page-header-height", g.headerH);
    set("--header-body-gutter", g.headerBodyGutter);
    set("--page-footer-height", g.footerH);
    set("--footer-body-gutter", g.footerBodyGutter);
    set("--page1-body-height", g.page1Body);
    set("--page1-right-col-height", g.page1RightCol);
    set("--page1-left-col-height", g.page1LeftCol);
    set("--column-content-height", g.contentBand);
    const lead = LEAD_IMAGE_HEIGHT_MM;
    const leadGap = LEAD_IMAGE_GAP_MM;
    set("--page1-right-col-height-structured", g.page1RightCol - lead - leadGap);
    set("--page1-left-col-height-structured", g.page1LeftCol - lead - leadGap);
    set("--column-content-height-structured", g.contentBand - lead - leadGap);
}

export function maxHeightForColumnFromGeometry(
    g: PamphletGeometryMm,
    columnIndex: number,
    opts: { structured?: boolean } = {},
): number {
    const leadReserve = LEAD_IMAGE_HEIGHT_MM + LEAD_IMAGE_GAP_MM;
    const structured = Boolean(opts.structured);
    if (columnIndex === 1 || columnIndex === 2) {
        if (structured && columnIndex === 2) {
            return g.page1RightCol - leadReserve;
        }
        return g.page1RightCol;
    }
    if (columnIndex === 7 || columnIndex === 8) {
        if (structured && columnIndex === 8) {
            return g.page1LeftCol - leadReserve;
        }
        return g.page1LeftCol;
    }
    if (structured && (columnIndex === 4 || columnIndex === 6)) {
        return g.page2Col - leadReserve;
    }
    return g.page2Col;
}

export function columnFloorMm(g: PamphletGeometryMm, columnIndex: number): number {
    if (columnIndex === 1 || columnIndex === 2) return g.rightBodyFloor;
    if (columnIndex === 7 || columnIndex === 8) return g.leftBodyFloor;
    return g.page2Floor;
}

export function columnTopMm(g: PamphletGeometryMm, columnIndex: number): number {
    if (columnIndex === 1 || columnIndex === 2) return g.rightBodyTop;
    if (columnIndex === 7 || columnIndex === 8) return g.leftBodyTop;
    return g.margin;
}

function positiveOr(v: number | undefined, fallback: number): number {
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback;
}
