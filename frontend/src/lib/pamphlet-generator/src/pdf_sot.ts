/**
 * PDF-first pamphlet source of truth: preview fetch, pdf.js canvas pages, hit overlays.
 */
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { DOCUMENT_ROUTES } from "../../../config/routes";
import { currentCsrf, getCsrf } from "../../api";
import { mustLog } from "../../dev-log";
import { openApiErrorModal } from "../../../components/ServerErrorModal/ServerErrorModal";
import {
    PAMPHLET_FOOTER_LAYOUT_MM,
    PAMPHLET_HEADER_LAYOUT_MM,
    type PamphletStructure,
} from "./pamphlet_schema";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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

export type PamphletPdfSotOptions = {
    stage: HTMLElement;
    onHitClick: PdfHitClickHandler;
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
    private selectedId: string | null = null;
    private previewQueued = false;
    private previewFlushing = false;
    private previewSeq = 0;
    private pendingDoc: PamphletStructure | null = null;
    private destroyed = false;
    private lastLayout: PamphletPreviewLayout | null = null;
    private onPreviewOk: (() => void) | null = null;

    constructor(opts: PamphletPdfSotOptions) {
        this.stage = opts.stage;
        this.onHitClick = opts.onHitClick;
        if (!this.stage.querySelector(".pamphlet-pdf-stage__pages")) {
            const pages = document.createElement("div");
            pages.className = "pamphlet-pdf-stage__pages";
            this.stage.replaceChildren(pages);
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
        this.previewQueued = true;
        log("schedule", { seq: this.previewSeq, queued: true });
        void this.flushPreview();
    }

    destroy(): void {
        this.destroyed = true;
        this.previewQueued = false;
        this.pendingDoc = null;
        this.stage.replaceChildren();
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
        await getCsrf();
        const headers = new Headers({ "Content-Type": "application/json" });
        const csrf = currentCsrf();
        if (csrf) headers.set("X-CSRF-Token", csrf);

        let res: Response;
        try {
            res = await fetch(DOCUMENT_ROUTES.pamphletPreview, {
                method: "POST",
                credentials: "include",
                headers,
                body: JSON.stringify(printPayload),
            });
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Network error during pamphlet preview.";
            surfacePreviewError(message, { cause: err });
            const e = new Error(message);
            e.name = "PamphletPreviewSurfaced";
            throw e;
        }

        const requestId =
            res.headers.get("X-Request-ID") || res.headers.get("x-request-id") || undefined;
        log("fetch.end", { seq, status: res.status, requestId: requestId || null });

        const text = await res.text();
        if (!res.ok) {
            let safeMsg = "El servidor rechazó la vista previa del panfleto.";
            try {
                const parsed = JSON.parse(text) as { message?: string; error?: string };
                if (parsed?.message) safeMsg = parsed.message;
                else if (parsed?.error) safeMsg = parsed.error;
            } catch {
                /* keep default */
            }
            surfacePreviewError(safeMsg, { status: res.status, requestId, body: text });
            const e = new Error(safeMsg);
            e.name = "PamphletPreviewSurfaced";
            throw e;
        }

        let parsed: PamphletPreviewResponse;
        try {
            parsed = JSON.parse(text) as PamphletPreviewResponse;
        } catch (err) {
            surfacePreviewError("La respuesta de vista previa no es JSON válido.", {
                status: res.status,
                requestId,
                body: text,
                cause: err,
            });
            const e = new Error("Invalid preview JSON");
            e.name = "PamphletPreviewSurfaced";
            throw e;
        }

        if (!parsed?.pdf_base64 || !parsed?.layout) {
            surfacePreviewError("La vista previa no incluye pdf_base64 o layout.", {
                status: res.status,
                requestId,
                body: text,
            });
            const e = new Error("Incomplete preview payload");
            e.name = "PamphletPreviewSurfaced";
            throw e;
        }

        log("fetch.ok", {
            seq,
            requestId: requestId || null,
            hitCount: parsed.layout.hits?.length ?? 0,
            pageCount: parsed.layout.page_count,
        });
        return parsed;
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
        const stageCssPx = Math.max(
            1,
            this.stage.clientWidth || this.stage.parentElement?.clientWidth || 640,
        );
        const pageWidthRem = pxToRem(stageCssPx);
        const mmToRem = pageWidthRem / pageWidthMm;
        const pageHeightRem = pageHeightMm * mmToRem;
        const dpr = Math.min(2.5, window.devicePixelRatio || 1);

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

                nextPages.appendChild(pageEl);
                log("render.page.ok", { seq, pageNum, hits: pageHits.length });
            }
        } finally {
            void pdf.destroy();
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
}
