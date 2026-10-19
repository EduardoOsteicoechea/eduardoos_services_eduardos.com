import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMe, refreshSession } from "./api";
import { applySessionAvatar, refreshAuthChrome, startChrome } from "./chrome";
import { checkServiceAccess } from "./serviceAccess";
import { go } from "./router";

const here = dirname(fileURLToPath(import.meta.url));

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, getMe: vi.fn(), refreshSession: vi.fn() };
});

vi.mock("./serviceAccess", () => ({
  checkServiceAccess: vi.fn(),
}));

vi.mock("./router", () => ({
  go: vi.fn(),
  startClientRouting: vi.fn(),
}));

vi.mock("./error-modal", () => ({
  showErrorModal: vi.fn(),
}));

function mountChrome(options: { guestVisible?: boolean } = {}): void {
  const guestHidden = options.guestVisible === false ? "hidden" : "";
  const authedHidden = options.guestVisible === false ? "" : "hidden";
  document.body.innerHTML = `
    <aside id="main-menu">
      <a class="sidebar-nav-action" href="/session" data-guest-only ${guestHidden}>Sign in</a>
      <button class="sidebar-nav-action" type="button" data-logout data-authed-only ${authedHidden}>Log out</button>
      <a href="/contact">Contact</a>
      <a class="sidebar-nav-action" href="/payments/subscription">Subscribe</a>
      <a href="/scrib" data-service="scrib" class="sidebar-nav--locked" aria-disabled="true" tabindex="-1">Scrib</a>
      <a href="/evoice" data-service="evoice" class="sidebar-nav--locked" aria-disabled="true" tabindex="-1">eVoice</a>
      <a href="/ereport" data-service="ereport" class="sidebar-nav--locked" aria-disabled="true" tabindex="-1">eReport</a>
      <a href="/dashboard/latin/calvins-institutes" data-authed-only data-full-nav ${authedHidden}>Institutes</a>
      <a href="/admin/users" data-admin-only hidden>Users</a>
    </aside>
  `;
}

