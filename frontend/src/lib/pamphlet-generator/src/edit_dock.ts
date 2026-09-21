/**
 * PDF-first edit dock: live text edits + toolbar actions against FlatRef / pamphlet_doc.
 */
import { normalizeImageDataUrlToJpeg } from "./create_element";
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
    activateChromeEdit: (doc: PamphletStructure, loc: LastEditedElement) => void;
};

type EditDockSession = {
    loc: FlatRef;
    kind: string;
    imageMode: boolean;
    initialContent: string;
    initialHeightMm: number;
    initialStyles: StyleIndexes;
};

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
    const disposers: Array<() => void> = [];
    const persistentMq = window.matchMedia(DOCK_PERSISTENT_MQ);

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

    function showShell(): void {
        dockRoot.hidden = false;
    }

    function close(): void {
        clearLiveTimer();
        session = null;
        textarea.hidden = true;
        textarea.value = "";
        imagePanel.hidden = true;
        fileInput.value = "";
        host.setSelected(null, null);
        setIdle(true);
        if (isPersistent()) {
            showShell();
        } else {
            dockRoot.hidden = true;
        }
        log("close", { persistent: isPersistent() });
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

    function applyLiveText(value: string): void {
        const current = host.getDoc();
        if (!current || !session || session.imageMode) return;
        updateItemContent(current, session.loc, value);
        const withId = host.ensureDocumentId(current);
        host.setDoc(withId);
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
        const current = host.getDoc();
        if (!current || !host.hasEditableSession()) {
            host.setError("No pamphlet file is open.");
            return;
        }
        if (loc.column < 1 || loc.column > 8) {
            host.activateChromeEdit(current, loc);
            return;
        }

        flushLiveText();

        const item = getBodyItemFromDoc(current, loc);
        if (!item) {
            host.setError("No se encontró el elemento en el documento.");
            openApiErrorModal("No se encontró el elemento seleccionado en el panfleto.", {
                details: `column=${loc.column} index=${loc.index} kind=${kindHint || "(none)"}`,
            });
            return;
        }

        const imageMode = item.type === "image";
        const styles = structuredClone(item.style_indexes) as StyleIndexes;
        session = {
            loc: { column: loc.column, index: loc.index },
            kind: kindHint || item.type,
            imageMode,
            initialContent: item.content,
            initialHeightMm: item.height_mm || DEFAULT_IMAGE_HEIGHT_MM,
            initialStyles: styles,
        };
        current.last_edited_element = { column: loc.column, index: loc.index };
        host.setDoc(host.ensureDocumentId(current));
        host.setSelected(loc.column, loc.index);

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
                textarea.focus();
                if (textarea.value === "Write here") textarea.select();
            });
        }
        suppressInput = false;

        for (const action of [
            "move-up",
            "move-down",
            "add-above",
            "add-below",
            "bold",
            "notes",
            "copy",
        ]) {
            const btn = dockRoot.querySelector<HTMLButtonElement>(`[data-dock-action="${action}"]`);
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
    }

    async function handleAction(action: string): Promise<void> {
        const current = host.getDoc();
        if (!current || !session) return;
        const loc = session.loc;
        log("action", { action, column: loc.column, index: loc.index });

        flushLiveText();

        switch (action) {
            case "ok": {
                close();
                const doc = host.getDoc();
                if (doc) host.applyLocalDoc(clonePamphlet(doc), { openEdit: false });
                return;
            }
            case "cancel": {
                // Discard all edits for this item session (not the activity-bar single-step undo).
                const snap = session;
                mutateDoc((data, l) => {
                    updateItemContent(data, l, snap.initialContent);
                    if (snap.imageMode) {
                        updateItemHeightMm(data, l, snap.initialHeightMm);
                        updateItemStyleIndexes(data, l, snap.initialStyles);
                    }
                });
                close();
                return;
            }
            case "move-up": {
                host.pushUndoSnapshot();
                const base = clonePamphlet(current);
                const nextLoc = moveItemUp(base, loc);
                if (!nextLoc) return;
                base.last_edited_element = nextLoc;
                close();
                host.commitDocument(base, true);
                return;
            }
            case "move-down": {
                host.pushUndoSnapshot();
                const base = clonePamphlet(current);
                const nextLoc = moveItemDown(base, loc);
                if (!nextLoc) return;
                base.last_edited_element = nextLoc;
                close();
                host.commitDocument(base, true);
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
        scheduleLiveText(textarea.value);
    });

    on(textarea, "keydown", (event: KeyboardEvent) => {
        if (!session) return;
        if (event.isComposing) return;
        if (event.key === "Escape") {
            event.preventDefault();
            void handleAction("cancel");
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

    const onMqChange = () => syncPersistentShell();
    if (typeof persistentMq.addEventListener === "function") {
        persistentMq.addEventListener("change", onMqChange);
        disposers.push(() => persistentMq.removeEventListener("change", onMqChange));
    } else {
        persistentMq.addListener(onMqChange);
        disposers.push(() => persistentMq.removeListener(onMqChange));
    }

    syncPersistentShell();

    return {
        open,
        close,
        destroy() {
            destroyed = true;
            clearLiveTimer();
            for (const dispose of disposers) dispose();
            disposers.length = 0;
            session = null;
            dockRoot.hidden = true;
            log("destroy");
        },
        isOpen: () => session != null && !dockRoot.hidden,
        getSessionLoc: () => (session ? { ...session.loc } : null),
    };
}
