import { clearSessionHint, getMe, postJSON, profileAvatarURL, refreshSession, resetCsrfMemory } from "./api";
import { startAgentChat } from "./chat";
import { sessionLog, sessionLogStorage } from "./dev-log";
import { bumpUiScale } from "./ereport-workspace";
import { showErrorModal } from "./error-modal";
import { startVoiceChat } from "./voice";
import { go, startClientRouting } from "./router";
import { checkServiceAccess } from "./serviceAccess";

const FONT_STEPS = ["0.875rem", "1rem", "1.125rem", "1.25rem", "1.375rem"];
const ALL_PANELS = ["main-menu", "dynamic-header", "agent-sidebar"] as const;
const PHONE_TRAY_MQ = "(max-width: 47.999rem)";
const SESSION_REFRESH_MS = 10 * 60 * 1000;

let sessionRefreshTimer: ReturnType<typeof setInterval> | undefined;

function isPhoneTray(): boolean {
  return window.matchMedia(PHONE_TRAY_MQ).matches;
}

function syncShellViewportWidth(): void {
  const root = document.documentElement;
  const fontSize = parseFloat(getComputedStyle(root).fontSize);
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    return;
  }
  const widthPx = window.visualViewport?.width ?? window.innerWidth;
  root.style.setProperty("--shell-viewport-width", `${widthPx / fontSize}rem`);
}

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
  const openId = ALL_PANELS.find((id) => panelOpen(id));
  if (openId) {
    document.documentElement.dataset.trayOpen = openId;
  } else {
    delete document.documentElement.dataset.trayOpen;
  }
  const backdrop = document.querySelector("[data-tray-backdrop]");
  if (backdrop instanceof HTMLElement) {
    backdrop.hidden = !openId;
  }
}

function syncExpanded(): void {
  const pairs: Array<[string, string]> = [
    [".header-menu", "main-menu"],
    [".agent-fab", "agent-sidebar"],
  ];
  for (const [selector, id] of pairs) {
    const open = panelOpen(id);
    document.querySelectorAll(selector).forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  syncTrayOpenAttr();
}

function isEreportPage(): boolean {
  return (document.documentElement.dataset.page || "").startsWith("ereport");
}

function closeAllPanels(except?: string): void {
  for (const id of ALL_PANELS) {
    if (id !== except) {
      setPanelHidden(id, true);
    }
  }
  syncExpanded();
}

function dynamicHeaderHasActions(): boolean {
  const dhs = document.getElementById("dynamic-header");
  if (!(dhs instanceof HTMLElement)) {
    return false;
  }
  // Row actions, pamphlet tools, or Homescool cycle/week/day/subject chrome.
  if (
    dhs.querySelector(
      ".dhs-action, .header-dynamic-menu__btn, [data-homescool-dhs], .homescool-dhs",
    )
  ) {
    return true;
  }
  const host = dhs.querySelector("#header-dynamic-menu-host, [data-hds-host]");
  return host instanceof HTMLElement && host.childElementCount > 0;
}

/** Keep DHS tray in sync with the global menu: show only when menu is open and route has actions. */
function syncDynamicHeaderWithMenu(): void {
  if (!panelOpen("main-menu")) {
    setPanelHidden("dynamic-header", true);
    return;
  }
  setPanelHidden("dynamic-header", !dynamicHeaderHasActions());
}

function togglePanel(id: string): void {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) {
    return;
  }
  const willOpen = node.hidden;

  // Phone: keep menu, close DHS, dock chat at 66%. Tablet/desktop: dock after DHS or menu.
  if (id === "agent-sidebar") {
    if (willOpen) {
      if (isPhoneTray()) {
        setPanelHidden("main-menu", false);
        setPanelHidden("dynamic-header", true);
      } else {
        setPanelHidden("main-menu", false);
        setPanelHidden("dynamic-header", !dynamicHeaderHasActions());
      }
      setPanelHidden("agent-sidebar", false);
    } else {
      setPanelHidden("agent-sidebar", true);
      if (isPhoneTray() && panelOpen("main-menu")) {
        syncDynamicHeaderWithMenu();
      }
    }
    syncExpanded();
    return;
  }

  if (id === "main-menu") {
    if (willOpen) {
      setPanelHidden("agent-sidebar", true);
      setPanelHidden("main-menu", false);
      setPanelHidden("dynamic-header", !dynamicHeaderHasActions());
    } else {
      setPanelHidden("main-menu", true);
      setPanelHidden("dynamic-header", true);
      setPanelHidden("agent-sidebar", true);
    }
    syncExpanded();
    return;
  }

  closeAllPanels(willOpen ? id : undefined);
  setPanelHidden(id, !willOpen);
  syncExpanded();
}

