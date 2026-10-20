import {
  clearMeCache,
  clearSessionHint,
  getMe,
  hasSessionHint,
  isTransientAuthStatus,
  postJSON,
  profileAvatarURL,
  refreshSession,
  resetCsrfMemory,
  subscribeSessionBroadcast,
} from "./api";
import { startAgentChat } from "./chat";
import { sessionLog, sessionLogStorage } from "./dev-log";
import { exposeEreportConnectorGlobal, wireEreportConnectorMenu } from "./ereport-connector-modal";
import { fetchEreportAccess } from "./ereport";
import { bumpUiScale } from "./ereport-workspace";
import { showErrorModal } from "./error-modal";
import { startVoiceChat } from "./voice";
import { go, startClientRouting } from "./router";
import { checkServiceAccess } from "./serviceAccess";

/** Root font-size steps (10px–22px at a 16px browser default). */
const FONT_STEPS = ["0.625rem", "0.75rem", "0.875rem", "1rem", "1.125rem", "1.25rem", "1.375rem"];
const ALL_PANELS = ["main-menu", "dynamic-header", "agent-sidebar"] as const;
const PHONE_TRAY_MQ = "(max-width: 47.999rem)";
/** Refresh before access JWT expiry (15m). Keep under accessTTL with headroom for background-tab timer throttling. */
const SESSION_REFRESH_MS = 8 * 60 * 1000;

let sessionRefreshTimer: ReturnType<typeof setInterval> | undefined;
let sessionBroadcastUnsub: (() => void) | undefined;

function isPhoneTray(): boolean {
  return window.matchMedia(PHONE_TRAY_MQ).matches;
}

/**
 * Layout viewport only — do not chase visualViewport height.
 * Mobile URL/search bars toggle visualViewport and thrash layout if we follow them.
 */
