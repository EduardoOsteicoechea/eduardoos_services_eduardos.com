# Semana 2 — lista de sugerencias (revisión de contenido)

**Para:** agente que edite el pack ciclo 3 / semana 2 / nivel 6  
**Origen:** revisión de `frontend/public/homescool/curriculum.json` (2026-09-23)  
**Estado METHOD_V1:** las 60 celdas pasan validación estructural (kinds, quiz 8×día, solo `mcq`).  
**No rehacer:** arquitectura pedagógica intro → deepen → review; temas de la tabla en `METHOD_V1.md`.

## Archivos fuente (editar aquí, no solo el consolidado)

- Celdas: `frontend/public/homescool/media/week2/*-c3-w2-d*-l6.eoschool.json` (60 archivos)
- Consolidado (rebuild): `node scripts/build-homescool-curriculum.mjs` → `frontend/public/homescool/curriculum.json`
- Contrato: `frontend/public/skills/eoschool/METHOD_V1.md`

## Prioridad

| ID | Prioridad | Área |
| --- | --- | --- |
| W2-01 | **Alta** | `mat` — verificar progresión con ciclo 3 / semana 1 |
| W2-02 | **Alta** | Quizzes — distractores poco rigurosos |
| W2-03 | Media | `geo` — repaso espiral / cobertura |
| W2-04 | Media | `lat` — profundidad clásica |
| W2-05 | Media | Plantilla de lección — variedad |
| W2-06 | Baja | `esp` — antepretérito |
| W2-07 | Baja | Material de piloto ajeno a este pack |
| W2-08 | Baja | Validación automatizada en tests |

---

## W2-01 · Matemáticas: comprobar progresión frente a ciclo 3 / semana 1

**Problema:** confirmar que `mat` de semana 2 no repite sin avance el objetivo de `c3-w1-d1-l6-mat` cuando ese pack exista.

**Opciones (elegir una con el usuario):**

1. **Mantener** si semana 1 fue solo piloto técnico y semana 2 es la primera semana «real» de enseñanza.
2. **Progresar:** semana 2 = aplicación (fracciones equivalentes, áreas, división con residuo, problemas verbales usando tablas ya memorizadas en sem. 1).
3. **Variante:** mismas tablas pero quiz con productos distintos y lecciones que no copien estructura del piloto.

**Archivos:** `mat-c3-w2-d1-l6.eoschool.json` … `d5`.

---

## W2-02 · Quizzes: subir rigor de distractores

**Problema:** ~44 preguntas usan «Colón» (u opciones absurdas: «solo el pie», «solo cantar», «firmar la ONU») en materias que no son historia. Para nivel 6 (~12 años) el quiz no discrimina errores reales.

**Acción:**

- Reemplazar distractores cómicos por **errores plausibles** del tema (ej. confundir capitales, tiempos verbales, hitos LT, huesos).
- Reservar opciones obviamente falsas solo donde el objetivo es reconocimiento literal (día 1 intro).
- Meta: en cada `mcq`, las 3 opciones incorrectas deben ser errores que un alumno **sí** cometería.

**Por materia (ejemplos de distractores mejores):**

| Materia | Mal | Mejor |
| --- | --- | --- |
| `lat` | «Colón» | `sed`, `aut`, confundir `ut` con `et` |
| `cie` | «solo el pie» | pulmones, hígado, médula (mal ubicados) |
| `esp` | subjuntivo/imperativo mezclados sin contexto | imperfecto vs pretérito en la misma persona |
| `geo` | ciudad grande no capital | Porlamar, Punto Fijo, Cabimas |
| `LT` | «solo Colón» | hito vecino (10 vs 11), región equivocada |
| `exe`/`teb` | «Colón», «solo el alambre» | Pedro, Moisés, César, «solo gracia sin paz» |

**Archivos:** todos los `*-c3-w2-d*-l6.eoschool.json`; priorizar días 3–5 (más preguntas).

---

## W2-03 · Geografía: densidad y retención

**Problema:** 24 entidades en una semana es viable con la agrupación regional, pero la retención a largo plazo necesita espiral.

**Acción:**

1. Verificar que los **25 prompts únicos** de capital cubren las 24 entidades (hay 1 duplicado o variante «La Guaira (Vargas)» — OK).
2. En días 2–4 (`deepen`), asegurar que cada región del punto 3 del intro tenga **al menos un bloque dedicado** con todos sus pares listados (oriente, centro-norte, occidente/andes, llanos/guayana).
3. Documentar en `METHOD_V1.md` o nota de ciclo: **repaso ligero de geo en semanas 3–4** (4–8 preguntas mezcladas en quiz de otra materia o mini-repaso geo).

