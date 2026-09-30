# Análisis: integrar MPPE 3.er grado en los temas centrales de Homescool

**Fuentes**

- Marco MPPE: `marco_programatico_mppe_y_tercer_grado.md`
- Currículo vivo: `frontend/public/homescool/curriculum.json` (ciclo 3, semanas 1–2, nivel 6 ≈ 8 años)
- Método: `.cursor/skills/eoschool/METHOD_V1.md` (intro → deepen → review; 12 materias; `teb`/`exe` en pausa)

**Pregunta de este documento**  
No es «reemplazar Homescool por el MPPE», sino: **qué objetivos MPPE de 3.er grado se pueden imbuir en los temas semanales que ya tenemos**, y **cómo cambiaría cada clase** sin romper la pedagogía eoschool.

---

## 1. Tesis de integración

### 1.1 Compatibilidad de edad y tramo

Nivel Homescool **6 (≈ 8 años)** coincide con el tramo MPPE **1.º–3.º** (base sólida). Eso permite usar el 3.er grado MPPE como **checklist de cobertura nacional**, no como plantilla de reemplazo de títulos.

### 1.2 Dos capas (no mezclar)

| Capa | Qué es | Qué no es |
| --- | --- | --- |
| **A. Tema semanal Homescool** | El hilo que el niño memoriza 5 días (p. ej. «tablas 1–12», «cuatro tejidos») | Un listado MPPE entero |
| **B. Objetivos MPPE imbuidos** | Ejemplos, contextos, prácticas, vocabulario y micro-tareas que cumplen aprendizajes esperados del MPPE **dentro** del tema A | Cambiar el tema central cada día |

Regla operativa: **el `title` / tres puntos de la semana se mantienen**; cambian `body`, `Práctica`, ejemplos venezolanos, puentes entre materias y, a veces, 1–2 ítems de quiz.

### 1.3 Principio de «imbuir»

Imbuir = insertar en Idea central / Explora / Práctica / Error común:

1. un **contexto venezolano o comunitario** (cuando el MPPE lo pide),
2. una **práctica social del lenguaje** (leer para…, escribir para…, oralidad),
3. un **gesto científico** (observar, clasificar, medir, registrar),
4. un **gesto ciudadano/identitario** (territorio, pueblos, símbolos, convivencia),

…sin convertir la clase en un manifiesto ni en un segundo currículo paralelo.

### 1.4 Lo que no se imbuye a la fuerza

- Contenidos MPPE que chocan con el eje clásico-cristiano de Homescool o con `teb`/`exe` en pausa: se **aplazan** a semanas futuras o se tratan solo como geografía/historia factual.
- Objetivos de 4.º–6.º (compás, fracciones formales, etc.): fuera de alcance de estas dos semanas.
- Sustituir Latín / Línea de tiempo mundial / Bellas artes OiLS por solo «Identidad MPPE»: **no**. Esos ejes son identidad del producto.

---

## 2. Mapa materia Homescool ↔ área MPPE

| Homescool | Área MPPE más cercana | Tipo de imbuición natural |
| --- | --- | --- |
| `mat` | Matemáticas | Operaciones, medidas, geometría vía ejemplos, estadística en proyecto |
| `esp` / `ing` | Prácticas del Lenguaje | Sustantivo/adjetivo, oraciones, lectura con propósito, escritura funcional |
| `lat` | Prácticas del Lenguaje (metalenguaje) + Identidad (origen de palabras) | Puente léxico; no fuerza contenido MPPE histórico |
| `his` | Identidad (historia de Venezuela) | Pueblos, viajes, períodos — alta afinidad |
| `geo` | Identidad (territorio) + Lenguaje (mapas) | Superficie, estados, capitales, Caribe — alta afinidad |
| `LT` | Identidad (períodos / comunicación en el tiempo) + Lenguaje (orden temporal) | Línea de tiempo como práctica de «pasado y presente» |
| `cie` | Ciencias Naturales | Cuerpo/salud hoy; plantas/mezclas/biodiversidad en semanas futuras |
| `art` | Matemáticas (formas) + Identidad (cultura) + Lenguaje (reseñas) | Geometría vivida; motivos venezolanos opcionales |
| `pro` | Ciencias (CTS, energía-materia) + Lenguaje (instrucciones) + Matemática (datos) | Experimento = práctica científica + texto instruccional |
| `teb` / `exe` | *(pausa)* | No rediseñar hasta reactivar; el MPPE no las sustituye |

