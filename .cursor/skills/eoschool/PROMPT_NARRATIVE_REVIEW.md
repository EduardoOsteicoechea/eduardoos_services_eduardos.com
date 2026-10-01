# Prompt — revisión narrativa Homescool (nivel 6 / ≈8 años)

Copia y pega el bloque siguiente a otro agent. No edites JSON hasta terminar el informe, salvo que el usuario pida correcciones.

---

## Tarea

Revisa **todas** las clases eoschool activas (semanas 1–2, nivel 6, materias activas) y decide si cada una cumple la escritura **concisa, narrada y legible en solitario por un niño de ≈8 años**.

No reescribas aún. Primero audita y entrega un informe pas/fail por archivo.

## Fuentes canónicas (léelas antes de juzgar)

1. `docs/specs/009-homescool-narrative-language.md` — contrato de voz narrativa.
2. `.cursor/skills/eoschool/METHOD_V1.md` (o `frontend/public/skills/eoschool/METHOD_V1.md`) — método, cajas Idea/Explora/Práctica/Error, quiz 12.
3. Celdas: `frontend/public/homescool/media/week1/*-l6.eoschool.json` y `week2/*-l6.eoschool.json`.
4. Materias **pausadas** (no auditar ni proponer upsert): `teb`, `exe`.

## Criterios de aprobación (cada punto de cada día)

### Voz y edad (≈8 años)

- Oraciones cortas y concretas; el niño puede leer solo la hoja y entender.
- Todo término escolar lleva **glosa inmediata** la primera vez (*X = explicación sencilla + ejemplo*).
- Preferir palabras de niño junto al término (*forma ya hecha*, *palabra ayudante*, *una / dos palabras*).
- Suena a maestro hablando con un niño, no a rúbrica ni checklist.

### Estructura del `body` (párrafos separados por `\n\n`)

1. **Idea central** (1.er párrafo): idea + definiciones del día. **Sin** pegar la etiqueta `Idea central:` en el texto.
2. **Explora** (1–3 párrafos): ejemplos paso a paso en oraciones completas. Puente opcional «Sigamos juntos.» **solo** en el primer Explora.
3. **`Práctica: Ahora te toca a ti.`** + tarea con verbo capitalizado («Escribe…», «Resuelve…»).
4. **`Error común:`** un error típico, tono directo, sin relleno («Antes de terminar, un aviso» = fail).

### Concisión (densidad Letter)

- Bloques escaneables: suficientes para enseñar, sin párrafos largos que desborden la banda de clase.
- Sin prosa de relleno ni repetición del mismo gancho en cada párrafo.
- `heading`: título corto del tema (sin «Aprendemos:»).
- `summary`: 1–2 oraciones que el niño pueda retellar.

### Prohibido (fail automático si aparece)

- Checklist en Idea central (`A | B | C`, cadenas `A → B → C` sin oraciones).
- Boilerplate: «Esta clase te ayuda a aprender…», «Antes de hacer la actividad…», «Aprendemos:» en headings.
- Etiquetas duplicadas en el body: `Idea central:`, `Explora:`, `explora:`.
- Deepen/review solo con órdenes («Conjuga…», «Marca…») sin enseñar.
- Jerga sin glosa.
- «frente a» / `vs` a menos que se quiera el layout Contraste a propósito.
- En `locale: "es"`: meta en inglés (`Overview`, `checklist`, `vs` como etiqueta).

### Quiz (12 = 8 mcq + 4 write)

- MCQ: «Elige la respuesta correcta. » + pregunta concreta del día; opciones plausibles; `answer` ∈ `choices`; sin prefijo `Respuesta:`.
- Write: instrucción breve que pida buscar en la clase, citar frase exacta entre comillas y explicar.
- Copy del quiz también a nivel 6 (no solo el body de la lección).

### Excepciones permitidas

- Mapas de mates/conjugación que enseñan forma (`habl- → hablo`, `6×7`).
- Citas / Escritura entre comillas cuando el tema lo pide.

## Alcance de archivos

- Incluir: `pro`, `esp`, `ing`, `lat`, `mat`, `his`, `LT`, `geo`, `cie`, `art` × días 1–5 × weeks 1–2 (L6).
- Excluir: `teb`, `exe`.
- Si un subject usa layout especial (p. ej. tablas `mat` weeks 1–2), auditar solo el texto de estudiante visible (título, consignas, no inventar puntos narrativos que el layout no use).

## Método de trabajo

1. Lista todos los `*-l6.eoschool.json` en week1 y week2 (sin teb/exe).
2. Por cada archivo, lee `title`, `lesson.kind`, cada `points[].heading` + `body`, `summary`, y una muestra del quiz (al menos 2 mcq + 1 write).
3. Marca **PASS** / **FAIL** / **WARN** (WARN = menor, no bloquea pero conviene pulir).
4. No corrijas JSON en esta pasada salvo petición explícita del usuario.

## Formato del informe (obligatorio)

```markdown
# Auditoría narrativa L6 (week1–2)

## Resumen
- Archivos revisados: N
- PASS: n | FAIL: n | WARN: n
- Fallos más frecuentes: …

## Por archivo
| Archivo | Día/kind | Veredicto | Hallazgos (citas cortas) |
| --- | --- | --- | --- |
| esp-c3-w1-d1-l6.eoschool.json | 1/intro | FAIL | Idea central es checklist `A | B`; falta glosa de «pretérito» |

## Top 10 correcciones prioritarias
1. `path` — qué cambiar (1 línea) — por qué (edad/concisión/estructura)
…
```

## Criterio de cierre

La auditoría está completa solo cuando **cada** celda activa L6 de week1 y week2 tiene fila en la tabla. Si no puedes abrir un archivo, márcalo `BLOCKED` con el motivo.

---

Fin del prompt.