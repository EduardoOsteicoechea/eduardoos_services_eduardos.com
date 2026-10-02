# 009 — Homescool narrative language (level 6)

**Status:** canonical for all new and revised `.eoschool` lesson copy.  
**Audience:** level **6** (≈ **8 years**).  
**Applies to:** `lesson.points[].body`, `lesson.summary`, quiz prompts/choices, headings, and `lesson.slotSequence` text (Letter grid v2).

Agents, connectors, and human authors **must** follow this spec together with [METHOD_V1.md](../../frontend/public/skills/eoschool/METHOD_V1.md).

## The one writing rule: ask first

The whole class is **one natural, inductive narrative**. Every idea follows the same beat:

1. **Question** — wakes the child's interest («Ahora te pregunto, …»).
2. **Blank space** — the child tries; he feels the need because he does not have the answer yet.
3. **Answer below** — heading `Punto N: …` + short answer phrases.
4. **Copy** — `Cópiala aquí:` + 2 blank lines; the child iterates the idea by copying the answer.

There are **no** separate Idea / Explora / Práctica / Error común / «Para cerrar» sections and no end-of-class question block. Practice and common mistakes are folded into the same beat (e.g. «Una pregunta con truco: …»).

## Letter grid v2 sheet

Rhythm for `lesson.layout: "letter-grid-v2"` (`slotSequence` of 156):

1. Opening question + 2 blank lines (day 1 = hook; days 2–5 = «¿Qué aprendiste ayer sobre esta misma materia?»).
2. Heading `Repaso` + 3 short narrated lines.
3. Typically 5 points, each with the beat above.
4. Soft max **~66 characters** per lesson line; one idea per line; blank line between paragraphs and between a question and its answer space; no markdown in slot text.

Full packing contract: [`.cursor/rules/homescool-class-method-v2.mdc`](../../.cursor/rules/homescool-class-method-v2.mdc).

## `points[].body`

One point per `Punto N`. Paragraphs are separated by blank lines (`\n\n`): the question first, then the answer. The first point starts with the opening question and, on days 2–5, `## Repaso` + its lines. The printed sheet's source of truth is `slotSequence`.

## Voice

- Short complete sentences a child can read alone; gloss every school term on first use.
- The narrative flows from one question to the next: each answer raises the next question.
- Natural bridges are welcome («Sigamos.», «Imagina que…», «Una pregunta con truco…»); do not repeat the same hook on every point.

**Forbidden**

- UI labels pasted into prose (`Idea central:`, `Explora:`, `Práctica:`, `Error común:`).
- Checklist stacks (bare «Término = glosa» lists, `A | B | C`, `A → B → C` chains without sentences).
- Telegraphic filler repeated every day: «Esta clase te ayuda a aprender…», «Antes de terminar, un aviso», «Aprendemos:» in headings.
- Orders with no teaching («Conjuga…» / «Marca…» only).
- Jargon with no immediate gloss («participio», «epitelial», …).

**Allowed exceptions**

- Math and conjugation **maps** when they teach form (`habl- → hablo`, `6×7`, table layouts).
- Quoted Scripture / citations in write prompts and teología blocks.

English (`locale: "en"`, subject `ing`): same ideas; sheet labels stay Spanish unless the cell is `locale: "en"`.

## Headings and summaries

- **`heading`:** short topic title only — `Punto N: …`, no «Aprendemos:», no double colons.
- **`summary`:** one or two sentences the child can retell; intro days synthesize the week.

## Quiz copy (level 6)

When adapting for ≈8 years, **replace every question** (prompt + distractors / write instruction).

| Rule | Detail |
| --- | --- |
| MCQ prompt | **One line**, concrete, tied to that day's printed lesson. Vary openings; no required prefix. |
| Choices | Plausible confusions from the lesson; **never** prefix `Respuesta:` on a choice or on `answer`. Rotate correct-answer position across items. |
| Write / schematic | Short instruction; answerable from sheet text; ≥2 schematic per day on v2 sheets. |
| Locale | Spanish cells: Spanish only in prompts/choices (no English meta like Overview, checklist, vs). |

## Encoding and typography

- UTF-8 Spanish: tildes and «¿?» («patrón», «dirección», «refracción», «acompáñala», …).
- Prefer «comillas angulares» for examples in Spanish copy.

## Quality gate before upsert

1. `points` is a **JSON array** (never a single object).
2. Spot-read aloud: sounds like a teacher talking to one child, not a rubric.
3. MCQ: every `answer` appears verbatim in `choices`; every quiz item is answerable from explicit sheet text.
4. Rebuild and sync: `node scripts/build-homescool-curriculum.mjs` (with API env) updates `curriculum.json` and Mongo — only when the user asks.

## Reference implementation

Generator: `scripts/build-homescool-ask-first-v2.mjs` + `scripts/homescool-ask-first-content/*.mjs` (cycle 3, level 6, weeks 1–2).
