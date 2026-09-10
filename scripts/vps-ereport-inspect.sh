#!/usr/bin/env bash
# Inspect ereport FS consistency for an owner on the VPS (deploy user).
# Args: ownerUserId
set -uo pipefail

OWNER="${1:?ownerUserId}"
ROOT="${EREPORT_ROOT:-/var/www/eduardoos.com/media/ereport}"

echo "=== root=$ROOT owner=$OWNER ==="
ls -la "$ROOT" | head -n 40 || true

PIN="$ROOT/.owners/${OWNER}.json"
echo "--- pin $PIN ---"
if [[ -f "$PIN" ]]; then cat "$PIN"; echo; else echo "(no pin)"; fi

OWNER_DIR=""
if [[ -f "$PIN" ]]; then
  OWNER_DIR="$(python3 - "$PIN" "$ROOT" <<'PY'
import json, os, sys
pin = json.load(open(sys.argv[1]))
root = sys.argv[2]
segs = pin.get("segments") or []
print(os.path.join(root, *segs) if segs else "")
PY
)"
fi
echo "--- resolved owner dir: ${OWNER_DIR:-NONE} ---"
if [[ -n "$OWNER_DIR" && -d "$OWNER_DIR" ]]; then
  ls -la "$OWNER_DIR" | head -n 40 || true
  if [[ -f "$OWNER_DIR/orgs.json" ]]; then
    echo "-- orgs.json --"
    python3 -m json.tool "$OWNER_DIR/orgs.json" | head -n 80
  fi
  if [[ -d "$OWNER_DIR/orgs" ]]; then
    echo "-- per-org libraries / report files --"
    python3 - "$OWNER_DIR" "$OWNER" <<'PY'
import json, os, sys
od, owner = sys.argv[1], sys.argv[2]
orgs = os.path.join(od, "orgs")
for org in sorted(os.listdir(orgs)):
    org_path = os.path.join(orgs, org)
    if not os.path.isdir(org_path):
        continue
    lib_path = os.path.join(org_path, "library.json")
    print(f"\nORG {org}")
    reports = []
    if os.path.isfile(lib_path):
        lib = json.load(open(lib_path))
        reports = lib.get("reports") or []
        print(f"  library entries={len(reports)}")
    else:
        print("  (no library.json)")
    reports_dir = os.path.join(org_path, "reports")
    disk_ids = set()
    if os.path.isdir(reports_dir):
        disk_ids = {n for n in os.listdir(reports_dir) if os.path.isdir(os.path.join(reports_dir, n))}
        print(f"  report dirs on disk={len(disk_ids)}")
    lib_ids = {r.get("id") for r in reports if r.get("id")}
    for rid in sorted(lib_ids | disk_ids):
        rdir = os.path.join(reports_dir, rid)
        meta_p = os.path.join(rdir, "meta.json")
        erep_p = os.path.join(rdir, "report.ereport")
        json_p = os.path.join(rdir, "report.json")
        in_lib = rid in lib_ids
        tema = next((r.get("tema") for r in reports if r.get("id")==rid), "")
        print(f"  report={rid} tema={tema!r} in_library={in_lib} dir={os.path.isdir(rdir)} meta={os.path.isfile(meta_p)} ereport={os.path.isfile(erep_p)} report.json={os.path.isfile(json_p)}")
        if os.path.isfile(meta_p):
            m = json.load(open(meta_p))
            print(f"    meta.id={m.get('id')} orgId={m.get('orgId')} ownerUserId={m.get('ownerUserId')} match_owner={m.get('ownerUserId')==owner} match_org={m.get('orgId')==org}")
PY
  fi
fi

echo "--- search specific report ids anywhere under root ---"
for RID in \
  89853904ec25e6b790b2254d92e87ff9 \
  4c1b30e7-c20f-41e2-92a0-51c3236191e0 \
  6d1b577e91ac373bf7f58a2d712f7f3a
do
  echo "RID=$RID"
  find "$ROOT" -type d -name "$RID" 2>/dev/null | head -n 20 || true
done

echo "=== done ==="
