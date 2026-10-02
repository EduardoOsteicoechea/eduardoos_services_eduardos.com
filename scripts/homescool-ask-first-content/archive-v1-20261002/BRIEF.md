# BRIEF — reescribir clases Homescool (ciclo 3, nivel 6) con el método "pregunta primero"

Workspace: `C:\Users\eduar\Documents\work\int\eduardoos_services\eduardoos.com` (Windows/PowerShell, Node disponible).
Responde y redacta en **español** (salvo el inglés de la materia `ing`, ver abajo). No hagas commit, push, upsert ni build del sitio. No abras navegador.

## Qué debes hacer

Para la materia (`SUBJECT`) y las semanas que te asignaron, escribir **un módulo de contenido por semana**:
`scripts/homescool-ask-first-content/{SUBJECT}-c3-w{N}.mjs` (export default = arreglo de 5 clases, d1..d5), y ejecutar el generador para reescribir los JSON vivos:

```
node scripts/build-homescool-ask-first-v2.mjs scripts/homescool-ask-first-content/{SUBJECT}-c3-w{N}.mjs --dry   # primero
node scripts/build-homescool-ask-first-v2.mjs scripts/homescool-ask-first-content/{SUBJECT}-c3-w{N}.mjs         # luego, real
```

Debe imprimir `withProblems: 0` (sin `OVERFLOW`, `LONG`, `MD`). No modifiques el generador ni ningún otro archivo fuera de tus módulos y de tus JSON (`frontend/public/homescool/media/week{N}/{SUBJECT}-c3-w{N}-d{D}-l6.eoschool.json`). El generador crea solo el respaldo `archive/*.pre-askfirst-YYYYMMDD.eoschool.json`; nunca borres respaldos. Si crees que el generador tiene un bug, no lo arregles: repórtalo.

**Antes de correr el generador en real, LEE el JSON vivo de cada clase** (título, `mppe.objectives`, `lesson.focusPoint`, `lesson.weekRecap`, `lesson.memoryPhrase` si existe, `lesson.points[].body`, `quiz`, `locale`) y úsalo como **fuente de hechos y de tema del día**: mantén el tema/objetivo de esa clase (intro d1, profundiza d2–d4, repaso/exposición d5). No inventes datos: si el JSON tiene un dato dudoso, usa solo lo que sea seguro y correcto. (Matemática: verifica cada cuenta. Latín: verifica cada forma. Historia/geografía/ciencias/teología: hechos correctos; citas bíblicas exactas o parafraseadas sin comillas.)

Modelo de formato y de voz: **lee `scripts/homescool-ask-first-content/esp-c3-w1.mjs`** (5 clases ya hechas y aprobadas por el usuario). Imita su forma exacta de objeto.

## La única regla de redacción: ask-first (narrativa inductiva)

Toda la clase es **una narrativa natural**, para un niño de ~8 años. Cada idea sigue el mismo ritmo:

1. **Pregunta** que despierta el interés.
2. **Espacio en blanco** para que el niño intente (siente la necesidad porque aún no tiene la respuesta).
3. **Respuesta debajo** con encabezado `Punto N: título` y frases cortas.
4. **Copiar**: `Cópiala aquí:` + 2 líneas (esto lo pone el generador solo).

NO existen secciones de Idea / Explora / Práctica / Error común / "Para cerrar" ni una pregunta final aparte. La práctica y el error común se vuelven **preguntas dentro del mismo ritmo** («Una pregunta con truco: …», «Ahora tú: ¿cómo dirías …?»). La narrativa fluye: cada respuesta provoca la siguiente pregunta (puentes naturales: «Sigamos.», «Imagina que…», «¿Y si…?»). **Varía las frases con que abres cada pregunta** (no empieces todas con «Ahora te pregunto»; úsala como mucho 1–2 veces por clase). Explica cada término escolar nuevo con palabras de niño la primera vez. Nada de etiquetas de interfaz (`Idea central:`, `Explora:`, `Práctica:`, `Error común:`), ni markdown, ni relleno («Esta clase te ayuda a aprender…», «Para cerrar…»), ni `Respuesta:`.

## Forma del objeto de cada clase

