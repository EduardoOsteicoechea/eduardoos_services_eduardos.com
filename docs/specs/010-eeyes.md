# 010 — eEyes (device shells + hub)

Status: **specification lock**. Implement only after this document is the contract.

## 0. Scope

Product `eeyes` on `eduardoos.com`:

| Surface | Role |
| --- | --- |
| Hub `/eeyes` | Plan human tasks, pair devices (3 consecutive codes), review completions + media, download APK/EXE, revoke devices |
| Device API `/api/eeyes/device/*` | Pair, sync, start/complete tasks, upload base64 media, ack notifications |
| Embedded UI `/api/eeyes/ui` | Raw HTML/CSS/JS for WebView shells (no user secrets in the document) |
| Android shell (`android/`) | Signed APK: WebView + camera + mic + local notifications + offline queue + self-update |
| Desktop shell (`desktop/`) | WPF `.exe`: WebView2 + camera + mic + toasts + offline queue + self-update |

Out of scope: continuous background surveillance without a human-started task; cross-site product port; connector sidecar.

## 1. Entitlement

- Catalog id: `eeyes` (label **eEyes**, monthly USD 1).
- Admin bypasses. Cookie hub routes require session + entitlement. Device token routes require live entitlement on the device owner.
- Revoking entitlement makes the next device request return `401` `device_revoked` / `forbidden` after Mongo re-check.

## 2. Pairing (biometric + 3 codes, one at a time)

1. Authenticated hub: `POST /api/eeyes/pairings` → `{ id, code1, code2, code3, expiresAt }` (4-digit codes, TTL **10 minutes**, single use).
2. Hub polls `GET /api/eeyes/pairings/{id}` (`step` 0–3, `status`). The hub shows **only** the code for the next step (`code1` while step 0, `code2` after step 1, `code3` after step 2), never all three at once.
3. App step 1: shell asks for **user verification first** (Android `BiometricPrompt` with `BIOMETRIC_WEAK | DEVICE_CREDENTIAL`; Desktop Windows Hello `UserConsentVerifier`). Failure → bridge error `biometric_failed` / `biometric_unavailable`, no API call.
4. Each step is `POST /api/eeyes/device/pair` with `{ step, code1, code, session, platform, model, shellVersion, installId }`:
   - `step: 1` → validates `code1`, returns `{ step: 1, next: 2, session }` (random session; server stores its hash).
   - `step: 2|3` → requires matching `session` and the previous step done; verifies `code2`/`code3` in constant time.
   - `step: 3` → issues device token `eos_dev_` + 24 random chars, stores **HMAC hash only**, `expiresAt = now + 30 days`.
5. `installId` (Android `ANDROID_ID`, Desktop `MachineGuid`) is stored as an HMAC. Re-pairing the same install of the same owner/platform **reuses the device record** (rotates token, extends 30 days) instead of creating a duplicate. Uninstalling wipes the local secure token, so a reinstall must re-pair.
6. Limits: 5 failed attempts per pairing; IP rate limit on pair.

## 3. Device token

- Prefix `eos_dev_`. Sent as `Authorization: Bearer …`.
- Lifetime **30 days fixed** from pair. Hub can `DELETE /api/eeyes/devices/{id}` → sets `revokedAt`; next request fails immediately (no JWT; every request hits Mongo).
- Shell stores token only in OS secure storage (Android Keystore AES-GCM + DataStore; Desktop DPAPI CurrentUser). **Never** exposed to WebView JS.
- On `401` with `device_revoked` or `device_expired`: clear token, queue, cache; show pair UI.

## 4. Tasks (human)

Hub creates tasks:

```json
{
  "title": "string",
  "instructions": "string",
  "deviceId": "string",
  "notifyAt": "RFC3339",
  "reminders": ["RFC3339"],
  "dueAt": "RFC3339|null",
  "photoIntervalSec": 0,
  "maxPhotos": 10,
  "audioSeconds": 15
}
```

- `photoIntervalSec = 0` → manual photos only (still capped by `maxPhotos`).
- Shell shows local notification at `notifyAt` / reminders.
- Person opens task → **Start** → optional auto photo / audio → **Complete**.
- Capture is forbidden without an in-progress task started by the person. Visible indicator required (Android FGS notification; Desktop tray + UI banner).

Statuses: `pending` | `in_progress` | `completed` | `cancelled`.

## 5. Media upload

Body:

```json
{
  "clientMediaId": "uuid",
  "kind": "image|audio",
  "mime": "image/jpeg|audio/mp4",
  "capturedAt": "RFC3339",
  "width": 0,
  "height": 0,
  "durationMs": 0,
  "sha256": "hex",
  "dataBase64": "..."
}
```

- Image: JPEG q≈70, max edge 1600, strip EXIF, decoded ≤ 2 MB.
- Audio: AAC-LC mono 64 kbps M4A, decoded ≤ 5 MB.
- Server validates magic bytes (JPEG/WebP; M4A `ftyp`), writes under `EEYES_MEDIA_ROOT/<owner>/<task>/<uuid>`, stores metadata. `clientMediaId` unique per device → idempotent `201`.
- Served via API (`private, no-store`); no X-Accel-Redirect.

## 6. Device sync

`GET /api/eeyes/device/sync` → tasks for this device, pending notifications, `uiVersion`, optional `update` (`versionCode`, `versionName`, `sha256`, `url` path), and revoked flag if applicable.

