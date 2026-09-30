/**
 * Drawn-area rectangles over the Scrib page — only mounted in annotate mode.
 */

import {
  SCRIB_PAGE_HEIGHT_MM,
  SCRIB_PAGE_WIDTH_MM,
  type ScribNoteBlock,
} from "../../lib/scrib";
import type { ScribAnnotateSelection } from "../../lib/scribAnnotations";

type ScribAnnotationRectsProps = {
  blocks: ScribNoteBlock[];
  selection: ScribAnnotateSelection | null;
  scale: number;
  draftRect: { x: number; y: number; w: number; h: number } | null;
};

function isHighlighted(
  selection: ScribAnnotateSelection | null,
  blockId: string,
  areaId?: string,
): "strong" | "soft" | "none" {
  if (!selection || selection.blockId !== blockId) return "none";
  if (!selection.areaId) {
    return areaId ? "soft" : "strong";
  }
  if (areaId && selection.areaId === areaId) return "strong";
  if (!areaId) return "soft";
  return "none";
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
        const blockHl = isHighlighted(selection, block.id);
        return (
          <g key={block.id}>
            {block.rects.map((r, i) => (
              <rect
                key={`b-${block.id}-${i}`}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={block.color}
                fillOpacity={blockHl === "strong" ? 0.28 : 0.12}
                stroke={block.color}
                strokeWidth={blockHl === "strong" ? 0.7 : 0.35}
                strokeOpacity={blockHl === "none" ? 0.55 : 1}
              />
            ))}
            {block.areas.map((area) => {
              if (!area.visible) return null;
              const areaHl = isHighlighted(selection, block.id, area.id);
              return (
                <g key={area.id}>
                  {area.rects.map((r, i) => (
                    <rect
                      key={`a-${area.id}-${i}`}
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      fill={area.color}
                      fillOpacity={areaHl === "strong" ? 0.32 : 0.14}
                      stroke={area.color}
                      strokeWidth={areaHl === "strong" ? 0.7 : 0.35}
                      strokeOpacity={areaHl === "none" ? 0.55 : 1}
                    />
                  ))}
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
          strokeWidth={0.5}
          strokeDasharray="2 1.5"
        />
      ) : null}
    </svg>
  );
}
