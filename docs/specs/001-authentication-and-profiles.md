# 001 — Authentication and profiles

Status: **specification lock**. Milestone-1 decisions 1–21 are approved. Do not implement application code until an implementation task is requested.

This document is the implementation contract for **eduardoos.com**. The same security contract applies to `turquesa.shop`, `iglesiabiblicapalabraviva.com`, and `creevzla.org`, each in its own repository, process, database, secrets, cookies, media root, and user base. There is no SSO, no shared JWT secret, no shared session store, and no cross-domain cookies.

Parent-workspace rules remain in force: `.cursor/rules/auth-security.mdc`, `.cursor/rules/media-storage.mdc`, `.cursor/rules/email-otp-notifications.mdc`, `.cursor/rules/ai-agents.mdc`. If this spec and a parent rule disagree, follow the **stricter** control. Milestone-1 decisions below are the approved resolution for this site.

This task does **not** change application behavior. The sections marked “Current implementation (do not treat as the target)” describe what the code does today.

## 1. Site identity (this repository only)

| Item | Value |
| --- | --- |
| Domain | `eduardoos.com` |
| Site ID | `eduardoos` |
| Public origin | `https://eduardoos.com` |
| Go API bind | `127.0.0.1:8081` |
| Public API | `https://eduardoos.com/api/` |
| MongoDB database | `eduardoos` |
| JWT issuer (`iss`) | `https://eduardoos.com` |
| JWT audience (`aud`) | `https://eduardoos.com` |
| Local frontend | `http://127.0.0.1:4321` |
| Media root (production) | `/var/www/eduardoos.com/media` |
| Media root (local) | `backend/.data/media` |
| systemd | `eduardoos-api.service` |
| Production env file | `/etc/eduardoos-api.env` |
| SMTP from address (name only; no secrets) | `noreply@eduardoos.com` |
| SMTP from name | `Eduardoos` |

Isolation: users, `auth_sessions`, OTP/reset records, JWT secret, cookies, roles, avatars, and all other data for this domain exist only in this site’s API and MongoDB database. A session issued here is invalid on every other site even if email addresses coincide.

## Locked decisions (approved)

These replace the previous open-decision list for this milestone.

1. **Avatars are private.** Only the owner may retrieve, update, or delete their avatar. Delivery is authorized Go API + Nginx internal/`X-Accel-Redirect`. Public avatars are out of scope until a later approved feature.
2. **Avatar limits:** maximum **5 MiB**; maximum **2048×2048** pixels; **JPEG, PNG, and WebP** only. Reject GIF, SVG, HTML, XML, JavaScript, executables, invalid magic bytes, and malformed images. Do not trust client `Content-Type` or filename.
3. **Refresh sessions:** 30-day **rolling** expiry (successful refresh may extend `expires_at`, never past the absolute cap); **90-day absolute** lifetime from family creation. Immediate family revocation on logout, password reset, detected refresh-token reuse, account disable, or explicit admin action. MongoDB TTL cleans expired `auth_sessions` (and OTP/reset) documents.
4. **Password policy:** minimum **12** characters, maximum **128** characters, hashed with **Argon2id**. No extra composition rules (no required classes, no arbitrary complexity scoring).
5. **Phone** is optional and **not verified** in this milestone. When supplied, normalize and validate **E.164** (`+` and digits only after normalize; country code required). Reject letters, spaces-only, and values that cannot be normalized to E.164.
6. **Username:** trim, lowercase to `username_normalized`, unique per this site’s database, **3–32** characters, `^[a-z0-9_]+$` only.
7. **Display name:** optional. When supplied, trim; **1–80** visible characters; reject empty-after-trim and Unicode control characters (Cc / C0/C1 controls, including DEL).
8. **Pending users receive no authenticated session.** `POST /api/auth/login` against a pending account does not set cookies (generic `invalid_credentials`). **Successful email verification issues the first session.**
9. **Password reset uses email OTP only** (no reset link). OTP TTL is **10 minutes**.
10. **OTPs** (email verification and password reset) are **six-digit** numeric codes, CSPRNG, single-use, **hashed at rest**, **five failed attempts** per challenge then the challenge is invalidated.
11. **Production env file** is `/etc/<site-id>-api.env` only (this site: the contract path in §1). Do not document or emit a dotted-domain env filename.
12. **Email-address changes are out of scope** for this milestone. `PATCH /api/profile` must not accept `email`.
13. **Administrators may not read, update, or delete another user’s profile or avatar** in this milestone. Diagnostics remain admin-only. Future cross-user access needs explicit permissions in a later spec.
14. **Rate limits (locked):**
    - registration: **3 / hour / IP**
    - login: **5 / 15 minutes** per normalized identifier **and** per IP
    - verification resend: **3 / hour** per account/email **and** IP
    - OTP verification (email verify and reset): **5 attempts per challenge**
    - password-reset request: **3 / hour** per email **and** IP
    - refresh: **30 / minute / session**
    - profile and avatar changes: **20 / hour / user**
