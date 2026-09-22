---
name: eoschool
description: >-
  Generate and deploy Eduardo OS Homescool US Letter study materials via the
  public rate-limited API. Docs-first: GET /api/v1/docs, then create HTML using
  ONLY eoschool MATERIALS/TEMPLATES, then POST with EDUARDOOS_API_KEY. Use when
  the user mentions Homescool, eoschool, .eoschool, ciclo materials, or study sheets.
disable-model-invocation: true
---

# Eduardo OS eoschool skill

**Install location:** project sidecar **`.eoschool/`** (this connector repo).  
**Before first run:** read [CAVEATS.md](CAVEATS.md).  
**Format rules:** [MATERIALS.md](MATERIALS.md) Â· [TEMPLATES.md](TEMPLATES.md)  
**Live API contract:** always `GET /api/v1/docs` first (see [reference.md](reference.md)).  
**CLI:** `.eoschool/eoschool_client.py`

Repo: https://github.com/EduardoOsteicoechea/eduardoos-eoschool-connector  
Docs: https://eduardoos.com/api-docs

## Hard rule

Use **only** this skillâ€™s guidelines (`MATERIALS.md`, `TEMPLATES.md`, live `payloadSchema.homescool`). Do not invent alternate page sizes, quiz markup, or API paths from memory.

## Mode B (API â€” docs first)

```bash
python .eoschool/eoschool_client.py docs
python .eoschool/eoschool_client.py request GET /api/v1/homescool/access
# Generate HTML locally per MATERIALS.md / TEMPLATES.md
python .eoschool/eoschool_client.py request POST /api/v1/homescool/materials --file .eoschool/material.body.json
```

`material.body.json` shape (confirm from live docs):

```json
{
  "confirmOverwrite": true,
  "material": {
    "cycle": 3,
    "week": 1,
    "subject": "idiomas",
    "day": 1,
    "sessionDate": "2026-09-17",
    "title": "Preposiciones en latÃ­n",
    "html": "<!DOCTYPE html>â€¦"
  }
}
```

End by printing `Ver material: <viewUrl>`.

