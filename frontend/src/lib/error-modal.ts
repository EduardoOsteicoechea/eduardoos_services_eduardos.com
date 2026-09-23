import { mustLog } from "./dev-log";

export type ErrorModalCopy = {
  title: string;
  close: string;
  copyMessage: string;
  copyDetails: string;
  copyDebug: string;
  downloadEpam: string;
  loadEreport: string;
  copied: string;
};

const en: ErrorModalCopy = {
  title: "Something went wrong",
  close: "Close",
  copyMessage: "Copy message",
  copyDetails: "Copy details",
  copyDebug: "Copy debug",
  downloadEpam: "Download .epam",
  loadEreport: "Load .ereport",
  copied: "Copied",
};

const es: ErrorModalCopy = {
  title: "Algo salió mal",
  close: "Cerrar",
  copyMessage: "Copiar mensaje",
  copyDetails: "Copiar detalles",
  copyDebug: "Copiar depuración",
  downloadEpam: "Descargar .epam",
  loadEreport: "Cargar .ereport",
  copied: "Copiado",
};

export function errorModalCopy(): ErrorModalCopy {
  return document.documentElement.lang.startsWith("es") ? es : en;
}

export type ErrorPayload = {
  message: string;
  requestId?: string;
  details?: string;
  debug?: string;
};

/** Custom event the eReport workspace listens for to open a local .ereport. */
export const EREPORT_OPEN_LOCAL_EVENT = "ereport:open-local-file";

let lastPayload: ErrorPayload | null = null;

function textOf(el: Element | null): HTMLElement | null {
  return el instanceof HTMLElement ? el : null;
}

/** Pamphlet / EPAM editor routes (not the public articles reader). */
export function isEpamWorkspacePath(pathname = window.location.pathname): boolean {
  return pathname.replace(/\/$/, "").startsWith("/documents/pamphlet");
}

/** eReport workspace editor (not the hub). */
export function isEreportWorkspacePath(pathname = window.location.pathname): boolean {
  const path = pathname.replace(/\/$/, "");
  const page = document.documentElement.dataset.page || "";
  return page === "ereport-workspace" || path === "/ereport/workspace" || path.startsWith("/ereport/workspace/");
}

function syncProductActions(modal: HTMLElement, copy: ErrorModalCopy): void {
  const downloadEpam = textOf(modal.querySelector("[data-error-download-epam]"));
  const loadEreport = textOf(modal.querySelector("[data-error-load-ereport]"));
  const showEpam = isEpamWorkspacePath();
  const showEreport = isEreportWorkspacePath();
  if (downloadEpam) {
    downloadEpam.hidden = !showEpam;
    downloadEpam.textContent = copy.downloadEpam;
  }
  if (loadEreport) {
    loadEreport.hidden = !showEreport;
    loadEreport.textContent = copy.loadEreport;
  }
}

export function closeErrorModal(): void {
  const modal = document.getElementById("error-modal");
  if (!(modal instanceof HTMLElement)) {
    return;
  }
  modal.hidden = true;
  if ("inert" in modal) {
    modal.inert = true;
  }
}

