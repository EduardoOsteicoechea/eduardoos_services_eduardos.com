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

Keys are created only in the signed-in UI (`/session/profile`). Never create keys from the external API.
