const RESIZABLE_COLS = ["bib", "ide", "len", "mat"] as const;
type ResizableCol = (typeof RESIZABLE_COLS)[number];

const STORAGE_KEY = "eoschool-curriculum-index-widths-v2";
const MIN_WIDTH_REM = 3.5;
const MAX_WIDTH_REM = 48;

function readRootRem(): number {
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(px) && px > 0 ? px : 16;
}

function columnCell(root: HTMLElement, col: ResizableCol): HTMLElement | null {
  const head = root.querySelector(".eoschool-curriculum__index-head");
  if (!head) return null;
  const handle = head.querySelector<HTMLElement>(`[data-resize-col="${col}"]`);
  return handle?.closest<HTMLElement>(".eoschool-curriculum__index-cell") ?? null;
}

function readColumnRem(root: HTMLElement, col: ResizableCol): number {
  const raw = getComputedStyle(root).getPropertyValue(`--idx-${col}`).trim();
  if (raw.endsWith("fr")) {
    const cell = columnCell(root, col);
    if (cell) return cell.getBoundingClientRect().width / readRootRem();
    return 8;
  }
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 8;
}

function readStorage(): Partial<Record<ResizableCol, number>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<ResizableCol, number>>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(root: HTMLElement): void {
  const payload: Partial<Record<ResizableCol, number>> = {};
  for (const col of RESIZABLE_COLS) {
    const raw = getComputedStyle(root).getPropertyValue(`--idx-${col}`).trim();
    if (raw.endsWith("rem")) {
      payload[col] = parseFloat(raw);
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

function applyStoredWidths(root: HTMLElement): void {
  const saved = readStorage();
  for (const col of RESIZABLE_COLS) {
    const rem = saved[col];
    if (typeof rem === "number" && rem >= MIN_WIDTH_REM) {
      root.style.setProperty(`--idx-${col}`, `${rem}rem`);
    }
  }
}

function startResize(ev: PointerEvent, root: HTMLElement, col: ResizableCol, handle: HTMLElement): void {
  ev.preventDefault();
  handle.setPointerCapture(ev.pointerId);

  const startX = ev.clientX;
  const startRem = readColumnRem(root, col);
  const rootRem = readRootRem();

  if (getComputedStyle(root).getPropertyValue(`--idx-${col}`).trim().endsWith("fr")) {
    root.style.setProperty(`--idx-${col}`, `${startRem}rem`);
  }

  const onMove = (moveEv: PointerEvent) => {
    const deltaRem = (moveEv.clientX - startX) / rootRem;
    const next = Math.min(MAX_WIDTH_REM, Math.max(MIN_WIDTH_REM, startRem + deltaRem));
    root.style.setProperty(`--idx-${col}`, `${next}rem`);
  };

  const onEnd = (endEv: PointerEvent) => {
    handle.releasePointerCapture(endEv.pointerId);
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onEnd);
    handle.removeEventListener("pointercancel", onEnd);
    writeStorage(root);
  };

  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onEnd);
  handle.addEventListener("pointercancel", onEnd);
}

export function initCurriculumIndexResize(root: HTMLElement | null): void {
  if (!root || root.dataset.resizeBound === "true") return;
  root.dataset.resizeBound = "true";
  applyStoredWidths(root);

  root.querySelectorAll<HTMLElement>("[data-resize-col]").forEach((handle) => {
    const col = handle.dataset.resizeCol as ResizableCol | undefined;
    if (!col || !RESIZABLE_COLS.includes(col)) return;
    handle.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      startResize(ev, root, col, handle);
    });
  });
}
