import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    getMe: vi.fn(),
    postJSON: vi.fn(),
    getCsrf: vi.fn().mockResolvedValue("csrf-token"),
    resetCsrfMemory: vi.fn(),
  };
});

vi.mock("./chrome", () => ({
  refreshAuthChrome: vi.fn(),
  applySessionAvatar: vi.fn(),
}));

vi.mock("./router", () => ({
  go: vi.fn(),
}));

import { getMe, postJSON } from "./api";
import { go } from "./router";
import { applySessionAvatar } from "./chrome";
import { fillProfile, onBoundPageReady, onSessionPageReady, profileAvatarURL, profilePatchBody, reportFailure, requireAuth, requireGuest, sanitizePhoneNational, sessionCopy, setBusy, loginBodyFromForm, splitE164, startProfileActions } from "./session-ui";
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

  it("reads live input values even when FormData would be empty", () => {
    document.body.innerHTML = `
      <form data-login>
        <input name="identifier" />
        <input name="password" />
        <button type="submit">Sign in</button>
      </form>
    `;
    const form = document.querySelector("[data-login]") as HTMLFormElement;
    const identifier = form.elements.namedItem("identifier") as HTMLInputElement;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    identifier.value = "autofilled@eduardoos.com";
    password.value = "autofill-password";
    expect(loginBodyFromForm(form)).toEqual({
      identifier: "autofilled@eduardoos.com",
      password: "autofill-password",
    });
  });

  it("sends display name and phone for profile save", () => {
    document.body.innerHTML = `
      <form data-profile-form>
        <input name="display_name" value=" Member One " />
        <input name="username" value="member" />
        <select name="phone_region" data-phone-region>
          <option value="+1" selected>+1</option>
        </select>
        <input name="phone_national" data-phone-national value="415 555 2671" />
      </form>
    `;
    const form = document.querySelector("[data-profile-form]") as HTMLFormElement;
    expect(profilePatchBody(form)).toEqual({
      display_name: "Member One",
      username: "member",
      phone: "+14155552671",
    });
    (form.querySelector("[name='display_name']") as HTMLInputElement).value = "";
    (form.querySelector("[name='phone_national']") as HTMLInputElement).value = "";
    expect(profilePatchBody(form)).toEqual({
      display_name: null,
      username: "member",
      phone: null,
    });
  });

  it("keeps + out of the national phone input and splits stored E.164", () => {
    const input = document.createElement("input");
    input.value = "+58-412-1234567";
    sanitizePhoneNational(input);
    expect(input.value).toBe("584121234567");
    expect(input.value).not.toContain("+");
    expect(splitE164("+584121234567")).toEqual({ region: "+58", national: "4121234567" });
    expect(splitE164("+14155552671")).toEqual({ region: "+1", national: "4155552671" });
  });

  it("renders the API avatar URL and never a public /media/ path", () => {
    document.body.innerHTML = `
      <section data-session>
        <p data-profile-summary></p>
        <form data-profile-form>
          <input name="display_name" />
          <input name="username" />
          <select name="phone_region" data-phone-region></select>
          <input name="phone_national" data-phone-national />
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
    expect((root.querySelector("[data-phone-region]") as HTMLSelectElement).value).toBe("+1");
    expect((root.querySelector("[data-phone-national]") as HTMLInputElement).value).toBe("4155552671");
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

  it("boots a new eReport hub after client navigation", () => {
    document.body.innerHTML = `<section data-ereport-hub><p data-banner>Loading session…</p></section>`;
    const seen: HTMLElement[] = [];
    onBoundPageReady("[data-ereport-hub]", (root) => seen.push(root));
    expect(seen).toHaveLength(1);
    document.body.innerHTML = `<section data-ereport-hub><p data-banner>Loading session…</p></section>`;
    document.dispatchEvent(new Event("astro:after-swap"));
    expect(seen).toHaveLength(2);
  });

  it("does not leave Loading session when getMe throws", async () => {
    vi.mocked(getMe).mockRejectedValue(new Error("network"));
    const root = document.querySelector("[data-session]") as HTMLElement;
    const me = await requireAuth(root, sessionCopy());
    expect(me).toBeNull();
    expect(root.querySelector("[data-banner]")?.textContent).toBe("Could not load the session.");
  });

  it("saves profile from the persistent layout click listener", async () => {
    const saved = {
      email: "member@eduardoos.com",
      username: "member",
      display_name: "Saved Name",
      phone: "+14155552671",
      role: "user",
    };
    vi.mocked(postJSON).mockResolvedValue({ status: 200, requestId: "rid-save", data: saved });
    vi.mocked(getMe).mockResolvedValue({ status: 200, requestId: "rid-me", data: saved });
    document.body.innerHTML = `
      <section data-session>
        <p data-banner></p>
        <form data-profile-form>
          <input name="display_name" value="Saved Name" />
          <input name="username" value="member" required minlength="3" />
          <select name="phone_region" data-phone-region>
            <option value="+1" selected>+1</option>
          </select>
          <input name="phone_national" data-phone-national value="4155552671" />
          <button type="button" data-profile-save>Save profile</button>
        </form>
      </section>
    `;
    startProfileActions();
    (document.querySelector("[data-profile-save]") as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect(postJSON).toHaveBeenCalledWith("/profile", {
        display_name: "Saved Name",
        username: "member",
        phone: "+14155552671",
      });
    });
    expect(document.querySelector("[data-banner]")?.textContent).toBe("Profile saved.");
  });

  it("signs in from the persistent layout click listener", async () => {
    vi.mocked(postJSON).mockResolvedValue({
      status: 200,
      requestId: "rid-login",
      data: { email: "member@eduardoos.com", username: "member", role: "user" },
    });
    document.body.innerHTML = `
      <section data-session>
        <p data-banner></p>
        <form data-login>
          <input name="identifier" value="member@eduardoos.com" required />
          <input name="password" value="correct-horse-battery" required minlength="8" />
          <button type="submit" data-session-login>Sign in</button>
        </form>
      </section>
    `;
    startProfileActions();
    (document.querySelector("[data-session-login]") as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect(postJSON).toHaveBeenCalledWith("/auth/login", {
        identifier: "member@eduardoos.com",
        password: "correct-horse-battery",
      });
      expect(go).toHaveBeenCalledWith("/session/profile");
    });
    expect(postJSON).toHaveBeenCalledTimes(1);
  });
});
