# 002 — Product suite (MongoDB-first port)

Status: **specification lock** (2026-09-10). Implement only after this document is the contract. Supersedes reference S3/Dynamo/localStorage persistence for the products listed below.

## 0. Scope

Port into `eduardoos.com` (this repo), frontend + backend:

| # | Product | Catalog id | Notes |
| --- | --- | --- | --- |
| 1 | eReport | `ereport` | Already on VPS FS + Mongo entitlements; finish subscribe UX + PDF verify |
| 2 | Scrib | `scrib` | Books/sheets + Institutes copy modal + server PDF print |
| 3 | Calvin’s Institutes | _(public)_ | Serve paragraph pack; no subscription |
| 4 | Homescool | `homescool` | Students, learning, tasks, catalogs |
| 5 | Pamphlet | `pamphlet` | Epam cloud docs + server PDF |
| 6 | Subscriptions | catalog | PayPal intents + Mongo entitlements; **no** agent sandbox |
| 7 | Home profile + agent corpus | _(public chat)_ | Static profile RAG into `/api/chat` (+ `/api/profile/ask`) |
| 8 | eVoice | `evoice` | Projects, jobs, TTS worker, playlist share |
| 9 | PDF printing | — | Pamphlet + Scrib server PDF; eReport client jsPDF; eVoice `window.print` |

**Out of scope:** agent sandbox, church management, music playlist, BIM/APS, STT draft (054).

## 1. Platform contracts (non-negotiable)

1. **Auth:** cookie `__Host-` / local secure cookies, CSRF memory token, same-origin `/api/*`. Never bearer JWT in `localStorage`.
2. **Persistence:** all durable product objects live in **MongoDB** (`eduardoos` database). Binary blobs (images, audio, uploaded docs, `.epam` bodies) live under **media root** (`backend/.data/media` local; `/var/www/eduardoos.com/media` prod). **No S3. No DynamoDB.**
3. **localStorage ban (product data):** do not store libraries, sheets, epams, students, tasks, voice projects, entitlements, payment state, last-opened document ids, Institutes nav, or sidebar open state in `localStorage` / `sessionStorage`. Persist those as Mongo documents (or `user_preferences` — see §3). **Chrome-only** keys allowed in `localStorage`: `theme`, `root-font-size`, `site-text-scale`. Ephemeral **session** hint `sessionStorage["eduardoos.session-hint"]` may mark “had a session” so guest `/api/auth/me` does not spam refresh/CSRF remints (not product data).
4. **Logging:** every meaningful handler branch and FE fetch lifecycle uses `mustLog` / `if (mustLog)`. `mustLog` is on in `import.meta.env.DEV`, when `?debug=1`, or when `MUST_LOG=true` on the API. **Every** FE error still `console.error`s and opens the global error modal (except guest `401 /api/auth/me` and intentional gate banners). Backend unexpected errors always slog with `request_id`. Never log secrets, OTPs, cookies, SMTP, AI keys, or raw file bytes.
5. **Spec-first:** amend this document (or a child spec under `docs/specs/002-*.md`) before changing behavior.
6. **Shell:** Astro `Layout.astro` + shared chrome; product pages register `#dynamic-header` actions. Rem tokens only. Brand colors stay in this site’s `global.css`.

## 2. Catalog & entitlements

Billable catalog (admin always bypasses):

| ID | Label | Monthly USD |
| --- | --- | --- |
| `pamphlet` | Pamphlet | 1 |
| `homescool` | Homescool | 1 |
| `scrib` | Scrib | 1 |
| `ereport` | eReport | 1 |
| `evoice` | eVoice | 1 |
| `api` | API | 3 |

Routes:

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/subscriptions/catalog` | public |
| GET | `/api/subscriptions/entitlements` | session |
| GET | `/api/subscriptions/access/{serviceID}` | session |
| GET | `/api/subscriptions/entitlements/preview` | session |
| POST | `/api/payments/intents` | session + CSRF |
| GET | `/api/payments/status/{intentID}` | session |

Payment intents and entitlements persist in Mongo (`payment_intents`, existing `entitlements`). PayPal hosted button id from env `PAYPAL_HOSTED_BUTTON_ID` (empty → preview/dev grant path for admins/tests only).

eVoice temporary allowlist emails (until subscribe): `eliasosteic@gmail.com`, `laleskavf.2una@gmail.com`.

FE: `/payments/subscription` card grid; ServiceGate on product hubs.

## 3. Mongo collections (new / extended)

| Collection | Purpose |
| --- | --- |
| `entitlements` | existing |
| `payment_intents` | checkout intents + status |
| `user_preferences` | `{ _id, user_id, key, value, updated_at }` — replaces product localStorage |
| `scrib_libraries` | `{ _id: userId, books: [...] }` |
| `scrib_books` | book meta + sheet index |
| `scrib_sheets` | full sheet JSON (layers/paths) |
| `epams` | pamphlet document metadata |
| `epam_bodies` | optional; or body path under `media/pamphlet/...` |
| `epam_footers` | footer templates |
| `homescool_students` | student profiles + access |
| `homescool_links` | parent↔student links |
| `homescool_tasks` | assignments / grades |
| `homescool_catalogs` | study areas / templates |
| `evoice_projects` | project meta |
| `evoice_jobs` | job state machine |
| `evoice_shares` | playlist share tokens |

Indexes: owner/user_id, updated_at, job status, share token hash. TTL only where tokens expire.

## 4. Media layout

```
media/
  ereport/<userId>/…          # existing
  scrib/                      # optional assets only; sheet JSON in Mongo
  pamphlet/<userId>/<epamId>.epam
  homescool/<userId>/…
  evoice/<userId>/<project>/docs|audios|…
  calvin-institutes-paragraphs/  # or backend/.data pack (read-only)