---

## 3. Temas centrales actuales (SoT = curriculum publicado)

> Nota: la tabla de temas en `METHOD_V1.md` a veces diverge del pack publicado (p. ej. `his` semana 1). Aquí manda **`curriculum.json`**.

### Semana 1

| Materia | Tema central publicado |
| --- | --- |
| `mat` | Multiplicar con las tablas del 1 al 12 |
| `esp` | Las nueve clases de palabras |
| `ing` | Spanish verbs: -ar, -er, and -ir *(mismo hilo gramatical que `esp` en inglés)* |
| `lat` | Palabras cortas que muestran relaciones (preposiciones) |
| `his` | Los primeros pueblos de Venezuela |
| `LT` | Línea de tiempo: pueblos antiguos |
| `geo` | Venezuela: fronteras, límites y regiones |
| `cie` | Los cuatro tejidos del cuerpo |
| `art` | Dibujar con OiLS: formas sencillas |
| `pro` | El disco que parece guiñar (persistencia de la visión) |
| `teb` / `exe` | *(existen en pack; UI pausada)* |

### Semana 2

| Materia | Tema central publicado |
| --- | --- |
| `mat` | Tablas del 5 al 16 |
| `esp` | Cuatro formas de armar oraciones |
| `ing` | Spanish verb times: one word or two? |
| `lat` | et, ut y non |
| `his` | Primeros viajes españoles a Venezuela |
| `LT` | Historia en orden: maravillas y reinos antiguos |
| `geo` | Cuatro estados y sus capitales de Venezuela |
| `cie` | Huesos que cuidan tu cuerpo |
| `art` | Dibujos espejo paso a paso |
| `pro` | Una gota que parece lupa |
| `teb` / `exe` | Génesis / Romanos 1:2 *(pausados en UI)* |

---

## 4. Objetivos MPPE que sí se pueden imbuir (por tema)

Leyenda de cobertura: **Directo** (casi el aprendizaje esperado tal cual) · **Parcial** (mismo dominio, otro foco) · **Puente** (solo ejemplo/contexto) · **Futuro** (no cabe en este tema).

### 4.1 Matemáticas (`mat`)

| Objetivo MPPE 3.º | Sem. 1 tablas 1–12 | Sem. 2 tablas 5–16 | Cómo imbuir |
| --- | --- | --- | --- |
| Multiplicación (unidad seguida de cero; cálculos con 2 dígitos) | **Parcial** | **Parcial** | Mantener tablas; añadir en d4/d5 problemas ×10 / ×100 y «dos dígitos × un dígito» con dinero o cantidades locales |
| Números naturales / valor posicional hasta 10 000 | **Puente** | **Puente** | En Explora: leer cantidades del problema en cartel de valores (sin cambiar el tema a «valor posicional») |
| Adición/sustracción hasta 10 000 | **Futuro** / **Puente** | igual | Solo si un problema de tablas pide total/resta de grupos |
| Geometría (polígono, ángulo, rectas…) | **Puente** vía `art` | **Puente** | No forzar en `mat` esta semana; o 1 problema «lados de un polígono ×…» |
| Medidas y moneda nacional | **Puente** | **Puente** | Problemas con bolívares / medidas de cocina en Práctica |
| Estadística (pictogramas, barras) | **Puente** vía `pro` | **Puente** | Registrar 5 ensayos del experimento en tabla/pictograma |

**Cambio de clase (mat):** el título y los 3 puntos (memorizar tablas) **no cambian**. Cambia el **contexto de la Práctica** (problemas verbales venezolanos + ×10) y 2–4 preguntas de quiz de aplicación.

### 4.2 Español / Inglés (`esp` / `ing`)