describe("main-menu session chrome", () => {
  beforeEach(() => {
    window.__chromeStarted = false;
    mountChrome();
    vi.mocked(checkServiceAccess).mockResolvedValue({
      allowed: false,
      isAdmin: false,
      hasEntitlement: false,
      isHomescoolStudent: false,
    });
  });

  afterEach(() => {
    applySessionAvatar(null);
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-session-vis-bound");
    window.history.pushState({}, "", "/");
    window.__chromeStarted = false;
  });

  it("updates the header session avatar", () => {
    document.body.innerHTML += `
      <a data-header-chrome href="/session/profile">
        <img data-header-avatar-img hidden alt="" />
        <span data-header-avatar-fallback hidden>account_circle</span>
      </a>
    `;
    applySessionAvatar("/api/profile/avatar?v=44");
    const img = document.querySelector("[data-header-avatar-img]") as HTMLImageElement;
    expect(img.hidden).toBe(false);
    expect(img.getAttribute("src")).toBe("/api/profile/avatar?v=44");
    applySessionAvatar(null);
    expect(img.hidden).toBe(true);
  });

  it("replaces the guest sign-in action with logout after /api/auth/me", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-me",
      data: { id: "member-1", role: "admin", avatar: "/api/profile/avatar?v=44" },
    });
    await refreshAuthChrome();
    expect((document.querySelector("[data-guest-only]") as HTMLElement).hidden).toBe(true);
    expect((document.querySelector("[data-authed-only]") as HTMLElement).hidden).toBe(false);
    expect((document.querySelector("[data-admin-only]") as HTMLElement).hidden).toBe(false);
    expect(document.querySelector('[href="/session/profile"]')).toBeNull();
    expect(document.querySelector('[href="/session/change-password"]')).toBeNull();
  });

  it("unlocks every data-service link for admins", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-admin",
      data: { id: "admin-1", role: "admin" },
    });
    await refreshAuthChrome();
    const scrib = document.querySelector('[data-service="scrib"]') as HTMLElement;
    const ereport = document.querySelector('[data-service="ereport"]') as HTMLElement;
    expect(scrib.hidden).toBe(false);
    expect(ereport.hidden).toBe(false);
    expect(scrib.classList.contains("sidebar-nav--locked")).toBe(false);
    expect(ereport.getAttribute("aria-disabled")).toBeNull();
    expect(checkServiceAccess).not.toHaveBeenCalled();
  });

  it("shows all services for members but locks those without a subscription", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-member",
      data: { id: "member-1", role: "user" },
    });
    vi.mocked(checkServiceAccess).mockImplementation(async (serviceId: string) => ({
      allowed: serviceId === "scrib" || serviceId === "evoice",
      isAdmin: false,
      hasEntitlement: serviceId === "scrib",
      isHomescoolStudent: false,
    }));
    await refreshAuthChrome();
    const scrib = document.querySelector('[data-service="scrib"]') as HTMLElement;
    const ereport = document.querySelector('[data-service="ereport"]') as HTMLElement;
    const evoice = document.querySelector('[data-service="evoice"]') as HTMLElement;
    expect(scrib.hidden).toBe(false);
    expect(ereport.hidden).toBe(false);
    expect(evoice.hidden).toBe(false);
    expect(scrib.classList.contains("sidebar-nav--locked")).toBe(false);
    expect(scrib.getAttribute("aria-disabled")).toBeNull();
    expect(ereport.classList.contains("sidebar-nav--locked")).toBe(true);
    expect(ereport.getAttribute("aria-disabled")).toBe("true");
    expect(evoice.classList.contains("sidebar-nav--locked")).toBe(true);
  });

  it("keeps subscriptions and session links for plain members but hides admin", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-plain",
      data: { id: "member-2", role: "user" },
    });
    vi.mocked(checkServiceAccess).mockResolvedValue({
      allowed: false,
      isAdmin: false,
      hasEntitlement: false,
      isHomescoolStudent: false,
    });
    await refreshAuthChrome();
    expect((document.querySelector('[href="/payments/subscription"]') as HTMLElement).hidden).toBe(false);
    expect((document.querySelector("[data-authed-only]") as HTMLElement).hidden).toBe(false);
    expect((document.querySelector("[data-admin-only]") as HTMLElement).hidden).toBe(true);
  });

  it("does not redirect plain members away from the subscription route", async () => {
    window.history.pushState({}, "", "/payments/subscription");
    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-plain-pay",
      data: { id: "member-3", role: "user" },
    });
    vi.mocked(checkServiceAccess).mockResolvedValue({
      allowed: false,
      isAdmin: false,
      hasEntitlement: false,
      isHomescoolStudent: false,
    });
    await refreshAuthChrome();
    expect(go).not.toHaveBeenCalledWith("/");
  });

  it("shows service links locked for guests and keeps Institutes hidden", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 401,
      requestId: "rid-guest",
      data: { error: "unauthorized" },
    });
    await refreshAuthChrome();
    const scrib = document.querySelector('[data-service="scrib"]') as HTMLElement;
    const ereport = document.querySelector('[data-service="ereport"]') as HTMLElement;
    expect(scrib.hidden).toBe(false);
    expect(ereport.hidden).toBe(false);
    expect(scrib.classList.contains("sidebar-nav--locked")).toBe(true);
    expect(ereport.getAttribute("aria-disabled")).toBe("true");
    expect((document.querySelector('[href="/dashboard/latin/calvins-institutes"]') as HTMLElement).hidden).toBe(true);
    expect(checkServiceAccess).not.toHaveBeenCalled();
  });

  it("does not demote an authed chrome state on transient getMe timeout", async () => {
    vi.mocked(getMe).mockResolvedValueOnce({
      status: 200,
      requestId: "rid-me",
      data: { id: "member-1", role: "user", avatar: "/api/profile/avatar?v=1" },
    });
    await refreshAuthChrome();
    expect((document.querySelector("[data-authed-only]") as HTMLElement).hidden).toBe(false);

    vi.mocked(getMe).mockResolvedValueOnce({
      status: 0,
      requestId: "",
      data: { error: "internal_error", message: "The request took too long. Please try again." },
    });
    await refreshAuthChrome();
    expect((document.querySelector("[data-authed-only]") as HTMLElement).hidden).toBe(false);
    expect((document.querySelector("[data-guest-only]") as HTMLElement).hidden).toBe(true);
  });

  it("skips refresh rotation when forced getMe still returns 200", async () => {
    vi.useFakeTimers();
    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-me",
      data: { id: "member-1", role: "user" },
    });
    vi.mocked(refreshSession).mockResolvedValue({
      status: 200,
      requestId: "rid-refresh",
      data: { id: "member-1", role: "user" },
    });
    await refreshAuthChrome();
    const meCallsBeforeTick = vi.mocked(getMe).mock.calls.length;
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);
    await vi.waitFor(() => {
      expect(vi.mocked(getMe).mock.calls.length).toBeGreaterThan(meCallsBeforeTick);
    });
    expect(vi.mocked(getMe).mock.calls.some((call) => call[0]?.force === true)).toBe(true);
    expect(refreshSession).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("keeps the session timer after a transient refresh failure", async () => {
    vi.useFakeTimers();
    vi.mocked(getMe)
      .mockResolvedValueOnce({
        status: 200,
        requestId: "rid-me",
        data: { id: "member-1", role: "user" },
      })
      .mockResolvedValue({
        status: 401,
        requestId: "rid-me-probe",
        data: { error: "unauthorized" },
      });
    vi.mocked(refreshSession).mockResolvedValue({
      status: 0,
      requestId: "",
      data: { error: "internal_error", message: "The request took too long. Please try again." },
    });
    await refreshAuthChrome();
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);
    await vi.waitFor(() => {
      expect(refreshSession).toHaveBeenCalled();
    });
    // Timer must still fire again — transient must not clear the interval.
    vi.mocked(refreshSession).mockClear();
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);
    await vi.waitFor(() => {
      expect(refreshSession).toHaveBeenCalled();
    });
    expect((document.querySelector("[data-authed-only]") as HTMLElement).hidden).toBe(false);
    vi.useRealTimers();
  });

  it("does not render a shopping cart control", () => {
    expect(document.querySelector("[data-cart-fab]")).toBeNull();
    expect(document.querySelector(".header-cart")).toBeNull();
  });

  it("restores session chrome after a client navigation swap", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-nav",
      data: { id: "member-1", role: "user", avatar: "/api/profile/avatar?v=8" },
    });
    startChrome();
    await vi.waitFor(() => {
      expect((document.querySelector("[data-guest-only]") as HTMLElement).hidden).toBe(true);
    });

    mountChrome({ guestVisible: true });
    document.dispatchEvent(new Event("astro:after-swap"));
    await vi.waitFor(() => {
      expect((document.querySelector("[data-guest-only]") as HTMLElement).hidden).toBe(true);
      expect((document.querySelector("[data-authed-only]") as HTMLElement).hidden).toBe(false);
    });
  });
});

