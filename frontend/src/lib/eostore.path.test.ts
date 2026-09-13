import { describe, expect, it } from "vitest";
import { companyIdFromPath } from "./eostore";

describe("companyIdFromPath", () => {
  it("reads ?id= only on /store/company routes", () => {
    expect(companyIdFromPath("/store/company", "?id=acme")).toBe("acme");
    expect(companyIdFromPath("/store/company/cart", "?id=acme")).toBe("acme");
  });

  it("ignores ?id= on non-store pages (e.g. articles)", () => {
    expect(companyIdFromPath("/articles/read", "?id=a02a4eed-b86c-4e64-98f3-06b1f022f0c3")).toBe("");
    expect(companyIdFromPath("/", "?id=a02a4eed-b86c-4e64-98f3-06b1f022f0c3")).toBe("");
  });

  it("supports legacy /store/{id} paths", () => {
    expect(companyIdFromPath("/store/acme", "")).toBe("acme");
    expect(companyIdFromPath("/store/acme/cart", "")).toBe("acme");
  });
});
