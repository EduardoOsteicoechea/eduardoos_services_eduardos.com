---
name: epam
description: >-
  Upload Eduardo OS EPAM / pamphlet .epam JSON documents to a host site via
  API key (eos_live_). Docs-first: GET /api/v1/docs then POST /api/v1/epam/epams.
  Auto-publishes to /articles. Use when the user mentions EPAM, .epam connector,
  pamphlet payload upload, or publishing articles without the web editor.
disable-model-invocation: true
---

# Eduardo OS EPAM API skill

**Install location:** project sidecar **`.epam/`**.  
**Before first run:** read [CAVEATS.md](CAVEATS.md).  
**Live API contract:** always `GET /api/v1/docs` first (see [reference.md](reference.md)).  
**CLI:** `.epam/epam_client.py`

Repo: https://github.com/EduardoOsteicoechea/epam  
Docs: https://eduardoos.com/api-docs

## When to use

- Push a pamphlet / `.epam` document from another repo or CI
- Update an existing cloud EPAM without opening `/documents/pamphlet`
- Confirm `articleUrl` after write (auto-publish)

## Ordered flow

1. Require `EDUARDOOS_API_KEY` in `.epam/.env` (+ `EDUARDOOS_BASE_URL` if not eduardoos.com)
2. `python .epam/epam_client.py docs`
3. `python .epam/epam_client.py access`
4. `python .epam/epam_client.py request POST /api/v1/epam/epams --file path/to/doc.epam.json`
5. Print **viewUrl** and **articleUrl** from the response

PUT replace:

```bash
python .epam/epam_client.py request PUT /api/v1/epam/epams/{id} --file path/to/doc.epam.json
```

(Bare pamphlet JSON is wrapped with `confirmOverwrite:true` automatically.)

## Entitlements

Host user needs **`api` + `epam`**. Legacy entitlement id **`pamphlet`** still unlocks EPAM.
