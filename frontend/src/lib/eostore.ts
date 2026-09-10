import {
  getJSON,
  postJSON,
  putJSON,
  deleteJSON,
  uploadFile,
  type APIErrorBody,
} from "./api";
import { mustLog } from "./dev-log";

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
  if (mustLog) console.log("eostore.product.create.start", { id: body.id, type: body.type_guid });
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

export type EostoreCatalogResponse = APIErrorBody & {
  company?: EostoreCompany;
  sections?: EostoreSection[];
  types?: EostoreType[];
  products?: EostoreProduct[];
  count?: number;
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

export function companyIdFromPath(pathname = window.location.pathname): string {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts[0] !== "store" || !parts[1] || parts[1] === "company") return "";
  return decodeURIComponent(parts[1]);
}
