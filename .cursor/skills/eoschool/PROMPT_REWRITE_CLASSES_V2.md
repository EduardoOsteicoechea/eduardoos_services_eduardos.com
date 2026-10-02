# Prompt — Reescribir clases Homescool método v2 (sin borrar v1)

Copia el bloque **Tarea**. Reglas: `.cursor/rules/homescool-class-method-v2.mdc`, `.cursor/rules/homescool-letter-grid-v2.mdc`, `.cursor/rules/homescool-narrative-language.mdc`, `.cursor/skills/eoschool/METHOD_V1.md`.

---

## Tarea

Reescribe las celdas `.eoschool` de **ciclo 3, level 6** al **método de clase v2** (flujo 3 columnas / 156 líneas en la hoja v2). **No borres** el contenido anterior: haz **backup** y deja el JSON vivo listo para **upsert** después.

### Alcance (ajusta N)

- Semanas: `week1` y `week2` (o las que indique el usuario).
- Archivos: `frontend/public/homescool/media/week{N}/*-c3-w{N}-d{D}-l6.eoschool.json`

### Backup obligatorio (por archivo)

Antes de editar, copia a:

`frontend/public/homescool/media/week{N}/archive/{nombre}.pre-v2-{YYYYMMDD}.eoschool.json`

### Flujo pedagógico v2 (cuerpo de la clase) — ask-first

Autoridad: `.cursor/rules/homescool-class-method-v2.mdc`. Generador de referencia: `scripts/build-homescool-ask-first-v2.mjs`.

1. **No empieces** con teoría. **Días 2–5:** `¿Qué aprendiste ayer sobre esta misma materia?` + **2** `blank`. **Día 1:** gancho + **2** `blank`.
2. Heading **`Repaso`** + **3** líneas narradas.
3. **5 puntos** con el mismo ritmo: pregunta (`Ahora te pregunto…` / truco) → blanks → `Punto N: título` + respuesta corta → **`Cópiala aquí:`** + **2** blanks.  
   Práctica y error común van **dentro** de ese ritmo (no bloques `Práctica:` / `Error común:`).
4. Una clase = una hoja = **156** slots. Cierre col. 3: **K** `imageInstruction`. Soft max **~66** caracteres por línea de lección.
5. `blank` antes y después de cada `heading`. Repartir slots sobrantes en blanks de respuesta (no hueco muerto antes del quiz).

### Presupuesto de líneas (156 — una hoja completa)

La hoja v2 tiene **156 ContentSlots** fijos: **52 líneas × 3 columnas** (3,5 mm por línea). **Toda** la clase + quiz cabe ahí; no alargues `lesson.points[]` más allá de lo que quepa al empaquetar.

| Bloque | Slots | Notas |
| --- | --- | --- |
| **Quiz completo** | **60** | 12 ítems × (**1** `question` + **4** `option` o `answerLine`) |
| **Indicación imagen (col. 3)** | **K** | Solo `imageInstruction` en col. 3, líneas **52−K+1 … 52** (K ≥ 2; suele 3–6) |
| **Lección + apertura + separadores** | **156 − 60 − K** | `opening`, `lesson`, `heading`, `blank`, `summary` (el quiz **no** entra aquí; son 60 slots aparte) |

**Orden de llenado (column-major — obligatorio):**

1. Llena **las 52 líneas de la col. 1** (arriba→abajo).
2. Luego **las 52 de la col. 2**.
3. Luego **las 52 de la col. 3**.

**Dentro de ese flujo:** primero **toda** la lección (`opening` / `heading` / `blank` / `lesson` / `summary`), después **todo** el quiz (**60** slots en bloques 1+4), después (solo al cierre de col. 3) las **K** líneas `imageInstruction`.

**Prohibido (reglas viejas de “altura de sección”):** empezar el quiz a la **misma línea** en cada columna; repartir lección/quiz en bandas verticales iguales; reservar alturas de expo/secciones del Letter v1 en esta hoja v2.

**Planificación obligatoria antes de escribir:**

1. Elige **K** y parte `imageBandInstruction` en K frases (una por slot) → van al **final** de col. 3.
2. Escribe la lección en slots cortos (una línea por slot) hasta agotar el presupuesto **156 − 60 − K**.
3. Encola los **60** slots de quiz **después** de la lección en el mismo flujo column-major (bloques 1+4 **sin solapar**). Si la lección llena col. 1 y parte de col. 2, el quiz **continúa** donde quedó — no “salta” a la línea 33 de cada columna.
4. **Días 2–5:** al **inicio** del flujo (col. 1): 1 `opening` + **2** `blank` (respuesta del niño) + `blank`+`heading`+`blank` (Repaso) + 3 `lesson` de repaso. Día 1: `opening` + **2** `blank`. Separar párrafos con `blank`; separar preguntas del quiz con `blank`; `answerLine` **sin** puntos `….`.
5. Cuenta: `slots_lección + 60 + K = 156`. Rellena con `blank` solo el hueco entre el fin del quiz y el inicio de `imageInstruction` en col. 3 si hiciera falta.

