import { describe, expect, it } from "vitest";
import {
  companyCartHref,
  companyIdFromPath,
  companyProductHref,
  companyStoreHref,
  productRefFromPath,
} from "./eostore";

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

describe("storefront hrefs", () => {
  it("builds query URLs that avoid nginx rewrites", () => {
    expect(companyStoreHref("acme")).toBe("/store/company?id=acme");
    expect(companyCartHref("acme")).toBe("/store/company/cart?id=acme");
    expect(companyProductHref("acme", "blue-ring")).toBe("/store/product?company=acme&id=blue-ring");
  });
});

describe("productRefFromPath", () => {
  it("reads the query-based product detail URL", () => {
    expect(productRefFromPath("/store/product", "?company=acme&id=blue-ring")).toEqual({
      companyId: "acme",
      productId: "blue-ring",
    });
  });

  it("still supports the legacy pretty path", () => {
    expect(productRefFromPath("/store/acme/blue-ring", "")).toEqual({
      companyId: "acme",
      productId: "blue-ring",
    });
  });

  it("ignores unrelated routes", () => {
    expect(productRefFromPath("/store/company", "?id=acme")).toEqual({ companyId: "", productId: "" });
  });
});
