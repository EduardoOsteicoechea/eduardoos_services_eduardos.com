---
name: eoschool
description: >-
  Generate and deploy Eduardo OS Homescool .eoschool JSON study materials via the
  public rate-limited API. Docs-first: GET /api/v1/docs, follow METHOD_V1, then POST
  with EDUARDOOS_API_KEY. Use when the user mentions Homescool, eoschool, .eoschool,
  ciclo materials, or study sheets.
disable-model-invocation: true
---

# Eduardo OS eoschool skill

**Install location:** project sidecar **`.eoschool/`** (connector repo).  
**Before first run:** read [CAVEATS.md](CAVEATS.md).  
**Method v1 (required):** [METHOD_V1.md](METHOD_V1.md)  
**Legacy HTML patterns:** [MATERIALS.md](MATERIALS.md) · [TEMPLATES.md](TEMPLATES.md) — do **not** use for new level-6 content.  
**Live API contract:** always `GET /api/v1/docs` first (see [reference.md](reference.md)).  
**CLI:** `.eoschool/eoschool_client.py`

Repo: https://github.com/EduardoOsteicoechea/eduardoos-eoschool-connector  
Docs: https://eduardoos.com/api-docs

## Hard rule

Follow **METHOD_V1.md** and live `payloadSchema.homescool`. New materials are `.eoschool` JSON (not free-form HTML). Level **6** only for now. One document per `cycle + week + day + level + subject`.

## Mode B (API — docs first)

```bash
python .eoschool/eoschool_client.py docs
python .eoschool/eoschool_client.py request GET /api/v1/homescool/access
# Author .eoschool JSON per METHOD_V1.md
python .eoschool/eoschool_client.py request POST /api/v1/homescool/materials --file .eoschool/material.body.json
```

`material.body.json` shape (confirm from live docs):

```json
{
  "confirmOverwrite": true,
  "material": {
    "format": "eoschool",
    "version": 1,
    "cycle": 1,
    "week": 1,
    "day": 1,
    "level": 6,
    "subject": "mat",
    "locale": "es",
    "title": "Tablas de multiplicar 1–12",
    "lesson": {
      "kind": "intro",
      "points": [
        { "id": "p1", "heading": "…", "body": "…" },
        { "id": "p2", "heading": "…", "body": "…" },
        { "id": "p3", "heading": "…", "body": "…" }
      ],
      "summary": "…"
    },
    "quiz": {
      "questionCount": 8,
      "questions": []
    },
    "media": []
  }
}
```

End by printing `Ver material: <viewUrl>`.
