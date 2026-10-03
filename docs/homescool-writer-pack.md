# Paquete de reglas Homescool para escribir clases

Generado desde las reglas vigentes del repo. Las fuentes viven en .cursor/rules/, scripts/homescool-ask-first-content/BRIEF.md y docs/. Si algo difiere, mandan los archivos fuente.


---

# SECCIÓN 1. Método de clase v3 + v3b (imagen sin metáfora, Inglés en inglés)

Fuente: `.cursor/rules/homescool-class-method-v3.mdc`


# Homescool método v3 (3 días · 13 materias)

**Prevalece sobre [`homescool-class-method-v2.mdc`](homescool-class-method-v2.mdc)** en todo lo que contradiga. Lo demás de v2 (Ask First, 156 slots, metáfora venezolana, voz de 8 años, 40 caracteres por línea, quiz, auditoría) sigue vigente.

## 1. Materias y días

- **13 materias**, orden de menú: `teb exe LT his geo art mat esp ing lat cie pro fin` (`fin` = Finanzas, n.º 13).
- Cada materia se ve **3 veces por semana**: `d1`, `d2`, `d3`. Ya no existen `d4` ni `d5`.
- **`pro` (proyecto) es un único día por semana**: solo `d1`.
- Total por semana: 11 materias × 3 + `pro` 1 + `fin` 3 = **37 clases**; semanas 1–2 = **74 clases**.
- Archivo: `week{N}/{subj}-c3-w{N}-d{D}-l6.eoschool.json` (D = 1..3; `pro` solo D = 1).

## 2. Enfoque progresivo (mismo tema y nivel de 8 años)

| Día | `lesson.kind` | `focusPoint` | Qué hace |
| --- | --- | --- | --- |
| d1 | `intro` | `null` | Panorama del tema de la semana: qué es y cómo se ve. |
| d2 | `deepen` | `1` | Se acerca a **una parte** del tema y la entiende bien. |
| d3 | `deepen` | `2` | La parte **más enfocada**: aplica, practica y cuenta lo aprendido. Cierra la semana (hace de repaso y de exposición). |

- El tema, el hito venezolano y los datos de la semana se **conservan**; solo se reparten en 3 días en lugar de 5 y cada día es más estrecho que el anterior.
- No se agregan temas nuevos ni se sube/baja el nivel del niño.
- `quiz.questions[].originDay` = el día de la clase.

## 3. Apertura (ya no es «ayer»)

Como la materia no se ve a diario:

- Primer slot: exactamente **`¿Qué aprendiste la clase pasada?`**.
- `Punto 1`: **`Punto 1: Repaso de la clase pasada`**. En `d1` de la semana 1 conecta con lo que el niño ya sabe; en `d1` de la semana 2 con la semana 1.
- Constantes únicas en el generador (`OPENING`) y la auditoría.

## 4. Espacio de copia: dos líneas

Después de cada `Escribe aquí lo que aprendiste:` van **dos** filas de guiones (40 `_`), no una. Cambia el presupuesto: **5 a 6 Puntos** por clase (7 solo si caben); respuestas de 2–3 líneas, preguntas de 1–2.

## 5. Finanzas (`fin`) — materia 13

Detalle completo: [`docs/homescool-finanzas.md`](../../docs/homescool-finanzas.md).

- **Postura protestante reformada** (soberanía de Dios, mayordomía, vocación, trabajo como servicio a Dios y al prójimo, Escritura como regla) **más los mejores principios de economía** (escasez, costo de oportunidad, intercambio voluntario, valor, ahorro, interés, deuda prudente, producir valor para otros), en lenguaje de 8 años.
- Objetivo: **educación para el trabajo** (finanzas y trabajo al niño).
- **Práctica económica diaria obligatoria** en cada clase: un `Punto N: Práctica económica de hoy` con una acción real que **gana dinero o ahorra dinero** (tareas con pago, venta pequeña, servicio a vecinos, ahorrar en casa, meta de ahorro). Se registra en un `write` del quiz («escribe qué hiciste y cuánto ganaste o ahorraste») y en el dibujo de la banda de imágenes (registro/tabla por completar).
- Citas bíblicas exactas o parafraseadas **sin comillas**; nunca doctrina inventada; no prometer riqueza («teología de la prosperidad» está excluida); el dinero es herramienta, no dueño.
- Metáfora venezolana propia (ver doc de metáforas): semana 1 **El cacao de Chuao**; semana 2 **El puerto de La Guaira**.

## 6. Imagen de la clase

- Cada clase lleva su **indicación de imagen** al final (`lesson.imageBandInstruction`, 4 líneas).
- **Esa indicación es la fuente** del prompt de generación: ver [`homescool-letter-practice-images-v2.mdc`](homescool-letter-practice-images-v2.mdc) (sección «Prompt desde la indicación de la clase»). Una imagen **por clase** (74), no una por materia-semana.
- Nombre: `practice-images/{subj}-c3-w{N}-d{D}-practice.jpg`. Si no existe, se usa la imagen antigua por materia-semana como respaldo.

## 7. Archivo y plataforma

- Las clases `d4`/`d5` (y `pro` `d2`–`d5`) se mueven a `week{N}/archive/{key}-l6.pre-3day-{YYYYMMDD}.eoschool.json` (nunca se borran los respaldos).
- En la plataforma se borran esos materiales solo **después** de subir las 74 nuevas.
- Tras cualquier cambio de conteo: actualizar los tests (`74`, 13 materias), `scripts/build-homescool-curriculum.mjs` y `curriculum.json`.

## Prohibido

- Volver a 5 días o a «¿Qué aprendiste ayer?».
- Una sola línea de copia.
- Clases `fin` sin práctica económica diaria, o con promesas de riqueza.
- Imágenes cuyo prompt no salga de la indicación de la clase.

## v3b — imagen sin metáfora; inglés en inglés

- **Imagen:** `lesson.imageBandInstruction` (y por tanto el prompt de la imagen) se escribe solo con la idea central de la clase. La metáfora venezolana vive en las preguntas y respuestas, nunca en la imagen. Audit: `imageMetaphor` (excepción: `his`).
- **`ing` (Inglés):** se enseña en inglés y espeja el tema de `esp` de la misma semana (w1: grammatical categories / parts of speech; w2: English verb tenses). Marco en inglés generado por `build-homescool-ask-first-v2.mjs`: `What did you learn in the last class?`, `Point 1: Review of the last class`, `Point N: …`, `Write here what you learned:`. Glosa mínima en español solo para términos gramaticales nuevos, entre paréntesis. Audit: `ingSpanish` limita el español residual.

---

# SECCIÓN 2. Método de clase v2 (base Ask First)

Fuente: `.cursor/rules/homescool-class-method-v2.mdc`


# Homescool class method v2 (Letter grid + Ask First + metáfora de Venezuela)

**Canonical for Letter-grid rewrites** (printed sheet / `lesson.slotSequence`).  
Full prose rules: [`docs/specs/009-homescool-narrative-language.md`](../../docs/specs/009-homescool-narrative-language.md).  
**Before writing or regenerating any class, review** [`docs/homescool-venezuela-metaphors.md`](../../docs/homescool-venezuela-metaphors.md) (mirror: `scripts/homescool-venezuela-metaphors.json`, enforced by the audit).

Still authoritative: [`eoschool-method-v1.mdc`](eoschool-method-v1.mdc) (cycle/week/day/level/subject, 12 quiz, `supportUrl`, `memoryPhrase`), [`homescool-letter-grid-v2.mdc`](homescool-letter-grid-v2.mdc) (mm + **156** slots).  
Voice ≈ **8 years** — see [`homescool-narrative-language.mdc`](homescool-narrative-language.mdc).

**Generator:** `scripts/build-homescool-ask-first-v2.mjs` + `scripts/homescool-ask-first-content/{subj}-c3-w{N}.mjs`. Template: `GOLD.example.mjs`.

## Physical layout

One US Letter **v2** sheet = **exactly 156** ContentSlots (52 × 3, column-major). No overflow page.  
Stream: **lesson → quiz (up to 12 items, blank line between them; min 2 MCQ + 1 schematic + 1 reflection) → `imageInstruction` (K lines at col 3 end)**.  
Spare lesson slots become **extra dash rows** in the reflection spaces (never a dead hole before the quiz).

## Sheet rhythm (mandatory)

Every class is **one continuous Ask First narrative** — no «práctica», «error común» or «pregunta final» sections.

### Opening and Punto 1

1. First slot (`opening`): exactly **`¿Qué aprendiste ayer?`** — every day, including day 1.
2. blank → row of dashes (`________________________________________`, 40 underscores) → blank.
3. Heading **`Punto 1: Repaso de ayer`** → blank → 2–4 short lines that connect yesterday with today.  
   Day 1 connects with what the child already knows or with the last class of the previous week.
4. blank → **`Escribe aquí lo que aprendiste:`** → row of dashes → blank.

### Each following idea (Puntos 2…N; 5 to 7 Puntos per class, usually 6)

Exactly 4 steps, **one blank line between blocks**:

