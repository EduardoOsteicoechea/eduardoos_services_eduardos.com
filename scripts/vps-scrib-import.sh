#!/usr/bin/env bash
# Run on the VPS as deploy. Args: email library.json booksCSV sheetsCSV
set -euo pipefail

EMAIL="${1:?email}"
LIBRARY="${2:?library}"
BOOKS_CSV="${3:?books}"
SHEETS_CSV="${4:?sheets}"
API="${API:-/opt/apps/eduardoos/current/api}"

test -x "$API"
test -f "$LIBRARY"

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
wanted = {"MONGODB_URI", "MONGO_URI", "MONGO_DATABASE", "JWT_SECRET", "COOKIE_SECURE", "APP_ENV"}
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
  echo "scrib-import: Mongo URI unavailable" >&2
  exit 1
fi

"$API" scrib-import \
  --email="$EMAIL" \
  --library="$LIBRARY" \
  --books="$BOOKS_CSV" \
  --sheets="$SHEETS_CSV"

curl --fail --silent --show-error http://127.0.0.1:8081/health
echo
