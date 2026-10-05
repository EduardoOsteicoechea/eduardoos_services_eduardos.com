"""28-week Bible reading — canon protestante reformado (66 libros, sin deuterocanónicos).

Cada día escolar: tres pistas (Génesis–Ester, Job–Malaquías, NT).
Por pista: 1 capítulo/día por defecto; 2 cuando haga falta para cerrar el NT en 140 días.
En AT, si 2 no alcanza, se sube hasta el mínimo entero necesario (máx. 4 cap./día en esa pista).
"""

from __future__ import annotations

import math
from typing import TypedDict

WEEKS = 28
DAYS_PER_WEEK = 5
READING_DAYS = WEEKS * DAYS_PER_WEEK
DEFAULT_MAX_PER_DAY = 2
OT_CEILING_PER_DAY = 4

# Protestante reformado: mismo conteo de capítulos que la tradición hebrea + NT de 27 libros.
GEN_ESTER: tuple[tuple[str, int], ...] = (
    ("Génesis", 50),
    ("Éxodo", 40),
    ("Levítico", 27),
    ("Números", 36),
    ("Deuteronomio", 34),
    ("Josué", 24),
    ("Jueces", 21),
    ("Rut", 4),
    ("1 Samuel", 31),
    ("2 Samuel", 24),
    ("1 Reyes", 22),
    ("2 Reyes", 25),
    ("1 Crónicas", 29),
    ("2 Crónicas", 36),
    ("Esdras", 10),
    ("Nehemías", 13),
    ("Ester", 10),
)

JOB_MAL: tuple[tuple[str, int], ...] = (
    ("Job", 42),
    ("Salmos", 150),
    ("Proverbios", 31),
    ("Eclesiastés", 12),
    ("Cantares", 8),
    ("Isaías", 66),
    ("Jeremías", 52),
    ("Lamentaciones", 5),
    ("Ezequiel", 48),
    ("Daniel", 12),
    ("Oseas", 14),
    ("Joel", 3),
    ("Amós", 9),
    ("Abdías", 1),
    ("Jonás", 4),
    ("Miqueas", 7),
    ("Nahúm", 3),
    ("Habacuc", 3),
    ("Sofonías", 3),
    ("Hageo", 2),
    ("Zacarías", 14),
    ("Malaquías", 4),
)

NEW_TESTAMENT: tuple[tuple[str, int], ...] = (
    ("Mateo", 28),
    ("Marcos", 16),
    ("Lucas", 24),
    ("Juan", 21),
    ("Hechos", 28),
    ("Romanos", 16),
    ("1 Corintios", 16),
    ("2 Corintios", 13),
    ("Gálatas", 6),
    ("Efesios", 6),
    ("Filipenses", 4),
    ("Colosenses", 4),
    ("1 Tesalonicenses", 5),
    ("2 Tesalonicenses", 3),
    ("1 Timoteo", 6),
    ("2 Timoteo", 4),
    ("Tito", 3),
    ("Filemón", 1),
    ("Hebreos", 13),
    ("Santiago", 5),
    ("1 Pedro", 5),
    ("2 Pedro", 3),
    ("1 Juan", 5),
    ("2 Juan", 1),
    ("3 Juan", 1),
    ("Judas", 1),
    ("Apocalipsis", 22),
)


class ChapterRef(TypedDict):
    book: str
    chapter: int


class BibleDay(TypedDict):
    dayInPlan: int
    genEster: list[ChapterRef]
    jobMal: list[ChapterRef]
    nt: list[ChapterRef]


class BibleBlock(TypedDict):
    days: list[BibleDay]


class TrackReport(TypedDict):
    name: str
    totalChapters: int
    chaptersReadInPlan: int
    chaptersNotCovered: int
    completesCanonIn28Weeks: bool
    maxChaptersPerDay: int
    daysWithTwoOrMore: int


class BibleReport(TypedDict):
    canon: str
    readingDays: int
    defaultMaxPerTrackPerDay: int
    tracks: dict[str, TrackReport]


def _flatten(books: tuple[tuple[str, int], ...]) -> list[ChapterRef]:
    out: list[ChapterRef] = []
    for book, count in books:
        for chapter in range(1, count + 1):
            out.append({"book": book, "chapter": chapter})
    return out


def _total_chapters(books: tuple[tuple[str, int], ...]) -> int:
    return sum(n for _, n in books)


def _per_day_cap(total: int, days: int, prefer_max: int, hard_ceiling: int) -> int:
    need = math.ceil(total / days) if days else total
    if need <= prefer_max:
        return prefer_max
    return min(hard_ceiling, need)


