# eReport API reference (connector)

**Source of truth:** `GET https://eduardoos.com/api/v1/docs` (no auth).

Auth: `Authorization: Bearer eos_live_…` for `/api/v1/ereport/*`.

## Website registration + site Connector

See live catalog:

- `payloadSchema.ereport.websiteRegistration`
- `payloadSchema.ereport.webConnector.features`
- `errors.website_registration_exists`

| Surface | Behavior |
|---------|----------|
| Hub create | `purpose` / `firstReportPurpose`: `website_registration` \| `other` (default `other`) |
| Cookie access | `GET /api/ereport/access` → `websiteRegistration: { orgId, reportId, tema } \| null` |
| Site chrome | Menu **Connector** + header **bug_report** only when entitlement + binding |
| Quick modal | Add-only issues; parse `nombre` until first `.`; Config → section/group defaults |
| Advanced | `/ereport/web-connector`; save alerts on node create/save |
| CLI `.env` | `EDUARDOOS_ORG_ID` / `EDUARDOOS_REPORT_ID` → website_registration report |
| API scope | Key routes still reach **all** owned orgs/reports (UI lock only) |

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
- `POST …/groups/{groupId}/items` (new item: `nombre` and/or `incidencia` + `status: "reprobado"`; title-first OK)
- `PATCH …/items/{itemId}` (edit issue fields)

Same paths under cookie `/api/ereport/...` for the site quick modal and advanced editor.

### Web embed

- Loader: `https://eduardoos.com/ereport/embed.js`
- Theme: `https://eduardoos.com/ereport/embed-theme.css`
- Mount: `EduardoOSEreport.mount({ orgId, reportId, menuSelector })` — wide modal, session + subscription, locked report
- Session writes: `/api/ereport/orgs/{orgId}/reports/{reportId}/sections|groups|items`

`viewUrl`: `{BASE}/ereport/workspace?user={ownerSafe}&org={orgId}&report={reportId}` — `user=` is display-only.
