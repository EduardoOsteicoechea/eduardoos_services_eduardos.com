# 003 — eoadmin (payment validation + delivery)

Status: **implementation contract** (2026-09-10). Feature id: `eoadmin`. Applies to `eduardoos.com` (this repo) and `turquesa.shop` (sibling repo, same contract).

## 1. Purpose

Authenticated users submit a payment-proof image, draw SVG rectangles for amount / reference / optional date, pick an assignment option (searchable dropdown), select option-specific checkboxes with units, and add a free-text description. That creates a **purchase statement** tied to the user’s email. The API emails the site admin. Payment and fulfillment change only after an **admin** approves. Admins also run a delivery dashboard.

## 2. Persistence

All durable eoadmin records live in **MongoDB collections** (tables). Payment-proof **binary images** live under the site media root (`media/eoadmin/...`); metadata, SVG markup, and rectangle geometry live in Mongo. No product state in `localStorage`.

| Collection | Purpose |
| --- | --- |
| `eoadmin_options` | Assignable payment targets + checkbox definitions |
| `eoadmin_statements` | Purchase statements + lifecycle |

Indexes: `eoadmin_options.active`, `label`; `eoadmin_statements.user_id`, `user_email`, `status`, `updated_at`.

## 3. Status machine

| Status | Meaning |
| --- | --- |
| `pending_payment` | Ordered; payment proof not yet accepted |
| `pending_approval` | Proof submitted; waiting admin |
| `to_deliver` | Admin approved; paid / awaiting delivery |
| `delivered` | Fulfilled |
| `rejected` | Admin rejected (user may resubmit a new statement) |

Submit **with** image → `pending_approval`. Submit **without** image → `pending_payment`. Approve → `to_deliver` (+ eduardoos entitlement grant when `option.product_id` matches catalog). Deliver → `delivered`. Reject → `rejected`.

## 4. Option document

```json
{
  "_id": "…",
  "label": "Pamphlet",
  "description": "Cloud pamphlet editor",
  "product_id": "pamphlet",
  "checkboxes": [{ "id": "months", "label": "Months of access", "unit_label": "months" }],
  "active": true,
  "sort_order": 10,
  "created_at": "…",
  "updated_at": "…"
}
```

`product_id` is optional. On eduardoos approve, if `product_id` is a known catalog service, grant entitlement months from selected checkbox units (default 1 month).

## 5. Statement document

```json
{
  "_id": "…",
  "user_id": "…",
  "user_email": "user@example.com",
  "option_id": "…",
  "option_label": "Pamphlet",
  "product_id": "pamphlet",
  "items": [{ "checkbox_id": "months", "label": "Months of access", "unit_label": "months", "units": 3 }],
  "description": "…",
  "rects": {
    "amount": { "x": 0.1, "y": 0.2, "w": 0.3, "h": 0.05 },
    "reference": { "x": 0.1, "y": 0.3, "w": 0.4, "h": 0.05 },
    "date": null
  },
  "svg": "<svg …>…</svg>",
  "image_key": "eoadmin/<userId>/<statementId>.jpg",
  "image_content_type": "image/jpeg",
  "image_bytes": 12345,
  "status": "pending_approval",
  "admin_note": "",
  "approved_at": null,
  "approved_by": "",
  "delivered_at": null,
  "delivered_by": "",
  "created_at": "…",
  "updated_at": "…"
}
```

Rects are normalized to the image (0–1). Amount and reference rects are required when an image is present; date is optional. SVG is generated client-side and stored as text in Mongo.

## 6. HTTP API (session + CSRF on unsafe)

| Method | Path | Who |
| --- | --- | --- |
| `GET` | `/api/eoadmin/options` | auth; `?q=` search |
| `POST` | `/api/eoadmin/options` | admin |
| `PUT` | `/api/eoadmin/options/{id}` | admin |
| `DELETE` | `/api/eoadmin/options/{id}` | admin (soft deactivate) |
| `POST` | `/api/eoadmin/statements` | auth multipart |
| `GET` | `/api/eoadmin/statements` | user own; admin all; `?status=` |
| `GET` | `/api/eoadmin/statements/{id}` | owner or admin |
| `GET` | `/api/eoadmin/statements/{id}/image` | owner or admin |
| `POST` | `/api/eoadmin/statements/{id}/approve` | admin |
| `POST` | `/api/eoadmin/statements/{id}/reject` | admin |
| `POST` | `/api/eoadmin/statements/{id}/deliver` | admin |

On create with image, email `ADMIN_EMAIL` / bootstrap admin (no secrets, no image bytes in mail).

## 7. Frontend routes (`noindex`)

| Path | Role |
| --- | --- |
| `/eoadmin` | User submit form (image + SVG rects + option + checkboxes + description) |
| `/eoadmin/mine` | User’s statements |
| `/eoadmin/admin` | Admin queue + delivery board (pending payment / approval / to deliver / delivered) |
| `/eoadmin/admin/options` | Admin manage options |

## 8. Media

Root: `media/eoadmin/<userId>/<uuid>.{jpg|png|webp}`. Same validation rules as avatars (signature, size, edges). Private: API auth then file serve. Never rsync-delete media on deploy.

## 9. Tests

Create statement with image → `pending_approval`; approve → `to_deliver`; deliver → `delivered`; reject → `rejected`; cross-user deny; admin-only transitions; options search; no secrets in mail body.
