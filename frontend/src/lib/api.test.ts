import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentCsrf, getCsrf, getMe, patchJSON, postJSON, resetCsrfMemory } from "./api";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("api csrf and errors", () => {
  beforeEach(() => {
    resetCsrfMemory();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetCsrfMemory();
  });

  it("fetches /api/auth/csrf with credentials and stores the token in memory", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { csrf: "token-abc" }, { "X-Request-ID": "rid-csrf-1" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getCsrf()).resolves.toBe("token-abc");
    expect(currentCsrf()).toBe("token-abc");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/csrf");
    expect(init.credentials).toBe("include");
    expect(init.method).toBe("GET");
  });

  it("does not treat 401 /api/auth/me as a csrf source", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(401, { error: "unauthorized", message: "Sign in to continue.", request_id: "rid-me-1", csrf: "should-ignore" }, { "X-Request-ID": "rid-me-1" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await getMe();
    expect(result.status).toBe(401);
    expect(result.data.error).toBe("unauthorized");
    expect(currentCsrf()).toBe("");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/me");
  });

  it("refreshes csrf before unsafe submissions and sends X-CSRF-Token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrf: "fresh-token" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { id: "member-1", email: "a@b.c" }, { "X-Request-ID": "rid-login-1" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await postJSON("/auth/login", { email: "a@b.c", password: "secret" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/csrf");
    const loginInit = fetchMock.mock.calls[1][1];
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/login");
    expect(loginInit.credentials).toBe("include");
    expect(loginInit.headers.get("X-CSRF-Token")).toBe("fresh-token");
    expect(JSON.parse(loginInit.body).password).toBe("secret");
    expect(result.requestId).toBe("rid-login-1");
  });

  it("surfaces standardized error fields from failed auth forms", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrf: "fresh-token" }))
      .mockResolvedValueOnce(
        jsonResponse(401, { error: "invalid_credentials", message: "Sign-in failed.", request_id: "rid-fail-1" }, { "X-Request-ID": "rid-fail-1" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await postJSON("/auth/login", { email: "a@b.c", password: "wrong" });
    expect(result.status).toBe(401);
    expect(result.data.error).toBe("invalid_credentials");
    expect(result.data.message).toBe("Sign-in failed.");
    expect(result.data.request_id).toBe("rid-fail-1");
    expect(JSON.stringify(result.data)).not.toMatch(/password|smtp|mongo|jwt/i);
  });

  it("initializes csrf before every auth form POST", async () => {
    const paths = [
      "/auth/login",
      "/auth/register",
      "/auth/verify-email",
      "/auth/resend-verification",
      "/auth/request-password-reset",
      "/auth/reset-password",
      "/auth/change-password",
      "/auth/logout",
    ];
    for (const path of paths) {
      resetCsrfMemory();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { csrf: `token-for-${path}` }))
        .mockResolvedValueOnce(jsonResponse(200, { ok: true }, { "X-Request-ID": "rid-form" }));
      vi.stubGlobal("fetch", fetchMock);
      await postJSON(path, { example: true });
      expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/csrf");
      expect(fetchMock.mock.calls[1][0]).toBe(`/api${path}`);
      expect(fetchMock.mock.calls[1][1].headers.get("X-CSRF-Token")).toBe(`token-for-${path}`);
    }
  });

  it("initializes csrf before profile PATCH", async () => {
    resetCsrfMemory();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrf: "token-patch" }))
      .mockResolvedValueOnce(jsonResponse(200, { username: "member" }, { "X-Request-ID": "rid-patch" }));
    vi.stubGlobal("fetch", fetchMock);
    await patchJSON("/profile", { username: "member" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/csrf");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/profile");
    expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
    expect(fetchMock.mock.calls[1][1].headers.get("X-CSRF-Token")).toBe("token-patch");
  });

  it("keeps csrf in memory only and never reads a csrf cookie", async () => {
    Object.defineProperty(document, "cookie", { configurable: true, get: () => "csrf=cookie-token; csrfbind=bind" });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { csrf: "memory-token" }));
    vi.stubGlobal("fetch", fetchMock);
    await getCsrf();
    expect(currentCsrf()).toBe("memory-token");
    expect(currentCsrf()).not.toBe("cookie-token");
  });
});
