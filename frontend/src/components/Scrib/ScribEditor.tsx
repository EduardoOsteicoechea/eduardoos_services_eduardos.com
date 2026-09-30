/**
 * Scrib sheet editor — portrait US Letter (215.9×279.4 mm) with vector ruled SVG
 * background and six SVG layers. Zoom is the safe default; stylus-only drawing and
 * erasing update one authoritative snapshot and save serially after each completed action.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_ROUTES } from "../../config/routes";
import { replaceClientUrl } from "../../lib/router";
import ServiceGate from "../ServiceGate/ServiceGate";
import { ViewLoading } from "../ViewLoading/ViewLoading";
import ScribAnnotationEditorModal from "./ScribAnnotationEditorModal";
import ScribAnnotationRects from "./ScribAnnotationRects";
import ScribAnnotationViews from "./ScribAnnotationViews";
import ScribAnnotationsTree from "./ScribAnnotationsTree";
import ScribBibleModal from "./ScribBibleModal";
import ScribHeaderMenu, { type ScribToolMode } from "./ScribHeaderMenu";
import ScribInstitutesModal from "./ScribInstitutesModal";
import ScribSheetBackground from "./ScribSheetBackground";
import ScribToolbar, { type ScribDockSide } from "./ScribToolbar";
import {
  fetchScribSheet,
  isScribDrawableLayer,
  normalizeScribBackgroundPattern,
  normalizeScribNoteBlocks,
  resolveScribSheetFromLocation,
  saveScribSheet,
  SCRIB_BACKGROUND_LAYER_ID,
  SCRIB_BACKGROUND_PATTERN_DEFAULT,
  SCRIB_DRAW_LAYER_IDS,
  SCRIB_LAYER_IDS,
  SCRIB_LAYER_LABELS,
  SCRIB_PAGE_HEIGHT_MM,
  SCRIB_PAGE_WIDTH_MM,
  toggleScribBackgroundPattern,
  type ScribLayer,
  type ScribLayerId,
  type ScribSheet,
  type StrokePath,
  scribSheetPrettyPath,
} from "../../lib/scrib";
import {
  appendRectToSelection,
  createNoteAnnotation,
  createNoteArea,
  createNoteBlock,
  findNoteAnnotation,
  hitTestNoteRect,
  listOpenAnnotationViews,
  mapAnnotationInk,
  popLastRectFromSelection,
  setAnnotationView,
  sheetNoteBlocks,
  updateNoteBlocks,
  type ScribAnnotateSelection,
  type ScribAnnotateSubtool,
  type ScribNoteInkField,
} from "../../lib/scribAnnotations";
import { downloadScribSheetPdf } from "../../lib/scribPrint";
import "./Scrib.css";

const STROKE_MIN = 0.1;
const STROKE_MAX = 2.5;
const STROKE_STEP = 0.05;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

type UndoEntry =
  | { kind: "layer"; layerId: string; pathsBefore: StrokePath[] }
  | {
      kind: "note";
      selection: ScribAnnotateSelection;
      field: ScribNoteInkField;
      pathsBefore: StrokePath[];
    };

function clonePaths(paths: StrokePath[]): StrokePath[] {
  return paths.map((p) => ({ ...p }));
}

function ensureLayers(sheet: ScribSheet): ScribSheet {
  const byId = new Map(sheet.layers.map((l) => [l.id, l]));
  const layers: ScribLayer[] = SCRIB_LAYER_IDS.map((id) => {
    const existing = byId.get(id);
    return {
      id,
      opacity: existing?.opacity ?? 1,
      // Background is ruled SVG only — never keep stroke paths on it.
      paths: id === SCRIB_BACKGROUND_LAYER_ID ? [] : (existing?.paths ?? []),
    };
  });
  let activeLayerId = sheet.activeLayerId;
  if (!isScribDrawableLayer(activeLayerId)) {
    activeLayerId = SCRIB_DRAW_LAYER_IDS[0] ?? "chapter";
  }
  return {
    ...sheet,
    layers,
    activeLayerId,
    backgroundPattern: normalizeScribBackgroundPattern(sheet.backgroundPattern),
    noteBlocks: normalizeScribNoteBlocks(sheet.noteBlocks),
  };
}

/** Sample points from an SVG path `d` built as M/L segments. */
function pathPoints(d: string): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const re = /[ML]\s*([-\d.]+)\s+([-\d.]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    pts.push({ x: Number(m[1]), y: Number(m[2]) });
  }
  return pts;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/** Remove strokes on the active layer that intersect the eraser polyline. */