```

## 5. Feature contracts (summary)

### 5.1 eReport
Keep org-scoped VPS FS API. Gate create behind entitlement `ereport`. Subscription page lists eReport. Tracker PDF via vendored jsPDF (no CDN). Exhaustive `mustLog` on hub/workspace.

### 5.2 Scrib
API parity with reference 024, Mongo-backed:

- `GET/POST /api/scrib/...` as in reference (library, books, sheets, `POST /api/scrib/print/pdf`)
- Sheet geometry US Letter; stylus-only draw; Institutes modal uses `/api/latin/...` + preference key `scrib.institutesNav` in `user_preferences` (not localStorage)
- PDF: client grayscale capture → `pkg/pdf.BuildScribPrintPDF`

### 5.3 Calvin’s Institutes
Public:

- `GET /api/latin/calvins-institutes` (index)
- `GET /api/latin/calvins-institutes/paragraphs`
- `GET /api/latin/calvins-institutes/paragraphs/chapters/{book}/{chapter}`

Source pack: workspace `calvin-institutes-paragraphs/` copied to `backend/.data/calvin-institutes-paragraphs` (and optionally `frontend/public` for static). Reader at `/dashboard/latin/calvins-institutes`. Sidebar open state → `user_preferences` when authenticated; guests may keep ephemeral in-memory only.

### 5.4 Homescool
API parity with reference 003 under `/api/homescool/*`. Dynamo/S3 → Mongo + `media/homescool`. Student invite email via existing mailer. FE routes under `/homescool/*`. Calendar via FullCalendar (add deps) or vanilla equivalent matching UX.

### 5.5 Pamphlet
- Cloud CRUD `/api/epams*` → Mongo + media bodies
- `POST /api/documents/pamphlet/pdf` → `pkg/pdf` pamphlet builder (ink black / `#00368c`)
- FE `/documents/pamphlet` using ported pamphlet-generator (vanilla TS)
- Last-opened id → `user_preferences` key `pamphlet.lastEpamId`

### 5.6 Profile + agent RAG
- Embed `prompts/PROFILE_CONTEXT.md` into chat system prompt (and `POST /api/profile/ask` alias)
- Spec 009 rules: third-person agent, no vector DB, refuse invention, residence script, public contacts only
- Home FE dossier facts aligned with corpus (`lib/eduardoProfile.ts`)

### 5.7 eVoice
API parity with 044/069/071 under `/api/evoice/*`. Objects on VPS media. Job worker: Python under `backend/evoice-worker/` (port from reference), env `EVOICE_PYTHON`, `EVOICE_FAKE_TTS` for tests. Shares use hashed tokens in Mongo. Print prepared speech via browser print CSS.

### 5.8 PDF matrix
| Product | Mechanism |
| --- | --- |
| Pamphlet | Server `pkg/pdf` |
| Scrib | Server `pkg/pdf` scrib print |
| eReport | Client html2canvas + vendored jsPDF |
| eVoice | `window.print` |
| Institutes / Homescool | none |

## 6. Observability

Backend: `if mustLog { a.log.Info(...) }` on request entry, entitlement decisions, store ops (ids/counts only), PDF build sizes, job transitions.

Frontend: `if (mustLog) console.log(...)` on route enter, gate checks, every `/api/` call (method, path, status, request_id), save/print outcomes. Errors → `showErrorModal`.

## 7. Tests (minimum)

- Subscriptions catalog + entitlement gate deny/allow
- Scrib book/sheet CRUD round-trip (memory or mongo test DB) + print PDF magic bytes `%PDF`
- Latin index/chapter 200 + unknown 404
- Pamphlet PDF endpoint ink modes
- Chat includes profile corpus markers (system prompt contains canonical contact email)
- Homescool student create + unauthorized cross-user deny
- eVoice project create + fake TTS job completes in test mode
- No product keys written to localStorage in FE unit tests

## 8. Implementation order

1. This spec + migrate collections + catalog/payments + preference store
2. Profile corpus into chat
3. Latin pack HTTP
4. `pkg/pdf` + Scrib + Pamphlet
5. Homescool
6. eVoice worker
7. Subscription + hub FE gates + nav
8. Build, commit, push

## 9. Auth hardening (amendment)

1. FE CSRF: single-flight mint with timeout; **reuse** in-memory token until logout / CSRF `403` / explicit reset (avoid parallel remint races).
2. FE refresh: single-flight + `navigator.locks` (fallback timestamp lock) so multi-tab rotation does not revoke the family; proactive refresh ~10m + `visibilitychange`.
3. FE `getMe`: attempt refresh **only** when session hint is set (or access cookie likely); never remint guest CSRF solely to probe refresh.
4. FE `apiSend`: on `401` for non-auth routes, single refresh then **one** retry; on CSRF `403`, remint CSRF then one retry.
5. BE `validCSRF`: refresh-cookie branch rejects expired sessions; **revoked** refresh CSRF is rejected for all routes **except** `POST /api/auth/refresh` (so reuse detection can still revoke the family).
6. Logout clears in-memory CSRF + session hint, then remints guest challenge when needed.
7. Admin UI: guest `401 /me` is banner-only, not error modal.

## 10. Amendments log

| Date | Change |
| --- | --- |
| 2026-09-10 | Initial MongoDB-first suite lock; ban product localStorage; exclude agent sandbox |
| 2026-09-10 | Auth hardening (§9); chrome-only LS keys; exhaustive error console + modal; session hint |
