import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, getMe: vi.fn() };
});

vi.mock("./chrome", () => ({
  refreshAuthChrome: vi.fn(),
  applySessionAvatar: vi.fn(),
}));

vi.mock("./router", () => ({
  go: vi.fn(),
}));

import { getMe } from "./api";
import { go } from "./router";
import { applySessionAvatar } from "./chrome";
import { fillProfile, onSessionPageReady, profileAvatarURL, profilePatchBody, reportFailure, requireAuth, requireGuest, sessionCopy, setBusy, loginBodyFromForm } from "./session-ui";
import { startErrorModal } from "./error-modal";

function mountModal(): void {
  document.body.innerHTML = `
    <section data-session>
      <p data-banner></p>
    </section>
    <div id="error-modal" hidden>
      <h2 id="error-modal-title"></h2>
      <button data-error-close aria-label="Close"></button>
      <div data-error-message></div>
      <div data-error-details></div>
      <button data-error-copy-message></button>
      <button data-error-copy-details></button>
      <div data-error-debug hidden></div>
      <button data-error-copy-debug hidden></button>
    </div>
  `;
  const modal = document.getElementById("error-modal");
  if (modal) delete modal.dataset.bound;
  startErrorModal();
}

describe("session forms", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    mountModal();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("treats 401 /api/auth/me as normal guest state", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 401,
      requestId: "rid-guest",
      data: { error: "unauthorized", message: "Sign in to continue.", request_id: "rid-guest" },
    });
    const root = document.querySelector("[data-session]") as HTMLElement;
    const ok = await requireGuest(root, sessionCopy());
    expect(ok).toBe(true);
    expect(go).not.toHaveBeenCalled();
    expect(document.getElementById("error-modal")?.hidden).toBe(true);
    expect(root.querySelector("[data-banner]")?.textContent).toBe("Sign in or create an account.");
  });

  it("opens the modal for non-401 session load failures", async () => {
    vi.mocked(getMe).mockResolvedValue({
      status: 500,
      requestId: "rid-500",
      data: { error: "internal_error", message: "Something went wrong.", request_id: "rid-500" },
    });
    const root = document.querySelector("[data-session]") as HTMLElement;
    await requireGuest(root, sessionCopy());
    expect(document.getElementById("error-modal")?.hidden).toBe(false);
    expect(document.querySelector("[data-error-message]")?.textContent).toBe("Something went wrong.");
  });

  it("maps auth form failures to the safe contract and opens the modal", () => {
    const copy = sessionCopy();
    const login = reportFailure(copy, 401, { error: "invalid_credentials", message: "Sign-in failed.", request_id: "rid-login" }, "Signed in.");
    expect(login.text).toBe("Sign-in failed.");
    expect(document.querySelector("[data-error-details]")?.textContent).toContain("rid-login");

    const register = reportFailure(copy, 200, { error: undefined, message: undefined }, "If that email can be used, a verification code was sent.");
    expect(register.kind).toBe("ok");
    expect(register.text).toContain("verification");
  });

  it("reads identifier and password after setBusy without sending email or username fields", () => {
    document.body.innerHTML = `
      <form data-login>
        <input name="identifier" value="member@eduardoos.com" />
        <input name="password" value="correct-horse-battery" />
        <button type="submit">Sign in</button>
      </form>
    `;
    const form = document.querySelector("[data-login]") as HTMLFormElement;
    const body = loginBodyFromForm(form);
    setBusy(form, true);
    const afterBusy = loginBodyFromForm(form);
    expect(body).toEqual({ identifier: "member@eduardoos.com", password: "correct-horse-battery" });
    expect(afterBusy).toEqual(body);
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("username");
    expect(form.querySelector("button")?.disabled).toBe(true);
    expect((form.elements.namedItem("identifier") as HTMLInputElement).disabled).toBe(false);
  });

  it("sends display name and phone for profile save", () => {
    document.body.innerHTML = `
      <form data-profile-form>
        <input name="display_name" value=" Member One " />
        <input name="username" value="member" />
        <input name="phone" value=" +1 415 555 2671 " />
      </form>
    `;
    const form = document.querySelector("[data-profile-form]") as HTMLFormElement;
    expect(profilePatchBody(form)).toEqual({
      display_name: "Member One",
      username: "member",
      phone: "+1 415 555 2671",
    });
    (form.querySelector("[name='display_name']") as HTMLInputElement).value = "";
    (form.querySelector("[name='phone']") as HTMLInputElement).value = "";
    expect(profilePatchBody(form)).toEqual({
      display_name: null,
      username: "member",
      phone: null,
    });
  });

  it("renders the API avatar URL and never a public /media/ path", () => {
    document.body.innerHTML = `
      <section data-session>
        <p data-profile-summary></p>
        <form data-profile-form>
          <input name="display_name" />
          <input name="username" />
          <input name="phone" />
        </form>
        <img data-avatar-img hidden alt="Profile photo" />
        <p data-avatar-fallback hidden>No profile photo</p>
      </section>
    `;
    const root = document.querySelector("[data-session]") as HTMLElement;
    fillProfile(root, {
      email: "member@eduardoos.com",
      username: "member",
      display_name: "Member One",
      phone: "+14155552671",
      role: "user",
      avatar: "/api/profile/avatar?v=99",
    });
    const img = root.querySelector("[data-avatar-img]") as HTMLImageElement;
    expect(img.hidden).toBe(false);
    expect(img.getAttribute("src")).toBe("/api/profile/avatar?v=99");
    expect(img.src).toContain("/api/profile/avatar");
    expect(img.src).not.toContain("/media/");
    expect(applySessionAvatar).toHaveBeenCalledWith("/api/profile/avatar?v=99");
    expect(profileAvatarURL("/media/avatars/x.jpg")).toBeNull();
    expect(profileAvatarURL("https://evil.example/api/profile/avatar")).toBeNull();
    fillProfile(root, { username: "member", avatar: "/media/avatars/x.jpg" });
    expect(img.hidden).toBe(true);
    expect(img.getAttribute("src")).toBeNull();
    expect((root.querySelector("[data-avatar-fallback]") as HTMLElement).hidden).toBe(false);
    fillProfile(root, { username: "member", avatar: "/api/profile/avatar?v=100" });
    expect(img.getAttribute("src")).toBe("/api/profile/avatar?v=100");
  });

  it("boots a new session root after client navigation", () => {
    const seen: HTMLElement[] = [];
    onSessionPageReady((root) => seen.push(root));
    expect(seen).toHaveLength(1);
    document.body.innerHTML = `<section data-session><p data-banner>Loading session…</p></section>`;
    document.dispatchEvent(new Event("astro:after-swap"));
    expect(seen).toHaveLength(2);
    expect(seen[1].querySelector("[data-banner]")?.textContent).toBe("Loading session…");
  });

  it("does not leave Loading session when getMe throws", async () => {
    vi.mocked(getMe).mockRejectedValue(new Error("network"));
    const root = document.querySelector("[data-session]") as HTMLElement;
    const me = await requireAuth(root, sessionCopy());
    expect(me).toBeNull();
    expect(root.querySelector("[data-banner]")?.textContent).toBe("Could not load the session.");
  });
});