1. **Trigger question** (1–2 short lines) that wakes curiosity, set inside the Venezuelan metaphor.
2. blank → **row of dashes** (reflection space) → blank.
3. **`Punto N: Título`** (heading) → blank → answer in 2–4 short lines.
4. blank → **`Escribe aquí lo que aprendiste:`** → row of dashes → blank.

The generator adds the dashes, the blanks and the cue; the content module only carries `q`, `h`, `a`.

## Venezuelan metaphor (mandatory)

- Each subject-week has one landmark (geography or history) from `docs/homescool-venezuela-metaphors.md`.
- It lives **inside the questions and answers**, not as a pasted paragraph.
- Only the **«datos seguros»** of that list; never invent figures, dates or records.
- `teb`/`exe`: the landmark is an image («es como…»), never a theological equivalence.
- New landmark? Add it to the list (with safe facts) and to `scripts/homescool-venezuela-metaphors.json` first.

## Line craft

- One idea per slot; **≤ ~40 characters**. The generator wraps by real Raleway 8 pt widths and never cuts words.
- No markdown (`**`, `##`) in `slotSequence.text`.
- No boilerplate («Sigamos juntos», «Esta clase te ayuda…», «Para cerrar…»).
- Every quiz item answerable from **explicit** sheet text.
- Quiz and image band after the lesson: 8 MCQ + 4 write (2 schematic), image instruction wrapped to ≤ 6 lines.

## Carried from v1

- `memoryPhrase` on esp/ing/lat/his/LT/geo/cie; `supportUrl` every class.
- Subject order: `teb exe LT his geo art mat esp ing lat cie pro`.
- Backup before rewrite: `week{N}/archive/{basename}.pre-askfirst-{YYYYMMDD}.eoschool.json` (never overwritten).
- No upsert / commit / push unless the user asks.

## Checks

`node scripts/audit-homescool-v2-review.mjs` (opening, Punto 1, copy cues, dashes, landmark, quiz) and `go test ./pkg/pdf/...` (no line wider than the 59 mm text box).

## Forbidden

- Opening with anything other than `¿Qué aprendiste ayer?`.
- Theory before the question; answers before the child's reflection row.
- Separate practice / common-mistake / final-question sections.
- Parallel equal-height quiz bands across columns.
- Quiz that needs facts not printed on the sheet.
- A metaphor that is only decoration, or that uses facts not in the list.


---

# SECCIÓN 3. Hoja carta v2 (grid, slots, layout)

Fuente: `.cursor/rules/homescool-letter-grid-v2.mdc`


# Homescool Letter grid v2 (US Letter portrait)

Applies when changing Homescool **print/PDF Letter layout**, header chrome, main-column ruling, images band, or any algorithm that **writes text/ink** into named regions.

## Authority

- **Canonical engine:** `backend/pkg/pdf/homescool_letter_grid.go` (`ComputeHomescoolLetterGrid` → `HomescoolLetterGrid` / `RectMm`).
- Page size: US Letter **215.9 × 279.4 mm** (`EoschoolPageWidthMm` / `EoschoolPageHeightMm`).
- Coordinates: **`x`**, **`top`**, **`w`**, **`h`** in **mm**; **`top`** = distance from **page top** (CSS-style). Bottom edge = `top + h`.
- Sample PDF: `go test ./pkg/pdf -run TestWriteHomescoolLetterGridSamplePDF` → `backend/.data/homescool-letter-grid-sample.pdf`.

When this contract changes, **update this rule and the Go SoT in the same change**.

## Row tracks (vertical)

| Track | mm |
| --- | --- |
| gapTop | 5 |
| Containercabecera1 | 7 |
| gapCabecera | 2 |
| Containercabecera2 | 5 |
| gapCabeceraMain | 2 |
| Containermain | 182 |
| gapMainImages | 2 |
| Containerimages | 70 |

**Sum:** 275 mm.

## Column tracks (horizontal)

| Track | mm |
| --- | --- |
| gapLeft | 5 |
| ContainerHeaderMargin | 15 |
| ContainerCol1 | 48 |
| gapCol1Col2 | 2 |
| ContainerCol2 | 68 |
| gapCol2Col3 | 2 |
| ContainerCol3 | 68 |

**Sum:** 208 mm.

## Chrome and stroke

- Stroke **0.15 mm**, **square corners** (no border radius).
- **Outer borders `#000`:** Containercabecera1/2 sub-boxes, main columns (full rect), Containerimages.
- Interior horizontal rules (when shown): **#ddd**.
- Gaps between header sub-fields and between cabecera rows: **2 mm**.

## Main column ruling (no gutter boxes)

Main columns keep **52 slots × 3.5 mm** for packing — **no** line-number / question-marker squares.

- **Outer column border:** always stroked **#000** 0.15 mm (full rect).
- **Visible interior rules (toggle):** `HCLetterShowMainRules` in `homescool_letter_grid.go`. Default **`false`** — interior #ddd rules hidden; outer border stays. Set **`true`** to show full-width #ddd rules (0.15 mm) again.
- **Interior padding:** text/ink is inset **2 mm** left and right from the column border (`HCLetterMainTextPadMm`). Text width = column width - 4 mm (63 mm -> **59 mm**). Every lesson/quiz line must fit that width on one line; `TestHomescoolPublishedClassesFitColumns` guards it.
- **Header padding and labels:** every header field has **2 mm** lateral padding (`HCLetterHeaderTextPadMm`). Cabecera 2 labels are write-in fields and end with a colon: `Fecha:`, `Estudiante:`, `Revisor:`, `Firma:`.
- **Corner radius:** every stroked box (header fields, main columns, images band) has a **1 mm** radius (`HCLetterBorderRadiusMm`); the practice JPEG is clipped to the same rounded path.
- **Quiz spacing:** one blank line between quiz questions (skipped at the top of a column). If the quiz does not fit with those gaps, questions are dropped (q8, q7, w2, w4, q6, q5, q4, q3 in that order), never below **2 selection + 1 schematic + 1 written reflection**. `quiz.questionCount` equals the questions kept.
- **Vertical padding:** **2 mm** top and bottom inside each main column (`HCLetterMainTextPadYMm`). The 52 lines / 156 slots stay; the row pitch compresses from 3.5 mm to (182 - 4) / 52 ≈ **3.42 mm**.
- Quiz rows are marked by content + the darker **quiz separator** above the first question in a column (separator stays visible even when main rules are hidden).
- JSON may still carry optional `gutter` metadata on `question` slots for tooling; PDF/print **ignore** it.

## Text alignment contract (writers / packers)

Use the **`{ x, top, w, h }`** boxes below as the **only** placement targets.

| Region | Horizontal | Vertical |
| --- | --- | --- |
| **Containercabecera1** sub-boxes (`SignatureName`, `SignatureTopic`, `SheetCode`) | **left** | **middle** (centred in the 7 mm row height) |
| **Containercabecera2** sub-boxes (`Date`, `Student`, `Reviewer`, `ReviewerSignature`) | **left** | **middle** (centred in the 5 mm row height) |
| **Main** content slot (per line, column width minus 2 mm padding each side) | **left** | **middle** (centred in the 3.5 mm row band) |
| **Containerimages** | practice JPEG fit | centred in band; the **#000 border is stroked after the image** so it stays visible |

PDF: baseline from vertical middle of the target `h`. HTML/print mirror: `display: flex; align-items: center; justify-content: flex-start` (or equivalent) inside each target rect.

Optional symmetric **text inset** from box edges: **0.5 mm** when stroke clipping is needed; default is flush to the logical box above.

**Type size (PDF SoT):** minimum **8 pt** for body (`hcLetterContentFontPt`), header (`hcLetterHeaderFontPt`), and images-band instruction (`hcLetterImagesFontPt`). Do not ship Letter ink below 8 pt.

---

## Resolved boxes — Containercabecera1 (top = 5 mm, row height 7 mm)

| Field | x | top | w | h |
| --- | --- | --- | --- | --- |
| SignatureName | 20 | 5 | 45 | 7 |
| SignatureTopic | 67 | 5 | 98 | 7 |
| SheetCode | 167 | 5 | 41 | 7 |

Gaps between fields: **2 mm** (not drawable; e.g. SignatureName ends at x=65, next field starts at 67).

## Resolved boxes — Containercabecera2 (top = 14 mm, row height 5 mm)

| Field | x | top | w | h |
| --- | --- | --- | --- | --- |
| Date | 20 | 14 | 23 | 5 |
| Student | 45 | 14 | 70 | 5 |
| Reviewer | 117 | 14 | 70 | 5 |
| ReviewerSignature | 189 | 14 | 19 | 5 |

---

## Resolved boxes — Containermain (top = 21 mm, height 182 mm)

| Field | x | top | w | h |
| --- | --- | --- | --- | --- |
| MainCol1 | 5 | 21 | 63 | 182 |
| MainCol2 | 70 | 21 | 68 | 182 |
| MainCol3 | 140 | 21 | 68 | 182 |

**Ruling step:** **3.5 mm** (`HCLetterRuleStepMm`). Rule colour **#ddd**.

