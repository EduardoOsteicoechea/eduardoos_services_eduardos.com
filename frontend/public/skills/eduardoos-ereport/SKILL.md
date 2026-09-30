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

When the consumer project is a website, mount the hosted loader (API key = eduardoos.com `eos_live_…`):

```html
<link rel="stylesheet" href="https://eduardoos.com/ereport/embed-theme.css" />
<script src="https://eduardoos.com/ereport/embed.js"></script>
<script>
  EduardoOSEreport.mount({
    apiKey: "eos_live_…",
    menuSelector: "#main-menu nav",
    label: "eReport",
    baseUrl: "https://eduardoos.com"
  });
</script>
```

- Adds a button to the host global menu (`menuSelector`). If the selector is missing, a floating control is used.
- Opens an iframe modal at `/ereport/web-connector` (same-origin to the API — no CORS wildcard).
- Cascading UI: org → report → section (concept = `productHistory`) → subsection → issue form.
- Granular writes: `POST`/`PATCH` under `/api/v1/ereport/orgs/{orgId}/reports/{reportId}/sections|…/groups|…/items` (see live docs). Does **not** change append/replace.

### Theme the host control (required for a polished site)

Default stylesheet: `https://eduardoos.com/ereport/embed-theme.css`.

1. Prefer loading that CSS (or let `embed.js` inject it).
2. **Override `--eos-ereport-*` variables** with the host brand tokens (colors, font, radius).
3. Style `.eos-ereport-embed-menu-btn` like the other links in the host global menu (same padding, font-size, icon treatment). Do not leave the default FAB look when a menu exists.
4. Keep rem lengths; match the host chrome so the control does not look foreign.

Example:

```css
:root {
  --eos-ereport-font: var(--font-family);
  --eos-ereport-bg: var(--color-bg);
  --eos-ereport-surface: var(--color-surface);
  --eos-ereport-text: var(--color-text);
  --eos-ereport-muted: var(--color-muted);
  --eos-ereport-border: var(--color-border);
  --eos-ereport-accent: var(--color-accent);
  --eos-ereport-button-bg: var(--color-button-bg);
  --eos-ereport-button-fg: var(--color-button-fg);
  --eos-ereport-radius: var(--border-radius);
}

#main-menu .eos-ereport-embed-menu-btn {
  /* mirror #main-menu a */
  width: 100%;
  padding: 0.375rem 1rem;
  font-size: var(--font-size-sm);
}
```

Keys are created only in the signed-in UI (`/session/profile`). Never create keys from the external API.
