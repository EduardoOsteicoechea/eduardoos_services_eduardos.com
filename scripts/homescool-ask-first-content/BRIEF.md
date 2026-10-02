# BRIEF v2 — clases Homescool (ciclo 3, nivel 6): Ask First + metáfora de Venezuela

Workspace: `C:\Users\eduar\Documents\work\int\eduardoos_services\eduardoos.com` (Windows/PowerShell, Node).
Redacta en **español** (salvo lo propio de `ing`/`lat`, ver abajo). No hagas commit, push, upsert ni build del sitio. No abras navegador.
Lee `PYTHONUTF8`-seguro: escribe los módulos con la herramienta de escritura de archivos (UTF-8), **no** con scripts por stdin (se rompen las tildes).

## Qué debes hacer

Para tu materia y semana (`SUBJECT`, `N`), reescribir el módulo
`scripts/homescool-ask-first-content/{SUBJECT}-c3-w{N}.mjs` (export default = arreglo de 5 clases d1..d5) y correr el generador:

```
node scripts/build-homescool-ask-first-v2.mjs scripts/homescool-ask-first-content/{SUBJECT}-c3-w{N}.mjs --dry   # primero
node scripts/build-homescool-ask-first-v2.mjs scripts/homescool-ask-first-content/{SUBJECT}-c3-w{N}.mjs         # luego, real
```

Debe imprimir `withProblems: 0` (sin `OVERFLOW`, `LONG`, `IMAGE`). No modifiques el generador ni otros archivos fuera de tu módulo y tus 5 JSON vivos
(`frontend/public/homescool/media/week{N}/{SUBJECT}-c3-w{N}-d{D}-l6.eoschool.json`). Nunca borres respaldos. Si el generador tiene un bug, repórtalo, no lo arregles.

## Lee primero (en este orden)

1. **`scripts/homescool-ask-first-content/GOLD.example.mjs`** — la forma, el tono y el ritmo exactos. Imítalo.
2. **`docs/homescool-venezuela-metaphors.md`** — tu hito asignado y sus **datos seguros** (también en `scripts/homescool-venezuela-metaphors.json`).
3. `docs/specs/009-homescool-narrative-language.md` (reglas completas).
4. Las 5 clases vivas de tu materia-semana y su respaldo original (`archive/{key}-l6.pre-askfirst-*.eoschool.json`) y la versión anterior de tu módulo en `scripts/homescool-ask-first-content/archive-v1-20261002/{SUBJECT}-c3-w{N}.mjs`: son tu **fuente de hechos y del tema de cada día** (título, `mppe.objectives`, `lesson.focusPoint`, `weekRecap`, `memoryPhrase`, `quiz`, `locale`). Mantén el tema/objetivo de cada día (intro d1, profundiza d2–d4, repaso/exposición d5). No inventes datos. (Matemática: verifica cada cuenta. Latín: cada forma. Historia/geografía/ciencias/teología: hechos correctos; citas bíblicas exactas o parafraseadas sin comillas.)

## Las reglas (obligatorias)

1. **Ask First, 4 pasos por idea:** pregunta activadora → espacio de reflexión (línea de guiones) → `Punto N: Título` + respuesta en 2–4 líneas cortas → `Escribe aquí lo que aprendiste:` + línea de guiones. **El generador pone los guiones, los blancos y la frase de copia**: tú solo escribes `q`, `h`, `a`. No escribas líneas vacías ni `____`.
2. **Nunca** secciones aparte de práctica, error común o pregunta final: todo fluye en el mismo ciclo. La práctica y los errores se vuelven preguntas dentro del ciclo («Una pregunta con truco: …»).
3. **Apertura:** el generador pone exactamente `¿Qué aprendiste ayer?` todos los días. **`units[0]` es siempre `Punto 1: Repaso de ayer`** (sin `q`): conecta el día anterior con el tema de hoy.
   - d2–d5: repasa de verdad lo de ayer (mismo hito, parte distinta).
   - d1: repasa lo que el niño ya sabe del tema o el cierre de la clase anterior de la materia (semana 1: lo que ya sabe; semana 2: la semana 1).
