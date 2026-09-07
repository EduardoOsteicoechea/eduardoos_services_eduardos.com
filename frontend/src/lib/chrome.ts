import { getMe, postJSON } from "./api";
import { go, startClientRouting } from "./router";

const FONT_STEPS = ["0.875rem", "1rem", "1.125rem", "1.25rem", "1.375rem"];
const LEFT_PANELS = ["main-menu", "session-menu", "dynamic-header"] as const;

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

function syncExpanded(): void {
  const pairs: Array<[string, string]> = [
    [".header-menu", "main-menu"],
    [".header-session", "session-menu"],
    [".header-dynamic", "dynamic-header"],
    [".agent-fab", "agent-sidebar"],
  ];
  for (const [selector, id] of pairs) {
    const button = document.querySelector(selector);
    if (button instanceof HTMLElement) {
      button.setAttribute("aria-expanded", panelOpen(id) ? "true" : "false");
    }
  }
}

function closeLeft(except?: string): void {
  for (const id of LEFT_PANELS) {
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
  if (id === "agent-sidebar") {
    setPanelHidden(id, !next);
    syncExpanded();
    return;
  }
  closeLeft(next ? id : undefined);
  setPanelHidden(id, !next);
  syncExpanded();
}

function applyFont(size: string): void {
  document.documentElement.style.fontSize = size;
  localStorage.setItem("root-font-size", size);
}

function cycleFont(delta: number): void {
  const current = localStorage.getItem("root-font-size") || "1rem";
  const index = Math.max(0, FONT_STEPS.indexOf(current));
  const next = FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, index + delta))];
  applyFont(next);
}

function headerCollapsed(): boolean {
  return document.documentElement.dataset.headerCollapsed === "true";
}

function syncCollapseButton(): void {
  const button = document.querySelector(".header-collapse-btn");
  const icon = button?.querySelector(".material-symbols-outlined");
  const collapsed = headerCollapsed();
  if (button instanceof HTMLElement) {
    const hideLabel = button.dataset.labelHide || "Hide header";
    const showLabel = button.dataset.labelShow || "Show header";
    button.setAttribute("aria-label", collapsed ? showLabel : hideLabel);
    button.setAttribute("aria-pressed", collapsed ? "true" : "false");
  }
  if (icon instanceof HTMLElement) {
    icon.textContent = collapsed ? "left_panel_open" : "left_panel_close";
  }
}

function applyHeaderCollapsed(collapsed: boolean, focusToggle: boolean): void {
  document.documentElement.dataset.headerCollapsed = collapsed ? "true" : "false";
  document.querySelectorAll("[data-header-chrome]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.hidden = collapsed;
      if ("inert" in node) {
        node.inert = collapsed;
      }
    }
  });
  syncCollapseButton();
  if (focusToggle) {
    const toggle = document.querySelector(".header-collapse-btn");
    if (toggle instanceof HTMLElement) {
      toggle.focus();
    }
  }
}

function setHeaderCollapsed(collapsed: boolean): void {
  applyHeaderCollapsed(collapsed, true);
  closeLeft();
  setPanelHidden("agent-sidebar", true);
  syncExpanded();
}

function chromeClickTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  return target.closest("button, a, [data-logout]");
}

export async function refreshAuthChrome(): Promise<void> {
  const { status, data } = await getMe();
  const authed = status === 200 && Boolean(data.id);
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

export function startChrome(): void {
  startClientRouting();

  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    document.documentElement.dataset.theme = storedTheme;
  }

  const storedFont = localStorage.getItem("root-font-size");
  if (storedFont) {
    document.documentElement.style.fontSize = storedFont;
  }

  if (!window.__chromeStarted) {
    window.__chromeStarted = true;

    document.addEventListener("click", (event) => {
      const node = chromeClickTarget(event.target);
      if (node?.closest("[data-logout]")) {
        event.preventDefault();
        void (async () => {
          await postJSON("/auth/logout", {});
          await refreshAuthChrome();
          closeLeft();
          go("/session");
        })();
        return;
      }
      if (node?.closest(".header-menu")) {
        togglePanel("main-menu");
        return;
      }
      if (node?.closest(".header-session")) {
        togglePanel("session-menu");
        return;
      }
      if (node?.closest(".header-dynamic")) {
        togglePanel("dynamic-header");
        return;
      }
      if (node?.closest(".header-collapse-btn")) {
        setHeaderCollapsed(!headerCollapsed());
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
      if (node?.closest("[data-theme-toggle]")) {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        localStorage.setItem("theme", next);
        return;
      }
      if (node?.closest("a[data-route]") && node.closest(".sidebar-left, .sidebar-right")) {
        closeLeft();
        setPanelHidden("agent-sidebar", true);
        syncExpanded();
        return;
      }
      if (
        event.target instanceof Element &&
        !event.target.closest(".app-header, .sidebar-left, .sidebar-right, .agent-fab")
      ) {
        closeLeft();
        setPanelHidden("agent-sidebar", true);
        syncExpanded();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }
      closeLeft();
      setPanelHidden("agent-sidebar", true);
      syncExpanded();
    });
  }

  applyHeaderCollapsed(headerCollapsed(), false);
  syncExpanded();
  void refreshAuthChrome();
}
