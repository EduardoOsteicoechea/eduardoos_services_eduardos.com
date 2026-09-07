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
    <button class="header-session icon-btn" type="button" aria-label="Open session menu">
      <span class="material-symbols-outlined" data-session-icon>account_circle</span>
      <img class="header-session-photo" data-session-avatar hidden alt="" />
    </button>
    <aside id="session-menu">
      <a href="/session" data-guest-only ${guestHidden}>Sign in</a>
      <a href="/session/register" data-guest-only ${guestHidden}>Create account</a>
      <a href="/session/profile" data-authed-only ${authedHidden}>Profile</a>
      <button type="button" data-logout data-authed-only ${authedHidden}>Sign out</button>
    </aside>
    <a href="/diagnostics" data-admin-only hidden>Diagnostics</a>
  `;
}

describe("session header avatar", () => {
  beforeEach(() => {
    window.__chromeStarted = false;
    mountChrome();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
    window.__chromeStarted = false;
  });

  it("replaces the session icon with the API photo and never a /media/ URL", async () => {
    applySessionAvatar("/api/profile/avatar?v=12");
    const button = document.querySelector(".header-session") as HTMLElement;
    const photo = document.querySelector("[data-session-avatar]") as HTMLImageElement;
    const icon = document.querySelector("[data-session-icon]") as HTMLElement;
    expect(button.getAttribute("data-has-avatar")).toBe("true");
    expect(photo.hidden).toBe(false);
    expect(photo.getAttribute("src")).toBe("/api/profile/avatar?v=12");
    expect(photo.src).not.toContain("/media/");
    expect(icon.hidden).toBe(true);

    applySessionAvatar("/media/avatars/x.jpg");
    expect(button.hasAttribute("data-has-avatar")).toBe(false);
    expect(photo.hidden).toBe(true);
    expect(icon.hidden).toBe(false);
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
    expect(document.querySelector("[data-session-avatar]")?.getAttribute("src")).toBe("/api/profile/avatar?v=44");
    expect(document.querySelector(".header-session")?.getAttribute("data-has-avatar")).toBe("true");
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
      expect(document.querySelector(".header-session")?.getAttribute("data-has-avatar")).toBe("true");
    });
  });
});
