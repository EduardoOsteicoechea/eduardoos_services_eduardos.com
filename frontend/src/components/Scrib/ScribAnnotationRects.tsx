/**
 * Drawn-area rectangles over the Scrib page — only mounted in annotate mode.
 */

import {
  SCRIB_PAGE_HEIGHT_MM,
  SCRIB_PAGE_WIDTH_MM,
  type ScribNoteBlock,
  type ScribRectMm,
} from "../../lib/scrib";
import {
  isRectSelected,
  type ScribAnnotateSelection,
} from "../../lib/scribAnnotations";

type ScribAnnotationRectsProps = {
  blocks: ScribNoteBlock[];
  selection: ScribAnnotateSelection | null;
  scale: number;
  draftRect: { x: number; y: number; w: number; h: number } | null;
};

function isGroupHighlighted(
  selection: ScribAnnotateSelection | null,
  blockId: string,
  areaId?: string,
): "strong" | "soft" | "none" {
  if (!selection || selection.blockId !== blockId) return "none";
  if (typeof selection.rectIndex === "number") {
    // Specific rect selected — group glow stays soft for siblings.
    if (areaId) {
      return selection.areaId === areaId ? "soft" : "none";
    }
    return !selection.areaId ? "soft" : "none";
  }
  if (!selection.areaId) {
    return areaId ? "soft" : "strong";
  }
  if (areaId && selection.areaId === areaId) return "strong";
  if (!areaId) return "soft";
  return "none";
}

function SelectionChrome({ r }: { r: ScribRectMm }) {
  const handle = 0.8;
  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.w - handle, y: r.y },
    { x: r.x, y: r.y + r.h - handle },
    { x: r.x + r.w - handle, y: r.y + r.h - handle },
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
        strokeWidth={0.1}
      />
      {corners.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={handle}
          height={handle}
          fill="#ff8800"
          stroke="none"
        />
      ))}
    </g>
  );
}

export default function ScribAnnotationRects({
  blocks,
  selection,
  scale,
  draftRect,
}: ScribAnnotationRectsProps) {
  return (
    <svg
      className="scrib-annotation-rects"
      viewBox={`0 0 ${SCRIB_PAGE_WIDTH_MM} ${SCRIB_PAGE_HEIGHT_MM}`}
      width={`${SCRIB_PAGE_WIDTH_MM * scale}mm`}
      height={`${SCRIB_PAGE_HEIGHT_MM * scale}mm`}
      aria-hidden
    >
      {blocks.map((block) => {
        if (!block.visible) return null;
        const blockHl = isGroupHighlighted(selection, block.id);
        return (
          <g key={block.id}>
            {block.rects.map((r, i) => {
              const selected = isRectSelected(selection, block.id, undefined, i);
              return (
                <g key={`b-${block.id}-${i}`}>
                  <rect
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    fill={block.color}
                    fillOpacity={
                      selected ? 0.22 : blockHl === "strong" ? 0.28 : 0.12
                    }
                    stroke={block.color}
                    strokeWidth={0.1}
                    strokeOpacity={blockHl === "none" && !selected ? 0.55 : 1}
                  />
                  {selected ? <SelectionChrome r={r} /> : null}
                </g>
              );
            })}
            {block.areas.map((area) => {
              if (!area.visible) return null;
              const areaHl = isGroupHighlighted(selection, block.id, area.id);
              return (
                <g key={area.id}>
                  {area.rects.map((r, i) => {
                    const selected = isRectSelected(
                      selection,
                      block.id,
                      area.id,
                      i,
                    );
                    return (
                      <g key={`a-${area.id}-${i}`}>
                        <rect
                          x={r.x}
                          y={r.y}
                          width={r.w}
                          height={r.h}
                          fill={area.color}
                          fillOpacity={
                            selected ? 0.24 : areaHl === "strong" ? 0.32 : 0.14
                          }
                          stroke={area.color}
                          strokeWidth={0.1}
                          strokeOpacity={
                            areaHl === "none" && !selected ? 0.55 : 1
                          }
                        />
                        {selected ? <SelectionChrome r={r} /> : null}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        );
      })}
      {draftRect ? (
        <rect
          x={Math.min(draftRect.x, draftRect.x + draftRect.w)}
          y={Math.min(draftRect.y, draftRect.y + draftRect.h)}
          width={Math.abs(draftRect.w)}
          height={Math.abs(draftRect.h)}
          fill="none"
          stroke="#ff8800"
          strokeWidth={0.1}
          strokeDasharray="2 1.5"
        />
      ) : null}
    </svg>
  );
}
