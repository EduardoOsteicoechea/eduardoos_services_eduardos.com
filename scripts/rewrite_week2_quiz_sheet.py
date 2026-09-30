#!/usr/bin/env python3
"""Rewrite published eoschool quizzes: 12 mcq + 4 write citation prompts per day (week1 + week2)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "frontend" / "public" / "homescool" / "media"
PUBLISHED_WEEKS = (1, 2)

DISTRACTORS = [
    "No aparece en la clase de hoy",
    "Solo un detalle decorativo",
    "Una idea de otra materia",
    "Un resumen inventado",
    "Una fecha sin relación",
    "Un nombre que no se menciona",
]


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def save(path: Path, doc: dict) -> None:
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def subject_files(subject: str, week: int) -> dict[int, Path]:
    out: dict[int, Path] = {}
    for day in range(1, 6):
        path = MEDIA / f"week{week}" / f"{subject}-c3-w{week}-d{day}-l6.eoschool.json"
        if not path.exists():
            raise FileNotFoundError(path)
        out[day] = path
    return out


def unique_mcq(questions: list[dict], origin: int) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for q in questions:
        if q.get("type") != "mcq" or q.get("originDay") != origin:
            continue
        prompt = (q.get("prompt") or "").strip()
        if not prompt or prompt in seen:
            continue
        seen.add(prompt)
        out.append(
            {
                "id": q.get("id") or f"d{origin}-q{len(out)+1}",
                "originDay": origin,
                "type": "mcq",
                "prompt": prompt,
                "choices": list(q.get("choices") or []),
                "answer": q.get("answer") or "",
            }
        )
    return out


def first_sentence(text: str) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    if not text:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", text)
    return parts[0].strip()


def quote_candidates(body: str) -> list[str]:
    body = body or ""
    quotes = re.findall(r"«([^»]{12,120})»", body)
    if quotes:
        return [q.strip() for q in quotes]
    # Fall back to definitional / dense sentences.
    sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", re.sub(r"\s+", " ", body))
        if len(s.strip()) >= 24
    ]
    keyed = [
        s
        for s in sentences
        if re.search(
            r"\b(es|son|significa|se llama|incluye|une|forma|practica|memoriz|explora|llega)\b",
            s,
            re.I,
        )
    ]
    return keyed or sentences


def make_extra_mcq(points: list[dict], need: int, origin: int, start_idx: int) -> list[dict]:
    """Build simple heading-based MCQs when the day-1 bank is short."""
    out: list[dict] = []
    headings = [(i + 1, (p.get("heading") or f"Punto {i+1}").strip()) for i, p in enumerate(points)]
    if not headings:
        headings = [(1, "la clase de hoy")]
    i = 0
    while len(out) < need:
        n, heading = headings[i % len(headings)]
        wrong = [h for _, h in headings if h != heading]
        while len(wrong) < 3:
            wrong.append(DISTRACTORS[len(wrong) % len(DISTRACTORS)])
        choices = [heading, wrong[0], wrong[1], wrong[2]]
        # Rotate correct answer position.
        rot = len(out) % 4
        choices = choices[rot:] + choices[:rot]
        out.append(
            {
                "id": f"d{origin}-qx{start_idx + len(out)}",
                "originDay": origin,
                "type": "mcq",
                "prompt": f"Según la clase, ¿qué idea desarrolla principalmente el punto {n}?",
                "choices": choices,
                "answer": heading,
            }
        )
        i += 1
    return out


def ensure_mcq_bank(bank: list[dict], need: int, origin: int, points: list[dict]) -> list[dict]:
    if len(bank) >= need:
        return bank[:need]
    extras = make_extra_mcq(points, need - len(bank), origin, start_idx=len(bank) + 1)
    return bank + extras


def clue_from_phrase(phrase: str) -> str:
    phrase = re.sub(r"\s+", " ", phrase).strip().rstrip(".")
    if len(phrase) > 70:
        phrase = phrase[:67].rsplit(" ", 1)[0] + "…"
    return phrase


def build_write_prompts(doc: dict, day: int) -> list[dict]:
    points = doc.get("lesson", {}).get("points") or []
    prompts: list[str] = []

    # Prefer one reflection per point, cycling if fewer than 4 points.
    indexed = list(enumerate(points, start=1)) or [(1, {"heading": "la clase", "body": ""})]
    i = 0
    while len(prompts) < 4:
        n, p = indexed[i % len(indexed)]
        heading = (p.get("heading") or f"Punto {n}").strip()
        cands = quote_candidates(p.get("body") or "")
        phrase = cands[min(i // len(indexed), len(cands) - 1)] if cands else first_sentence(p.get("body") or "")
        if not phrase:
            phrase = heading
        clue = clue_from_phrase(phrase)
        # Vary the four angles so the sheet is not repetitive.
        angle = len(prompts) % 4
        if angle == 0:
            prompts.append(
                f"Busca en el punto {n} («{heading}») y escribe entre comillas las palabras exactas "
                f"donde la clase habla de esto: {clue}. Luego explica con tus palabras qué entendiste."
            )
        elif angle == 1:
            prompts.append(
                f"Copia entre comillas la frase exacta del punto {n} («{heading}») que mejor resume "
                f"la idea principal. Después explica por qué esa frase es importante."
            )
        elif angle == 2:
            prompts.append(
                f"En el punto {n} («{heading}»), encuentra y copia entre comillas las palabras exactas "
                f"relacionadas con: {clue}. Explica qué significa esa idea en la clase de hoy."
            )
        else:
            prompts.append(
                f"Escribe entre comillas una cita exacta del punto {n} («{heading}») que puedas usar "
                f"para enseñarle a un compañero esta idea. Luego explica la cita con tus propias palabras."
            )
        i += 1

    out = []
    for idx, prompt in enumerate(prompts, start=1):
        out.append(
            {
                "id": f"d{day}-w{idx}",
                "originDay": day,
                "type": "write",
                "prompt": prompt,
            }
        )
    return out


def renumber(questions: list[dict], day: int) -> list[dict]:
    out = []
    mcq_i = 1
    write_i = 1
    for q in questions:
        q = dict(q)
        if q["type"] == "mcq":
            q["id"] = f"d{day}-q{mcq_i}"
            mcq_i += 1
        else:
            q["id"] = f"d{day}-w{write_i}"
            write_i += 1
        out.append(q)
    return out


def rebuild_subject(subject: str, week: int) -> None:
    paths = subject_files(subject, week)
    docs = {day: load(path) for day, path in paths.items()}

    # Collect mcq banks by origin day from the richest existing files.
    banks: dict[int, list[dict]] = {d: [] for d in range(1, 6)}
    for day in range(1, 6):
        qs = docs[day].get("quiz", {}).get("questions") or []
        for origin in range(1, day + 1):
            for q in unique_mcq(qs, origin):
                prompts = {x["prompt"] for x in banks[origin]}
                if q["prompt"] not in prompts:
                    banks[origin].append(q)

    day1_points = docs[1].get("lesson", {}).get("points") or []
    banks[1] = ensure_mcq_bank(banks[1], 12, 1, day1_points)

    for day in range(1, 6):
        doc = docs[day]
        points = doc.get("lesson", {}).get("points") or day1_points
        if day == 1:
            mcq = ensure_mcq_bank(banks[1], 12, 1, points)
        else:
            day1 = ensure_mcq_bank(banks[1], 6, 1, day1_points)
            today_bank = banks.get(day) or []
            # Prefer native originDay==day items; if short, synthesize from today's points.
            today = ensure_mcq_bank(today_bank, 6, day, points)
            # Force originDay on synthesized/current items.
            for q in today:
                q["originDay"] = day
            mcq = day1 + today

        writes = build_write_prompts(doc, day)
        questions = renumber(mcq + writes, day)
        doc["quiz"] = {"questionCount": 16, "questions": questions}
        save(paths[day], doc)
        print(f"OK {paths[day].name}: mcq={sum(1 for q in questions if q['type']=='mcq')} write=4")


def main() -> None:
    for week in PUBLISHED_WEEKS:
        week_dir = MEDIA / f"week{week}"
        subjects = sorted(
            {
                p.name.split("-")[0]
                for p in week_dir.glob(f"*-c3-w{week}-d1-l6.eoschool.json")
            }
        )
        for subject in subjects:
            rebuild_subject(subject, week)


if __name__ == "__main__":
    main()
