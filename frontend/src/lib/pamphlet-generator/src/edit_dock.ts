/**
 * PDF-first edit dock: live text edits + toolbar actions against FlatRef / pamphlet_doc.
 */
import { normalizeImageDataUrlToJpeg, setChromeStatus } from "./create_element";
import { ICONS } from "./icons";
import {
    applyBoldRange,
    clonePamphlet,
    deleteItem,
    getRegionItems,
    moveItemDown,
    moveItemUp,
    updateItemContent,
    updateItemHeightMm,
    updateItemStyleIndexes,
    type FlatRef,
} from "./pamphlet_doc";
import {
    DEFAULT_IMAGE_HEIGHT_MM,
    DEFAULT_IMAGE_SCALE,
    IMAGE_HEIGHT_STEP_MM,
    IMAGE_OFFSET_STEP_MM,
    IMAGE_SCALE_STEP,
    MAX_IMAGE_SCALE,
    MIN_IMAGE_HEIGHT_MM,
    MIN_IMAGE_SCALE,
    clampImageHeightMm,
    imageOffsetXMmFromStyles,
    imageOffsetYMmFromStyles,
    imageScaleFromStyles,
    writeImageTransformToStyles,
    FOOTER_COLUMN,
    FOOTER_FIELD_KEYS,
    HEADER_COLUMN,
    HEADER_FIELD_KEYS,
    chromeFieldMaxLength,
    type FooterFieldKey,
    type HeaderFieldKey,
    type LastEditedElement,
    type PamphletItem,
    type PamphletStructure,
    type StyleIndexes,
} from "./pamphlet_schema";
import { mustLog } from "../../dev-log";
import { openApiErrorModal } from "../../../components/ServerErrorModal/ServerErrorModal";

const LIVE_DEBOUNCE_MS = 120;
/** Tablet + desktop: dock stays open on the left. Phone: overlay only while editing. */
const DOCK_PERSISTENT_MQ = "(min-width: 48rem)";
const DOCK_PHONE_MQ = "(max-width: 47.999rem)";
const PHONE_DOCK_BODY_CLASS = "pamphlet-phone-dock-open";

export type EditDockInsertRequest =
    | { mode: "end"; column: number }
    | { mode: "relative"; column: number; index: number; where: "above" | "below" };

export type EditDockNotesRequest = {
    action: "notes" | "notes-view";
    container: HTMLElement;
    start?: number;
    end?: number;
};

export type EditDockHost = {
    getDoc: () => PamphletStructure | null;
    setDoc: (doc: PamphletStructure) => void;
    ensureDocumentId: (doc: PamphletStructure) => PamphletStructure;
    hasEditableSession: () => boolean;
    schedulePersist: () => void;
    schedulePreview: () => void;
    setError: (message: string) => void;
    setSelected: (column: number | null, index: number | null) => void;
    pushUndoSnapshot: () => void;
    getUndoSnapshot: () => PamphletStructure | null;
    setUndoSnapshot: (doc: PamphletStructure | null) => void;
    commitDocument: (doc: PamphletStructure, openEdit: boolean) => void;
    applyLocalDoc: (doc: PamphletStructure, opts?: { openEdit?: boolean; skipPreview?: boolean }) => void;
    openItemTypeModal: (insert: EditDockInsertRequest) => void;
    openNotesModal: (detail: EditDockNotesRequest) => Promise<void>;
    findBodyItemContainer: (loc: LastEditedElement) => HTMLElement | null;
    /** Mobile stacked sheet: highlight the item being edited. */
    highlightBodyItem: (loc: LastEditedElement | null) => void;
    /** Mobile stacked sheet: paint live text into the DOM item. */
    syncLiveBodyContent: (loc: LastEditedElement, content: string) => void;
    /** Hidden sheet DOM for header/footer fields (PDF-first). */
    syncLiveChromeContent: (loc: LastEditedElement, content: string) => void;
    commitChromeOnly: (doc: PamphletStructure) => void;
    /** Reflow dock top inset + sheet margin after phone portal mount. */
    requestLayoutSync: () => void;
    /** Column ink ceiling in mm (PDF geometry SoT / FE mirror). */
    maxColumnHeightMm: (column: number) => number;
};

type EditDockSession = {
    loc: FlatRef;
    kind: string;
    imageMode: boolean;
    chromeMode: boolean;
    initialContent: string;
    initialHeightMm: number;
    initialStyles: StyleIndexes;
};

function isChromeColumn(column: number): boolean {
    return column === HEADER_COLUMN || column === FOOTER_COLUMN;
}