15. **GIF avatars are not allowed.**
16. **Cookies:** HttpOnly **access** and **refresh** only (`__Host-` in production). **CSRF is not a readable cookie.** The client calls `GET /api/auth/csrf`, holds the token **only in frontend memory** (never `localStorage` / `sessionStorage` / `document.cookie`), and sends `X-CSRF-Token` on every unsafe request. Origin/Referer checks still apply. The server may use an HttpOnly, non-readable binding cookie solely to look up an anonymous CSRF challenge; JavaScript must never read it.
17. **Role** is `user` or `admin` on the **user document**. Enforce in Go. **No `roles` collection** in this milestone.
18. **Local media root:** `backend/.data/media`, Git-ignored. **Production media root:** `/var/www/<domain>/media` as in §1. Implementation must add the Git ignore; this documentation task does not.
19. **After password reset:** revoke all session families and **leave the user logged out**. Require a fresh login. Do not set new auth cookies on reset success.
20. **Nginx** must **preserve the `/api/` prefix** when proxying. Go public routes are mounted under `/api/...`. Direct local health remains `GET /health` (and may keep `GET /api/health`). **Do not change Nginx in this documentation task.** Update Nginx only during implementation, with tests that public `https://<domain>/api/...` reaches the matching Go handler.
21. **No `www` origins** in this milestone. Apex domain only. Host-only cookies (`__Host-` / no `Domain`). If `www` is served later, **redirect `www` to apex before** any application auth cookies or CSRF are issued.

## 2. Current implementation (do not treat as the target)

Today this API is an **in-process** diagnostics login, not the MongoDB auth system in this spec.

- Users and sessions live in memory (`backend/store.go`). `MONGO_URI` is loaded and unused. There is no MongoDB driver.
- Existing routes: `GET /api/auth/me`, `POST /api/auth/login`, `POST /api/auth/logout`. No register, verify, refresh, CSRF-only GET, password reset, profile, or avatar routes.
- Login is email + password only. Passwords are Argon2id. Failures return generic `invalid_credentials`.
- Access JWT is HS256, 15 minutes, cookie `access` (dev) or `__Host-access` (when `COOKIE_SECURE=true`). Session id is stored in JWT `jti`, not a `sid` claim. There is **no** refresh token or `__Host-refresh` cookie.
- CSRF: HttpOnly cookie `csrf` / `__Host-csrf`, header `X-CSRF-Token`, plus `Origin`/`Referer` allowlist. Token is also returned on `GET /api/auth/me`.
- Admin bootstrap: every process start seeds an in-memory admin from `ADMIN_EMAIL` + `ADMIN_PASSWORD` when both are set. That password is a permanent env dependency for local diagnostics.
- Frontend (`frontend/src/lib/api.ts`): `credentials: "same-origin"`, CSRF header on POST, no auth tokens in `localStorage` / `sessionStorage` (theme only in `localStorage`).
- Tests cover diagnostics auth, CSRF, role denial, and secret non-leakage. They do not cover refresh rotation, OTP, or MongoDB.
- GitHub Actions deploys `frontend/dist/` to `/var/www/eduardoos.com/html/` with `--delete`, and the Linux `api` binary to `/opt/apps/eduardoos/releases/<sha>/`. It never uploads env files, media, or secrets.

## 3. Account lifecycle (target)

### 3.1 Registration

`POST /api/auth/register` creates a **pending** account with:

- email
- username (unique)
- password (Argon2id hash only; never stored or logged in plaintext)

Email handling:

- Trim whitespace.
- Persist a display email and `email_normalized`.
- `email_normalized` is the trimmed email, lowercased, used for uniqueness and lookup.
- Unique index on `email_normalized` (case-insensitive uniqueness).

Username handling:

