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
