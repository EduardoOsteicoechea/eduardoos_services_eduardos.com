import { describe, expect, it, vi } from "vitest";
import { gateAllowsHomescool } from "./serviceAccess";

describe("serviceAccess helpers", () => {
  it("admin bypasses homescool subscription requirement", () => {
    expect(
      gateAllowsHomescool(
        { allowed: false, isAdmin: true, hasEntitlement: false, isHomescoolStudent: false },
        true,
      ),
    ).toBe(true);
  });

  it("teacher surfaces require entitlement when not admin", () => {
    expect(
      gateAllowsHomescool(
        { allowed: true, isAdmin: false, hasEntitlement: false, isHomescoolStudent: true },
        true,
      ),
    ).toBe(false);
    expect(
      gateAllowsHomescool(
        { allowed: true, isAdmin: false, hasEntitlement: true, isHomescoolStudent: false },
        true,
      ),
    ).toBe(true);
  });

  it("student learning uses allowed flag", () => {
    expect(
      gateAllowsHomescool(
        { allowed: true, isAdmin: false, hasEntitlement: false, isHomescoolStudent: true },
        false,
      ),
    ).toBe(true);
  });
});

describe("checkServiceAccess wiring", () => {
  it("maps API fields", async () => {
    vi.resetModules();
    vi.doMock("./api", () => ({
      apiRequest: vi.fn(async () => ({
        status: 200,
        requestId: "req-1",
        data: {
          allowed: true,
          is_admin: false,
          has_entitlement: true,
          is_homescool_student: false,
        },
      })),
    }));
    const { checkServiceAccess } = await import("./serviceAccess");
    const result = await checkServiceAccess("scrib");
    expect(result).toEqual({
      allowed: true,
      isAdmin: false,
      hasEntitlement: true,
      isHomescoolStudent: false,
    });
  });
});
