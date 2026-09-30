---
name: eduardoos-ereport
description: >-
  Sync Eduardo OS eReport org reports via the public rate-limited API: open or
  edit issues on the website, get/post additive payloads with an API key, and
  ingest parseable complaints into new items. Use when the user mentions eReport,
  Issue Tracker, .ereport connector, eos_live_ keys, or org reports.
disable-model-invocation: true
---

# Eduardo OS eReport API skill

**Install location:** project sidecar **`.ereport/`** (connector repo).
**Before first run:** read [CAVEATS.md](CAVEATS.md).
**Live API contract:** always `GET /api/v1/docs` first (see [reference.md](reference.md)).

Repo: https://github.com/EduardoOsteicoechea/eduardoos-ereport-connector
Docs: https://eduardoos.com/api-docs

Storage is the VPS filesystem under `media/ereport/<ownerUserId>/`. There are no S3 paths and no flat `/api/v1/ereport/reports/{ownerSafe}/{reportId}` routes.

## Ordered flow

1. `GET /api/v1/docs`
2. `GET /api/v1/ereport/access`
3. `GET /api/v1/ereport/orgs`
4. `GET /api/v1/ereport/orgs/{orgId}/reports`
5. `GET /api/v1/ereport/orgs/{orgId}/reports/{reportId}`
6. `POST` the same report path with `{ "confirmOverwrite": true, "payload": { … } }`

API POST is additive. Do not modify or delete existing item ids. New items need non-empty `incidencia` and `status: "reprobado"`. Print `viewUrl` after a write.

## Web projects (embed)

Session + subscription (no API key paste). The host locks the modal to one report:

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

### Theme the host control

Default stylesheet: `https://eduardoos.com/ereport/embed-theme.css`. Override `--eos-ereport-*` and style `.eos-ereport-embed-menu-btn` like the host menu.

Keys are created only in the signed-in UI (`/session/profile`) for the CLI connector. The web modal does **not** ask for an API key.
