# eoschool teaching method v1

Canonical curriculum + `.eoschool` document contract for Homescool.
Agents and `POST /api/v1/homescool/materials` **must** follow this file.

## Goal

Children memorize by reviewing the same week topic from complementary angles:
intro → deepen each point → synthetic review, each day with an accumulating quiz.

## Hierarchy

```text
cycle (1–3) → week (1–24) → day (1–5) → level (1–15) → subject (12 codes)
```

One `.eoschool` document per cell: **lesson + quiz**.

Per week × level: **12 subjects × 5 days = 60 quizzes**.

### Level (v1 scope)

- Prepare **only level 6** (≈ 12-year-old).
- API rejects other levels until the method expands.

### Subjects (12 short codes)

| Code | Subject |
| --- | --- |
| `mat` | Matemáticas |
| `esp` | Español |
| `ing` | Inglés (same weekly theme as `esp`, separate document, usually `locale: "en"`) |
| `his` | Historia |
| `lat` | Latín |
| `LT` | Línea de tiempo |
| `geo` | Geografía |
| `cie` | Ciencias |
| `art` | Bellas artes |
| `pro` | Proyecto |
| `teb` | Teología bíblica |
| `exe` | Exégesis |

## Week pedagogy (every subject)

| Day | Lesson | Quiz size |
| --- | --- | --- |
| 1 | **Intro:** exactly **3 points** + **summary** | **7** (new set; all `originDay: 1`) |
| 2 | **Deepen** point 1 of day 1 | **14** (sets days 1–2) |
| 3 | **Deepen** point 2 | **21** (sets days 1–3) |
| 4 | **Deepen** point 3 | **28** (sets days 1–4) |
| 5 | **Review:** five overview blocks (see below) | **35** (sets 1–5; **randomize** order from the accumulated pool) |

### Day 5 lesson blocks (fixed order)

1. Overview of the week theme  
2. Overview of point 1  
3. Overview of point 2  
4. Overview of point 3  
5. Overview of point 1 again, rephrased and more synthetic  

### Quiz accumulation rule

Each day adds **7 new** questions. The quiz served that day includes **all** questions from days `1…day` (so day *n* has `7 × n` items; day 5 has 35). Day 5 must shuffle presentation order.

## Presentation / print (always)

- Frontend stage = **N** stacked **US Letter portrait** pages (`8.5in × 11in`).
- Page margin **1 cm** (viewer and backend PDF must match).
- Internal lesson layout will be refined later; v1 requires the pedagogical structure above inside letter pages.
- Media for v1 lives under `frontend/public/homescool/media/` (URLs `/homescool/media/...`).

## `.eoschool` JSON contract

```json
{
  "format": "eoschool",
  "version": 1,
  "cycle": 1,
  "week": 1,
  "day": 1,
  "level": 6,
  "subject": "mat",
  "locale": "es",
  "title": "…",
  "lesson": {
    "kind": "intro",
    "focusPoint": null,
    "points": [
      { "id": "p1", "heading": "…", "body": "…" },
      { "id": "p2", "heading": "…", "body": "…" },
      { "id": "p3", "heading": "…", "body": "…" }
    ],
    "summary": "…"
  },
  "quiz": {
    "questionCount": 7,
    "questions": [
      {
        "id": "d1-q1",
        "originDay": 1,
        "type": "mcq",
        "prompt": "…",
        "choices": ["A", "B", "C", "D"],
        "answer": "A"
      }
    ]
  },
  "media": []
}
```

### Validation rules

- `format` must be `"eoschool"`; `version` must be `1`.
- `cycle` ∈ 1..3; `week` ∈ 1..24; `day` ∈ 1..5; `level` must be `6` (v1); `subject` ∈ the 12 codes (case-sensitive for `LT`, lowercase otherwise).
- Logical key: `owner + cycle + week + day + level + subject` (no free slug).
- `day == 1` → `lesson.kind == "intro"`, exactly 3 points, `summary` required, `focusPoint` null, `quiz.questionCount == 7`, every question `originDay == 1`.
- `day` ∈ 2..4 → `kind == "deepen"`, `focusPoint == day - 1`, ≥1 point block, `questionCount == 7 * day`, each `originDay` ∈ 1..day.
- `day == 5` → `kind == "review"`, exactly **5** point blocks in the overview order above, `questionCount == 35`, each `originDay` ∈ 1..5.
- Question `type`: `mcq` | `short` | `match` | `order`.

## API (docs-first)

1. `GET /api/v1/docs` — read `payloadSchema.homescool`.
2. `GET /api/v1/homescool/access`
3. `POST /api/v1/homescool/materials` with `confirmOverwrite: true` and `material` = full `.eoschool` object (not raw HTML).

Cookie UI: `GET /api/homescool/materials`, `GET /api/homescool/materials/{id}`, `GET /api/homescool/materials/{id}/document`, `GET /api/homescool/materials/{id}/pdf`.

## First content pack — level 6, week 1

| Code | Theme |
| --- | --- |
| `mat` | Multiplication tables 1–12 |
| `esp` | Indicative verb tenses: simple (present, imperfect, preterite, future, conditional) and compound (present perfect, pluperfect, anterior preterite, future perfect, conditional perfect) |
| `ing` | **Same syllabus as `esp`**, in English |
| `his` | Columbus in Venezuela: whom he met and how they interacted |
| `lat` | Conjunctions/adverbs: et–and, ut–so that, non–not |
| `LT` | Timeline: 8 seven wonders of the ancient world; 9 patriarchal Israel; 10 Hittites and Canaanites; 11 Kush; 12 Assyrians; 13 Babylonians; 14 Shang dynasty of China |
| `geo` | 24 Venezuelan states and capitals |
| `cie` | Skeleton: skull, vertebrae, ribs, sternum |
| `art` | Mirror images / five elements of form (*Drawing with Children*, Mona Brookes). Resources: half-drawn symmetric images (Greek column, vase, face); whiteboard; paper; pencils. Attention → Name (mirror image, line of symmetry) → Express (complete half drawings; fold and draw mirror). See book pp. 67–69. |
| `pro` | Water-drop lens experiment: 6 in / 15 cm of 20-gauge wire, pencil, bowl, tap water, newspaper. Loop wire, dip, view print through drop (convex lens / eye). |
| `teb` | Overview of redemptive-history stages from Genesis to the new earth |
| `exe` | Romans 1:1–7 |

Agents author **5 documents per subject** (days 1–5) for this pack before moving to other weeks.
