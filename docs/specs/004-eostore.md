# 004 — eostore (product catalog + storefront)

Status: implemented. Admin-only catalog on `eduardoos.com` (and mirrored on `turquesa.shop`).
Updated 2026-09-14 with the professional product workflow (status, SEO, gallery, PDP).

## Hierarchy

1. **Company** (`eostore_companies`)
2. **Section** (`eostore_sections`) — belongs to a company
3. **Type** (`eostore_types`) — belongs to a section
4. **Product** (`eostore_products`) — belongs to a type

## Product fields

| Field | Notes |
| --- | --- |
| `guid` | Auto-generated opaque id (`_id`) |
| `id` | User-friendly slug (unique per company) |
| `name`, `description`, `hashtags` | Catalog copy |
| `images` | Media under `media/eostore/<productGuid>/…`; each carries optional `alt` |
| `price_base_usd` | Base price |
| `discount_percent` | 0–100, step 5 |
| `bs_per_usd` | Bolívares per USD |
| `units` | Stock count |
| `status` | `draft` \| `active` \| `archived` (additive) |
| `visible` | Legacy visibility flag; derived and kept in sync with `status` |
| `sku` | Optional stock-keeping unit |
| `seo_title`, `seo_description` | Optional per-product SEO copy |

Derived (API only): `price_final_usd`, `price_bs`, `low_stock`.

### Status compatibility

`status` is additive. A document without `status` derives it from `visible`:
`visible: true` → `active`, otherwise → `draft`. Effective visibility is
`status == "active"`; writes mirror `visible` from `status`. Public catalog and
cart/checkout only accept effectively-visible products.

## Image handling

- Upload: `POST /api/eostore/products/{guid}/images` (jpg/png/webp, ≤ 8 MiB, ≤ 4096 px edge, max 12).
- Alt text: `PUT /api/eostore/products/{guid}/images/{imageId}` body `{ "alt": "…" }`.
- Reorder: `PUT /api/eostore/products/{guid}/images/order` body `{ "image_ids": ["…"] }`
  (must be an exact permutation of current image ids; first id is primary).
- Delete: `DELETE /api/eostore/products/{guid}/images/{imageId}`.

## Routes

- FE admin: `/eostore` (admin session; `noindex`) — editor with status, validation,
  unsaved-changes guard, duplicate, gallery reorder/alt, search/filter/sort/pagination.
- FE storefront (clean paths, nginx-rewritten to static shells):
  - `/store` — company hub
  - `/store/{company}` — catalog
  - `/store/{company}/{product}` — product detail
  - `/store/{company}/cart` — cart
- API: `/api/eostore/companies|sections|types|products` — admin + CSRF on writes
- Image upload/get/delete under `/api/eostore/products/{guid}/images…`

## Public API

- `GET /api/eostore/public/companies`
- `GET /api/eostore/public/companies/{companyId}` — sections, types, active products
- `GET /api/eostore/public/companies/{companyId}/products/{productId}` — product detail,
  `related` (same section, max 8), `section_name`, `type_name`
- `GET /api/eostore/public/products/{guid}/images/{imageId}` — only active products
- Cart: `GET/PUT /api/eostore/cart/{companyId}`, `POST …/checkout`

## AI description

- `POST /api/eostore/products/{guid}/describe` (admin + CSRF)
- Requires at least one product image; uses DeepSeek vision (`DEEPSEEK_VISION_MODEL`,
  default `deepseek-v4-flash-vision-exp`) with `DEEPSEEK_API_KEY`
- Prompt context: company name, section name, product type name, product name + latest
  (or selected) image
- Body: `{ "word_count": 25–1000, "image_id"?: "…" }` — FE slider step 25
- Saves generated text onto `product.description`

## SEO

Product detail pages emit `Product` JSON-LD (`name`, `image[]`, `description`, `sku`,
`brand`, `offers` with `price`, `priceCurrency: USD`, `availability`, `url`) and set
document title/meta client-side. The static shell pages `/store/company` and
`/store/product` are excluded from the sitemap; company/product pages are served by
nginx rewrites and indexed per product.