def _schedule_track(
    flat: list[ChapterRef],
    days: int,
    prefer_max: int,
    hard_ceiling: int,
) -> tuple[list[list[ChapterRef]], TrackReport]:
    total = len(flat)
    cap = _per_day_cap(total, days, prefer_max, hard_ceiling)
    capacity = days * cap

    if total <= days:
        counts = [1 if i < total else 0 for i in range(days)]
    elif total <= capacity:
        doubles = total - days
        counts = [1] * days
        for i in range(doubles):
            counts[i % days] += 1
    else:
        counts = [cap] * days
        assigned = cap * days
        if assigned < total:
            counts = [cap] * days

    schedule: list[list[ChapterRef]] = []
    idx = 0
    for count in counts:
        chunk = flat[idx : idx + count] if count else []
        idx += count
        schedule.append(chunk)

    read = min(total, idx)
    days_multi = sum(1 for c in counts if c >= 2)

    report: TrackReport = {
        "name": "",
        "totalChapters": total,
        "chaptersReadInPlan": read,
        "chaptersNotCovered": max(0, total - read),
        "completesCanonIn28Weeks": read >= total,
        "maxChaptersPerDay": cap,
        "daysWithTwoOrMore": days_multi,
    }
    return schedule, report


def bible_report_from_schedules(
    ge_sched: list[list[ChapterRef]],
    jm_sched: list[list[ChapterRef]],
    nt_sched: list[list[ChapterRef]],
    ge_rep: TrackReport,
    jm_rep: TrackReport,
    nt_rep: TrackReport,
) -> BibleReport:
    ge_rep["name"] = "Génesis–Ester"
    jm_rep["name"] = "Job–Malaquías"
    nt_rep["name"] = "Nuevo Testamento"
    return {
        "canon": "Protestante reformado (66 libros)",
        "readingDays": READING_DAYS,
        "defaultMaxPerTrackPerDay": DEFAULT_MAX_PER_DAY,
        "tracks": {
            "genEster": ge_rep,
            "jobMal": jm_rep,
            "nt": nt_rep,
        },
    }


def build_bible_blocks_for_weeks() -> tuple[list[list[BibleBlock]], BibleReport]:
    ge_flat = _flatten(GEN_ESTER)
    jm_flat = _flatten(JOB_MAL)
    nt_flat = _flatten(NEW_TESTAMENT)

    ge_sched, ge_rep = _schedule_track(ge_flat, READING_DAYS, DEFAULT_MAX_PER_DAY, OT_CEILING_PER_DAY)
    jm_sched, jm_rep = _schedule_track(jm_flat, READING_DAYS, DEFAULT_MAX_PER_DAY, OT_CEILING_PER_DAY)
    nt_sched, nt_rep = _schedule_track(nt_flat, READING_DAYS, DEFAULT_MAX_PER_DAY, DEFAULT_MAX_PER_DAY)

    report = bible_report_from_schedules(ge_sched, jm_sched, nt_sched, ge_rep, jm_rep, nt_rep)

    day_index = 0
    all_week_blocks: list[list[BibleBlock]] = []
    for _week in range(WEEKS):
        week_blocks: list[BibleBlock] = []
        for _block_num, num_days in ((1, 2), (2, 3)):
            block_days: list[BibleDay] = []
            for _ in range(num_days):
                if day_index >= READING_DAYS:
                    break
                block_days.append(
                    {
                        "dayInPlan": day_index + 1,
                        "genEster": ge_sched[day_index],
                        "jobMal": jm_sched[day_index],
                        "nt": nt_sched[day_index],
                    }
                )
                day_index += 1
            week_blocks.append({"days": block_days})
        all_week_blocks.append(week_blocks)

    return all_week_blocks, report


def print_bible_report(report: BibleReport) -> None:
    print(f"Bible 28-week plan ({report['canon']})")
    print(f"  reading days: {report['readingDays']}")
    print(f"  default max per track/day: {report['defaultMaxPerTrackPerDay']}")
    for track in report["tracks"].values():
        print(
            f"  {track['name']}: {track['totalChapters']} caps, "
            f"read {track['chaptersReadInPlan']}, "
            f"uncovered {track['chaptersNotCovered']}, "
            f"max/day {track['maxChaptersPerDay']}, "
            f"days>={2} {track['daysWithTwoOrMore']}, "
            f"complete={track['completesCanonIn28Weeks']}"
        )


if __name__ == "__main__":
    _, rep = build_bible_blocks_for_weeks()
    print_bible_report(rep)