function applyFont(size: string): void {
  document.documentElement.style.fontSize = size;
  localStorage.setItem("root-font-size", size);
  syncShellViewportWidth();
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
  setChromeHidden(document.querySelector(".agent-fab"), false);
}

function chromeClickTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  return target.closest("button, a, [data-logout]");
}

export function applySessionAvatar(avatar?: string | null): void {
  const img = document.querySelector("[data-header-avatar-img]");
  const fallback = document.querySelector("[data-header-avatar-fallback]");
  const src = profileAvatarURL(avatar);
  if (img instanceof HTMLImageElement) {
    if (src) {
      img.onerror = () => {
        img.removeAttribute("src");
        img.hidden = true;
        if (fallback instanceof HTMLElement) {
          fallback.hidden = false;
        }
      };
      img.src = src;
      img.hidden = false;
      if (fallback instanceof HTMLElement) {
        fallback.hidden = true;
      }
    } else {
      img.removeAttribute("src");
      img.hidden = true;
      if (fallback instanceof HTMLElement) {
        fallback.hidden = false;
      }
    }
  }
}

function clearSessionRefreshTimer(): void {
  if (sessionRefreshTimer !== undefined) {
    clearInterval(sessionRefreshTimer);
    sessionRefreshTimer = undefined;
  }
}

function scheduleSessionRefresh(): void {
  clearSessionRefreshTimer();
  sessionRefreshTimer = setInterval(() => {
    void refreshSession().then((result) => {
      if (result.status === 200 && result.data.id) {
        void refreshAuthChrome();
        return;
      }
      clearSessionRefreshTimer();
    });
  }, SESSION_REFRESH_MS);
  if (typeof document !== "undefined" && !document.documentElement.dataset.sessionVisBound) {
    document.documentElement.dataset.sessionVisBound = "1";
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      sessionLog("chrome.visibility.refresh");
      void refreshSession().then((result) => {
        if (result.status === 200 && result.data.id) {
          void refreshAuthChrome();
        }
      });
    });
  }
}

async function syncSubscriptionNav(isAdmin: boolean, authed: boolean): Promise<void> {
  const nodes = [...document.querySelectorAll("[data-service]")].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  if (nodes.length === 0) {
    return;
  }
  if (isAdmin) {
    for (const node of nodes) {
      node.hidden = false;
    }
    sessionLog("chrome.refreshAuth.services", { mode: "admin", count: nodes.length });
    return;
  }
  if (!authed) {
    for (const node of nodes) {
      node.hidden = true;
    }
    sessionLog("chrome.refreshAuth.services", { mode: "guest", count: nodes.length });
    return;
  }
  const ids = [
    ...new Set(
      nodes
        .map((node) => (node.getAttribute("data-service") || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  const allowed = new Map<string, boolean>();
  await Promise.all(
    ids.map(async (id) => {
      const access = await checkServiceAccess(id);
      // Homescool linked students may use `allowed` without a paid entitlement.
      // Every other service (including eVoice) needs an active subscription.
      const show =
        id === "homescool"
          ? Boolean(access.allowed)
          : Boolean(access.hasEntitlement);
      allowed.set(id, show);
    }),
  );
  for (const node of nodes) {
    const id = (node.getAttribute("data-service") || "").trim().toLowerCase();
    node.hidden = !allowed.get(id);
  }
  sessionLog("chrome.refreshAuth.services", {
    mode: "entitlements",
    allowed: Object.fromEntries(allowed),
  });
}

function plainUserBlockedPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/contact") return false;
  if (path.startsWith("/payments")) return false;
  if (path.startsWith("/session")) return false;
  // Entitled service surfaces keep their own gates; do not soft-block here.
  if (
    path.startsWith("/scrib") ||
    path.startsWith("/homescool") ||
    path.startsWith("/documents/pamphlet") ||
    path.startsWith("/evoice") ||
    path.startsWith("/eoproject") ||
    path.startsWith("/ereport") ||
    path === "/api-docs"
  ) {
    return false;
  }
  return (
    path.includes("calvins-institutes") ||
    path.startsWith("/admin") ||
    path.startsWith("/publisher")
  );
}

function enforcePlainUserRouteAccess(isPlainUser: boolean): void {
  if (!isPlainUser || typeof window === "undefined") return;
  if (!plainUserBlockedPath(window.location.pathname)) return;
  sessionLog("chrome.plainUser.redirect", { from: window.location.pathname });
  go("/");
}

function enforceGuestInstitutesAccess(authed: boolean): void {
  if (authed || typeof window === "undefined") return;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (!path.includes("calvins-institutes")) return;
  sessionLog("chrome.guest.institutes.redirect", { from: path });
  go("/session");
}

export async function refreshAuthChrome(): Promise<void> {
  sessionLog("chrome.refreshAuth.start", {});
  const { status, data } = await getMe();
  const authed = status === 200 && Boolean(data.id);
  const isAdmin = authed && data.role === "admin";
  const isPlainUser = authed && !isAdmin;
  sessionLog("chrome.refreshAuth.me", {
    status,
    authed,
    isAdmin,
    isPlainUser,
    userId: data.id,
    role: data.role,
    error: data.error,
  });
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
      node.hidden = !isAdmin;
    }
  });
  // Guests and admins keep marketing links. Institutes stay auth-gated.
  // Plain members keep subscriptions and session links; this site has no storefront.
  document.querySelectorAll("[data-full-nav]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (isPlainUser) {
      node.hidden = true;
      return;
    }
    if (node.hasAttribute("data-authed-only")) {
      node.hidden = !authed;
      return;
    }
    if (node.hasAttribute("data-admin-only")) {
      node.hidden = !isAdmin;
      return;
    }
    node.hidden = false;
  });
  await syncSubscriptionNav(isAdmin, authed);
  enforceGuestInstitutesAccess(authed);
  enforcePlainUserRouteAccess(isPlainUser);
  if (authed) {
    applySessionAvatar(data.avatar);
    scheduleSessionRefresh();
  } else {
    applySessionAvatar(null);
    clearSessionRefreshTimer();
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
  clearHeaderCollapsed();
  document.documentElement.style.fontSize = "";
  const storedScale = localStorage.getItem("site-text-scale");
  if (storedScale) {
    document.documentElement.style.setProperty("--site-text-scale", storedScale);
  }
}

