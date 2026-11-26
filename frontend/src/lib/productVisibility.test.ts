import { describe, expect, it } from "vitest";
import {
  isAdminOnlyPath,
  isAdminOnlyProduct,
  isPublicProduct,
  normalizeProductId,
} from "./productVisibility";

describe("productVisibility", () => {
  it("treats ereport, api, eSchool, and eBim as public", () => {
    expect(isPublicProduct("ereport")).toBe(true);
    expect(isPublicProduct("api")).toBe(true);
    expect(isPublicProduct("homescool")).toBe(true);
    expect(isPublicProduct("ebim")).toBe(true);
    expect(isPublicProduct("eoproject")).toBe(false);
    expect(isPublicProduct("ereport-connector")).toBe(false);
  });

  it("maps pamphlet alias to epam and marks it admin-only", () => {
    expect(normalizeProductId("pamphlet")).toBe("epam");
    expect(isAdminOnlyProduct("pamphlet")).toBe(true);
    expect(isAdminOnlyProduct("epam")).toBe(true);
    expect(isAdminOnlyProduct("scrib")).toBe(true);
    expect(isAdminOnlyProduct("homescool")).toBe(false);
    expect(isAdminOnlyProduct("ebim")).toBe(false);
    expect(isAdminOnlyProduct("eoproject")).toBe(true);
    expect(isAdminOnlyProduct("ereport-connector")).toBe(true);
  });

  it("detects admin-only paths", () => {
    expect(isAdminOnlyPath("/scrib")).toBe(true);
    expect(isAdminOnlyPath("/articles/read")).toBe(true);
    expect(isAdminOnlyPath("/dashboard/latin/calvins-institutes")).toBe(true);
    expect(isAdminOnlyPath("/eoproject")).toBe(true);
    expect(isAdminOnlyPath("/ereport")).toBe(false);
    expect(isAdminOnlyPath("/portfolio/ereport")).toBe(false);
    expect(isAdminOnlyPath("/ebim")).toBe(false);
    expect(isAdminOnlyPath("/eoschool")).toBe(false);
    expect(isAdminOnlyPath("/cv")).toBe(false);
  });
});
