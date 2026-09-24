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

- Prepare **only level 6** (≈ **10-year-old**).
- Write in clear, concrete language for that age (short sentences, worked examples, few jargon terms).
- API rejects other levels until the method expands.

### Self-teaching lesson bodies (mandatory)

A child of ≈10 must be able to **read the sheet alone** and understand every term **before** any practice task.  
**Forbidden:** deepen/review bodies that are only orders («Conjuga…», «Marca…», «Haz…») with no definitions.  
**Forbidden:** jargon without an immediate plain-language gloss (e.g. bare «participio», «auxiliar», «indicativo», «epitelial»).  
Define on first use: *X = explicación sencilla + ejemplo*. Prefer kid words (*forma ya hecha*, *palabra ayudante*, *una palabra / dos palabras*) alongside the school term.

**Narrative voice (mandatory):** keep the FE boxes (Idea central → Explora → Práctica → Error), but write **guided prose** that continues from one box to the next («Hoy vamos…», «Sigamos juntos…», «Ahora te toca…»).  
Forbidden: bullet-stack / checklist tone inside Idea central.  
Avoid bare «frente a» / «vs» in mid paragraphs unless you *want* a Contraste two-column split.

Each `lesson.points[].body` uses blank-line paragraphs so the FE boxes them:

1. **Idea central** (first paragraph): what the idea is + definitions of every technical word used that day.  
2. **Explora** (1–3 paragraphs): worked examples step by step.  
3. **`Práctica:`** … concrete tasks.  
4. **`Error común:`** … one typical mistake.  
5. Optional **`Consejo:`** / **`Meta:`**.

Deepen days re-teach the focus point fully (assume day 1 may be forgotten). Intro points define their own terms. Review overviews are mini-explanations, not slogans.

Example (esp deepen -ar): define *conjugar*, *raíz*, *desinencia* in Idea central; show cantar → cant- + -o/-as/-a in Explora; then Práctica / Error común.  
Example (esp compuestos): *participio = forma ya hecha (-ado/-ido)*; *haber = palabra ayudante* (not «existe»).

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

## Dual storage (edit both)

| Layer | Role | Path / how |
| --- | --- | --- |
| **Cell JSON** | Authoring source of truth | `frontend/public/homescool/media/weekN/*-c3-wN-d*-l6.eoschool.json` |
| **curriculum.json** | FE backup / agent review mirror | Rebuild: `node scripts/build-homescool-curriculum.mjs` |
| **MongoDB** | Runtime SoT for `/homescool` UI | Upsert via same script (needs `EDUARDOOS_API_KEY` + `EDUARDOOS_BASE_URL`) or `POST /api/v1/homescool/materials` |

Always edit the cell JSON (or the Python pack generators under `.eoschool/`), rebuild `curriculum.json`, then sync Mongo. Do not change only one of the two stores.

## Week pedagogy (every subject)

| Day | Lesson | Quiz |
| --- | --- | --- |
| 1 | **Intro:** exactly **3 points** + **summary** | **8** MCQ (`originDay: 1`) |
| 2 | **Deepen** point 1 of day 1 | **16** MCQ (days 1–2) |
| 3 | **Deepen** point 2 | **24** MCQ (days 1–3) |
| 4 | **Deepen** point 3 | **32** MCQ + **4** `write` (reflection) → **36** total |
| 5 | **Review:** five overview blocks | **40** MCQ + **12** `write` (4 from day 4 + 8 new) → **52** total; **randomize** MCQ order |

### Day 5 lesson blocks (fixed order)

1. Overview of the week theme  
2. Overview of point 1  
3. Overview of point 2  
4. Overview of point 3  
5. Overview of point 1 again, rephrased and more synthetic  

### Quiz accumulation rule

- Days 1–3: each day adds **8** new MCQ; serve all MCQ from days `1…day`.
- Day 4: same MCQ rule (**32**) **plus 4** writing/reflection prompts (`type: "write"`, `originDay: 4`).
- Day 5: **40** MCQ (shuffled) **plus 12** `write` items (the 4 from day 4 + **8** new with `originDay: 5`).

