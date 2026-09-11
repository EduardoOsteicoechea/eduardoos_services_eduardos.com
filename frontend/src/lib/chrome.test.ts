import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMe } from "./api";
import { applySessionAvatar, refreshAuthChrome, startChrome } from "./chrome";
import { checkServiceAccess } from "./serviceAccess";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, getMe: vi.fn() };
});

vi.mock("./eostore", () => ({
  listPublicCompanies: vi.fn().mockResolvedValue({ status: 200, requestId: "rid-store", data: { companies: [] } }),
  companyIdFromPath: vi.fn().mockReturnValue(""),
}));

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
    <a href="/store" data-cart-fab>Cart</a>
    <aside id="main-menu">
      <a href="/session" data-guest-only ${guestHidden}>Sign in</a>
      <a href="/session/register" data-guest-only ${guestHidden}>Create account</a>
      <a href="/session/profile" data-authed-only ${authedHidden}>Profile</a>
      <button type="button" data-logout data-authed-only ${authedHidden}>Sign out</button>
      <a href="/about" data-full-nav>About</a>
      <a href="/contact">Contact</a>
      <a href="/store" data-store-hub-nav data-full-nav>Store</a>
      <a href="/payments/subscription">Subscriptions</a>
      <a href="/diagnostics" data-admin-only hidden>Diagnostics</a>
      <a href="/scrib" data-service="scrib" hidden>Scrib</a>
      <a href="/evoice" data-service="evoice" hidden>eVoice</a>
      <a href="/ereport" data-service="ereport" hidden>eReport</a>
      <a href="/dashboard/latin/calvins-institutes" data-authed-only data-full-nav ${authedHidden}>Institutes</a>
      <a href="/eoadmin" data-authed-only data-full-nav ${authedHidden}>eoadmin</a>
      <div data-eostore-nav data-full-nav></div>
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
    vi.clearAllMocks();
    document.body.innerHTML = "";
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

  it("hides guest session links and shows authed links after /api/auth/me", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-me",
      data: { id: "member-1", role: "admin", avatar: "/api/profile/avatar?v=44" },
    });
    await refreshAuthChrome();
    expect((document.querySelector("[data-guest-only]") as HTMLElement).hidden).toBe(true);
    expect((document.querySelector("[data-authed-only]") as HTMLElement).hidden).toBe(false);
    expect((document.querySelector("[data-admin-only]") as HTMLElement).hidden).toBe(false);
  });

  it("shows every data-service link for admins", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-admin",
      data: { id: "admin-1", role: "admin" },
    });
    await refreshAuthChrome();
    expect((document.querySelector('[data-service="scrib"]') as HTMLElement).hidden).toBe(false);
    expect((document.querySelector('[data-service="ereport"]') as HTMLElement).hidden).toBe(false);
    expect(checkServiceAccess).not.toHaveBeenCalled();
  });

  it("shows only entitled service links for members", async () => {
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
    expect((document.querySelector('[data-service="scrib"]') as HTMLElement).hidden).toBe(false);
    expect((document.querySelector('[data-service="ereport"]') as HTMLElement).hidden).toBe(true);
    expect((document.querySelector('[data-service="evoice"]') as HTMLElement).hidden).toBe(true);
  });


  it("hides full-nav links for plain non-admin members", async () => {
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
    expect((document.querySelector('[href="/about"]') as HTMLElement).hidden).toBe(true);
    expect((document.querySelector('[href="/store"]') as HTMLElement).hidden).toBe(true);
    expect((document.querySelector('[href="/eoadmin"]') as HTMLElement).hidden).toBe(true);
    expect((document.querySelector('[href="/contact"]') as HTMLElement).hidden).toBe(false);
    expect((document.querySelector('[href="/payments/subscription"]') as HTMLElement).hidden).toBe(false);
    expect((document.querySelector("[data-authed-only]") as HTMLElement).hidden).toBe(false);
  });

  it("keeps service links and Institutes hidden for guests", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 401,
      requestId: "rid-guest",
      data: { error: "unauthorized" },
    });
    await refreshAuthChrome();
    expect((document.querySelector('[data-service="scrib"]') as HTMLElement).hidden).toBe(true);
    expect((document.querySelector('[data-service="ereport"]') as HTMLElement).hidden).toBe(true);
    expect((document.querySelector('[href="/dashboard/latin/calvins-institutes"]') as HTMLElement).hidden).toBe(true);
    expect(checkServiceAccess).not.toHaveBeenCalled();
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