function erasePaths(
  paths: StrokePath[],
  eraser: { x: number; y: number }[],
  radiusMm: number,
): StrokePath[] {
  if (eraser.length === 0) return paths;
  return paths.filter((path) => {
    const pts = pathPoints(path.d);
    if (pts.length === 0) return true;
    const hitR = radiusMm + path.strokeWidth * 0.5;
    for (const p of pts) {
      for (const e of eraser) {
        if (dist(p, e) <= hitR) return false;
      }
    }
    return true;
  });
}

export default function ScribEditor() {
  const [ids, setIds] = useState<{
    userSafe: string;
    bookId: string;
    sheetId: string;
  } | null>(null);
  const [sheet, setSheet] = useState<ScribSheet | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ScribToolMode>("zoom");
  const [layersOpen, setLayersOpen] = useState(false);
  const [institutesOpen, setInstitutesOpen] = useState(false);
  const [bibleOpen, setBibleOpen] = useState(false);
  const [annotateTreeOpen, setAnnotateTreeOpen] = useState(false);
  const [annotateSelection, setAnnotateSelection] =
    useState<ScribAnnotateSelection | null>(null);
  const [annotateSubtool, setAnnotateSubtool] =
    useState<ScribAnnotateSubtool>("select");
  const [annotationEditorOpen, setAnnotationEditorOpen] = useState(false);
  const [annotationInkField, setAnnotationInkField] =
    useState<ScribNoteInkField>("heading");
  const [draftRect, setDraftRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [dockSide, setDockSide] = useState<ScribDockSide>("left");
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const rectDragRef = useRef<{
    startX: number;
    startY: number;
  } | null>(null);
  const draftRectRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  /** Tracks mount of the viewport node (ServiceGate can delay children past sheet fetch). */
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [draftPath, setDraftPath] = useState("");
  const panDragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const sheetSnapshotRef = useRef<ScribSheet | null>(null);
  /** Newest sheet waiting to be written; superseded intermediates are dropped. */
  const pendingSaveRef = useRef<ScribSheet | null>(null);
  const savePumpRunningRef = useRef(false);
  const fittedSheetIdRef = useRef<string | null>(null);

  const setViewportNode = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    setViewportEl(node);
  }, []);

  /**
   * React state is asynchronous, but strokes may finish back-to-back. Keep this
   * reference current before scheduling React's render so the next stroke always
   * starts from the sheet that already includes the prior completed stroke.
   */
  const commitSheet = useCallback((next: ScribSheet) => {
    sheetSnapshotRef.current = next;
    setSheet(next);
  }, []);

  useEffect(() => {
    const resolved = resolveScribSheetFromLocation();
    setIds(resolved);
    if (resolved) {
      const pretty = scribSheetPrettyPath(
        resolved.userSafe,
        resolved.bookId,
        resolved.sheetId,
      );
      if (window.location.pathname !== pretty) {
        replaceClientUrl(pretty);
      }
    }
  }, []);

  useEffect(() => {
    if (!ids) {
      if (typeof window !== "undefined") {
        // Still resolving on first paint, or truly missing.
        const resolved = resolveScribSheetFromLocation();
        if (!resolved) {
          setError("Ruta de hoja inválida.");
          setLoading(false);
        }
      }
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await fetchScribSheet(ids.bookId, ids.sheetId);
      if (cancelled) return;
      if (res.error || !res.sheet) {
        setError(res.error ?? "Hoja no encontrada");
        setLoading(false);
        return;
      }
      commitSheet(ensureLayers(res.sheet));
      setError("");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids?.bookId, ids?.sheetId]);

  /** Fit sheet into viewport once both the sheet and the DOM node exist. */
  useEffect(() => {
    if (!sheet || !viewportEl) return;
    if (fittedSheetIdRef.current === sheet.id) return;
    if (viewportEl.clientWidth < 40 || viewportEl.clientHeight < 40) return;
    // CSS mm → px (1in = 96px). Zoom sizes the page in mm; do not use transform:scale
    // (that rasterizes SVG and makes ruled lines blurry).
    const mmToPx = 96 / 25.4;
    const pad = 16;
    const availW = Math.max(120, viewportEl.clientWidth - pad * 2);
    const availH = Math.max(120, viewportEl.clientHeight - pad * 2);
    const sx = availW / (SCRIB_PAGE_WIDTH_MM * mmToPx);
    const sy = availH / (SCRIB_PAGE_HEIGHT_MM * mmToPx);
    const next = Math.min(sx, sy, 1.5);
    fittedSheetIdRef.current = sheet.id;
    setScale(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)));
    setPan({ x: 0, y: 0 });
    // The user controls scale and pan after the initial fit. In particular,
    // fullscreen changes dispatch resize events; never use those to reset zoom.
  }, [sheet?.id, viewportEl]);

  /**
   * Sheet writes replace the complete document. Keep only the newest pending
   * snapshot so rapid strokes do not enqueue N serial PUTs (that backlog was
   * hitting the client timeout while the user kept writing). A slow response
   * never overwrites a newer local snapshot: server bodies are not copied into
   * React state.
   */
  const flushPendingSave = useCallback(async () => {
    if (savePumpRunningRef.current) return;
    savePumpRunningRef.current = true;
    setSaving(true);
    try {
      while (pendingSaveRef.current) {
        const toSave = pendingSaveRef.current;
        pendingSaveRef.current = null;
        const res = await saveScribSheet(toSave);
        if (res.error) setError(res.error);
        else setError("");
      }
    } finally {
      savePumpRunningRef.current = false;
      if (pendingSaveRef.current) {
        void flushPendingSave();
      } else {
        setSaving(false);
      }
    }
  }, []);

  const persist = useCallback(
    (next: ScribSheet) => {
      pendingSaveRef.current = next;
      void flushPendingSave();
    },
    [flushPendingSave],
  );

  function mmFromClient(clientX: number, clientY: number): { x: number; y: number } | null {
    const el = sheetRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((clientX - rect.left) / rect.width) * SCRIB_PAGE_WIDTH_MM;
    const y = ((clientY - rect.top) / rect.height) * SCRIB_PAGE_HEIGHT_MM;
    return { x, y };
  }

  function acceptsStylus(e: React.PointerEvent): boolean {
    // Drawing and erasing are deliberately stylus-only for palm rejection.
    return e.pointerType === "pen";
  }

  function onViewportPointerDown(e: React.PointerEvent) {
    if (!sheet || mode !== "zoom") return;
    panDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onViewportPointerMove(e: React.PointerEvent) {
    if (mode !== "zoom" || !panDragRef.current) return;
    const dx = e.clientX - panDragRef.current.x;
    const dy = e.clientY - panDragRef.current.y;
    setPan({
      x: panDragRef.current.panX + dx,
      y: panDragRef.current.panY + dy,
    });
  }

  function onViewportPointerUp() {
    if (mode === "zoom") panDragRef.current = null;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!sheet || mode === "zoom" || annotationEditorOpen) return;

    if (mode === "annotate") {
      const pt = mmFromClient(e.clientX, e.clientY);
      if (!pt) return;
      if (annotateSubtool === "select") {
        const hit = hitTestNoteRect(sheetNoteBlocks(sheet), pt);
        if (hit) setAnnotateSelection(hit);
        return;
      }
      if (annotateSubtool !== "rect" || !annotateSelection) return;
      rectDragRef.current = { startX: pt.x, startY: pt.y };
      const zero = { x: pt.x, y: pt.y, w: 0, h: 0 };
      draftRectRef.current = zero;
      setDraftRect(zero);
      activePointerIdRef.current = e.pointerId;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (mode !== "draw" && mode !== "erase") return;
    if (!acceptsStylus(e)) return;
    const pt = mmFromClient(e.clientX, e.clientY);
    if (!pt) return;
    drawingRef.current = true;
    activePointerIdRef.current = e.pointerId;
    pointsRef.current = [pt];
    setDraftPath("");
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (annotationEditorOpen) return;

    if (mode === "annotate" && rectDragRef.current) {
      if (
        activePointerIdRef.current !== null &&
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }
      const pt = mmFromClient(e.clientX, e.clientY);
      if (!pt) return;
      const nextDraft = {
        x: rectDragRef.current.startX,
        y: rectDragRef.current.startY,
        w: pt.x - rectDragRef.current.startX,
        h: pt.y - rectDragRef.current.startY,
      };
      draftRectRef.current = nextDraft;
      setDraftRect(nextDraft);
      return;
    }

    if (mode === "zoom" || !drawingRef.current) return;
    if (
      activePointerIdRef.current !== null &&
      e.pointerId !== activePointerIdRef.current
    ) {
      return;
    }
    if (e.pointerType !== "pen") return;
    const pt = mmFromClient(e.clientX, e.clientY);
    if (!pt) return;
    pointsRef.current.push(pt);
    if (mode === "draw") {
      setDraftPath(
        pointsRef.current
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
          .join(" "),
      );
    }
  }

  function finishRect() {
    const draft = draftRectRef.current;
    const sel = annotateSelection;
    rectDragRef.current = null;
    draftRectRef.current = null;
    setDraftRect(null);
    const current = sheetSnapshotRef.current;
    if (!current || !draft || !sel) return;
    const next = appendRectToSelection(current, sel, draft);
    if (next === current) return;
    const blocks = sheetNoteBlocks(next);
    const block = blocks.find((b) => b.id === sel.blockId);
    let rectIndex = 0;
    if (block) {
      if (sel.areaId) {
        const area = block.areas.find((a) => a.id === sel.areaId);
        rectIndex = Math.max(0, (area?.rects.length ?? 1) - 1);
      } else {
        rectIndex = Math.max(0, block.rects.length - 1);
      }
    }
    setAnnotateSelection({
      blockId: sel.blockId,
      areaId: sel.areaId,
      rectIndex,
    });
    commitSheet(next);
    persist(next);
  }

  async function finishStroke() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pts = pointsRef.current;
    pointsRef.current = [];
    setDraftPath("");
    if (mode !== "draw" && mode !== "erase") return;
    const current = sheetSnapshotRef.current;
    if (!current || pts.length < 2) return;

    const activeId = current.activeLayerId;
    let pathsBefore: StrokePath[] = [];
    const layers = current.layers.map((layer) => {
      if (layer.id !== activeId) return layer;
      pathsBefore = clonePaths(layer.paths);
      if (mode === "erase") {
        return {
          ...layer,
          paths: erasePaths(layer.paths, pts, current.strokeWidthMm),
        };
      }
      const d = pts
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
        .join(" ");
      return {
        ...layer,
        paths: [...layer.paths, { d, strokeWidth: current.strokeWidthMm }],
      };
    });
    setUndoStack((stack) => [
      ...stack,
      { kind: "layer", layerId: activeId, pathsBefore },
    ]);
    const next: ScribSheet = { ...current, layers };
    commitSheet(next);
    persist(next);
  }

  const modeRef = useRef(mode);
  const scaleRef = useRef(scale);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === document.documentElement;
      setIsFullscreen(active);
      if (!active) {
        document.documentElement.classList.remove("scrib-fullscreen--header-hidden");
        setIsHeaderVisible(true);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  /**
   * Native non-passive wheel/touch so preventDefault is allowed (React listeners are passive).
   * Bind to viewportEl (not sheet?.id) so listeners attach after ServiceGate mounts children.
   */
  useEffect(() => {
    if (!viewportEl) return;

    const onWheelNative = (e: WheelEvent) => {
      if (modeRef.current !== "zoom") return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((s) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s * delta)));
    };

    const onTouchStartNative = (e: TouchEvent) => {
      if (modeRef.current !== "zoom" || e.touches.length !== 2) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist: dist0, scale: scaleRef.current };
    };

    const onTouchMoveNative = (e: TouchEvent) => {
      if (modeRef.current !== "zoom" || !pinchRef.current || e.touches.length !== 2) {
        return;
      }
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist1 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist1 / Math.max(1, pinchRef.current.dist);
      setScale(
        Math.min(
          ZOOM_MAX,
          Math.max(ZOOM_MIN, pinchRef.current.scale * ratio),
        ),
      );
    };

    const onTouchEndNative = () => {
      pinchRef.current = null;
    };

    viewportEl.addEventListener("wheel", onWheelNative, { passive: false });
    viewportEl.addEventListener("touchstart", onTouchStartNative, { passive: true });
    viewportEl.addEventListener("touchmove", onTouchMoveNative, { passive: false });
    viewportEl.addEventListener("touchend", onTouchEndNative);
    viewportEl.addEventListener("touchcancel", onTouchEndNative);
    return () => {
      viewportEl.removeEventListener("wheel", onWheelNative);
      viewportEl.removeEventListener("touchstart", onTouchStartNative);
      viewportEl.removeEventListener("touchmove", onTouchMoveNative);
      viewportEl.removeEventListener("touchend", onTouchEndNative);
      viewportEl.removeEventListener("touchcancel", onTouchEndNative);
    };
  }, [viewportEl]);

  function onPointerUp(e: React.PointerEvent) {
    if (mode === "zoom") return;
    if (
      activePointerIdRef.current !== null &&
      e.pointerId !== activePointerIdRef.current
    ) {
      return;
    }
    activePointerIdRef.current = null;
    if (mode === "annotate" && rectDragRef.current) {
      finishRect();
      return;
    }
    void finishStroke();
  }

  async function onUndo() {
    const current = sheetSnapshotRef.current;
    if (!current || undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    if (entry.kind === "note") {
      const next = mapAnnotationInk(
        current,
        entry.selection,
        entry.field,
        () => clonePaths(entry.pathsBefore),
      );
      commitSheet(next);
      persist(next);
      return;
    }
    const next: ScribSheet = {
      ...current,
      layers: current.layers.map((l) =>
        l.id === entry.layerId ? { ...l, paths: clonePaths(entry.pathsBefore) } : l,
      ),
    };
    commitSheet(next);
    persist(next);
  }

  function leaveAnnotateMode(nextMode: ScribToolMode) {
    setAnnotationEditorOpen(false);
    setAnnotateTreeOpen(false);
    setDraftRect(null);
    draftRectRef.current = null;
    rectDragRef.current = null;
    setMode(nextMode);
  }

  function enterAnnotateMode() {
    setLayersOpen(false);
    setBibleOpen(false);
    setInstitutesOpen(false);
    setMode("annotate");
    setAnnotateTreeOpen(true);
  }

  function mutateNotes(
    updater: (current: ScribSheet) => ScribSheet,
  ) {
    const current = sheetSnapshotRef.current;
    if (!current) return;
    const next = updater(current);
    commitSheet(next);
    persist(next);
  }

  async function enterFullscreen() {
    if (!document.fullscreenEnabled) return;
    try {
      setIsHeaderVisible(true);
      document.documentElement.classList.remove("scrib-fullscreen--header-hidden");
      await document.documentElement.requestFullscreen();
    } catch {
      setError("No se pudo abrir la pantalla completa.");
    }
  }

  async function exitFullscreen() {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      setError("No se pudo cerrar la pantalla completa.");
    }
  }

  function toggleFullscreenHeader() {
    setIsHeaderVisible((visible) => {
      const nextVisible = !visible;
      document.documentElement.classList.toggle(
        "scrib-fullscreen--header-hidden",
        !nextVisible,
      );
      return nextVisible;
    });
  }

  const toggleDock = useCallback(() => {
    setDockSide((side) => (side === "left" ? "right" : "left"));
  }, []);

  const openDashboard = useCallback(() => {
    window.location.href = APP_ROUTES.scrib;
  }, []);

  const bumpStroke = useCallback((delta: number) => {
    const current = sheetSnapshotRef.current;
    if (!current) return;
    const next =
      delta > 0
        ? Math.min(STROKE_MAX, +(current.strokeWidthMm + STROKE_STEP).toFixed(2))
        : Math.max(STROKE_MIN, +(current.strokeWidthMm - STROKE_STEP).toFixed(2));
    commitSheet({ ...current, strokeWidthMm: next });
  }, [commitSheet]);

  const onToggleBackgroundPattern = useCallback(() => {
    const current = sheetSnapshotRef.current;
    if (!current) return;
    const next: ScribSheet = {
      ...current,
      backgroundPattern: toggleScribBackgroundPattern(
        normalizeScribBackgroundPattern(current.backgroundPattern),
      ),
    };
    commitSheet(next);
    persist(next);
  }, [commitSheet, persist]);

  const openLayers = useCallback(() => {
    setAnnotateTreeOpen(false);
    setBibleOpen(false);
    setInstitutesOpen(false);
    setLayersOpen(true);
  }, []);

  const toggleInstitutes = useCallback(() => {
    setLayersOpen(false);
    setBibleOpen(false);
    setAnnotateTreeOpen(false);
    setInstitutesOpen((v) => !v);
  }, []);

  const toggleBible = useCallback(() => {
    setLayersOpen(false);
    setInstitutesOpen(false);
    setAnnotateTreeOpen(false);
    setBibleOpen((v) => !v);
  }, []);

  const toggleAnnotateTree = useCallback(() => {
    setLayersOpen(false);
    setBibleOpen(false);
    setInstitutesOpen(false);
    setAnnotateTreeOpen((v) => !v);
  }, []);

  const printSheet = useCallback(() => {
    setLayersOpen(false);
    setDraftPath("");
    const el = sheetRef.current;
    const current = sheetSnapshotRef.current;
    if (!el || !current) {
      setError("Sheet not ready to print.");
      return;
    }
    void (async () => {
      try {
        setError("");
        setSaving(true);
        await downloadScribSheetPdf(el, current);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Print PDF failed");
      } finally {
        setSaving(false);
      }
    })();
  }, []);

  const noteBlocks = useMemo(
    () => (sheet ? sheetNoteBlocks(sheet) : []),
    [sheet],
  );
  const openViews = useMemo(
    () => listOpenAnnotationViews(noteBlocks),
    [noteBlocks],
  );
  const editorAnn = useMemo(() => {
    if (!annotationEditorOpen || !annotateSelection) return null;
    return findNoteAnnotation(noteBlocks, annotateSelection);
  }, [annotationEditorOpen, annotateSelection, noteBlocks]);

  const selectToolMode = useCallback(
    (next: ScribToolMode) => {
      if (next === "annotate") {
        enterAnnotateMode();
        return;
      }
      if (mode === "annotate" && !annotationEditorOpen) {
        leaveAnnotateMode(next);
        return;
      }
      setMode(next);
    },
    [mode, annotationEditorOpen],
  );

  if (!ids && error) {
    return (
      <ServiceGate serviceId="scrib" serviceLabel="Scrib" requireSubscription>
        <p className="scrib-dashboard__error">Ruta inválida. <a href={APP_ROUTES.scrib}>Volver</a></p>
      </ServiceGate>
    );
  }

  return (
    <ServiceGate serviceId="scrib" serviceLabel="Scrib" requireSubscription>
      {mode === "annotate" ? (
        <div className="scrib-annotate-frame" aria-hidden />
      ) : null}
      <ScribHeaderMenu
        mode={mode}
        strokeWidthMm={sheet?.strokeWidthMm ?? 0.35}
        canUndo={undoStack.length > 0}
        saving={saving}
        isFullscreen={isFullscreen}
        backgroundPattern={
          sheet
            ? normalizeScribBackgroundPattern(sheet.backgroundPattern)
            : SCRIB_BACKGROUND_PATTERN_DEFAULT
        }
        onDashboard={openDashboard}
        onSelectZoom={() => selectToolMode("zoom")}
        onSelectDraw={() => selectToolMode("draw")}
        onStrokePlus={() => bumpStroke(1)}
        onStrokeMinus={() => bumpStroke(-1)}
        onSelectErase={() => selectToolMode("erase")}
        onSelectAnnotate={() => selectToolMode("annotate")}
        onEnterFullscreen={() => void enterFullscreen()}
        onOpenLayers={openLayers}
        onToggleBackgroundPattern={onToggleBackgroundPattern}
        institutesOpen={institutesOpen}
        onOpenInstitutes={toggleInstitutes}
        bibleOpen={bibleOpen}
        onOpenBible={toggleBible}
        annotateTreeOpen={annotateTreeOpen}
        onToggleAnnotateTree={toggleAnnotateTree}
        dockSide={dockSide}
        onToggleDock={toggleDock}
        onPrint={printSheet}
        onUndo={() => void onUndo()}
      />

      {sheet ? (
        <ScribToolbar
          mode={mode}
          strokeWidthMm={sheet.strokeWidthMm}
          canUndo={undoStack.length > 0}
          saving={saving}
          isFullscreen={isFullscreen}
          backgroundPattern={normalizeScribBackgroundPattern(sheet.backgroundPattern)}
          institutesOpen={institutesOpen}
          bibleOpen={bibleOpen}
          annotateTreeOpen={annotateTreeOpen}
          dockSide={dockSide}
          onDashboard={openDashboard}
          onSelectZoom={() => selectToolMode("zoom")}
          onSelectDraw={() => selectToolMode("draw")}
          onStrokePlus={() => bumpStroke(1)}
          onStrokeMinus={() => bumpStroke(-1)}
          onSelectErase={() => selectToolMode("erase")}
          onSelectAnnotate={() => selectToolMode("annotate")}
          onEnterFullscreen={() => void enterFullscreen()}
          onOpenLayers={openLayers}
          onToggleBackgroundPattern={onToggleBackgroundPattern}
          onOpenInstitutes={toggleInstitutes}
          onOpenBible={toggleBible}
          onToggleAnnotateTree={toggleAnnotateTree}
          onPrint={printSheet}
          onUndo={() => void onUndo()}
          onToggleDock={toggleDock}
        />
      ) : null}

      {loading ? <ViewLoading label="Cargando hoja" /> : null}
      {error ? <p className="scrib-dashboard__error">{error}</p> : null}

      {sheet ? (
        <div
          ref={setViewportNode}
          className={`scrib-viewport${mode === "zoom" ? " scrib-viewport--zoom" : ""}`}
          onPointerDown={onViewportPointerDown}
          onPointerMove={onViewportPointerMove}
          onPointerUp={onViewportPointerUp}
          onPointerCancel={onViewportPointerUp}
        >
          <div
            className="scrib-stage"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
          >
            <div
              ref={sheetRef}
              className="scrib-page"
              style={{
                width: `${SCRIB_PAGE_WIDTH_MM * scale}mm`,
                height: `${SCRIB_PAGE_HEIGHT_MM * scale}mm`,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <ScribSheetBackground
                scale={scale}
                pattern={normalizeScribBackgroundPattern(sheet.backgroundPattern)}
                opacity={
                  sheet.layers.find((l) => l.id === SCRIB_BACKGROUND_LAYER_ID)?.opacity ?? 1
                }
              />
              {sheet.layers.filter((l) => isScribDrawableLayer(l.id)).map((layer, index) => (
                <svg
                  key={layer.id}
                  className="scrib-layer"
                  data-layer-id={layer.id}
                  viewBox={`0 0 ${SCRIB_PAGE_WIDTH_MM} ${SCRIB_PAGE_HEIGHT_MM}`}
                  width={`${SCRIB_PAGE_WIDTH_MM * scale}mm`}
                  height={`${SCRIB_PAGE_HEIGHT_MM * scale}mm`}
                  shapeRendering="geometricPrecision"
                  style={{
                    zIndex: index + 1,
                    opacity: layer.opacity,
                  }}
                  aria-hidden
                >
                  {layer.paths.map((path, i) => (
                    <path
                      key={`${layer.id}-${i}`}
                      d={path.d}
                      fill="none"
                      stroke="var(--scrib-ink)"
                      strokeWidth={path.strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {layer.id === sheet.activeLayerId &&
                  draftPath &&
                  mode === "draw" &&
                  !annotationEditorOpen ? (
                    <path
                      d={draftPath}
                      fill="none"
                      stroke="var(--scrib-ink)"
                      strokeWidth={sheet.strokeWidthMm}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.85}
                    />
                  ) : null}
                </svg>
              ))}
              {mode === "annotate" ? (
                <ScribAnnotationRects
                  blocks={noteBlocks}
                  selection={annotateSelection}
                  scale={scale}
                  draftRect={draftRect}
                />
              ) : null}
            </div>
          </div>
          <ScribAnnotationViews
            items={openViews}
            selectedAnnotationId={annotateSelection?.annotationId ?? null}
            onSelect={setAnnotateSelection}
            onMove={(sel, x, y) =>
              mutateNotes((cur) => setAnnotationView(cur, sel, { x, y }))
            }
            onResize={(sel, w, h) =>
              mutateNotes((cur) => setAnnotationView(cur, sel, { w, h }))
            }
            onClose={(sel) =>
              mutateNotes((cur) => setAnnotationView(cur, sel, { open: false }))
            }
          />
          {isFullscreen ? (
            <div className="scrib-fullscreen-controls">
              <button
                type="button"
                className="scrib-fullscreen-toggle-header"
                onClick={toggleFullscreenHeader}
                aria-label={isHeaderVisible ? "Ocultar barra lateral" : "Mostrar barra lateral"}
                title={isHeaderVisible ? "Ocultar barra lateral" : "Mostrar barra lateral"}
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M4 4h16v16H4zM9 4v16M13 8l3 4-3 4" />
                </svg>
              </button>
              <button
                type="button"
                className="scrib-fullscreen-close"
                onClick={() => void exitFullscreen()}
                aria-label="Cerrar pantalla completa"
                title="Cerrar pantalla completa"
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {layersOpen && sheet ? (
        <div
          className="scrib-layers-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Capas"
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) return;
            setLayersOpen(false);
            const latest = sheetSnapshotRef.current;
            if (latest) persist(latest);
          }}
        >
          <div className="scrib-layers-modal__panel">
            <header className="scrib-layers-modal__head">
              <h2>Capas</h2>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setLayersOpen(false);
                  const latest = sheetSnapshotRef.current;
                  if (latest) persist(latest);
                }}
              >
                Cerrar
              </button>
            </header>
            <ul className="scrib-layers-list">
              {sheet.layers.map((layer) => {
                const id = layer.id as ScribLayerId;
                const label = SCRIB_LAYER_LABELS[id] ?? layer.id;
                const drawable = isScribDrawableLayer(layer.id);
                return (
                  <li key={layer.id} className="scrib-layer-card">
                    {drawable ? (
                      <label className="scrib-layer-card__active">
                        <input
                          type="radio"
                          name="scrib-active-layer"
                          checked={sheet.activeLayerId === layer.id}
                          onChange={() => {
                            const current = sheetSnapshotRef.current;
                            if (current) commitSheet({ ...current, activeLayerId: layer.id });
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ) : (
                      <div className="scrib-layer-card__active">
                        <span>{label}</span>
                      </div>
                    )}
                    <label className="scrib-layer-card__opacity">
                      Opacidad
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={layer.opacity}
                        onChange={(e) => {
                          const opacity = Number(e.target.value);
                          const current = sheetSnapshotRef.current;
                          if (!current) return;
                          commitSheet({
                            ...current,
                            layers: current.layers.map((l) =>
                              l.id === layer.id ? { ...l, opacity } : l,
                            ),
                          });
                        }}
                      />
                      <span>{Math.round(layer.opacity * 100)}%</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <ScribAnnotationsTree
        open={annotateTreeOpen}
        dockSide={dockSide}
        blocks={noteBlocks}
        selection={annotateSelection}
        subtool={annotateSubtool}
        onSelectSubtool={setAnnotateSubtool}
        onSelect={setAnnotateSelection}
        onCreateBlock={() =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) => [...blocks, createNoteBlock()]),
          )
        }
        onCreateArea={(blockId) =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) =>
                b.id === blockId
                  ? { ...b, areas: [...b.areas, createNoteArea()] }
                  : b,
              ),
            ),
          )
        }
        onCreateAnnotation={(blockId, areaId) =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) =>
                b.id !== blockId
                  ? b
                  : {
                      ...b,
                      areas: b.areas.map((a) =>
                        a.id !== areaId
                          ? a
                          : {
                              ...a,
                              annotations: [...a.annotations, createNoteAnnotation()],
                            },
                      ),
                    },
              ),
            ),
          )
        }
        onRenameBlock={(blockId, name) =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) => (b.id === blockId ? { ...b, name } : b)),
            ),
          )
        }
        onRenameArea={(blockId, areaId, name) =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) =>
                b.id !== blockId
                  ? b
                  : {
                      ...b,
                      areas: b.areas.map((a) =>
                        a.id === areaId ? { ...a, name } : a,
                      ),
                    },
              ),
            ),
          )
        }
        onRenameAnnotation={(blockId, areaId, annotationId, name) =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) =>
                b.id !== blockId
                  ? b
                  : {
                      ...b,
                      areas: b.areas.map((a) =>
                        a.id !== areaId
                          ? a
                          : {
                              ...a,
                              annotations: a.annotations.map((n) =>
                                n.id === annotationId ? { ...n, name } : n,
                              ),
                            },
                      ),
                    },
              ),
            ),
          )
        }
        onSetBlockVisible={(blockId, visible) =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) => (b.id === blockId ? { ...b, visible } : b)),
            ),
          )
        }
        onSetBlockColor={(blockId, color) =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) => (b.id === blockId ? { ...b, color } : b)),
            ),
          )
        }
        onSetAreaVisible={(blockId, areaId, visible) =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) =>
                b.id !== blockId
                  ? b
                  : {
                      ...b,
                      areas: b.areas.map((a) =>
                        a.id === areaId ? { ...a, visible } : a,
                      ),
                    },
              ),
            ),
          )
        }
        onSetAreaColor={(blockId, areaId, color) =>
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) =>
                b.id !== blockId
                  ? b
                  : {
                      ...b,
                      areas: b.areas.map((a) =>
                        a.id === areaId ? { ...a, color } : a,
                      ),
                    },
              ),
            ),
          )
        }
        onOpenEditor={(sel) => {
          setAnnotateSelection(sel);
          setAnnotationEditorOpen(true);
          setMode("draw");
        }}
        onOpenView={(sel) => {
          setAnnotateSelection(sel);
          mutateNotes((cur) => setAnnotationView(cur, sel, { open: true }));
        }}
        onDeleteBlock={(blockId) => {
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) => blocks.filter((b) => b.id !== blockId)),
          );
          if (annotateSelection?.blockId === blockId) {
            setAnnotateSelection(null);
            setAnnotationEditorOpen(false);
          }
        }}
        onDeleteArea={(blockId, areaId) => {
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) =>
                b.id !== blockId
                  ? b
                  : { ...b, areas: b.areas.filter((a) => a.id !== areaId) },
              ),
            ),
          );
          if (
            annotateSelection?.blockId === blockId &&
            annotateSelection.areaId === areaId
          ) {
            setAnnotateSelection({ blockId });
            setAnnotationEditorOpen(false);
          }
        }}
        onDeleteAnnotation={(blockId, areaId, annotationId) => {
          mutateNotes((cur) =>
            updateNoteBlocks(cur, (blocks) =>
              blocks.map((b) =>
                b.id !== blockId
                  ? b
                  : {
                      ...b,
                      areas: b.areas.map((a) =>
                        a.id !== areaId
                          ? a
                          : {
                              ...a,
                              annotations: a.annotations.filter(
                                (n) => n.id !== annotationId,
                              ),
                            },
                      ),
                    },
              ),
            ),
          );
          if (annotateSelection?.annotationId === annotationId) {
            setAnnotateSelection({ blockId, areaId });
            setAnnotationEditorOpen(false);
          }
        }}
        onPopLastRect={() => {
          if (!annotateSelection) return;
          mutateNotes((cur) => popLastRectFromSelection(cur, annotateSelection));
        }}
      />

      <ScribAnnotationEditorModal
        open={Boolean(editorAnn && annotateSelection)}
        name={editorAnn?.annotation.name ?? ""}
        mode={mode}
        strokeWidthMm={sheet?.strokeWidthMm ?? 0.35}
        headingPaths={editorAnn?.annotation.heading.paths ?? []}
        bodyPaths={editorAnn?.annotation.body.paths ?? []}
        activeField={annotationInkField}
        onActiveField={setAnnotationInkField}
        onCommitField={(field, paths, pathsBefore) => {
          if (!annotateSelection) return;
          setUndoStack((stack) => [
            ...stack,
            { kind: "note", selection: annotateSelection, field, pathsBefore },
          ]);
          mutateNotes((cur) =>
            mapAnnotationInk(cur, annotateSelection, field, () => paths),
          );
        }}
        onClose={() => {
          setAnnotationEditorOpen(false);
          if (mode === "draw" || mode === "erase") {
            setMode("annotate");
          }
        }}
      />

      <ScribInstitutesModal open={institutesOpen} dockSide={dockSide} />
      <ScribBibleModal open={bibleOpen} dockSide={dockSide} />
    </ServiceGate>
  );
}
