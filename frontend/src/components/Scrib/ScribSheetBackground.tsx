/**
 * Crisp vector ruled background for Scrib.
 * Display size follows zoom via width/height; viewBox stays in mm so lines stay sharp.
 */

import { useMemo } from "react";
import {
  normalizeScribBackgroundPattern,
  SCRIB_PAGE_HEIGHT_MM,
  SCRIB_PAGE_WIDTH_MM,
  type ScribBackgroundPattern,
} from "../../lib/scrib";
import {
  buildScribSheetBackgroundGeometry,
  SCRIB_SHEET_BG_DEFAULTS,
} from "../../lib/scribSheetBackground";

type Props = {
  /** Display zoom factor (1 = physical US Letter CSS mm size). */
  scale: number;
  /** Opacity from the background layer (ruled lines only). */
  opacity?: number;
  /** Ruled cycle: `ruled-4-3` or `ruled-4-3-3`. */
  pattern?: ScribBackgroundPattern;
};

function ruleStroke(hex: string): string {
  return hex === SCRIB_SHEET_BG_DEFAULTS.colorOscuro
    ? "var(--scrib-rule-strong)"
    : "var(--scrib-rule-soft)";
}

export default function ScribSheetBackground({
  scale,
  opacity = 1,
  pattern,
}: Props) {
  const resolvedPattern = normalizeScribBackgroundPattern(pattern);
  const geometry = useMemo(
    () => buildScribSheetBackgroundGeometry({ pattern: resolvedPattern }),
    [resolvedPattern],
  );
  const w = `${SCRIB_PAGE_WIDTH_MM * scale}mm`;
  const h = `${SCRIB_PAGE_HEIGHT_MM * scale}mm`;

  return (
    <svg
      className="scrib-page__bg"
      viewBox={`0 0 ${geometry.pageWidthMm} ${geometry.pageHeightMm}`}
      width={w}
      height={h}
      shapeRendering="geometricPrecision"
      style={{ opacity: Math.min(1, Math.max(0, opacity)) }}
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
          stroke={ruleStroke(r.stroke)}
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
          stroke={ruleStroke(l.stroke)}
          strokeWidth={geometry.strokeWidthMm}
        />
      ))}
    </svg>
  );
}
