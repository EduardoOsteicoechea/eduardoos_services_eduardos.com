import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMe } from "./api";
import { applySessionAvatar, refreshAuthChrome } from "./chrome";

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

describe("session header avatar", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button class="header-session icon-btn" type="button" aria-label="Open session menu">
        <span class="material-symbols-outlined" data-session-icon>account_circle</span>
        <img class="header-session-photo" data-session-avatar hidden alt="" />
      </button>
    `;
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("paints the API avatar on the session button and never a /media/ URL", async () => {
    applySessionAvatar("/api/profile/avatar?v=12");
    const photo = document.querySelector("[data-session-avatar]") as HTMLImageElement;
    const icon = document.querySelector("[data-session-icon]") as HTMLElement;
    expect(photo.hidden).toBe(false);
    expect(photo.getAttribute("src")).toBe("/api/profile/avatar?v=12");
    expect(photo.src).not.toContain("/media/");
    expect(icon.hidden).toBe(true);

    applySessionAvatar("/media/avatars/x.jpg");
    expect(photo.hidden).toBe(true);
    expect(icon.hidden).toBe(false);

    vi.mocked(getMe).mockResolvedValue({
      status: 200,
      requestId: "rid-me",
      data: { id: "member-1", role: "user", avatar: "/api/profile/avatar?v=44" },
    });
    await refreshAuthChrome();
    expect(photo.getAttribute("src")).toBe("/api/profile/avatar?v=44");
  });
});