**Prohibido:** más de 52 líneas por columna; apilar preguntas sin 4 filas de respuesta; poner `imageInstruction` solo en la línea 52 si el texto necesita más líneas (sube K); texto de lección que solo vive en `points[]` y no en `slotSequence`.

### Lo que se mantiene de v1

- Orden de materias y días; voz **niño ~8 años** y narrativa spec 009.
- `lesson.memoryPhrase` (materias requeridas), `supportUrl` en **cada** clase.
- Quiz: **12** ítems (**8 mcq** + **4 write**); mayoría **selección**, resto **redacción/análisis**.
- **Al menos 2** ítems del quiz deben pedir **esquematizar / dibujar un esquema** (`questionType: "schematic"` en slot + `type: "schematic"` en `quiz.questions[]`, o `write` con consigna explícita de esquema).
- `weekRecap` / `priorDayRecap` en JSON donde METHOD_V1 lo exige.

### Alineación contenido ↔ preguntas

- Cada pregunta del quiz debe poder responderse con **texto explícito** de la lección reescrita.
- Sustituye preguntas cuando cambie el contenido; distractoras plausibles en mcq.

### Marcadores JSON

En cada celda reescrita añade (si el validador lo permite):

`"lesson": { "layout": "letter-grid-v2", ... }`

### Entregable JSON (obligatorio para v2 real)

Además de `lesson.layout`, `v2Flow` e `imageBandInstruction`, cada celda debe incluir:

1. **`lesson.slotSequence`**: **exactamente 156** entradas en orden global (col 1 líneas 1→52, col 2 líneas 1→52, col 3 líneas 1→52), cada una con `index`, `column`, `line`, `kind`, `text` (si aplica), `gutter` cuando toque, y enlaces de quiz (`questionId`, `questionType`).
2. **Tipos de `kind` (contrato de empaquetado):**

| kind | Uso | Texto en hoja |
| --- | --- | --- |
| `opening` / `lesson` / `summary` | Cuerpo narrativo | Una línea corta por slot (~3,5 mm) |
| `heading` | Título de sección | **Negrita** en PDF; sin `##` en `text` (solo el título) |
| `blank` | Separador | Línea vacía (tras cada `heading`) |
| `question` | Enunciado quiz | Gutter pregunta `#aaa`/`#fff`; `questionId` + `questionType` (`mcq` \| `write` \| `schematic`) |
| `option` | Respuesta mcq | **4 líneas** justo debajo de cada `question` mcq: `A) …`, `B) …`, `C) …`, `D) …` (texto = opción; puede repetir `questionId`) |
| `answerLine` | Redacción / esquema | **4 líneas** debajo de cada `question` `write` o `schematic`: línea vacía o puntos `....` para escribir |
| `imageInstruction` | Cierre col. 3 | Últimas líneas de **main col 3** con la consigna de dibujo/esquema de la banda de imágenes (varias líneas si hace falta) |

3. **Bloque de pregunta (obligatorio):** cada ítem del quiz ocupa **1 + 4 líneas** consecutivas en la misma columna: fila `question` + cuatro filas `option` (mcq) o `answerLine` (write/schematic). No apiles preguntas sin sus 4 filas de respuesta.
4. **`lesson.imageBandInstruction`**: texto canónico de la consigna visual; debe coincidir (normalizado) con el texto unido de los slots `imageInstruction` (col. 3, líneas finales).
5. **`lesson.quizIntegrated": true`** solo cuando las 12 preguntas tengan bloque 1+4, `quiz.questions[].slot` correcto, y el conteo total de slots cumpla **156 = lección + 60 quiz + K imageInstruction**.
6. **Prohibido** reemplazar el quiz por plantillas «¿Qué idea corresponde a…?» con distractores genéricos repetidos.
7. **Prohibido** párrafos mecánicos (`Sigamos juntos`, `Observa un caso real`, relleno duplicado).
8. Codificación UTF-8 correcta (sin `?Qu?` por mojibake).
9. Materia **`ing`**: mismas reglas de apertura días 2–5 (incluye la pregunta de ayer).

Valida con `node scripts/audit-homescool-v2-review.mjs` antes de pedir upsert.

### Después de editar

- Lista archivos tocados y backups creados.
- **No** ejecutes build/upsert Mongo salvo petición explícita.
- **No** commit/push salvo petición explícita.

### No hacer

- Eliminar archivos `archive/` o backups pre-v2.
- Abrir con bloques largos de teoría sin pregunta + Repaso (días 2–5).
- Omitir frase a memorizar o `supportUrl`.
