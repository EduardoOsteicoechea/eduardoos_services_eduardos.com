#!/usr/bin/env bash
# Inspect ereport FS consistency for an owner on the VPS (deploy user).
# Args: ownerUserId [orgId] [reportId...]
set -euo pipefail

OWNER="${1:?ownerUserId}"
ROOT="${EREPORT_ROOT:-/var/www/eduardoos.com/media/ereport}"

echo "=== root=$ROOT owner=$OWNER ==="
if [[ ! -d "$ROOT" ]]; then
  echo "missing root" >&2
  exit 1
fi

echo "--- owner pins ---"
if [[ -f "$ROOT/.owners/${OWNER}.json" ]]; then
  cat "$ROOT/.owners/${OWNER}.json"
  echo
else
  echo "(no pin file)"
fi

echo "--- top-level under root (names only) ---"
ls -1 "$ROOT" | head -n 50

# Resolve owner dir candidates
CANDIDATES=()
if [[ -d "$ROOT/$OWNER" ]]; then
  CANDIDATES+=("$ROOT/$OWNER")
fi
# pin-based
if [[ -f "$ROOT/.owners/${OWNER}.json" ]]; then
  mapfile -t SEGS < <(python3 - "$ROOT/.owners/${OWNER}.json" <<'PY'
import json,sys
pin=json.load(open(sys.argv[1]))
print("\n".join(pin.get("segments") or []))
PY
)
  if [[ ${#SEGS[@]} -ge 1 ]]; then
    JOIN="$ROOT"
    for s in "${SEGS[@]}"; do JOIN="$JOIN/$s"; done
    CANDIDATES+=("$JOIN")
  fi
fi
# email-ish dirs
while IFS= read -r d; do
  CANDIDATES+=("$d")
done < <(find "$ROOT" -maxdepth 2 -type d -name '*eduardooost*' 2>/dev/null || true)

# uniq
mapfile -t CANDIDATES < <(printf '%s\n' "${CANDIDATES[@]}" | awk 'NF' | sort -u)

for OD in "${CANDIDATES[@]}"; do
  echo "=== candidate owner dir: $OD ==="
  if [[ ! -d "$OD" ]]; then
    echo "(missing)"
    continue
  fi
  echo "-- orgs.json --"
  if [[ -f "$OD/orgs.json" ]]; then
    python3 - "$OD/orgs.json" <<'PY'
import json,sys
idx=json.load(open(sys.argv[1]))
for o in idx.get("orgs") or []:
    print(f"{o.get('id')}\t{o.get('name')}\thidden={o.get('hidden')}")
PY
  else
    echo "(no orgs.json)"
  fi
  echo "-- orgs/*/library.json reports --"
  find "$OD/orgs" -mindepth 2 -maxdepth 2 -name library.json 2>/dev/null | while read -r lib; do
    org="$(basename "$(dirname "$lib")")"
    echo "org=$org library=$lib"
    python3 - "$lib" "$OD" "$org" <<'PY'
import json,os,sys
lib=json.load(open(sys.argv[1]))
od, org = sys.argv[2], sys.argv[3]
for r in lib.get("reports") or []:
    rid=r.get("id")
    rdir=os.path.join(od,"orgs",org,"reports",rid or "")
    meta=os.path.join(rdir,"meta.json")
    payload=os.path.join(rdir,"report.ereport")
    legacy=os.path.join(rdir,"report.json")
    print(f"  report={rid} tema={r.get('tema')}")
    print(f"    dir_exists={os.path.isdir(rdir)} meta={os.path.isfile(meta)} ereport={os.path.isfile(payload)} report.json={os.path.isfile(legacy)}")
    if os.path.isfile(meta):
        m=json.load(open(meta))
        print(f"    meta.id={m.get('id')} meta.orgId={m.get('orgId')} meta.ownerUserId={m.get('ownerUserId')}")
PY
  done
done

# Specific ids if provided
shift || true
ORG_FILTER="${1:-}"
if [[ -n "${ORG_FILTER:-}" ]]; then shift || true; fi
for RID in "$@"; do
  echo "=== find reportId=$RID ==="
  find "$ROOT" -type d -name "$RID" 2>/dev/null | head -n 20
done
