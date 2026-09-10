import { describe, expect, it, vi } from "vitest";

describe("preferences API helpers", () => {
  it("getPreference returns null on 404", async () => {
    vi.resetModules();
    vi.doMock("./api", () => ({
      apiRequest: vi.fn(async () => ({
        status: 404,
        requestId: "r1",
        data: { error: "not_found", message: "missing" },
      })),
    }));
    const { getPreference } = await import("./preferences");
    const result = await getPreference<string>("pamphlet.lastEpamId");
    expect(result.value).toBeNull();
    expect(result.status).toBe(404);
  });

  it("putPreference posts value body", async () => {
    vi.resetModules();
    const apiRequest = vi.fn(async (_path: string, init?: RequestInit) => {
      expect(init?.method).toBe("PUT");
      expect(String(init?.body)).toContain("\"value\"");
      return { status: 200, requestId: "r2", data: { key: "scrib.institutesNav", value: { book: "1" } } };
    });
    vi.doMock("./api", () => ({ apiRequest }));
    const { putPreference } = await import("./preferences");
    const result = await putPreference("scrib.institutesNav", { book: "1" });
    expect(result.ok).toBe(true);
    expect(apiRequest).toHaveBeenCalledOnce();
  });

  it("does not touch localStorage for product prefs", async () => {
    vi.resetModules();
    vi.doMock("./api", () => ({
      apiRequest: vi.fn(async () => ({
        status: 200,
        requestId: "r3",
        data: { key: "pamphlet.lastEpamId", value: "abc" },
      })),
    }));
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { putPreference } = await import("./preferences");
    await putPreference("pamphlet.lastEpamId", "abc");
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
