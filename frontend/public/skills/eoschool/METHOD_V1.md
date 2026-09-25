# eoschool teaching method v1

Canonical curriculum + `.eoschool` document contract for Homescool.
Agents and `POST /api/v1/homescool/materials` **must** follow this file.

## Goal

Children memorize by reviewing the same week topic from complementary angles:
intro â†’ deepen each point â†’ synthetic review, each day with an accumulating quiz.

## Hierarchy

```text
cycle (1â€“3) â†’ week (1â€“24) â†’ day (1â€“5) â†’ level (1â€“15) â†’ subject (12 codes)
```

One `.eoschool` document per cell: **lesson + quiz**.

Per week Ã— level: **12 subjects Ã— 5 days = 60 quizzes**.

### Level (v1 scope)

- Prepare **only level 6** (â‰ˆ **10-year-old**).
- Write in clear, concrete language for that age (short sentences, worked examples, few jargon terms).
- API rejects other levels until the method expands.

### Self-teaching lesson bodies (mandatory)

A child of â‰ˆ10 must be able to **read the sheet alone** and understand every term **before** any practice task.  
**Forbidden:** deepen/review bodies that are only orders (Â«Conjugaâ€¦Â», Â«Marcaâ€¦Â», Â«Hazâ€¦Â») with no definitions.  
**Forbidden:** jargon without an immediate plain-language gloss (e.g. bare Â«participioÂ», Â«auxiliarÂ», Â«indicativoÂ», Â«epitelialÂ»).  
Define on first use: *X = explicaciÃ³n sencilla + ejemplo*. Prefer kid words (*forma ya hecha*, *palabra ayudante*, *una palabra / dos palabras*) alongside the school term.

**Narrative voice (mandatory):** keep the FE boxes (Idea central â†’ Explora â†’ PrÃ¡ctica â†’ Error), but write **guided prose** that continues from one box to the next (Â«Hoy vamosâ€¦Â», Â«Sigamos juntosâ€¦Â», Â«Ahora te tocaâ€¦Â»).  
Forbidden: bullet-stack / checklist tone inside Idea central.  
Forbidden: telegraphic separators in student-facing prose (`|`, bare `TÃ©rmino = glosa`, `A â†’ B â†’ C` chains, `LÃ­nea: A | B`). Prefer full short sentences (Â«La promesa esâ€¦Â», Â«Escribe una frase sobre la creaciÃ³n, otra sobreâ€¦Â»). Keep math equations and conjugation maps (`habl- â†’ hablo`) when they teach a form.  
Avoid bare Â«frente aÂ» / Â«vsÂ» in mid paragraphs unless you *want* a Contraste two-column split.

Each `lesson.points[].body` uses blank-line paragraphs so the FE boxes them:

1. **Idea central** (first paragraph): what the idea is + definitions of every technical word used that day.  
2. **Explora** (1â€“3 paragraphs): worked examples step by step.  
3. **`PrÃ¡ctica:`** â€¦ concrete tasks.  
4. **`Error comÃºn:`** â€¦ one typical mistake.  
5. Optional **`Consejo:`** / **`Meta:`**.

Deepen days re-teach the focus point fully (assume day 1 may be forgotten). Intro points define their own terms. Review overviews are mini-explanations, not slogans.

Example (esp deepen -ar): define *conjugar*, *raÃ­z*, *desinencia* in Idea central; show cantar â†’ cant- + -o/-as/-a in Explora; then PrÃ¡ctica / Error comÃºn.  
Example (esp compuestos): *participio = forma ya hecha (-ado/-ido)*; *haber = palabra ayudante* (not Â«existeÂ»).

### Subjects (12 short codes) â€” menu / class number order

