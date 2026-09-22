# EPAM connector caveats

- Never put API keys in Git, CI logs, or chat. Keep them in `.epam/.env` (gitignored).
- Always `GET /api/v1/docs` before inventing paths or body shapes.
- PUT without `confirmOverwrite:true` fails with `replace_confirm_required`.
- POST/PUT **auto-publish** to `/articles` when the key owner is the configured public-articles publisher — there is no separate publish call.
- Do not send passwords, SMTP, Mongo URIs, or unrelated private user data inside the EPAM document.
- Host must grant entitlements **`api` + `epam`** (legacy `pamphlet` accepted).
- Payload size is capped (~8 MiB). Prefer JPEG images already embedded as the editor does.
- The web editor at `/documents/pamphlet` remains valid; this connector is the headless path to the same store.
