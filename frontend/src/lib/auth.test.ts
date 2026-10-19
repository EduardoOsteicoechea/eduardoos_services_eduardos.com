import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMeCache, clearSessionHint, resetCsrfMemory } from "./api";
import { __setAuthSessionForTests, isAuthenticated, refreshAuthSession } from "./auth";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("refreshAuthSession transient keep", () => {
  beforeEach(() => {
    resetCsrfMemory();
    clearSessionHint();
    clearMeCache();
    __setAuthSessionForTests({ ok: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetCsrfMemory();
    clearSessionHint();
    clearMeCache();
    __setAuthSessionForTests({ ok: false });
  });

  it("keeps prior sessionOk on timeout (status 0)", async () => {
    __setAuthSessionForTests({ ok: true, email: "a@b.c", role: "user" });
    expect(isAuthenticated()).toBe(true);

    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = refreshAuthSession();
    await vi.advanceTimersByTimeAsync(30000);
    const ok = await pending;
    expect(ok).toBe(true);
    expect(isAuthenticated()).toBe(true);
    vi.useRealTimers();
  });

  it("keeps prior sessionOk on 503", async () => {
    __setAuthSessionForTests({ ok: true, email: "a@b.c", role: "admin" });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(503, { error: "internal_error", message: "Unavailable." }, { "X-Request-ID": "rid-503" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const ok = await refreshAuthSession();
    expect(ok).toBe(true);
    expect(isAuthenticated()).toBe(true);
  });

  it("keeps prior sessionOk on 429", async () => {
    __setAuthSessionForTests({ ok: true, email: "a@b.c", role: "user" });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(429, { error: "rate_limited", message: "Slow down." }, { "X-Request-ID": "rid-429" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const ok = await refreshAuthSession();
    expect(ok).toBe(true);
    expect(isAuthenticated()).toBe(true);
  });

  it("demotes on definitive 401 guest", async () => {
    __setAuthSessionForTests({ ok: true, email: "a@b.c", role: "user" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: "unauthorized", message: "Sign in to continue." }))
      .mockResolvedValueOnce(jsonResponse(200, { csrf: "refresh-csrf" }))
      .mockResolvedValueOnce(jsonResponse(401, { error: "unauthorized", message: "Sign in to continue." }));
    vi.stubGlobal("fetch", fetchMock);

    const ok = await refreshAuthSession();
    expect(ok).toBe(false);
    expect(isAuthenticated()).toBe(false);
  });

  it("sets sessionOk on successful me", async () => {
    __setAuthSessionForTests({ ok: false });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { id: "member-1", email: "a@b.c", role: "user" }, { "X-Request-ID": "rid-me" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const ok = await refreshAuthSession();
    expect(ok).toBe(true);
    expect(isAuthenticated()).toBe(true);
  });
});
