#!/usr/bin/env python3
"""Generate Scrib Bible JSON packs: NT Greek (SBLGNT) + OT Hebrew (WLC).

Downloads MorphGNT SBLGNT and Open Scriptures MorphHB WLC into a temp dir,
then writes one JSON file per book under frontend/public/scrib/bible/.

Usage (from repo root):
  python scripts/generate_scrib_bible.py
"""

from __future__ import annotations

import json
import re
import shutil
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "frontend" / "public" / "scrib" / "bible"

SBLGNT_ZIP = (
    "https://github.com/morphgnt/sblgnt/archive/refs/heads/master.zip"
)
MORPHHB_ZIP = (
    "https://github.com/openscriptures/morphhb/archive/refs/heads/master.zip"
)

# MorphGNT book numbers 1–27 → Scrib ids / display names
NT_BOOKS: list[tuple[int, str, str]] = [
    (1, "matthew", "Matthew"),
    (2, "mark", "Mark"),
    (3, "luke", "Luke"),
    (4, "john", "John"),
    (5, "acts", "Acts"),
    (6, "romans", "Romans"),
    (7, "1corinthians", "1 Corinthians"),
    (8, "2corinthians", "2 Corinthians"),
    (9, "galatians", "Galatians"),
    (10, "ephesians", "Ephesians"),
    (11, "philippians", "Philippians"),
    (12, "colossians", "Colossians"),
    (13, "1thessalonians", "1 Thessalonians"),
    (14, "2thessalonians", "2 Thessalonians"),
    (15, "1timothy", "1 Timothy"),
    (16, "2timothy", "2 Timothy"),
    (17, "titus", "Titus"),
    (18, "philemon", "Philemon"),
    (19, "hebrews", "Hebrews"),
    (20, "james", "James"),
    (21, "1peter", "1 Peter"),
    (22, "2peter", "2 Peter"),
    (23, "1john", "1 John"),
    (24, "2john", "2 John"),
    (25, "3john", "3 John"),
    (26, "jude", "Jude"),
    (27, "revelation", "Revelation"),
]

# MorphHB WLC OSIS file stem → Scrib id / display name (protestant OT order)
OT_BOOKS: list[tuple[str, str, str]] = [
    ("Gen", "genesis", "Genesis"),
    ("Exod", "exodus", "Exodus"),
    ("Lev", "leviticus", "Leviticus"),
    ("Num", "numbers", "Numbers"),
    ("Deut", "deuteronomy", "Deuteronomy"),
    ("Josh", "joshua", "Joshua"),
    ("Judg", "judges", "Judges"),
    ("Ruth", "ruth", "Ruth"),
    ("1Sam", "1samuel", "1 Samuel"),
    ("2Sam", "2samuel", "2 Samuel"),
    ("1Kgs", "1kings", "1 Kings"),
    ("2Kgs", "2kings", "2 Kings"),
    ("1Chr", "1chronicles", "1 Chronicles"),
    ("2Chr", "2chronicles", "2 Chronicles"),
    ("Ezra", "ezra", "Ezra"),
    ("Neh", "nehemiah", "Nehemiah"),
    ("Esth", "esther", "Esther"),
    ("Job", "job", "Job"),
    ("Ps", "psalms", "Psalms"),
    ("Prov", "proverbs", "Proverbs"),
    ("Eccl", "ecclesiastes", "Ecclesiastes"),
    ("Song", "songofsolomon", "Song of Solomon"),
    ("Isa", "isaiah", "Isaiah"),
    ("Jer", "jeremiah", "Jeremiah"),
    ("Lam", "lamentations", "Lamentations"),
    ("Ezek", "ezekiel", "Ezekiel"),
    ("Dan", "daniel", "Daniel"),
    ("Hos", "hosea", "Hosea"),
    ("Joel", "joel", "Joel"),
    ("Amos", "amos", "Amos"),
    ("Obad", "obadiah", "Obadiah"),
    ("Jonah", "jonah", "Jonah"),
    ("Mic", "micah", "Micah"),
    ("Nah", "nahum", "Nahum"),
    ("Hab", "habakkuk", "Habakkuk"),
    ("Zeph", "zephaniah", "Zephaniah"),
    ("Hag", "haggai", "Haggai"),
    ("Zech", "zechariah", "Zechariah"),
    ("Mal", "malachi", "Malachi"),
]