function trapFocus(event: KeyboardEvent, modal: HTMLElement): void {
  if (event.key !== "Tab") {
    return;
  }
  const focusable = [...modal.querySelectorAll<HTMLElement>("button:not([hidden])")].filter((node) => !node.hidden);
  if (focusable.length === 0) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function downloadErrorEpam(payload: ErrorPayload): void {
  const body = {
    kind: "error-snapshot",
    createdAt: new Date().toISOString(),
    message: payload.message,
    requestId: payload.requestId || "",
    details: payload.details || (payload.requestId ? `request_id=${payload.requestId}` : ""),
    debug: payload.debug || "",
  };
  const blob = new Blob([`${JSON.stringify(body, null, 2)}\n`], { type: "application/x-epam" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = payload.requestId || String(Date.now());
  link.href = url;
  link.download = `error-${stamp}.epam`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Global error toast (Layout `#error-modal`). Same API for every site. */
export function showErrorModal(payload: ErrorPayload): void {
  lastPayload = payload;
  if (mustLog) {
    console.log("[error-toast]", {
      message: payload.message,
      requestId: payload.requestId,
      details: payload.details,
      hasDebug: Boolean(payload.debug),
    });
  }
  const modal = document.getElementById("error-modal");
  if (!(modal instanceof HTMLElement)) {
    if (mustLog) {
      console.log("[error-toast] #error-modal missing from Layout");
    }
    return;
  }
  const copy = errorModalCopy();
  const title = textOf(modal.querySelector("#error-modal-title"));
  if (title) {
    title.textContent = copy.title;
  }
  const message = textOf(modal.querySelector("[data-error-message]"));
  const details = textOf(modal.querySelector("[data-error-details]"));
  const debugBox = textOf(modal.querySelector("[data-error-debug]"));
  const copyMessage = textOf(modal.querySelector("[data-error-copy-message]"));
  const copyDetails = textOf(modal.querySelector("[data-error-copy-details]"));
  const copyDebug = textOf(modal.querySelector("[data-error-copy-debug]"));
  const closeBtn = textOf(modal.querySelector("[data-error-close]"));
  if (message) {
    message.textContent = payload.message;
  }
  const detailText = payload.details || (payload.requestId ? `request_id=${payload.requestId}` : "");
  if (details) {
    details.textContent = detailText;
  }
  const showDebug = Boolean(payload.debug);
  if (debugBox) {
    debugBox.textContent = payload.debug || "";
    debugBox.hidden = !showDebug;
  }
  if (copyDebug) {
    copyDebug.hidden = !showDebug;
    copyDebug.textContent = copy.copyDebug;
  }
  if (copyMessage) {
    copyMessage.textContent = copy.copyMessage;
  }
  if (copyDetails) {
    copyDetails.textContent = copy.copyDetails;
  }
  syncProductActions(modal, copy);
  if (closeBtn) {
    closeBtn.setAttribute("aria-label", copy.close);
  }
  modal.hidden = false;
  if ("inert" in modal) {
    modal.inert = false;
  }
  closeBtn?.focus();
}

/** Alias for the global error toast. */
export const showErrorToast = showErrorModal;

declare global {
  interface Window {
    __errorModalSwapBound?: boolean;
  }
}

export function startErrorModal(): void {
  if (!window.__errorModalSwapBound) {
    window.__errorModalSwapBound = true;
    document.addEventListener("astro:after-swap", () => {
      startErrorModal();
    });
  }
  const modal = document.getElementById("error-modal");
  if (!(modal instanceof HTMLElement) || modal.dataset.bound === "true") {
    return;
  }
  modal.dataset.bound = "true";
  if ("inert" in modal) {
    modal.inert = true;
  }
  const copy = errorModalCopy();
  const copyMessage = textOf(modal.querySelector("[data-error-copy-message]"));
  const copyDetails = textOf(modal.querySelector("[data-error-copy-details]"));
  const copyDebug = textOf(modal.querySelector("[data-error-copy-debug]"));
  const downloadEpam = textOf(modal.querySelector("[data-error-download-epam]"));
  const loadEreport = textOf(modal.querySelector("[data-error-load-ereport]"));
  // Hide product actions until showErrorModal scopes them to the current route.
  if (downloadEpam) downloadEpam.hidden = true;
  if (loadEreport) loadEreport.hidden = true;
  modal.addEventListener("click", (event) => {
    const node = event.target instanceof Element ? event.target.closest("button") : null;
    if (!node) {
      return;
    }
    if (node.matches("[data-error-close]")) {
      closeErrorModal();
      return;
    }
    const message = textOf(modal.querySelector("[data-error-message]"))?.textContent || "";
    const details = textOf(modal.querySelector("[data-error-details]"))?.textContent || "";
    const debug = textOf(modal.querySelector("[data-error-debug]"))?.textContent || "";
    if (node.matches("[data-error-copy-message]")) {
      void copyText(message).then(() => {
        if (copyMessage) copyMessage.textContent = copy.copied;
      });
    }
    if (node.matches("[data-error-copy-details]")) {
      void copyText(details).then(() => {
        if (copyDetails) copyDetails.textContent = copy.copied;
      });
    }
    if (node.matches("[data-error-copy-debug]")) {
      void copyText(debug).then(() => {
        if (copyDebug) copyDebug.textContent = copy.copied;
      });
    }
    if (node.matches("[data-error-download-epam]")) {
      if (!isEpamWorkspacePath()) return;
      if (lastPayload) {
        downloadErrorEpam(lastPayload);
      }
      if (downloadEpam) {
        downloadEpam.textContent = copy.copied;
        window.setTimeout(() => {
          if (downloadEpam) downloadEpam.textContent = copy.downloadEpam;
        }, 1200);
      }
    }
    if (node.matches("[data-error-load-ereport]")) {
      if (!isEreportWorkspacePath()) return;
      closeErrorModal();
      document.dispatchEvent(new CustomEvent(EREPORT_OPEN_LOCAL_EVENT));
    }
  });
  document.addEventListener("keydown", (event) => {
    if (modal.hidden) {
      return;
    }
    if (event.key === "Escape") {
      closeErrorModal();
      return;
    }
    trapFocus(event, modal);
  });
}
