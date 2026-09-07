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

`viewUrl`: `{BASE}/ereport/workspace?user={ownerSafe}&org={orgId}&report={reportId}` — `user=` is display-only.