- Trim whitespace.
- Persist display `username` and `username_normalized` (trimmed, lowercased) for uniqueness and lookup.
- Unique index on `username_normalized`.
- After trim and lowercase: **3–32** characters matching `^[a-z0-9_]+$` only.

On success, send an email-verification OTP (this site’s SMTP only). Do not log the OTP, the email body, or the recipient list.

Anti-enumeration: if the normalized email already exists, return the **same generic success** as a new registration. Do not reveal whether the email is registered. Username conflicts may return `conflict` because usernames are public identifiers.

New accounts start in status `pending` with `email_verified=false`.

### 3.2 Account states

| Status | Meaning |
| --- | --- |
| `pending` | Registered; email not verified. |
| `verified` | Email verified; normal user (or admin) access. |
| `disabled` | Cannot authenticate; existing sessions must be revoked. |

`email_verified` must stay consistent with `verified`. Disabled is independent of verification and is set only by an **admin** through the Go API (no frontend-trusted flag).

**Pending users do not receive an authenticated session.** Login of a pending account returns generic `invalid_credentials` and sets no auth cookies. Successful `POST /api/auth/verify-email` issues the first session.

### 3.3 Email verification OTP

- Cryptographically secure **six-digit numeric** OTP (CSPRNG), single-use.
- Store **only a hash** (or HMAC) in this site’s MongoDB. Never plaintext.
- Expire within **10 minutes**.
- **Five failed attempts** invalidate that challenge.
- Resend is rate-limited per normalized email and IP.
- A new OTP invalidates unused previous verification OTPs for that email.
- Responses for resend and verify are generic. Do not reveal whether the account exists, except username conflict on register as above.
- Never put OTPs in URLs, logs, analytics, or browser storage.

### 3.4 Login

`POST /api/auth/login` accepts **either** `email` **or** `username` plus `password`.

- Look up by `email_normalized` or `username_normalized`.
- Verify Argon2id hash with a constant-time compare.
- Generic `invalid_credentials` on unknown account, bad password, **pending** account, or disabled account (do not distinguish).
- Pending users **do not** receive cookies.
- On success (verified, not disabled): create session family, set access + refresh cookies, return the safe profile summary (no password hash, no tokens). The CSRF token is obtained from `GET /api/auth/csrf` or included on `GET /api/auth/me`, held in memory only.

### 3.5 Logout

`POST /api/auth/logout` (authenticated or best-effort if cookies present):

- Revoke the **current** session family (or current session if the family is already gone).
- Clear access and refresh cookies (`Max-Age=-1`, same flags/names as when set). Also expire any HttpOnly CSRF binding cookie if one was set. Do not rely on a readable CSRF cookie.
- Return generic success. Do not error in a way that reveals session internals.

Logout of all sessions is not in the required API list; password change and password reset revoke all families (see 3.6–3.7).

### 3.6 Authenticated password change

`POST /api/auth/change-password` requires a valid access session, CSRF, Origin/Referer, current password, and new password.

- Verify current password. Failure: generic `invalid_credentials` (do not say which field).
- Hash the new password with Argon2id. Length **12–128** characters. No extra composition rules.
- Revoke **all** refresh-token families for that user.
- Issue **one** new session (new family) on success so the current browser stays signed in.
- Never log passwords.

### 3.7 Password reset

`POST /api/auth/request-password-reset` and `POST /api/auth/reset-password`.

- Request is always generic success (anti-enumeration), rate-limited by email + IP (**3 / hour** each).
- Reset credential is a **six-digit email OTP only** (no link token). Hash at rest. TTL **10 minutes**. Five failed attempts invalidate the challenge. Invalidated after success.
- On success: set the Argon2id hash, revoke **all** session families, **do not** issue a new session. User must log in.
- Never put reset secrets in logs, API errors, or browser storage. A URL may carry a token only if the approved medium is an explicit short-lived link.

### 3.8 Profile

Authenticated user, **own record only**. Administrators may not read or edit another user’s profile or avatar in this milestone.

Readable/updatable fields:

- `display_name` — optional; trim; 1–80 visible characters; no control characters
- `username` — uniqueness and `^[a-z0-9_]+$` 3–32 as in 3.1
- `phone` — optional; E.164; not verified
- avatar — private; owner-only retrieve/update/delete

Email is **not** changed by `PATCH /api/profile`. Role and status are **not** user-writable.

`GET /api/auth/me` returns the caller’s safe profile. Users cannot read another user’s profile by id unless a later spec grants it.

### 3.9 Initial admin bootstrap

