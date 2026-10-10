import { mustLog } from "./dev-log";
import { workspaceHref } from "./ereport-routes";

export {
  closeEreportIssueCardModal,
  isEreportIssueCardModalOpen,
  openEreportIssueCardModal,
  type EreportIssueCardItem,
  type EreportIssueCardOpenOpts,
  type EreportIssueChecklistRow,
  type EreportIssueImageRef,
} from "./ereport-issue-card-modal";

const OVERLAY_ID = "eduardoos-ereport-connector-overlay";
const INIT_TYPE = "ereport-embed-init";
const READY_TYPE = "ereport-embed-ready";
const CLOSE_TYPE = "ereport-embed-close";

export type EreportConnectorOpenOpts = {
  orgId?: string;
  reportId?: string;
  baseUrl?: string;
  label?: string;
};

export type EreportWorkspaceIssueOpenOpts = {
  orgId: string;
  reportId: string;
  itemId: string;
  ownerSafe?: string;
  baseUrl?: string;
};

function baseOrigin(opts?: { baseUrl?: string }): string {
  if (opts?.baseUrl) return opts.baseUrl.replace(/\/$/, "");
  return window.location.origin;
}

/** Workspace URL that opens a report and focuses one issue (`item` query). */
export function ereportWorkspaceIssueHref(opts: EreportWorkspaceIssueOpenOpts): string {
  const orgId = (opts.orgId || "").trim();
  const reportId = (opts.reportId || "").trim();
  const itemId = (opts.itemId || "").trim();
  const ownerSafe = (opts.ownerSafe || "").trim();
  const path = workspaceHref(orgId, reportId, ownerSafe, itemId ? { itemId } : undefined);
  const base = baseOrigin(opts).replace(/\/$/, "");
  return `${base}${path}`;
}

/** Open eReport workspace in a new tab scrolled/focused on the given issue. */
export function openEreportWorkspaceIssue(opts: EreportWorkspaceIssueOpenOpts): void {
  const orgId = (opts.orgId || "").trim();
  const reportId = (opts.reportId || "").trim();
  const itemId = (opts.itemId || "").trim();
  if (!orgId || !reportId || !itemId) return;
  const url = ereportWorkspaceIssueHref({ ...opts, orgId, reportId, itemId });
  window.open(url, "_blank", "noopener,noreferrer");
  if (mustLog) console.log("[ereport-connector-modal] open workspace issue", { orgId, reportId, itemId: Boolean(itemId) });
}

function onEscape(ev: KeyboardEvent) {
  if (ev.key === "Escape") {
    ev.preventDefault();
    ev.stopPropagation();
    closeEreportConnectorModal();
  }
}

let messageHandler: ((ev: MessageEvent) => void) | null = null;
let openBase = "";

export function closeEreportConnectorModal() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing?.parentNode) existing.parentNode.removeChild(existing);
  document.removeEventListener("keydown", onEscape, true);
  document.documentElement.classList.remove("ereport-connector-open");
  openBase = "";
  if (messageHandler) {
    window.removeEventListener("message", messageHandler);
    messageHandler = null;
  }
  // Also close quick modal if open.
  void import("./ereport-quick-connector").then((m) => m.closeEreportQuickConnector());
}

function sameHost(origin: string, base: string): boolean {
  try {
    return new URL(origin).host === new URL(base).host;
  } catch {
    return false;
  }
}

/** Full iframe web-connector (advanced editor). */
export function openEreportAdvancedConnectorModal(opts: EreportConnectorOpenOpts = {}) {
  closeEreportConnectorModal();
  const base = baseOrigin(opts);
  openBase = base;
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
  closeBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    closeEreportConnectorModal();
  });

  const iframe = document.createElement("iframe");
  iframe.className = "ereport-connector-overlay__iframe";
  iframe.title = opts.label || "eReport connector";
  iframe.src = src;
  iframe.setAttribute("allow", "clipboard-write");

  messageHandler = (ev: MessageEvent) => {
    if (!sameHost(ev.origin, openBase)) return;
    const data = ev.data;
    if (!data || typeof data !== "object") return;
    const type = (data as { type?: string }).type;
    if (type === READY_TYPE && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: INIT_TYPE, orgId, reportId },
        openBase,
      );
    }
    if (type === CLOSE_TYPE) {
      closeEreportConnectorModal();
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

  document.dispatchEvent(new CustomEvent("eos:close-trays"));

  if (mustLog) console.log("[ereport-connector-modal] open advanced", { orgId: Boolean(orgId), reportId: Boolean(reportId) });
}

/** Default: quick issue reporter (website registration). */
export async function openEreportConnectorModal(opts: EreportConnectorOpenOpts = {}) {
  const { openEreportQuickConnector } = await import("./ereport-quick-connector");
  const orgId = (opts.orgId || "").trim();
  const reportId = (opts.reportId || "").trim();
  await openEreportQuickConnector({
    binding: orgId && reportId ? { orgId, reportId } : null,
  });
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
      void openEreportConnectorModal({ orgId, reportId });
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
        void openEreportConnectorModal({
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
    open: (opts) => {
      void openEreportConnectorModal(opts);
    },
    close: closeEreportConnectorModal,
  };
}