**Line count:** `floor(182 / 3.5)` = **52** rows per column → **156** slots sheet-wide (52 × 3).

### Per-line geometry (column `MainColN`, line index `i` = 1…52)

Let `M` = the column’s `{ x, top, w, h }` above. Row band:

- `rowTop = M.top + (i - 1) × 3.5`
- **ContentSlot** (lesson / quiz ink): `x = M.x`, `top = rowTop`, `w = M.w`, `h = 3.5` — **left + middle**; full column width (no gutter).
- **Section headings** (`kind: "heading"`): **bold** ink (PDF `F2` / Helvetica-Bold).
- **Quiz block:** one `question` row + **four** following rows (`option` for mcq, empty `answerLine` for write/schematic — **no** dotted filler). Separate questions with one `blank`. MCQ options print as `A) …` … `D) …`.
- **Heading band:** one `blank` on the line **before** the heading and one `blank` on the line **after**.
- **Cabecera1 SignatureName:** print the **subject display name** (e.g. `Español`), not the literal «Materia».
- **Quiz separator:** when a column’s first `question` row is reached after lesson text, PDF draws a **darker full-column rule** (`HCLetterQuizSeparatorStrokeMm` ≈ 0.35 mm, near-black) on that row’s **top** edge.
- **Fill order (column-major, mandatory):** fill **all 52 lines of col 1**, then **all 52 of col 2**, then **all 52 of col 3**. Content stream: **lesson → quiz (60) → `imageInstruction` (K lines at col 3 end)**. **Forbidden:** parallel “section heights” that start the quiz at the same line in every column, or splitting lesson/quiz by equal vertical bands across columns.
- **Col 3 tail:** `imageInstruction` slots (one or more lines) carry `lesson.imageBandInstruction`; not only line 52.

| Column | ContentSlot x | ContentSlot w | ContentSlot h |
| --- | --- | --- | --- |
| MainCol1 | 5 | 63 | 3.5 |
| MainCol2 | 70 | 68 | 3.5 |
| MainCol3 | 140 | 68 | 3.5 |

Packing key (future): `(MainCol1|MainCol2|MainCol3, lineIndex 1…52)` → one ContentSlot rect.

---

## Resolved box — Containerimages

| Field | x | top | w | h |
| --- | --- | --- | --- | --- |
| Containerimages | 5 | 205 | 203 | 70 |

Spans **ContainerHeaderMargin** through **ContainerCol3**. Image/content placement inside this rect is **TBD**; algorithms must treat **`203 × 70 mm`** at **`(5, 205)`** as the reserved band until subdivided.

---

## Algorithm checklist

1. Call **`ComputeHomescoolLetterGrid()`** (or read the tables above) — do not re-derive from tracks by hand in scattered code.
2. Map header strings into the seven cabecera **`RectMm`** fields; align **left + middle** in each box.
3. Map lesson/quiz atoms into **ContentSlot** rects (156 max per sheet) in **column-major** order: col1 lines 1→52, then col2, then col3. Lesson first, then quiz, then col3 `imageInstruction` tail.
4. Map practice JPEG into **Containerimages** (203×70 mm).
4b. **Copy space (v3):** every `Escribe aquí lo que aprendiste:` is followed by **two** dash rows (40 `_` each), not one. Opening is `¿Qué aprendiste la clase pasada?` (see `homescool-class-method-v3.mdc`).
5. Any new subdivisions (e.g. splitting the images band) require updating **this rule**, tests in `homescool_letter_grid_test.go`, and `homescool_letter_grid.go`.

## Forbidden

- Rounded corners on grid containers.
- Changing track mm or sub-field widths without updating this rule and Go SoT.
- Hard-coded slot counts other than **52 / column** and **156 / sheet** unless `Containermain` height or `HCLetterRuleStepMm` changes.
- Drawing line-number or question-marker **gutter boxes** in main columns.
- Removing the **#000** outer borders on cabecera, main columns, or Containerimages.
- Parallel geometry in FE/PDF that disagrees with `ComputeHomescoolLetterGrid`.
- Equal-height lesson/quiz bands across columns (quiz starting at the same line in col 1/2/3). Use sequential column fill only.


---

# SECCIÓN 4. Imágenes de práctica v2

Fuente: `.cursor/rules/homescool-letter-practice-images-v2.mdc`


# Homescool practice images — Letter grid v2 band

Applies when **creating or replacing** week practice JPGs that print in the **images band** of the v2 Letter sheet.

## Geometry (SoT)

From [`.cursor/rules/homescool-letter-grid-v2.mdc`](homescool-letter-grid-v2.mdc):

| Field | x (mm) | top (mm) | w (mm) | h (mm) |
| --- | --- | --- | --- | --- |
| **Containerimages** | 5 | 205 | **203** | **70** |

- **Aspect ratio (width ÷ height):** `203 / 70` ≈ **2.9 : 1** (landscape inside the band).
- **Safe area:** full **203 × 70 mm** rect; keep important ink **≥ 2 mm** inside edges (stroke / trim).
- Do **not** assume the old full-width practice sheet or 0.5 cm margin page layout for image sizing.

## Export targets (raster)

| DPI | Width × height (px) | Notes |
| --- | --- | --- |
| **300** (print) | **2398 × 827** | `round(mm / 25.4 × dpi)` |
| **150** (draft) | **1199 × 414** | Half-res previews |

Format: **JPEG**, sRGB, **no** embedded text the child must read (labels OK only if part of the worksheet art). Line art / workbook style; white or very light ground; **no** solid ink-wasting fills (align with `homescool-materials.mdc` print palette).

## File layout (unchanged paths)

- Directory: `frontend/public/homescool/media/week{N}/practice-images/`
- Filename: `{subject}-c3-w{N}-practice.jpg`  
  Example: `mat-c3-w2-practice.jpg`
- `subject` ∈ `mat`, `esp`, `ing`, `his`, `lat`, `LT`, `geo`, `cie`, `art`, `pro`, `teb`, `exe` (case as today).
- Alt / creative brief: `QUIZ_PRACTICE_ALTS` in `frontend/src/lib/homescool-eoschool.ts` (update alt when the scene changes).

Optional per-cell override: `media[]` entry with id **`quiz-practice`** pointing at the same path (see `quizPracticeImage()`).

## Regeneration checklist

1. Read **week + subject** alt line from `QUIZ_PRACTICE_ALTS[week][subject]`.
2. Generate at **2398 × 827** (or vector export then rasterize to that size).
3. Replace JPG in `practice-images/`; keep filename.
4. Spot-check in sample PDF / print preview that the image **fits the 203 × 70 mm band** without clipping (FE/PDF wiring may lag grid v2 — still size assets to this band).
5. Do **not** delete prior art without a backup copy (see class v2 upsert rule).

## v3 — una imagen por clase, prompt desde la indicación de la clase

Con el método v3 ([`homescool-class-method-v3.mdc`](homescool-class-method-v3.mdc)) **cada clase** (74 en semanas 1–2) tiene su propia imagen:

- Archivo: `practice-images/{subj}-c3-w{N}-d{D}-practice.jpg` (`pro`: solo `d1`). El archivo antiguo `{subj}-c3-w{N}-practice.jpg` queda como respaldo si falta el de la clase.
- **Fuente única del prompt:** `lesson.imageBandInstruction` del JSON de la clase (las mismas 4 líneas impresas al final de la hoja, 3.ª columna). No se inventa otra escena: lo que dice la hoja es lo que se dibuja.
- Generar la lista de prompts: `node scripts/build-homescool-image-prompts.mjs` → `docs/homescool-image-prompts.md` y `.json` (uno por clase). El agente de imágenes usa esa lista tal cual.

### Plantilla del prompt (se llena con datos de la clase)

```
Ilustración de hoja de trabajo infantil (niño de 8 años), arte lineal en blanco y negro sobre fondo blanco, trazo limpio y uniforme, sin rellenos sólidos de tinta, sin sombreados oscuros, sin texto que el niño deba leer (solo rótulos cortos si la indicación los pide, en el mismo idioma que la indicación, letra imprenta grande).
Formato: horizontal 203 × 70 mm (relación 2.9 : 1), 2398 × 827 px, JPEG sRGB; contenido importante a ≥ 2 mm de los bordes.
Materia: {materia}. Tema de la clase: {título}.
Debe mostrar exactamente lo que pide la indicación de la hoja:
«{imageBandInstruction}»
Deja vacíos (con cajas, líneas punteadas o círculos) los espacios que el niño completará dibujando o escribiendo.
Ilustra únicamente el tema de la clase tal como lo pide la indicación. No añadas metáforas, paisajes ni lugares emblemáticos que no estén en la indicación.
Sin marcas de agua, sin firmas, sin personas reales identificables.
```

