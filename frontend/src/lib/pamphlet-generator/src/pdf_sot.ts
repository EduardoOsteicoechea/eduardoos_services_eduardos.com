/**
 * PDF-first pamphlet source of truth: preview fetch, pdf.js canvas pages, hit overlays.
 */
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import { DOCUMENT_ROUTES } from "../../../config/routes";
import { apiRequest } from "../../api";
import { mustLog } from "../../dev-log";
import { openApiErrorModal } from "../../../components/ServerErrorModal/ServerErrorModal";
import {
    FOOTER_COLUMN,
    FOOTER_FIELD_KEYS,
    HEADER_COLUMN,
    HEADER_FIELD_KEYS,
    PAMPHLET_BODY_COLUMN_READING_ORDER,
    PAMPHLET_FOOTER_LAYOUT_MM,
    PAMPHLET_HEADER_LAYOUT_MM,
    type PamphletStructure,
} from "./pamphlet_schema";
import {
    columnFloorMm,
    columnTopMm,
    geometryFromLayoutBands,
    type PamphletGeometryMm,
    type PamphletLayoutBands,
} from "./pamphlet_geometry";

// Stable public URL (copied by scripts/copy-pdf-worker.mjs on prebuild/predev).
// Avoid hashed /_astro/*.mjs — Nginx often fails ES-module fetch for those.
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export type PamphletLayoutHit = {
    id: string;
    kind: string;
    page: number;
    column: number;
    index: number;
    x_mm: number;
    top_mm: number;
    w_mm: number;
    h_mm: number;
};

export type PamphletPreviewLayout = PamphletLayoutBands & {
    page_width_mm: number;
    page_height_mm: number;
    page_count: number;
    hits: PamphletLayoutHit[];
    lead_columns?: number[];
    schema_version?: number;
};

export type PamphletPreviewResponse = {
    pdf_base64: string;
    layout: PamphletPreviewLayout;
    /** Post-migration document the PDF actually drew (even lead columns). */
    document?: PamphletStructure;
    schema_version?: number;
};

export type PdfHitClickHandler = (column: number, index: number, kind: string) => void;
export type PdfAddClickHandler = (column: number) => void;
export type PdfDocumentDrawnHandler = (doc: PamphletStructure) => void;
export type PdfLayoutHandler = (layout: PamphletPreviewLayout) => void;

export type PamphletPdfSotOptions = {
    stage: HTMLElement;
    onHitClick: PdfHitClickHandler;
    onAddClick?: PdfAddClickHandler;
    /** Called when preview returns a migrated document body to adopt as SoT. */
    onDocumentDrawn?: PdfDocumentDrawnHandler;
    /** Called with layout bands + hits after a successful preview (PDF geometry SoT). */
    onLayout?: PdfLayoutHandler;
};

function rootFontSizePx(): number {
    const raw = getComputedStyle(document.documentElement).fontSize;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 16;
}

function pxToRem(px: number): number {
    return px / rootFontSizePx();
}