| Objetivo MPPE 3.º (Lenguaje) | Sem. 1 clases de palabras | Sem. 2 oraciones / tiempos | Cómo imbuir |
| --- | --- | --- | --- |
| Diferenciar sustantivo/adjetivo; concordancia | **Directo** | **Parcial** | Sem. 1: pares «niña talentosa / camisa marrón» con ejemplos locales; sem. 2: concordancia dentro de oraciones |
| Singular/plural; género | **Parcial** | **Parcial** | Micro-práctica al final de un deepen |
| Ordenar palabras → oraciones (Bolívar, Caracas, Araguaney…) | **Puente** | **Directo** | Sem. 2: bancos de palabras con contenido venezolano del `his`/`geo` de la semana |
| Leer para informarse / biografías / noticias | **Puente** | **Puente** | 1 texto corto (biografía Simón Rodríguez / noticia local) como Explora, sin reemplazar gramática |
| Escribir listas, carteles, normas; planificar cuento | **Puente** | **Puente** | Práctica: cartel de normas del salón / lista de estados / mini-reseña |
| Metáforas, curiosidades (palíndromos), palabras compuestas | **Futuro** o **Puente** | igual | Un «juego de la semana» en d5, no el tema |
| Oralidad: diálogo, refranes, narrar | **Puente** | **Puente** | memoryPhrase + tarea oral al adulto: «explica con un refrán…» |

**Cambio de clase (esp/ing):** estructura intro/deepen/review **igual**. Se enriquecen ejemplos y 1 práctica social del lenguaje por día. `ing` sigue el mismo syllabus gramatical, con glosas EN; los ejemplos venezolanos pueden quedar en ES en `esp` y traducidos/adaptados en `ing` cuando el propósito sea léxico cultural.

### 4.3 Historia (`his`) + Geografía (`geo`) + LT

| Objetivo MPPE Identidad 3.º | Sem. 1 | Sem. 2 | Cómo imbuir |
| --- | --- | --- | --- |
| Períodos: indígena, colonial, republicano agrícola/petrolero | **Parcial** (`his` pueblos) | **Parcial** (viajes → umbral colonial) | Nombrar el período sin convertir la semana en «todos los períodos» |
| Resistencia indígena / cacicazgo / liderazgos | **Directo** en `his` s1 | **Puente** | Ampliar 1 punto o ejemplos de líderes (sin diluir el hilo de pueblos) |
| Viajes / encuentro (juventud Bolívar es otro grado-tema) | **Puente** | **Directo** (`his` viajes) | Sem. 2 ya está alineada; añadir mapa + fuentes («cómo sabemos esto») |
| Superficie, estados, capitales, Caracas | **Parcial** (`geo` fronteras/regiones) | **Directo** (`geo` estados) | Sem. 1: regiones Costa-montaña / Llanos / Guayana; sem. 2: capitales + Caracas |
| Mar Caribe, ciclones, agua potable | **Puente** en `geo` s1 | **Puente** | Un párrafo Explora + 1 quiz |
| Planos del entorno / comunidad | **Puente** | **Puente** | Práctica: croquis casa→escuela (también sirve Matemáticas/geometría) |
| Símbolos patrios, moneda, mestizaje, maestros | **Futuro** / **Puente** | igual | No forzar; 1 mención en d5 si cabe |
| LT mundial (imperios, maravillas) | **Puente** a «comunicación en el tiempo» / escalas temporales | igual | Mantener eje mundial; añadir ancla «mientras en Venezuela…» (1 frase) |

**Cambio de clase (his/geo/LT):** máxima afinidad. Cambios = **densificar hechos MPPE dentro del mismo título**, unificar vocabulario con Lenguaje (ordenar oraciones con esos hechos), y exigir lectura de mapa cada día de `geo`.

### 4.4 Ciencias (`cie`) + Proyecto (`pro`)

