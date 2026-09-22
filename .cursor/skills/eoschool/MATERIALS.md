# Materiales de estudio — US Letter

Todo material eoschool / Homescool sigue este formato. No inventar otros tamaños ni sistemas de quiz.

## Workspace UI (`/homescool`)

- Árbol izquierdo (DHS **Tree**): `ciclo → semana → día → materia → <título>`.
- Panel derecho: secciones `.page` del material (preview).
- DHS **Print**: PDF de todas las `.page` (el chrome se oculta en `@media print`).

## Página

- **Tamaño:** US Letter **portrait** (8.5 in × 11 in) o **landscape** (`.page.page--landscape` / `body.sheets-landscape`).
- **Padding de hoja:** 1 cm (`--page-padding-x/y` en `styles.css`).
- **Sesión:** una o varias hojas; cada hoja es `<section class="page">`.
- **Salida:** HTML que referencia `web_assets/styles.css` y `web_assets/print.js` con ruta relativa `../../../../web_assets/…` (el servidor la reescribe al desplegar).

## Estructura HTML mínima

Ver [TEMPLATES.md](TEMPLATES.md).

## Impresión

- No usar `vw` / `vh` / `%` del body para layout de hoja.
- Usar `in`, `pt`, `cm` y clases de `styles.css`; `@page { size: letter; margin: 0; }`.
- Cada `.page` = una página PDF. En la app, imprimir vía DHS Print (no depender del print bar inyectado).

## Convención de paths / naming

- Lógico: `cicloN` / `semanaN` / `<materia>` / `diaN`
- Materias típicas: `idiomas`, `locacion/geografia`, `ciencias`, `historia`, `bellas_artes`, `proyectos`, `expresion`
- Nombre de archivo de referencia: `_yyyy_mm_dd_<materia>_cicloN_semanaN_diaN_<tema>.html`
- Varias clases el mismo día: varios HTML en el mismo `diaN`

## Cuestionarios

- Siempre `.quiz.quiz--grid3` dentro de `.quiz-section`
- Opciones con `.opt-key` / `.opt-text` (nunca `.bubble`)
- Preferir 12 preguntas (grilla 3×4); mezclar respuesta correcta A–D

## Checklists

- `.checklist-section` + `.checklist` (`.checklist--grid2` o `.checklist--grid3`)
- Ítem: `<li class="checklist__item"><span class="checklist__box"></span><span class="checklist__text">…</span></li>`
- Hoja: `.page.page--checklist`

## Ciclos

Homescool expone ciclos **1, 2 y 3**. Vacío permitido. Generar solo el ciclo que el usuario pida.
