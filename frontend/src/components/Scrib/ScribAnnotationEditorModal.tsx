/**
 * Floating note editor — heading + body canvases with move / draw / erase /
 * undo / redo / draw-settings / zoom / pan / center. Esc closes; SE resizes.
 */

import { useEffect, useRef, useState } from "react";
import type { StrokePath } from "../../lib/scrib";
import {
  centerInkPaths,
  type ScribNoteInkField,
} from "../../lib/scribAnnotations";
import type { ScribToolMode } from "./ScribHeaderMenu";

const NOTE_W = 120;
const HEADING_H_DEFAULT = 30;
const BODY_H_DEFAULT = 120;
const STROKE_MIN = 0.1;
const STROKE_MAX = 2.5;
const STROKE_STEP = 0.05;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const PANEL_MIN_W = 16;
const PANEL_MIN_H = 18;

type NoteChromeMode = "draw" | "erase" | "move" | "zoom" | "pan";

type ScribAnnotationEditorModalProps = {
  open: boolean;
  name: string;
  color: string;
  mode: ScribToolMode;
  strokeWidthMm: number;
  headingPaths: StrokePath[];
  bodyPaths: StrokePath[];
  activeField: ScribNoteInkField;
  onActiveField: (field: ScribNoteInkField) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSelectDraw: () => void;
  onSelectErase: () => void;
  onStrokeWidth: (nextMm: number) => void;
  onCommitField: (
    field: ScribNoteInkField,
    paths: StrokePath[],
    pathsBefore: StrokePath[],
  ) => void;
  onClose: () => void;
};

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
  return Math.hypot(a.x - b.x, a.y - b.y);
}

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

function ToolBtn({
  name,
  title,
  active,
  disabled,
  onClick,
}: {
  name: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "scrib-note__tool icon-btn is-active"
          : "scrib-note__tool icon-btn"
      }
      title={title}
      aria-label={title}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {name}
      </span>
    </button>
  );
}

