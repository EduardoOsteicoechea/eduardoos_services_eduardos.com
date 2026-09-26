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

### Subjects — menu / class number order (active 1–10)

**PAUSED — do not author or upsert new materials for `teb` (Teologia biblica) or `exe` (Exegesis) until the user re-enables them.** They stay out of the Homescool menu and have no class number in the UI.

| # | Code | Subject |
| --- | --- | --- |
| 1 | `pro` | Proyecto |
| 2 | `esp` | Español |
| 3 | `ing` | Inglés (same weekly theme as `esp`, separate document, usually `locale: "en"`) |
| 4 | `lat` | Latín |
| 5 | `mat` | Matemáticas |
| 6 | `his` | Historia |
| 7 | `LT` | Línea de tiempo |
| 8 | `geo` | Geografía |
| 9 | `cie` | Ciencias |
| 10 | `art` | Bellas artes |

DHS chip labels use short text only (no number on the button): `proy`, `esp`, `ing`, `lat`, `mat`, `hist`, `LinT`, `geo`, `cienc`, `art`. Class numbers 1–10 appear in tooltips and letter headers.

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
| 1 | **Intro:** exactly **3 points** + **summary** | **8** items (`originDay: 1`) |
| 2 | **Deepen** point 1 of day 1 | **16** items (days 1–2) |
| 3 | **Deepen** point 2 | **24** items (days 1–3) |
| 4 | **Deepen** point 3 | **36** items |
| 5 | **Review:** five overview blocks | **52** items; prefer shuffle of prior MCQ |

### Exception: `pro` (Proyecto) — one experiment per week

`pro` does **not** deepen three academic points across the week. There is **one** hands-on project per week:

| Day | `pro` lesson |
| --- | --- |
| **1** | **Full explanation only here:** purpose, materials/procedure, why it works (3 points + summary). |
| **2–4** | Short **continuation / lab time** (1 point): same project, no new experiment, no re-teach of the whole intro. Keep quiz accumulation. |
| **5** | Brief wrap + **expo prep** (1 point). FE still adds the lined expo page. Do **not** emit five panorama re-hashes of the experiment. API: `pro` day 5 accepts **>= 1** overview point; other subjects still require **exactly 5**. |

Student-facing rule: day 1 teaches; the rest of the week **works and presents** that same project.

### Day 5 lesson blocks (fixed order)

1. Overview of the week theme  
2. Overview of point 1  
3. Overview of point 2  
4. Overview of point 3  
5. Overview of point 1 again, rephrased and more synthetic  

**Locale of student-facing text:** headings, bodies, quiz prompts/choices must match `locale`.  
For `esp` / `locale: "es"`: never show English meta-labels (`Overview`, `checklist`, `vs`, `deepen`, `review`). Use Spanish (`Panorama…`, `lista…`, `o`, `frente a` only when you want a Contraste split). Grammar terms that are Spanish (`tiempo simple`, `Error común`) are fine.

### Quiz accumulation rule

- Days 1–3: each day adds **8** new items; serve all items from days `1…day`. Totals: **8 / 16 / 24**.
- Day 4: **36** items. Day 5: **52** items.
- Any slot may be **`mcq`**, **`write`**, or an activity type below. Existing week1/week2 materials that are all-`mcq` (or mcq+write) remain valid.
- Prefer mostly `mcq` on days 1–3; use activity types when pedagogy needs them (they still count **1** toward `questionCount`).

### Question types

| `type` | Layout | Payload |
| --- | --- | --- |
| `mcq` | Choices A–D | `choices` (≥2), `answer` |
| `write` | Lined answer | `prompt` only (+ optional teacher `answer`) |
| `crossword` | Full puzzle (usually 1 Letter page) | `crossword`: `rows`, `cols`, `grid`, `cluesAcross`, `cluesDown` |
| `wordsearch` | Full puzzle (usually 1 Letter page) | `wordsearch`: `grid`, `words` |
| `match` | Two columns | `match`: `left[]`, `right[]` (FE shuffles right for print) |
| `draw_image` | Trace/draw on image | `drawImage.mediaId` must exist in `media[]` |
| `draw_box` | Empty draw frame | optional `drawBox.heightCm` (default 8) |
| `grid_mark` | Labeled grid (A1…) | `gridMark.cols`, `gridMark.rows`; teacher `answer` e.g. `"A6,G4"` |

