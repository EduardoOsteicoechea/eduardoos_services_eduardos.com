# 004 — eostore (admin product catalog)

Status: implemented (2026-09-10). Admin-only catalog on `eduardoos.com` (and mirrored on `turquesa.shop`).

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
| `images` | Media under `media/eostore/<productGuid>/…` |
| `price_base_usd` | Base price |
| `discount_percent` | 0–100, step 5 |
| `bs_per_usd` | Bolívares per USD |
| `units` | Stock count |
| `visible` | Visibility flag |

Derived (API only): `price_final_usd`, `price_bs`.

## Routes

- FE admin: `/eostore` (admin session; `noindex`)
- API: `/api/eostore/companies|sections|types|products` — admin + CSRF on writes
- Image upload/get/delete under `/api/eostore/products/{guid}/images…`

## AI description

- `POST /api/eostore/products/{guid}/describe` (admin + CSRF)
- Requires at least one product image; uses DeepSeek vision (`DEEPSEEK_VISION_MODEL`, default `deepseek-v4-flash-vision-exp`) with `DEEPSEEK_API_KEY`
- Prompt context: company name, section name, product type name, product name + latest (or selected) image
- Body: `{ "word_count": 25–1000, "image_id"?: "..." }` — FE slider step 25
- Saves generated text onto `product.description`
