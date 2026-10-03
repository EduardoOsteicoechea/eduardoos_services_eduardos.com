# 009 — Homescool narrative language (level 6)

**Status:** canonical for all new and revised `.eoschool` lesson copy.  
**Audience:** level **6** (≈ **8 years**).  
**Applies to:** `lesson.points[].body`, `lesson.summary`, quiz prompts/choices, headings, and `lesson.slotSequence` text (Letter grid v2).

Agents, connectors, and human authors **must** follow this spec together with [METHOD_V1.md](../../frontend/public/skills/eoschool/METHOD_V1.md) and the metaphor list [`docs/homescool-venezuela-metaphors.md`](../homescool-venezuela-metaphors.md).

## Role

Pedagogical designer for primary school (8-year-olds). Every class is a **natural, inductive narrative** in the **Ask First** method, and every class is tied to **one landmark of Venezuelan geography or history** used as the central metaphor.

## Mandatory rules

### 1. Ask First structure

- The class **never** has separate «práctica», «error común» or «pregunta final» sections. Everything flows in one continuous cycle.
- Every idea follows exactly these **4 steps**:
  1. **Trigger question** — wakes the child's curiosity.
  2. **Reflection space** — a row of dashes `________________________________________` (40 underscores) where the child tries to answer or thinks before reading the answer.
  3. **Explanation (answer)** — heading `Punto X: Título del punto` followed by the answer in **2 to 4 short lines**.
  4. **Copy space (iteration)** — the line `Escribe aquí lo que aprendiste:` followed by another row of dashes.

### 2. Opening

- Every class opens **exactly** with the question `¿Qué aprendiste ayer?` followed by its row of dashes.
- **Punto 1 is always «Repaso de ayer»**: it connects the previous day with today's topic. Day 1 of a week connects with what the child already knows (or with the last class of the previous week).

### 3. Format and layout

- **One idea per line.** Short lines that fit a narrow column (≤ ~40 characters; the generator wraps without cutting words).
- **Strict spacing:** exactly **one blank line** between blocks (question / dashes / heading / answer / copy cue). Space between questions and headings.
- No markdown in slot text.
- A class has **5 to 7 Puntos** (the printed sheet fits ~6). More Puntos only if the lesson still fits the 156 slots.

### 4. Venezuelan metaphor

- Each subject-week has one assigned landmark in [`docs/homescool-venezuela-metaphors.md`](../homescool-venezuela-metaphors.md) (also `scripts/homescool-venezuela-metaphors.json`, enforced by the audit). **Review that list before writing or regenerating any class.**
- The metaphor must live **inside the questions and answers** (organic narrative context), not in a pasted paragraph.
- Only use the **«datos seguros»** listed for that landmark. Never invent figures, dates or records.
- Faith subjects (`teb`, `exe`): the landmark is an **image that helps**, never a theological equivalence.

## Gold example (shape and tone)

```text
¿Qué aprendiste ayer?

________________________________________

Punto 1: Repaso de ayer

Ayer descubriste que las palabras
son exploradores en una gran montaña.

Escribe aquí lo que aprendiste:
________________________________________

¿Sabías que en la Sierra Nevada de Mérida
todas las palabras forman nueve equipos?

________________________________________

Punto 2: Los nueve equipos de la Sierra
...
```

Working module template: `scripts/homescool-ask-first-content/GOLD.example.mjs`.

## Letter grid v2 sheet

`lesson.layout: "letter-grid-v2"` — `slotSequence` of 156, generated from the module: opening → (question, dashes, `Punto N`, answer, copy cue, dashes) × N → quiz → image-band lines. Spare slots become extra dash rows in the reflection spaces. Packing contract: [`.cursor/rules/homescool-class-method-v2.mdc`](../../.cursor/rules/homescool-class-method-v2.mdc).

## `points[].body`

One point per `Punto N`. Paragraphs are separated by blank lines (`\n\n`): the question first (point 1: «¿Qué aprendiste ayer?»), then the answer. The printed sheet's source of truth is `slotSequence`.

## Voice

- Short complete sentences a child can read alone; gloss every school term on first use.
- Each answer raises the next question.
- Natural bridges are welcome («Imagina que…», «Una pregunta con truco…»); do not repeat the same hook on every point.

**Forbidden**

- UI labels pasted into prose (`Idea central:`, `Explora:`, `Práctica:`, `Error común:`).
- Checklist stacks (bare «Término = glosa» lists, `A | B | C`, `A → B → C` chains without sentences).
- Telegraphic filler repeated every day: «Esta clase te ayuda a aprender…», «Antes de terminar, un aviso».
- Orders with no teaching («Conjuga…» / «Marca…» only).
- Jargon with no immediate gloss («participio», «epitelial», …).
- Patriotic speeches, long lists of facts, or numbers not in the metaphor list.

**Allowed exceptions**

- Math and conjugation **maps** when they teach form (`habl- → hablo`, `6×7`, table layouts).
- Quoted Scripture / citations in write prompts and teología blocks.

English (`locale: "en"`, subject `ing`): same ideas; sheet labels stay Spanish unless the cell is `locale: "en"`.

## Headings and summaries

- **`heading`:** `Punto N: …` only; no «Aprendemos:», no double colons.
- **`summary`:** one or two sentences the child can retell.

## Quiz copy (level 6)

Up to 12 items: 8 MCQ + 4 write (2 of the 4 are schematic), with one blank line between questions. When the gaps do not fit, the generator drops questions (never below 2 MCQ + 1 schematic + 1 written reflection). Replace every question when adapting.

| Rule | Detail |
| --- | --- |
| MCQ prompt | **One short line**, concrete, tied to that day's printed lesson. Vary openings; no required prefix. |
| Choices | Plausible confusions from the lesson; **never** prefix `Respuesta:`. Rotate the correct position. |
| Write / schematic | Short instruction; answerable from sheet text; ≥2 schematic per day. |
| Locale | Spanish cells: Spanish only in prompts/choices. |

## Encoding and typography

- UTF-8 Spanish: tildes and «¿?».
- Prefer «comillas angulares» for examples in Spanish copy.

## Quality gate before upsert

1. `points` is a **JSON array** (never a single object).
2. Read aloud: a teacher talking to one child, not a rubric.
3. MCQ: every `answer` appears verbatim in `choices`; every quiz item is answerable from explicit sheet text.
4. `node scripts/audit-homescool-v2-review.mjs` → 0 issues (checks the opening, Punto 1, copy cues, dashes, the assigned landmark).
5. `go test ./pkg/pdf/...` (no line wider than the 59 mm text box).
6. `node scripts/build-homescool-curriculum.mjs` (with API env) only when the user asks.

## Reference implementation

Generator: `scripts/build-homescool-ask-first-v2.mjs` + `scripts/homescool-ask-first-content/*.mjs` (cycle 3, level 6, weeks 1–2).