Replace permanent `ADMIN_PASSWORD` in production.

- One-time bootstrap using `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`.
- Runs only when this database has **zero** users with `role=admin`.
- Creates a `verified` admin with Argon2id hash, then must be **removed** from the production env file.
- After an admin exists, bootstrap variables are ignored. Missing or present values must not create a second admin and must not be an authorization allowlist.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` are **not** the authorization source. They may remain temporarily for local diagnostics during migration, then be removed from `.env.example` and production.
- No hard-coded administrator email allowlist in source.

## 4. Cookie and session design (target)

### 4.1 Access token

- Signed JWT, algorithm HS256, key = this site’s `JWT_SECRET` only.
- Lifetime **≤ 15 minutes** (lock: 15 minutes).
- Cookie name, production: `__Host-access`.
- Cookie flags, production: `Secure`, `HttpOnly`, `Path=/`, `SameSite=Strict`, **no** `Domain` attribute (`__Host-` requires this).
- Claims **required**: `iss`, `aud`, `sub`, `iat`, `exp`, `sid` (session id). Validate signature, expiry, `iss`, `aud`, and that `sid` is an active, non-revoked session for `sub`.
- Do not put role, password, email, phone, or secrets in claims. Load user + role from MongoDB on each authenticated request.
- Never put the JWT in `localStorage`, `sessionStorage`, URLs, frontend state, logs, Git, or GitHub Actions secrets.

### 4.2 Refresh token

- Opaque cryptographically random token (not a JWT), enough entropy (≥ 32 bytes).
- Cookie name, production: `__Host-refresh`. Same host-only Secure HttpOnly Path=/ SameSite=Strict flags.
- MongoDB stores **only a hash** of the refresh token, plus `user_id`, `session_id` (`sid`), `family_id`, expiry, revoked flag, replacement/predecessor id, timestamps, optional device metadata (non-secret).
- Rotate on **every** successful refresh: old hash marked used/replaced; new token set on the cookie; new hash stored; same `family_id`.
- Reuse of a rotated or revoked refresh token: revoke the **entire family**, clear cookies, return `unauthorized`. Treat as theft.
- **Rolling expiry:** successful refresh may extend `expires_at` by 30 days, never past **90 days** from family `created_at`. Access JWT stays 15 minutes. Immediate revocation on logout, password reset, reuse, account disable, or admin action.

### 4.3 Development vs production cookies

| | Production (`COOKIE_SECURE=true`, HTTPS) | Local (`COOKIE_SECURE=false`, `http://127.0.0.1`) |
| --- | --- | --- |
| Access | `__Host-access` | `access` |
| Refresh | `__Host-refresh` | `refresh` |
| CSRF | **not a readable cookie**; token from `GET /api/auth/csrf` JSON, memory only | same |
| `Secure` | true | false |
| `HttpOnly` | true (access, refresh) | true |
| `Path` | `/` | `/` |
| `Domain` | omitted | omitted |
| `SameSite` | `Strict` | `Strict` |

`__Host-` names are forbidden unless `Secure` is true. Local HTTP therefore **must not** use the `__Host-` prefix.

### 4.4 CSRF

Required on **every** unsafe method (`POST`, `PUT`, `PATCH`, `DELETE`) that uses cookie auth, including login, register, refresh, logout, verify-email, resend, password change/reset, profile patch, and avatar upload/delete.

Lock (approved):

1. Server issues a CSRF token (random, not a JWT). Store it hashed on the session when authenticated; for anonymous login/register, bind it to a server-side challenge (optional HttpOnly non-readable lookup cookie only — **never** readable by JavaScript).
2. **Do not use a readable CSRF cookie.** The client must not read CSRF from `document.cookie`.
3. Client obtains the token from `GET /api/auth/csrf` (JSON) and may refresh it from `GET /api/auth/me`. Hold it **only in frontend memory**. Never `localStorage` or `sessionStorage`.
4. Client sends header `X-CSRF-Token` with that value on every unsafe request.
5. Server also requires `Origin` or `Referer` to match this site’s allowlist: **apex only** `https://eduardoos.com`, plus local `http://127.0.0.1:4321` / loopback API origin in development. **Do not allow `www` origins.**
6. Reject if header missing, mismatch, or origin invalid → `403` `forbidden`.
7. Safe methods (`GET`) do not require the CSRF header.

CORS stays same-origin. Never `Access-Control-Allow-Origin: *` with credentials. Frontend calls only same-origin `/api/...`.

