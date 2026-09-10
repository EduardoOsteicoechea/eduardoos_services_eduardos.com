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
