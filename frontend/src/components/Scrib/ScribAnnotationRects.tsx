/**
 * Drawn note rectangles over the Scrib page — only mounted in annotate mode.
 */

import {
  SCRIB_PAGE_HEIGHT_MM,
  SCRIB_PAGE_WIDTH_MM,
} from "../../lib/scrib";
import {
  isRegionSelected,
  type ScribAnnotateSelection,
  type ScribNoteRegion,
} from "../../lib/scribAnnotations";
import type { ScribRectMm } from "../../lib/scrib";

type ScribAnnotationRectsProps = {
  regions: ScribNoteRegion[];
  selection: ScribAnnotateSelection | null;
  scale: number;
  draftRect: { x: number; y: number; w: number; h: number } | null;
  draftColor: string;
  /** Larger corner handles when editing rect geometry. */
  editHandles?: boolean;
};

function SelectionChrome({
  r,
  editHandles,
}: {
  r: ScribRectMm;
  editHandles?: boolean;
}) {
  const handle = editHandles ? 2.2 : 0.8;
  const half = handle / 2;
  const corners = [
    { x: r.x - half, y: r.y - half },
    { x: r.x + r.w - half, y: r.y - half },
    { x: r.x - half, y: r.y + r.h - half },
    { x: r.x + r.w - half, y: r.y + r.h - half },
  ];
  return (
    <g className="scrib-annotation-rects__selection">
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        fill="none"
        stroke="#ff8800"
        strokeWidth={editHandles ? 0.2 : 0.1}
      />
      {corners.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={handle}
          height={handle}
          fill="#ff8800"
          stroke="var(--color-bg)"
          strokeWidth={editHandles ? 0.15 : 0}
        />
      ))}
    </g>
  );
}

export default function ScribAnnotationRects({
  regions,
  selection,
  scale,
  draftRect,
  draftColor,
  editHandles,
}: ScribAnnotationRectsProps) {
  return (
    <svg
      className="scrib-annotation-rects"
      viewBox={`0 0 ${SCRIB_PAGE_WIDTH_MM} ${SCRIB_PAGE_HEIGHT_MM}`}
      width={`${SCRIB_PAGE_WIDTH_MM * scale}mm`}
      height={`${SCRIB_PAGE_HEIGHT_MM * scale}mm`}
      aria-hidden
    >
      {regions.map((region) => {
        const selected = isRegionSelected(selection, region);
        const r = region.rect;
        return (
          <g
            key={`${region.blockId}-${region.areaId}-${region.annotationId}`}
          >
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill={region.color}
              fillOpacity={selected ? 0.28 : 0.14}
              stroke={region.color}
              strokeWidth={0.1}
              strokeOpacity={selected ? 1 : 0.55}
            />
            {selected ? (
              <SelectionChrome r={r} editHandles={editHandles} />
            ) : null}
          </g>
        );
      })}
      {draftRect ? (
        <rect
          x={Math.min(draftRect.x, draftRect.x + draftRect.w)}
          y={Math.min(draftRect.y, draftRect.y + draftRect.h)}
          width={Math.abs(draftRect.w)}
          height={Math.abs(draftRect.h)}
          fill={draftColor}
          fillOpacity={0.18}
          stroke={draftColor}
          strokeWidth={0.1}
          strokeDasharray="2 1.5"
        />
      ) : null}
    </svg>
  );
}