```js
{
  key: "{SUBJECT}-c3-w{N}-d{D}",        // ej. "mat-c3-w1-d2"  (LT se escribe "LT-c3-w1-d2")
  opening: "...",                        // d1: gancho en forma de pregunta. d2-d5: EXACTAMENTE «¿Qué aprendiste ayer sobre esta misma materia?»
  repaso: null | [l1, l2, l3],           // d1: null. d2-d5: EXACTAMENTE 3 líneas cortas de repaso del día anterior (narradas, empiezan por «Ayer …» o similar)
  units: [                               // 4 o 5 puntos
    { h: "Punto 1: ...", a: ["..."] },   // d1: el punto 1 NO lleva q (la apertura es su pregunta)
    { q: ["línea de pregunta", "..."], h: "Punto 2: título", a: ["frase", "frase", "..."], w?: 2, c?: 2 },
    ...
  ],
  quiz: { mcq: [ {q, o:[correcta, mala, mala, mala]} x8 ], write: [2 textos], schematic: [2 textos] },
  image: [4 líneas],                     // instrucción de dibujo en 4 líneas
  summary: "1-2 frases que el niño pueda contar",
}
```

- d2–d5: `units[0]` SÍ lleva `q` (la apertura ya fue la pregunta de ayer + repaso). d1: `units[0]` sin `q`.
- `a`: 3–5 líneas por punto; `q`: 1–3 líneas; una idea por línea.
- **Longitud de línea: máximo 39 caracteres** a 8 pt (también en `h`, `repaso`, `q`, `a`, `image`). El generador reenvuelve palabras si te pasas; aún así escribe frases cortas. No cortes a mitad de sintagma (evita terminar una línea en «el», «de», «y»…).
- Párrafos y preguntas separados por espacio en blanco: lo agrega el generador (espacio de respuesta, blancos alrededor del encabezado, blanco antes de «Cópiala aquí:»). Tú no escribas líneas vacías ni `____`.
- **Presupuesto**: la lección completa (apertura+2 blancos, Repaso, puntos) debe caber en ~81 líneas (el generador reparte el sobrante en espacios de respuesta). Con 5 puntos de q=2, a=3–4 suele caber; si el generador dice `OVERFLOW`, recorta líneas o pasa a 4 puntos.
- Si `lesson.memoryPhrase` existe en el JSON vivo (esp/ing/lat/his/LT/geo/cie), la frase (o su contenido) debe aparecer **textualmente en alguna `a`** de la clase (preferible d5 y d1).
- Día 5: que sea repaso/exposición con sustancia: recuerdan lo de la semana, lo ordenan, y practican cómo contarlo («Cómo contarlo con orden»); sin quedarse en eslóganes.

## Quiz (12 ítems; el generador lo coloca en la hoja)

- `mcq`: **8** ítems. `o[0]` = respuesta correcta; `o[1..3]` = 3 distractores plausibles (el generador rota la posición correcta). Pregunta de **una sola línea** (≤ 39 caracteres), concreta, **sin** prefijo «Elige la respuesta correcta.». Cada opción ≤ 36 caracteres (se imprime con «A) »). **Cada pregunta debe poderse responder con texto explícito de la clase** (ejemplos incluidos).
- `write`: **2** instrucciones cortas (≤ 39 caracteres) de escribir/explicar.
- `schematic`: **2** instrucciones cortas de dibujar un esquema/diagrama relacionado con la clase.
- Reemplaza TODO el quiz viejo (los textos viejos tipo «Busca y copia entre comillas…» o «Elige la respuesta correcta.» están prohibidos).
- Matemática: números y cuentas correctos; opciones distintas entre sí.

## image (instrucción de dibujo: 4 líneas, ≤ 39 caracteres cada una)

Qué dibujar/rotular hoy para practicar lo aprendido (el niño dibuja en un recuadro). Concreta y ligada a la clase de ese día.

## Idioma

- Materias en español: todo en español (comillas angulares «…», tildes y ¿? correctas).
- `ing` (inglés): lee el `locale` y el estilo de la celda viva; el contenido de inglés se enseña con explicaciones en español sencillo y ejemplos en inglés, como ya hace la celda. Los textos de hoja fijos siguen en español: la pregunta de apertura de d2–d5, `Repaso`, `Punto N:` y `Cópiala aquí:`.
- `lat` (latín): explicaciones en español, formas latinas correctas.

## Verificación mínima antes de reportar

1. El generador real imprimió `withProblems: 0` para cada semana tuya.
2. `node scripts/audit-homescool-v2-review.mjs` — busca en su salida problemas de tus archivos (`{SUBJECT}-c3-w`); deben ser 0 (si hay problemas de otras materias, ignóralos).
3. Relee una clase tuya impresa (puedes volcar `lesson.slotSequence` filtrando `kind` blank/answerLine) y comprueba que suena como un maestro hablando a un niño de 8 años, que cada pregunta se responde justo debajo y que el quiz sale de lo escrito.

## Qué devolver

Respuesta breve en español: archivos de contenido creados, salida del generador (`withProblems`), si el audit de tus clases dio 0, y cualquier duda o dato dudoso que dejaste fuera. No pegues el contenido completo.