### 4.5 Logout cookie clearing

Clear access and refresh cookies with empty value, `Max-Age=-1`, and identical flags/names as issued. Host-only cookies never apply across `www` and apex. This milestone does not issue cookies on `www`; future `www` must redirect to apex before auth.

## 5. Authorization (target)

Roles: `user` (default at register) and `admin` (bootstrap or later admin-granted only).

Deny-by-default:

- Missing/invalid/expired access token → `401` `unauthorized`.
- Valid user without permission → `403` `forbidden`.
- Role values from the client are ignored. Role comes only from MongoDB via the Go API.
- Resource access requires **both** role/permission **and** ownership (or an explicit admin permission on that resource).
- A `user` may read/update **only** their own profile and avatar.
- An `admin` may **not** read, update, or delete another user’s profile or avatar in this milestone. Diagnostics remain admin-only.
- Frontend route guards (`/diagnostics`, future `/session`) are UX only.

No hard-coded administrator email allowlist.

## 6. MongoDB model and indexes (this database only)

Database name: `eduardoos`. Collections below are in that database only.

Never store plaintext passwords, OTPs, reset tokens, refresh tokens, JWT secrets, SMTP passwords, or AI keys.

### 6.1 `users`

| Field | Notes |
| --- | --- |
| `_id` | Server-generated. Exposed as `id` in JSON (string). |
| `email` | Trimmed display email. |
| `email_normalized` | Unique, lowercased. |
| `username` | Display username. |
| `username_normalized` | Unique, lowercased. |
| `password_hash` | Argon2id encoded string. |
| `role` | `user` \| `admin` (embedded; no JWT role claim). |
| `status` | `pending` \| `verified` \| `disabled`. |
| `email_verified` | Boolean, consistent with status. |
| `display_name` | Optional; trim; 1–80 visible characters; no control characters. |
| `phone` | Optional E.164; not verified in this milestone. |
| `avatar_key` | Relative path under this site’s media root, or null. Never an absolute VPS path in API responses. |
| `created_at`, `updated_at` | UTC. |
| `disabled_at` | Optional. |

Indexes:

- unique `email_normalized`
- unique `username_normalized`
- `status`
- `role` (admin bootstrap existence check)

### 6.2 `auth_sessions`

| Field | Notes |
| --- | --- |
| `session_id` | Equals JWT `sid`. Unique. |
| `family_id` | Rotation family. |
| `user_id` | |
| `refresh_token_hash` | Unique. Only hash. |
| `replaced_by_session_id` | Optional. |
| `revoked` | Bool. |
| `revoke_reason` | Optional enum: logout, rotation, reuse, password_change, reset, disable. |
| `csrf_hash` or `csrf` | Prefer hash; if plaintext CSRF is kept, it is not a credential equivalent to the refresh token. |
| `expires_at` | Refresh expiry. |
| `created_at`, `last_used_at` | |
| `device` | Optional coarse metadata (user-agent hash), no secrets. |

Indexes:

- unique `session_id`
- unique `refresh_token_hash`
- `family_id`
- `user_id`
- TTL on `expires_at` (30-day rolling / 90-day absolute; expired documents eligible for cleanup)

### 6.3 `email_verification_otps`

| Field | Notes |
| --- | --- |
| `email_normalized` | |
| `user_id` | |
| `otp_hash` | Only hash. |
| `attempts` | |
| `expires_at` | ≤ 10 minutes from issue. |
| `consumed_at` | |
| `created_at` | |

Indexes: unique unused token hash; `email_normalized`; TTL on `expires_at`.

### 6.4 `password_reset_tokens`

Same hashing, single-use, attempt counter, TTL. **Email OTP only**, six digits, expire in **10 minutes**. Indexes: token hash, `email_normalized`, TTL `expires_at`.

### 6.5 Roles

v1: **embedded** `users.role`. A separate `roles` collection is not required until there are more than `user` and `admin`.

### 6.6 Avatar metadata

Store on `users.avatar_key` plus optional `media_objects` collection (owner_id, relative_path, content_type, byte_size, visibility, created_at). Relative path only.

## 7. Avatar and media policy (target)

