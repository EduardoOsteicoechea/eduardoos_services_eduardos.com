# Ordinato — platform agent orchestration contract

Status: **active**. Source of truth for every site in this workspace. Keep copies byte-identical in:

- `docs/ordinato.md` (workspace)
- `ordinato/docs/CONTRACT.md`
- `<site>/docs/ordinato.md` for each site repo

Ordinato is **not** a public website. It is a loopback Go API that orchestrates agentic workflows for authorized sites.

## Product policy

| Category | Where it lives |
| --- | --- |
| Services already shipped on a site | Stay on that site’s Go API and frontend |
| New agentic orchestration | Ordinato |
| New platform worker APIs (orato, datum, narrato, …) | Called **only** by Ordinato |

### Stay on the site (do not migrate in this cut)

- Auth, session cookies, CSRF, profiles
- Existing public / agent chat (`/api/chat` and related)
- Shipped products: pamphlet, articles, eVoice, eReport, eoStore, music, homescool, scrib, etc.
- Site media, email/OTP, domain diagnostics

### Go through Ordinato

- New agentic flows: receive → classify → plan → execute allowlisted workers → stream progress
- New platform APIs: **orato** (publish content), **datum** (database/data), **narrato** (text-to-speech), and future workers
- Browser calls **only** same-origin `/api/ordinato/...` on the site; the site Go API authenticates the user and proxies to Ordinato on loopback

### Forbidden on a site when adding a new platform service

- Implementing a new orchestrator inside the site Go API
- Calling orato / datum / narrato (or similar) directly from the site backend
- Persisting platform run ledgers outside Ordinato’s database

## Ingress

1. Frontend → site `POST /api/ordinato/runs` (session + CSRF).
2. Site → Ordinato `POST /v1/runs` with `X-Ordinato-Site` and a site service key (never exposed to the browser).
3. Ordinato classifies (LLM → allowlisted `workflow_id`), reports the plan over SSE, then runs steps sequentially.
4. Site proxies SSE events to the frontend.

Ordinato binds `127.0.0.1` only. No public domain for the orchestrator itself.

## Workflow catalog (must match `ordinato` Go `workflows.go`)

| workflow_id | Steps (worker.action) |
| --- | --- |
| `data_lookup` | `datum.query` |
| `publish_with_audio` | `datum.fetch` → `narrato.tts` → `orato.publish` |

Unknown or low-confidence classifications are rejected; no worker calls. State-changing publish steps require explicit confirmation when live workers exist; dry-run does not mutate.

## Observability

Same error body and `mustLog` / `X-Request-ID` rules as the rest of the platform. Never log site keys, OpenRouter keys, full sensitive prompts, or cookies.

## Related

- Registry: `docs/site-registry.md` (Platform services → ordinato)
- AI agent tools contract: `.cursor/rules/ai-agents.mdc` (existing site chat stays local; new workflows use Ordinato)
