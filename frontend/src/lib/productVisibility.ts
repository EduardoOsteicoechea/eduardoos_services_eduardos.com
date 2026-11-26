/**
 * Mirrors backend/catalog.go Visibility for eduardoos.com profile-mode.
 * Public products stay on marketing nav/home/subscription; the rest are admin-only.
 */

export const PUBLIC_PRODUCTS = [
  "ereport",
  "ereport-connector",
  "eoproject",
  "api",
] as const;

export type PublicProductId = (typeof PUBLIC_PRODUCTS)[number];

const PUBLIC_SET = new Set<string>(PUBLIC_PRODUCTS);

/** Paths that belong to admin-only products (no public marketing surface). */
const ADMIN_ONLY_PATH_PREFIXES = [
  "/articles",
  "/scrib",
  "/eoschool",
  "/homescool",
  "/homeschool",
  "/documents/pamphlet",
  "/evoice",
  "/emusic",
  "/eeyes",
  "/ebim",
  "/publisher",
  "/dashboard/latin",
] as const;

export function normalizeProductId(id: string): string {
  const n = id.trim().toLowerCase();
  return n === "pamphlet" ? "epam" : n;
}

export function isPublicProduct(id: string): boolean {
  return PUBLIC_SET.has(normalizeProductId(id));
}

export function isAdminOnlyProduct(id: string): boolean {
  const n = normalizeProductId(id);
  if (!n) return false;
  // Known public products are never admin-only; unknown ids stay gated by backend.
  return !isPublicProduct(n);
}

export function isAdminOnlyPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path.includes("calvins-institutes")) return true;
  return ADMIN_ONLY_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