OSIS_NS = {"osis": "http://www.bibletechnologies.net/2003/OSIS/namespace"}


def download_zip(url: str, dest: Path) -> None:
    print(f"Downloading {url} …")
    urllib.request.urlretrieve(url, dest)


def extract_zip(zip_path: Path, dest_dir: Path) -> Path:
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest_dir)
    roots = [p for p in dest_dir.iterdir() if p.is_dir()]
    if not roots:
        raise RuntimeError(f"No root folder in {zip_path}")
    return roots[0]


def write_book(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    n_ch = len(doc["chapters"])
    n_v = sum(len(c["verses"]) for c in doc["chapters"])
    print(f"  wrote {path.name} ({n_ch} ch, {n_v} verses)")


def chapters_from_verse_map(
    verse_map: dict[tuple[int, int], list[str]],
) -> list[dict]:
    by_chapter: dict[int, dict[int, str]] = defaultdict(dict)
    for (ch, vs), words in sorted(verse_map.items()):
        by_chapter[ch][vs] = " ".join(words).strip()
    chapters: list[dict] = []
    for ch in sorted(by_chapter):
        verses = [
            {"verse": v, "text": by_chapter[ch][v]}
            for v in sorted(by_chapter[ch])
            if by_chapter[ch][v]
        ]
        if verses:
            chapters.append({"chapter": ch, "verses": verses})
    return chapters


def find_sblgnt_files(root: Path) -> dict[int, Path]:
    """Map MorphGNT book number → morphgnt text file."""
    found: dict[int, Path] = {}
    # Filenames like 61-Mt-morphgnt.txt or 66-Re-morphgnt.txt (SBL numbering)
    # MorphGNT uses book codes 61–87 for NT; also 01–27 in bcv column.
    for path in root.rglob("*-morphgnt.txt"):
        m = re.match(r"^(\d+)-", path.name)
        if not m:
            continue
        code = int(m.group(1))
        # SBLGNT repo uses 61–87; convert to 1–27
        if 61 <= code <= 87:
            book_num = code - 60
            found[book_num] = path
    return found


def parse_sblgnt_file(path: Path) -> dict[tuple[int, int], list[str]]:
    """Parse MorphGNT line format into chapter/verse → word texts."""
    verse_map: dict[tuple[int, int], list[str]] = defaultdict(list)
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) < 5:
                continue
            bcv = parts[0]
            # bcv: BBCCVV (book 2 digits, chapter 2, verse 2) — sometimes more
            if not re.fullmatch(r"\d{6,}", bcv):
                continue
            ch = int(bcv[2:4])
            vs = int(bcv[4:6])
            # text column is index 3 (may include punctuation glued)
            text = parts[3]
            verse_map[(ch, vs)].append(text)
    return verse_map


def generate_greek(sblgnt_root: Path) -> None:
    files = find_sblgnt_files(sblgnt_root)
    if len(files) < 27:
        # Fallback: scan any .txt with morphgnt content and group by bcv book
        print("  morphgnt files by name incomplete; scanning all *-morphgnt.txt")
    for book_num, book_id, book_name in NT_BOOKS:
        path = files.get(book_num)
        if path is None:
            raise FileNotFoundError(
                f"Missing SBLGNT file for book {book_num} ({book_name})"
            )
        verse_map = parse_sblgnt_file(path)
        chapters = chapters_from_verse_map(verse_map)
        if not chapters:
            raise RuntimeError(f"No verses parsed for {book_name} ({path})")
        doc = {
            "bookId": book_id,
            "bookName": book_name,
            "language": "greek",
            "edition": "SBLGNT",
            "source": "https://github.com/morphgnt/sblgnt",
            "chapters": chapters,
        }
        write_book(OUT_DIR / f"{book_id}-greek.json", doc)