**Crossword / wordsearch:** **1 JSON item = 1 complete puzzle** (clues/words embedded). Do not split clues into separate questions.

**Grid cells (crossword):** `"."` / `"#"` = black; `""` or a letter = playable (letters are author answers — **not** printed on the student sheet); a digit string places the clue number in that cell.

**Packing (Letter):** `crossword`, `wordsearch`, `draw_image`, `draw_box`, `grid_mark` → max **1 per page** (alone). `match` measured; often 1/page. `mcq`/`write` fill the page as before.

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
- `cycle` ∈ 1..3; `week` ∈ 1..24; `day` ∈ 1..5; `level` must be `6` (v1); `subject` ∈ the 12 codes (case-sensitive for `LT`, lowercase otherwise).
- Logical key: `owner + cycle + week + day + level + subject` (no free slug).
- `day == 1` → `lesson.kind == "intro"`, exactly 3 points, `summary` required, `focusPoint` null, `quiz.questionCount == 8`, every question `originDay == 1`.
- `day` ∈ 2..3 → `kind == "deepen"`, `focusPoint == day - 1`, ≥1 point block, `questionCount == 8 * day`, each `originDay` ∈ 1..day.
- `day == 4` → `kind == "deepen"`, `focusPoint == 3`, `questionCount == 36`.
- `day == 5` → `kind == "review"`, exactly **5** point blocks (except `pro`: ≥1), `questionCount == 52`.
- Question `type`: **`mcq`** | **`write`** | **`crossword`** | **`wordsearch`** | **`match`** | **`draw_image`** | **`draw_box`** | **`grid_mark`**. Payload required per type (see table above). Mixed types allowed; count must match the day total.

### Activity type examples (one slot each)

```json
{
  "id": "d1-q1",
  "originDay": 1,
  "type": "crossword",
  "prompt": "Resuelve el crucigrama",
  "crossword": {
    "rows": 5,
    "cols": 5,
    "grid": [["1", "", "#", "", ""], ["", "#", "", "#", ""], ["2", "", "", "", ""], ["#", "", "#", "", "#"], ["", "", "3", "", ""]],
    "cluesAcross": [{ "num": 1, "clue": "…" }, { "num": 2, "clue": "…" }],
    "cluesDown": [{ "num": 3, "clue": "…" }]
  }
}
```

```json
{
  "id": "d1-q2",
  "originDay": 1,
  "type": "wordsearch",
  "prompt": "Encuentra las palabras",
  "wordsearch": {
    "grid": [["A", "B", "C"], ["D", "E", "F"], ["G", "H", "I"]],
    "words": ["ABC", "AEI"]
  }
}
```

```json
{
  "id": "d1-q3",
  "originDay": 1,
  "type": "match",
  "prompt": "Empareja",
  "match": { "left": ["uno", "dos", "tres"], "right": ["1", "2", "3"] },
  "answer": "A=1,B=2,C=3"
}
```

```json
{
  "id": "d1-q4",
  "originDay": 1,
  "type": "draw_image",
  "prompt": "Traza las rutas sobre el mapa",
  "drawImage": { "mediaId": "mapa1" }
}
```

```json
{
  "id": "d1-q5",
  "originDay": 1,
  "type": "draw_box",
  "prompt": "Dibuja el ciclo del agua",
  "drawBox": { "heightCm": 8 }
}
```

```json
{
  "id": "d1-q6",
  "originDay": 1,
  "type": "grid_mark",
  "prompt": "Marca las casillas correctas",
  "gridMark": { "cols": 8, "rows": 8 },
  "answer": "A6,G4"
}
```

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