| Objetivo MPPE Ciencias 3.º | Sem. 1 tejidos | Sem. 2 huesos | `pro` s1/s2 | Cómo imbuir |
| --- | --- | --- | --- | --- |
| Salud / alimentación Venezuela | **Futuro** | **Futuro** | **Puente** | No cabe en tejidos/huesos; planificar semana «trompo de alimentos» después |
| Mezclas homogéneas/heterogéneas | **Futuro** | **Futuro** | **Parcial** | `pro` gota-lupa / líquidos: nombrar mezcla y observación |
| Biodiversidad / agua / clima | **Futuro** | **Futuro** | **Puente** | Fuera de estas semanas |
| Plantas / fotosíntesis | **Futuro** | **Futuro** | — | Semana futura |
| Energía en la comunidad | **Futuro** | **Futuro** | **Puente** | Relacionar luz/visión del disco o lente con «uso de energía» en 1 frase |
| Fuerza de gravedad | **Futuro** | **Futuro** | **Puente** | Solo si un experimento lo usa |
| Procesos: observar, preguntar, hipótesis, registrar, comunicar | **Directo** vía método + `pro` | **Directo** | **Directo** | Explicitar en Idea central del `pro` el ciclo científico escolar MPPE |
| Cuerpo / cuidado (salud integral, tramo primario) | **Parcial** | **Parcial** | — | Tejidos/huesos = cuidado del cuerpo; añadir hábito (postura, protección) en Error común |

**Cambio de clase (cie):** tema biomédico se **conserva** (es más avanzado/específico que el MPPE 3.º de plantas/mezclas). Imbuir solo el **marco de procesos** y el **cuidado del cuerpo**. Los grandes temas MPPE de 3.º (alimentación, mezclas, plantas, biodiversidad, gravedad) deben ser **semanas nuevas**, no remiendos.

**Cambio de clase (`pro`):** día 1 ya explica el experimento; imbuir (a) texto instruccional «leer para hacer», (b) tabla de datos, (c) oralidad de exposición d5 con fórmulas sociales.

### 4.5 Arte (`art`) + Latín (`lat`)

| Objetivo MPPE | Sem. 1 OiLS | Sem. 2 espejo | Latín | Cómo imbuir |
| --- | --- | --- | --- | --- |
| Geometría: círculo/circunferencia, rectas, polígonos, simetría | **Parcial** (O/i/L/S) | **Directo** (simetría espejo) | — | Nombrar en vocabulario geométrico MPPE sin matar OiLS |
| Cultura venezolana / mestizaje (motivos) | **Puente** | **Puente** | — | Motivo opcional: flor de mayo, chinchorro, fachada colonial — 1 de 3 puntos máx. |
| Lengua: reseña, caligrafía artística | **Puente** | **Puente** | — | d5: mini-reseña del dibujo |
| Latín como metalenguaje | — | — | **Puente** | Relacionar *et/ut/non* con cohesión en `esp`; no forzar Identidad |

---

## 5. Cómo cambiaría cada tipo de clase (plantilla operativa)

Aplicar a **todas** las materias activas (1–10), sin tocar la arquitectura METHOD_V1.

### Día 1 — Intro (3 puntos)

| Elemento | Hoy | Con MPPE imbuido |
| --- | --- | --- |
| Título / 3 headings | Tema semanal | **Igual** |
| Idea central | Define el concepto | + 1 ancla MPPE (período, mapa, propósito de lectura, o proceso científico) en **un** punto, no en los tres |
| Explora | Ejemplos genéricos | Preferir ejemplos VE / del entorno / del `his`/`geo` de la misma semana |
| Práctica | Tarea del tema | Misma tarea + **propósito social** («para el mural», «para explicar en casa», «para el croquis») |
| Quiz | 8 ítems del tema | 6–7 del tema + 1–2 de aplicación MPPE (mapa, ×10, sustantivo-adjetivo del texto de la semana) |

### Días 2–4 — Deepen

| Elemento | Cambio |
| --- | --- |
| weekRecap / priorDayRecap | Incluir la ancla MPPE en 1 frase del recap |
| Re-enseñanza del punto | Igual profundidad; ejemplos rotan a contexto venezolano o al puente con otra materia |
| Práctica | Una de las tres deepen-prácticas de la semana debe ser **práctica social del lenguaje** o **registro de datos** |
| Quiz acumulativo | Insertar 1 ítem «puente» cada día (máx.), sin desplazar la memorización del tema |

### Día 5 — Review (5 panoramas)

| Bloque | Cambio |
| --- | --- |
| 1 Panorama del tema | Añadir: «Esta semana también practicamos [gesto MPPE]: …» |
| 2–4 Puntos | Síntesis; 1 ejemplo VE por punto |
| 5 Síntesis final | Checklist infantil de 3 logros: (tema Homescool) + (1 MPPE) + (1 hábito: cuidado / ciudadanía / lectura) |
| Quiz | Mantener shuffle; asegurar ≥2 ítems de aplicación contextual |

