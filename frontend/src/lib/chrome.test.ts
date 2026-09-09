import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMe } from "./api";
import { applySessionAvatar, refreshAuthChrome, startChrome } from "./chrome";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, getMe: vi.fn() };
});

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
      <a href="/session" data-guest-only ${guestHidden}>Sign in</a>
      <a href="/session/register" data-guest-only ${guestHidden}>Create account</a>
      <a href="/session/profile" data-authed-only ${authedHidden}>Profile</a>
      <button type="button" data-logout data-authed-only ${authedHidden}>Sign out</button>
      <a href="/diagnostics" data-admin-only hidden>Diagnostics</a>
    </aside>
  `;
}

describe("main-menu session chrome", () => {
  beforeEach(() => {
    window.__chromeStarted = false;
    mountChrome();
  });

  afterEach(() => {
    applySessionAvatar(null);
    vi.clearAllMocks();
    document.body.innerHTML = "";
    window.__chromeStarted = false;
  });

  it("updates the header session avatar", () => {
    document.body.innerHTML += `
      <a data-header-avatar href="/session/profile">
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
