# Caveats — `.eoschool` connector

Read this before generating or posting materials.

## What this is

- A **sidecar folder** `.eoschool/` in *your* project (clone of `eoschool`).
- Plus a Cursor skill that teaches an agent to call Eduardo OS’s **public Homescool materials API** with **your** key.
- The CLI is intentionally thin: **API key + docs + generic request**. Agents must learn endpoints and write rules from `GET /api/v1/docs` **before every session/action**.
- HTML format is governed **only** by `MATERIALS.md` / `TEMPLATES.md` in this skill.

## What this is not

- **Not** permission to invent quiz/layout formats outside MATERIALS/TEMPLATES.
- **Not** key management (keys = **UI only** at eduardoos.com).
- **Not** access to other people’s materials — **owned only**.
- **Not** unlimited traffic — **60 req/min/key** (429 + `Retry-After`).
- **Not** the eReport connector (that is `.ereport/`).

## Requirements

1. Subscriptions: **`api`** + **`homescool`**
2. Key from https://eduardoos.com (Profile → API keys)
3. Secrets only in `.eoschool/.env` — never commit

## Safety

- Always **docs → access → generate HTML → POST with confirmOverwrite:true**
- Never put API keys in chat, Git, or frontend bundles
- End with `Ver material: <viewUrl>`

## Liability

You own what your agent writes. Prefer `GET https://eduardoos.com/api/v1/docs` if docs disagree with this skill.