function applyStoredTheme(): void {
  try {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      document.documentElement.dataset.theme = storedTheme;
    }
  } catch {
    /* private mode / blocked storage */
  }
}

function applyStoredFont(): void {
  try {
    const storedFont = localStorage.getItem("root-font-size");
    if (storedFont) {
      document.documentElement.style.fontSize = storedFont;
    }
  } catch {
    /* private mode / blocked storage */
  }
}

function applyStoredPreferences(): void {
  applyStoredTheme();
  applyStoredFont();
}

function stampDocumentPreferences(doc: Document): void {
  try {
    const theme = localStorage.getItem("theme");
    if (theme === "light" || theme === "dark") {
      doc.documentElement.dataset.theme = theme;
    }
    const font = localStorage.getItem("root-font-size");
    if (font) {
      doc.documentElement.style.fontSize = font;
    }
  } catch {
    /* private mode / blocked storage */
  }
}

function restoreChromeAfterNavigation(): void {
  applyStoredPreferences();
  syncShellViewportWidth();
  clearHeaderCollapsed();
  syncEreportChrome();
  syncExpanded();
  syncIconButtonTitles();
  startAgentChat();
  startVoiceChat();
  void refreshAuthChrome();
}

export function startChrome(): void {
  startClientRouting();
  sessionLogStorage("chrome.start");

  applyStoredPreferences();
  sessionLog("chrome.theme.restore", { storedTheme: localStorage.getItem("theme"), applied: document.documentElement.dataset.theme });
  sessionLog("chrome.font.restore", { storedFont: localStorage.getItem("root-font-size"), applied: document.documentElement.style.fontSize });

  if (!window.__chromeStarted) {
    window.__chromeStarted = true;
    syncShellViewportWidth();
    window.addEventListener("resize", syncShellViewportWidth);
    window.visualViewport?.addEventListener("resize", syncShellViewportWidth);

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
          resetCsrfMemory();
          clearSessionHint();
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
      if (node?.closest("[data-tray-backdrop]")) {
        closeAllPanels();
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

    document.addEventListener("astro:before-swap", (event) => {
      const next = (event as Event & { newDocument?: Document }).newDocument;
      if (next) {
        stampDocumentPreferences(next);
      }
    });

    document.addEventListener("astro:after-swap", () => {
      restoreChromeAfterNavigation();
    });

    const dhs = document.getElementById("dynamic-header");
    if (dhs) {
      new MutationObserver(() => {
        syncDynamicHeaderWithMenu();
        syncExpanded();
      }).observe(dhs, { childList: true, subtree: true });
    }
  }

  restoreChromeAfterNavigation();
}
