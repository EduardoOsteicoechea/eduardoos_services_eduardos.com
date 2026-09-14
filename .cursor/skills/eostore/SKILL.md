---
name: eostore
description: >-
  Work on the eduardoos.com eostore product catalog and storefront. Use when the
  task mentions eostore, storefront, product editor, eostore_products, product
  status/slug/gallery/alt text, cart and eoadmin checkout, store routes, or
  eostore_backend/frontend files. Covers the backend (Go) + Astro frontend
  workflow end to end, the rem/token and shared-chrome rules, and the exact
  build/test/commit path.
---

# eostore (eduardoos.com)

Admin product catalog (`/eostore`) plus a public company storefront
(`/store`, `/store/{company}`, `/store/{company}/{product}`,
`/store/{company}/cart`). Read `reference.md` for the full endpoint, field, and
file tables before editing.

## Golden rules (this workspace)

- **Rem-only lengths.** Use `--*` tokens from `frontend/src/styles/global.css`.
  No `px`/`em`/`vw`/`%` lengths. Type uses `--font-size-*`.
- **Icons** are Google Material Symbols Outlined (`<span class="material-symbols-outlined">`),
  sized with `--icon-size`.
- **Shared chrome lockstep.** Shell, tokens, rem geometry, header/sidebars, and
  the agent FAB must stay identical to the sibling sites. Brand colors/fonts stay
  in this site's `global.css` only.
- **Never log or expose secrets.** Use the `mustLog` gate and the global error
  modal (`showErrorModal`); backend uses `mustLogf` + safe error codes.
- **AI, media, auth, email are contract-only** unless the user explicitly asks.
  The eostore AI *description* endpoint already exists; do not add AI tools on
  your own.

## Where things live

Backend (`eduardoos.com/backend/`):

| File | Responsibility |
| --- | --- |
| `eostore_models.go` | Structs, validation, status/visibility helpers, `eostoreProductView` |
| `eostore_store.go` | `EostoreStore` interface + memory and Mongo implementations |
| `eostore_http.go` | Admin HTTP handlers, image upload/alt/order, describe, routes |
| `eostore_shop.go` | Public catalog, product detail, public image, cart + checkout |
| `eostore_cart.go` | Cart model/store |
| `eostore_test.go` | Backend tests (admin lifecycle, PDP, status, gallery) |

Frontend (`eduardoos.com/frontend/src/`):

| File | Responsibility |
| --- | --- |
| `lib/eostore.ts` | Types, API calls, route helpers, pure workflow helpers |
| `lib/eostore.workflow.test.ts` | Unit tests for the pure helpers |
| `lib/eostore.path.test.ts` | Route parsing tests |
| `pages/eostore/index.astro` | Admin dashboard: companies/sections/types/products + editor |
| `pages/store/index.astro` | Company hub |
| `pages/store/company/index.astro` | Company catalog |
| `pages/store/product.astro` | Product detail (PDP) + JSON-LD |
| `pages/store/company/cart.astro` | Cart + checkout |
| `styles/eostore.css` | All eostore admin/storefront styles |
| `docs/nginx/eduardoos.com.conf` | Pretty-URL rewrites for store routes |

## Clean routes (static Astro + nginx)

The frontend is `output: "static"`; arbitrary company/product pages are served
by nginx `try_files` rewrites to the static shells `store/company/index.html`,
`store/product/index.html`, and `store/company/cart/index.html`. The browser URL
stays `/store/{company}/{product}`, and page scripts read it with
`companyIdFromPath()` / `productRefFromPath()`.

**Nginx location order matters** (first regex match wins): cart →
product → company. Keep it in `docs/nginx/eduardoos.com.conf`.

## Product workflow (what "good" looks like)

1. Admin opens `/eostore` → Products tab; search/filter/sort/paginate.
2. "New product" → grouped editor (Basics, Pricing, Inventory, Publishing & SEO, Media).
3. Client validates (`validateProductInput`), then `POST /api/eostore/products`.
4. Status drives visibility: `active` is public, `draft`/`archived` are not.
5. After save, upload images; set alt text; drag/move to reorder.
6. Optionally generate the AI description from an image.
7. Storefront shows sale/stock badges and links to the PDP with `Product` JSON-LD.

## Adding or changing a field (do all of these)

1. `backend/eostore_models.go` — add the bson/json field + view mapping + validation.
2. `backend/eostore_http.go` — accept it in `eostoreProductBody` create/update.
3. `frontend/src/lib/eostore.ts` — extend the type and any helper/API call.
4. `frontend/src/pages/eostore/index.astro` — add the input and wire it into `readForm`.
5. `frontend/src/styles/eostore.css` — style with rem tokens only.
6. Tests: `backend/eostore_test.go` and `frontend/src/lib/eostore.workflow.test.ts`.
7. `docs/specs/004-eostore.md` — update the field table.

## Build, test, commit (scoped)

Run only the side(s) you touched, then commit and push this repo alone.

```powershell
# backend changed
go test ./...            # in eduardoos.com/backend

# frontend changed
npm test                 # in eduardoos.com/frontend
npm run build            # in eduardoos.com/frontend
```

- Frontend-only → run `npm test && npm run build`, skip Go.
- Backend-only → run `go test ./...`, skip Astro.
- Both → both sides.
- Then `git add` only eostore files, commit with a short why-focused message,
  and `git push origin HEAD`.
- Never commit `.env`, SMTP, Mongo URIs, JWT, or AI keys.

## Sibling site parity

`turquesa.shop` mirrors this feature with its own database, secrets, brand
colors, and copy. Functional changes to eostore must be applied to both sites in
the same turn, but **never** copy brand colors/fonts between `global.css` files.
