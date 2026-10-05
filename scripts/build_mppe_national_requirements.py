#!/usr/bin/env python3
"""Regenerate frontend/src/lib/eoschool-mppe-national-requirements.json from marco MD."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
import sys

if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from mppe_text_normalize import normalize_mppe_prose, normalize_string_list

MARCO = ROOT / "ministerio_de_educacion_de_venezuela" / "marco_programatico_mppe_y_tercer_grado.md"
OUT = ROOT / "frontend" / "src" / "lib" / "eoschool-mppe-national-requirements.json"


def numbered(text: str, header: str, nxt: str) -> list[str]:
    chunk = text.split(header, 1)[1].split(nxt, 1)[0]
    items: list[str] = []
    for line in chunk.splitlines():
        m = re.match(r"^(\d+)\. (.+)$", line.strip())
        if m:
            items.append(m.group(2))
    return items


def list_after_heading(block: str, heading: str) -> list[str]:
    items: list[str] = []
    active = False
    for line in block.splitlines():
        stripped = line.strip()
        if stripped.startswith(heading):
            active = True
            continue
        if active and (stripped.startswith("### ") or stripped.startswith("## ")):
            break
        if active and stripped.startswith("- "):
            items.append(stripped[2:].strip())
        elif active and stripped and not stripped.startswith("- "):
            # Stop at next prose block (e.g. **Contenidos:**) after list ended.
            if items:
                active = False
    return items


def parse_h3_components(chunk: str) -> list[dict]:
    units: list[dict] = []
    for part in re.split(r"\n### ", chunk)[1:]:
        block = part.strip()
        if not block:
            continue
        lines = block.splitlines()
        title = lines[0].strip()
        learnings = list_after_heading(block, "#### Aprendizajes esperados")
        if not learnings:
            learnings = list_after_heading(block, "**Aprendizajes esperados:**")
        contenidos: list[str] = []
        for line in block.splitlines():
            if line.strip().startswith("**Contenidos:**"):
                raw = line.split("**Contenidos:**", 1)[1].strip()
                if raw:
                    contenidos = [p.strip() for p in re.split(r";", raw) if p.strip()]
                break
            if line.strip().startswith("#### Contenidos"):
                contenidos = list_after_heading(block, "#### Contenidos")
                break
        if title and learnings:
            unit: dict = {
                "title": normalize_mppe_prose(title),
                "learnings": normalize_string_list(learnings),
            }
            if contenidos:
                unit["contenidos"] = normalize_string_list(contenidos)
            units.append(unit)
    return units


def parse_lenguaje_units(text: str) -> list[dict]:
    marker = "## 10. Prácticas del Lenguaje — Tercer grado"
    chunk = text.split(marker, 1)[1].split("## Fuentes y método", 1)[0]
    units: list[dict] = []
    for axis, nxt in (("Lectura", "Escritura"), ("Escritura", "Oralidad"), ("Oralidad", None)):
        sub = chunk.split(f"### {axis}", 1)[1]
        if nxt:
            sub = sub.split(f"### {nxt}", 1)[0]
        for line in sub.splitlines():
            if not line.startswith("|") or re.match(r"\|\s*---\s*\|", line):
                continue
            parts = [p.strip() for p in line.strip().strip("|").split("|")]
            if len(parts) < 2 or parts[0].lower() == "contenido":
                continue
            learnings = [p.strip() for p in re.split(r"<br>", parts[1]) if p.strip()]
            units.append(
                {
                    "title": normalize_mppe_prose(parts[0]),
                    "learnings": normalize_string_list(learnings),
                    "axis": axis,
                }
            )
    return units


def main() -> None:
    text = MARCO.read_text(encoding="utf-8")
    areas = [
        {
            "id": "len",
            "title": "Prácticas del Lenguaje",
            "pdf": "practicas_del_lenguaje_-_propuesta_contenidos_educativos_-_mppe.pdf",
            "general": numbered(text, "### 5.1 Objetivos", "**Ejemplos de prácticas"),
            "grade3Units": parse_lenguaje_units(text),
        },
        {
            "id": "mat",
            "title": "Matemáticas",
            "pdf": "matematicas_-_propuesta_de_contenido_-_mppe.pdf",
            "general": numbered(text, "### 2.1 Objetivos", "**Seis actividades"),
            "grade3Units": parse_h3_components(
                text.split("## 7. Matemáticas — Tercer grado", 1)[1].split("## 8.", 1)[0]
            ),
        },
        {
            "id": "ide",
            "title": "Identidad",
            "pdf": "identidad_-_propuesta_contenidos_educativos_-_mppe.pdf",
            "general": numbered(text, "### 4.1 Objetivos", "### 4.2 Fundamentación"),
            "grade3Units": parse_h3_components(
                text.split("## 9. Identidad — Tercer grado", 1)[1].split("## 10.", 1)[0]
            ),
        },
        {
            "id": "cie",
            "title": "Ciencias Naturales",
            "pdf": "ciencias_naturales_contenidos_educativos.pdf",
            "general": numbered(text, "### 3.1 Objetivos", "**Procesos del pensamiento"),
            "grade3Units": parse_h3_components(
                text.split("## 8. Ciencias Naturales — Tercer grado", 1)[1].split("## 9.", 1)[0]
            ),
        },
    ]
    for area in areas:
        area["general"] = normalize_string_list(area["general"])

    OUT.write_text(json.dumps({"areas": areas}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for a in areas:
        n = sum(len(u["learnings"]) for u in a["grade3Units"])
        print(a["id"], "units", len(a["grade3Units"]), "learnings", n)


if __name__ == "__main__":
    main()