### `pro` (excepción METHOD)

| Día | Cambio con MPPE |
| --- | --- |
| 1 | Explicitar observación → pregunta → prueba → registro → explicación (procesos Ciencias) |
| 2–4 | Bitácora: tabla o pictograma (Estadística); instrucciones leídas (Lenguaje «leer para hacer») |
| 5 | Expo: oralidad (fórmulas sociales + explicar resultado); opcional croquis del montaje (geometría/localización) |

---

## 6. Cambio concreto por clase (semanas 1–2)

Formato: **qué se conserva** · **qué se añade** · **impacto**.

### 6.1 Semana 1

#### `mat` — Tablas 1–12
- **Conserva:** memorización 1–12, layout de letter.
- **Añade:** problemas ×10 con precios/cantidades; leer «tres mil…» en un problema; 1 pictograma de «cuántas veces practiqué».
- **Impacto:** bajo en redacción; medio en quiz de aplicación.

#### `esp` — Nueve clases de palabras
- **Conserva:** las nueve clases como tema.
- **Añade:** énfasis MPPE en sustantivo/adjetivo + concordancia; bancos de palabras de `his`/`geo` (cacique, frontera, región); 1 práctica «ordenar 4 palabras → oración» sobre pueblos de Venezuela.
- **Impacto:** medio — alinea fuerte con Lenguaje 3.º sin cambiar el título.

#### `ing` — Verbos -ar/-er/-ir
- **Conserva:** conjugaciones en inglés meta-lenguaje.
- **Añade:** mismos ejemplos culturales traducidos cuando se use vocabulario de la semana; no importar refranes ES al cuerpo EN.
- **Impacto:** bajo.

#### `lat` — Preposiciones de relación
- **Conserva:** in/apud/per/sine/a/de.
- **Añade:** 1 oración puente con topónimo (in Venezuela / per flumen Orinoco) solo si no fuerza anacronismo absurdo.
- **Impacto:** mínimo.

#### `his` — Primeros pueblos de Venezuela
- **Conserva:** pueblos como tema.
- **Añade:** vocabulario MPPE (resistencia, cacicazgo, líderes); ubicar en período **indígena**; contraste breve «comunicación oral / petroglifos / hoy».
- **Impacto:** alto valor MPPE Identidad; casi sin fricción.

#### `LT` — Pueblos antiguos (mundial)
- **Conserva:** eje mundial.
- **Añade:** frase ancla diaria «En la misma franja de tiempo, en el territorio que hoy es Venezuela…» (sin convertir LT en his VE).
- **Impacto:** bajo; coherencia Identidad «pasado y presente».

#### `geo` — Fronteras, límites y regiones
- **Conserva:** fronteras/regiones.
- **Añade:** tres conjuntos regionales productivos (Costa-montaña, Llanos, Guayana); Caribe; 1 croquis; lectura de mapa cada día.
- **Impacto:** alto — cubre gran parte de Identidad/territorio 3.º.

#### `cie` — Cuatro tejidos
- **Conserva:** epitelial, conectivo, muscular, nervioso.
- **Añade:** marco de observación/cuidado del cuerpo; **no** forzar alimentación/plantas.
- **Impacto:** bajo respecto a checklist MPPE 3.º (el gap queda para semanas nuevas).

#### `art` — OiLS
- **Conserva:** O, i, L, S.
- **Añade:** nombrar círculo/recta/ángulo en voz geométrica; motivo venezolano opcional en 1 práctica.
- **Impacto:** bajo–medio (geometría vivida).

#### `pro` — Disco que guiña
- **Conserva:** experimento de persistencia de visión.
- **Añade:** ciclo científico explícito; instrucciones numeradas; tabla de ensayos; expo oral d5.
- **Impacto:** medio — cumple procesos Ciencias + Lenguaje instruccional + Estadística básica.

### 6.2 Semana 2

#### `mat` — Tablas 5–16
- Igual estrategia que s1; subir dificultad a × dos dígitos y totales con dinero.