function chromeFieldFromKind(kind: string): HeaderFieldKey | FooterFieldKey | null {
    const k = kind.trim();
    if (k.startsWith("header_")) {
        const field = k.slice("header_".length) as HeaderFieldKey;
        return HEADER_FIELD_KEYS.includes(field) ? field : null;
    }
    if (k.startsWith("footer_")) {
        const field = k.slice("footer_".length) as FooterFieldKey;
        return FOOTER_FIELD_KEYS.includes(field) ? field : null;
    }
    if (HEADER_FIELD_KEYS.includes(k as HeaderFieldKey)) return k as HeaderFieldKey;
    if (FOOTER_FIELD_KEYS.includes(k as FooterFieldKey)) return k as FooterFieldKey;
    return null;
}

function chromeFieldAt(
    loc: LastEditedElement,
    kindHint = "",
): HeaderFieldKey | FooterFieldKey | null {
    const fromKind = chromeFieldFromKind(kindHint);
    if (fromKind) return fromKind;
    if (loc.column === HEADER_COLUMN) {
        return HEADER_FIELD_KEYS[loc.index] ?? null;
    }
    if (loc.column === FOOTER_COLUMN) {
        return FOOTER_FIELD_KEYS[loc.index] ?? null;
    }
    return null;
}

function locForChromeField(
    field: HeaderFieldKey | FooterFieldKey,
    fallback: LastEditedElement,
): LastEditedElement {
    const hi = HEADER_FIELD_KEYS.indexOf(field as HeaderFieldKey);
    if (hi >= 0) return { column: HEADER_COLUMN, index: hi };
    const fi = FOOTER_FIELD_KEYS.indexOf(field as FooterFieldKey);
    if (fi >= 0) return { column: FOOTER_COLUMN, index: fi };
    return { column: fallback.column, index: fallback.index };
}

function readChromeContent(
    doc: PamphletStructure,
    loc: LastEditedElement,
    kindHint = "",
): string {
    const field = chromeFieldAt(loc, kindHint);
    if (!field) return "";
    const resolved = locForChromeField(field, loc);
    if (resolved.column === HEADER_COLUMN) {
        return doc.header[field as HeaderFieldKey] ?? "";
    }
    return doc.footer[field as FooterFieldKey] ?? "";
}

function writeChromeContent(
    doc: PamphletStructure,
    loc: LastEditedElement,
    content: string,
    kindHint = "",
): void {
    const field = chromeFieldAt(loc, kindHint);
    if (!field) return;
    const resolved = locForChromeField(field, loc);
    if (resolved.column === HEADER_COLUMN) {
        doc.header = { ...doc.header, [field as HeaderFieldKey]: content };
        return;
    }
    doc.footer = { ...doc.footer, [field as FooterFieldKey]: content };
}

export type EditDockController = {
    open: (loc: LastEditedElement, kindHint?: string) => void;
    close: () => void;
    destroy: () => void;
    isOpen: () => boolean;
    getSessionLoc: () => FlatRef | null;
};

function log(step: string, detail: Record<string, unknown> = {}): void {
    if (!mustLog) return;
    console.log("[pamphlet-edit-dock]", {
        step,
        at: new Date().toISOString(),
        ...detail,
    });
}

/** Scrollports that can jump when the edit dock shows, hides, focuses, or saves. */
type EditorScrollSnap = {
    windowX: number;
    windowY: number;
    elements: Array<{ el: HTMLElement; top: number; left: number }>;
};

function editorScrollElements(): HTMLElement[] {
    const seen = new Set<HTMLElement>();
    const out: HTMLElement[] = [];
    const push = (el: Element | null | undefined): void => {
        if (!(el instanceof HTMLElement) || seen.has(el)) return;
        seen.add(el);
        out.push(el);
    };
    push(document.documentElement);
    push(document.body);
    push(document.querySelector(".pamphlet-layout-workspace"));
    push(document.querySelector(".pamphlet-route-root"));
    push(document.querySelector(".pamphlet-app"));
    push(document.querySelector("#pamphlet-pdf-stage"));
    return out;
}

function captureEditorScroll(): EditorScrollSnap {
    return {
        windowX: window.scrollX || 0,
        windowY: window.scrollY || document.documentElement.scrollTop || 0,
        elements: editorScrollElements().map((el) => ({
            el,
            top: el.scrollTop,
            left: el.scrollLeft,
        })),
    };
}

function restoreEditorScroll(snap: EditorScrollSnap): void {
    window.scrollTo(snap.windowX, snap.windowY);
    for (const entry of snap.elements) {
        if (!entry.el.isConnected) continue;
        entry.el.scrollTop = entry.top;
        entry.el.scrollLeft = entry.left;
    }
}