- **La metáfora venezolana NO va en la imagen** (v3b): la metáfora explica en las preguntas y respuestas; la imagen sale solo de la idea central de la clase. `lesson.imageBandInstruction` no puede nombrar el hito (el audit lo exige, `imageMetaphor`; solo `his` queda exenta).
- `ing`: la indicación y los rótulos van en inglés.
- Materias de fe (`teb`, `exe`): imagen sobria, sin representar a Dios; solo símbolos, mapas, líneas de tiempo o manuscritos.
- `fin`: la imagen es un **registro por completar** (tabla de ganancias/ahorros, frascos de dar-ahorrar-gastar, libreta), nunca fajos de dinero llamativos.
- `mat`: solo la cuadrícula/matriz que pide la hoja, con números correctos si aparecen.

## Forbidden

- Wrong aspect (square, portrait, or pre-v2 full-page practice dimensions).
- New filenames that break `quizPracticeImage()` convention unless `media[]` is updated.
- Text-heavy posters instead of drawable / traceable worksheet art.


---

# SECCIÓN 5. Lenguaje narrativo

Fuente: `.cursor/rules/homescool-narrative-language.mdc`


# Homescool narrative language

When authoring or revising **Homescool** `.eoschool` JSON (level **6**, ≈ **8 years**), follow:

**[`docs/specs/009-homescool-narrative-language.md`](../../docs/specs/009-homescool-narrative-language.md)**

and **always review the landmark list first:**

**[`docs/homescool-venezuela-metaphors.md`](../../docs/homescool-venezuela-metaphors.md)** (machine mirror: `scripts/homescool-venezuela-metaphors.json`).

Also keep [`METHOD_V1.md`](../../frontend/public/skills/eoschool/METHOD_V1.md) pedagogy (cycle/week/day/level/subject, quiz counts, dual storage) and [`homescool-class-method-v2.mdc`](homescool-class-method-v2.mdc) for the **Letter grid v2** printed sheet.

## Role

Pedagogical designer for primary education (8-year-olds). Natural, inductive narrative in the **Ask First** method; each class tied to **one landmark of Venezuelan geography or history** as the central metaphor.

## The rules (short form)

1. **Ask First, 4 steps per idea:** trigger question → reflection row of dashes (`________________________________________`) → `Punto N: Título` + answer in 2–4 short lines → `Escribe aquí lo que aprendiste:` + row of dashes.
2. **No** separate «práctica», «error común» or «pregunta final» sections. One continuous cycle.
3. **Opening:** exactly `¿Qué aprendiste ayer?`. **Punto 1 = «Repaso de ayer»** (connects yesterday with today).
4. **Layout:** one idea per short line (≤ ~40 characters); exactly one blank line between blocks; 5–7 Puntos.
5. **Metaphor:** the subject-week's landmark from the list, woven into questions and answers; only its «datos seguros».

## Non-negotiables (all surfaces)

- Voice ≈ 8 years; short complete sentences; gloss school terms on first use.
- **Never** the forbidden boilerplate in spec 009 (including «Antes de terminar, un aviso», «Esta clase te ayuda a aprender…», `Respuesta:` on MCQ choices).
- Adapt quizzes by **replacing** questions, not only prefixes.
- Faith subjects: the landmark is an image («es como…»), never a theological equivalence.
- After cell edits for publish: `node scripts/build-homescool-curriculum.mjs` only when the user asks.


---

# SECCIÓN 6. Materiales Homescool

Fuente: `.cursor/rules/homescool-materials.mdc`


# Homescool materials

**METHOD_V1 is authoritative** for new content: [`.cursor/rules/eoschool-method-v1.mdc`](eoschool-method-v1.mdc) and `skills/eoschool/METHOD_V1.md`.

**Letter grid v2 (mm tracks, 156 main line slots):** [`.cursor/rules/homescool-letter-grid-v2.mdc`](homescool-letter-grid-v2.mdc) — PDF SoT `backend/pkg/pdf/homescool_letter_grid.go`; lesson/quiz slot packing still TBD.

**Practice images v2 (203×70 mm band):** [`.cursor/rules/homescool-letter-practice-images-v2.mdc`](homescool-letter-practice-images-v2.mdc) — prompt: [`.cursor/skills/eoschool/PROMPT_REGENERATE_PRACTICE_IMAGES_V2.md`](../skills/eoschool/PROMPT_REGENERATE_PRACTICE_IMAGES_V2.md).

**Class method v2 (pregunta → Repaso → 3 cols; backup pre-upsert):** [`.cursor/rules/homescool-class-method-v2.mdc`](homescool-class-method-v2.mdc) — prompt: [`.cursor/skills/eoschool/PROMPT_REWRITE_CLASSES_V2.md`](../skills/eoschool/PROMPT_REWRITE_CLASSES_V2.md).

New materials are `.eoschool` JSON (not free-form HTML). Level 6 only. DHS navigation: cycle → week → day → subject → Print. Stage = stacked US Letter portrait pages (**0.5 cm** margin via `--hc-page-margin`); backend PDF matches.

**Kid clarity (authoring):** two-column lesson stack; day 2–4 `weekRecap` / day 3–4 `priorDayRecap`; `memoryPhrase` on esp/ing/lat/his/LT/geo/cie; `supportUrl` video on **every** class; `##` + `**bold**` screening; extra examples on language subjects. See `eoschool-method-v1.mdc` § Kid clarity.

## Letter pagination (mandatory — no empty pages)

- Never emit a Letter page that is only the hero/header with no lesson, quiz, support, or expo content. Renderer must drop hero-only shells (`isHeroOnlyEmptyPage`).
- Pack lesson blocks and quiz items to **fill** the usable Letter area before opening a new page (DOM measure when available) — `packQuizQuestions` / combo packing.
- Day 5: review class + **expo prep** content on the **same** sheet — not a separate expo page. On **Letter grid v2**, pack expo lines in the **column-major** stream (no reserved vertical band / section heights from older Letter packing).
- Drawings: blank draw workspace only when Práctica text matches `practiceNeedsDraw` (dibuja/traza/bosqueja/colorea/pinta / draw/sketch/trace).
- Minimum body font on Letter sheets: **0.6 cm (6 mm)**. Practice boxes include a **0.75 cm** outline check circle and a reverse-side hint («Si hace falta, completa la práctica en el reverso de la hoja»).
- MCQ choices: **seeded shuffle at print/render** so the correct answer is not always printed as A.
- Subject menu / class number order: `teb exe LT his geo art mat esp ing lat cie pro` (1–12).
- DHS Print tray modes: current class · current class all days · current day all subjects · all subjects all week days.
- Admin-only `supportUrl` input above the stage; when set, emit a first “Apoyo” Letter section/page.

## Letter sheet print style (mandatory)

Ink-saving style for **class, quiz, and math (mat)** US Letter sheets in `frontend/src/styles/homescool-workspace.css` (`.homescool-letter-page*`, `.homescool-mat__*`):

- **Brand palette only** (hex): `#ec7004` orange · `#fff1a8` cream · `#84754f` olive · `#5092b3` blue · `#143050` navy.
- **No filled color backgrounds** on heroes, points, boxes, ribbons, summary, columns, quiz cards, mat header/task/rows/tables/levels — use `background: transparent` (page ground stays white).
- **Color via borders and text** only (and outline badges/marks). Cycle accents: blue / navy / olive / orange.
- Do **not** reintroduce pastel fills, gradients, or solid color blocks for print sheets — they waste ink and break the product look.
- Tokens on `.homescool-letter-page`: `--hc-orange`, `--hc-cream`, `--hc-olive`, `--hc-blue`, `--hc-navy` (aliases `--hc-ink`, `--hc-rail`, `--hc-coral`, `--hc-teal`).
- Tokens on `.homescool-letter-page--mat`: `--mat-orange`, `--mat-cream`, `--mat-olive`, `--mat-blue`, `--mat-navy` (aliases `--mat-ink`, `--mat-rail`, `--mat-coral`).

## Legacy HTML notes

Older HTML seed/sheets may still exist. Do not author new level-6 week content as HTML. Legacy class patterns (quiz grids, map pages) remain in MATERIALS/TEMPLATES for reference only.


---

# SECCIÓN 7. BRIEF para el escritor (formato de módulos .mjs)

Fuente: `scripts/homescool-ask-first-content/BRIEF.md`

# BRIEF v3 — clases Homescool (ciclo 3, nivel 6): Ask First + metáfora de Venezuela, **3 días por materia**

Workspace: `C:\Users\eduar\Documents\work\int\eduardoos_services\eduardoos.com` (Windows/PowerShell, Node).
Redacta en **español** (salvo lo propio de `ing`/`lat`, ver abajo). No hagas commit, push, upsert ni build del sitio. No abras navegador.
Escribe los módulos con la herramienta de escritura de archivos (UTF-8), **no** con scripts por stdin (se rompen las tildes).

## Qué cambió en v3 (léelo: contradice al brief anterior)

Regla canónica: `.cursor/rules/homescool-class-method-v3.mdc`.

