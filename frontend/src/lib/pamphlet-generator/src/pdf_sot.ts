/**
 * PDF-first pamphlet source of truth: preview fetch, pdf.js canvas pages, hit overlays.
 */
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import { DOCUMENT_ROUTES } from "../../../config/routes";
import { apiRequest } from "../../api";
import { mustLog } from "../../dev-log";
import { openApiErrorModal } from "../../../components/ServerErrorModal/ServerErrorModal";
import {
    PAMPHLET_FOOTER_LAYOUT_MM,
    PAMPHLET_HEADER_LAYOUT_MM,
    type PamphletStructure,
} from "./pamphlet_schema";

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

export type PamphletPreviewLayout = {
    page_width_mm: number;
    page_height_mm: number;
    page_count: number;
    hits: PamphletLayoutHit[];
};

export type PamphletPreviewResponse = {
    pdf_base64: string;
    layout: PamphletPreviewLayout;
};

export type PdfHitClickHandler = (column: number, index: number, kind: string) => void;
export type PdfAddClickHandler = (column: number) => void;

export type PamphletPdfSotOptions = {
    stage: HTMLElement;
    onHitClick: PdfHitClickHandler;
    onAddClick?: PdfAddClickHandler;
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

const PAMPHLET_MARGIN_MM = 10;
const PAMPHLET_COL_WIDTH_MM = 57.85;
const PAMPHLET_GUTTER_NARROW_MM = 4;
const PAMPHLET_GUTTER_WIDE_MM = 20;

/** CSS-top (from page top) fallback for empty columns on page 1 right band. */
function pamphletRightBodyTopMm(): number {
    const headerH = PAMPHLET_HEADER_LAYOUT_MM.height;
    const gutter = PAMPHLET_HEADER_LAYOUT_MM.body_gutter;
    return PAMPHLET_MARGIN_MM + headerH + gutter;
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
    const details = [
        extras.status != null ? `HTTP ${extras.status}` : null,
        extras.requestId ? `request_id=${extras.requestId}` : null,
        extras.body ? `body=${bodySnippet(extras.body)}` : null,
        extras.cause instanceof Error
            ? extras.cause.message
            : extras.cause != null
              ? String(extras.cause)
              : null,
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
        this.selectedId =
            column != null && index != null && column >= 1 && column <= 8
                ? hitId(column, index)
                : null;
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

        if (status < 200 || status >= 300) {
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
        });
        return data;
    }

    private async renderPreview(payload: PamphletPreviewResponse, seq: number): Promise<void> {
        const { pdf_base64, layout } = payload;
        const hits = Array.isArray(layout.hits) ? layout.hits : [];
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
                        `Editar columna ${hit.column}, elemento ${hit.index + 1}`,
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

                this.appendAddControl(pageEl, pageNum, hits, mmToRem);

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

        const prev = this.stage.querySelector(".pamphlet-pdf-stage__pages");
        if (prev) {
            prev.replaceWith(nextPages);
        } else {
            this.stage.replaceChildren(nextPages);
        }
        this.lastLayout = layout;
        this.applySelectedClass();
        log("render.swap.ok", { seq, hitCount: hits.length });
    }

    /**
     * Single "+" under the last content item in fill order (columns 1→8).
     * Only rendered on the page that hosts that item.
     */
    private appendAddControl(
        pageEl: HTMLElement,
        pageNum: number,
        allHits: PamphletLayoutHit[],
        mmToRem: number,
    ): void {
        if (!this.onAddClick) return;

        let last: PamphletLayoutHit | null = null;
        for (let col = 1; col <= 8; col++) {
            const colHits = allHits
                .filter((h) => h.column === col)
                .sort((a, b) => a.index - b.index);
            for (const h of colHits) last = h;
        }

        const btnMm = 9;
        const gapMm = 1;

        if (!last) {
            if (pageNum !== 1) return;
            this.mountAddButton(
                pageEl,
                1,
                pamphletColXMm(1),
                pamphletRightBodyTopMm(),
                btnMm,
                mmToRem,
            );
            return;
        }

        if (last.page !== pageNum) return;

        this.mountAddButton(
            pageEl,
            last.column,
            last.x_mm,
            last.top_mm + last.h_mm + gapMm,
            btnMm,
            mmToRem,
        );
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
