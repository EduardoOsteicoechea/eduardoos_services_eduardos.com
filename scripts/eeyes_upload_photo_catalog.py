#!/usr/bin/env python3
"""Attach each photo's analysis to its eEyes media record.

Reads desktop_master/photo-catalog.json (or EEYES_CATALOG). Authenticates with
the session cookie in EEYES_COOKIE (never printed). Fetches a CSRF token, then
PATCHes /api/eeyes/media/{id}.
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
CATALOG = Path(os.environ.get("EEYES_CATALOG", ROOT / "desktop_master" / "photo-catalog.json"))


def main() -> int:
    raw_cookie = os.environ.get("EEYES_COOKIE", "").strip()
    if not raw_cookie:
        print("EEYES_COOKIE is required (session cookie, not logged).", file=sys.stderr)
        return 2
    photos = json.loads(CATALOG.read_text(encoding="utf-8")).get("photos") or []
    jar = http.cookiejar.CookieJar()
    seed(jar, raw_cookie)
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    ok = 0
    for photo in photos:
        media_id = str(photo.get("mediaId") or "").strip()
        analysis = str(photo.get("analysis") or "").strip()
        if not media_id or not analysis:
            print(f"skip {media_id or '(missing id)'}")
            continue
        status = patch_analysis(opener, media_id, analysis)
        print(f"{media_id} {status}")
        if status == 200:
            ok += 1
    print(f"updated {ok}/{len(photos)}")
    return 0 if ok == len(photos) and photos else 1


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


def patch_analysis(opener: urllib.request.OpenerDirector, media_id: str, analysis: str) -> int:
    csrf_req = urllib.request.Request(
        BASE + "/api/auth/csrf",
        headers={"Accept": "application/json"},
    )
    with opener.open(csrf_req, timeout=30) as res:
        token = str(json.loads(res.read().decode("utf-8")).get("csrf") or "")
    if not token:
        raise SystemExit("csrf response had no token")
    data = json.dumps({"analysis": analysis}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/api/eeyes/media/{media_id}",
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
