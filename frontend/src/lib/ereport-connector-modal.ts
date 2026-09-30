import { mustLog } from "./dev-log";

const OVERLAY_ID = "eduardoos-ereport-connector-overlay";
const INIT_TYPE = "ereport-embed-init";
const READY_TYPE = "ereport-embed-ready";

export type EreportConnectorOpenOpts = {
  orgId?: string;
  reportId?: string;
  baseUrl?: string;
  label?: string;
};

function baseOrigin(opts?: EreportConnectorOpenOpts): string {
  if (opts?.baseUrl) return opts.baseUrl.replace(/\/$/, "");
  return window.location.origin;
}

function onEscape(ev: KeyboardEvent) {
  if (ev.key === "Escape") closeEreportConnectorModal();
}

let messageHandler: ((ev: MessageEvent) => void) | null = null;

export function closeEreportConnectorModal() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing?.parentNode) existing.parentNode.removeChild(existing);
  document.removeEventListener("keydown", onEscape, true);
  document.documentElement.classList.remove("ereport-connector-open");
  if (messageHandler) {
    window.removeEventListener("message", messageHandler);
    messageHandler = null;
  }
}

export function openEreportConnectorModal(opts: EreportConnectorOpenOpts = {}) {
  closeEreportConnectorModal();
  const base = baseOrigin(opts);
  const orgId = (opts.orgId || "").trim();
  const reportId = (opts.reportId || "").trim();

  const params = new URLSearchParams();
  if (orgId) params.set("org", orgId);
  if (reportId) params.set("report", reportId);
  const qs = params.toString();
  const src = `${base}/ereport/web-connector${qs ? `?${qs}` : ""}`;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "ereport-connector-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", opts.label || "eReport connector");

  const frame = document.createElement("div");
  frame.className = "ereport-connector-overlay__frame";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ereport-connector-overlay__close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => closeEreportConnectorModal());

  const iframe = document.createElement("iframe");
  iframe.className = "ereport-connector-overlay__iframe";
  iframe.src = src;
  iframe.title = opts.label || "eReport connector";
  iframe.setAttribute("allow", "clipboard-write");

  let sent = false;
  const sendInit = () => {
    if (sent || !orgId || !reportId || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ type: INIT_TYPE, orgId, reportId }, base);
      sent = true;
    } catch {
      /* ignore */
    }
  };

  iframe.addEventListener("load", sendInit);

  messageHandler = (ev: MessageEvent) => {
    if (!ev.data || typeof ev.data !== "object") return;
    try {
      if (new URL(ev.origin).host !== new URL(base).host) return;
    } catch {
      return;
    }
    if ((ev.data as { type?: string }).type === READY_TYPE) {
      sent = false;
      sendInit();
    }
  };
  window.addEventListener("message", messageHandler);

  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeEreportConnectorModal();
  });

  frame.append(closeBtn, iframe);
  overlay.append(frame);
  document.body.append(overlay);
  document.documentElement.classList.add("ereport-connector-open");
  document.addEventListener("keydown", onEscape, true);
  closeBtn.focus();

  // Close global trays so the wide canvas is unobstructed.
  document.getElementById("main-menu")?.setAttribute("hidden", "");
  document.getElementById("dynamic-header")?.setAttribute("hidden", "");
  document.querySelectorAll(".header-menu[aria-expanded='true']").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });

  if (mustLog) console.log("[ereport-connector-modal] open", { orgId: Boolean(orgId), reportId: Boolean(reportId) });
}

export function wireEreportConnectorMenu(root: ParentNode = document) {
  root.querySelectorAll("[data-ereport-connector-open]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.ereportConnectorWired === "1") return;
    node.dataset.ereportConnectorWired = "1";
    node.addEventListener("click", (ev) => {
      ev.preventDefault();
      const orgId = node.getAttribute("data-org-id") || undefined;
      const reportId = node.getAttribute("data-report-id") || undefined;
      openEreportConnectorModal({ orgId, reportId });
    });
  });
}

declare global {
  interface Window {
    EduardoOSEreport?: {
      mount: (opts: {
        orgId: string;
        reportId: string;
        menuSelector?: string;
        label?: string;
        baseUrl?: string;
      }) => { open: () => void; close: () => void; el: HTMLElement };
      open: (opts?: EreportConnectorOpenOpts) => void;
      close: () => void;
    };
  }
}

export function exposeEreportConnectorGlobal() {
  window.EduardoOSEreport = {
    mount(opts) {
      if (!opts?.orgId || !opts?.reportId) {
        throw new Error("EduardoOSEreport.mount requires orgId and reportId");
      }
      const open = (ev?: Event) => {
        ev?.preventDefault?.();
        openEreportConnectorModal({
          orgId: opts.orgId,
          reportId: opts.reportId,
          baseUrl: opts.baseUrl,
          label: opts.label,
        });
      };
      const menuSelector = opts.menuSelector;
      if (menuSelector) {
        const menu = document.querySelector(menuSelector);
        if (menu) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "eos-ereport-embed-menu-btn";
          btn.textContent = opts.label || "eReport";
          btn.setAttribute("aria-label", opts.label || "eReport");
          btn.addEventListener("click", open);
          menu.appendChild(btn);
          return { open, close: closeEreportConnectorModal, el: btn };
        }
      }
      const fab = document.createElement("button");
      fab.type = "button";
      fab.className = "eos-ereport-embed-fab";
      fab.textContent = opts.label || "eReport";
      fab.setAttribute("aria-label", opts.label || "eReport");
      fab.addEventListener("click", open);
      document.body.appendChild(fab);
      return { open, close: closeEreportConnectorModal, el: fab };
    },
    open: openEreportConnectorModal,
    close: closeEreportConnectorModal,
  };
}
