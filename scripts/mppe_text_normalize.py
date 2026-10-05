"""Normalize MPPE PDF-style ALL CAPS strings to readable Spanish prose."""

from __future__ import annotations

import re

_ACRONYM_RE = re.compile(r"\b(ccv|cvc|vc|mppe|dna|adn)\b", re.IGNORECASE)

_PROPER_PHRASES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bsimón bolívar\b", re.I), "Simón Bolívar"),
    (re.compile(r"\bsimón rodríguez\b", re.I), "Simón Rodríguez"),
    (re.compile(r"\bfrancisco de miranda\b", re.I), "Francisco de Miranda"),
    (re.compile(r"\brepública bolivariana de venezuela\b", re.I), "República Bolivariana de Venezuela"),
    (re.compile(r"\bconstitución de la república bolivariana de venezuela\b", re.I), "Constitución de la República Bolivariana de Venezuela"),
    (re.compile(r"\bvenezuela\b", re.I), "Venezuela"),
    (re.compile(r"\bcaracas\b", re.I), "Caracas"),
    (re.compile(r"\bmar caribe\b", re.I), "mar Caribe"),
    (re.compile(r"\blengua de señas venezolana\b", re.I), "Lengua de Señas Venezolana"),
    (re.compile(r"\bmapamundi\b", re.I), "mapamundi"),
)

_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?…])\s+")


def _letter_case_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    upper = sum(1 for c in letters if c.isupper())
    return upper / len(letters)


def is_shouty(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) < 3:
        return False
    return _letter_case_ratio(stripped) >= 0.55


def _capitalize_first_alpha(segment: str) -> str:
    for i, ch in enumerate(segment):
        if ch.isalpha():
            return segment[:i] + ch.upper() + segment[i + 1 :]
    return segment


def _sentence_case_segment(segment: str) -> str:
    segment = segment.strip()
    if not segment:
        return segment
    lowered = segment.lower()
    lowered = re.sub(r"\s+", " ", lowered)
    lowered = lowered.replace("..", ".")
    lowered = re.sub(r"\bla/\s*el\b", "la/el", lowered)
    lowered = re.sub(r"\bla/\s*la\b", "la/la", lowered)
    parts = _SENTENCE_BOUNDARY.split(lowered)
    capped = [_capitalize_first_alpha(p.strip()) for p in parts if p.strip()]
    out = " ".join(capped)
    # Capitalize after opening parenthesis when it starts a phrase
    out = re.sub(r"\(\s*([a-záéíóúñ])", lambda m: "(" + m.group(1).upper(), out)
    out = re.sub(r"\(Si es el caso\)", "(si es el caso)", out, flags=re.I)
    return out


def _restore_acronyms(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        return match.group(1).upper()

    return _ACRONYM_RE.sub(repl, text)


def _restore_proper_phrases(text: str) -> str:
    for pattern, replacement in _PROPER_PHRASES:
        text = pattern.sub(replacement, text)
    return text


def normalize_mppe_prose(text: str) -> str:
    raw = text.replace("<br>", "\n").strip()
    if not raw:
        return ""
    if not is_shouty(raw):
        return re.sub(r"\s+", " ", raw.replace("<br>", " ").strip())

    parts = [p.strip() for p in raw.splitlines() if p.strip()]
    if len(parts) <= 1:
        parts = [p.strip() for p in re.split(r"<br\s*/?>", raw, flags=re.I) if p.strip()]
    if not parts:
        parts = [raw]

    normalized = []
    for part in parts:
        cased = _sentence_case_segment(part)
        cased = _restore_acronyms(cased)
        cased = _restore_proper_phrases(cased)
        normalized.append(cased)
    return " ".join(normalized)


def normalize_optional(text: str | None) -> str | None:
    if text is None:
        return None
    return normalize_mppe_prose(text)


def normalize_string_list(items: list[str]) -> list[str]:
    return [normalize_mppe_prose(item) for item in items]