**Nota factual:** mantener «La Guaira/Vargas» como está (nombre actual + legado).

---

## W2-04 · Latín: ampliar sin romper el tema semanal

**Problema:** `et`, `ut`, `non` están bien explicados pero el bloque es corto para un programa clásico.

**Acción (sin cambiar el syllabus de METHOD_V1):**

- Añadir en `deepen` días 2–4: **5–8 frases latinas cortas** por partícula (no solo definición).
- Conectar con español: `et` → «y»; `non` → negación; `ut` → «para que» en oraciones de finalidad.
- Quiz: menos «et ≈ y»; más «traduce / elige la partícula correcta en contexto».

**Archivos:** `lat-c3-w2-d2` … `d5`.

---

## W2-05 · Lecciones: variar formato en 2–3 materias

**Problema:** casi todos los `body` repiten: Por qué importa → Ejemplo → Consejo → Error común. Funciona, pero es monótono en 12 materias × 5 días.

**Acción (elegir 2–3 materias):**

| Materia | Formato alternativo sugerido |
| --- | --- |
| `art` | Lista de pasos numerados + checklist de observación |
| `pro` | Protocolo de laboratorio (hipótesis / procedimiento / registro / conclusión) |
| `exe` | Esquema por versículos (v.1 \| vv.2–4 \| vv.5–7) sin repetir la plantilla genérica |
| `his` | Dos voces breves (habitante costero / marinero) en día 2 o 3 |

No eliminar consejos ni errores comunes; **reordenar o acortar** la plantilla.

---

## W2-06 · Español / inglés: antepretérito

**Problema:** `antepretérito` (`hube cantado`) es correcto en gramática tradicional pero raro en uso; puede abrumar.

**Acción (opcional):**

- En día 1 punto 2: marcar antepretérito como **«literario / poco frecuente»** (ya hay una línea; reforzar).
- En quiz: **máximo 1–2 preguntas** de antepretérito en toda la semana; priorizar presente, imperfecto, pretérito, pluscuamperfecto, condicional.

**Archivos:** `esp-c3-w2-*`, `ing-c3-w2-*` (paridad obligatoria).

---

## W2-07 · Piloto semana 1 en curriculum.json (fuera del alcance)

**Problema:** si `c1-w1-d1-l6-mat` sigue en el consolidado con 7 preguntas y tipos `short`, no cumple METHOD_V1 v1; no forma parte del pack ciclo 3 / semana 2.

**Acción:**

- O **eliminar** el piloto del consolidado (solo week2 en SoT),
- O **actualizar** el piloto a 8 `mcq` y alinear con el contenido vigente si semana 1 ya no se usa.

**Archivos:** `frontend/public/homescool/media/pilot/` (si existe), `curriculum.json`, script de build.

---

## W2-08 · Tests de validación de contenido

**Problema:** `homescool-curriculum.test.ts` solo comprueba carga y una celda; no valida METHOD_V1.

**Acción:** añadir test que para cada clase en `curriculum.json`:

- `quiz.questions.length === day * 8`
- todas `type === "mcq"`
- `answer` ∈ `choices`
- day 1: `kind === "intro"`, 3 points, summary
- day 5: `kind === "review"`, 5 points
- opcional: ningún choice matching `/Colón|solo el pie|firmar la ONU/i` fuera de `his`

**Archivo:** `frontend/src/lib/homescool-curriculum.test.ts`

---

## Checklist post-edición

1. Editar JSON en `frontend/public/homescool/media/week2/`.
2. `node scripts/build-homescool-curriculum.mjs`
3. `cd frontend && npm test` (incluye curriculum test si se añade W2-08).
4. Spot-check PDF preview de 1 celda por materia si hay cambios grandes de layout (opcional).
5. No commitear secretos; no tocar otros sitios del workspace.

## Lo que ya está bien (no tocar sin motivo)

- Estructura METHOD_V1 completa en semana 2.
- `his`: enfoque con pueblos originarios y asimetría del encuentro.
- `esp`/`ing`: diez tiempos con contrastes útiles.
- `exe`: Romanos 1:1–7 con hilo teológico claro.
- `teb`: panorama Génesis → Cristo → nueva tierra.
- `art` + `pro`: práctica y experimento bien enlazados al método clásico.
- `LT`: hitos 8–14 con errores comunes explícitos.