1. **3 días por semana** (`d1`, `d2`, `d3`), no 5. El módulo exporta un arreglo de **3 clases** (`d1..d3`). **`pro` = 1 clase** (`d1`) por semana. **`fin` (finanzas) es materia nueva**, 3 clases.
2. **Enfoque progresivo** con el mismo tema y nivel: d1 = panorama; d2 = una parte, más de cerca; d3 = la parte más enfocada + aplicar/contar lo aprendido (cierra la semana: hace de repaso y exposición). El hito venezolano y los hechos de la semana se conservan; **reparte** en 3 días lo que antes iba en 5 (d1 ≈ viejo d1 + panorama; d2 ≈ viejo d2–d3; d3 ≈ viejo d4–d5). Nada de temas nuevos. Nada de datos nuevos sin verificar.
3. **Apertura**: la materia no se ve a diario. El generador pone **`¿Qué aprendiste la clase pasada?`** y tu `units[0]` es **`Punto 1: Repaso de la clase pasada`** (no «ayer»).
4. **Dos líneas de guiones** después de cada `Escribe aquí lo que aprendiste:` (las pone el generador). Eso cuesta una línea más por Punto: escribe **5 a 6 Puntos** (7 solo si caben), respuestas de **2–3 líneas**, preguntas de 1–2.
5. **Imagen** (`image`, 4 líneas): es la **fuente exacta del prompt** que usará el agente de imágenes. Escríbela como una instrucción de dibujo/rotulado completa y concreta (qué se ve, qué rotular, qué deja vacío el niño para completar), pensando que de ahí sale la ilustración.

## Qué debes hacer

Para tu materia y semana (`SUBJECT`, `N`), reescribir el módulo
`scripts/homescool-ask-first-content/{SUBJECT}-c3-w{N}.mjs` (export default = arreglo de 3 clases `d1..d3`; `pro`: 1 clase) y correr el generador:

```
node scripts/build-homescool-ask-first-v2.mjs scripts/homescool-ask-first-content/{SUBJECT}-c3-w{N}.mjs --dry   # primero
node scripts/build-homescool-ask-first-v2.mjs scripts/homescool-ask-first-content/{SUBJECT}-c3-w{N}.mjs         # luego, real
```

Debe imprimir `withProblems: 0` (sin `OVERFLOW`, `LONG`, `IMAGE`, `DAY>3`). Corre **desde la raíz del repo con ruta relativa**. No modifiques el generador ni otros archivos fuera de tu módulo y tus JSON vivos
(`frontend/public/homescool/media/week{N}/{SUBJECT}-c3-w{N}-d{D}-l6.eoschool.json`, D = 1..3). **No toques los `d4`/`d5`** (otro paso los archiva). Nunca borres respaldos. Si el generador tiene un bug, repórtalo, no lo arregles.

## Lee primero (en este orden)

1. **`scripts/homescool-ask-first-content/GOLD.example.mjs`** — la forma, el tono y el ritmo. Imítalo.
2. **`docs/homescool-venezuela-metaphors.md`** — tu hito asignado y sus **datos seguros** (también en `scripts/homescool-venezuela-metaphors.json`). Para `fin`: `docs/homescool-finanzas.md`.
3. `.cursor/rules/homescool-class-method-v3.mdc` y `docs/specs/009-homescool-narrative-language.md`.
4. **Tu fuente de hechos**: el módulo de 5 días de tu materia-semana en `scripts/homescool-ask-first-content/archive-v2-5day-20261003/{SUBJECT}-c3-w{N}.mjs`, y los JSON vivos de d1..d3 (los `d4`/`d5` viejos ya están en `week{N}/archive/{key}-l6.pre-3day-20261003.eoschool.json`; `pro` d2–d5 también) (título, `mppe.objectives`, `lesson.memoryPhrase`, `weekRecap`, `locale`, `supportUrl`). `fin` no tiene fuente previa: sigue `docs/homescool-finanzas.md`.
   Matemática: verifica cada cuenta. Latín: cada forma. Historia/geografía/ciencias/teología: hechos correctos; citas bíblicas exactas o parafraseadas sin comillas.

## Campos opcionales por clase (úsalos si el día cambió de tema)

El JSON vivo conserva título, `mppe`, `supportUrl`, `memoryPhrase`… Si al repartir en 3 días el tema de un día cambia, añade a la clase: `title: "..."` (título nuevo del día), `mppe: [{ id, label }]` (solo si cambias el objetivo; conserva los ids del JSON vivo si reutilizas uno), `memoryPhrase: "..."`.
Para `fin` (clase nueva) **`title` y `mppe` son obligatorios** (ver `docs/homescool-finanzas.md`).

## Las reglas (obligatorias)

1. **Ask First, 4 pasos por idea:** pregunta activadora → espacio de reflexión (guiones) → `Punto N: Título` + respuesta en 2–3 líneas cortas → `Escribe aquí lo que aprendiste:` + **dos** líneas de guiones. **El generador pone los guiones, los blancos y la frase de copia**: tú solo escribes `q`, `h`, `a`. No escribas líneas vacías ni `____`.
2. **Nunca** secciones aparte de práctica, error común o pregunta final: todo fluye en el mismo ciclo (usa «Una pregunta con truco: …»). Excepción `fin`: lleva un Punto llamado **`Práctica económica de hoy`** (es parte del ciclo, no una sección aparte).
3. **`units[0]` es siempre `Punto 1: Repaso de la clase pasada`** (sin `q`). d2/d3: repasa de verdad lo de la clase anterior (mismo hito, parte distinta). d1: repasa lo que el niño ya sabe (semana 1) o el cierre de la semana 1 (semana 2).
4. **5 a 6 Puntos por clase** (7 solo si caben). `units[1..]` llevan `q` (1–2 líneas), `h: "Punto N: título"` (numeración 1,2,3…), `a` (2–3 líneas).
5. **Una idea por línea, ≤ 40 caracteres** (el generador reenvuelve por palabras si te pasas; aún así escribe líneas cortas y no termines una línea en «el», «de», «y»…). Aplica a `q`, `h`, `a`, quiz e `image`.
6. **Metáfora venezolana:** tu hito asignado va **dentro** de las preguntas y respuestas (orgánicamente, en casi todos los Puntos). Usa **solo** los datos seguros; no inventes cifras, fechas ni récords. Los 3 días comparten el hito, cada día con una parte/imagen distinta. Nombra el hito por su nombre (el audit lo exige). En `teb`/`exe` el hito es una imagen («es como…»), nunca una equivalencia teológica.
7. Voz de 8 años: oraciones cortas completas, explica cada término escolar nuevo con palabras de niño la primera vez. Varía cómo abres las preguntas. Nada de etiquetas (`Idea central:`, `Explora:`, `Práctica:`, `Error común:`), nada de markdown, nada de relleno, nada de `Respuesta:`.
8. Si `lesson.memoryPhrase` existe (esp/ing/lat/his/LT/geo/cie), la frase (o su contenido) aparece **textualmente en alguna `a`** (d1 y d3 preferible).
9. **d3 cierra la semana** con sustancia: recuerdan, ordenan, aplican y practican cómo contarlo, sin quedarse en eslóganes.
10. **Presupuesto:** la lección cabe en ~85 líneas. Un Punto con q=2, a=3 ocupa ~15 líneas (con las dos líneas de copia). Si dice `OVERFLOW`, recorta líneas o baja un Punto (mínimo 5).
11. **Cada pregunta del quiz se responde con texto explícito de la hoja.**

## Forma del objeto

```js
{
  key: "{SUBJECT}-c3-w{N}-d{D}",         // "LT" se escribe "LT-c3-w1-d2"; D = 1..3
  // title / mppe / memoryPhrase opcionales (obligatorios title+mppe en fin)
  units: [
    { h: "Punto 1: Repaso de la clase pasada", a: ["…","…","…"] },
    { q: ["…","…"], h: "Punto 2: título", a: ["…","…","…"] },
    …
  ],
  quiz: { mcq: [{ q, o: [correcta, mala, mala, mala] } x8], write: [2 textos], schematic: [2 textos] },
  image: [4 líneas],
  summary: "1–2 frases que el niño pueda contar",
}
```

## Quiz (hasta 12 ítems; el generador quita las últimas si no caben los espacios entre preguntas, y siempre deja 2 selección + 1 esquema + 1 reflexión)

- `mcq` ×8: `o[0]` = correcta (el generador rota la posición). Pregunta **autosuficiente**, de una línea (≤ ~40 caracteres, si pasa el generador la envuelve), **sin** pronombres sueltos («esa forma», «ese cuento»): cita la frase o el objeto («En «Leía cuando sonó»…»). **Sin** «Elige la respuesta correcta.». Opciones cortas (≤ ~36 caracteres).
- `write` ×2 y `schematic` ×2: instrucciones cortas, ligadas a la clase.
- Matemática: cuentas correctas y opciones distintas.

## image (4 líneas, ≤ 40 caracteres cada una; el generador las une en un párrafo en negrita, máx. 6 líneas)

Qué dibujar/rotular hoy para practicar lo aprendido; concreta, completa y ligada a la clase (puede dibujarse el hito). Es el texto del que sale el prompt de la imagen: que describa la escena, los rótulos y lo que queda en blanco para el niño.

## Idioma