/** Nest-safe: outer open/save/close owns the snap so inner showShell/close do not stomp it. */
let preserveScrollDepth = 0;
let preserveScrollSnap: EditorScrollSnap | null = null;

function withPreservedEditorScroll(fn: () => void): void {
    if (preserveScrollDepth === 0) {
        preserveScrollSnap = captureEditorScroll();
    }
    preserveScrollDepth += 1;
    try {
        fn();
    } finally {
        preserveScrollDepth -= 1;
        if (preserveScrollDepth === 0 && preserveScrollSnap) {
            const snap = preserveScrollSnap;
            preserveScrollSnap = null;
            restoreEditorScroll(snap);
            requestAnimationFrame(() => {
                restoreEditorScroll(snap);
                requestAnimationFrame(() => restoreEditorScroll(snap));
            });
        }
    }
}

function focusWithoutScroll(el: HTMLElement): void {
    try {
        el.focus({ preventScroll: true });
    } catch {
        el.focus();
    }
}

function setDockButtonIcon(btn: HTMLButtonElement, src: string, label: string): void {
    btn.replaceChildren();
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    btn.appendChild(img);
    btn.setAttribute("aria-label", label);
    btn.title = label;
}

function getBodyItemFromDoc(data: PamphletStructure, loc: FlatRef): PamphletItem | null {
    if (loc.column < 1 || loc.column > 8) return null;
    return getRegionItems(data, loc.column)[loc.index] ?? null;
}

