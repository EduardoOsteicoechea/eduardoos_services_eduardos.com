---
name: eduardoos-ereport
description: >-
  Sync Eduardo OS eReport org reports via the public rate-limited API: open or
  edit issues on the website, get/post additive payloads with an API key, and
  ingest parseable complaints into new items. Use when the user mentions eReport,
  Issue Tracker, .ereport connector, eos_live_ keys, website registration, or
  org reports.
disable-model-invocation: true
---

# Eduardo OS eReport API skill

**Install location:** project sidecar **`.ereport/`** (connector repo).
**Before first run:** read [CAVEATS.md](CAVEATS.md).
**Live API contract:** always `GET /api/v1/docs` first (see [reference.md](reference.md)).

Repo: https://github.com/EduardoOsteicoechea/eduardoos-ereport-connector
Docs: https://eduardoos.com/api-docs

Storage is the VPS filesystem under `media/ereport/<ownerUserId>/`. There are no S3 paths and no flat `/api/v1/ereport/reports/{ownerSafe}/{reportId}` routes.

## Website registration (site connector)

For a **site** connector (eduardoos.com menu / header / quick modal):

1. In the eReport hub, create the org/report with purpose **Website registration** (one per owner; default purpose is **Other**).
2. Cookie `GET /api/ereport/access` returns `websiteRegistration: { orgId, reportId, tema } | null`.
3. With eReport entitlement **and** that binding, the site shows **Connector** in the main menu and a **bug_report** icon left of the menu button.
4. Those controls open the **quick issue modal** (add-only list for the configured subsection). Settings stores default section + subsection in `localStorage` (`ereport.connector.defaults`). Advanced editor opens `/ereport/web-connector`.
5. Issue text: substring until the first `.` → `nombre`; remainder → `incidencia`.
6. Set `EDUARDOOS_ORG_ID` / `EDUARDOOS_REPORT_ID` in `.ereport/.env` to that report. **API key routes still allow all owned reports**; only the site UI locks to the binding.

Without a website-registration report, the site Connector stays hidden; use the hub workspace and local `.ereport` file flows.

Catalog details: `payloadSchema.ereport.websiteRegistration` and `payloadSchema.ereport.webConnector.features` in `GET /api/v1/docs`.

## Ordered flow (CLI / API key)

1. `GET /api/v1/docs`
2. `GET /api/v1/ereport/access`
3. `GET /api/v1/ereport/orgs`
4. `GET /api/v1/ereport/orgs/{orgId}/reports`
5. `GET /api/v1/ereport/orgs/{orgId}/reports/{reportId}`
6. `POST` the same report path with `{ "confirmOverwrite": true, "payload": { … } }`

API POST is additive. Do not modify or delete existing item ids. Append-mode new items need non-empty `incidencia` and `status: "reprobado"`. Granular item POST (web connector) may create with `nombre` only and fill `incidencia` later via PATCH. Print `viewUrl` after a write.

## Web projects (embed)

Session + subscription (no API key paste). Prefer locking to the website-registration report:

```html
<link rel="stylesheet" href="https://eduardoos.com/ereport/embed-theme.css" />
<script src="https://eduardoos.com/ereport/embed.js"></script>
<script>
  EduardoOSEreport.mount({
    orgId: "YOUR_ORG_ID",
    reportId: "YOUR_REPORT_ID",
    menuSelector: "#main-menu nav",
    label: "eReport",
    baseUrl: "https://eduardoos.com"
  });
</script>
```

- Opens a **wide modal** (iframe) to `/ereport/web-connector` from any page.
- User must be signed in on eduardoos.com with an active **eReport** subscription.
- Only that `orgId`/`reportId` is editable (no org/report picker when locked).
- Writes use cookie session routes under `/api/ereport/.../sections|groups|items`.
- Advanced editor alerts on section/group/item create/save.

### Theme the host control

Default stylesheet: `https://eduardoos.com/ereport/embed-theme.css`. Override `--eos-ereport-*` and style `.eos-ereport-embed-menu-btn` like the host menu.

Keys are created only in the signed-in UI (`/session/profile`) for the CLI connector. The web modal does **not** ask for an API key.
