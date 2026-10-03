# Prompt — Regenerar todas las imágenes de práctica (Containerimages v2)

Copia el bloque **Tarea** en un agente nuevo. Regla: `.cursor/rules/homescool-letter-practice-images-v2.mdc`. Geometría: `.cursor/rules/homescool-letter-grid-v2.mdc`.

---

## Tarea

Regenera **todas** las imágenes JPG de práctica de Homescool ciclo 3 para que encajen en el band **Containerimages** del Letter grid v2.

### Medidas obligatorias

- Band en hoja: **203 mm × 70 mm** (aspecto ≈ **2.9:1**).
- Exportar a **2398 × 827 px** @ 300 DPI (o 1199 × 414 @ 150 DPI para borrador).
- JPEG, estilo **hoja de trabajo** (líneas, recuadros vacíos, iconos simples), fondo claro, sin bloques de color que gasten tinta.

### Rutas

- Salida: `frontend/public/homescool/media/week{N}/practice-images/{subject}-c3-w{N}-practice.jpg`
- Semanas en scope: **week1** y **week2** (ampliar solo si existen carpetas `weekN`).
- Materias: las 12 (`mat`, `esp`, `ing`, `his`, `lat`, `LT`, `geo`, `cie`, `art`, `pro`, `teb`, `exe`).

### Brief creativo

Para cada `(week, subject)`, lee la descripción en `QUIZ_PRACTICE_ALTS` (`frontend/src/lib/homescool-eoschool.ts`) y genera una imagen **nueva** que cumpla ese brief pero **compuesta para 203×70 mm** (panorámica, elementos principales en fila o banda horizontal, sin texto largo).

### Backup

Antes de sobrescribir cada JPG, copia el archivo previo a  
`frontend/public/homescool/media/week{N}/practice-images/archive/{subject}-c3-w{N}-practice.pre-v2-{YYYYMMDD}.jpg`  
si aún no existe backup de hoy.

### Verificación

- Lista cada archivo escrito.
- Confirma dimensiones en px de una muestra por semana.
- No modifiques `.eoschool.json` salvo que falte entrada `media` con id `quiz-practice` y el usuario lo pida.

### No hacer

- Push/deploy/commit salvo que el usuario lo pida.
- Tamaños cuadrados, retrato o de hoja entera antigua.
