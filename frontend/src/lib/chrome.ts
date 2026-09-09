import { getMe, postJSON } from "./api";
import { startAgentChat } from "./chat";
import { sessionLog, sessionLogStorage } from "./dev-log";
import { bumpUiScale } from "./ereport-workspace";
import { showErrorModal } from "./error-modal";
import { go, startClientRouting } from "./router";

const FONT_STEPS = ["0.875rem", "1rem", "1.125rem", "1.25rem", "1.375rem"];
const ALL_PANELS = ["main-menu", "dynamic-header", "agent-sidebar"] as const;

declare global {
  interface Window {
    __chromeStarted?: boolean;
  }
}

function panelOpen(id: string): boolean {
  const node = document.getElementById(id);
  return node instanceof HTMLElement && !node.hidden;
}

function setPanelHidden(id: string, hidden: boolean): void {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) {
    return;
  }
  node.hidden = hidden;
  if ("inert" in node) {
    node.inert = hidden;
  }
}

function syncTrayOpenAttr(): void {
  if (panelOpen("main-menu")) {
    document.documentElement.dataset.trayOpen = "main-menu";
  } else {
    delete document.documentElement.dataset.trayOpen;
  }
}

function syncExpanded(): void {
  const pairs: Array<[string, string]> = [
    [".header-menu", "main-menu"],
    [".header-dynamic", "dynamic-header"],
    [".agent-fab", "agent-sidebar"],
  ];
  for (const [selector, id] of pairs) {
    const open = panelOpen(id);
    document.querySelectorAll(selector).forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }
      button.setAttribute("aria-expanded", open ? "true" : "false");
      if (selector === ".header-dynamic" && isEreportPage()) {
        button.setAttribute("aria-label", open ? "Close tools" : "Open tools");
        button.setAttribute("title", open ? "Close tools" : "Open tools");
        const icon = button.querySelector(".material-symbols-outlined");
        if (icon instanceof HTMLElement) {
          icon.textContent = open ? "close" : "tune";
        }
      }
      if (selector === ".header-menu" && isEreportPage()) {
        button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        button.setAttribute("title", open ? "Close menu" : "Open menu");
        const path = button.querySelector(".header-menu-svg path");
        if (path instanceof SVGPathElement) {
          path.setAttribute("d", open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16");
        }
      }
    });
  }
  syncTrayOpenAttr();
}

function isEreportPage(): boolean {
  return (document.documentElement.dataset.page || "").startsWith("ereport");
}

function isCompactChrome(): boolean {
  return window.matchMedia("(max-width: 63.999rem)").matches;
}

function closeAllPanels(except?: string): void {
  for (const id of ALL_PANELS) {
    if (id === "dynamic-header" && isEreportPage() && !isCompactChrome()) {
      continue;
    }
    if (id !== except) {
      setPanelHidden(id, true);
    }
  }
  syncExpanded();
}

function togglePanel(id: string): void {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) {
    return;
  }
  const next = node.hidden;
  closeAllPanels(next ? id : undefined);
  setPanelHidden(id, !next);
  syncExpanded();
}

function applyFont(size: string): void {
  document.documentElement.style.fontSize = size;
  localStorage.setItem("root-font-size", size);
  sessionLog("chrome.font.persist", { size });
}

function cycleFont(delta: number): void {
  if (isEreportPage()) {
    bumpUiScale(delta);
    return;
  }
  const current = localStorage.getItem("root-font-size") || "1rem";
  const index = Math.max(0, FONT_STEPS.indexOf(current));
  const next = FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, index + delta))];
  applyFont(next);
}

function setChromeHidden(node: Element | null, hidden: boolean): void {
  if (!(node instanceof HTMLElement)) {
    return;
  }
  node.hidden = hidden;
  if ("inert" in node) {
    node.inert = hidden;
  }
}

function clearHeaderCollapsed(): void {
  delete document.documentElement.dataset.headerCollapsed;
  document.querySelectorAll("[data-header-chrome]").forEach((node) => {
    setChromeHidden(node, false);
  });
  setChromeHidden(document.querySelector(".app-header--end"), false);
  setChromeHidden(document.querySelector(".agent-fab"), false);
}

function chromeClickTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  return target.closest("button, a, [data-logout]");
}

export function applySessionAvatar(_avatar?: string | null): void {
  // Session actions live in #main-menu; header avatar chrome was removed.
}

