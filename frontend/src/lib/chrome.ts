import { getMe, postJSON, profileAvatarURL } from "./api";
import { startAgentChat } from "./chat";
import { bumpUiScale } from "./ereport-workspace";
import { showErrorModal } from "./error-modal";
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
}

function isEreportPage(): boolean {
  return (document.documentElement.dataset.page || "").startsWith("ereport");
}

function isPhoneChrome(): boolean {
  return window.matchMedia("(max-width: 47.999rem)").matches;
}

function closeLeft(except?: string): void {
  for (const id of LEFT_PANELS) {
    if (id === "dynamic-header" && isEreportPage() && !isPhoneChrome()) {
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
  if (isEreportPage()) {
    bumpUiScale(delta);
    return;
  }
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
    button.setAttribute("title", collapsed ? showLabel : hideLabel);
    button.setAttribute("aria-pressed", collapsed ? "true" : "false");
  }
  if (icon instanceof HTMLElement) {
    icon.textContent = collapsed ? "chevron_right" : "chevron_left";
  }
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

function applyHeaderCollapsed(collapsed: boolean, focusToggle: boolean): void {
  document.documentElement.dataset.headerCollapsed = collapsed ? "true" : "false";
  document.querySelectorAll("[data-header-chrome]").forEach((node) => {
    setChromeHidden(node, collapsed);
  });
  setChromeHidden(document.querySelector(".agent-fab"), collapsed);
  if (collapsed) {
    closeLeft();
    setPanelHidden("agent-sidebar", true);
    syncExpanded();
  }
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
}

function chromeClickTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  return target.closest("button, a, [data-logout]");
}

function sessionButton(): HTMLElement | null {
  const node = document.querySelector(".header-session");
  return node instanceof HTMLElement ? node : null;
}

let lastSessionAvatar: string | null = null;

function showSessionIcon(): void {
  const button = sessionButton();
  const photo = document.querySelector("[data-session-avatar]");
  const icon = document.querySelector("[data-session-icon]");
  button?.removeAttribute("data-has-avatar");
  if (photo instanceof HTMLImageElement) {
    photo.removeAttribute("src");
    photo.hidden = true;
  }
  if (icon instanceof HTMLElement) {
    icon.hidden = false;
  }
}

function paintSessionAvatar(src: string | null): void {
  const button = sessionButton();
  const photo = document.querySelector("[data-session-avatar]");
  const icon = document.querySelector("[data-session-icon]");
  if (!(photo instanceof HTMLImageElement)) {
    if (icon instanceof HTMLElement) icon.hidden = false;
    button?.removeAttribute("data-has-avatar");
    return;
  }
  if (!src) {
    showSessionIcon();
    return;
  }
  if (photo.getAttribute("src") === src && !photo.hidden) {
    if (icon instanceof HTMLElement) icon.hidden = true;
    button?.setAttribute("data-has-avatar", "true");
    return;
  }
  photo.onerror = () => {
    showSessionIcon();
  };
  photo.src = src;
  photo.hidden = false;
  if (icon instanceof HTMLElement) icon.hidden = true;
  button?.setAttribute("data-has-avatar", "true");
}

export function applySessionAvatar(avatar?: string | null): void {
  lastSessionAvatar = profileAvatarURL(avatar);
  paintSessionAvatar(lastSessionAvatar);
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
  applySessionAvatar(authed ? data.avatar : null);
  const session = document.querySelector(".header-session");
  if (isEreportPage() && session instanceof HTMLElement) {
    session.hidden = !authed;
  }
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
  applyHeaderCollapsed(false, false);
  document.documentElement.style.fontSize = "";
  setChromeHidden(document.querySelector(".agent-fab"), true);
  setChromeHidden(document.querySelector(".header-collapse"), true);
  const opener = document.querySelector(".header-dynamic");
  if (!isPhoneChrome()) {
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
  applyHeaderCollapsed(headerCollapsed(), false);
  syncEreportChrome();
  syncExpanded();
  syncIconButtonTitles();
  paintSessionAvatar(lastSessionAvatar);
  startAgentChat();
  void refreshAuthChrome();
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
          const result = await postJSON("/auth/logout", {});
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
      if (node?.closest("[data-close-menu]")) {
        closeLeft();
        return;
      }
      if (node?.closest("[data-open-agent]")) {
        event.preventDefault();
        closeLeft();
        togglePanel("agent-sidebar");
        return;
      }
      if (node?.closest("[data-theme-toggle]")) {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        localStorage.setItem("theme", next);
        window.dispatchEvent(new CustomEvent("ereport-theme"));
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

    document.addEventListener("astro:after-swap", () => {
      restoreChromeAfterNavigation();
    });
  }

  restoreChromeAfterNavigation();
}