function bodySnippet(text: string, max = 800): string {
    const t = text.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max)}…`;
}

function hitId(column: number, index: number): string {
    return `c${column}:${index}`;
}

function isChromeColumn(column: number): boolean {
    return column === HEADER_COLUMN || column === FOOTER_COLUMN;
}

/**
 * Prefer backend chrome hits (column 0 / 9 from drawHeader/drawFooter).
 * Legacy equal-slice fallback only when the API omits chrome (pre schema v5).
 * Prefer fixing backend emission over inventing FE boxes.
 */
/** Coerce layout hit numerics — JSON is fine, but defensive against stringified fields. */
function normalizeLayoutHits(hits: PamphletLayoutHit[]): PamphletLayoutHit[] {
    return hits.map((h) => {
        const column = Number(h.column);
        const index = Number(h.index);
        const page = Number(h.page);
        const x_mm = Number(h.x_mm);
        const top_mm = Number(h.top_mm);
        const w_mm = Number(h.w_mm);
        const h_mm = Number(h.h_mm);
        return {
            id: h.id || hitId(column, index),
            kind: typeof h.kind === "string" ? h.kind : "",
            page: Number.isFinite(page) && page > 0 ? page : 1,
            column: Number.isFinite(column) ? column : -1,
            index: Number.isFinite(index) ? index : -1,
            x_mm: Number.isFinite(x_mm) ? x_mm : 0,
            top_mm: Number.isFinite(top_mm) ? top_mm : 0,
            w_mm: Number.isFinite(w_mm) ? w_mm : 0,
            h_mm: Number.isFinite(h_mm) ? h_mm : 0,
        };
    });
}

function mergeChromeLayoutHits(hits: PamphletLayoutHit[]): PamphletLayoutHit[] {
    const hasHeader = hits.some((h) => h.column === HEADER_COLUMN);
    const hasFooter = hits.some((h) => h.column === FOOTER_COLUMN);
    if (hasHeader && hasFooter) return hits;

    log("chrome.hits.fallback", {
        hasHeader,
        hasFooter,
        bodyHits: hits.length,
    });

    const pageHeightMm = 215.9;
    const marginMm = PAMPHLET_MARGIN_MM;
    const bandW = PAMPHLET_COL_WIDTH_MM * 2 + PAMPHLET_GUTTER_NARROW_MM;
    const headerX = pamphletColXMm(5);
    const headerH = PAMPHLET_HEADER_LAYOUT_MM.height;
    const headerTopMm = marginMm;
    const footerX = pamphletColXMm(7);
    const footerH = PAMPHLET_FOOTER_LAYOUT_MM.height;
    const footerTopMm = pageHeightMm - marginMm - footerH;

    const chrome: PamphletLayoutHit[] = [];
    if (!hasHeader) {
        const headerSlice = headerH / Math.max(1, HEADER_FIELD_KEYS.length);
        HEADER_FIELD_KEYS.forEach((kind, index) => {
            chrome.push({
                id: hitId(HEADER_COLUMN, index),
                kind: `header_${kind}`,
                page: 1,
                column: HEADER_COLUMN,
                index,
                x_mm: headerX,
                top_mm: headerTopMm + index * headerSlice,
                w_mm: bandW,
                h_mm: headerSlice,
            });
        });
    }
    if (!hasFooter) {
        const footerSlice = footerH / Math.max(1, FOOTER_FIELD_KEYS.length);
        FOOTER_FIELD_KEYS.forEach((kind, index) => {
            chrome.push({
                id: hitId(FOOTER_COLUMN, index),
                kind: `footer_${kind}`,
                page: 1,
                column: FOOTER_COLUMN,
                index,
                x_mm: footerX,
                top_mm: footerTopMm + index * footerSlice,
                w_mm: bandW,
                h_mm: footerSlice,
            });
        });
    }
    return [...hits, ...chrome];
}

const PAMPHLET_MARGIN_MM = 10;
const PAMPHLET_COL_WIDTH_MM = 57.85;
const PAMPHLET_GUTTER_NARROW_MM = 4;
const PAMPHLET_GUTTER_WIDE_MM = 20;

function geometryForLayout(layout: PamphletPreviewLayout | null): PamphletGeometryMm {
    return geometryFromLayoutBands(layout, {
        header: PAMPHLET_HEADER_LAYOUT_MM,
        footer: PAMPHLET_FOOTER_LAYOUT_MM,
    });
}

/** Column left edge in mm (matches backend colX tracks). */
function pamphletColXMm(column: number): number {
    const track =
        column === 7 || column === 3 ? 2
        : column === 8 || column === 4 ? 4
        : column === 1 || column === 5 ? 6
        : 8;
    switch (track) {
        case 2:
            return PAMPHLET_MARGIN_MM;
        case 4:
            return PAMPHLET_MARGIN_MM + PAMPHLET_COL_WIDTH_MM + PAMPHLET_GUTTER_NARROW_MM;
        case 6:
            return (
                PAMPHLET_MARGIN_MM +
                PAMPHLET_COL_WIDTH_MM +
                PAMPHLET_GUTTER_NARROW_MM +
                PAMPHLET_COL_WIDTH_MM +
                PAMPHLET_GUTTER_WIDE_MM
            );
        case 8:
            return (
                PAMPHLET_MARGIN_MM +
                PAMPHLET_COL_WIDTH_MM +
                PAMPHLET_GUTTER_NARROW_MM +
                PAMPHLET_COL_WIDTH_MM +
                PAMPHLET_GUTTER_WIDE_MM +
                PAMPHLET_COL_WIDTH_MM +
                PAMPHLET_GUTTER_NARROW_MM
            );
        default:
            return PAMPHLET_MARGIN_MM;
    }
}

function waitTwoFrames(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

function log(step: string, detail: Record<string, unknown> = {}): void {
    if (!mustLog) return;
    console.log("[pamphlet-pdf-sot]", {
        step,
        at: new Date().toISOString(),
        ...detail,
    });
}

function surfacePreviewError(
    message: string,
    extras: { status?: number; requestId?: string; body?: string; cause?: unknown },
): void {
    // Soft failures (abort, timeout, superseded preview) must not spam the global modal —
    // the editor keeps working and a later preview usually succeeds.
    const causeMsg =
        extras.cause instanceof Error
            ? extras.cause.message
            : extras.cause != null
              ? String(extras.cause)
              : "";
    if (
        extras.status === 0 ||
        /abort|timeout|superseded|preview aborted/i.test(`${message} ${causeMsg}`)
    ) {
        log("preview.soft_error", {
            message,
            status: extras.status ?? null,
            requestId: extras.requestId ?? null,
        });
        return;
    }
    const details = [
        extras.status != null ? `HTTP ${extras.status}` : null,
        extras.requestId ? `request_id=${extras.requestId}` : null,
        extras.body ? `body=${bodySnippet(extras.body)}` : null,
        causeMsg || null,
    ]
        .filter(Boolean)
        .join("\n");
    const debug = [
        "pamphlet preview failed",
        extras.status != null ? `status=${extras.status}` : null,
        extras.requestId ? `request_id=${extras.requestId}` : null,
        extras.body ? bodySnippet(extras.body, 2000) : null,
        extras.cause instanceof Error ? extras.cause.stack || extras.cause.message : null,
    ]
        .filter(Boolean)
        .join("\n");
    openApiErrorModal(message, {
        requestId: extras.requestId,
        details: details || undefined,
        debug: debug || undefined,
    });
}

export class PamphletPdfSot {
    private readonly stage: HTMLElement;
    private readonly onHitClick: PdfHitClickHandler;
    private readonly onAddClick: PdfAddClickHandler | null;
    private readonly onDocumentDrawn: PdfDocumentDrawnHandler | null;
    private readonly onLayout: PdfLayoutHandler | null;
    private selectedId: string | null = null;
    private previewQueued = false;
    private previewFlushing = false;
    private previewSeq = 0;
    private pendingDoc: PamphletStructure | null = null;
    private lastDoc: PamphletStructure | null = null;
    private lastRenderWidthPx = 0;
    private destroyed = false;
    private lastLayout: PamphletPreviewLayout | null = null;
    private onPreviewOk: (() => void) | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private resizeTimer: number | null = null;

    constructor(opts: PamphletPdfSotOptions) {
        this.stage = opts.stage;
        this.onHitClick = opts.onHitClick;
        this.onAddClick = opts.onAddClick ?? null;
        this.onDocumentDrawn = opts.onDocumentDrawn ?? null;
        this.onLayout = opts.onLayout ?? null;
        if (!this.stage.querySelector(".pamphlet-pdf-stage__pages")) {
            const pages = document.createElement("div");
            pages.className = "pamphlet-pdf-stage__pages";
            this.stage.replaceChildren(pages);
        }
        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.destroyed || !this.lastDoc) return;
                if (this.resizeTimer != null) window.clearTimeout(this.resizeTimer);
                this.resizeTimer = window.setTimeout(() => {
                    this.resizeTimer = null;
                    if (this.destroyed || !this.lastDoc) return;
                    const w = this.measureStageWidthPx();
                    if (Math.abs(w - this.lastRenderWidthPx) < 32) return;
                    log("resize.rerender", { from: this.lastRenderWidthPx, to: w });
                    this.schedulePreview(this.lastDoc);
                }, 120);
            });
            this.resizeObserver.observe(this.stage);
            const workspace = this.stage.closest(".pamphlet-workspace");
            if (workspace instanceof HTMLElement) this.resizeObserver.observe(workspace);
        }
    }

    setOnPreviewOk(cb: (() => void) | null): void {
        this.onPreviewOk = cb;
    }

    setSelected(column: number | null, index: number | null): void {
        if (column != null && index != null && isChromeColumn(column)) {
            this.selectedId = hitId(column, index);
        } else {
            this.selectedId =
                column != null && index != null && column >= 1 && column <= 8
                    ? hitId(column, index)
                    : null;
        }
        this.applySelectedClass();
    }

    getLastLayout(): PamphletPreviewLayout | null {
        return this.lastLayout;
    }

    /** Coalesced single-flight preview regen — never shows a lagging generation. */
    schedulePreview(doc: PamphletStructure): void {
        if (this.destroyed) return;
        this.pendingDoc = doc;
        this.lastDoc = doc;
        this.previewQueued = true;
        log("schedule", { seq: this.previewSeq, queued: true });
        void this.flushPreview();
    }

    destroy(): void {
        this.destroyed = true;
        this.previewQueued = false;
        this.pendingDoc = null;
        this.lastDoc = null;
        if (this.resizeTimer != null) {
            window.clearTimeout(this.resizeTimer);
            this.resizeTimer = null;
        }
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.stage.replaceChildren();
    }

    /** Usable CSS px width for the letter page (fit-to-stage). */
    private measureStageWidthPx(): number {
        const stageW = this.stage.clientWidth;
        if (stageW >= 240) return stageW;

        const workspace = this.stage.closest(".pamphlet-workspace");
        const app = this.stage.closest(".pamphlet-app");
        const dock = app?.querySelector<HTMLElement>(".pamphlet-edit-dock:not([hidden])");
        const dockW = dock ? dock.getBoundingClientRect().width : 0;
        const padPx = rootFontSizePx() * 2;
        const basis = Math.max(
            workspace instanceof HTMLElement ? workspace.clientWidth : 0,
            app instanceof HTMLElement ? app.clientWidth : 0,
            document.documentElement.clientWidth,
            320,
        );
        return Math.max(240, Math.floor(basis - dockW - padPx));
    }

    private applySelectedClass(): void {
        const hits = this.stage.querySelectorAll<HTMLElement>(".pamphlet-pdf-hit");
        hits.forEach((el) => {
            const id = el.dataset.hitId || "";
            el.classList.toggle("is-selected", Boolean(this.selectedId && id === this.selectedId));
        });
    }

    private async flushPreview(): Promise<void> {
        if (this.destroyed || this.previewFlushing) return;
        if (!this.previewQueued || !this.pendingDoc) return;

        this.previewFlushing = true;
        this.previewQueued = false;
        const seq = ++this.previewSeq;
        const doc = this.pendingDoc;

        log("flush.start", { seq });

        try {
            const payload = await this.fetchPreview(doc, seq);
            if (this.destroyed || seq !== this.previewSeq) {
                log("flush.stale_skip_render", { seq, current: this.previewSeq });
                return;
            }
            if (this.previewQueued) {
                log("flush.skip_render_newer_queued", { seq });
                return;
            }
            await waitTwoFrames();
            if (this.destroyed || seq !== this.previewSeq || this.previewQueued) {
                log("flush.skip_render_after_layout", { seq });
                return;
            }
            await this.renderPreview(payload, seq);
            if (!this.destroyed && seq === this.previewSeq && !this.previewQueued) {
                this.onPreviewOk?.();
            }
        } catch (err) {
            if (this.destroyed) return;
            // Newer preview supersedes this failure — stay quiet.
            if (this.previewQueued || seq !== this.previewSeq) {
                log("flush.stale_error_ignored", {
                    seq,
                    current: this.previewSeq,
                    queued: this.previewQueued,
                });
                return;
            }
            const message =
                err instanceof Error ? err.message : "No se pudo generar la vista previa PDF.";
            log("flush.error", { seq, message });
            if (!(err instanceof Error && err.name === "PamphletPreviewSurfaced")) {
                surfacePreviewError(message, { cause: err });
            }
        } finally {
            this.previewFlushing = false;
            if (!this.destroyed && this.previewQueued) {
                void this.flushPreview();
            }
        }
    }

    private async fetchPreview(
        doc: PamphletStructure,
        seq: number,
    ): Promise<PamphletPreviewResponse> {
        const printPayload: PamphletStructure = {
            ...doc,
            header_layout: PAMPHLET_HEADER_LAYOUT_MM,
            footer_layout: PAMPHLET_FOOTER_LAYOUT_MM,
            ink_color: "black",
        };

        log("fetch.start", { seq, path: DOCUMENT_ROUTES.pamphletPreview });

        // Use apiRequest (not raw fetch) so a first-load CSRF mismatch gets one remint+retry
        // like every other unsafe /api call — otherwise the first open shows 403 and reload “fixes” it.
        const { status, data, requestId } = await apiRequest<PamphletPreviewResponse>(
            "/documents/pamphlet/preview",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(printPayload),
            },
            { timeoutMs: 180_000 },
        );

        log("fetch.end", { seq, status, requestId: requestId || null });

        if (this.destroyed || seq !== this.previewSeq) {
            const e = new Error("Preview aborted");
            e.name = "PamphletPreviewSurfaced";
            throw e;
        }

        // Timed-out / aborted fetch — do not treat as a user-facing failure.
        if (status === 0) {
            const e = new Error("Preview aborted");
            e.name = "PamphletPreviewSurfaced";
            throw e;
        }

        if (status < 200 || status >= 300) {
            // A newer preview is already queued — skip the modal for this stale failure.
            if (this.previewQueued || seq !== this.previewSeq) {
                const e = new Error("Preview superseded");
                e.name = "PamphletPreviewSurfaced";
                throw e;
            }
            const safeMsg =
                (typeof data?.message === "string" && data.message) ||
                (typeof data?.error === "string" && data.error) ||
                "El servidor rechazó la vista previa del panfleto.";
            surfacePreviewError(safeMsg, {
                status,
                requestId,
                body: JSON.stringify({ error: data?.error, message: data?.message, request_id: data?.request_id }),
            });
            const e = new Error(safeMsg);
            e.name = "PamphletPreviewSurfaced";
            throw e;
        }

        if (!data?.pdf_base64 || !data?.layout) {
            surfacePreviewError("La vista previa no incluye pdf_base64 o layout.", {
                status,
                requestId,
            });
            const e = new Error("Incomplete preview payload");
            e.name = "PamphletPreviewSurfaced";
            throw e;
        }

        log("fetch.ok", {
            seq,
            requestId: requestId || null,
            hitCount: data.layout.hits?.length ?? 0,
            pageCount: data.layout.page_count,
            leadColumns: data.layout.lead_columns ?? null,
            schemaVersion: data.schema_version ?? data.layout.schema_version ?? null,
        });
        if (data.document && this.onDocumentDrawn) {
            this.onDocumentDrawn(data.document);
        }
        if (data.layout && this.onLayout) {
            this.onLayout(data.layout);
        }
        return data;
    }

    private async renderPreview(payload: PamphletPreviewResponse, seq: number): Promise<void> {
        const { pdf_base64, layout } = payload;
        // Prefer backend hits as-is; chrome fallback only if API omitted columns 0/9.
        const rawHits = normalizeLayoutHits(Array.isArray(layout.hits) ? layout.hits : []);
        const hits =
            layout.schema_version != null && layout.schema_version >= 5
                ? rawHits
                : mergeChromeLayoutHits(rawHits);
        log("render.pages.start", { seq, pageCount: layout.page_count, hitCount: hits.length });

        let pdf: PDFDocumentProxy;
        try {
            const raw = atob(pdf_base64);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
            pdf = await getDocument({ data: bytes }).promise;
        } catch (err) {
            surfacePreviewError("No se pudo decodificar o abrir el PDF de vista previa.", {
                cause: err,
            });
            const e = new Error("PDF open failed");
            e.name = "PamphletPreviewSurfaced";
            throw e;
        }

        const pageWidthMm = layout.page_width_mm > 0 ? layout.page_width_mm : 279.4;
        const pageHeightMm = layout.page_height_mm > 0 ? layout.page_height_mm : 215.9;
        const stageCssPx = this.measureStageWidthPx();
        this.lastRenderWidthPx = stageCssPx;
        const pageWidthRem = pxToRem(stageCssPx);
        const mmToRem = pageWidthRem / pageWidthMm;
        const pageHeightRem = pageHeightMm * mmToRem;
        const dpr = Math.min(2.5, window.devicePixelRatio || 1);
        log("render.measure", { seq, stageCssPx, pageWidthRem, dpr });

        const nextPages = document.createElement("div");
        nextPages.className = "pamphlet-pdf-stage__pages";
        nextPages.setAttribute("aria-hidden", "false");

        try {
            const numPages = pdf.numPages;
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                if (this.destroyed || seq !== this.previewSeq || this.previewQueued) {
                    log("render.pages.abort", { seq, pageNum });
                    return;
                }
                const page = await pdf.getPage(pageNum);
                const baseViewport = page.getViewport({ scale: 1 });
                const cssScale = (pageWidthRem * rootFontSizePx()) / baseViewport.width;
                const viewport = page.getViewport({ scale: cssScale * dpr });

                const pageEl = document.createElement("div");
                pageEl.className = "pamphlet-pdf-page";
                pageEl.dataset.page = String(pageNum);
                pageEl.style.width = `${pageWidthRem}rem`;
                pageEl.style.height = `${pageHeightRem}rem`;

                const canvas = document.createElement("canvas");
                canvas.className = "pamphlet-pdf-page__canvas";
                canvas.width = Math.max(1, Math.floor(viewport.width));
                canvas.height = Math.max(1, Math.floor(viewport.height));
                canvas.style.width = `${pageWidthRem}rem`;
                canvas.style.height = `${pageHeightRem}rem`;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    surfacePreviewError("No se pudo obtener el contexto 2D del canvas PDF.", {
                        cause: `page=${pageNum}`,
                    });
                    const e = new Error("Canvas 2D unavailable");
                    e.name = "PamphletPreviewSurfaced";
                    throw e;
                }

                await page.render({ canvasContext: ctx, viewport, canvas }).promise;
                pageEl.appendChild(canvas);

                const pageHits = hits.filter((h) => h.page === pageNum);
                for (const hit of pageHits) {
                    const hitEl = document.createElement("div");
                    hitEl.className = "pamphlet-pdf-hit";
                    hitEl.dataset.hitId = hit.id || hitId(hit.column, hit.index);
                    hitEl.dataset.column = String(hit.column);
                    hitEl.dataset.index = String(hit.index);
                    hitEl.dataset.kind = hit.kind || "";
                    hitEl.setAttribute("role", "button");
                    hitEl.setAttribute(
                        "aria-label",
                        isChromeColumn(hit.column)
                            ? `Editar ${hit.kind || "cabecera o pie"}`
                            : `Editar columna ${hit.column}, elemento ${hit.index + 1}`,
                    );
                    hitEl.tabIndex = 0;
                    hitEl.style.left = `${hit.x_mm * mmToRem}rem`;
                    hitEl.style.top = `${hit.top_mm * mmToRem}rem`;
                    hitEl.style.width = `${hit.w_mm * mmToRem}rem`;
                    hitEl.style.height = `${hit.h_mm * mmToRem}rem`;
                    if (this.selectedId && hitEl.dataset.hitId === this.selectedId) {
                        hitEl.classList.add("is-selected");
                    }
                    hitEl.addEventListener("click", (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        this.onHitClick(hit.column, hit.index, hit.kind || "");
                    });
                    hitEl.addEventListener("keydown", (ev) => {
                        if (ev.key !== "Enter" && ev.key !== " ") return;
                        ev.preventDefault();
                        this.onHitClick(hit.column, hit.index, hit.kind || "");
                    });
                    pageEl.appendChild(hitEl);
                }

                this.appendAddControl(pageEl, pageNum, hits, mmToRem, layout);

                nextPages.appendChild(pageEl);
                log("render.page.ok", { seq, pageNum, hits: pageHits.length });
            }
        } finally {
            // pdfjs-dist v5+/v6: PDFDocumentProxy has cleanup(); destroy() lives on loadingTask.
            try {
                await pdf.cleanup();
            } catch {
                /* ignore */
            }
            try {
                await pdf.loadingTask.destroy();
            } catch {
                /* ignore */
            }
        }

        if (this.destroyed || seq !== this.previewSeq || this.previewQueued) {
            log("render.swap.skip", { seq });
            return;
        }

        // Keep stage scroll across page swaps (edit-dock show/save triggers preview regen).
        const stageScrollTop = this.stage.scrollTop;
        const stageScrollLeft = this.stage.scrollLeft;
        const prev = this.stage.querySelector(".pamphlet-pdf-stage__pages");
        if (prev) {
            prev.replaceWith(nextPages);
        } else {
            this.stage.replaceChildren(nextPages);
        }
        this.stage.scrollTop = stageScrollTop;
        this.stage.scrollLeft = stageScrollLeft;
        this.lastLayout = layout;
        this.applySelectedClass();
        log("render.swap.ok", { seq, hitCount: hits.length });
    }

    /**
     * Single "+" under the last content item in pamphlet reading order
     * (1→2 page-1 right, 3→6 page 2, 7→8 page-1 left). Only on that item's page.
     */
    private appendAddControl(
        pageEl: HTMLElement,
        pageNum: number,
        allHits: PamphletLayoutHit[],
        mmToRem: number,
        layout: PamphletPreviewLayout,
    ): void {
        if (!this.onAddClick) return;

        let last: PamphletLayoutHit | null = null;
        for (const col of PAMPHLET_BODY_COLUMN_READING_ORDER) {
            const colHits = allHits
                .filter((h) => h.column === col)
                .sort((a, b) => a.index - b.index);
            for (const h of colHits) last = h;
        }

        const btnMm = 9;
        const gapMm = 1;
        const g = geometryForLayout(layout);

        if (!last) {
            if (pageNum !== 1) return;
            const top = Math.min(columnTopMm(g, 1), columnFloorMm(g, 1) - btnMm);
            this.mountAddButton(pageEl, 1, pamphletColXMm(1), top, btnMm, mmToRem);
            return;
        }

        if (last.page !== pageNum) return;

        const floor = columnFloorMm(g, last.column);
        const rawTop = last.top_mm + last.h_mm + gapMm;
        const top = Math.min(rawTop, Math.max(columnTopMm(g, last.column), floor - btnMm));
        this.mountAddButton(pageEl, last.column, last.x_mm, top, btnMm, mmToRem);
    }

    private mountAddButton(
        pageEl: HTMLElement,
        column: number,
        xMm: number,
        topMm: number,
        btnMm: number,
        mmToRem: number,
    ): void {
        const addEl = document.createElement("button");
        addEl.type = "button";
        addEl.className = "pamphlet-pdf-add";
        addEl.dataset.addColumn = String(column);
        addEl.setAttribute("aria-label", `Añadir elemento en columna ${column}`);
        addEl.title = `Añadir en columna ${column}`;
        addEl.style.left = `${xMm * mmToRem}rem`;
        addEl.style.top = `${topMm * mmToRem}rem`;
        addEl.style.width = `${btnMm * mmToRem}rem`;
        addEl.style.height = `${btnMm * mmToRem}rem`;
        addEl.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.onAddClick?.(column);
        });
        pageEl.appendChild(addEl);
    }
}