- Upload, replace, and delete only through this site’s **authenticated** Go API. No browser writes to disk. No FTP/SCP as the product path.
- Production files under `/var/www/eduardoos.com/media/` only. Never `frontend/`, `frontend/public/`, `frontend/dist/`, Git, or CI artifacts.
- CI `--delete` applies only to `/var/www/eduardoos.com/html/`.
- Writer: this API as `deploy`. `UMask=0027`. Nginx read-only. No writes into another site’s media directory.
- Server-generated UUID/ULID filename. Ignore client filename. Block `..` and absolute paths.
- Validate magic bytes, decoded MIME, size, and pixel dimensions. Do not trust `Content-Type` or extension.
- Allowed types (lock): `image/jpeg`, `image/png`, `image/webp` only. **Forbidden:** GIF, SVG, HTML, XML, JavaScript, executables, invalid magic bytes, malformed images.
- Maximum **5 MiB** and **2048×2048** pixels.
- **Private only** in this milestone. No guessable public URL. Owner-only retrieve/update/delete via the Go API; Nginx internal `X-Accel-Redirect`. That Nginx location is **not** created in this documentation task.
- Public avatars require a later approved feature.
- Temp files outside the final media directory; delete on success or failure.
- API errors must not include absolute VPS paths.
- Replacing an avatar must not leave undeleted files without a defined cleanup on replace/delete.

## 8. API contract (target)

Same-origin `/api/` on `eduardoos.com`. JSON `Content-Type: application/json` except avatar upload (`multipart/form-data`, field `file`).

Generic error body (no extra fields that leak secrets or account existence):

```json
{"error": "<code>"}
```

| Code | HTTP |
| --- | --- |
| `invalid_request` | 400 |
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `conflict` | 409 |
| `rate_limited` | 429 |
| `invalid_credentials` | 401 |
| `not found` | 404 (keep for disabled diagnostics) |
| `payload_too_large` | 413 |

CSRF + Origin on every unsafe route below. Rate limits are **locked** (see Locked decisions §14). Login is **5 / 15 minutes** per normalized identifier **and** per IP (replaces the previous in-memory 10 / 15 minutes / IP limiter).

Safe profile object (never `password_hash`, tokens, Mongo URIs, absolute paths):

```json
{
  "id": "<id>",
  "email": "<email>",
  "username": "<username>",
  "display_name": "<string or null>",
  "phone": "<string or null>",
  "role": "user",
  "status": "pending",
  "email_verified": false,
  "avatar": null
}
```

`avatar` is a same-origin **authorized** URL or opaque id for `GET /api/profile/avatar`, never a VPS filesystem path. Avatars are **private**.

### 8.1 `GET /api/auth/csrf`

Auth: none. Issues/refreshes anonymous CSRF cookie if needed.

**200**

```json
{"csrf": "<token>"}
```

### 8.2 `POST /api/auth/register`

Auth: CSRF + Origin. Rate limit: **3 / hour / IP**.

Request:

```json
{"email": "", "username": "", "password": ""}
```

**200** generic (including duplicate email):

```json
{"ok": true}
```

**409** duplicate username: `{"error":"conflict"}`. **400** invalid payload. **429** rate limited. Never return the OTP.

### 8.3 `POST /api/auth/verify-email`

Auth: CSRF + Origin. **Five attempts per OTP challenge**, then consume/lock that OTP.

Request:

```json
{"email": "", "otp": ""}
```

**200** generic `{"ok": true}` on success or when the server must not enumerate. **On successful verification, issue the first session cookies** (access + refresh). Pending users had no session before this. **429** on attempt/rate limits. Never echo the OTP.

### 8.4 `POST /api/auth/resend-verification`

Auth: CSRF + Origin. Rate limit: **3 / hour** per account/email **and** IP.

Request:

```json
{"email": ""}
```

**200** generic `{"ok": true}` always when the request is well-formed (anti-enumeration).

### 8.5 `POST /api/auth/login`

Auth: CSRF + Origin. **Locked rate limit: 5 / 15 minutes per normalized identifier and per IP.**

Request (exactly one of `email` or `username`):

```json
{"email": "", "password": ""}
```

```json
{"username": "", "password": ""}
```

**200** safe profile (no `csrf` required here; client calls `/api/auth/csrf` or `/api/auth/me` and holds CSRF in memory). Set access and refresh cookies only. **401** `invalid_credentials`. **429** `rate_limited`.

### 8.6 `POST /api/auth/refresh`

Auth: refresh cookie + CSRF + Origin. Rate limit: **30 / minute / session**.

