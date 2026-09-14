import {
  getJSON,
  postJSON,
  putJSON,
  deleteJSON,
  uploadFile,
  type APIErrorBody,
} from "./api";
import { mustLog } from "./dev-log";

export type EostoreStatus = "draft" | "active" | "archived";

export const EOSTORE_PRODUCT_STATUSES: EostoreStatus[] = ["draft", "active", "archived"];
export const EOSTORE_LOW_STOCK = 5;

export type EostoreCompany = {
  guid: string;
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

export type EostoreSection = {
  guid: string;
  id: string;
  company_guid: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

export type EostoreType = {
  guid: string;
  id: string;
  company_guid: string;
  section_guid: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

export type EostoreImage = {
  id: string;
  content_type?: string;
  bytes?: number;
  alt?: string;
  created_at?: string;
  url?: string;
};

export type EostoreProduct = {
  guid: string;
  id: string;
  company_guid: string;
  section_guid: string;
  type_guid: string;
  name: string;
  description?: string;
  hashtags?: string[];
  images?: EostoreImage[];
  price_base_usd: number;
  discount_percent: number;
  bs_per_usd: number;
  price_final_usd?: number;
  price_bs?: number;
  units: number;
  visible: boolean;
  status?: EostoreStatus | string;
  sku?: string;
  seo_title?: string;
  seo_description?: string;
  low_stock?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type EostoreCompaniesResponse = APIErrorBody & { companies?: EostoreCompany[]; count?: number };
export type EostoreSectionsResponse = APIErrorBody & { sections?: EostoreSection[]; count?: number };
export type EostoreTypesResponse = APIErrorBody & { types?: EostoreType[]; count?: number };
export type EostoreProductsResponse = APIErrorBody & { products?: EostoreProduct[]; count?: number };
export type EostoreProductResponse = APIErrorBody & { product?: EostoreProduct };

export function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);
}

export function formatMoney(n: number | undefined): string {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toFixed(2);
}

// ---------------------------------------------------------------------------
// Pure workflow helpers (unit tested)
// ---------------------------------------------------------------------------

export function slugifyProduct(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function normalizeProductStatus(raw: string | undefined): EostoreStatus {
  return raw === "active" || raw === "archived" || raw === "draft" ? raw : "draft";
}

export function productStatusLabel(raw: string | undefined): string {
  switch (normalizeProductStatus(raw)) {
    case "active":
      return "Active";
    case "archived":
      return "Archived";
    default:
      return "Draft";
  }
}

export type ProductStockState = "out" | "low" | "in";

export function productStockState(units: number | undefined): ProductStockState {
  const n = typeof units === "number" && Number.isFinite(units) ? units : 0;
  if (n <= 0) return "out";
  if (n <= EOSTORE_LOW_STOCK) return "low";
  return "in";
}

export function productStockLabel(units: number | undefined): string {
  switch (productStockState(units)) {
    case "out":
      return "Out of stock";
    case "low":
      return "Low stock";
    default:
      return "In stock";
  }
}

export function isOnSale(p: Pick<EostoreProduct, "discount_percent">): boolean {
  return Number(p.discount_percent) > 0;
}

export type ProductSortKey = "recent" | "name" | "price" | "stock";

export type ProductFilter = {
  query?: string;
  companyGuid?: string;
  sectionGuid?: string;
  typeGuid?: string;
  status?: string;
  sort?: ProductSortKey;
};

function productHaystack(p: EostoreProduct): string {
  return [p.name, p.id, p.sku, ...(p.hashtags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterProducts(products: EostoreProduct[], filter: ProductFilter): EostoreProduct[] {
  const q = (filter.query || "").trim().toLowerCase();
  const out = products.filter((p) => {
    if (filter.companyGuid && p.company_guid !== filter.companyGuid) return false;
    if (filter.sectionGuid && p.section_guid !== filter.sectionGuid) return false;
    if (filter.typeGuid && p.type_guid !== filter.typeGuid) return false;
    if (filter.status && filter.status !== "all" && normalizeProductStatus(p.status) !== filter.status) return false;
    if (q && !productHaystack(p).includes(q)) return false;
    return true;
  });
  return sortProducts(out, filter.sort || "recent");
}

export function sortProducts(products: EostoreProduct[], sort: ProductSortKey): EostoreProduct[] {
  const copy = [...products];
  switch (sort) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "price":
      return copy.sort((a, b) => (b.price_final_usd ?? b.price_base_usd) - (a.price_final_usd ?? a.price_base_usd));
    case "stock":
      return copy.sort((a, b) => a.units - b.units);
    case "recent":
    default:
      return copy.sort((a, b) => (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || ""));
  }
}

export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageSlice<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; pages: number; total: number } {
  const total = items.length;
  const pages = pageCount(total, pageSize);
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, pages, total };
}

export type ProductInput = {
  type_guid?: string;
  id?: string;
  name?: string;
  description?: string;
  price_base_usd?: number;
  discount_percent?: number;
  bs_per_usd?: number;
  units?: number;
  status?: string;
  sku?: string;
  seo_title?: string;
  seo_description?: string;
};

export type ProductFieldErrors = Record<string, string>;

const PRODUCT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateProductInput(input: ProductInput): ProductFieldErrors {
  const errors: ProductFieldErrors = {};
  if (!(input.type_guid || "").trim()) errors.type_guid = "Choose a product type.";
  if (!(input.name || "").trim()) errors.name = "Name is required.";
  const slug = (input.id || "").trim();
  if (slug && !PRODUCT_SLUG_RE.test(slug)) {
    errors.id = "Use lowercase letters, numbers, and single hyphens.";
  }
  const price = input.price_base_usd;
  if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
    errors.price_base_usd = "Price must be 0 or more.";
  }
  const discount = input.discount_percent ?? 0;
  if (!Number.isFinite(discount) || discount < 0 || discount > 100 || discount % 5 !== 0) {
    errors.discount_percent = "Discount must be 0–100 in steps of 5.";
  }
  const bs = input.bs_per_usd;
  if (typeof bs !== "number" || Number.isNaN(bs) || bs < 0) {
    errors.bs_per_usd = "Bs per USD must be 0 or more.";
  }
  const units = input.units ?? 0;
  if (!Number.isInteger(units) || units < 0) {
    errors.units = "Units must be a whole number 0 or more.";
  }
  const status = (input.status || "").trim();
  if (status && !EOSTORE_PRODUCT_STATUSES.includes(status as EostoreStatus)) {
    errors.status = "Unknown status.";
  }
  return errors;
}

export function hasFieldErrors(errors: ProductFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ---------------------------------------------------------------------------
// Admin catalog API
// ---------------------------------------------------------------------------

export async function listCompanies() {
  return getJSON<EostoreCompaniesResponse>("/eostore/companies");
}

export async function createCompany(body: Record<string, unknown>) {
  return postJSON<EostoreCompaniesResponse & { company?: EostoreCompany }>("/eostore/companies", body);
}

export async function updateCompany(guid: string, body: Record<string, unknown>) {
  return putJSON<{ company?: EostoreCompany } & APIErrorBody>(`/eostore/companies/${guid}`, body);
}

export async function deleteCompany(guid: string) {
  return deleteJSON(`/eostore/companies/${guid}`);
}

export async function listSections(companyGuid = "") {
  const qs = companyGuid ? `?company_guid=${encodeURIComponent(companyGuid)}` : "";
  return getJSON<EostoreSectionsResponse>(`/eostore/sections${qs}`);
}

export async function createSection(body: Record<string, unknown>) {
  return postJSON<EostoreSectionsResponse & { section?: EostoreSection }>("/eostore/sections", body);
}

export async function updateSection(guid: string, body: Record<string, unknown>) {
  return putJSON<{ section?: EostoreSection } & APIErrorBody>(`/eostore/sections/${guid}`, body);
}

export async function deleteSection(guid: string) {
  return deleteJSON(`/eostore/sections/${guid}`);
}

export async function listTypes(companyGuid = "", sectionGuid = "") {
  const params = new URLSearchParams();
  if (companyGuid) params.set("company_guid", companyGuid);
  if (sectionGuid) params.set("section_guid", sectionGuid);
  const qs = params.toString();
  return getJSON<EostoreTypesResponse>(`/eostore/types${qs ? `?${qs}` : ""}`);
}

export async function createType(body: Record<string, unknown>) {
  return postJSON<EostoreTypesResponse & { type?: EostoreType }>("/eostore/types", body);
}

export async function updateType(guid: string, body: Record<string, unknown>) {
  return putJSON<{ type?: EostoreType } & APIErrorBody>(`/eostore/types/${guid}`, body);
}

export async function deleteType(guid: string) {
  return deleteJSON(`/eostore/types/${guid}`);
}

export async function listProducts(filters: { company_guid?: string; section_guid?: string; type_guid?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.company_guid) params.set("company_guid", filters.company_guid);
  if (filters.section_guid) params.set("section_guid", filters.section_guid);
  if (filters.type_guid) params.set("type_guid", filters.type_guid);
  const qs = params.toString();
  return getJSON<EostoreProductsResponse>(`/eostore/products${qs ? `?${qs}` : ""}`);
}

export async function createProduct(body: Record<string, unknown>) {
  if (mustLog) console.log("eostore.product.create.start", { id: body.id, type: body.type_guid, status: body.status });
  return postJSON<EostoreProductResponse>("/eostore/products", body);
}

export async function updateProduct(guid: string, body: Record<string, unknown>) {
  return putJSON<EostoreProductResponse>(`/eostore/products/${guid}`, body);
}

export async function deleteProduct(guid: string) {
  return deleteJSON(`/eostore/products/${guid}`);
}

export async function uploadProductImage(guid: string, file: File) {
  if (mustLog) console.log("eostore.product.image.upload", { guid, name: file.name, size: file.size });
  return uploadFile<EostoreProductResponse>(`/eostore/products/${guid}/images`, file);
}

export async function deleteProductImage(guid: string, imageId: string) {
  return deleteJSON<EostoreProductResponse>(`/eostore/products/${guid}/images/${imageId}`);
}

export async function updateProductImageAlt(guid: string, imageId: string, alt: string) {
  return putJSON<EostoreProductResponse>(`/eostore/products/${guid}/images/${imageId}`, { alt });
}

export async function reorderProductImages(guid: string, imageIds: string[]) {
  return putJSON<EostoreProductResponse>(`/eostore/products/${guid}/images/order`, { image_ids: imageIds });
}

export type EostoreDescribeResponse = EostoreProductResponse & {
  description?: string;
  word_count?: number;
  image_id?: string;
};

export async function describeProduct(guid: string, wordCount: number, imageId = "") {
  if (mustLog) console.log("eostore.product.describe.start", { guid, wordCount, imageId });
  const body: Record<string, unknown> = { word_count: wordCount };
  if (imageId) body.image_id = imageId;
  // Vision can take well over the default 12s API timeout.
  return postJSON<EostoreDescribeResponse>(`/eostore/products/${guid}/describe`, body, { timeoutMs: 120000 });
}

// ---------------------------------------------------------------------------
// Public storefront API
// ---------------------------------------------------------------------------

export type EostoreCatalogResponse = APIErrorBody & {
  company?: EostoreCompany;
  sections?: EostoreSection[];
  types?: EostoreType[];
  products?: EostoreProduct[];
  count?: number;
};

export type EostoreProductDetailResponse = APIErrorBody & {
  company?: EostoreCompany;
  product?: EostoreProduct;
  related?: EostoreProduct[];
  section_name?: string;
  type_name?: string;
};

export type EostoreCartLine = {
  product_guid: string;
  product_id: string;
  name: string;
  units: number;
  max_units: number;
  unit_price_usd: number;
  line_total_usd: number;
  line_total_bs: number;
  visible?: boolean;
  image_url?: string;
};

export type EostoreCart = {
  company_guid: string;
  items: EostoreCartLine[];
  count: number;
  total_usd: number;
  total_bs: number;
  updated_at?: string;
};

export type EostoreCartResponse = APIErrorBody & {
  cart?: EostoreCart;
  company?: EostoreCompany;
};

export type EostoreCheckoutResponse = APIErrorBody & {
  statement_id?: string;
  redirect?: string;
};

export async function listPublicCompanies() {
  return getJSON<EostoreCompaniesResponse>("/eostore/public/companies");
}

export async function getPublicCatalog(companyId: string) {
  return getJSON<EostoreCatalogResponse>(`/eostore/public/companies/${encodeURIComponent(companyId)}`);
}

export async function getPublicProduct(companyId: string, productId: string) {
  return getJSON<EostoreProductDetailResponse>(
    `/eostore/public/companies/${encodeURIComponent(companyId)}/products/${encodeURIComponent(productId)}`,
  );
}

export async function getCart(companyId: string) {
  return getJSON<EostoreCartResponse>(`/eostore/cart/${encodeURIComponent(companyId)}`);
}

export async function setCartItem(companyId: string, productGuid: string, units: number) {
  if (mustLog) console.log("eostore.cart.put", { companyId, productGuid, units });
  return putJSON<EostoreCartResponse>(`/eostore/cart/${encodeURIComponent(companyId)}`, {
    product_guid: productGuid,
    units,
  });
}

export async function checkoutCart(companyId: string, description = "") {
  if (mustLog) console.log("eostore.cart.checkout", { companyId });
  return postJSON<EostoreCheckoutResponse>(`/eostore/cart/${encodeURIComponent(companyId)}/checkout`, {
    description,
  });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** Resolve company id from a storefront path or query string. */
export function companyIdFromPath(
  pathname = window.location.pathname,
  search = window.location.search,
): string {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "store" || !parts[1]) return "";
  // Preferred: /store/company?id=... or /store/company/cart?id=...
  if (parts[1] === "company") {
    return new URLSearchParams(search).get("id")?.trim() || "";
  }
  // Clean path: /store/{company} or /store/{company}/cart
  return decodeURIComponent(parts[1]);
}

/** Resolve company + product ids from a product detail path. */
export function productRefFromPath(
  pathname = window.location.pathname,
): { companyId: string; productId: string } {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "store" || parts.length < 3) return { companyId: "", productId: "" };
  const companyId = decodeURIComponent(parts[1]);
  const productId = decodeURIComponent(parts[2]);
  if (!companyId || !productId || productId === "cart" || productId === "company") {
    return { companyId: "", productId: "" };
  }
  return { companyId, productId };
}

/** Clean, stable storefront URLs served by nginx rewrites to the static shells. */
export function companyStoreHref(companyId: string): string {
  return `/store/${encodeURIComponent(companyId)}`;
}

export function companyCartHref(companyId: string): string {
  return `/store/${encodeURIComponent(companyId)}/cart`;
}

export function companyProductHref(companyId: string, productId: string): string {
  return `/store/${encodeURIComponent(companyId)}/${encodeURIComponent(productId)}`;
}
