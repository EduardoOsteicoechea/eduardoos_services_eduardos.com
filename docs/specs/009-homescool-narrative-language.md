# 009 — Homescool narrative language (level 6)

**Status:** canonical for all new and revised `.eoschool` lesson copy.  
**Audience:** level **6** (≈ **8 years**).  
**Applies to:** `lesson.points[].body`, `lesson.summary`, quiz prompts/choices, and headings — every student-facing string in a cell JSON.

Agents, connectors, and human authors **must** follow this spec together with [METHOD_V1.md](../../frontend/public/skills/eoschool/METHOD_V1.md).

## How the frontend maps your text

Each `lesson.points[].body` is split on **blank lines** (`\n\n`). The Homescool Letter UI assigns boxes from paragraph order and prefixes (see `classifyLessonParas` in `frontend/src/lib/homescool-eoschool.ts`):

| Paragraph | Box label in UI | How the FE classifies it |
| --- | --- | --- |
| First paragraph | **Idea central** | Always the lead block |
| Middle paragraph(s) | **Explora** | Default for paragraphs 2…n−2 that are not specials |
| Paragraph starting with `Práctica:` / `Practice:` | **Práctica** | Full-width practice strip (with workspace) |
| Paragraph starting with `Error común:` / `Common mistake:` | **Error a corregir** | Side column when Explora + error share a row |
| Optional `Consejo:` / `Meta:` | Consejo / Meta | Same side column |

**Do not** paste meta-labels into the prose (`Idea central:`, `Explora:`, `explora:`). The UI already shows those titles. Labels inside the body duplicate chrome and break the narrative flow.

## Voice: guided prose, not a checklist

Write so a child can **read alone** and feel accompanied:

1. **Open the idea** in plain language (definitions + kid gloss for every school term on first use).
2. **Walk through examples** in full short sentences (Explora).
3. **Hand off to the child** with one clear practice block.
4. **Warn about one typical mistake** in friendly direct speech.

**Use** natural bridges when they help continuity:

- Lead: «Hoy vamos a…», «Esta semana…», «Primero…» (only **one** opening hook per point; do not repeat the same hook on every paragraph).
- Explora: «Sigamos juntos.», «Mira este ejemplo.», «Fíjate en…» (optional on the **first** Explora paragraph only).
- Practice: always **`Práctica: Ahora te toca a ti.`** then the task with a **capitalized** verb («Escribe…», «Resuelve…», «Cuenta…»).
- Error: **`Error común:`** then the mistake — **without** filler like «Antes de terminar, un aviso.»

**Forbidden in lesson bodies**

- Checklist stacks in Idea central (bare «Término = glosa» lists, `A | B | C`, `A → B → C` chains without sentences).
- Telegraphic meta repeated every day: «Esta clase te ayuda a aprender…», «Antes de hacer la actividad, di qué aprendiste», «Aprendemos:» in headings.
- Duplicate section labels (`Idea central:`, `explora:`) or broken glue (`Sigamos juntos. explora:`).
- Orders with no teaching («Conjuga…» / «Marca…» only) on deepen/review days.
- Jargon with no immediate gloss («participio», «epitelial», …) — define on first use.
- Bare «frente a» / «vs» mid-paragraph unless you **want** a Contraste two-column split (FE detects those markers).

**Allowed exceptions**

- Math and conjugation **maps** when they teach form (`habl- → hablo`, `6×7`, table layouts).
- Quoted Scripture / citations in write prompts and teología blocks.

## Paragraph template (copy pattern)

Use **exactly four paragraphs** per point when possible (blank line between each):

```text
Hoy vamos a [idea en lenguaje de 8 años]. [Definiciones: término = explicación + ejemplo corto.]

Sigamos juntos. [Ejemplo trabajado paso a paso en oraciones completas.]

Práctica: Ahora te toca a ti. [Tarea concreta que use la clase.]

Error común: [Un error típico y cómo evitarlo, sin sermón.]
```

English (`locale: "en"`, subject `ing`): same structure; use `Practice: Now it's your turn.` and `Common mistake:`.

## Headings and summaries

- **`heading`:** short topic title only — no «Aprendemos:», no «Palabras en acción:», no double colons.
- **`summary`:** one or two sentences the child can retell; intro days synthesize the week; deepen days may use «Esta semana seguimos con: [title]. Lee cada parte con calma y prueba la actividad.» — not the old template «Primero entiende la idea, luego explórala…».
- Review day (5): five overview blocks are **mini-explanations**, not slogans or bare «Repaso:» prefixes.

## Quiz copy (level 6)

When adapting for ≈8 years, **replace every question** (prompt + distractors / write instruction), not only add «Elige la respuesta correcta».

| Rule | Detail |
| --- | --- |
| MCQ prompt | Start with «Elige la respuesta correcta. » (one space after the period) then a **new**, concrete question tied to that day’s lesson. |
| Choices | Plausible confusions from the lesson; **never** prefix `Respuesta:` on a choice or on `answer`. |
| Write | Short instruction; student searches class text, quotes an exact phrase, explains in their words (see METHOD_V1 quiz sheet rule). |
| Locale | Spanish cells: Spanish only in prompts/choices (no English meta like Overview, checklist, vs). |

## Encoding and typography

- UTF-8 Spanish: tildes and «¿?» («patrón», «dirección», «refracción», «acompáñala», …).
- Prefer «comillas angulares» for examples in Spanish copy.
- Fix known bad patterns: «profundizamos en…» not «miraremos con más calma en la…»; «consecuencias» not «lo que ocurre después» glued to «pecado y sus».

## Quality gate before upsert

1. Each `lesson.points[]` has `body` with `\n\n`-separated paragraphs; `points` is a **JSON array** (never a single object).
2. Spot-read aloud: sounds like a teacher talking to one child, not a rubric.
3. MCQ: every `answer` appears verbatim in `choices`.
4. Rebuild and sync: `node scripts/build-homescool-curriculum.mjs` (with API env) updates `curriculum.json` and Mongo.

## Local polish script (optional)

After bulk edits, the sidecar helper `.eoschool/polish_language_all.py` (gitignored clone) can re-apply this spec to all cell files under `frontend/public/homescool/media/week1/` and `week2/`. It does **not** replace thoughtful authoring for new themes — it enforces structure and removes forbidden boilerplate.

## Reference implementation

Cycle 3 weeks **1–2**, level **6**: `frontend/public/homescool/media/week1/*.eoschool.json` and `week2/*.eoschool.json` after the narrative-language pass (commit message family: «pulir lenguaje narrativo»).
