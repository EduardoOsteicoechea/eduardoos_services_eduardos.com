"""28-week Bible reading plan: 5 school days/week × 3 chapters/day (Gén–Ester, Job–Mal, NT)."""

from __future__ import annotations

from typing import TypedDict

WEEKS = 28
DAYS_PER_WEEK = 5
READING_DAYS = WEEKS * DAYS_PER_WEEK

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
    genEster: ChapterRef
    jobMal: ChapterRef
    nt: ChapterRef


class BibleBlock(TypedDict):
    days: list[BibleDay]


class BibleReport(TypedDict):
    readingDays: int
    chaptersPerDay: int
    tracks: dict[str, dict[str, int | str]]


def _flatten(books: tuple[tuple[str, int], ...]) -> list[ChapterRef]:
    out: list[ChapterRef] = []
    for book, count in books:
        for chapter in range(1, count + 1):
            out.append({"book": book, "chapter": chapter})
    return out


def _total_chapters(books: tuple[tuple[str, int], ...]) -> int:
    return sum(n for _, n in books)


def bible_report() -> BibleReport:
    ge_total = _total_chapters(GEN_ESTER)
    jm_total = _total_chapters(JOB_MAL)
    nt_total = _total_chapters(NEW_TESTAMENT)
    slots = READING_DAYS

    def track(name: str, total: int) -> dict[str, int | str]:
        covered = min(slots, total)
        return {
            "name": name,
            "totalChapters": total,
            "chaptersReadInPlan": covered,
            "chaptersNotCovered": max(0, total - covered),
            "completesCanonIn28Weeks": total <= slots,
        }

    return {
        "readingDays": slots,
        "chaptersPerDay": 3,
        "tracks": {
            "genEster": track("Génesis–Ester", ge_total),
            "jobMal": track("Job–Malaquías", jm_total),
            "nt": track("Nuevo Testamento", nt_total),
        },
    }


def build_bible_blocks_for_weeks() -> tuple[list[list[BibleBlock]], BibleReport]:
    ge = _flatten(GEN_ESTER)
    jm = _flatten(JOB_MAL)
    nt = _flatten(NEW_TESTAMENT)
    report = bible_report()

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
                        "genEster": ge[day_index],
                        "jobMal": jm[day_index],
                        "nt": nt[day_index],
                    }
                )
                day_index += 1
            week_blocks.append({"days": block_days})
        all_week_blocks.append(week_blocks)

    return all_week_blocks, report


def print_bible_report(report: BibleReport) -> None:
    print("Bible 28-week plan")
    print(f"  reading days: {report['readingDays']} (5 per week)")
    print(f"  chapters per day (3 tracks): {report['chaptersPerDay']}")
    for key, track in report["tracks"].items():
        print(
            f"  {track['name']}: {track['totalChapters']} caps total, "
            f"{track['chaptersReadInPlan']} read in plan, "
            f"{track['chaptersNotCovered']} not covered, "
            f"complete={track['completesCanonIn28Weeks']}"
        )


if __name__ == "__main__":
    _, rep = build_bible_blocks_for_weeks()
    print_bible_report(rep)
