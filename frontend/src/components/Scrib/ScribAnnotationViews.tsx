/**
 * Floating preach view windows — drag header, resize SE handle, scroll ink.
 */

import { useRef } from "react";
import type { ScribNoteAnnotation } from "../../lib/scrib";
import type { ScribAnnotateSelection } from "../../lib/scribAnnotations";

const NOTE_W_MM = 120;
const NOTE_H_MM = 80;

type OpenView = {
  selection: ScribAnnotateSelection;
  annotation: ScribNoteAnnotation;
  blockName: string;
  areaName: string;
  color: string;
};

type ScribAnnotationViewsProps = {
  items: OpenView[];
  selectedAnnotationId: string | null;
  onSelect: (sel: ScribAnnotateSelection) => void;
  onMove: (sel: ScribAnnotateSelection, x: number, y: number) => void;
  onResize: (sel: ScribAnnotateSelection, w: number, h: number) => void;
  onClose: (sel: ScribAnnotateSelection) => void;
};

function InkPreview({
  heading,
  body,
}: {
  heading: ScribNoteAnnotation["heading"];
  body: ScribNoteAnnotation["body"];
}) {
  return (
    <div className="scrib-annotation-view__ink">
      <svg
        className="scrib-annotation-view__svg"
        viewBox={`0 0 ${NOTE_W_MM} ${NOTE_H_MM}`}
        aria-hidden
      >
        {heading.paths.map((p, i) => (
          <path
            key={`h-${i}`}
            d={p.d}
            fill="none"
            stroke="var(--scrib-ink, var(--color-text))"
            strokeWidth={p.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <svg
        className="scrib-annotation-view__svg"
        viewBox={`0 0 ${NOTE_W_MM} ${NOTE_H_MM}`}
        aria-hidden
      >
        {body.paths.map((p, i) => (
          <path
            key={`b-${i}`}
            d={p.d}
            fill="none"
            stroke="var(--scrib-ink, var(--color-text))"
            strokeWidth={p.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}

export default function ScribAnnotationViews({
  items,
  selectedAnnotationId,
  onSelect,
  onMove,
  onResize,
  onClose,
}: ScribAnnotationViewsProps) {
  const dragRef = useRef<{
    sel: ScribAnnotateSelection;
    kind: "move" | "resize";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  if (items.length === 0) return null;

  function onHeaderDown(item: OpenView, e: React.PointerEvent) {
    e.stopPropagation();
    onSelect(item.selection);
    dragRef.current = {
      sel: item.selection,
      kind: "move",
      startX: e.clientX,
      startY: e.clientY,
      origX: item.annotation.view.x,
      origY: item.annotation.view.y,
      origW: item.annotation.view.w,
      origH: item.annotation.view.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onResizeDown(item: OpenView, e: React.PointerEvent) {
    e.stopPropagation();
    onSelect(item.selection);
    dragRef.current = {
      sel: item.selection,
      kind: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origX: item.annotation.view.x,
      origY: item.annotation.view.y,
      origW: item.annotation.view.w,
      origH: item.annotation.view.h,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.kind === "move") {
      onMove(d.sel, Math.max(0, d.origX + dx), Math.max(0, d.origY + dy));
    } else {
      onResize(
        d.sel,
        Math.max(160, d.origW + dx),
        Math.max(120, d.origH + dy),
      );
    }
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div className="scrib-annotation-views" aria-label="Notas abiertas">
      {items.map((item) => {
        const { view } = item.annotation;
        const selected = selectedAnnotationId === item.annotation.id;
        return (
          <div
            key={item.annotation.id}
            className={
              selected
                ? "scrib-annotation-view is-selected"
                : "scrib-annotation-view"
            }
            style={{
              left: `${view.x / 16}rem`,
              top: `${view.y / 16}rem`,
              width: `${view.w / 16}rem`,
              height: `${view.h / 16}rem`,
              borderColor: item.color,
            }}
            onPointerDown={() => onSelect(item.selection)}
          >
            <header
              className="scrib-annotation-view__head"
              onPointerDown={(e) => onHeaderDown(item, e)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <span className="scrib-annotation-view__title">
                {item.annotation.name}
                <span className="scrib-annotation-view__meta">
                  {" "}
                  · {item.blockName}/{item.areaName}
                </span>
              </span>
              <button
                type="button"
                className="scrib-annotation-view__close icon-btn"
                title="Cerrar vista"
                aria-label="Cerrar vista de anotación"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onClose(item.selection)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </header>
            <div className="scrib-annotation-view__scroll">
              <InkPreview
                heading={item.annotation.heading}
                body={item.annotation.body}
              />
            </div>
            <div
              className="scrib-annotation-view__resize"
              title="Redimensionar"
              aria-hidden
              onPointerDown={(e) => onResizeDown(item, e)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
        );
      })}
    </div>
  );
}