#### `esp` — Cuatro formas de oraciones
- **Añade:** ordenar palabras → oraciones con hechos de viajes/`geo`; interrogativas/exclamativas con signos (MPPE); planificar 3 oraciones para un mini-relato del viaje de 1498–99.

#### `ing` — Tiempos (una / dos palabras)
- Conserva syllabus; ejemplos de «history sentences» alineados a `his` s2.

#### `lat` — et, ut, non
- Puente cohesión con `esp` (coordinación); impacto mínimo MPPE.

#### `his` — Primeros viajes españoles
- **Añade:** umbral período colonial; fuentes («diario, mapa, relato»); nombres/fechas ya presentes + lectura de costa en mapa (puente `geo`).
- **Impacto:** alto Identidad.

#### `LT` — Maravillas y reinos
- Misma ancla VE de una frase; no saturar.

#### `geo` — Estados y capitales
- **Directo** MPPE «conoce superficie, estados y capitales; Caracas». Añadir 1 dato de frontera/Caribe en d1.

#### `cie` — Huesos
- Cuidado del cuerpo + observación; gap MPPE plantas/mezclas sigue pendiente.

#### `art` — Espejo
- **Directo** simetría (geometría MPPE); vocabulario eje/simetría.

#### `pro` — Gota lupa
- Nombrar mezcla/medio transparente; registro; «leer para hacer»; comunicar resultado.

---

## 7. Matriz de cobertura MPPE 3.º con solo s1–s2 (tras imbuir)

| Bloque MPPE 3.º | Cobertura si se imbuye s1–s2 | Acción |
| --- | --- | --- |
| Mat: multiplicación aplicada | Media | Imbuir problemas |
| Mat: valor posicional / + − grandes | Baja | Semanas futuras |
| Mat: geometría formal | Media vía `art` | Semana geometría o densificar art |
| Mat: medidas / moneda | Baja–media | Problemas + `pro` |
| Mat: estadística | Media vía `pro` | Bitácora obligatoria |
| Cie: alimentación VE | Nula | **Nueva semana** |
| Cie: mezclas | Baja (`pro`) | **Nueva semana** o rediseñar un `pro` |
| Cie: biodiversidad / agua | Nula | **Nueva semana** |
| Cie: plantas | Nula | **Nueva semana** |
| Cie: energía comunitaria | Nula | Futuro |
| Cie: gravedad | Nula | Futuro / un `pro` |
| Cie: procesos científicos | Alta vía `pro`+método | Imbuir lenguaje del proceso |
| Identidad: pueblos / viajes | Alta (`his`) | Imbuir |
| Identidad: territorio / estados | Alta (`geo`) | Imbuir |
| Identidad: Bolívar juventud, Zamora, petróleo, símbolos… | Baja | Semanas futuras de `his` |
| Identidad: sociedad/ciudadanía/normas | Baja | `esp` normas + hábitos de clase |
| Lenguaje: gramática básica | Alta (`esp`) | Imbuir |
| Lenguaje: lectura con propósito / biografías / noticias | Media | 1 texto/semana |
| Lenguaje: escritura social / oralidad / refranes | Media | Prácticas + d5 |

Conclusión de cobertura: **con solo imbuir s1–s2 se fortalece Identidad (his/geo), Lenguaje (esp) y procesos científicos (`pro`)**. Queda un **hueco grande** en Ciencias Naturales temáticas de 3.º (alimentación, mezclas, plantas, biodiversidad) y en tramos de Identidad no tocados (Bolívar joven, nación agrícola/petrolera, símbolos).

---

## 8. Cómo cambiaría «cada clase» en el sentido del producto (checklist de edición)

Para **cada** celda `.eoschool` de s1–s2 (materias activas):

1. **No renombrar** `title` ni los 3 `heading` del intro (salvo corrección factual).
2. En **exactamente un** `points[].body` del día, insertar ancla MPPE (VE / mapa / propósito / proceso).
3. Reescribir **Práctica** para que tenga destinatario o propósito («para el mapa del salón», «para explicar a mamá»).
4. Añadir o sustituir **1 pregunta de quiz** de aplicación contextual (mantener conteos METHOD).
5. En `memoryPhrase` (materias que lo usan): una línea memorable que mezcle tema + ancla («Tejido nervioso lleva mensajes; cuido mi cuerpo al…»).
6. En `pro` d2–d4: plantilla fija de bitácora (fecha, qué vi, qué medí, dibujo).
7. En d5: panorama 1 menciona el gesto MPPE de la semana.
8. Rebuild `curriculum.json` + sync Mongo (METHOD dual storage).

