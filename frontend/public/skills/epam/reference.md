# EPAM API reference (connector)

Auth: `Authorization: Bearer eos_live_…` for `/api/v1/epam/*`.

Always fetch `GET /api/v1/docs` first.

## Ordered flow

1. `GET /api/v1/docs`
2. `GET /api/v1/epam/access`
3. `GET /api/v1/epam/epams` (optional list)
4. `POST /api/v1/epam/epams` — create (body = `{ "document": {…} }` or root pamphlet object)
5. `PUT /api/v1/epam/epams/{id}` — replace (`confirmOverwrite: true` required)
6. Print `viewUrl` and `articleUrl`

## URLs

- `viewUrl`: `{BASE}/documents/pamphlet/open#{epamId}`
- `articleUrl`: `{BASE}/articles/read?id={epamId}`

## Payload

Same JSON as the EPAM editor / `.epam` file (`type`: `pamphlet_single_sheet` or `pamphlet_structured_images`).