Empty body `{}`. Rotate refresh; set new access + refresh cookies. **401** if missing/expired/reused (reuse revokes family). **403** CSRF/origin. **429** rate limited. No token in JSON.

### 8.7 `POST /api/auth/logout`

Auth: CSRF + Origin. Best-effort revoke + clear cookies.

**200** `{"ok": true}`

### 8.8 `GET /api/auth/me`

Auth: access cookie. No CSRF header.

**200** safe profile plus `"csrf": "<token>"` (keeps current diagnostics client working). **401** includes `"csrf"` so login can proceed:

```json
{"error": "unauthorized", "csrf": "<token>"}
```

### 8.9 `POST /api/auth/change-password`

Auth: access session + CSRF + Origin.

Request:

```json
{"current_password": "", "new_password": ""}
```

**200** `{"ok": true}` and new session cookies. **401** `invalid_credentials` or missing session. **403** CSRF. **429** **20 / hour / user**.

### 8.10 `POST /api/auth/request-password-reset`

Auth: CSRF + Origin. Rate limit: **3 / hour** per email **and** IP.

Request:

```json
{"email": ""}
```

**200** generic `{"ok": true}`.

### 8.11 `POST /api/auth/reset-password`

Auth: CSRF + Origin.

Request (email OTP only):

```json
{"email": "", "otp": "", "new_password": ""}
```

**200** generic `{"ok": true}`. All families revoked. **No new session.** User must log in. **429** five attempts per OTP challenge.

### 8.12 `PATCH /api/profile`

Auth: access session + CSRF + Origin. Own user only.

Request (all fields optional):

```json
{"display_name": "", "username": "", "phone": ""}
```

**200** safe profile. **409** username taken. **403** if targeting another user (not possible via this route). **429** **20 / hour / user**.

### 8.13 Avatar

`POST /api/profile/avatar` — multipart field `file`. Auth: session + CSRF + Origin. Own avatar only. **200** safe profile. **400** bad type/magic/dimensions (including GIF/SVG/HTML). **413** over 5 MiB or over 2048×2048. **429** **20 / hour / user**.

`DELETE /api/profile/avatar` — Auth: session + CSRF + Origin. Own only. **200** safe profile with `avatar: null`.

`GET /api/profile/avatar` — Auth: access cookie. Own private avatar only. Authorize then `X-Accel-Redirect`. Unauthenticated → `401`. There is **no** cross-user avatar GET in this milestone.

## 9. Runtime configuration

Implementation must use these **names**. No secret values belong in this file, README, Git, frontend, or CI.

### 9.1 `backend/.env.example` (names)

Keep current names and add bootstrap + media when implementing (do not edit `.env.example` in this spec-only change):

```
PORT
MONGO_URI
JWT_SECRET
JWT_ISSUER
JWT_AUDIENCE
COOKIE_SECURE
ENABLE_ADMIN_DIAGNOSTICS
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_PASSWORD
ADMIN_EMAIL
ADMIN_PASSWORD
SMTP_HOST
SMTP_PORT
SMTP_USERNAME
SMTP_PASSWORD
SMTP_FROM_ADDRESS
SMTP_FROM_NAME
DEEPSEEK_API_KEY
KIMI_API_KEY
DEEPSEEK_MODEL
KIMI_MODEL
MEDIA_ROOT
```

- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: migration-only for current in-memory seed; not an allowlist; remove from production after Mongo bootstrap.
- `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`: one-time; remove from production env after the first admin exists.
- Optional already-read names not in today’s example: `DEEPSEEK_API_BASE`, `KIMI_API_BASE`. Do not add secrets.
- `MEDIA_ROOT`: local default `backend/.data/media` (Git-ignored at implementation). Production uses `/var/www/<domain>/media` and must not depend on a client-supplied path.

### 9.2 Per-site isolation

| Variable | This site |
| --- | --- |
| `PORT` | `8081` |
| `MONGO_URI` | This site’s URI; database `eduardoos` only |
| `JWT_SECRET` | Unique to this site; required in production (no random fallback) |
| `JWT_ISSUER` | `https://eduardoos.com` |
| `JWT_AUDIENCE` | `https://eduardoos.com` |
| `COOKIE_SECURE` | `true` in production |
| SMTP | This site’s mailbox; `SMTP_FROM_ADDRESS=noreply@eduardoos.com` |
| AI keys | This site’s `/etc` file only |

