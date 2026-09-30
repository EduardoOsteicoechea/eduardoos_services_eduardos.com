/**
 * Annotation ink editor — heading + body SVG canvases; stylus draw/erase
 * when parent mode is draw/erase (toolbar retargeted).
 */

import { useRef, useState } from "react";
import type { StrokePath } from "../../lib/scrib";
import type { ScribNoteInkField } from "../../lib/scribAnnotations";
import type { ScribToolMode } from "./ScribHeaderMenu";

const NOTE_W_MM = 120;
const NOTE_H_MM = 80;

type ScribAnnotationEditorModalProps = {
  open: boolean;
  name: string;
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
  const drawingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const fieldRef = useRef<ScribNoteInkField>("heading");
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [draftPath, setDraftPath] = useState("");

  if (!props.open) return null;

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
      x: ((clientX - rect.left) / rect.width) * NOTE_W_MM,
      y: ((clientY - rect.top) / rect.height) * NOTE_H_MM,
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

  function renderCanvas(
    field: ScribNoteInkField,
    paths: StrokePath[],
    svgRef: React.RefObject<SVGSVGElement | null>,
    label: string,
  ) {
    const active = props.activeField === field;
    return (
      <section
        className={
          active
            ? "scrib-annotation-editor__canvas is-active"
            : "scrib-annotation-editor__canvas"
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
        </header>
        <div className="scrib-annotation-editor__canvas-scroll">
          <svg
            ref={svgRef}
            className="scrib-annotation-editor__svg"
            viewBox={`0 0 ${NOTE_W_MM} ${NOTE_H_MM}`}
            width={`${NOTE_W_MM}mm`}
            height={`${NOTE_H_MM}mm`}
            shapeRendering="geometricPrecision"
            onPointerDown={(e) => onPointerDown(field, e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <rect
              x={0}
              y={0}
              width={NOTE_W_MM}
              height={NOTE_H_MM}
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
