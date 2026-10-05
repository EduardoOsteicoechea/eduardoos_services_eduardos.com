#!/usr/bin/env python3
"""Build 28-week MPPE curriculum: 14 identity objectives × 2 blocks/week, other areas spread across 56 blocks."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQ = ROOT / "frontend" / "src" / "lib" / "eoschool-mppe-national-requirements.json"
OUT = ROOT / "frontend" / "src" / "lib" / "eoschool-mppe-28week-curriculum.json"

WEEKS = 28
BLOCKS = WEEKS * 2
IDENTITY_OBJECTIVES = 14


def flatten_learnings(area: dict) -> list[dict]:
    items: list[dict] = []
    for unit in area.get("grade3Units", []):
        axis = unit.get("axis")
        for learning in unit.get("learnings", []):
            items.append(
                {
                    "id": f"{area['id']}:{len(items)}",
                    "unitTitle": unit.get("title", ""),
                    "axis": axis,
                    "text": learning,
                }
            )
    return items


def build_14_identity(units: list[dict]) -> list[dict]:
    flat: list[dict] = []
    for unit in units:
        learnings = unit.get("learnings") or []
        if not learnings:
            continue
        for learning in learnings:
            flat.append(
                {
                    "title": unit["title"],
                    "contenidos": unit.get("contenidos") or [],
                    "learnings": [learning],
                }
            )
    while len(flat) > IDENTITY_OBJECTIVES:
        a, b = flat[-2], flat[-1]
        merged = {
            "title": a["title"] if a["title"] == b["title"] else f"{a['title']} · {b['title']}",
            "contenidos": list(dict.fromkeys((a.get("contenidos") or []) + (b.get("contenidos") or []))),
            "learnings": a["learnings"] + b["learnings"],
        }
        flat[-2:] = [merged]
    while len(flat) < IDENTITY_OBJECTIVES:
        flat.append(
            {
                "title": flat[-1]["title"],
                "contenidos": flat[-1].get("contenidos") or [],
                "learnings": flat[-1]["learnings"][:1],
            }
        )
    return flat[:IDENTITY_OBJECTIVES]


def spread_across_blocks(items: list[dict], num_blocks: int) -> list[list[dict]]:
    buckets: list[list[dict]] = [[] for _ in range(num_blocks)]
    if not items:
        return buckets
    n = len(items)
    appearances = max(1, round(num_blocks / n))
    for i, item in enumerate(items):
        for a in range(appearances):
            bi = (i * appearances + a) % num_blocks
            if not any(x["id"] == item["id"] for x in buckets[bi]):
                buckets[bi].append(item)
    for bi in range(num_blocks):
        if not buckets[bi]:
            buckets[bi].append(items[bi % n])
    return buckets


def main() -> None:
    data = json.loads(REQ.read_text(encoding="utf-8"))
    by_id = {a["id"]: a for a in data["areas"]}

    identity_objs = build_14_identity(by_id["ide"]["grade3Units"])
    len_items = flatten_learnings(by_id["len"])
    mat_items = flatten_learnings(by_id["mat"])
    cie_items = flatten_learnings(by_id["cie"])

    len_buckets = spread_across_blocks(len_items, BLOCKS)
    mat_buckets = spread_across_blocks(mat_items, BLOCKS)
    cie_buckets = spread_across_blocks(cie_items, BLOCKS)

    weeks: list[dict] = []
    for week in range(1, WEEKS + 1):
        blocks = []
        for block_num, days in ((1, 2), (2, 3)):
            block_index = (week - 1) * 2 + (block_num - 1)
            ide_idx = block_index % IDENTITY_OBJECTIVES
            blocks.append(
                {
                    "block": block_num,
                    "days": days,
                    "identity": identity_objs[ide_idx],
                    "len": len_buckets[block_index],
                    "mat": mat_buckets[block_index],
                    "cie": cie_buckets[block_index],
                }
            )
        weeks.append({"week": week, "blocks": blocks})

    payload = {
        "meta": {
            "weeks": WEEKS,
            "blocksPerWeek": 2,
            "totalBlocks": BLOCKS,
            "identityObjectives": IDENTITY_OBJECTIVES,
            "counts": {
                "lenLearnings": len(len_items),
                "matLearnings": len(mat_items),
                "cieLearnings": len(cie_items),
            },
        },
        "weeks": weeks,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT)
    print("identity", len(identity_objs), "len/mat/cie", len(len_items), len(mat_items), len(cie_items))


if __name__ == "__main__":
    main()