Live connection: `GET /api/eeyes/device/wait?v=<version>` (device token). Stale or empty `v` → immediate `{ changed: true, v }`; otherwise the request is held until the hub creates/edits/deletes a task for that device or revokes it (`changed: true`), or ~50 s pass (`changed: false`). Max 3 concurrent waits per device (`rate_limited`). Versions are per API process, so a restart reads as a change. Shells loop wait → `/sync` on change (and at least every 5 min on Android / 30 s on Desktop).

Two extra refreshes run besides that connection:

- Every 15 minutes, including with the app closed.
- As soon as a network becomes available after a loss.

- Android: `LiveSyncService` foreground service (`specialUse`, plus `camera` when started from the visible app; low-priority ongoing notification "eEyes activo"), started on app open, after pairing, on boot and on app update; partial wake lock only while processing a reply; asks once for the battery-optimization exemption. A `NetworkCallback` syncs on reconnect. `SyncAlarmReceiver` is an exact 15-minute alarm (chained, re-armed on boot and when the app opens) that restarts the service and syncs; WorkManager repeats the same tick when a network exists, and a one-shot runs when connectivity returns if the process was offline.
- Desktop: the same loop on a background task, plus a 15-minute timer and a network-address listener. Closing the window hides it to the tray (Salir quits); the loops keep running.

### Scheduled photo (`kind: "photo"`)

Hub card **Programar foto** creates `POST /api/eeyes/tasks` `{ kind: "photo", deviceId, title, cameraFacing: "back"|"front" (default back), notifyAt? (default now) }`. Not listed in sync `tasks`; instead sync lists `{ key: "capture:<taskId>", kind: "capture", facing, at, title }` until acked. At `at` the shell takes one photo with that camera (no human start), uploads it to `/device/tasks/{id}/media` (image only; allowed while `pending`), and the first upload completes the task so it appears in completions and the card. The shell acks the key once the photo is taken and posts a visible "eEyes tomó una foto" notification.

- Android: Camera2 still (AE warm-up on a small YUV stream, pixels rotated by sensor orientation). Background camera works only while `LiveSyncService` runs with the `camera` FGS type (granted when started from the visible app); otherwise it notifies "abre eEyes" and retries when the app is opened.
- Desktop: `MediaCapture` low-lag photo on the camera whose enclosure panel matches `facing` (else the first camera); retries up to 5 times per key per run.
- Hub stages: `scheduled → waiting_sync → dispatched → taken → uploaded`.

Notifications are listed up to 24 h ahead until acked. Shells ack a key only after it was actually shown (Android: alarm fired and system notifications enabled; Desktop: toast time reached). Server records per task `notifyDispatchedAt` (first sync that listed it) and `notifyAckedAt`; per device `lastSyncAt` and `lastSyncNotifications`.

### Diagnostics

- Hub card **Diagnóstico** (`/eeyes?view=diagnostics`): per device last contact / last sync / notifications listed, plus recent notifications with stage `scheduled → waiting_sync → dispatched → shown`.
- Shell UI **Diagnóstico** panel (bridge `getDiagnostics`, `testNotification`): last sync time/HTTP/error, notifications received, last notification shown, notification permission and exact-alarm state (Android). No tokens or secrets.

## 7. Embedded UI

- `GET /api/eeyes/ui` (+ `/api/eeyes/ui/app-css`, `/api/eeyes/ui/app-js`) from `go:embed` under `backend/eeyes_ui/`. Asset URLs stay extensionless because production Nginx serves `*.js`/`*.css` from the static root before the `/api/` proxy.
- CSP: `default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'`.
- Query: `?platform=&shellVersion=`. Screens: Pair (3 steps), Tasks, Active task, Done, Update required.
- All data I/O via shell bridge; rem-only CSS; Spanish copy.

## 8. Bridge protocol

Message: `{ "id": "string", "type": "string", "payload": {} }`.

Web → native: `getState`, `pairStep` (`{ step, code }`; native keeps `code1` + `session` in memory and runs the biometric prompt on step 1), `getDiagnostics`, `testNotification`, `startTask`, `capturePhoto`, `startAutoCapture`, `stopAutoCapture`, `recordAudio`, `completeTask`, `request` (allowlisted `/api/eeyes/device/*` only), `openExternal`.

Native → web: `state`, `captureQueued`, `uploadProgress`, `notificationTapped`, `updateAvailable`, `revoked`.

Origin must be exactly `https://eduardoos.com` (local: configured base URL). Navigation locked to `/api/eeyes/ui*`.

## 9. Releases / updates

- Files under `EEYES_RELEASES_ROOT/<platform>/` with `latest.json`:

```json
{
  "versionCode": 12,
  "versionName": "1.0.12",
  "sha256": "hex",
  "size": 123,
  "minVersionCode": 1,
  "notes": "",
  "file": "eeyes-android.apk"
}
```

- Hub downloads: `GET /api/eeyes/downloads/{android|desktop}` (entitlement + attachment).
- Shells download artifact, verify sha256, apply update (Android PackageInstaller; Desktop replace + relaunch).

## 10. Security

- Deny-by-default; owner + entitlement on every resource.
- Never log tokens, codes, base64 bodies, or absolute media paths to clients.
- Audit: pair, revoke, task CRUD, media, complete.
- Error codes: `pairing_invalid`, `device_revoked`, `device_expired`, plus existing suite codes. Bridge-only: `biometric_failed`, `biometric_unavailable`, `unknown_type` (old shell → UI asks to update).

## 11. Tests required

Pairing happy/expired/reuse/bruteforce; immediate revoke; cross-user denial; entitlement loss; bad base64/MIME/size; media idempotency; `assertNoSecrets`.
