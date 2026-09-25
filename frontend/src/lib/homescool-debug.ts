/**
 * Homescool expert debug log — ring buffer + on-page panel.
 * Always records; panel stays hidden until the DHS ? toggle shows it.
 */

export type HomescoolDebugLevel = "debug" | "info" | "warn" | "error";

export type HomescoolDebugEntry = {
  id: number;
  at: string;
  level: HomescoolDebugLevel;
  scope: string;
  step: string;
  detail: Record<string, unknown>;
};

const MAX_ENTRIES = 800;
const entries: HomescoolDebugEntry[] = [];
const listeners = new Set<() => void>();
let seq = 0;
let panelEl: HTMLElement | null = null;
let listEl: HTMLElement | null = null;
let filterText = "";

function notify(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  }
  renderPanelList();
}

export function homescoolDebugEntries(): readonly HomescoolDebugEntry[] {
  return entries;
}

export function onHomescoolDebug(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function homescoolDebugClear(): void {
  entries.length = 0;
  notify();
}

function sanitizeDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail)) {
    const key = k.toLowerCase();
    if (
      key.includes("password") ||
      key.includes("token") ||
      key.includes("cookie") ||
      key.includes("authorization") ||
      key.includes("csrf") ||
      key.includes("api_key") ||
      key.includes("apikey")
    ) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && v.length > 400) {
      out[k] = `${v.slice(0, 400)}…(+${v.length - 400})`;
      continue;
    }
    if (Array.isArray(v) && v.length > 40) {
      out[k] = [...v.slice(0, 40), `…(+${v.length - 40})`];
      continue;
    }
    out[k] = v;
  }
  return out;
}

export function hcLog(
  scope: string,
  step: string,
  detail: Record<string, unknown> = {},
  level: HomescoolDebugLevel = "info",
): void {
  const entry: HomescoolDebugEntry = {
    id: ++seq,
    at: new Date().toISOString(),
    level,
    scope,
    step,
    detail: sanitizeDetail(detail),
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);

  const line = `[hc-debug][${scope}] ${step}`;
  if (level === "error") console.error(line, entry.detail);
  else if (level === "warn") console.warn(line, entry.detail);
  else console.log(line, entry.detail);

  notify();
}

function matchesFilter(entry: HomescoolDebugEntry): boolean {
  if (!filterText) return true;
  const q = filterText.toLowerCase();
  const hay = `${entry.scope} ${entry.step} ${JSON.stringify(entry.detail)}`.toLowerCase();
  return hay.includes(q);
}

function renderPanelList(): void {
  if (!listEl) return;
  const frag = document.createDocumentFragment();
  const shown = entries.filter(matchesFilter).slice(-200);
  for (const e of shown) {
    const row = document.createElement("div");
    row.className = `homescool-debug__row homescool-debug__row--${e.level}`;
    const head = document.createElement("div");
    head.className = "homescool-debug__row-head";
    head.textContent = `${e.at.slice(11, 23)} · ${e.scope} · ${e.step}`;
    const body = document.createElement("pre");
    body.className = "homescool-debug__row-body";
    body.textContent = Object.keys(e.detail).length ? JSON.stringify(e.detail, null, 0) : "";
    row.append(head, body);
    frag.append(row);
  }
  listEl.replaceChildren(frag);
  listEl.scrollTop = listEl.scrollHeight;
}

export function isHomescoolDebugPanelVisible(): boolean {
  return Boolean(panelEl?.isConnected && !panelEl.hidden);
}

export function setHomescoolDebugPanelVisible(visible: boolean): void {
  if (!panelEl) return;
  panelEl.hidden = !visible;
}

/** Mount (or remount) the expert debug panel into the Homescool workspace. Starts hidden. */
export function mountHomescoolDebugPanel(host: HTMLElement): void {
  if (panelEl?.isConnected) {
    setHomescoolDebugPanelVisible(false);
    return;
  }

  const panel = document.createElement("aside");
  panel.className = "homescool-debug";
  panel.setAttribute("data-homescool-debug", "");
  panel.setAttribute("aria-label", "Homescool expert debug log");
  panel.hidden = true;

  const toolbar = document.createElement("header");
  toolbar.className = "homescool-debug__toolbar";

  const title = document.createElement("strong");
  title.className = "homescool-debug__title";
  title.textContent = "HC debug";

  const filter = document.createElement("input");
  filter.type = "search";
  filter.className = "homescool-debug__filter";
  filter.placeholder = "filtrar…";
  filter.setAttribute("aria-label", "Filtrar log Homescool");
  filter.addEventListener("input", () => {
    filterText = filter.value.trim();
    renderPanelList();
  });

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "homescool-debug__btn";
  clearBtn.textContent = "Clear";
  clearBtn.addEventListener("click", () => homescoolDebugClear());

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "homescool-debug__btn";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", async () => {
    const text = entries
      .map((e) => `${e.at}\t${e.level}\t${e.scope}\t${e.step}\t${JSON.stringify(e.detail)}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      hcLog("debug-panel", "copy.ok", { lines: entries.length });
    } catch (err) {
      hcLog("debug-panel", "copy.fail", { err: String(err) }, "error");
    }
  });

  const hideBtn = document.createElement("button");
  hideBtn.type = "button";
  hideBtn.className = "homescool-debug__btn";
  hideBtn.textContent = "Hide";
  hideBtn.addEventListener("click", () => {
    setHomescoolDebugPanelVisible(false);
    for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-homescool-debug-toggle]")) {
      btn.setAttribute("aria-pressed", "false");
      btn.title = "Mostrar HC debug";
      btn.setAttribute("aria-label", btn.title);
    }
  });

  toolbar.append(title, filter, clearBtn, copyBtn, hideBtn);

  const list = document.createElement("div");
  list.className = "homescool-debug__list";
  list.setAttribute("data-homescool-debug-list", "");

  panel.append(toolbar, list);
  host.append(panel);
  panelEl = panel;
  listEl = list;
  renderPanelList();
  hcLog("debug-panel", "mounted", { max: MAX_ENTRIES, visible: false });
}