export async function refreshAuthChrome(): Promise<void> {
  sessionLog("chrome.refreshAuth.start");
  const { status, data } = await getMe();
  const authed = status === 200 && Boolean(data.id);
  sessionLog("chrome.refreshAuth.me", { status, authed, userId: data.id, role: data.role, error: data.error });
  document.querySelectorAll("[data-guest-only]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.hidden = authed;
    }
  });
  document.querySelectorAll("[data-authed-only]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.hidden = !authed;
    }
  });
  document.querySelectorAll("[data-admin-only]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.hidden = !(authed && data.role === "admin");
    }
  });
}

function syncIconButtonTitles(): void {
  document.querySelectorAll(".icon-btn[aria-label]").forEach((node) => {
    if (node instanceof HTMLElement && !node.getAttribute("title")) {
      node.setAttribute("title", node.getAttribute("aria-label") || "");
    }
  });
}

function syncEreportChrome(): void {
  if (!isEreportPage()) {
    return;
  }
  clearHeaderCollapsed();
  document.documentElement.style.fontSize = "";
  setChromeHidden(document.querySelector(".agent-fab"), true);
  const opener = document.querySelector(".header-dynamic");
  if (!isCompactChrome()) {
    setPanelHidden("dynamic-header", false);
    if (opener instanceof HTMLElement) {
      opener.hidden = true;
    }
  } else if (opener instanceof HTMLElement) {
    opener.hidden = false;
  }
  const storedScale = localStorage.getItem("site-text-scale");
  if (storedScale) {
    document.documentElement.style.setProperty("--site-text-scale", storedScale);
  }
}

function restoreChromeAfterNavigation(): void {
  clearHeaderCollapsed();
  syncEreportChrome();
  syncExpanded();
  syncIconButtonTitles();
  startAgentChat();
  void refreshAuthChrome();
}

export function startChrome(): void {
  startClientRouting();
  sessionLogStorage("chrome.start");

  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    document.documentElement.dataset.theme = storedTheme;
  }
  sessionLog("chrome.theme.restore", { storedTheme, applied: document.documentElement.dataset.theme });

  const storedFont = localStorage.getItem("root-font-size");
  if (storedFont) {
    document.documentElement.style.fontSize = storedFont;
  }
  sessionLog("chrome.font.restore", { storedFont, applied: document.documentElement.style.fontSize });

  if (!window.__chromeStarted) {
    window.__chromeStarted = true;

    document.addEventListener("click", (event) => {
      const node = chromeClickTarget(event.target);
      if (node?.closest("[data-logout]")) {
        event.preventDefault();
        void (async () => {
          sessionLog("chrome.logout.start");
          const result = await postJSON("/auth/logout", {});
          sessionLog("chrome.logout.result", { status: result.status, error: result.data.error });
          if (result.status < 200 || result.status >= 300) {
            showErrorModal({
              message: result.data.message || (document.documentElement.lang.startsWith("es") ? "Algo salió mal." : "Something went wrong."),
              requestId: result.data.request_id,
              details: result.data.request_id ? `request_id=${result.data.request_id}` : "",
              debug: result.data.debug,
            });
            return;
          }
          await refreshAuthChrome();
          closeAllPanels();
          go("/session");
        })();
        return;
      }
      if (node?.closest(".header-menu")) {
        togglePanel("main-menu");
        return;
      }
      if (node?.closest(".header-dynamic")) {
        togglePanel("dynamic-header");
        return;
      }
      if (node?.closest(".agent-fab")) {
        togglePanel("agent-sidebar");
        return;
      }
      if (node?.closest("[data-font='-']")) {
        cycleFont(-1);
        return;
      }
      if (node?.closest("[data-font='+']")) {
        cycleFont(1);
        return;
      }
      if (node?.closest("[data-close-menu]")) {
        closeAllPanels();
        return;
      }
      if (node?.closest("[data-open-agent]")) {
        event.preventDefault();
        togglePanel("agent-sidebar");
        return;
      }
      if (node?.closest("[data-theme-toggle]")) {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        localStorage.setItem("theme", next);
        sessionLog("chrome.theme.persist", { theme: next });
        window.dispatchEvent(new CustomEvent("ereport-theme"));
        return;
      }
      if (node?.closest("a[data-route]") && node.closest(".sidebar-left, .sidebar-right")) {
        closeAllPanels();
        return;
      }
      if (
        event.target instanceof Element &&
        !event.target.closest(".app-header, .sidebar-left, .sidebar-right, .agent-fab")
      ) {
        closeAllPanels();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }
      closeAllPanels();
    });

    document.addEventListener("astro:after-swap", () => {
      restoreChromeAfterNavigation();
    });
  }

  restoreChromeAfterNavigation();
}