Estimación de esfuerzo: **ligero** (1–2 h/materia/semana) si solo se imbuye; **alto** si se abren semanas nuevas de Ciencias/Identidad.

---

## 9. Estrategia recomendada (fases)

### Fase A — Imbuir sin nuevos temas (rápido)
Semanas 1–2 actuales: aplicar secciones 5–6. Prioridad: `his`, `geo`, `esp`, `pro`, `art` (simetría), luego `mat` (problemas).

### Fase B — Semanas nuevas MPPE-first (cobertura real de Ciencias 3.º)
Diseñar semanas ciclo 3 posteriores cuyo **tema central** sea ya el MPPE, sin abandonar el método:

| Semana futura (ej.) | `cie` | `pro` | Puentes |
| --- | --- | --- | --- |
| Alimentación VE / trompo | Grupos de alimentos, platos típicos | Cocina-segura / clasificación | `esp` receta instruccional; `mat` medidas cocina |
| Mezclas | Homo/heterogéneas, separación | Experimento de separación | `esp` informe; `mat` tabla |
| Plantas / fotosíntesis | Partes, reproducción | Siembra / observación | `art` dibujo botánico OiLS |
| Biodiversidad y agua | Ecosistemas locales | Monitoreo de uso de agua | `geo` cuencas; `esp` noticia |

### Fase C — Identidad espiral
Alternar semanas `his`/`geo` ya al estilo Homescool con hitos MPPE aún faltantes (Bolívar Monte Sacro, Zamora/Castro, símbolos, comunidad), siempre 1 tema/semana memorizable.

### Fase D — Auditoría
Mantener una tabla viva: aprendizaje MPPE 3.º → `c3-wN-subject` → evidencias (punto, práctica, quiz id).

---

## 10. Riesgos y salvaguardas

| Riesgo | Salvaguarda |
| --- | --- |
| Sobrecargar al niño con doble currículo | Máx. 1 ancla MPPE explícita por día |
| Perder eje clásico (LT mundial, latín, OiLS) | Esos temas no se sustituyen; solo reciben puentes |
| Contenido político-identitario denso | Hechos + mapas + pueblos + cuidado; tono infantil METHOD/spec 009 |
| `cie` actual «no parece 3.º MPPE» | Aceptar: es enriquecimiento; cobertura MPPE cie va en Fase B |
| Divergencia METHOD_V1 vs curriculum.json | Actualizar tabla de temas METHOD tras imbuir |
| `teb`/`exe` pausados | No usarlos como vehículo MPPE hasta reactivar |

---

## 11. Respuesta corta

- **Sí se puede integrar** el MPPE dentro de los temas centrales actuales **por imbuición** (ejemplos VE, prácticas sociales del lenguaje, mapas, bitácora científica, problemas ×10/moneda), **sin renombrar** las semanas 1–2.
- **Donde más cambia cada clase:** `Práctica`, 1 ancla en Idea central/Explora, 1 quiz contextual, d5 con gesto MPPE — la cáscara intro/deepen/review se queda.
- **Donde no basta imbuir:** Ciencias 3.º (alimentación, mezclas, plantas, biodiversidad, gravedad) e Identidad avanzada → **nuevas semanas** con esos temas como centro.
- **Homescool sigue siendo Homescool:** el MPPE se vuelve checklist de cobertura y fuente de contextos, no el motor de títulos.

---

## 12. Próximo paso sugerido (cuando se pida ejecutar)

1. Elegir Fase A materias prioritarias (`his`, `geo`, `esp`, `pro`).
2. Editar celdas week1/week2 según checklist §8.
3. Actualizar `METHOD_V1.md` temas si los títulos/énfasis cambian.
4. Abrir backlog Fase B (4 semanas Ciencias MPPE).

*Documento de análisis — no modifica aún las celdas `.eoschool`.*