export default function ScribAnnotationEditorModal(
  props: ScribAnnotationEditorModalProps,
) {
  const headingSvgRef = useRef<SVGSVGElement>(null);
  const bodySvgRef = useRef<SVGSVGElement>(null);
  const headingScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const fieldRef = useRef<ScribNoteInkField>("heading");
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const chromeModeRef = useRef<NoteChromeMode>("draw");
  const viewZoomRef = useRef(1);
  const dragRef = useRef<{
    kind: "move" | "resize" | "pan" | "zoom";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origPanX: number;
    origPanY: number;
    origZoom: number;
  } | null>(null);

  const [draftPath, setDraftPath] = useState("");
  const [headingH, setHeadingH] = useState(HEADING_H_DEFAULT);
  const [bodyH, setBodyH] = useState(BODY_H_DEFAULT);
  const [chromeMode, setChromeMode] = useState<NoteChromeMode>("draw");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inkColor, setInkColor] = useState(props.color || "#e8e8e8");
  const [panel, setPanel] = useState({ x: 48, y: 48, w: 22, h: 28 });
  const [viewZoom, setViewZoom] = useState(1);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    chromeModeRef.current = chromeMode;
  }, [chromeMode]);
  useEffect(() => {
    viewZoomRef.current = viewZoom;
  }, [viewZoom]);

  useEffect(() => {
    if (!props.open) return;
    setChromeMode(props.mode === "erase" ? "erase" : "draw");
    setSettingsOpen(false);
    setViewZoom(1);
    setViewPan({ x: 0, y: 0 });
    setInkColor(props.color || "#e8e8e8");
    const vw = typeof window !== "undefined" ? window.innerWidth / 16 : 40;
    const vh = typeof window !== "undefined" ? window.innerHeight / 16 : 40;
    setPanel({
      x: Math.max(1, (vw - 22) / 2),
      y: Math.max(1, (vh - 28) / 2),
      w: 22,
      h: 28,
    });
  }, [props.open, props.color]);

  useEffect(() => {
    if (!props.open) return;
    if (props.mode === "erase") setChromeMode("erase");
    else if (props.mode === "draw") {
      setChromeMode((cur) =>
        cur === "move" || cur === "zoom" || cur === "pan" ? cur : "draw",
      );
    }
  }, [props.mode, props.open]);

  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);

  useEffect(() => {
    if (!props.open) return;
    const headingEl = headingScrollRef.current ?? headingSvgRef.current;
    const bodyEl = bodyScrollRef.current;
    const sync = () => {
      const hSvg = headingSvgRef.current;
      if (hSvg) {
        const w = hSvg.clientWidth;
        const h = hSvg.clientHeight;
        if (w > 0 && h > 0) setHeadingH((NOTE_W * h) / w);
      }
      if (bodyEl) {
        const w = bodyEl.clientWidth;
        const h = bodyEl.clientHeight;
        if (w > 0 && h > 0) setBodyH((NOTE_W * h) / w);
      }
    };
    sync();
    const ro = new ResizeObserver(sync);
    if (headingEl) ro.observe(headingEl);
    if (bodyEl) ro.observe(bodyEl);
    return () => ro.disconnect();
  }, [props.open, panel.w, panel.h]);

  /** Non-passive wheel so zoom mode can preventDefault and actually scale. */
  useEffect(() => {
    if (!props.open) return;
    const nodes = [headingScrollRef.current, bodyScrollRef.current].filter(
      (n): n is HTMLDivElement => Boolean(n),
    );
    const onWheel = (e: WheelEvent) => {
      if (chromeModeRef.current !== "zoom") return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * delta)));
    };
    for (const node of nodes) {
      node.addEventListener("wheel", onWheel, { passive: false });
    }
    return () => {
      for (const node of nodes) {
        node.removeEventListener("wheel", onWheel);
      }
    };
  }, [props.open, panel.w, panel.h]);

  if (!props.open) return null;

  function fieldHeight(field: ScribNoteInkField): number {
    return field === "heading" ? headingH : bodyH;
  }

  function inkMode(): "draw" | "erase" {
    if (chromeMode === "erase") return "erase";
    if (props.mode === "erase") return "erase";
    return "draw";
  }

  function mmFromClient(
    field: ScribNoteInkField,
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null {
    const el = field === "heading" ? headingSvgRef.current : bodySvgRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const localX = ((clientX - rect.left) / rect.width) * NOTE_W;
    const localY = ((clientY - rect.top) / rect.height) * fieldHeight(field);
    const cx = NOTE_W / 2;
    const cy = fieldHeight(field) / 2;
    return {
      x: (localX - cx - viewPan.x) / viewZoom + cx,
      y: (localY - cy - viewPan.y) / viewZoom + cy,
    };
  }

  function canDraw(): boolean {
    return chromeMode === "draw" || chromeMode === "erase";
  }

  function beginChromeDrag(
    kind: "move" | "pan" | "zoom",
    e: React.PointerEvent,
    captureEl: Element,
  ) {
    dragRef.current = {
      kind,
      startX: e.clientX,
      startY: e.clientY,
      origX: panel.x,
      origY: panel.y,
      origW: panel.w,
      origH: panel.h,
      origPanX: viewPan.x,
      origPanY: viewPan.y,
      origZoom: viewZoomRef.current,
    };
    pointerIdRef.current = e.pointerId;
    captureEl.setPointerCapture(e.pointerId);
  }

  function onCanvasPointerDown(field: ScribNoteInkField, e: React.PointerEvent) {
    props.onActiveField(field);
    fieldRef.current = field;

    if (chromeMode === "move") {
      beginChromeDrag("move", e, e.currentTarget as Element);
      return;
    }
    if (chromeMode === "pan") {
      beginChromeDrag("pan", e, e.currentTarget as Element);
      return;
    }
    if (chromeMode === "zoom") {
      beginChromeDrag("zoom", e, e.currentTarget as Element);
      return;
    }

    if (!canDraw()) return;
    if (e.pointerType !== "pen") return;
    const pt = mmFromClient(field, e.clientX, e.clientY);
    if (!pt) return;
    drawingRef.current = true;
    pointerIdRef.current = e.pointerId;
    pointsRef.current = [pt];
    setDraftPath("");
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (
      drag &&
      (drag.kind === "pan" || drag.kind === "move" || drag.kind === "zoom")
    ) {
      if (
        pointerIdRef.current !== null &&
        e.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      if (drag.kind === "pan") {
        setViewPan({
          x: drag.origPanX + (e.clientX - drag.startX) / 16,
          y: drag.origPanY + (e.clientY - drag.startY) / 16,
        });
        return;
      }
      if (drag.kind === "move") {
        setPanel((p) => ({
          ...p,
          x: Math.max(0, drag.origX + (e.clientX - drag.startX) / 16),
          y: Math.max(0, drag.origY + (e.clientY - drag.startY) / 16),
        }));
        return;
      }
      // Drag vertically to zoom (works without a wheel).
      const factor = Math.exp(-(e.clientY - drag.startY) / 180);
      setViewZoom(
        Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, drag.origZoom * factor)),
      );
      return;
    }

    if (!drawingRef.current) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) {
      return;
    }
    if (e.pointerType !== "pen") return;
    const field = fieldRef.current;
    const pt = mmFromClient(field, e.clientX, e.clientY);
    if (!pt) return;
    pointsRef.current.push(pt);
    if (inkMode() === "draw") {
      setDraftPath(
        pointsRef.current
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
          .join(" "),
      );
    }
  }

  function onCanvasPointerUp() {
    if (
      dragRef.current?.kind === "pan" ||
      dragRef.current?.kind === "move" ||
      dragRef.current?.kind === "zoom"
    ) {
      dragRef.current = null;
      pointerIdRef.current = null;
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    pointerIdRef.current = null;
    const pts = pointsRef.current;
    pointsRef.current = [];
    setDraftPath("");
    if (pts.length < 2) return;
    const field = fieldRef.current;
    const current =
      field === "heading" ? props.headingPaths : props.bodyPaths;
    const pathsBefore = current.map((p) => ({ ...p }));
    let next: StrokePath[];
    if (inkMode() === "erase") {
      next = erasePaths(current, pts, props.strokeWidthMm);
    } else {
      const d = pts
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
        .join(" ");
      next = [...current, { d, strokeWidth: props.strokeWidthMm }];
    }
    props.onCommitField(field, next, pathsBefore);
  }

  function onPanelChromeDown(e: React.PointerEvent) {
    if (chromeMode !== "move") return;
    if (
      (e.target as HTMLElement).closest(
        "button, input, label, .scrib-note__resize",
      )
    ) {
      return;
    }
    beginChromeDrag("move", e, e.currentTarget as Element);
  }

  function onPanelPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) {
      return;
    }
    const dx = (e.clientX - d.startX) / 16;
    const dy = (e.clientY - d.startY) / 16;
    if (d.kind === "move") {
      setPanel((p) => ({
        ...p,
        x: Math.max(0, d.origX + dx),
        y: Math.max(0, d.origY + dy),
      }));
      return;
    }
    if (d.kind === "resize") {
      setPanel((p) => ({
        ...p,
        w: Math.max(PANEL_MIN_W, d.origW + dx),
        h: Math.max(PANEL_MIN_H, d.origH + dy),
      }));
    }
  }

  function onPanelPointerUp() {
    if (dragRef.current?.kind === "move" || dragRef.current?.kind === "resize") {
      dragRef.current = null;
      pointerIdRef.current = null;
    }
  }

  function onResizeDown(e: React.PointerEvent) {
    e.stopPropagation();
    dragRef.current = {
      kind: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origX: panel.x,
      origY: panel.y,
      origW: panel.w,
      origH: panel.h,
      origPanX: viewPan.x,
      origPanY: viewPan.y,
      origZoom: viewZoom,
    };
    pointerIdRef.current = e.pointerId;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function centerActiveField() {
    const field = props.activeField;
    const current = field === "heading" ? props.headingPaths : props.bodyPaths;
    if (current.length === 0) return;
    const pathsBefore = current.map((p) => ({ ...p }));
    const next = centerInkPaths(current, NOTE_W, fieldHeight(field));
    props.onCommitField(field, next, pathsBefore);
    setViewZoom(1);
    setViewPan({ x: 0, y: 0 });
  }

  function bumpStroke(delta: number) {
    const next =
      delta > 0
        ? Math.min(STROKE_MAX, +(props.strokeWidthMm + STROKE_STEP).toFixed(2))
        : Math.max(STROKE_MIN, +(props.strokeWidthMm - STROKE_STEP).toFixed(2));
    props.onStrokeWidth(next);
  }

  function setDrawMode() {
    setSettingsOpen(false);
    setChromeMode("draw");
    props.onSelectDraw();
  }

  function setEraseMode() {
    setSettingsOpen(false);
    setChromeMode("erase");
    props.onSelectErase();
  }

  function toggleChrome(next: NoteChromeMode) {
    setSettingsOpen(false);
    setChromeMode((cur) => {
      if (cur === next) {
        props.onSelectDraw();
        return "draw";
      }
      return next;
    });
  }

  function renderCanvas(
    field: ScribNoteInkField,
    paths: StrokePath[],
    svgRef: React.RefObject<SVGSVGElement | null>,
  ) {
    const active = props.activeField === field;
    const h = fieldHeight(field);
    const isBody = field === "body";
    const cx = NOTE_W / 2;
    const cy = h / 2;
    const transform = `translate(${cx + viewPan.x} ${cy + viewPan.y}) scale(${viewZoom}) translate(${-cx} ${-cy})`;
    return (
      <section
        className={
          active
            ? `scrib-note__canvas scrib-note__canvas--${field} is-active`
            : `scrib-note__canvas scrib-note__canvas--${field}`
        }
        onPointerDown={() => props.onActiveField(field)}
      >
        <div
          ref={isBody ? bodyScrollRef : headingScrollRef}
          className={
            isBody
              ? "scrib-note__canvas-scroll scrib-note__canvas-scroll--body"
              : "scrib-note__canvas-scroll scrib-note__canvas-scroll--heading"
          }
        >
          <svg
            ref={svgRef}
            className={
              isBody
                ? "scrib-note__svg scrib-note__svg--body"
                : "scrib-note__svg scrib-note__svg--heading"
            }
            viewBox={`0 0 ${NOTE_W} ${h}`}
            preserveAspectRatio="none"
            shapeRendering="geometricPrecision"
            style={{
              cursor:
                chromeMode === "pan"
                  ? "grab"
                  : chromeMode === "zoom"
                    ? "ns-resize"
                    : chromeMode === "move"
                      ? "grab"
                      : chromeMode === "erase"
                        ? "cell"
                        : "crosshair",
            }}
            onPointerDown={(e) => onCanvasPointerDown(field, e)}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
          >
            <rect
              x={0}
              y={0}
              width={NOTE_W}
              height={h}
              fill="var(--color-bg)"
              stroke="var(--color-border)"
              strokeWidth={0.25}
            />
            <g transform={transform}>
              {paths.map((path, i) => (
                <path
                  key={`${field}-${i}`}
                  d={path.d}
                  fill="none"
                  stroke={inkColor}
                  strokeWidth={path.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {active && draftPath && inkMode() === "draw" ? (
                <path
                  d={draftPath}
                  fill="none"
                  stroke={inkColor}
                  strokeWidth={props.strokeWidthMm}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              ) : null}
            </g>
          </svg>
        </div>
      </section>
    );
  }

  return (
    <div className="scrib-note-layer" aria-hidden={false}>
      <div
        className={
          chromeMode === "move"
            ? "scrib-note scrib-note--move"
            : "scrib-note"
        }
        role="dialog"
        aria-modal="true"
        aria-label={props.name ? `Nota ${props.name}` : "Editor de nota"}
        style={{
          left: `${panel.x}rem`,
          top: `${panel.y}rem`,
          width: `${panel.w}rem`,
          height: `${panel.h}rem`,
        }}
        onPointerDown={onPanelChromeDown}
        onPointerMove={onPanelPointerMove}
        onPointerUp={onPanelPointerUp}
        onPointerCancel={onPanelPointerUp}
      >
        <button
          type="button"
          className="scrib-note__close"
          title="Cerrar"
          aria-label="Cerrar nota"
          onClick={props.onClose}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>

        <div className="scrib-note__toolbar" role="toolbar" aria-label="Nota">
          <ToolBtn
            name="open_with"
            title="Mover nota"
            active={chromeMode === "move"}
            onClick={() => toggleChrome("move")}
          />
          <ToolBtn
            name="draw"
            title="Dibujar"
            active={chromeMode === "draw"}
            onClick={setDrawMode}
          />
          <ToolBtn
            name="ink_eraser"
            title="Borrar"
            active={chromeMode === "erase"}
            onClick={setEraseMode}
          />
          <ToolBtn
            name="undo"
            title="Deshacer"
            disabled={!props.canUndo}
            onClick={props.onUndo}
          />
          <ToolBtn
            name="redo"
            title="Rehacer"
            disabled={!props.canRedo}
            onClick={props.onRedo}
          />
          <ToolBtn
            name="palette"
            title="Ajustes de trazo"
            active={settingsOpen}
            onClick={() => {
              setSettingsOpen((v) => !v);
              setChromeMode("draw");
              props.onSelectDraw();
            }}
          />
          <ToolBtn
            name="zoom_in"
            title="Modo zoom (rueda o arrastrar vertical)"
            active={chromeMode === "zoom"}
            onClick={() => toggleChrome("zoom")}
          />
          <ToolBtn
            name="pan_tool"
            title="Modo pan"
            active={chromeMode === "pan"}
            onClick={() => toggleChrome("pan")}
          />
          <ToolBtn
            name="filter_center_focus"
            title="Centrar en el lienzo"
            onClick={centerActiveField}
          />
        </div>

        {settingsOpen ? (
          <div className="scrib-note__settings" role="group" aria-label="Ajustes de trazo">
            <label className="scrib-note__settings-color" title="Color de tinta">
              <span className="page-title-sr">Color de tinta</span>
              <input
                type="color"
                value={inkColor}
                aria-label="Color de tinta"
                onChange={(e) => setInkColor(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="scrib-note__tool icon-btn"
              title="Más grueso"
              aria-label="Aumentar grosor de trazo"
              onClick={() => bumpStroke(1)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
            </button>
            <span className="scrib-note__settings-width" aria-live="polite">
              {props.strokeWidthMm.toFixed(2)}
            </span>
            <button
              type="button"
              className="scrib-note__tool icon-btn"
              title="Más fino"
              aria-label="Reducir grosor de trazo"
              onClick={() => bumpStroke(-1)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                remove
              </span>
            </button>
          </div>
        ) : null}

        <div className="scrib-note__body">
          {renderCanvas("heading", props.headingPaths, headingSvgRef)}
          {renderCanvas("body", props.bodyPaths, bodySvgRef)}
        </div>

        <div
          className="scrib-note__resize"
          title="Redimensionar"
          aria-label="Redimensionar nota"
          role="button"
          tabIndex={0}
          onPointerDown={onResizeDown}
          onPointerMove={onPanelPointerMove}
          onPointerUp={onPanelPointerUp}
          onPointerCancel={onPanelPointerUp}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            south_east
          </span>
        </div>
      </div>
    </div>
  );
}