- Materias en español: todo en español (comillas angulares «…», tildes y ¿? correctas).
- `ing`: explicaciones en español sencillo, ejemplos en inglés; lee su `locale`. La apertura, `Punto N:` y `Escribe aquí lo que aprendiste:` siguen en español.
- `lat`: explicaciones en español, formas latinas correctas.

## Verificación antes de reportar

1. El generador real imprimió `withProblems: 0`.
2. `node scripts/audit-homescool-v2-review.mjs --only {SUBJECT}-c3-w{N}` → `filesWithAnyIssue: 0` (filtra solo tus archivos; los `d4`/`d5` viejos ya están archivados).
3. Relee una clase impresa (`lesson.slotSequence`): suena a maestro hablando a un niño de 8 años; cada pregunta se responde justo debajo; el hito aparece natural; el quiz sale de lo escrito; d1→d2→d3 se van enfocando.

## Qué devolver

Respuesta breve en español: módulo creado, salida del generador (`withProblems`), si el audit dio 0, y cualquier dato dudoso que dejaste fuera. No pegues el contenido completo.

## v3b — dos cambios (obligatorios, mandan sobre lo anterior)

### A. La imagen NO lleva la metáfora
La metáfora venezolana vive solo en las preguntas y respuestas de la clase. La **imagen** (`image`, 4 líneas = `imageBandInstruction`, y de ahí sale el prompt del generador de imágenes) se escribe **solo con la idea central / el tema de la clase** (lo que se explica: p. ej. las cuatro piezas de OiLS, la matriz 7 × 8, el esqueleto, las categorías gramaticales), como ilustración que **explica y genera actividad** (dibujar, rotular, completar, ordenar). Prohibido que la imagen mencione o dibuje el hito (Médanos, Orinoco, Roques, Morrocoy, Chuao, La Guaira, cueva, puente, laguna, etc.) ni lugares venezolanos que no sean el tema de la materia. El audit lo exige (`imageMetaphor`; sólo `his` queda exenta porque sus lugares son el tema).
Una buena `image`: concreta, completa, 4 líneas ≤ 40 caracteres, dice qué se ve, qué se rotula y qué deja vacío el niño para completar.

### B. Inglés (`ing`) se enseña EN INGLÉS y espeja a Español
`ing` ya no enseña español ni mezcla idiomas: cada clase de `ing` es **el mismo tema que `esp` de esa semana, estudiado en su equivalente en inglés**, escrita en inglés sencillo para un niño de 8 años hispanohablante.
- Semana 1: esp = las nueve clases de palabras. `ing` = **the grammatical categories in English (parts of speech)**: noun, pronoun, verb, adjective, adverb, preposition, conjunction, interjection, y los artículos *a / an / the* (que muchos gramáticos llaman *determiners*). Cuenta con honestidad cuántas son en inglés y dilo en la clase (8 partes de la oración + los artículos = 9 grupos en esta clase). Ejemplos y oraciones en inglés.
- Semana 2: esp = los tiempos del verbo (una palabra / dos palabras con haber). `ing` = **English verb tenses**: simple present, simple past (*I sang*), simple future (*I will sing*), past continuous (*I was singing*), present perfect (*I have sung*, *have/has + past participle*). Reparte d1 panorama, d2 cada tiempo de cerca, d3 elegir el tiempo con pistas (*yesterday, already, now*) y contarlo.
- **Todo en inglés**: preguntas, respuestas, quiz, `image`, `summary`, `memoryPhrase`, `title` y `mppe` (cambia los `label` de `mppe` y `title` a lo que ahora se enseña; conserva los `id`). Un término gramatical nuevo puede llevar una glosa mínima en español entre paréntesis la primera vez (p. ej. *noun (sustantivo)*), nada más. Oraciones cortas, vocabulario de 8 años.
- El generador pone el marco en inglés para `ing`: `What did you learn in the last class?`, `Write here what you learned:`. Tú escribe los encabezados como `Point 1: Review of the last class`, `Point 2: …`, … (**`Point`**, no `Punto`).
- El hito (Ávila en w1, Teleférico de Mérida en w2) sigue siendo la metáfora explicativa y se nombra en las preguntas/respuestas (en inglés: *Mount Ávila*, *Mérida cable car*), pero **no va en la imagen**.
- Fuente de ideas del tema: `scripts/homescool-ask-first-content/esp-c3-w{N}.mjs` (mismo reparto d1/d2/d3). No traduzcas: reescribe como una clase de inglés auténtica.

---

# SECCIÓN 8. Metáforas venezolanas por materia y semana

Fuente: `docs/homescool-venezuela-metaphors.md`

# Homescool — metáforas de Venezuela (lista maestra)

**Revisar SIEMPRE antes de escribir, reescribir o regenerar cualquier clase Homescool.**
Regla: [`homescool-narrative-language.mdc`](../.cursor/rules/homescool-narrative-language.mdc).
Método: [`homescool-class-method-v2.mdc`](../.cursor/rules/homescool-class-method-v2.mdc).

Cada **materia-semana** usa **un hito de la geografía o la historia de Venezuela** como metáfora central.
La metáfora aparece de forma orgánica en las preguntas y en las respuestas (no es un adorno ni un párrafo aparte).
Los 5 días de la misma materia-semana comparten el hito; cada día puede usar una parte distinta de él.

## Reglas de uso

1. Una metáfora por materia-semana. No repetir el mismo hito en dos materias de la **misma** semana.
2. La metáfora sirve a la idea de la clase: si no explica nada, se cambia por otra de esta lista.
3. Solo se afirman los **datos seguros** de abajo. Nada de cifras, fechas ni récords que no estén aquí.
   Si hace falta un dato nuevo, primero se verifica y se agrega a esta lista.
4. Tono de 8 años: imágenes concretas (agua, arena, trueno, puente), nunca discurso patriótico ni lista de datos.
5. Para clases de fe (`teb`, `exe`) la metáfora es una **imagen que ayuda a entender**, nunca una equivalencia
   teológica ("es como…", no "es lo mismo que…").
6. Si se agrega un hito, se anota aquí con sus datos seguros y se marca dónde se usó.

## Asignación actual (ciclo 3, semanas 1 y 2)

| Materia | Semana 1 — tema | Hito (S1) | Semana 2 — tema | Hito (S2) |
| --- | --- | --- | --- | --- |
| `art` | Dibujar con OiLS: formas sencillas | Los Médanos de Coro | Dibujos espejo paso a paso | Laguna de Mucubají |
| `cie` | Los cuatro tejidos del cuerpo | Relámpago del Catatumbo | Huesos que cuidan tu cuerpo | Cerro Autana |
| `esp` | Las nueve clases de palabras | Sierra Nevada de Mérida | El verbo cuenta cuándo pasa algo | Cumaná, la ciudad fundada en 1515 |
| `exe` | Leer con cuidado Romanos 1:1 | Cueva del Guácharo | Romanos 1:2, buena noticia prometida | Del 5 de julio de 1811 a Carabobo |
| `geo` | Venezuela: fronteras, límites y regiones | Monte Roraima | Cuatro estados y sus capitales | La Gran Sabana |
| `his` | Los primeros pueblos de Venezuela | Palafitos de la Laguna de Sinamaica | Primeros viajes españoles | Golfo y península de Paria |
| `ing` | Verbos -ar / -er / -ir | Los tres senderos del Ávila | Tiempos de una y dos palabras | Teleférico de Mérida |
| `lat` | Palabras cortas que muestran relaciones | Puente sobre el Lago de Maracaibo | et, ut y non | Represa de Guri |
| `LT` | Línea de tiempo: pueblos antiguos | Petroglifos de Venezuela | Historia en orden: maravillas y reinos | Panteón Nacional |
| `mat` | Tablas del 1 al 12 | Archipiélago Los Roques | Tablas del 5 al 16 | Parque Nacional Morrocoy |
| `pro` | El disco que parece guiñar | Salto Ángel | Una gota que parece lupa | Cascada de La Llovizna |
| `teb` | Redención: de Génesis a la nueva tierra | Río Orinoco (del nacimiento al mar) | Génesis: creación, diluvio, promesa | Los Llanos (lluvia y sequía) |

## Finanzas (`fin`, v3)

Los hitos de `fin` y sus datos seguros están en [`homescool-finanzas.md`](homescool-finanzas.md): **S1 El cacao de Chuao**, **S2 El puerto de La Guaira**. Con el método v3 cada materia-semana tiene **3 días** (no 5) y `pro` 1 día; el hito se comparte en esos días y cada día usa una parte distinta.

## Banco de hitos y datos seguros

