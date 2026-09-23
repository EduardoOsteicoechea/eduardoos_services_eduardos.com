# Reference — Homescool materials API

Prefer the live catalog over this snapshot.

## Ordered flow

1. `GET /api/v1/docs` (no key)
2. `GET /api/v1/homescool/access` (Bearer)
3. Optional `GET /api/v1/homescool/materials?cycle=3`
4. Generate US Letter HTML locally (MATERIALS/TEMPLATES)
5. `POST /api/v1/homescool/materials` with `confirmOverwrite: true`
6. Optional `DELETE /api/v1/homescool/materials/{materialId}` to remove an owned material
7. Print `viewUrl`

## Auth

```
Authorization: Bearer eos_live_…
```

Entitlements: `api` + `homescool` (admin bypasses).

## POST body (snapshot)

```json
{
  "confirmOverwrite": true,
  "material": {
    "cycle": 3,
    "week": 1,
    "subject": "idiomas",
    "day": 1,
    "sessionDate": "YYYY-MM-DD",
    "title": "…",
    "slug": "optional-kebab",
    "html": "<!DOCTYPE html>…"
  }
}
```

Logical upsert key: owner + cycle + week + subject + day + slug.

Server rewrites `../../../../web_assets/` links to `/api/homescool/web-assets/…`.