| # | Code | Subject |
| --- | --- | --- |
| 1 | `teb` | TeologÃ­a bÃ­blica |
| 2 | `exe` | ExÃ©gesis |
| 3 | `LT` | LÃ­nea de tiempo |
| 4 | `his` | Historia |
| 5 | `geo` | GeografÃ­a |
| 6 | `art` | Bellas artes |
| 7 | `mat` | MatemÃ¡ticas |
| 8 | `esp` | EspaÃ±ol |
| 9 | `ing` | InglÃ©s (same weekly theme as `esp`, separate document, usually `locale: "en"`) |
| 10 | `lat` | LatÃ­n |
| 11 | `cie` | Ciencias |
| 12 | `pro` | Proyecto |

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
| 2 | **Deepen** point 1 of day 1 | **16** MCQ (days 1â€“2) |
| 3 | **Deepen** point 2 | **24** MCQ (days 1â€“3) |
| 4 | **Deepen** point 3 | **32** MCQ + **4** `write` (reflection) â†’ **36** total |
| 5 | **Review:** five overview blocks | **40** MCQ + **12** `write` (4 from day 4 + 8 new) â†’ **52** total; **randomize** MCQ order |

### Exception: `pro` (Proyecto) â€” one experiment per week

`pro` does **not** deepen three academic points across the week. There is **one** hands-on project per week:

| Day | `pro` lesson |
| --- | --- |
| **1** | **Full explanation only here:** purpose, materials/procedure, why it works (3 points + summary). |
| **2â€“4** | Short **continuation / lab time** (1 point): same project, no new experiment, no re-teach of the whole intro. Keep quiz accumulation. |
| **5** | Brief wrap + **expo prep** (1 point). FE still adds the lined expo page. Do **not** emit five panorama re-hashes of the experiment. API: `pro` day 5 accepts **>= 1** overview point; other subjects still require **exactly 5**. |

Student-facing rule: day 1 teaches; the rest of the week **works and presents** that same project.

### Day 5 lesson blocks (fixed order)

1. Overview of the week theme  
2. Overview of point 1  
3. Overview of point 2  
4. Overview of point 3  
5. Overview of point 1 again, rephrased and more synthetic  

**Locale of student-facing text:** headings, bodies, quiz prompts/choices must match `locale`.  
For `esp` / `locale: "es"`: never show English meta-labels (`Overview`, `checklist`, `vs`, `deepen`, `review`). Use Spanish (`Panoramaâ€¦`, `listaâ€¦`, `o`, `frente a` only when you want a Contraste split). Grammar terms that are Spanish (`tiempo simple`, `Error comÃºn`) are fine.

### Quiz accumulation rule

- Days 1â€“3: each day adds **8** new MCQ; serve all MCQ from days `1â€¦day`.
- Day 4: same MCQ rule (**32**) **plus 4** writing/reflection prompts (`type: "write"`, `originDay: 4`).
- Day 5: **40** MCQ (shuffled) **plus 12** `write` items (the 4 from day 4 + **8** new with `originDay: 5`).

MCQ items are **selecciÃ³n simple** with at least **2** choices (prefer 4: Aâ€“D).  
`write` items have a prompt (and optional teacher `answer` rubric hint); **no** `choices`.

## Presentation / print (always)