| Hito | Dónde | Datos seguros (usar solo estos) | Imágenes útiles |
| --- | --- | --- | --- |
| **Salto Ángel** | Parque Nacional Canaima, estado Bolívar | Cae desde la cima del Auyantepui. Es una de las caídas de agua más altas del mundo. Lleva el nombre del piloto Jimmie Angel; su nombre pemón es Kerepakupai Merú. | agua que cae tan lejos que se vuelve neblina; cinta de agua; cima plana |
| **Los Médanos de Coro** | Falcón, cerca de Coro | Dunas de arena que el viento mueve y moldea. Son parque nacional. | ondas en la arena, curvas, líneas, huellas que se borran |
| **Sierra Nevada de Mérida** | Estado Mérida, Los Andes | Incluye el Pico Bolívar, el más alto de Venezuela. Hay frailejones y lagunas frías. Allí funciona el teleférico de Mérida. | cumbres, frailejones, neblina, equipos que suben juntos |
| **Teleférico de Mérida** | Mérida | Sube por tramos, con estaciones, hacia las alturas de la sierra. | estaciones en orden, subir paso a paso |
| **Laguna de Mucubají** | Parque Nacional Sierra Nevada, Mérida | Laguna de montaña, de aguas tranquilas, rodeada de páramo. | agua quieta que refleja la montaña; espejo |
| **Relámpago del Catatumbo** | Desembocadura del río Catatumbo, Lago de Maracaibo, Zulia | Tormentas con relámpagos que se ven de noche en una zona muy conocida del lago. | señales de luz, mensajes rápidos, noche |
| **Lago de Maracaibo** | Zulia | Gran lago conectado con el mar. | agua grande, orillas, caños |
| **Puente sobre el Lago de Maracaibo** | Zulia | Puente largo que une las dos orillas del lago (puente Rafael Urdaneta). | un puente une dos lados; palabras-puente |
| **Cueva del Guácharo** | Caripe, estado Monagas | Cueva con guácharos, aves que salen de noche y se orientan en la oscuridad con sonidos. | oscuridad, escuchar con cuidado, ecos, linterna |
| **Monte Roraima** | Gran Sabana, frontera de Venezuela, Brasil y Guyana | Es un tepuy (montaña de cima plana) cerca de donde se encuentran esos tres países. | frontera, tres lados, borde de una mesa |
| **La Gran Sabana** | Estado Bolívar | Región de sabanas con tepuyes y ríos. | llanura grande con montañas-mesa; regiones |
| **Cerro Autana** | Amazonas | Tepuy con una cueva que lo atraviesa; es un lugar sagrado para pueblos indígenas de la zona. | roca que sostiene, columna, hueco en la piedra |
| **Río Orinoco** | Del sur al este de Venezuela | Uno de los ríos más importantes del país; termina en un delta junto al océano Atlántico. | camino largo del nacimiento al mar, afluentes |
| **Los Llanos** | Centro-sur de Venezuela | Grandes llanuras con ríos. En la época de lluvia muchas zonas se inundan y en la sequía el suelo se seca. | lluvia y sequía, pastizal, horizonte |
| **Archipiélago Los Roques** | Caribe venezolano | Conjunto de islas y cayos con arrecifes de coral; es parque nacional. | islas en grupos y filas, contar cayos |
| **Parque Nacional Morrocoy** | Falcón | Cayos, playas y manglares cerca de la costa. | cayos en hilera, manglar, bote |
| **Los tres senderos del Ávila** | Caracas (cerro El Ávila, Waraira Repano) | El Ávila es la montaña que separa Caracas del mar. Se sube por distintos senderos. | tres caminos hacia la misma cima |
| **Palafitos de la Laguna de Sinamaica** | Zulia | Pueblos añú que viven en casas levantadas sobre el agua con palos (palafitos). | casas sobre el agua, canoas, vivir con el entorno |
| **Petroglifos** | Varias zonas de Venezuela | Dibujos grabados en rocas por pueblos antiguos. | dibujar en piedra, mensajes que duran siglos |
| **Cumaná** | Estado Sucre | Fundada por los españoles en 1515. Se considera una de las ciudades más antiguas de tierra firme en América del Sur. | pasado que sigue vivo en el presente |
| **Golfo y península de Paria** | Estado Sucre | En 1498 Cristóbal Colón llegó a esa zona en su tercer viaje. | llegar por mar, mapa, costa |
| **Represa de Guri** | Río Caroní, estado Bolívar | Represa que junta el agua del río y produce electricidad. | agua que se une, se detiene y da energía |
| **Cascada de La Llovizna** | Puerto Ordaz, río Caroní | Cascada rodeada de neblina fina que parece llovizna. | gotas, lupa, neblina |
| **5 de julio de 1811** | Caracas | Venezuela firmó su Acta de Independencia. | una promesa firmada |
| **Batalla de Carabobo** | Carabobo | 24 de junio de 1821. Simón Bolívar. Fue clave para la independencia de Venezuela. | promesa que se cumple |
| **Panteón Nacional** | Caracas | Lugar donde se honra la memoria de personas importantes de la historia, entre ellas Simón Bolívar. | guardar la historia en orden |
| **Casa Natal del Libertador** | Caracas | Casa donde nació Simón Bolívar en 1783. | un comienzo |
| **Congreso de Angostura** | Ciudad Bolívar | 1819. Reunión importante en la historia de la independencia. | reunirse a decidir |
| **Parque Nacional Henri Pittier** | Aragua | Primer parque nacional de Venezuela; tiene bosques de neblina y llega a la costa. | de la montaña al mar |
| **Delta del Orinoco** | Delta Amacuro | Muchos caños (canales de agua) entre selvas; allí vive el pueblo warao. | red de caños, canoas |

## Banco de reserva (sin asignar)

Congreso de Angostura, Casa Natal del Libertador, Parque Nacional Henri Pittier, Delta del Orinoco, Lago de Maracaibo,
Pico Bolívar. Para semanas 3+ elegir primero de aquí y mantener la tabla de asignación al día.


---

# SECCIÓN 9. Finanzas (postura reformada + práctica económica)

Fuente: `docs/homescool-finanzas.md`

# Homescool — Finanzas (`fin`, materia 13)

Regla de método: [`homescool-class-method-v3.mdc`](../.cursor/rules/homescool-class-method-v3.mdc).
Voz: niño de **8 años** ([`homescool-narrative-language.mdc`](../.cursor/rules/homescool-narrative-language.mdc)). Formato: Ask First, 3 días por semana (`d1`, `d2`, `d3`).

## Enfoque

**Educación para el trabajo**: que el niño entienda el dinero y el trabajo desde la fe cristiana **protestante reformada** y desde los mejores principios de economía, y que **lo practique cada clase**.

### Postura reformada (lo que se enseña, en palabras de niño)

- **Dios es el dueño de todo** y el niño es su **mayordomo** (cuida lo que Dios le confía). Salmo 24:1; Génesis 2:15.
- **El trabajo es bueno** (existía antes de la caída: Génesis 2:15) y **es servir**: a Dios y al prójimo. Colosenses 3:23; Efesios 4:28. Los reformadores lo llamaron **vocación** (el llamado de Dios a servir con lo que uno hace).
- **La Escritura es la regla** para dar, ahorrar, gastar y ganar. Proverbios 6:6–8; 14:23; 21:20; 22:7; 2 Corintios 9:7; Mateo 25:14–30; Lucas 14:28; 2 Tesalonicenses 3:10; Levítico 19:35–36; Proverbios 11:1.
- **El dinero es una herramienta**, no el dueño del corazón (1 Timoteo 6:10; Hebreos 13:5). Se gana para vivir, **dar** y servir; no para presumir.
- La meta de la vida es **glorificar a Dios** (Catecismo Menor de Westminster, pregunta 1: «glorificar a Dios y gozar de él para siempre»); «a solo Dios la gloria».
- Prohibido: «teología de la prosperidad» (prometer riqueza por fe u ofrendas), culpar a los pobres, o presentar el dinero como malo en sí mismo. Citas exactas o parafraseadas **sin comillas**.

### Principios de economía (lo que se enseña, sencillo)

1. **Escasez**: querer mucho, tener poco; por eso hay que elegir.
2. **Costo de oportunidad**: elegir una cosa es dejar otra.
3. **Intercambio voluntario**: dos personas cambian porque las dos ganan.
4. **Valor y precio**: un precio justo sale del trabajo, los materiales y lo que la gente valora.
5. **Producir valor para otros** es lo que hace que alguien pague por tu trabajo.
6. **Ahorro**: guardar hoy para una meta mañana; el ahorro también «gana» porque evita gastos.
7. **Presupuesto sencillo** y **tres frascos**: dar, ahorrar, gastar.
8. **Deuda prudente**: no prometer pagar lo que no se puede (Proverbios 22:7).

## Práctica económica diaria (obligatoria en cada clase)

Cada clase `fin` tiene un `Punto N: Práctica económica de hoy` con **una acción real** que **gana dinero o ahorra dinero**, pensada para un niño de 8 años **con permiso y acuerdo de papá o mamá**. Seguridad: nada de salir solo, nada de vender a desconocidos ni de usar dinero que no sea suyo.

Ejemplos válidos (ganar): una tarea extra del hogar con pago acordado; limonada, galletas o manualidad vendidas a la familia/vecinos conocidos; lavar el carro de la familia; clasificar/reciclar con pago acordado. Ejemplos válidos (ahorrar): apagar luces, llevar el almuerzo en vez de comprar, esperar una semana antes de comprar un deseo, guardar el cambio.