function syncShellViewportWidth(): void {
  const root = document.documentElement;
  const fontSize = parseFloat(getComputedStyle(root).fontSize);
  if (!Number.isFinite(fontSize) || fontSize <= 0) {
    return;
  }
  const widthPx = document.documentElement.clientWidth || window.innerWidth;
  const heightPx = window.innerHeight;
  root.style.setProperty("--shell-viewport-width", `${widthPx / fontSize}rem`);
  root.style.setProperty("--shell-viewport-height", `${heightPx / fontSize}rem`);
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
  // Fixed Homescool DHS is a docked rail, not an overlay tray — ignore it for
  // data-tray-open / backdrop so the letter stage stays undimmed.
  const openId = ALL_PANELS.find((id) => {
    if (id === "dynamic-header" && isHomescoolFixedDhs()) {
      return false;
    }
    return panelOpen(id);
  });
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

/** Overlay columns that share the menu toolbar band (excludes Homescool fixed rail). */
function syncMenuToolbarSpan(): void {
  const root = document.documentElement;
  if (!panelOpen("main-menu")) {
    delete root.dataset.menuToolbar;
    return;
  }
  const dhsDocked = panelOpen("dynamic-header") && !isHomescoolFixedDhs();
  const agentDocked = panelOpen("agent-sidebar");
  if (dhsDocked && agentDocked) {
    root.dataset.menuToolbar = "menu-dhs-agent";
  } else if (dhsDocked) {
    root.dataset.menuToolbar = "menu-dhs";
  } else if (agentDocked) {
    root.dataset.menuToolbar = "menu-agent";
  } else {
    root.dataset.menuToolbar = "menu";
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
  syncMenuToolbarSpan();
}

function isEreportPage(): boolean {
  return (document.documentElement.dataset.page || "").startsWith("ereport");
}

function closeAllPanels(except?: string): void {
  for (const id of ALL_PANELS) {
    if (id !== except) {
      // Homescool curriculum rail stays docked while browsing sheets.
      if (id === "dynamic-header" && isHomescoolFixedDhs()) {
        setPanelHidden("dynamic-header", false);
        continue;
      }
      setPanelHidden(id, true);
    }
  }
  syncExpanded();
}

function isHomescoolFixedDhs(): boolean {
  return (
    document.documentElement.getAttribute("data-page") === "homescool-workspace" &&
    Boolean(document.querySelector("[data-homescool-dhs], .homescool-dhs"))
  );
}

function dynamicHeaderHasActions(): boolean {
  const dhs = document.getElementById("dynamic-header");
  if (!(dhs instanceof HTMLElement)) {
    return false;
  }
  // Font / theme chrome is always the first DHS row on every route.
  if (dhs.querySelector("[data-dhs-chrome]")) {
    return true;
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

/** Keep DHS tray in sync with the global menu — except Homescool fixed rail. */
function syncDynamicHeaderWithMenu(): void {
  if (isHomescoolFixedDhs()) {
    setPanelHidden("dynamic-header", false);
    return;
  }
  if (!panelOpen("main-menu")) {
    setPanelHidden("dynamic-header", true);
    return;
  }
  // Always dock DHS beside the menu: font/theme chrome is the first DHS row on every route.
  setPanelHidden("dynamic-header", false);
}

function togglePanel(id: string): void {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) {
    return;
  }
  const willOpen = node.hidden;

  // Phone: collapse menu/DHS; chat alone at 75%. Tablet/desktop: dock beside menu (+ DHS).
  if (id === "agent-sidebar") {
    if (willOpen) {
      if (isPhoneTray()) {
        setPanelHidden("main-menu", true);
        setPanelHidden("dynamic-header", true);
      } else {
        setPanelHidden("main-menu", false);
        setPanelHidden("dynamic-header", false);
      }
      setPanelHidden("agent-sidebar", false);
    } else {
      setPanelHidden("agent-sidebar", true);
    }
    syncExpanded();
    return;
  }

  if (id === "main-menu") {
    if (willOpen) {
      setPanelHidden("agent-sidebar", true);
      setPanelHidden("main-menu", false);
      // Font/theme live in DHS — always open it with the menu.
      setPanelHidden("dynamic-header", false);
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

function applyRefreshResult(
  result: { status: number; data: { id?: string } },
  opts?: { rescheduleOnOk?: boolean },
): void {
  if (result.status === 200 && result.data.id) {
    void refreshAuthChrome();
    if (opts?.rescheduleOnOk) {
      scheduleSessionRefresh();
    }
    return;
  }
  // Only stop on definitive auth loss. Timeouts / 429 / 5xx must not kill the timer —
  // otherwise the access cookie expires (~15m) with no further proactive refresh.
  if (result.status === 401) {
    sessionLog("chrome.session.refresh.unauthorized", { status: result.status });
    clearSessionRefreshTimer();
    clearMeCache();
    clearSessionHint();
    resetCsrfMemory();
    void refreshAuthChrome();
    return;
  }
  if (isTransientAuthStatus(result.status)) {
    sessionLog("chrome.session.refresh.transient_keep", { status: result.status });
  }
}

/**
 * Proactive renew: probe /auth/me first. If the access cookie is still valid,
 * skip refresh-token rotation (another tab or recent activity may have renewed it).
 */
async function runProactiveSessionRenew(reason: "timer" | "visibility"): Promise<void> {
  sessionLog(reason === "timer" ? "chrome.session.timer_tick" : "chrome.visibility.refresh");
  try {
    const me = await getMe({ force: true });
    if (me.status === 200 && me.data.id) {
      sessionLog("chrome.session.skip_refresh_because_me_ok", { reason, userId: me.data.id });
      if (reason === "timer") {
        scheduleSessionRefresh();
      } else {
        void refreshAuthChrome();
        scheduleSessionRefresh();
      }
      return;
    }
    if (isTransientAuthStatus(me.status)) {
      sessionLog("chrome.session.me_probe_transient", { reason, status: me.status });
    }
  } catch {
    sessionLog("chrome.session.me_probe_error", { reason });
  }
  const result = await refreshSession();
  applyRefreshResult(result, { rescheduleOnOk: reason === "visibility" });
}

function bindSessionBroadcast(): void {
  if (sessionBroadcastUnsub) {
    return;
  }
  sessionBroadcastUnsub = subscribeSessionBroadcast(() => {
    sessionLog("chrome.session.broadcast_refreshed");
    // Another tab already rotated refresh — sync chrome only; do not post /auth/refresh again.
    void refreshAuthChrome();
  });
}

function scheduleSessionRefresh(): void {
  clearSessionRefreshTimer();
  bindSessionBroadcast();
  sessionRefreshTimer = setInterval(() => {
    void runProactiveSessionRenew("timer");
  }, SESSION_REFRESH_MS);
  if (typeof document !== "undefined" && !document.documentElement.dataset.sessionVisBound) {
    document.documentElement.dataset.sessionVisBound = "1";
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void runProactiveSessionRenew("visibility");
    });
  }
}

function isEreportConnectorNode(node: HTMLElement): boolean {
  return node.hasAttribute("data-ereport-connector-open");
}

function hideEreportConnectorNodes(nodes: HTMLElement[]) {
  for (const node of nodes) {
    node.hidden = true;
    node.removeAttribute("data-org-id");
    node.removeAttribute("data-report-id");
  }
}

/** Ignore stale overlapping refreshAuth → access fetches (prevents show/hide flash). */
let ereportConnectorGateGen = 0;
let ereportConnectorBindingCache: { orgId: string; reportId: string } | null = null;

/**
 * Connector (menu + header bug_report) visibility is owned only here — never by syncSubscriptionNav.
 * Show when: authed + ereport-connector entitlement + websiteRegistration.orgId/reportId.
 * Do NOT hide solely because sectionId/groupId are empty — Ready/quick heal on open.
 * Hide on: guest, no entitlement, or hard /ereport/access failure (non-200 / throw).
 * If already visible with a cached binding, keep showing while re-fetching (no flicker).
 */
async function syncEreportConnectorGate(authed: boolean, isAdmin = false): Promise<void> {
  const gen = ++ereportConnectorGateGen;
  const nodes = [...document.querySelectorAll("[data-ereport-connector-open]")].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
  if (nodes.length === 0) return;
  if (!authed) {
    ereportConnectorBindingCache = null;
    hideEreportConnectorNodes(nodes);
    sessionLog("chrome.ereportConnectorGate", { binding: false, entitled: false, count: nodes.length });
    return;
  }
  const alreadyShowing = Boolean(ereportConnectorBindingCache) && nodes.some((n) => !n.hidden);
  if (!alreadyShowing) {
    // First paint / was hidden: stay hidden until binding is confirmed (no entitlement flash).
    hideEreportConnectorNodes(nodes);
  }
  let entitled = isAdmin;
  if (!entitled) {
    try {
      const access = await checkServiceAccess("ereport-connector");
      entitled = Boolean(access.hasEntitlement) || Boolean(access.isAdmin);
    } catch {
      entitled = false;
    }
  }
  let binding: { orgId: string; reportId: string } | null = null;
  let accessHardFail = false;
  if (entitled) {
    try {
      const { status, data } = await fetchEreportAccess();
      if (status !== 200) {
        // Hard access failure — hide; empty section/group alone is not a hard fail.
        accessHardFail = true;
      } else {
        const wr = data.websiteRegistration;
        const orgId = (wr?.orgId || "").trim();
        const reportId = (wr?.reportId || "").trim();
        // org/report only — sectionId/groupId optional (quick/ready heal).
        if (orgId && reportId) {
          binding = { orgId, reportId };
        }
      }
    } catch {
      accessHardFail = true;
      binding = null;
    }
  }
  if (gen !== ereportConnectorGateGen) return;
  const show = entitled && Boolean(binding) && !accessHardFail;
  ereportConnectorBindingCache = show ? binding : null;
  for (const node of nodes) {
    if (!show || !binding) {
      node.hidden = true;
      node.removeAttribute("data-org-id");
      node.removeAttribute("data-report-id");
      continue;
    }
    node.hidden = false;
    node.setAttribute("data-org-id", binding.orgId);
    node.setAttribute("data-report-id", binding.reportId);
  }
  sessionLog("chrome.ereportConnectorGate", {
    binding: Boolean(binding),
    entitled,
    accessHardFail,
    count: nodes.length,
  });
}

/** Menu services stay visible; lock (grey + non-navigable) when the user lacks access. */
function setServiceNavLocked(node: HTMLElement, locked: boolean): void {
  node.hidden = false;
  if (locked) {
    node.classList.add("sidebar-nav--locked");
    node.setAttribute("aria-disabled", "true");
    node.setAttribute("tabindex", "-1");
    node.setAttribute("title", "Subscription required");
    return;
  }
  node.classList.remove("sidebar-nav--locked");
  node.removeAttribute("aria-disabled");
  node.removeAttribute("tabindex");
  if (node.getAttribute("title") === "Subscription required") {
    node.removeAttribute("title");
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
      // Connector buttons are gated separately (website registration binding).
      if (isEreportConnectorNode(node)) continue;
      setServiceNavLocked(node, false);
    }
    sessionLog("chrome.refreshAuth.services", { mode: "admin", count: nodes.length });
    return;
  }
  if (!authed) {
    for (const node of nodes) {
      if (isEreportConnectorNode(node)) continue;
      setServiceNavLocked(node, true);
    }
    sessionLog("chrome.refreshAuth.services", { mode: "guest", count: nodes.length });
    return;
  }
  const ids = [
    ...new Set(
      nodes
        .map((node) => (node.getAttribute("data-service") || "").trim().toLowerCase())
        .filter((id) => id && id !== "ereport-connector"),
    ),
  ];
  const allowed = new Map<string, boolean>();
  await Promise.all(
    ids.map(async (id) => {
      const access = await checkServiceAccess(id);
      // Homescool linked students may use `allowed` without a paid entitlement.
      // Every other service (including eVoice) needs an active subscription.
      const unlocked =
        id === "homescool"
          ? Boolean(access.allowed)
          : Boolean(access.hasEntitlement);
      allowed.set(id, unlocked);
    }),
  );
  for (const node of nodes) {
    if (isEreportConnectorNode(node)) continue;
    const id = (node.getAttribute("data-service") || "").trim().toLowerCase();
    setServiceNavLocked(node, !allowed.get(id));
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
    path.startsWith("/eoschool") ||
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
  // Timeouts / overload must not flip chrome to guest — refresh cookie may still be valid.
  if (isTransientAuthStatus(status)) {
    sessionLog("chrome.refreshAuth.transient_keep", {
      status,
      error: data.error,
      hadHint: hasSessionHint(),
      keepChrome: true,
    });
    return;
  }
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
  // Guests and admins keep marketing / full-nav links when present.
  // Plain members keep subscriptions and session links; this site has no storefront.
  // Institutes is Scrib-only (not in the general menu).
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
  await syncEreportConnectorGate(authed, isAdmin);
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

function setFooterEmailModalOpen(open: boolean): void {
  const modal = document.getElementById("footer-email-modal");
  if (!(modal instanceof HTMLElement)) return;
  modal.hidden = !open;
  if (open) {
    const copy = modal.querySelector("[data-footer-email-copy]");
    if (copy instanceof HTMLElement) copy.focus();
  }
}

function startFooterEmailModal(): void {
  const modal = document.getElementById("footer-email-modal");
  if (!(modal instanceof HTMLElement)) return;

  document.addEventListener("click", (event) => {
    const node = event.target instanceof Element ? event.target : null;
    if (!node) return;
    if (node.closest("[data-footer-email-open]")) {
      event.preventDefault();
      setFooterEmailModalOpen(modal.hidden);
      return;
    }
    if (node.closest("[data-footer-email-close]")) {
      event.preventDefault();
      setFooterEmailModalOpen(false);
      return;
    }
    if (node.closest("[data-footer-email-copy]")) {
      event.preventDefault();
      const address =
        modal.querySelector("[data-footer-email-address]")?.textContent?.trim() || "";
      if (!address) return;
      const btn = node.closest("[data-footer-email-copy]");
      void (async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(address);
          } else {
            const ta = document.createElement("textarea");
            ta.value = address;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.append(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
          }
          if (btn instanceof HTMLButtonElement) {
            const prev = btn.textContent;
            btn.textContent = "Copied";
            window.setTimeout(() => {
              btn.textContent = prev;
            }, 1500);
          }
        } catch {
          /* ignore clipboard failures */
        }
      })();
      return;
    }
    if (node === modal) {
      setFooterEmailModalOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || modal.hidden) return;
    setFooterEmailModalOpen(false);
  });
}

export function startChrome(): void {
  startClientRouting();
  exposeEreportConnectorGlobal();
  wireEreportConnectorMenu();
  document.addEventListener("eos:ereport-connector-refresh", () => {
    ereportConnectorBindingCache = null;
    void syncEreportConnectorGate(true, false);
  });
  sessionLogStorage("chrome.start");

  applyStoredPreferences();
  sessionLog("chrome.theme.restore", { storedTheme: localStorage.getItem("theme"), applied: document.documentElement.dataset.theme });
  sessionLog("chrome.font.restore", { storedFont: localStorage.getItem("root-font-size"), applied: document.documentElement.style.fontSize });

  if (!window.__chromeStarted) {
    window.__chromeStarted = true;
    startFooterEmailModal();
    document.addEventListener("eos:close-trays", () => {
      closeAllPanels();
    });
    syncShellViewportWidth();
    // Window resize / orientation only — never visualViewport (URL bar bounce).
    window.addEventListener("resize", syncShellViewportWidth);

    document.addEventListener("click", (event) => {
      const node = chromeClickTarget(event.target);
      const lockedService = node?.closest(
        "#main-menu [data-service].sidebar-nav--locked, #main-menu [data-service][aria-disabled='true']",
      );
      if (lockedService) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (node?.closest("[data-close-agent]")) {
        event.preventDefault();
        setPanelHidden("agent-sidebar", true);
        syncExpanded();
        return;
      }
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
          clearMeCache();
          await refreshAuthChrome();
          closeAllPanels();
          go("/");
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
      wireEreportConnectorMenu();
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
