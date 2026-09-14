# eostore reference (eduardoos.com)

## Hierarchy

`Company → Section → Type → Product`. Collections:
`eostore_companies`, `eostore_sections`, `eostore_types`, `eostore_products`,
`eostore_carts`.

## Product fields

`guid` (`_id`), `id` (slug, unique per company), `name`, `description`,
`hashtags[]`, `images[]` (`id`, `key`, `content_type`, `bytes`, `alt`),
`price_base_usd`, `discount_percent` (0–100, step 5), `bs_per_usd`, `units`,
`status` (`draft|active|archived`), `visible` (derived from status), `sku`,
`seo_title`, `seo_description`, timestamps.

Derived in views: `price_final_usd`, `price_bs`, `low_stock`
(`units > 0 && units <= 5`).

## Status compatibility

- Effective status = explicit `status`, else `visible ? "active" : "draft"`.
- Effective visibility = `status == "active"`.
- Writes mirror `visible` from `status`. Public catalog, public images, cart, and
  checkout all use effective visibility.

## Admin API (session + admin; CSRF on writes)

| Method | Path |
| --- | --- |
| GET/POST | `/api/eostore/companies` |
| PUT/DELETE | `/api/eostore/companies/{guid}` |
| GET/POST | `/api/eostore/sections` (`?company_guid=`) |
| PUT/DELETE | `/api/eostore/sections/{guid}` |
| GET/POST | `/api/eostore/types` (`?company_guid=&section_guid=`) |
| PUT/DELETE | `/api/eostore/types/{guid}` |
| GET/POST | `/api/eostore/products` (`?company_guid=&section_guid=&type_guid=`) |
| GET/PUT/DELETE | `/api/eostore/products/{guid}` |
| POST | `/api/eostore/products/{guid}/images` (multipart `file`) |
| PUT | `/api/eostore/products/{guid}/images/{imageId}` body `{ "alt": "…" }` |
| PUT | `/api/eostore/products/{guid}/images/order` body `{ "image_ids": [...] }` |
| GET/DELETE | `/api/eostore/products/{guid}/images/{imageId}` |
| POST | `/api/eostore/products/{guid}/describe` body `{ "word_count": 25–1000, "image_id"?: "…" }` |

Product body also accepts: `type_guid`, `id`, `name`, `description`, `hashtags`,
`price_base_usd`, `discount_percent`, `bs_per_usd`, `units`, `visible`, `status`,
`sku`, `seo_title`, `seo_description`.

## Public API

| Method | Path |
| --- | --- |
| GET | `/api/eostore/public/companies` |
| GET | `/api/eostore/public/companies/{companyId}` |
| GET | `/api/eostore/public/companies/{companyId}/products/{productId}` |
| GET | `/api/eostore/public/products/{guid}/images/{imageId}` |
| GET/PUT | `/api/eostore/cart/{companyId}` |
| POST | `/api/eostore/cart/{companyId}/checkout` |

The PDP endpoint returns `{ company, product, related[], section_name, type_name }`.

## Frontend helpers (`lib/eostore.ts`)

- Routes: `companyStoreHref`, `companyCartHref`, `companyProductHref`,
  `companyIdFromPath`, `productRefFromPath`.
- Workflow: `slugifyProduct`, `filterProducts`, `sortProducts`, `pageSlice`,
  `validateProductInput`, `hasFieldErrors`, `productStatusLabel`,
  `normalizeProductStatus`, `productStockState`, `productStockLabel`,
  `isOnSale`, `parseHashtags`, `formatMoney`.
- API: `createProduct`, `updateProduct`, `deleteProduct`, `uploadProductImage`,
  `deleteProductImage`, `updateProductImageAlt`, `reorderProductImages`,
  `describeProduct`, `listPublicCompanies`, `getPublicCatalog`,
  `getPublicProduct`, `getCart`, `setCartItem`, `checkoutCart`.

## Nginx (static pretty URLs)

In `docs/nginx/eduardoos.com.conf`, in this order:

```nginx
location ~ ^/store/[^/]+/cart/?$ {
    try_files /store/company/cart/index.html /store/company/cart.html =404;
}
location ~ ^/store/[^/]+/[^/]+/?$ {
    try_files /store/product/index.html /store/product.html =404;
}
location ~ ^/store/[^/]+/?$ {
    try_files /store/company/index.html /store/company.html =404;
}
```

## Sitemap

`frontend/astro.config.mjs` excludes `/eostore`, `/eoadmin`, `/store/company`,
and `/store/product` (static shells). Company and product URLs are served by the
nginx rewrites and are indexed per product.

## Delete (cascade)

`DELETE` removes the whole subtree and product image files:

- company → sections + types + products
- section → types + products
- type → products

Responses report `{ sections, types, products }` removed. Missing node → `404`.
The admin UI confirms with child counts. Cascade is implemented by
`App.eostoreCascadeDelete` in `backend/eostore_http.go` (products first, then
types, then sections, then the company).

## Tests

- `backend/eostore_test.go`: admin lifecycle, status/PDP, image alt/order,
  describe requires image + admin.
- `frontend/src/lib/eostore.workflow.test.ts`: slug/validate/filter/sort/page,
  status and stock helpers, route parsing.
- `frontend/src/lib/eostore.path.test.ts`: `companyIdFromPath`.
