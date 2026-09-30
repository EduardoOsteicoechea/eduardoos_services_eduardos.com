# eReport API reference (connector)

**Source of truth:** `GET https://eduardoos.com/api/v1/docs` (no auth).

Auth: `Authorization: Bearer eos_live_…` for `/api/v1/ereport/*`.

## Ordered flow

1. `GET /api/v1/docs`
2. `GET /api/v1/ereport/access`
3. `GET /api/v1/ereport/orgs`
4. `GET /api/v1/ereport/orgs/{orgId}/reports`
5. `GET /api/v1/ereport/orgs/{orgId}/reports/{reportId}`
6. `POST /api/v1/ereport/orgs/{orgId}/reports/{reportId}`
   Body: `{ "confirmOverwrite": true, "payload": { }, "tema"?: "…" }`

Server **merges** additively. Existing item ids cannot change.

### Granular nodes (web connector)

Create/update one node without append/replace:

- `POST …/reports/{reportId}/sections`
- `PATCH …/sections/{sectionId}` (`title`, `kind`, `productHistory`)
- `POST …/sections/{sectionId}/groups`
- `PATCH …/groups/{groupId}` (`title`, `productHistory`)
- `POST …/groups/{groupId}/items` (new item: `incidencia` + `status: "reprobado"`)
- `PATCH …/items/{itemId}` (edit issue fields)

### Web embed

`https://eduardoos.com/ereport/embed.js` → `EduardoOSEreport.mount({ apiKey, menuSelector })` opens `/ereport/web-connector` in an iframe.

`viewUrl`: `{BASE}/ereport/workspace?user={ownerSafe}&org={orgId}&report={reportId}` — `user=` is display-only.