4. **5 a 7 Puntos por clase (lo normal: 6).** `units[1..]` llevan `q` (1–2 líneas), `h: "Punto N: título"` (numeración 1,2,3…), `a` (2–4 líneas).
5. **Una idea por línea, ≤ 40 caracteres** (el generador reenvuelve por palabras si te pasas; aún así escribe líneas cortas y no termines una línea en «el», «de», «y»…). Aplica a `q`, `h`, `a`, quiz e `image`.
6. **Metáfora venezolana:** tu hito asignado va **dentro** de las preguntas y de las respuestas (organicamente, en casi todos los Puntos: el niño “viaja” por el hito mientras aprende). Usa **solo** los datos seguros de la lista; no inventes cifras, fechas ni récords. Los 5 días comparten el hito, pero cada día usa una parte/imagen distinta de él. Nombra el hito por su nombre (el audit lo exige). En `teb`/`exe` el hito es una imagen («es como…»), nunca una equivalencia teológica.
7. Voz de 8 años: oraciones cortas completas, explica cada término escolar nuevo con palabras de niño la primera vez. Varía cómo abres las preguntas. Nada de etiquetas (`Idea central:`, `Explora:`, `Práctica:`, `Error común:`), nada de markdown, nada de relleno («Esta clase te ayuda…», «Para cerrar…»), nada de `Respuesta:`.
8. Si `lesson.memoryPhrase` existe en el JSON vivo (esp/ing/lat/his/LT/geo/cie), la frase (o su contenido) debe aparecer **textualmente en alguna `a`** (preferible d5 y d1).
9. Día 5: repaso/exposición con sustancia: recuerdan, ordenan y practican cómo contarlo, sin quedarse en eslóganes.
10. **Presupuesto:** la lección cabe en ~85 líneas (cada Punto de q=2, a=3 ocupa ~14 líneas). El generador reparte el sobrante en guiones extra. Si dice `OVERFLOW`, recorta líneas o baja un Punto (mínimo 5).

## Forma del objeto

```js
{
  key: "{SUBJECT}-c3-w{N}-d{D}",         // "LT" se escribe "LT-c3-w1-d2"
  units: [
    { h: "Punto 1: Repaso de ayer", a: ["…","…","…"] },
    { q: ["…","…"], h: "Punto 2: título", a: ["…","…","…"] },
    …
  ],
  quiz: { mcq: [{ q, o: [correcta, mala, mala, mala] } x8], write: [2 textos], schematic: [2 textos] },
  image: [4 líneas],
  summary: "1–2 frases que el niño pueda contar",
}
```

(No uses `opening`, `repaso`, `w` ni `c`: ya no existen.)

## Quiz (hasta 12 ítems; el generador quita las últimas si no caben los espacios entre preguntas, y siempre deja 2 selección + 1 esquema + 1 reflexión)

- `mcq` ×8: `o[0]` = correcta (el generador rota la posición). Pregunta de **una línea** (≤ ~40 caracteres, si pasa el generador la envuelve), concreta, **sin** «Elige la respuesta correcta.». Opciones cortas (≤ ~36 caracteres). **Cada pregunta se responde con texto explícito de la hoja** (ejemplos incluidos).
- `write` ×2 y `schematic` ×2: instrucciones cortas, ligadas a la clase (el hito puede aparecer).
- Reemplaza TODO el quiz viejo. Matemática: cuentas correctas y opciones distintas.

## image (4 líneas, ≤ 40 caracteres cada una; el generador las une en un párrafo en negrita, máx. 6 líneas)

Qué dibujar/rotular hoy para practicar lo aprendido; concreta y ligada a la clase (puede dibujarse el hito).

## Idioma

- Materias en español: todo en español (comillas angulares «…», tildes y ¿? correctas).
- `ing`: las explicaciones van en español sencillo y los ejemplos en inglés, como ya hace la celda; lee su `locale`. La apertura, `Punto N:` y `Escribe aquí lo que aprendiste:` siguen en español.
- `lat`: explicaciones en español, formas latinas correctas.

## Verificación antes de reportar

1. El generador real imprimió `withProblems: 0`.
2. `node scripts/audit-homescool-v2-review.mjs` → 0 problemas en tus archivos (`{SUBJECT}-c3-w{N}`); ignora los de otras materias (pueden estar en proceso).
3. Relee una clase impresa (`lesson.slotSequence`): suena a maestro hablando a un niño de 8 años; cada pregunta se responde justo debajo; el hito aparece natural; el quiz sale de lo escrito.

## Qué devolver

Respuesta breve en español: módulo creado, salida del generador (`withProblems`), si el audit dio 0, y cualquier dato dudoso que dejaste fuera. No pegues el contenido completo.