MCQ items are **selección simple** with at least **2** choices (prefer 4: A–D).  
`write` items have a prompt (and optional teacher `answer` rubric hint); **no** `choices`.

## Presentation / print (always)

- Frontend stage = **N** stacked **US Letter portrait** pages (`8.5in × 11in`).
- Page margin **1 cm** (viewer and backend PDF must match).
- Media for v1 lives under `frontend/public/homescool/media/` (URLs `/homescool/media/...`).

## `.eoschool` JSON contract

```json
{
  "format": "eoschool",
  "version": 1,
  "cycle": 3,
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
    "questionCount": 8,
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
- `day == 1` → `lesson.kind == "intro"`, exactly 3 points, `summary` required, `focusPoint` null, `quiz.questionCount == 8`, every question `originDay == 1`, all `mcq`.
- `day` ∈ 2..3 → `kind == "deepen"`, `focusPoint == day - 1`, ≥1 point block, `questionCount == 8 * day`, each `originDay` ∈ 1..day, all `mcq`.
- `day == 4` → `kind == "deepen"`, `focusPoint == 3`, `questionCount == 36` (32 `mcq` + 4 `write` with `originDay == 4`).
- `day == 5` → `kind == "review"`, exactly **5** point blocks, `questionCount == 52` (40 `mcq` + 12 `write`: 4 with `originDay == 4` and 8 with `originDay == 5`).
- Question `type`: **`mcq`** or **`write`**. MCQ needs `choices` (≥2) and `answer`. Write needs `prompt` only.

## API (docs-first)

1. `GET /api/v1/docs` — read `payloadSchema.homescool`.
2. `GET /api/v1/homescool/access`
3. `POST /api/v1/homescool/materials` with `confirmOverwrite: true` and `material` = full `.eoschool` object (not raw HTML).

Cookie UI: curriculum SoT `GET /homescool/curriculum.json`; preview `POST /api/homescool/preview`; also materials GET routes.

## Content packs — level 6, ciclo 3

### Week 1 themes

| Code | Theme |
| --- | --- |
| `mat` | Multiplication tables **1–12** |
| `esp` | Three conjugations: **-ar**, **-er**, **-ir** |
| `ing` | **Same syllabus as `esp`**, in English (first / second / third conjugation patterns) |
| `lat` | Prepositions: **in–en**, **apud–con**, **per–por**, **sine–sin**, **a–de**, **de–de** |
| `teb` | Overview of redemptive-history stages from Genesis to the new earth |
| `exe` | Romans **1:1** |
| `LT` | Timeline: (1) age of ancient empires; (2) creation and fall; (3) flood and Babel; (4) Mesopotamia / Sumer; (5) Egyptians; (6) Indus Valley, Minoans, Mycenaeans |
| `his` | The three voyages of Christopher Columbus |
| `geo` | Venezuelan states and capitals |
| `cie` | Four body tissues: connective, epithelial, muscular, nervous |
| `art` | Five elements of form (*Drawing with Children* / OiLS) |
| `pro` | Scientific experiment — persistence of vision («Guiñando») |

### Week 2 themes (same age band ≈ 10)

| Code | Theme |
| --- | --- |
| `mat` | Practice and word problems with tables **1–12** (no jump to 13–15) |
| `esp` / `ing` | Indicative tenses (simple + compound) — keep, but language for 10-year-olds |
| `his` | Columbus in Venezuela: whom he met and how they interacted |
| `lat` | Conjunctions/adverbs: et–and, ut–so that, non–not |
| `LT` | Timeline wonders / patriarchal Israel / Hittites–Canaanites / Kush / Assyrians / Babylonians / Shang |
| `geo` | 24 Venezuelan states and capitals (spiral review) |
| `cie` | Skeleton: skull, vertebrae, ribs, sternum |
| `art` | Mirror images / five elements of form |
| `pro` | Water-drop lens experiment |
| `teb` | **Panorama of key Genesis themes** (creation, fall, flood, promise, patriarchs) |
| `exe` | Romans **1:2** |

Live cell files: `frontend/public/homescool/media/week1/` and `week2/`.  
Rebuild: `node scripts/build-homescool-curriculum.mjs`.
