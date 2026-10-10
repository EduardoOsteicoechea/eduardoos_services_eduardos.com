/** Shared horizontal resize for Scrib docked ref panels (Bible / Institutes). */

export const SCRIB_BIBLE_PANEL_WIDTH_KEY = "eduardoos-scrib-bible-panel-width";
export const SCRIB_INSTITUTES_PANEL_WIDTH_KEY =
  "eduardoos-scrib-institutes-panel-width";

export const SCRIB_REF_PANEL_WIDTH_DEFAULT_REM = 18.25; /* ~sidebar + 6.25rem */
export const SCRIB_REF_PANEL_WIDTH_MIN_REM = 12;
export const SCRIB_REF_PANEL_WIDTH_MAX_REM = 32;

export function readRootRem(): number {
  const raw = getComputedStyle(document.documentElement).fontSize;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 16;
}

export function clampRefPanelWidthRem(value: number): number {
  return Math.min(
    SCRIB_REF_PANEL_WIDTH_MAX_REM,
    Math.max(SCRIB_REF_PANEL_WIDTH_MIN_REM, value),
  );
}

export function readStoredRefPanelWidthRem(
  key: string,
  fallback = SCRIB_REF_PANEL_WIDTH_DEFAULT_REM,
): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return clampRefPanelWidthRem(parsed);
  } catch {
    return fallback;
  }
}

export function writeStoredRefPanelWidthRem(key: string, rem: number): void {
  try {
    localStorage.setItem(key, String(clampRefPanelWidthRem(rem)));
  } catch {
    /* private mode */
  }
}

export type ScribDockSide = "left" | "right";

/**
 * Pointer-drag horizontal resize. For dock-left, drag right widens;
 * for dock-right, drag left widens.
 */
export function startRefPanelResize(opts: {
  pointerId: number;
  startClientX: number;
  startWidthRem: number;
  dockSide: ScribDockSide;
  storageKey: string;
  onWidth: (rem: number) => void;
  captureTarget?: Element | null;
}): () => void {
  const {
    pointerId,
    startClientX,
    startWidthRem,
    dockSide,
    storageKey,
    onWidth,
    captureTarget,
  } = opts;
  const rootRem = readRootRem();
  const sign = dockSide === "right" ? -1 : 1;

  if (captureTarget) {
    try {
      captureTarget.setPointerCapture(pointerId);
    } catch {
      /* optional */
    }
  }

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    const deltaRem = (sign * (ev.clientX - startClientX)) / rootRem;
    onWidth(clampRefPanelWidthRem(startWidthRem + deltaRem));
  };

  const onEnd = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    if (captureTarget) {
      try {
        if (
          "hasPointerCapture" in captureTarget &&
          (captureTarget as Element).hasPointerCapture(pointerId)
        ) {
          (captureTarget as Element).releasePointerCapture(pointerId);
        }
      } catch {
        /* ignore */
      }
    }
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onEnd);
    const deltaRem = (sign * (ev.clientX - startClientX)) / rootRem;
    const next = clampRefPanelWidthRem(startWidthRem + deltaRem);
    onWidth(next);
    writeStoredRefPanelWidthRem(storageKey, next);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onEnd);
  window.addEventListener("pointercancel", onEnd);

  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onEnd);
    window.removeEventListener("pointercancel", onEnd);
  };
}
