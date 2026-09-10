#!/usr/bin/env bash
# Run on the VPS as deploy. Args: email meta.json report.json org-name
set -euo pipefail

EMAIL="${1:?email}"
META="${2:?meta}"
PAYLOAD="${3:?payload}"
ORG_NAME="${4:-eduardoos.com}"
API="${API:-/opt/apps/eduardoos/current/api}"
ROOT="${EREPORT_ROOT:-/var/www/eduardoos.com/media/ereport}"

test -x "$API"
test -f "$META"
test -f "$PAYLOAD"

load_mongo_from_proc() {
  local pid
  pid="$(systemctl show -p MainPID --value eduardoos-api.service 2>/dev/null || true)"
  if [[ -z "${pid:-}" || "$pid" == "0" || ! -r "/proc/$pid/environ" ]]; then
    return 1
  fi
  eval "$(python3 - "$pid" <<'PY'
import shlex, sys
pid = sys.argv[1]
raw = open(f"/proc/{pid}/environ", "rb").read().split(b"\0")
wanted = {
    "MONGODB_URI",
    "MONGO_URI",
    "MONGO_DATABASE",
    "JWT_SECRET",
    "COOKIE_SECURE",
    "APP_ENV",
    "MEDIA_ROOT",
    "EREPORT_MEDIA_ROOT",
}
for item in raw:
    if not item or b"=" not in item:
        continue
    key, val = item.split(b"=", 1)
    name = key.decode("utf-8", "replace")
    if name in wanted:
        print(f"export {name}={shlex.quote(val.decode('utf-8', 'replace'))}")
PY
)"
}

if [[ -z "${MONGODB_URI:-}${MONGO_URI:-}" ]]; then
  load_mongo_from_proc || true
fi

if [[ -z "${MONGODB_URI:-}${MONGO_URI:-}" ]]; then
  echo "ereport-import: Mongo URI unavailable (cannot read api process environ)" >&2
  exit 1
fi

"$API" ereport-import \
  --email="$EMAIL" \
  --meta="$META" \
  --payload="$PAYLOAD" \
  --org-name="$ORG_NAME" \
  --root="$ROOT"

curl --fail --silent --show-error http://127.0.0.1:8081/health
echo
