/**
 * Crisp vector ruled background for Scrib (replaces raster JPG).
 */

import { useMemo } from "react";
import { SCRIB_PAGE_HEIGHT_MM, SCRIB_PAGE_WIDTH_MM } from "../../lib/scrib";
import { buildScribSheetBackgroundGeometry } from "../../lib/scribSheetBackground";

export default function ScribSheetBackground() {
  const geometry = useMemo(() => buildScribSheetBackgroundGeometry(), []);

  return (
    <svg
      className="scrib-page__bg"
      viewBox={`0 0 ${geometry.pageWidthMm} ${geometry.pageHeightMm}`}
      width={`${SCRIB_PAGE_WIDTH_MM}mm`}
      height={`${SCRIB_PAGE_HEIGHT_MM}mm`}
      aria-hidden
    >
      {geometry.rects.map((r, i) => (
        <rect
          key={`r-${i}`}
          x={r.x}
          y={r.y}
          width={r.width}
          height={r.height}
          fill="none"
          stroke={r.stroke}
          strokeWidth={geometry.strokeWidthMm}
        />
      ))}
      {geometry.lines.map((l, i) => (
        <line
          key={`l-${i}`}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={l.stroke}
          strokeWidth={geometry.strokeWidthMm}
        />
      ))}
    </svg>
  );
}