- Frontend stage = **N** stacked **US Letter portrait** pages (`8.5in Ã— 11in`).
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
  "title": "â€¦",
  "lesson": {
    "kind": "intro",
    "focusPoint": null,
    "points": [
      { "id": "p1", "heading": "â€¦", "body": "â€¦" },
      { "id": "p2", "heading": "â€¦", "body": "â€¦" },
      { "id": "p3", "heading": "â€¦", "body": "â€¦" }
    ],
    "summary": "â€¦"
  },
  "quiz": {
    "questionCount": 8,
    "questions": [
      {
        "id": "d1-q1",
        "originDay": 1,
        "type": "mcq",
        "prompt": "â€¦",
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
- `cycle` âˆˆ 1..3; `week` âˆˆ 1..24; `day` âˆˆ 1..5; `level` must be `6` (v1); `subject` âˆˆ the 12 codes (case-sensitive for `LT`, lowercase otherwise).
- Logical key: `owner + cycle + week + day + level + subject` (no free slug).
- `day == 1` â†’ `lesson.kind == "intro"`, exactly 3 points, `summary` required, `focusPoint` null, `quiz.questionCount == 8`, every question `originDay == 1`, all `mcq`.
- `day` âˆˆ 2..3 â†’ `kind == "deepen"`, `focusPoint == day - 1`, â‰¥1 point block, `questionCount == 8 * day`, each `originDay` âˆˆ 1..day, all `mcq`.
- `day == 4` â†’ `kind == "deepen"`, `focusPoint == 3`, `questionCount == 36` (32 `mcq` + 4 `write` with `originDay == 4`).
- `day == 5` â†’ `kind == "review"`, exactly **5** point blocks, `questionCount == 52` (40 `mcq` + 12 `write`: 4 with `originDay == 4` and 8 with `originDay == 5`).
- Question `type`: **`mcq`** or **`write`**. MCQ needs `choices` (â‰¥2) and `answer`. Write needs `prompt` only.

## API (docs-first)

1. `GET /api/v1/docs` â€” read `payloadSchema.homescool`.
2. `GET /api/v1/homescool/access`
3. `POST /api/v1/homescool/materials` with `confirmOverwrite: true` and `material` = full `.eoschool` object (not raw HTML).

Cookie UI: curriculum SoT `GET /homescool/curriculum.json`; preview `POST /api/homescool/preview`; also materials GET routes.

## Content packs â€” level 6, ciclo 3

### Week 1 themes

| Code | Theme |
| --- | --- |
| `mat` | Multiplication tables **1â€“12** (dedicated tables letter layout) |
| `esp` | Three conjugations: **-ar**, **-er**, **-ir** |
| `ing` | **Same syllabus as `esp`**, in English (first / second / third conjugation patterns) |
| `lat` | Prepositions: **inâ€“en**, **apudâ€“con**, **perâ€“por**, **sineâ€“sin**, **aâ€“de**, **deâ€“de** |
| `teb` | Overview of redemptive-history stages from Genesis to the new earth |
| `exe` | Romans **1:1** |
| `LT` | Timeline: (1) age of ancient empires; (2) creation and fall; (3) flood and Babel; (4) Mesopotamia / Sumer; (5) Egyptians; (6) Indus Valley, Minoans, Mycenaeans |
| `his` | The three voyages of Christopher Columbus |
| `geo` | Venezuelan states and capitals |
| `cie` | Four body tissues: connective, epithelial, muscular, nervous |
| `art` | Five elements of form (*Drawing with Children* / OiLS) |
| `pro` | Scientific experiment â€” persistence of vision (Â«GuiÃ±andoÂ») |

### Week 2 themes (same age band â‰ˆ 10)

| Code | Theme |
| --- | --- |
| `mat` | Multiplication tables **5â€“16** (same letter layout; extends beyond 12) |
| `esp` / `ing` | Indicative tenses (simple + compound) â€” keep, but language for 10-year-olds |
| `his` | Columbus in Venezuela: whom he met and how they interacted |
| `lat` | Conjunctions/adverbs: etâ€“and, utâ€“so that, nonâ€“not |
| `LT` | Timeline wonders / patriarchal Israel / Hittitesâ€“Canaanites / Kush / Assyrians / Babylonians / Shang |
| `geo` | 24 Venezuelan states and capitals (spiral review) |
| `cie` | Skeleton: skull, vertebrae, ribs, sternum |
| `art` | Mirror images / five elements of form |
| `pro` | Water-drop lens experiment |
| `teb` | **Panorama of key Genesis themes** (creation, fall, flood, promise, patriarchs) |
| `exe` | Romans **1:2** |

Live cell files: `frontend/public/homescool/media/week1/` and `week2/`.  
Rebuild: `node scripts/build-homescool-curriculum.mjs`.