def local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def normalize_hebrew_token(text: str) -> str:
    """Strip MorphHB morpheme separators (/) for continuous reading text."""
    return text.replace("/", "").strip()


def verse_text_from_element(verse_el: ET.Element) -> str:
    """Collect Hebrew word tokens from a <verse> element (with pointing)."""
    words: list[str] = []
    for el in verse_el.iter():
        name = local_name(el.tag)
        if name == "w" and el.text:
            words.append(normalize_hebrew_token(el.text))
        elif name == "seg" and el.text:
            # ketiv/qere or other segments — include surface text
            words.append(normalize_hebrew_token(el.text))
    if not words:
        raw = "".join(verse_el.itertext()).strip()
        raw = normalize_hebrew_token(re.sub(r"\s+", " ", raw))
        return raw
    return " ".join(w for w in words if w)


def parse_wlc_xml(path: Path) -> dict[tuple[int, int], list[str]]:
    tree = ET.parse(path)
    root = tree.getroot()
    verse_map: dict[tuple[int, int], list[str]] = defaultdict(list)
    for verse_el in root.iter():
        if local_name(verse_el.tag) != "verse":
            continue
        osis_id = verse_el.get("osisID") or ""
        # e.g. Gen.1.1 or Ps.119.1
        m = re.search(r"\.(\d+)\.(\d+)$", osis_id)
        if not m:
            continue
        ch, vs = int(m.group(1)), int(m.group(2))
        text = verse_text_from_element(verse_el)
        if text:
            verse_map[(ch, vs)].append(text)
    # Each verse should be one joined string — verse_text already joins words
    flat: dict[tuple[int, int], list[str]] = {}
    for key, parts in verse_map.items():
        flat[key] = [" ".join(parts)]
    return flat


def generate_hebrew(morphhb_root: Path) -> None:
    wlc_dir = None
    for candidate in morphhb_root.rglob("wlc"):
        if candidate.is_dir():
            wlc_dir = candidate
            break
    if wlc_dir is None:
        raise FileNotFoundError("morphhb wlc/ directory not found")

    for osis_stem, book_id, book_name in OT_BOOKS:
        path = wlc_dir / f"{osis_stem}.xml"
        if not path.exists():
            raise FileNotFoundError(f"Missing WLC file: {path}")
        verse_map = parse_wlc_xml(path)
        chapters = chapters_from_verse_map(verse_map)
        if not chapters:
            raise RuntimeError(f"No verses parsed for {book_name} ({path})")
        doc = {
            "bookId": book_id,
            "bookName": book_name,
            "language": "hebrew",
            "edition": "WLC",
            "source": "https://github.com/openscriptures/morphhb",
            "chapters": chapters,
        }
        write_book(OUT_DIR / f"{book_id}-hebrew.json", doc)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="scrib-bible-") as tmp:
        tmp_path = Path(tmp)
        sbl_zip = tmp_path / "sblgnt.zip"
        hb_zip = tmp_path / "morphhb.zip"
        download_zip(SBLGNT_ZIP, sbl_zip)
        download_zip(MORPHHB_ZIP, hb_zip)
        sbl_root = extract_zip(sbl_zip, tmp_path / "sblgnt")
        hb_root = extract_zip(hb_zip, tmp_path / "morphhb")

        print("Generating Greek NT (SBLGNT)…")
        generate_greek(sbl_root)
        print("Generating Hebrew OT (WLC)…")
        generate_hebrew(hb_root)

    print(f"Done. Output: {OUT_DIR}")


if __name__ == "__main__":
    main()
