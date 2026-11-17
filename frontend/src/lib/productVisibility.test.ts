import { describe, expect, it } from "vitest";
import {
  isAdminOnlyPath,
  isAdminOnlyProduct,
  isPublicProduct,
  normalizeProductId,
} from "./productVisibility";

describe("productVisibility", () => {
  it("treats ereport, eoproject, and api as public", () => {
    expect(isPublicProduct("ereport")).toBe(true);
    expect(isPublicProduct("eoproject")).toBe(true);
    expect(isPublicProduct("api")).toBe(true);
    expect(isPublicProduct("ereport-connector")).toBe(true);
  });

  it("maps pamphlet alias to epam and marks it admin-only", () => {
    expect(normalizeProductId("pamphlet")).toBe("epam");
    expect(isAdminOnlyProduct("pamphlet")).toBe(true);
    expect(isAdminOnlyProduct("epam")).toBe(true);
    expect(isAdminOnlyProduct("scrib")).toBe(true);
  });

  it("detects admin-only paths", () => {
    expect(isAdminOnlyPath("/scrib")).toBe(true);
    expect(isAdminOnlyPath("/articles/read")).toBe(true);
    expect(isAdminOnlyPath("/dashboard/latin/calvins-institutes")).toBe(true);
    expect(isAdminOnlyPath("/ereport")).toBe(false);
    expect(isAdminOnlyPath("/portfolio/ereport")).toBe(false);
    expect(isAdminOnlyPath("/cv")).toBe(false);
  });
});