export function setupEditDock(
    dockRoot: HTMLElement,
    host: EditDockHost,
): EditDockController {
    const textarea = dockRoot.querySelector<HTMLTextAreaElement>("#pamphlet-edit-dock-textarea");
    const imagePanel = dockRoot.querySelector<HTMLElement>("#pamphlet-edit-dock-image");
    const fileInput = dockRoot.querySelector<HTMLInputElement>("#pamphlet-edit-dock-file");
    const idleHint = dockRoot.querySelector<HTMLElement>("[data-dock-idle-hint]");
    if (!textarea || !imagePanel || !fileInput) {
        throw new Error("Edit dock markup missing required controls.");
    }

    let session: EditDockSession | null = null;
    let suppressInput = false;
    let liveTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;
    let phoneScrollLocked = false;
    let phoneLockedScrollY = 0;
    const disposers: Array<() => void> = [];
    const persistentMq = window.matchMedia(DOCK_PERSISTENT_MQ);
    const phoneMq = window.matchMedia(DOCK_PHONE_MQ);
    const dockHomeParent = dockRoot.parentElement;
    const dockHomeNext = dockRoot.nextElementSibling;

    function rootFontPx(): number {
        return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    }

    function pxToRem(px: number): string {
        return `${px / rootFontPx()}rem`;
    }

    function clearPhoneDockInlinePin(): void {
        dockRoot.style.position = "";
        dockRoot.style.top = "";
        dockRoot.style.left = "";
        dockRoot.style.right = "";
        dockRoot.style.bottom = "";
        dockRoot.style.width = "";
        dockRoot.style.height = "";
        dockRoot.style.maxHeight = "";
        dockRoot.style.minHeight = "";
        dockRoot.style.margin = "";
        dockRoot.style.zIndex = "";
        dockRoot.style.transform = "";
    }

    /** Pin dock to the *visual* viewport top (survives browser URL bar + html scrollport). */
    function syncPhoneDockViewportPin(): void {
        if (destroyed || !dockRoot.hasAttribute("data-phone-pinned") || dockRoot.hidden) {
            return;
        }
        const vv = window.visualViewport;
        const topPx = vv?.offsetTop ?? 0;
        const leftPx = vv?.offsetLeft ?? 0;
        const widthPx = vv?.width ?? window.innerWidth;
        dockRoot.style.position = "fixed";
        dockRoot.style.top = pxToRem(topPx);
        dockRoot.style.left = pxToRem(leftPx);
        dockRoot.style.width = pxToRem(widthPx);
        dockRoot.style.right = "auto";
        dockRoot.style.bottom = "auto";
        dockRoot.style.height = "12.5rem";
        dockRoot.style.maxHeight = "12.5rem";
        dockRoot.style.minHeight = "12.5rem";
        dockRoot.style.margin = "0";
        dockRoot.style.zIndex = "39";
        dockRoot.style.transform = "translateZ(0)";
    }

    function lockPhonePageScroll(): void {
        if (phoneScrollLocked) return;
        phoneScrollLocked = true;
        phoneLockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.style.position = "fixed";
        document.body.style.top = pxToRem(-phoneLockedScrollY);
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "auto";
    }

    function phoneAppScrollTop(): number {
        const app = document.querySelector(".pamphlet-app");
        return app instanceof HTMLElement ? app.scrollTop : 0;
    }

    function unlockPhonePageScroll(): void {
        if (!phoneScrollLocked) return;
        // While locked, wheel/touch scroll moves to .pamphlet-app — fold that in.
        const y = phoneLockedScrollY + phoneAppScrollTop();
        phoneScrollLocked = false;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        const app = document.querySelector(".pamphlet-app");
        if (app instanceof HTMLElement) app.scrollTop = 0;
        window.scrollTo(0, y);
        phoneLockedScrollY = y;
        // Keep nest-safe restore from replaying pre-unlock (window=0 / app scrolled) snaps.
        if (preserveScrollSnap) {
            preserveScrollSnap.windowX = window.scrollX || 0;
            preserveScrollSnap.windowY = y;
            for (const entry of preserveScrollSnap.elements) {
                if (entry.el === app || entry.el.classList.contains("pamphlet-app")) {
                    entry.top = 0;
                    entry.left = 0;
                }
                if (entry.el === document.documentElement || entry.el === document.body) {
                    entry.top = y;
                    entry.left = window.scrollX || 0;
                }
            }
        }
    }

    const on = <K extends keyof HTMLElementEventMap>(
        el: HTMLElement | Document | Window,
        type: K,
        listener: (ev: HTMLElementEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void => {
        const handler = listener as EventListener;
        el.addEventListener(type, handler, options);
        disposers.push(() => el.removeEventListener(type, handler, options));
    };

    const iconMap: Record<string, { icon: string; label: string }> = {
        ok: { icon: ICONS.check, label: "Aprobar y cerrar" },
        "move-up": { icon: ICONS.arrowUp, label: "Mover arriba" },
        "move-down": { icon: ICONS.arrowDown, label: "Mover abajo" },
        "add-above": { icon: ICONS.addRowAbove, label: "Añadir arriba" },
        "add-below": { icon: ICONS.addRowBelow, label: "Añadir abajo" },
        notes: { icon: ICONS.stickyNote, label: "Notas" },
        delete: { icon: ICONS.delete, label: "Borrar" },
    };
    for (const [action, meta] of Object.entries(iconMap)) {
        const btn = dockRoot.querySelector<HTMLButtonElement>(`[data-dock-action="${action}"]`);
        if (btn) setDockButtonIcon(btn, meta.icon, meta.label);
    }

    function isPersistent(): boolean {
        return persistentMq.matches;
    }

    function setIdle(idle: boolean): void {
        if (idle) dockRoot.setAttribute("data-dock-idle", "");
        else dockRoot.removeAttribute("data-dock-idle");
        if (idleHint) idleHint.hidden = !idle;
        for (const btn of dockRoot.querySelectorAll<HTMLButtonElement>("[data-dock-action]")) {
            btn.disabled = idle;
        }
    }

    function clearLiveTimer(): void {
        if (liveTimer != null) {
            clearTimeout(liveTimer);
            liveTimer = null;
        }
    }

    function syncPhoneDockPortal(): void {
        if (destroyed || !dockHomeParent) return;
        // Phone: html is the page scrollport, which breaks CSS position:fixed on
        // mobile (dock scrolls under the browser URL bar). Portal to body, lock
        // document scroll, pin to visualViewport.offsetTop (= visible top:0).
        const shouldPin =
            phoneMq.matches && !isPersistent() && session != null && !dockRoot.hidden;
        if (shouldPin) {
            document.body.classList.add(PHONE_DOCK_BODY_CLASS);
            document.documentElement.classList.add(PHONE_DOCK_BODY_CLASS);
            dockRoot.setAttribute("data-phone-pinned", "");
            if (dockRoot.parentElement !== document.body) {
                document.body.appendChild(dockRoot);
            }
            lockPhonePageScroll();
            syncPhoneDockViewportPin();
            host.requestLayoutSync();
            return;
        }
        document.body.classList.remove(PHONE_DOCK_BODY_CLASS);
        document.documentElement.classList.remove(PHONE_DOCK_BODY_CLASS);
        dockRoot.removeAttribute("data-phone-pinned");
        clearPhoneDockInlinePin();
        unlockPhonePageScroll();
        if (dockRoot.parentElement === document.body) {
            if (dockHomeNext && dockHomeNext.parentElement === dockHomeParent) {
                dockHomeParent.insertBefore(dockRoot, dockHomeNext);
            } else {
                dockHomeParent.insertBefore(dockRoot, dockHomeParent.firstChild);
            }
        }
        host.requestLayoutSync();
    }

    function showShell(): void {
        withPreservedEditorScroll(() => {
            dockRoot.hidden = false;
            syncPhoneDockPortal();
        });
    }

    function close(): void {
        withPreservedEditorScroll(() => {
            clearLiveTimer();
            setChromeStatus(false);
            session = null;
            textarea.hidden = true;
            textarea.value = "";
            imagePanel.hidden = true;
            fileInput.value = "";
            host.setSelected(null, null);
            host.highlightBodyItem(null);
            setIdle(true);
            if (isPersistent()) {
                dockRoot.hidden = false;
                syncPhoneDockPortal();
            } else {
                dockRoot.hidden = true;
                syncPhoneDockPortal();
            }
            log("close", { persistent: isPersistent() });
        });
    }

    function syncPersistentShell(): void {
        if (destroyed) return;
        if (session) {
            showShell();
            setIdle(false);
            return;
        }
        if (isPersistent()) {
            showShell();
            setIdle(true);
        } else {
            dockRoot.hidden = true;
            setIdle(true);
            syncPhoneDockPortal();
        }
    }

    function mutateDoc(mutator: (data: PamphletStructure, loc: FlatRef) => void): void {
        const current = host.getDoc();
        if (!current || !session) return;
        const next = clonePamphlet(current);
        mutator(next, session.loc);
        next.last_edited_element = { ...session.loc };
        const withId = host.ensureDocumentId(next);
        host.setDoc(withId);
        host.schedulePersist();
        host.schedulePreview();
        log("mutate", { column: session.loc.column, index: session.loc.index });
    }

    function setDockToolbarForChrome(chrome: boolean): void {
        for (const action of [
            "move-up",
            "move-down",
            "add-above",
            "add-below",
            "bold",
            "notes",
            "copy",
            "delete",
        ]) {
            const btn = dockRoot.querySelector<HTMLButtonElement>(`[data-dock-action="${action}"]`);
            if (!btn) continue;
            if (chrome && action !== "copy") {
                btn.hidden = true;
            } else if (chrome) {
                btn.hidden = false;
            }
        }
    }

    function applyLiveText(value: string): void {
        const current = host.getDoc();
        if (!current || !session || session.imageMode) return;
        if (session.chromeMode) {
            writeChromeContent(current, session.loc, value, session.kind);
            const withId = host.ensureDocumentId(current);
            host.setDoc(withId);
            host.syncLiveChromeContent(session.loc, value);
            // Spec 006: no live PDF regen; also defer persist until Approve so a
            // linked footer / cloud round-trip cannot wipe in-progress chrome.
            log("live-chrome", {
                column: session.loc.column,
                index: session.loc.index,
                chars: value.length,
            });
            return;
        }
        updateItemContent(current, session.loc, value);
        const withId = host.ensureDocumentId(current);
        host.setDoc(withId);
        host.syncLiveBodyContent(session.loc, value);
        host.highlightBodyItem(session.loc);
        host.schedulePersist();
        host.schedulePreview();
        log("live-text", {
            column: session.loc.column,
            index: session.loc.index,
            chars: value.length,
        });
    }

    function scheduleLiveText(value: string): void {
        clearLiveTimer();
        liveTimer = setTimeout(() => {
            liveTimer = null;
            if (destroyed || suppressInput) return;
            applyLiveText(value);
        }, LIVE_DEBOUNCE_MS);
    }

    function flushLiveText(): void {
        if (liveTimer == null) return;
        clearLiveTimer();
        if (!session || session.imageMode || suppressInput) return;
        applyLiveText(textarea.value);
    }

    function open(loc: LastEditedElement, kindHint = ""): void {
        withPreservedEditorScroll(() => {
            const current = host.getDoc();
            if (!current || !host.hasEditableSession()) {
                host.setError("No pamphlet file is open.");
                return;
            }

            if (isChromeColumn(loc.column) || chromeFieldFromKind(kindHint)) {
                flushLiveText();
                const field = chromeFieldAt(loc, kindHint);
                if (!field) {
                    host.setError("Campo de cabecera o pie no válido.");
                    return;
                }
                const resolved = locForChromeField(field, loc);
                const content = readChromeContent(current, resolved, kindHint || field);
                const max = chromeFieldMaxLength(field);
                session = {
                    loc: { column: resolved.column, index: resolved.index },
                    kind: kindHint || field,
                    imageMode: false,
                    chromeMode: true,
                    initialContent: content,
                    initialHeightMm: 0,
                    initialStyles: [
                        [0, 0],
                        [0, 0],
                        [0, 0],
                    ],
                };
                current.last_edited_element = {
                    column: resolved.column,
                    index: resolved.index,
                };
                host.setDoc(host.ensureDocumentId(current));
                host.setSelected(resolved.column, resolved.index);
                host.highlightBodyItem(null);

                showShell();
                setIdle(false);
                imagePanel.hidden = true;
                textarea.hidden = false;
                suppressInput = true;
                textarea.value = content;
                textarea.maxLength = max;
                const updateStatus = () => {
                    setChromeStatus(true, Math.max(0, max - textarea.value.length), max);
                };
                updateStatus();
                suppressInput = false;
                setDockToolbarForChrome(true);
                requestAnimationFrame(() => {
                    focusWithoutScroll(textarea);
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                });
                log("open.chrome", {
                    column: resolved.column,
                    index: resolved.index,
                    field,
                    kindHint: kindHint || null,
                });
                return;
            }

            if (loc.column < 1 || loc.column > 8) {
                host.setError("Campo de cabecera o pie no válido.");
                return;
            }

            flushLiveText();

            const item = getBodyItemFromDoc(current, loc);
            if (!item) {
                // Hit/DOM race after reflow — do not spam the global error modal.
                host.setError(
                    `No se encontró el elemento (columna ${loc.column}, índice ${loc.index}).`,
                );
                return;
            }

            const imageMode = item.type === "image";
            const styles = structuredClone(item.style_indexes) as StyleIndexes;
            session = {
                loc: { column: loc.column, index: loc.index },
                kind: kindHint || item.type,
                imageMode,
                chromeMode: false,
                initialContent: item.content,
                initialHeightMm: item.height_mm || DEFAULT_IMAGE_HEIGHT_MM,
                initialStyles: styles,
            };
            current.last_edited_element = { column: loc.column, index: loc.index };
            host.setDoc(host.ensureDocumentId(current));
            host.setSelected(loc.column, loc.index);
            host.highlightBodyItem(loc);

            showShell();
            setIdle(false);
            suppressInput = true;
            if (imageMode) {
                textarea.hidden = true;
                imagePanel.hidden = false;
            } else {
                imagePanel.hidden = true;
                textarea.hidden = false;
                textarea.value = item.content;
                requestAnimationFrame(() => {
                    focusWithoutScroll(textarea);
                    if (textarea.value === "Write here") textarea.select();
                });
            }
            suppressInput = false;

            setDockToolbarForChrome(false);
            for (const action of [
                "move-up",
                "move-down",
                "add-above",
                "add-below",
                "bold",
                "notes",
                "copy",
            ]) {
                const btn = dockRoot.querySelector<HTMLButtonElement>(
                    `[data-dock-action="${action}"]`,
                );
                if (!btn) continue;
                if (imageMode && (action === "bold" || action === "notes" || action === "copy")) {
                    btn.hidden = true;
                } else {
                    btn.hidden = false;
                }
            }

            log("open", {
                column: loc.column,
                index: loc.index,
                kind: session.kind,
                imageMode,
            });
        });
    }

    async function handleAction(action: string): Promise<void> {
        const current = host.getDoc();
        if (!current || !session) return;
        if (
            session.chromeMode &&
            action !== "ok" &&
            action !== "cancel" &&
            action !== "copy"
        ) {
            return;
        }
        const loc = session.loc;
        log("action", { action, column: loc.column, index: loc.index });

        flushLiveText();

        switch (action) {
            case "ok": {
                withPreservedEditorScroll(() => {
                    flushLiveText();
                    if (session?.chromeMode) {
                        const doc = host.getDoc();
                        if (doc) {
                            host.pushUndoSnapshot();
                            host.commitChromeOnly(clonePamphlet(doc));
                        }
                        close();
                        return;
                    }
                    close();
                    const doc = host.getDoc();
                    if (doc) host.applyLocalDoc(clonePamphlet(doc), { openEdit: false });
                });
                return;
            }
            case "cancel": {
                withPreservedEditorScroll(() => {
                    if (session?.chromeMode) {
                        const snap = session;
                        const current = host.getDoc();
                        if (current) {
                            writeChromeContent(
                                current,
                                snap.loc,
                                snap.initialContent,
                                snap.kind,
                            );
                            host.setDoc(host.ensureDocumentId(current));
                            host.syncLiveChromeContent(snap.loc, snap.initialContent);
                            host.schedulePreview();
                        }
                        close();
                        return;
                    }
                    // Discard all edits for this item session (not the activity-bar single-step undo).
                    const snap = session;
                    if (!snap) return;
                    mutateDoc((data, l) => {
                        updateItemContent(data, l, snap.initialContent);
                        if (snap.imageMode) {
                            updateItemHeightMm(data, l, snap.initialHeightMm);
                            updateItemStyleIndexes(data, l, snap.initialStyles);
                        }
                    });
                    close();
                });
                return;
            }
            case "move-up": {
                withPreservedEditorScroll(() => {
                    host.pushUndoSnapshot();
                    const base = clonePamphlet(current);
                    const nextLoc = moveItemUp(base, loc);
                    if (!nextLoc) return;
                    base.last_edited_element = nextLoc;
                    close();
                    host.commitDocument(base, true);
                });
                return;
            }
            case "move-down": {
                withPreservedEditorScroll(() => {
                    host.pushUndoSnapshot();
                    const base = clonePamphlet(current);
                    const nextLoc = moveItemDown(base, loc);
                    if (!nextLoc) return;
                    base.last_edited_element = nextLoc;
                    close();
                    host.commitDocument(base, true);
                });
                return;
            }
            case "add-above": {
                host.openItemTypeModal({
                    mode: "relative",
                    column: loc.column,
                    index: loc.index,
                    where: "above",
                });
                return;
            }
            case "add-below": {
                host.openItemTypeModal({
                    mode: "relative",
                    column: loc.column,
                    index: loc.index,
                    where: "below",
                });
                return;
            }
            case "bold": {
                if (session.imageMode) return;
                host.pushUndoSnapshot();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const base = clonePamphlet(host.getDoc() || current);
                applyBoldRange(base, loc, start, end);
                base.last_edited_element = loc;
                const item = getBodyItemFromDoc(base, loc);
                suppressInput = true;
                if (item) textarea.value = item.content;
                suppressInput = false;
                host.setDoc(host.ensureDocumentId(base));
                host.schedulePersist();
                host.schedulePreview();
                return;
            }
            case "copy": {
                if (textarea.hidden) return;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = end > start ? textarea.value.slice(start, end) : textarea.value;
                try {
                    await navigator.clipboard.writeText(text);
                    log("copy.ok", { chars: text.length });
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    openApiErrorModal("No se pudo copiar al portapapeles.", {
                        details: message,
                        debug: message,
                    });
                }
                return;
            }
            case "notes": {
                if (session.imageMode) return;
                applyLiveText(textarea.value);
                const container = host.findBodyItemContainer(loc);
                if (!container) {
                    openApiErrorModal("No se pudo abrir notas: falta el elemento en el DOM.", {
                        details: `column=${loc.column} index=${loc.index}`,
                    });
                    return;
                }
                await host.openNotesModal({
                    action: "notes",
                    container,
                    start: textarea.selectionStart,
                    end: textarea.selectionEnd,
                });
                return;
            }
            case "delete": {
                const confirmed = window.confirm("¿Seguro que quieres borrar este elemento?");
                if (!confirmed) return;
                host.pushUndoSnapshot();
                const base = clonePamphlet(host.getDoc() || current);
                const { focus } = deleteItem(base, loc);
                base.last_edited_element = focus;
                close();
                host.commitDocument(base, true);
                return;
            }
            case "img-taller": {
                mutateDoc((data, l) => {
                    const item = getBodyItemFromDoc(data, l);
                    if (!item || item.type !== "image") return;
                    updateItemHeightMm(
                        data,
                        l,
                        clampImageHeightMm(
                            (item.height_mm || DEFAULT_IMAGE_HEIGHT_MM) + IMAGE_HEIGHT_STEP_MM,
                            host.maxColumnHeightMm(l.column),
                        ),
                    );
                });
                return;
            }
            case "img-shorter": {
                mutateDoc((data, l) => {
                    const item = getBodyItemFromDoc(data, l);
                    if (!item || item.type !== "image") return;
                    updateItemHeightMm(
                        data,
                        l,
                        clampImageHeightMm(
                            Math.max(
                                MIN_IMAGE_HEIGHT_MM,
                                (item.height_mm || DEFAULT_IMAGE_HEIGHT_MM) - IMAGE_HEIGHT_STEP_MM,
                            ),
                            host.maxColumnHeightMm(l.column),
                        ),
                    );
                });
                return;
            }
            case "img-left":
            case "img-right":
            case "img-up":
            case "img-down":
            case "img-zoom-in":
            case "img-zoom-out": {
                mutateDoc((data, l) => {
                    const item = getBodyItemFromDoc(data, l);
                    if (!item || item.type !== "image") return;
                    let ox = imageOffsetXMmFromStyles(item.style_indexes);
                    let oy = imageOffsetYMmFromStyles(item.style_indexes);
                    let sc = imageScaleFromStyles(item.style_indexes);
                    if (action === "img-left") ox -= IMAGE_OFFSET_STEP_MM;
                    if (action === "img-right") ox += IMAGE_OFFSET_STEP_MM;
                    if (action === "img-up") oy -= IMAGE_OFFSET_STEP_MM;
                    if (action === "img-down") oy += IMAGE_OFFSET_STEP_MM;
                    if (action === "img-zoom-in") {
                        sc = Math.min(MAX_IMAGE_SCALE, sc + IMAGE_SCALE_STEP);
                    }
                    if (action === "img-zoom-out") {
                        sc = Math.max(MIN_IMAGE_SCALE, sc - IMAGE_SCALE_STEP);
                    }
                    updateItemStyleIndexes(
                        data,
                        l,
                        writeImageTransformToStyles(item.style_indexes, ox, oy, sc),
                    );
                });
                return;
            }
            default:
                return;
        }
    }

    on(dockRoot, "click", (event: MouseEvent) => {
        const target = event.target as Element | null;
        const btn = target?.closest<HTMLButtonElement>("[data-dock-action]");
        if (!btn || !dockRoot.contains(btn) || btn.disabled) return;
        const action = btn.dataset.dockAction;
        if (!action) return;
        event.preventDefault();
        void handleAction(action);
    });

    on(textarea, "input", () => {
        if (suppressInput || !session || session.imageMode) return;
        if (session.chromeMode) {
            const field = chromeFieldAt(session.loc, session.kind);
            if (field) {
                const max = chromeFieldMaxLength(field);
                setChromeStatus(true, Math.max(0, max - textarea.value.length), max);
            }
        }
        scheduleLiveText(textarea.value);
    });

    on(textarea, "keydown", (event: KeyboardEvent) => {
        if (!session) return;
        if (event.isComposing) return;
        if (event.key === "Escape") {
            event.preventDefault();
            void handleAction("cancel");
            return;
        }
        // Enter → same as OK / approve. Shift+Enter keeps a newline in the field.
        const isEnterOk =
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey;
        if (isEnterOk) {
            event.preventDefault();
            void handleAction("ok");
        }
    });

    on(fileInput, "change", () => {
        const file = fileInput.files?.[0];
        if (!file || !session?.imageMode || !host.getDoc()) return;
        log("image.file.selected", { name: file.name, size: file.size, type: file.type });
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            if (!dataUrl) return;
            void (async () => {
                let jpeg = dataUrl;
                try {
                    jpeg = await normalizeImageDataUrlToJpeg(dataUrl);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    openApiErrorModal("No se pudo normalizar la imagen a JPEG.", {
                        details: message,
                        debug: message,
                    });
                }
                mutateDoc((data, l) => {
                    updateItemContent(data, l, jpeg);
                    updateItemStyleIndexes(
                        data,
                        l,
                        writeImageTransformToStyles(
                            getBodyItemFromDoc(data, l)?.style_indexes ??
                                ([
                                    [0, 0],
                                    [0, 0],
                                    [100, 0],
                                ] as StyleIndexes),
                            0,
                            0,
                            DEFAULT_IMAGE_SCALE,
                        ),
                    );
                });
            })();
        };
        reader.onerror = () => {
            openApiErrorModal("No se pudo leer el archivo de imagen.", {
                details: reader.error?.message || "FileReader error",
            });
        };
        reader.readAsDataURL(file);
    });

    const onMqChange = () => {
        syncPersistentShell();
        syncPhoneDockPortal();
    };
    if (typeof persistentMq.addEventListener === "function") {
        persistentMq.addEventListener("change", onMqChange);
        disposers.push(() => persistentMq.removeEventListener("change", onMqChange));
    } else {
        persistentMq.addListener(onMqChange);
        disposers.push(() => persistentMq.removeListener(onMqChange));
    }
    if (typeof phoneMq.addEventListener === "function") {
        phoneMq.addEventListener("change", onMqChange);
        disposers.push(() => phoneMq.removeEventListener("change", onMqChange));
    } else {
        phoneMq.addListener(onMqChange);
        disposers.push(() => phoneMq.removeListener(onMqChange));
    }

    const onVvPin = () => syncPhoneDockViewportPin();
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", onVvPin);
        window.visualViewport.addEventListener("scroll", onVvPin);
        disposers.push(() => {
            window.visualViewport?.removeEventListener("resize", onVvPin);
            window.visualViewport?.removeEventListener("scroll", onVvPin);
        });
    }
    window.addEventListener("resize", onVvPin);
    disposers.push(() => window.removeEventListener("resize", onVvPin));

    syncPersistentShell();

    return {
        open,
        close,
        destroy() {
            destroyed = true;
            clearLiveTimer();
            session = null;
            dockRoot.hidden = true;
            syncPhoneDockPortal();
            for (const dispose of disposers) dispose();
            disposers.length = 0;
            log("destroy");
        },
        isOpen: () => session != null && !dockRoot.hidden,
        getSessionLoc: () => (session ? { ...session.loc } : null),
    };
}
