# Caveats — `.ereport` connector

- Clone the connector as `.ereport/` in *your* project.
- Always `GET /api/v1/docs` before other calls.
- API POST cannot change existing issues; it only appends new `reprobado` items.
- Keys are UI-only (`/session/profile`). Owned reports only.
- Rate limit: 60 req/min/key.
- Storage is VPS filesystem, not S3, not Mongo report blobs.
- There are no flat `ownerSafe` report paths.

## Requirements

1. Entitlements: `api` + `ereport`
2. `orgId` + `reportId`
3. Secrets only in `.ereport/.env`
