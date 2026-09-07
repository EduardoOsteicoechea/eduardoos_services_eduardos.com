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

Locked specification (milestone-1 decisions approved; do not implement application code until an implementation task): [`docs/specs/001-authentication-and-profiles.md`](docs/specs/001-authentication-and-profiles.md).

## Uploaded media storage

This site follows the parent-workspace contract [`.cursor/rules/media-storage.mdc`](../.cursor/rules/media-storage.mdc). User uploads live on the VPS at `/var/www/eduardoos.com/media`. Local development media (when implemented) is `backend/.data/media` and must be Git-ignored. They are persistent production data, not Git contents and not frontend build output. CI/CD may `--delete` only `/var/www/eduardoos.com/html/`.

## Email, OTP, and notifications

This site follows the parent-workspace contract [`.cursor/rules/email-otp-notifications.mdc`](../.cursor/rules/email-otp-notifications.mdc). The Go API is the only mail sender. Production SMTP settings live only in the protected `/etc/eduardoos-api.env` file. They are never in Git, frontend builds, or CI/CD.

## AI chat and agent workflows

This site follows the parent-workspace contract [`.cursor/rules/ai-agents.mdc`](../.cursor/rules/ai-agents.mdc). DeepSeek and Kimi are backend-only integrations. Production keys live only in the protected `/etc/eduardoos-api.env` file. They are never in Astro, the browser, Git, or CI/CD.

## Admin diagnostics

`/diagnostics` and `POST /api/admin/diagnostics/*` are admin-only. The Go API enforces JWT, `admin` role, and CSRF. The page is UX only.

Diagnostics are **off by default**. Locally, set `ENABLE_ADMIN_DIAGNOSTICS=true` in `backend/.env` or the parent workspace `.env`, plus `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, SMTP, and AI keys as needed. Seeded admin users are created only from those env values. Production enablement is manual: add `ENABLE_ADMIN_DIAGNOSTICS=true` to `/etc/eduardoos-api.env`, then restart **only** `eduardoos-api.service`. When the flag is missing or false, the APIs return **404**.

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

`MONGO_URI` and every other secret must come from the environment (local `.env` loaded by your process manager or exported in the shell). Do not put secrets in frontend code. Do not commit `.env`.

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
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/eduardoos?retryWrites=true&w=majority
EOF
```

4. Allow the deploy user to restart only this service:

```bash
echo 'deploy ALL=NOPASSWD: /bin/systemctl restart eduardoos-api.service' | sudo tee /etc/sudoers.d/eduardoos-api
sudo chmod 440 /etc/sudoers.d/eduardoos-api
```

Replace `deploy` with `VPS_USER`.

5. Nginx: serve the static files and proxy `/api/` to the loopback API. Example:

```nginx
server {
    listen 80;
    server_name eduardoos.com www.eduardoos.com;
    root /var/www/eduardoos.com/html;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8081/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri.html $uri/ /404.html;
    }
}
```

`proxy_pass` must **preserve** the `/api/` prefix (implementation stage). The trailing-slash example below is the current README sketch and must be corrected when auth is implemented so `/api/auth/me` reaches Go `/api/auth/me`. Direct local health remains `http://127.0.0.1:8081/health`. Put TLS in front of this server (Certbot or your existing HTTPS terminator). The API itself must stay on `127.0.0.1`.

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