Production secrets live only in `/etc/eduardoos-api.env`, mode `600`, not replaced by GitHub Actions. If a host still has `/etc/eduardoos.com-api.env`, migrate to the site-ID path during implementation (do not invent a dual-file runtime).

Local: API may load `backend/.env` then parent-workspace `.env`. Never commit them. Never print them.

GitHub Actions secrets remain `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, `VPS_PORT` only. No JWT, Mongo, SMTP, or AI secrets in Actions.

## 10. Tests (required at implementation)

Go tests on this API, with SMTP and AI mocked as today:

1. Register → pending user → OTP hash only in Mongo → verify → `verified`.
2. Duplicate email: generic success, one account.
3. Duplicate username: `conflict`.
4. OTP expired, reused, and attempt-limit exceeded.
5. Resend limits; generic responses (no enumeration).
6. Login with email; login with username; bad password; unknown user; disabled user — all generic `invalid_credentials` except as locked.
7. Logout clears cookies and rejects that access JWT / refresh.
8. Access JWT expires at 15 minutes; refresh issues a new access JWT.
9. Refresh rotation: old refresh rejected; new refresh works.
10. Reused refresh revokes the whole family.
11. CSRF missing/wrong and bad Origin/Referer on every unsafe route including refresh, password, profile, avatar.
12. Password reset happy path; expired/reused token; all sessions revoked.
13. Change-password requires current password; revokes other sessions.
14. Profile: owner can PATCH; other user’s id cannot be updated via this API.
15. Avatar: reject SVG/HTML/script/spoofed MIME/traversal; accept jpeg/png/webp; no file in Git/dist.
16. Cross-user avatar and profile denial.
17. Rate limit on login (and other approved limits).
18. No secrets, OTPs, refresh values, `Authorization` headers, or Mongo URIs in logs, error JSON, or frontend bundles.
19. No tokens in `localStorage` / `sessionStorage`.
20. Bootstrap creates the first admin only once; later bootstrap env does not mint admins.
21. Diagnostics remain 404 when `ENABLE_ADMIN_DIAGNOSTICS` is false; when true, still admin + CSRF.

## 11. Rollout and backward compatibility

Current auth is ephemeral in-memory diagnostics. There is **no** production user collection to migrate.

1. **Preserve `/api/` on Nginx** when proxying (no trailing-slash strip that maps `/api/auth/me` to `/auth/me`). Go public routes stay under `/api/...`. Direct local health remains `GET /health`. **Do not change Nginx in this documentation commit.** Update Nginx only during implementation, with tests that public `https://<domain>/api/...` hits the matching Go handler.
2. Add MongoDB persistence and the target routes. Keep `GET /api/auth/me`, `POST /api/auth/login`, `POST /api/auth/logout` working for `/diagnostics` (email + CSRF header + `credentials: "same-origin"`).
3. Add refresh cookie; old browsers without it just log in again (sessions already drop on process restart today).
4. Replace in-memory `ADMIN_PASSWORD` seed with one-time Mongo bootstrap; then delete bootstrap secrets from the VPS env.
5. Switch JWT to include `sid` (stop relying on `jti` as session id). In-flight diagnostic cookies become invalid on deploy — acceptable; admins sign in again.
6. Do not enable public registration in the UI until tests pass. Shipping API routes without UI is allowed.
7. `ENABLE_ADMIN_DIAGNOSTICS` stays off in production unless already manually enabled.

### Rollback

1. Point `/opt/apps/eduardoos/current` at the previous release SHA and restart **only** `eduardoos-api.service`.
2. Restore previous frontend by redeploying that commit’s `dist`.
3. Leave Mongo collections in place (unused by the old binary). Do not delete media.
4. New cookies (`refresh`, `__Host-*`) are ignored by the old binary; old cookie names still work if that release used them.
5. If bootstrap already ran, do not re-add `ADMIN_PASSWORD` as an allowlist.

## 12. Out of scope until a later spec

OAuth, passkeys, WebAuthn, TOTP 2FA, cross-site SSO, marketing mail, AI chat beyond existing admin diagnostics, public avatars, admin cross-user profile/avatar access, email-address changes, GIF avatars, a `roles` collection, `www` as an auth origin, and password-reset links.

Nginx, systemd `EnvironmentFile` path, and Git ignore for `backend/.data/media` are implementation-stage work, not this documentation commit.

## Open decisions requiring approval

None remaining for this milestone. Decisions 1–21 are recorded in **Locked decisions (approved)**.

Do not implement authentication application code until an implementation task is requested.
