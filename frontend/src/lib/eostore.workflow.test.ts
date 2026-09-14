import { describe, expect, it } from "vitest";
import {
  companyCartHref,
  companyIdFromPath,
  companyProductHref,
  companyStoreHref,
  filterProducts,
  normalizeProductStatus,
  pageSlice,
  productRefFromPath,
  productStatusLabel,
  productStockLabel,
  productStockState,
  slugifyProduct,
  sortProducts,
  validateProductInput,
  type EostoreProduct,
} from "./eostore";

function product(over: Partial<EostoreProduct>): EostoreProduct {
  return {
    guid: over.guid || Math.random().toString(36).slice(2),
    id: over.id || "p",
    company_guid: over.company_guid || "co",
    section_guid: over.section_guid || "sec",
    type_guid: over.type_guid || "typ",
    name: over.name || "Product",
    price_base_usd: over.price_base_usd ?? 10,
    discount_percent: over.discount_percent ?? 0,
    bs_per_usd: over.bs_per_usd ?? 40,
    units: over.units ?? 10,
    visible: over.visible ?? true,
    ...over,
  };
}

describe("slugifyProduct", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyProduct("Beach Towel  XL!")).toBe("beach-towel-xl");
    expect(slugifyProduct("--already--slug--")).toBe("already-slug");
    expect(slugifyProduct("")).toBe("");
  });
});

describe("status helpers", () => {
  it("normalizes unknown to draft", () => {
    expect(normalizeProductStatus("active")).toBe("active");
    expect(normalizeProductStatus("archived")).toBe("archived");
    expect(normalizeProductStatus("live")).toBe("draft");
    expect(normalizeProductStatus(undefined)).toBe("draft");
  });
  it("labels statuses", () => {
    expect(productStatusLabel("active")).toBe("Active");
    expect(productStatusLabel("archived")).toBe("Archived");
    expect(productStatusLabel("draft")).toBe("Draft");
  });
});

describe("stock helpers", () => {
  it("classifies out/low/in", () => {
    expect(productStockState(0)).toBe("out");
    expect(productStockState(3)).toBe("low");
    expect(productStockState(50)).toBe("in");
    expect(productStockLabel(0)).toBe("Out of stock");
    expect(productStockLabel(2)).toBe("Low stock");
    expect(productStockLabel(20)).toBe("In stock");
  });
});

describe("filterProducts", () => {
  const rows = [
    product({ name: "Beach Towel", id: "beach-towel", status: "active", section_guid: "s1", hashtags: ["coast"] }),
    product({ name: "Bath Mat", id: "bath-mat", status: "draft", section_guid: "s1" }),
    product({ name: "Gift Card", id: "gift-card", status: "active", section_guid: "s2", sku: "GC-1" }),
  ];
  it("filters by query across name/id/sku/hashtags", () => {
    expect(filterProducts(rows, { query: "coast" })).toHaveLength(1);
    expect(filterProducts(rows, { query: "GC-1" })).toHaveLength(1);
    expect(filterProducts(rows, { query: "mat" })).toHaveLength(1);
  });
  it("filters by status and section", () => {
    expect(filterProducts(rows, { status: "active" })).toHaveLength(2);
    expect(filterProducts(rows, { sectionGuid: "s1" })).toHaveLength(2);
  });
  it("sorts by price and stock", () => {
    const priced = [product({ name: "a", price_base_usd: 5 }), product({ name: "b", price_base_usd: 50 })];
    expect(sortProducts(priced, "price")[0].name).toBe("b");
    const stocked = [product({ name: "a", units: 1 }), product({ name: "b", units: 99 })];
    expect(sortProducts(stocked, "stock")[0].name).toBe("a");
  });
});

describe("pageSlice", () => {
  it("clamps the page and reports totals", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const first = pageSlice(items, 1, 10);
    expect(first.items).toHaveLength(10);
    expect(first.pages).toBe(3);
    expect(first.total).toBe(25);
    const last = pageSlice(items, 99, 10);
    expect(last.page).toBe(3);
    expect(last.items).toHaveLength(5);
  });
});

describe("validateProductInput", () => {
  it("accepts a well-formed product", () => {
    const errors = validateProductInput({
      type_guid: "t",
      name: "Towel",
      id: "beach-towel",
      price_base_usd: 20,
      discount_percent: 25,
      bs_per_usd: 40,
      units: 5,
      status: "active",
    });
    expect(errors).toEqual({});
  });
  it("flags bad fields", () => {
    const errors = validateProductInput({
      type_guid: "",
      name: " ",
      id: "Bad Slug!",
      price_base_usd: -1,
      discount_percent: 7,
      bs_per_usd: -2,
      units: 1.5,
      status: "live",
    });
    expect(errors.type_guid).toBeTruthy();
    expect(errors.name).toBeTruthy();
    expect(errors.id).toBeTruthy();
    expect(errors.price_base_usd).toBeTruthy();
    expect(errors.discount_percent).toBeTruthy();
    expect(errors.bs_per_usd).toBeTruthy();
    expect(errors.units).toBeTruthy();
    expect(errors.status).toBeTruthy();
  });
});

describe("storefront routes", () => {
  it("builds clean URLs", () => {
    expect(companyStoreHref("acme")).toBe("/store/acme");
    expect(companyCartHref("acme")).toBe("/store/acme/cart");
    expect(companyProductHref("acme", "beach-towel")).toBe("/store/acme/beach-towel");
  });
  it("parses company from clean and query paths", () => {
    expect(companyIdFromPath("/store/acme", "")).toBe("acme");
    expect(companyIdFromPath("/store/acme/cart", "")).toBe("acme");
    expect(companyIdFromPath("/store/company", "?id=acme")).toBe("acme");
    expect(companyIdFromPath("/articles/read", "?id=x")).toBe("");
  });
  it("parses a product reference", () => {
    expect(productRefFromPath("/store/acme/beach-towel")).toEqual({ companyId: "acme", productId: "beach-towel" });
    expect(productRefFromPath("/store/acme/cart")).toEqual({ companyId: "", productId: "" });
    expect(productRefFromPath("/store/acme")).toEqual({ companyId: "", productId: "" });
  });
});
