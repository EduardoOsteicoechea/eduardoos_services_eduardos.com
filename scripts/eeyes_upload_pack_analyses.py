#!/usr/bin/env python3
"""Upload each capture-pack analysis onto its eEyes tasks.

Reads desktop_master/pack-analyses.json. Authenticates with EEYES_COOKIE
(never printed). Fetches a CSRF token, then PATCHes
/api/eeyes/tasks/{id}/pack-analysis. One write covers every task that shares
that batch; the other task ids in the pack are sent too so a task that is its
own batch still receives the reading.
"""

from __future__ import annotations

import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("EEYES_BASE_URL", "https://eduardoos.com").rstrip("/")
CATALOG = Path(os.environ.get("EEYES_PACKS", ROOT / "desktop_master" / "pack-analyses.json"))


def main() -> int:
    raw_cookie = os.environ.get("EEYES_COOKIE", "").strip()
    if not raw_cookie:
        print("EEYES_COOKIE is required (session cookie, not logged).", file=sys.stderr)
        return 2
    packs = json.loads(CATALOG.read_text(encoding="utf-8")).get("packs") or []
    jar = http.cookiejar.CookieJar()
    seed(jar, raw_cookie)
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    ok = 0
    total = 0
    for pack in packs:
        analysis = str(pack.get("analysis") or "").strip()
        task_ids = [str(item).strip() for item in (pack.get("taskIds") or []) if str(item).strip()]
        if not analysis or not task_ids:
            print(f"skip {pack.get('date')} {pack.get('slot')}")
            continue
        for task_id in task_ids:
            status = patch_pack(opener, task_id, analysis)
            total += 1
            print(f"{pack.get('date')} {pack.get('slot')} {task_id} {status}")
            if status == 200:
                ok += 1
    print(f"updated {ok}/{total}")
    return 0 if ok == total and total else 1


def seed(jar: http.cookiejar.CookieJar, raw: str) -> None:
    host = urllib.parse.urlparse(BASE).hostname or ""
    for part in raw.split(";"):
        if "=" not in part:
            continue
        name, value = part.strip().split("=", 1)
        jar.set_cookie(
            http.cookiejar.Cookie(
                version=0,
                name=name.strip(),
                value=value.strip(),
                port=None,
                port_specified=False,
                domain=host,
                domain_specified=True,
                domain_initial_dot=False,
                path="/",
                path_specified=True,
                secure=BASE.startswith("https"),
                expires=None,
                discard=True,
                comment=None,
                comment_url=None,
                rest={"HttpOnly": None},
                rfc2109=False,
            )
        )


def patch_pack(opener: urllib.request.OpenerDirector, task_id: str, analysis: str) -> int:
    csrf_req = urllib.request.Request(BASE + "/api/auth/csrf", headers={"Accept": "application/json"})
    with opener.open(csrf_req, timeout=30) as res:
        token = str(json.loads(res.read().decode("utf-8")).get("csrf") or "")
    if not token:
        raise SystemExit("csrf response had no token")
    data = json.dumps({"analysis": analysis}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/api/eeyes/tasks/{task_id}/pack-analysis",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": BASE,
            "X-CSRF-Token": token,
        },
        method="PATCH",
    )
    try:
        with opener.open(req, timeout=30) as res:
            return res.status
    except urllib.error.HTTPError as err:
        return err.code


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as err:
        print(f"request failed: {err.reason}", file=sys.stderr)
        raise SystemExit(1)
