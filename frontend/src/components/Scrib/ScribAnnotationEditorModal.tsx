/**
 * Annotation ink editor — heading + body SVG canvases; stylus draw/erase
 * when parent mode is draw/erase (toolbar retargeted).
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

export default function ScribAnnotationEditorModal(
  props: ScribAnnotationEditorModalProps,
) {
  const headingSvgRef = useRef<SVGSVGElement>(null);
  const bodySvgRef = useRef<SVGSVGElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const fieldRef = useRef<ScribNoteInkField>("heading");
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [draftPath, setDraftPath] = useState("");
  const [headingH, setHeadingH] = useState(HEADING_H_DEFAULT);
  const [bodyH, setBodyH] = useState(BODY_H_DEFAULT);

  useEffect(() => {
    if (!props.open) return;
    const headingEl = headingSvgRef.current;
    const bodyEl = bodyScrollRef.current;
    const sync = () => {
      if (headingEl) {
        const w = headingEl.clientWidth;
        const h = headingEl.clientHeight;
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
  }, [props.open]);

  if (!props.open) return null;

  function fieldHeight(field: ScribNoteInkField): number {
    return field === "heading" ? headingH : bodyH;
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
    return {
      x: ((clientX - rect.left) / rect.width) * NOTE_W,
      y: ((clientY - rect.top) / rect.height) * fieldHeight(field),
    };
  }

  function onPointerDown(field: ScribNoteInkField, e: React.PointerEvent) {
    if (props.mode !== "draw" && props.mode !== "erase") return;
    if (e.pointerType !== "pen") return;
    props.onActiveField(field);
    fieldRef.current = field;
    const pt = mmFromClient(field, e.clientX, e.clientY);
    if (!pt) return;
    drawingRef.current = true;
    pointerIdRef.current = e.pointerId;
    pointsRef.current = [pt];
    setDraftPath("");
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) {
      return;
    }
    if (e.pointerType !== "pen") return;
    const field = fieldRef.current;
    const pt = mmFromClient(field, e.clientX, e.clientY);
    if (!pt) return;
    pointsRef.current.push(pt);
    if (props.mode === "draw") {
      setDraftPath(
        pointsRef.current
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
          .join(" "),
      );
    }
  }

  function onPointerUp() {
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
    if (props.mode === "erase") {
      next = erasePaths(current, pts, props.strokeWidthMm);
    } else {
      const d = pts
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
        .join(" ");
      next = [...current, { d, strokeWidth: props.strokeWidthMm }];
    }
    props.onCommitField(field, next, pathsBefore);
  }

  function centerActiveField() {
    const field = props.activeField;
    const current = field === "heading" ? props.headingPaths : props.bodyPaths;
    if (current.length === 0) return;
    const pathsBefore = current.map((p) => ({ ...p }));
    const next = centerInkPaths(current, NOTE_W, fieldHeight(field));
    props.onCommitField(field, next, pathsBefore);
  }

  function renderCanvas(
    field: ScribNoteInkField,
    paths: StrokePath[],
    svgRef: React.RefObject<SVGSVGElement | null>,
    label: string,
  ) {
    const active = props.activeField === field;
    const h = fieldHeight(field);
    const isBody = field === "body";
    return (
      <section
        className={
          active
            ? `scrib-annotation-editor__canvas scrib-annotation-editor__canvas--${field} is-active`
            : `scrib-annotation-editor__canvas scrib-annotation-editor__canvas--${field}`
        }
      >
        <header className="scrib-annotation-editor__canvas-head">
          <button
            type="button"
            className={
              active
                ? "scrib-tool-rail__btn icon-btn is-active"
                : "scrib-tool-rail__btn icon-btn"
            }
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => props.onActiveField(field)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {field === "heading" ? "title" : "notes"}
            </span>
          </button>
          {active ? (
            <button
              type="button"
              className="scrib-tool-rail__btn icon-btn"
              title="Centrar tinta en el lienzo"
              aria-label="Centrar tinta dibujada en el centro del lienzo"
              onClick={centerActiveField}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                filter_center_focus
              </span>
            </button>
          ) : null}
        </header>
        <div
          ref={isBody ? bodyScrollRef : undefined}
          className={
            isBody
              ? "scrib-annotation-editor__canvas-scroll scrib-annotation-editor__canvas-scroll--body"
              : "scrib-annotation-editor__canvas-scroll scrib-annotation-editor__canvas-scroll--heading"
          }
        >
          <svg
            ref={svgRef}
            className={
              isBody
                ? "scrib-annotation-editor__svg scrib-annotation-editor__svg--body"
                : "scrib-annotation-editor__svg scrib-annotation-editor__svg--heading"
            }
            viewBox={`0 0 ${NOTE_W} ${h}`}
            preserveAspectRatio="none"
            shapeRendering="geometricPrecision"
            onPointerDown={(e) => onPointerDown(field, e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <rect
              x={0}
              y={0}
              width={NOTE_W}
              height={h}
              fill="var(--color-surface)"
              stroke="var(--color-border)"
              strokeWidth={0.25}
            />
            {paths.map((path, i) => (
              <path
                key={`${field}-${i}`}
                d={path.d}
                fill="none"
                stroke="var(--scrib-ink, var(--color-text))"
                strokeWidth={path.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {active && draftPath && props.mode === "draw" ? (
              <path
                d={draftPath}
                fill="none"
                stroke="var(--scrib-ink, var(--color-text))"
                strokeWidth={props.strokeWidthMm}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            ) : null}
          </svg>
        </div>
      </section>
    );
  }

  return (
    <div
      className="scrib-annotation-editor"
      role="dialog"
      aria-modal="true"
      aria-label={`Editar anotación ${props.name}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div className="scrib-annotation-editor__panel">
        <header className="scrib-annotation-editor__head">
          <span
            className="scrib-annotation-editor__swatch"
            style={{ background: props.color }}
            aria-hidden
          />
          <h2 title={props.name}>{props.name}</h2>
          <p className="scrib-annotation-editor__hint">
            Usa Dibujar / Borrar de la barra sobre el título o el cuerpo (stylus).
          </p>
          <button
            type="button"
            className="scrib-tool-rail__btn icon-btn"
            title="Cerrar"
            aria-label="Cerrar editor de anotación"
            onClick={props.onClose}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </header>
        <div className="scrib-annotation-editor__body">
          {renderCanvas("heading", props.headingPaths, headingSvgRef, "Título")}
          {renderCanvas("body", props.bodyPaths, bodySvgRef, "Cuerpo")}
        </div>
      </div>
    </div>
  );
}