El quiz incluye siempre un `write` («Escribe qué hiciste y cuánto ganaste o ahorraste») y la **imagen de la clase es un registro por completar** (tabla Fecha · Qué hice · Gané · Ahorré, frascos de dar-ahorrar-gastar, libreta de metas). Nunca dibujos de fajos de dinero llamativos.

## Hito venezolano

| Semana | Hito | Datos seguros |
| --- | --- | --- |
| S1 | **El cacao de Chuao** | Chuao es un pueblo del estado Aragua, junto al mar Caribe. Es famoso por su cacao fino. El cacao se cosecha en mazorcas; de las semillas se hace el chocolate. Las semillas se fermentan y se secan antes de venderse. Mucha gente trabaja desde la siembra hasta el chocolate. |
| S2 | **El puerto de La Guaira** | La Guaira es el puerto principal cerca de Caracas. Un puerto es el lugar donde se cargan y descargan barcos. Llegan productos de otros lugares y salen productos de Venezuela. Allí trabajan muchas personas (barcos, grúas, almacenes). |

No inventar cifras, precios históricos ni récords. El hito es una imagen para entender («es como…»), no un dato económico de Venezuela.

## Plan de clases (semanas 1–2)

Cada clase: panorama → parte → aplicación (d1 → d2 → d3), con `lesson.kind` `intro` / `deepen` (focusPoint 1) / `deepen` (focusPoint 2).

### Semana 1 — «Dios es el dueño y yo soy su mayordomo» (hito: El cacao de Chuao)

| Día | Título | Idea que cierra | Práctica económica de hoy |
| --- | --- | --- | --- |
| d1 | Todo es de Dios y yo lo cuido | Dios es dueño; el niño es mayordomo; el dinero es herramienta; tres usos: dar, ahorrar, gastar. | **Ahorrar**: encontrar una forma de ahorrar hoy (luz, merienda de casa, cambio) y anotar cuánto. |
| d2 | El trabajo es un regalo para servir | Dios hizo el trabajo antes del pecado; trabajar es servir a Dios y a otros; vocación; el cacao pasa por muchas manos. | **Ganar**: hacer un trabajo útil con pago acordado (tarea extra, venta pequeña a la familia) y anotar lo ganado. |
| d3 | Dar, ahorrar y gastar con sabiduría | Los tres frascos; la hormiga; dar con alegría; un presupuesto de una semana. | **Repartir** lo ganado o ahorrado en los tres frascos y anotarlo en el registro. |

### Semana 2 — «Escasez, intercambio y valor» (hito: El puerto de La Guaira)

| Día | Título | Idea que cierra | Práctica económica de hoy |
| --- | --- | --- | --- |
| d1 | Querer mucho, tener poco: elegir | Necesidades y deseos; escasez; costo de oportunidad; calcular antes de comprar (Lucas 14:28). | **Ahorrar**: elegir entre dos deseos, posponer uno y guardar lo que costaría. |
| d2 | Intercambio y precio justo | Del trueque al dinero; los dos ganan; pesas y precios justos; cómo se pone un precio. | **Ganar**: ofrecer un servicio o producto pequeño a un precio justo (costo + trabajo) a alguien conocido. |
| d3 | Servir a otros y ahorrar para una meta | Producir valor para otros; ahorrar para una meta; deuda prudente; trabajar para tener qué dar. | **Ahorrar + registrar**: sumar lo ganado/ahorrado de la semana y marcar el avance hacia la meta. |

## Estructura de cada módulo `fin-c3-w{N}.mjs`

Mismo objeto que los demás módulos (ver BRIEF), más estos campos de clase **obligatorios** porque el JSON es nuevo:

```js
{
  key: "fin-c3-w1-d1",
  title: "Todo es de Dios y yo lo cuido",          // obligatorio (clase nueva)
  mppe: [{ id: "fin-w1-d1-01", label: "Cuido con alegría lo que Dios me confía." }], // 1–2 objetivos en voz del niño, id único, label ≤ 280
  units: [...], quiz: {...}, image: [...], summary: "..."
}
```

- `supportUrl`: no se inventa; se omite hasta que haya un recurso revisado.
- Una `write` del quiz es siempre el registro de la práctica del día.
- No hay `memoryPhrase` obligatoria; si se usa, debe aparecer textual en una respuesta.


---

# PROMPTS PARA LOS OTROS AGENTES

## A. Agente escritor de clases (semana N nueva)

```text
Escribe las clases de Homescool (ciclo 3, nivel 6) de la semana N siguiendo EXACTAMENTE las reglas de este paquete (secciones 1 a 9). Haz git pull primero.

Antes de escribir, pregúntame o confirma los TEMAS de la semana N por materia (qué enseña cada uno de los 3 días). Inglés espeja el tema de Español de la misma semana, enseñado en inglés. Asigna un hito venezolano por materia y semana (añádelo a scripts/homescool-venezuela-metaphors.json bajo "wN" con sus palabras clave y a docs/homescool-venezuela-metaphors.md). Para Finanzas añade la semana N a docs/homescool-finanzas.md (tema + práctica económica diaria).

Entregables: un módulo scripts/homescool-ask-first-content/{subj}-c3-wN.mjs por materia (11 materias × 3 días, pro × 1 día, fin × 3 días = 37 clases). Luego:
1. node scripts/build-homescool-ask-first-v2.mjs (0 problemas)
2. node scripts/audit-homescool-v2-review.mjs (filesWithAnyIssue: 0)
3. Sube el contador esperado (74 → 74 + 37·k) en scripts/build-homescool-curriculum.mjs, homescool-curriculum.test.ts, homescool_published_pack_test.go y scripts/build-homescool-image-prompts.mjs.
4. node scripts/build-homescool-curriculum.mjs y node scripts/build-homescool-image-prompts.mjs
5. go test ./... (backend) y npx vitest run + npm run build (frontend)
6. Commit solo de tus archivos, push, y vigila el deploy hasta verde (máx. 3 correcciones).
No toques archive/. No commitees secretos. La metáfora venezolana va SOLO en preguntas y respuestas, NUNCA en la indicación de imagen (excepto Historia).
```

## B. Agente generador de imágenes

```text
Genera (o regenera) las imágenes de práctica de Homescool. Haz git pull primero.

Fuente única: docs/homescool-image-prompts.json. Cada item trae: file, outPath, week, day, subject, title, instruction, prompt. Usa el campo "prompt" tal cual; no lo reinterpretes ni añadas metáforas, paisajes ni lugares emblemáticos que no estén en la indicación. La imagen muestra SOLO la idea central de la clase.

Especificaciones:
- 2398 × 827 px, horizontal (203 × 70 mm), JPEG sRGB.
- Arte lineal en blanco y negro sobre fondo blanco, trazo limpio, sin rellenos sólidos de tinta ni sombreados oscuros.
- Contenido importante a ≥ 2 mm de los bordes.
- Deja vacíos (cajas, líneas punteadas, círculos) los espacios que el niño completa.
- Rótulos cortos solo si la indicación los pide, en el idioma de la indicación (Inglés = inglés).
- Sin marcas de agua, firmas ni personas reales.

Si la imagen ya existe, antes de sobrescribirla cópiala a practice-images/archive/ con un sufijo de fecha (p. ej. .pre-YYYYMMDD.jpg). Nunca borres nada de archive/.

Salida: el campo outPath → frontend/public/homescool/media/week{N}/practice-images/{subj}-c3-w{N}-d{D}-practice.jpg

Al terminar:
1. python scripts/verify_all_practice_images.py → todas pasan.
2. Revisa visualmente que ninguna imagen tenga elementos que la indicación no pida. Regenera las que fallen.
3. Commit solo de los jpg (y su archive), push, deploy en verde (máx. 3 intentos).
No toques JSON de clases ni código.
```

## C. Agente coder que integra en el sitio

```text
Integra en el sitio Homescool (eduardoos.com) el contenido nuevo y sus imágenes. Haz git pull primero (contenido + commit de imágenes).

Verifica y corrige solo lo necesario:
1. Renderizador v2 (frontend/src/lib/homescool-letter-v2.ts) y PDF (backend/pkg/pdf/homescool_letter_grid_eoschool.go): marco en inglés de ing sin romper layout; acentos del resto intactos.
2. Cada clase carga su imagen {subj}-c3-w{N}-d{D}-practice.jpg, con fallback a la legacy si falta.
3. Chips de día d1–d3 (pro solo d1); fin en el menú; sin lógica de días 4–5; semanas nuevas visibles en el selector.
4. La plataforma tiene exactamente los materiales publicados esperados (GET /api/v1/docs primero; GET /api/v1/homescool/materials). Sube las diferencias con .eoschool/upload_all_v2.py (confirmOverwrite:true; salida a un log; no imprimas claves).
5. node scripts/build-homescool-curriculum.mjs (sin env → no sincroniza Mongo) y que el conteo coincide.
6. go test ./... (backend), npx vitest run + npm run build (frontend). Commit solo de lo tuyo, push, deploy en verde (máx. 3 intentos).

Avisos: supportUrl de ing apuntan a videos en español (el usuario dará enlaces en inglés); fin sin supportUrl. Nunca borres archive/. No commitees .env ni claves.
```

