# eduardoos.com

Independent website for [eduardoos.com](https://eduardoos.com). The frontend is a static Astro + TypeScript app with client-side routing. The backend is a Go API that listens only on loopback.

Remote: `https://github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com.git`

## Layout

```
eduardoos.com/
  frontend/                 Astro static site (artifact: frontend/dist/)
  backend/                  Go API
  backend/systemd/          Production unit template
  .github/workflows/        GitHub Actions deploy
```

| Item | Value |
| --- | --- |
| Domain | `eduardoos.com` |
| API bind | `127.0.0.1:8081` |
| Frontend → API | same-origin `/api/` |
| Static files on VPS | `/var/www/eduardoos.com/html/` |
| API releases | `/opt/apps/eduardoos/releases/<git-sha>/api` |
| Live API symlink | `/opt/apps/eduardoos/current` → release dir |
| Live binary | `/opt/apps/eduardoos/current/api` |
| Secrets file | `/etc/eduardoos-api.env` |
| systemd unit | `eduardoos-api.service` |

The frontend never contains backend URLs, MongoDB URIs, or secrets. Those stay in environment variables on the server.

## Authentication and authorization

This site follows the parent-workspace contract [`.cursor/rules/auth-security.mdc`](../.cursor/rules/auth-security.mdc). Users, JWTs, refresh tokens, and cookies are local to `eduardoos.com`. Frontend route guards are UX only. Real authorization decisions are enforced by this site’s Go API.

Locked specification: [`docs/specs/001-authentication-and-profiles.md`](docs/specs/001-authentication-and-profiles.md). Cookie authentication, MongoDB users/sessions, email OTP, and private avatars are implemented. Nginx templates live in [`docs/nginx/eduardoos.com.conf`](docs/nginx/eduardoos.com.conf).

Passwords are **8–128** characters and hashed with Argon2id. `BOOTSTRAP_ADMIN_PASSWORD` and `ADMIN_PASSWORD` must meet that length when set.

Canonical session paths (Astro `trailingSlash: never`): `/session` (sign in), `/session/register`, `/session/verify-email`, `/session/forgot-password`, `/session/reset-password`, `/session/profile`, `/session/change-password`.

Bootstrap an admin **only** when the database has no `admin` user and `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (or, for local migration, `ADMIN_EMAIL` / `ADMIN_PASSWORD`) are set. The process never reseeds that password on later startups. After the first admin exists, **remove** `BOOTSTRAP_ADMIN_PASSWORD` and `ADMIN_PASSWORD` from `/etc/eduardoos-api.env`.

## Database setup

Database setup is automatic on API startup. The Go API connects with `MONGODB_URI` and the locked database name `eduardoos`. It creates required collections and indexes and applies safe, ordered schema migrations. No manual MongoDB Compass collection or index creation is required.

Atlas only needs a database user with `readWrite` on `eduardoos` and the VPS public IP allowlisted. GitHub Actions does not create collections, indexes, or users.

Collections provisioned on startup: `users`, `auth_sessions`, `email_verification_otps`, `password_reset_tokens`, `csrf_challenges`, `schema_migrations`, `entitlements`, `api_keys`.

eReport payloads, metadata, history, invites, and images are **not** Mongo collections. They live only under `/var/www/eduardoos.com/media/ereport/` (`EREPORT_MEDIA_ROOT`). Mongo is used for identity, sessions, OTPs, entitlements, and API keys.

## Pamphlet

Pamphlet metadata and complete EPAM document bodies live in MongoDB (`epams` and
`epam_bodies`). The API does not read or write `media/pamphlet/` at runtime.
On the first API start after this release, legacy filesystem-backed EPAM bodies
are copied to MongoDB and their metadata is cut over. The original files remain
on disk as offline backup data and are not read by the application.

To import a private EPAM JSON file manually from the VPS without placing it in
Git or CI, copy it to a protected temporary location, then run:

```bash
sudo -u deploy /opt/apps/eduardoos/current/api epam-import \
  --email=user@example.com \
  --file=/secure-temporary-path/document.json
```

The command rejects duplicate document IDs unless `--overwrite` is supplied.

Safe migrations run automatically. Destructive migrations never run on startup. There are no destructive migrations in this release. A future drop/rebuild would require an Atlas backup (or `mongodump`) and then:

```bash
/opt/apps/eduardoos/current/api migrate-destructive --confirm-backup=I_HAVE_A_BACKUP
```

Inspect migration status without printing secrets, documents, or credentials:

```bash
/opt/apps/eduardoos/current/api migrate-status
```

Import a legacy `meta.json` + `report.json` pair onto that account’s filesystem tree (lookup is by email; directories use the immutable user id only):

```bash
/opt/apps/eduardoos/current/api ereport-import \
  --email=user@example.com \
  --meta=/path/meta.json \
  --payload=/path/report.json \
  --org-name=eduardoos.com
```

That command logs only migration id, description, checksum, timestamp, and the destructive flag. In Compass or `mongosh`, open database `eduardoos` and inspect `schema_migrations` the same way. Do not dump `users`, sessions, or OTP collections to the terminal.

Backup before any future destructive migration:

1. Take an Atlas snapshot of this cluster (or the `eduardoos` database).
2. Optionally dump without printing the URI:

```bash
set -a
. /etc/eduardoos-api.env
set +a
mongodump --uri="$MONGODB_URI" --db=eduardoos --out="$HOME/backups/eduardoos-$(date -u +%Y%m%dT%H%M%SZ)"
unset MONGODB_URI SMTP_PASSWORD JWT_SECRET
```

Do not `echo` or `cat` the env file. Tests use an in-memory store or `eduardoos_gotest` and never migrate the production database.

## Uploaded media storage

This site follows the parent-workspace contract [`.cursor/rules/media-storage.mdc`](../.cursor/rules/media-storage.mdc). User uploads live on the VPS at `/var/www/eduardoos.com/media`. Local development media is `backend/.data/media` (Git-ignored). They are persistent production data, not Git contents and not frontend build output. CI/CD may `--delete` only `/var/www/eduardoos.com/html/`. Do not expose a public `/media/` alias; private avatars and eReport files are authorized by Go and delivered with Nginx `X-Accel-Redirect` to `/internal-media/`.

## eReport

eReport is org-only. Owners sign in with the existing HttpOnly cookie session. Invitees use `/ereport/invite` (public; no AuthGate) plus emailed OTP. New images are JPEG/PNG/WebP files under:

```
/var/www/eduardoos.com/media/ereport/<username>/<safe-email>/orgs/<org-id>/reports/<report-id>/
```

Owner directories are named after the account's username and email so the tree is browsable, but neither value ever selects or authorizes anything: every request resolves its owner from the authenticated session user id, and `<safe-email>` encodes the address (`@` becomes `_at_`, other characters become `-`).

The directory a user receives is pinned on first use in `<root>/.owners/<user-id>.json`. The pin wins over the live username and email, so changing either in the profile never moves, renames, or orphans a report. A tree already written under the earlier `<user-id>/` layout is adopted in place and keeps that path.

There is no S3 runtime, and report JSON is not stored in MongoDB.

Local development:

1. Start the Go API (`cd backend && go run .`).
2. Start the Astro app (`cd frontend && npm run dev`).
3. Sign in, open `/ereport`, create an org/report (admin bypasses subscription locally if you grant entitlements or use the bootstrap admin).
4. Tracker autosaves through `/api/ereport/orgs/{orgId}/reports/{reportId}`.
5. Invite a mailbox, open the magic link, request OTP, then edit in the full tracker iframe.

Production env names (values only in `/etc/eduardoos-api.env`): `EREPORT_MEDIA_ROOT`, `EREPORT_MAX_IMAGE_BYTES`, `EREPORT_MAX_IMAGE_EDGE`, `EREPORT_MAX_PAYLOAD_BYTES`, `PUBLIC_BASE_URL`. Defaults: media root `/var/www/eduardoos.com/media/ereport`, 8 MiB image/payload limits.

**Backups:** include `/var/www/eduardoos.com/media/` (especially `media/ereport/`) **and** the `eduardoos` Mongo database. CI/CD must never rsync `--delete` the media tree. After a frontend rollback, report files remain on disk.

**Rollback:** restore a previous API release as below. eReport files are independent of the binary; do not delete `media/ereport/` to roll back code.

## Email, OTP, and notifications

This site follows the parent-workspace contract [`.cursor/rules/email-otp-notifications.mdc`](../.cursor/rules/email-otp-notifications.mdc). The Go API is the only mail sender. Production SMTP settings live only in the protected `/etc/eduardoos-api.env` file. They are never in Git, frontend builds, or CI/CD.

## AI chat and agent workflows

This site follows the parent-workspace contract [`.cursor/rules/ai-agents.mdc`](../.cursor/rules/ai-agents.mdc). DeepSeek and Kimi are backend-only integrations. Production keys live only in the protected `/etc/eduardoos-api.env` file. They are never in Astro, the browser, Git, or CI/CD.

## Global voice (speech-to-text and spoken replies)

The global agent dock can take voice input. The browser streams 16 kHz mono PCM
chunks to `POST /api/voice/stream/{id}/chunk`, a self-hosted Vosk worker returns
live transcription, and the final transcript runs through the same `/api/chat`
pipeline. With `speak:true`, the assistant's answer is synthesized one sentence
at a time with the existing Piper toolchain and streamed back over SSE.

The feature is **off by default**. When `VOICE_ENABLED` is unset or false, the
voice routes are not registered (they return 404) and the mic UI stays hidden.
Locked specification: [`docs/specs/005-voice-stt-tts.md`](docs/specs/005-voice-stt-tts.md).

Local development (no workers or models required):

```
VOICE_ENABLED=true
VOICE_FAKE_STT=true
VOICE_FAKE_TTS=true
```

Production requires a runnable Vosk worker and Piper models, both provisioned
on the VPS outside CI/CD (like the eVoice worker):

1. Install the worker deps in a venv (`backend/voice-worker/requirements.txt`).
2. Download Vosk `vosk-model-small-es-*` and `vosk-model-small-en-us-*`.
3. Provide Piper `es` / `en` `.onnx` models and the `ffmpeg` binary.
4. Run `backend/voice-worker/stt_server.py` (template:
   `backend/systemd/eduardoos-voice-stt.service`) and set the `VOICE_*`
   variables in `/etc/eduardoos-api.env`.

Voice env names: `VOICE_ENABLED`, `VOICE_STT_URL`, `VOICE_STT_LANG_DEFAULT`,
`VOICE_PYTHON`, `VOICE_TTS_SCRIPT`, `VOICE_PIPER_MODEL_ES`,
`VOICE_PIPER_MODEL_EN`, `VOICE_MAX_CHUNK_BYTES`, `VOICE_MAX_SESSION_SECONDS`,
`VOICE_MAX_CONCURRENT`, `VOICE_FAKE_STT`, `VOICE_FAKE_TTS`.

No Nginx change is required: the `/api/` location already sets
`proxy_buffering off` and a long `proxy_read_timeout`, and PCM chunks are well
under `client_max_body_size`. The STT worker binds loopback only and must never
be exposed publicly.

## eVoice (batch text-to-audio)

`/evoice` turns uploaded documents (`.docx`, `.txt`, `.pdf`, images) into MP3
audio. The Go API shells out to `backend/evoice-worker/linux_sync.py`, which
extracts text (Tesseract OCR / PyMuPDF), optionally refines it with DeepSeek, and
synthesizes speech with Piper (fallback: espeak-ng) encoded to **MP3 mono
64 kbps 44.1 kHz** via ffmpeg.

Local development needs no worker or models: set `EVOICE_FAKE_TTS=true` and the
Go fake runner produces a valid silent MP3.

The worker **code** is deployed by CI into each release at
`/opt/apps/<app>/current/evoice-worker/`. The venv, system tools, and Piper
model are provisioned on the VPS outside CI/CD:

```bash
# On the VPS, as the deploy user, from the backend/evoice-worker directory:
bash provision.sh
```

Then set in `/etc/eduardoos-api.env` (values printed by the script) and restart
`eduardoos-api.service`:

```
EVOICE_FAKE_TTS=false
EVOICE_MEDIA_ROOT=/var/www/eduardoos.com/media/evoice
EVOICE_PYTHON=/opt/apps/eduardoos/evoice-venv/bin/python
EVOICE_WORKER_SCRIPT=evoice-worker/linux_sync.py
EVOICE_PIPER_MODEL=/var/www/eduardoos.com/models/evoice/es_ES-sharvard-medium.onnx
DEEPSEEK_MODEL=<deepseek chat model id>
DEEPSEEK_VISION_MODEL=<deepseek vision model id>
```

`EVOICE_WORKER_SCRIPT` is resolved relative to the systemd `WorkingDirectory`
(the current release), so it tracks every deploy. If the script is missing the
job fails with a clear `evoice worker script not found` message instead of a
silent no-op. System packages required: `ffmpeg`, `tesseract-ocr`, `espeak-ng`.

Production **ignores** `EVOICE_FAKE_TTS=true` (it is forced off) so the API can
never ship silent placeholder audio. TTS resolution order is Piper →
`espeak-ng` → host system voice; the Piper step reuses `VOICE_PIPER_MODEL_ES`
when `EVOICE_PIPER_MODEL` is unset, so an existing global-voice model is enough.
Piper is the only natural-sounding engine: `espeak-ng`/Pico/Flite are robotic
emergencies, so always provision Piper and a voice model (the job log prints
`robotic_fallback` when it has to use one). The Piper binary is found on PATH,
in `EVOICE_PIPER_BIN`/`VOICE_PIPER_BIN`, or in the interpreter/voice venv.

## Admin diagnostics

`/diagnostics` and `POST /api/admin/diagnostics/*` are admin-only. The Go API enforces JWT, `admin` role, and CSRF. The page is UX only.

Diagnostics are **off by default**. Locally, set `ENABLE_ADMIN_DIAGNOSTICS=true` in `backend/.env` or the parent workspace `.env`, plus `JWT_SECRET`, SMTP, and AI keys as needed. The first admin is created by one-time bootstrap env vars, not by reseeding `ADMIN_PASSWORD` on every start. Production enablement is manual: add `ENABLE_ADMIN_DIAGNOSTICS=true` to `/etc/eduardoos-api.env`, then restart **only** `eduardoos-api.service`. When the flag is missing or false, the APIs return **404**.

There is no public email-send or AI-provider endpoint. A test email goes only to the signed-in administrator’s verified address. Tests mock SMTP and providers (`go test ./...` in `backend/`).

## Local development

Requirements: Node 22+, Go 1.23+, Git.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Astro serves the static app at `http://127.0.0.1:4321` and proxies `/api/` to `http://127.0.0.1:8081`.

### Backend

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
go test ./...
go run .
```

The API binds to `127.0.0.1:8081`. Confirm:

```bash
curl --fail http://127.0.0.1:8081/health
```

Expected JSON includes `"status":"ok"` and HTTP 200.

`MONGODB_URI` and every other secret must come from the environment (local `.env` loaded by your process manager or exported in the shell). Do not put secrets in frontend code. Do not commit `.env`.

### Client routing

Pages are generated as static HTML. In the browser, `astro:transitions` `ClientRouter` plus `src/lib/router.ts` navigate without a full reload. Known routes also exist as files in `frontend/dist/` so first loads and refresh work.

## Build

```bash
cd frontend
npm ci
npm run build
```

Production artifact: `frontend/dist/`. It is gitignored and must not be committed.

```bash
cd backend
go test ./...
set CGO_ENABLED=0
set GOOS=linux
set GOARCH=amd64
go build -o api .
```

On Linux / macOS:

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o api .
```

The deploy workflow produces a Linux AMD64 binary named `api`.

## Server setup

Run once on the VPS as a user that can write the app paths and use systemd.

1. Create directories:

```bash
sudo mkdir -p /var/www/eduardoos.com/html
```

Backend release directories already exist and are owned by `deploy`. CI only creates a unique folder under `/opt/apps/eduardoos/releases/` and never creates `/opt/apps` or `/opt/apps/eduardoos`.

2. The live unit on the VPS is `eduardoos-api.service`. It executes `/opt/apps/eduardoos/current/api` and loads `/etc/eduardoos-api.env`.

3. Create secrets (never commit this file):

```bash
sudo install -m 600 /dev/null /etc/eduardoos-api.env
sudo tee /etc/eduardoos-api.env >/dev/null <<'EOF'
PORT=8081
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/eduardoos?retryWrites=true&w=majority
EOF
```

4. Allow the deploy user to restart only this service:

```bash
echo 'deploy ALL=NOPASSWD: /bin/systemctl restart eduardoos-api.service' | sudo tee /etc/sudoers.d/eduardoos-api
sudo chmod 440 /etc/sudoers.d/eduardoos-api
```

Replace `deploy` with `VPS_USER`.

5. Nginx: serve the static files and proxy `/api/` to the loopback API **without** a trailing slash on `proxy_pass` (that would strip `/api` and break auth). Full template: [`docs/nginx/eduardoos.com.conf`](docs/nginx/eduardoos.com.conf). Direct local health remains `http://127.0.0.1:8081/health`. Do not add a public `/media/` location. After this eReport release, apply on the VPS (not from CI): `client_max_body_size 10m;` on the server and `/api/` location, keep `location /internal-media/` internal, and add exact `try_files` locations for `/ereport-tracker.html`, `/ereport`, `/ereport/workspace`, `/ereport/invite`, `/ereport/tracker.html`, and `/api-docs` so those pretty URLs cannot fall through to the tracker HTML. The pretty hub `/ereport/{ownerSafe}` and pretty workspace `/ereport/{ownerSafe}/{reportId}` are served by regex locations with negative lookaheads, so the exact routes above always win; those segments are display only and are never used to locate or authorize files. Optionally add `ReadWritePaths=/var/www/eduardoos.com/media` to `eduardoos-api.service`.

```nginx
    location /api/ {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /internal-media/ {
        internal;
        alias /var/www/eduardoos.com/media/;
    }
```

Redirect `www` to apex **before** any auth cookies are issued. Put TLS in front of this server (Certbot or your existing HTTPS terminator). The API itself must stay on `127.0.0.1`.

6. Install the GitHub Actions **public** key in `~/.ssh/authorized_keys` for the same Linux user as `VPS_USER` (often `root` on a new VPS). `VPS_SSH_KEY` must be the matching **private** key, including the `BEGIN` / `END` lines.

```bash
# On your laptop, from the private key you stored as VPS_SSH_KEY:
ssh-keygen -y -f github-actions-deploy > github-actions-deploy.pub
ssh-keygen -lf github-actions-deploy

# On the VPS, as VPS_USER:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# paste the .pub line, then:
chmod 600 ~/.ssh/authorized_keys
```

`Permission denied (publickey,password)` means the VPS accepted the TCP connection but rejected this key. The panel username is not always the SSH user. Confirm `VPS_USER` can log in with that exact public key.

## GitHub secret setup

In the GitHub repository: **Settings → Secrets and variables → Actions**. Add:

| Secret | Purpose |
| --- | --- |
| `VPS_HOST` | VPS hostname or IP |
| `VPS_USER` | SSH user used by Actions |
| `VPS_SSH_KEY` | Private key whose public half is on the VPS |
| `VPS_KNOWN_HOSTS` | Exact host key lines for the VPS |
| `VPS_PORT` | SSH port (use `22` unless you changed it) |

Create `VPS_KNOWN_HOSTS` on a trusted machine:

```bash
ssh-keyscan -p "$VPS_PORT" "$VPS_HOST"
```

Paste the output as the secret. The workflow writes that file and sets `StrictHostKeyChecking=yes`. Host-key checking is never disabled.

Do not store MongoDB URIs or `.env` contents as frontend env vars. Keep database credentials only in `/etc/eduardoos-api.env` (and optionally a GitHub secret if you later add a migrate job — not used by this workflow).

## Deployment

Pushes to `main` and manual **workflow_dispatch** run `.github/workflows/deploy.yml`. The job:

1. Checks out source.
2. Builds the Astro frontend with `npm ci` and `npm run build`.
3. Runs `go test ./...`.
4. Compiles a Linux AMD64 binary named `api`.
5. Authenticates with `VPS_SSH_KEY`.
6. Verifies the host with `VPS_KNOWN_HOSTS`.
7. rsyncs only `frontend/dist/` to `/var/www/eduardoos.com/html/` with `--delete`.
8. Uploads only the `api` binary to `/opt/apps/eduardoos/releases/<git-sha>/api`.
9. Atomically points `/opt/apps/eduardoos/current` at that release.
10. Restarts `eduardoos-api.service`.
11. Verifies `curl --fail http://127.0.0.1:8081/health` on the VPS.

Source, `node_modules`, `.git`, `.env` files, and credentials are never uploaded.

## Rollback

API (on the VPS):

```bash
ls -1 /opt/apps/eduardoos/releases
sudo ln -sfn /opt/apps/eduardoos/releases/<previous-sha> /opt/apps/eduardoos/current
sudo systemctl restart eduardoos-api.service
curl --fail http://127.0.0.1:8081/health
```

Frontend: the document root is replaced on each deploy. Restore a previous frontend by re-running the workflow on the desired commit (`workflow_dispatch` after checking out that SHA, or revert on `main` and push).

Keep a few old directories under `/opt/apps/eduardoos/releases/` and delete the rest after you confirm a release.