describe("menu toolbar span", () => {
  beforeEach(() => {
    // Avoid stacking document click listeners across chrome tests.
    window.__chromeStarted = true;
    document.documentElement.removeAttribute("data-page");
    document.documentElement.removeAttribute("data-menu-toolbar");
    document.body.innerHTML = `
      <aside id="main-menu" class="sidebar-left" hidden>
        <header class="sidebar-toolbar"></header>
      </aside>
      <aside id="dynamic-header" class="sidebar-right" hidden></aside>
      <aside id="agent-sidebar" class="sidebar-right" hidden></aside>
    `;
    vi.mocked(getMe).mockResolvedValue({
      status: 401,
      requestId: "rid-toolbar",
      data: { error: "unauthorized" },
    });
    vi.mocked(checkServiceAccess).mockResolvedValue({
      allowed: false,
      isAdmin: false,
      hasEntitlement: false,
      isHomescoolStudent: false,
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-page");
    document.documentElement.removeAttribute("data-menu-toolbar");
    window.__chromeStarted = false;
    vi.clearAllMocks();
  });

  it("sets menu-only toolbar when there is no overlay DHS or chat", () => {
    (document.getElementById("main-menu") as HTMLElement).hidden = false;
    startChrome();
    expect(document.documentElement.dataset.menuToolbar).toBe("menu");
  });

  it("widens for global font/theme chrome in the DHS", () => {
    (document.getElementById("main-menu") as HTMLElement).hidden = false;
    const dhs = document.getElementById("dynamic-header") as HTMLElement;
    dhs.hidden = false;
    dhs.innerHTML = `<header class="sidebar-toolbar" data-dhs-chrome></header>`;
    startChrome();
    expect(document.documentElement.dataset.menuToolbar).toBe("menu-dhs");
  });

  it("keeps font/theme chrome as the first DHS row when the menu is open", () => {
    const css = readFileSync(join(here, "../styles/global.css"), "utf8");
    expect(css).toMatch(
      /#main-menu:not\(\[hidden\]\) ~ #dynamic-header:not\(\[hidden\]\) \{[^}]*padding-top: 0;/,
    );
    expect(css).not.toContain("--menu-pre-product-offset");
    expect(css).toMatch(
      /#main-menu:not\(\[hidden\]\) ~ #dynamic-header:not\(\[hidden\]\) > \.sidebar-toolbar\[data-dhs-chrome\] \+ \* \{\s*margin-top: 0;/,
    );
    expect(css).toContain("#main-menu .sidebar-toolbar::after");
    expect(css).toContain("content: none");

    (document.getElementById("main-menu") as HTMLElement).hidden = false;
    const dhs = document.getElementById("dynamic-header") as HTMLElement;
    dhs.hidden = false;
    dhs.innerHTML = `
      <header class="sidebar-toolbar" data-dhs-chrome>
        <button type="button" data-font="-">-</button>
        <button type="button" data-font="+">+</button>
        <button type="button" data-theme-toggle>theme</button>
      </header>
      <div id="header-dynamic-menu-host"></div>
    `;
    startChrome();
    expect(document.documentElement.dataset.menuToolbar).toBe("menu-dhs");
    expect(dhs.querySelectorAll("[data-font], [data-theme-toggle]").length).toBe(3);
    expect(dhs.querySelector("[data-dhs-chrome]")?.compareDocumentPosition(dhs.querySelector("#header-dynamic-menu-host")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("allows decreasing root font size down to 10px", () => {
    document.documentElement.style.fontSize = "0.875rem";
    localStorage.setItem("root-font-size", "0.875rem");
    document.body.innerHTML = `
      <button type="button" data-font="-">-</button>
      <aside id="main-menu" hidden></aside>
      <aside id="dynamic-header" hidden></aside>
      <aside id="agent-sidebar" hidden></aside>
    `;
    window.__chromeStarted = false;
    startChrome();
    const down = document.querySelector("[data-font='-']") as HTMLButtonElement;
    down.click(); // 0.875 → 0.75
    down.click(); // 0.75 → 0.625 (10px)
    down.click(); // stay at 0.625
    expect(document.documentElement.style.fontSize).toBe("0.625rem");
    expect(localStorage.getItem("root-font-size")).toBe("0.625rem");
  });

  it("widens for overlay DHS actions beside the menu", () => {
    (document.getElementById("main-menu") as HTMLElement).hidden = false;
    const dhs = document.getElementById("dynamic-header") as HTMLElement;
    dhs.hidden = false;
    dhs.innerHTML = `<button class="dhs-action" type="button">Tools</button>`;
    startChrome();
    expect(document.documentElement.dataset.menuToolbar).toBe("menu-dhs");
  });

  it("ignores Homescool fixed DHS when sizing the menu toolbar", () => {
    document.documentElement.setAttribute("data-page", "homescool-workspace");
    (document.getElementById("main-menu") as HTMLElement).hidden = false;
    const dhs = document.getElementById("dynamic-header") as HTMLElement;
    dhs.hidden = false;
    dhs.innerHTML = `<div class="homescool-dhs" data-homescool-dhs></div>`;
    startChrome();
    expect(document.documentElement.dataset.menuToolbar).toBe("menu");
  });

  it("spans agent only when Homescool chat opens beside the menu", () => {
    document.documentElement.setAttribute("data-page", "homescool-workspace");
    (document.getElementById("main-menu") as HTMLElement).hidden = false;
    const dhs = document.getElementById("dynamic-header") as HTMLElement;
    dhs.hidden = false;
    dhs.innerHTML = `<div class="homescool-dhs" data-homescool-dhs></div>`;
    (document.getElementById("agent-sidebar") as HTMLElement).hidden = false;
    startChrome();
    expect(document.documentElement.dataset.menuToolbar).toBe("menu-agent");
  });

  it("docks Homescool chat beside the menu, not past a phantom overlay DHS column", () => {
    const css = readFileSync(join(here, "../styles/homescool-workspace.css"), "utf8");
    expect(css).toMatch(
      /html\[data-page="homescool-workspace"\] #main-menu:not\(\[hidden\]\) ~ #dynamic-header:not\(\[hidden\]\) ~ #agent-sidebar \{\s*left: var\(--sidebar-width\);/,
    );
  });
});
