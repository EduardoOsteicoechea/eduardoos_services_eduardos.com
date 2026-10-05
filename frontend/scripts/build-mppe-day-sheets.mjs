/**
 * MPPE requirements route — day sheets (NOT Homescool eoschool classes).
 * Source: eoschool-mppe-40week-curriculum.json
 *
 * Run: node frontend/scripts/build-mppe-day-sheets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const curriculumPath = path.join(__dirname, "..", "src", "lib", "eoschool-mppe-40week-curriculum.json");
const outDir = path.join(__dirname, "..", "public", "eoschool", "requirements", "curriculum", "day-sheets");

const SECTION_ORDER = [
  { id: "bib", label: "Biblia" },
  { id: "ide", label: "Identidad" },
  { id: "len", label: "Prácticas del Lenguaje" },
  { id: "mat", label: "Matemáticas" },
  { id: "cie", label: "Ciencias Naturales" },
];

function formatTrack(chapters) {
  if (!chapters?.length) return "—";
  const byBook = new Map();
  for (const { book, chapter } of chapters) {
    if (!byBook.has(book)) byBook.set(book, []);
    byBook.get(book).push(chapter);
  }
  const parts = [];
  for (const [book, nums] of byBook) {
    nums.sort((a, b) => a - b);
    parts.push(`${book} ${nums.join(", ")}`);
  }
  return parts.join("; ");
}

function findPlanDay(weeks, dayInPlan) {
  for (const week of weeks) {
    for (const block of week.blocks ?? []) {
      for (const bibleDay of block.bible?.days ?? []) {
        if (bibleDay.dayInPlan === dayInPlan) {
          return { mppeWeek: week.week, block, bibleDay };
        }
      }
    }
  }
  return null;
}

function primaryLearning(refs) {
  if (!refs?.length) return null;
  const r = refs[0];
  return (r.text || r.unitTitle || "").trim() || null;
}

function objectiveFromRefs(refs) {
  if (!refs?.length) return null;
  const titles = [...new Set(refs.map((r) => r.unitTitle).filter(Boolean))];
  const joined = titles.join(" · ").trim();
  return joined || primaryLearning(refs);
}

function clip(text, max = 100) {
  return clipSmart(text, max);
}

/** Truncate without splitting words or leaving dangling «(», ««», etc. */
function clipSmart(text, max = 100) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  let cut = t.slice(0, max - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > Math.floor(max * 0.55)) cut = cut.slice(0, lastSpace);
  for (const [open, close] of [["(", ")"], ["«", "»"]]) {
    const o = cut.lastIndexOf(open);
    const c = cut.lastIndexOf(close);
    if (o > c) cut = cut.slice(0, o).trimEnd();
  }
  if (cut.endsWith("…")) return cut;
  return `${cut}…`;
}

/** Títulos de objetivo MPPE (a menudo largos con paréntesis). */
function clipObjective(text, max = 100) {
  let t = String(text ?? "").replace(/\s+/g, " ").trim();
  const paren = t.indexOf("(");
  if (paren > 8 && paren < max) t = t.slice(0, paren).trim();
  const dash = t.indexOf(" — ");
  if (dash > 8 && dash < max) t = t.slice(0, dash).trim();
  return clipSmart(t, max);
}

const ACTIVITY_MAX_CHARS = 118;

function finalizeActivity(line) {
  let t = clipSmart(String(line ?? ""), ACTIVITY_MAX_CHARS);
  if (!t) return t;
  let open = (t.match(/\(/g) ?? []).length;
  let close = (t.match(/\)/g) ?? []).length;
  while (open > close) {
    const o = t.lastIndexOf("(");
    if (o < 0) break;
    t = t.slice(0, o).trimEnd();
    open = (t.match(/\(/g) ?? []).length;
    close = (t.match(/\)/g) ?? []).length;
  }
  t = t.replace(/\s+([.!?])/g, "$1");
  if (!/[.!?…]$/.test(t)) t += ".";
  return t;
}

/** Official MPPE «aprendizaje» → short phrase for student activities (imperative-friendly). */
function learningActivityPhrase(learning) {
  let t = String(learning ?? "").replace(/\s+/g, " ").trim().replace(/\.+$/, "");
  if (!t) return "";

  const exact = {
    "Se orienta espacialmente": "orientarte en el espacio con puntos de referencia",
    "Ejecuta secuencias de acciones interpretando textos instruccionales":
      "seguir paso a paso las instrucciones de un texto",
  };
  if (exact[t]) return exact[t];

  if (/alimentación saludable/i.test(t) && /grupos de alimentos/i.test(t)) {
    return "grupos de alimentos y comidas saludables";
  }

  if (/alimentación saludable/i.test(t) && /estado óptimo de salud/i.test(t)) {
    return "una alimentación saludable y hábitos que cuidan tu salud";
  }

  if (/biografía de varios personajes/i.test(t)) {
    return "datos clave de la biografía de un personaje destacado";
  }

  let m = t.match(/^Comprende\s+(.+)$/i);
  if (m) {
    let rest = m[1];
    rest = rest.replace(/^qué es\s+/i, "");
    rest = rest.replace(/\s+e\s+identifica\s+/i, "; identifica ");
    rest = rest.replace(/\s+y\s+identifica\s+/i, "; identifica ");
    t = rest.charAt(0).toLowerCase() + rest.slice(1);
    return t;
  }

  m = t.match(/^Reconoce\s+(?:la importancia de\s+)?(.+)$/i);
  if (m) {
    const rest = m[1].charAt(0).toLowerCase() + m[1].slice(1);
    return rest;
  }

  m = t.match(/^Conoce\s+(.+)$/i);
  if (m) {
    let rest = m[1];
    const cut = rest.search(/:\s/);
    if (cut > 0 && cut < 72) rest = rest.slice(0, cut);
    t = rest.charAt(0).toLowerCase() + rest.slice(1);
    return t;
  }

  const verbToInfinitive = [
    [/^Ejecuta\s+/i, "seguir "],
    [/^Registra\s+/i, "registrar "],
    [/^Acude\s+/i, "buscar información "],
    [/^Escribe,?\s+en forma convencional,\s+/i, "escribir "],
    [/^Escribe,?\s+/i, "escribir "],
    [/^Identifica\s+/i, "identificar "],
    [/^Interpreta\s+/i, "interpretar "],
    [/^Lee\s+/i, "leer "],
    [/^Resuelve\s+/i, "resolver "],
    [/^Utiliza\s+/i, "usar "],
    [/^Clasifica\s+/i, "clasificar "],
    [/^Describe\s+/i, "describir "],
    [/^Compara\s+/i, "comparar "],
    [/^Analiza\s+/i, "analizar "],
    [/^Elabora\s+/i, "elaborar "],
    [/^Explica\s+/i, "explicar "],
    [/^Aplica\s+/i, "aplicar "],
  ];
  for (const [re, repl] of verbToInfinitive) {
    if (re.test(t)) {
      t = t.replace(re, repl);
      break;
    }
  }
  if (/^[a-záéíóúñ]/.test(t)) t = t;
  else t = t.charAt(0).toLowerCase() + t.slice(1);
  if (t.length > 72) t = clipSmart(t, 72);
  return t;
}

function sameRefs(a, b) {
  if (!a?.length || !b?.length) return false;
  return a[0].id === b[0].id;
}

/** Rotates templates by calendar week (40) and school day in week (1–5). */
function activityVariantIndex(week, dayInWeek, poolSize) {
  const w = Math.max(1, week | 0);
  const d = Math.min(5, Math.max(1, dayInWeek | 0));
  return ((w - 1) * 5 + (d - 1)) % poolSize;
}

function activityCtx(planDay, week, refs, prevRefs, extra = {}) {
  const dayInWeek = ((planDay - 1) % 5) + 1;
  const isWeekStart = dayInWeek === 1;
  const sameAsPrev = extra.continuing ?? sameRefs(refs, prevRefs);
  const continuing = planDay > 1 && Boolean(sameAsPrev);
  /** Same aprendizaje as ayer, pero lunes = arranque de semana (no “repaso del viernes” en plantilla 0). */
  const effectiveContinuing = continuing && !isWeekStart;
  const learning = extra.learning ?? primaryLearning(refs) ?? "";
  const objective = extra.objective ?? objectiveFromRefs(refs) ?? "";
  const learningActivity = learningActivityPhrase(learning);
  return {
    planDay,
    week,
    dayInWeek,
    isWeekStart,
    isPlanStart: planDay === 1,
    learning,
    objective,
    learningActivity,
    continuing,
    effectiveContinuing,
    clip,
    /** Aprendizaje redactado para actividades (no el enunciado oficial del MPPE). */
    learn: (max) => clip(learningActivity || learning, max),
    obj: (max) => clipObjective(objective, max),
    ...extra,
  };
}

const BIB_WEEKLY = [
  ["Lee las tres pistas en voz alta, con pausas.", "Anota una palabra nueva y su significado."],
  ["Lee en silencio y marca un versículo favorito.", "Comparte en familia por qué te llamó la atención."],
  ["Lee por turnos (adulto/niño) cada pista.", "Dibuja un símbolo que resuma la lectura del día."],
  ["Relee solo la pista del NT y resume en 2 frases.", "Ora o agradece por una enseñanza del pasaje."],
  ["Busca una promesa o mandato en la lectura.", "Escribe cómo aplicarlo hoy en el colegio o casa."],
  ["Subraya nombres y lugares en cada pista.", "Ubica en un mapa mental (libro → idea)."],
  ["Lee con entonación (preguntas, órdenes, relatos).", "Graba tu voz leyendo un versículo corto."],
  ["Compara una idea entre las tres pistas.", "Escribe una pregunta para investigar mañana."],
];

const IDE_WEEKLY = [
  (c) => [
    c.effectiveContinuing
      ? `Semana ${c.week}: repasa «${c.clip(c.ideTitle, 65)}» con un ejemplo local.`
      : `Presenta el eje: ${c.clip(c.ideTitle, 65)}.`,
    `Mapa mental de «${c.clip(c.ideTitle, 50)}»: persona, comunidad y país.`,
  ],
  (c) => [
    `Investiga con un adulto un hecho sobre ${c.clip(c.ideTitle, 55)}.`,
    "Redacta 3 líneas: ayer / hoy / qué puedo hacer yo.",
  ],
  (c) => [
    `Dramatiza una escena breve ligada a ${c.clip(c.ideTitle, 55)}.`,
    "Lista derechos y deberes que aparecen en la escena.",
  ],
  (c) => [
    `Collage o dibujo sobre ${c.clip(c.ideTitle, 55)} (revista o boceto).`,
    "Explica tu collage en 4 frases orales.",
  ],
  (c) => [
    `Entrevista a un familiar: ¿qué recuerda de ${c.clip(c.ideTitle, 45)}?`,
    "Escribe la cita más importante de la entrevista.",
  ],
  (c) => [
    `Compara dos regiones de Venezuela relacionadas con ${c.clip(c.ideTitle, 40)}.`,
    "Tabla: similitudes y diferencias (3 filas).",
  ],
  (c) => [
    `Cartel en hoja carta: valores de ${c.clip(c.ideTitle, 50)}.`,
    "Presenta el cartel en 1 minuto.",
  ],
  (c) => [
    `Lee una noticia corta y conéctala con ${c.clip(c.ideTitle, 45)}.`,
    "Opina: ¿por qué importa para los niños?",
  ],
];

const LEN_WEEKLY = [
  (c) => [
    c.effectiveContinuing
      ? `Semana ${c.week} — repaso oral del tema: ${c.learn(80)}.`
      : `Lee un texto (papel o digital) y practica: ${c.learn(80)}.`,
    "Subraya 5 palabras clave y ordénalas por importancia.",
  ],
  (c) => [
    `Dictado de 6–8 palabras del tema «${c.obj(50)}».`,
    "Corrige, copia la versión final y relee.",
  ],
  (c) => [
    `Inventa un título creativo para un texto sobre ${c.learn(65)}.`,
    "Escribe el párrafo inicial (4–5 líneas).",
  ],
  (c) => [
    `Juego de roles: explica a un compañero imaginario cómo ${c.learn(70)}.`,
    "Anota dos preguntas que te haría el oyente.",
  ],
  (c) => [
    `Organizador gráfico (inicio–nudo–desenlace) del texto sobre ${c.learn(65)}.`,
    "Completa con palabras del texto trabajado.",
  ],
  (c) => [
    `Busca sinónimos/antónimos de 4 palabras de «${c.obj(45)}».`,
    "Úsalos en oraciones propias.",
  ],
  (c) => [
    `Escribe una carta corta donde demuestres: ${c.learn(65)}.`,
    "Incluye saludo, cuerpo y despedida.",
  ],
  (c) => [
    `Redacta 3 instrucciones claras sobre el tema del día («${c.obj(42)}»).`,
    "Intercambia con un adulto: ¿se entiende?",
  ],
];

const MAT_WEEKLY = [
  (c) => [
    c.effectiveContinuing
      ? `Semana ${c.week}: 4 ejercicios en el cuaderno de «${c.obj(40)}».`
      : `Con fichas o dibujos, practica ${c.learn(75)}.`,
    `Unidad «${c.obj(55)}»: explica un ejemplo de tu casa o barrio.`,
  ],
  (c) => [
    `Problema del día (2 pasos) de «${c.obj(40)}»: ${c.learn(55)}.`,
    "Dibuja el procedimiento, no solo el resultado.",
  ],
  (c) => [
    `Estimación rápida antes de calcular (tema: ${c.obj(45)}).`,
    "Compara estimación vs resultado real.",
  ],
  (c) => [
    `Inventa 2 enunciados de «${c.obj(45)}» para practicar ${c.learn(50)}.`,
    "Resuélvelos y explica cada paso en el cuaderno.",
  ],
  (c) => [
    `Geoplano o cuadrícula: dibuja una situación donde ${c.learn(60)}.`,
    "Describe oralmente qué representaste.",
  ],
  (c) => [
    `Patrón numérico o geométrico (5 elementos) de «${c.obj(40)}».`,
    "Predice el siguiente elemento y justifica.",
  ],
  (c) => [
    `Mide objetos de la casa (regla o palmos) y registra.`,
    `Usa las medidas para practicar ${c.learn(55)}.`,
  ],
  (c) => [
    `Completa un procedimiento a medias de «${c.obj(40)}» y corrígelo.`,
    `Comprueba en el cuaderno que lograste ${c.learn(60)}.`,
  ],
];

const CIE_WEEKLY = [
  (c) => [
    c.effectiveContinuing
      ? `Semana ${c.week}: vuelve a observar algo de «${c.obj(45)}».`
      : `En patio o balcón, observa algo relacionado con «${c.obj(45)}».`,
    `Registro: dibujo + 2 datos; escribe qué observaste sobre ${c.learn(55)}.`,
  ],
  (c) => [
    `Demostración o experiencia segura sobre «${c.obj(50)}».`,
    `Anota materiales, pasos y qué aprendiste sobre ${c.learn(55)}.`,
  ],
  (c) => [
    `Clasifica 6 imágenes o tarjetas de «${c.obj(50)}».`,
    `Justifica una clasificación usando: ${c.learn(50)}.`,
  ],
  (c) => [
    `Investiga con un adulto un dato de Venezuela sobre «${c.obj(45)}».`,
    `Relaciónalo con: ${c.learn(55)}.`,
  ],
  (c) => [
    `Diagrama de causa y efecto de «${c.obj(45)}».`,
    `Añade una causa más ligada a ${c.learn(50)}.`,
  ],
  (c) => [
    c.isWeekStart
      ? `Bitácora: primera observación de la semana sobre «${c.obj(45)}».`
      : `Bitácora: observa de nuevo «${c.obj(40)}» y anota un cambio.`,
    `Hipótesis sencilla sobre ${c.learn(55)}.`,
  ],
  (c) => [
    `Maqueta o esquema de «${c.obj(50)}» en cartulina.`,
    `Etiqueta partes según ${c.learn(50)}.`,
  ],
  (c) => [
    `Escribe 3 preguntas «por qué» o «cómo» sobre «${c.obj(45)}».`,
    "Responde una pregunta con un libro o un adulto; anota dos frases.",
  ],
];

function pickWeekly(pool, week, dayInWeek) {
  const i = activityVariantIndex(week, dayInWeek, pool.length);
  return pool[i];
}

function activitiesForSection(sectionId, planDay, week, refs, prevRefs) {
  const dayInWeek = ((planDay - 1) % 5) + 1;

  if (sectionId === "bib") {
    const pair = pickWeekly(BIB_WEEKLY, week, dayInWeek);
    return [...pair];
  }

  if (sectionId === "ide") {
    const ideTitle = refs?.title ?? objectiveFromRefs(refs) ?? "Identidad";
    const dayInWeek = ((planDay - 1) % 5) + 1;
    const ideContinuing =
      planDay > 1 &&
      dayInWeek > 1 &&
      prevRefs &&
      prevRefs.title === refs?.title &&
      (refs?.learnings?.[0] ?? "") === (prevRefs?.learnings?.[0] ?? "");
    const ctx = activityCtx(planDay, week, refs, prevRefs, {
      ideTitle,
      continuing: ideContinuing,
      objective: ideTitle,
      learning: (refs?.learnings ?? []).join(" ") || ideTitle,
    });
    const fn = pickWeekly(IDE_WEEKLY, week, dayInWeek);
    return fn(ctx);
  }

  const ctx = activityCtx(planDay, week, refs, prevRefs);

  if (sectionId === "len") {
    return pickWeekly(LEN_WEEKLY, week, dayInWeek)(ctx);
  }
  if (sectionId === "mat") {
    return pickWeekly(MAT_WEEKLY, week, dayInWeek)(ctx);
  }
  if (sectionId === "cie") {
    return pickWeekly(CIE_WEEKLY, week, dayInWeek)(ctx);
  }

  return [
    `Semana ${week}, día ${dayInWeek}: ${clip(ctx.learning, 80)}.`,
    "Cierra con una frase: «Hoy aprendí…».",
  ];
}

function requireRefsField(sectionId, planDay, value) {
  if (value) return value;
  throw new Error(`plan day ${planDay}: missing MPPE ${sectionId} objective/learning (regenerate 40-week plan)`);
}

function buildDaySheet(planDay, weeks, prevBlock) {
  const ctx = findPlanDay(weeks, planDay);
  if (!ctx) throw new Error(`missing plan day ${planDay}`);
  const { mppeWeek, block, bibleDay } = ctx;
  const ide = block.identity ?? {};
  const bibLearn = [
    `Gén–Ester: ${formatTrack(bibleDay.genEster)}`,
    `Job–Mal: ${formatTrack(bibleDay.jobMal)}`,
    `NT: ${formatTrack(bibleDay.nt)}`,
  ].join(" · ");

  const sections = [
    {
      id: "bib",
      label: "Biblia",
      objective: "Lectura bíblica diaria (tres pistas)",
      learning: bibLearn,
      activities: activitiesForSection("bib", planDay, mppeWeek, null, null).map(finalizeActivity),
    },
    {
      id: "ide",
      label: "Identidad",
      objective: ide.title ?? "Identidad",
      learning: (ide.learnings ?? []).join(" ") || (ide.contenidos ?? []).join("; ") || "—",
      activities: activitiesForSection("ide", planDay, mppeWeek, block.identity, prevBlock?.identity).map(
        finalizeActivity,
      ),
    },
    {
      id: "len",
      label: "Prácticas del Lenguaje",
      objective: requireRefsField("len", planDay, objectiveFromRefs(block.len)),
      learning: requireRefsField("len", planDay, primaryLearning(block.len)),
      activities: activitiesForSection("len", planDay, mppeWeek, block.len, prevBlock?.len).map(finalizeActivity),
    },
    {
      id: "mat",
      label: "Matemáticas",
      objective: requireRefsField("mat", planDay, objectiveFromRefs(block.mat)),
      learning: requireRefsField("mat", planDay, primaryLearning(block.mat)),
      activities: activitiesForSection("mat", planDay, mppeWeek, block.mat, prevBlock?.mat).map(finalizeActivity),
    },
    {
      id: "cie",
      label: "Ciencias Naturales",
      objective: requireRefsField("cie", planDay, objectiveFromRefs(block.cie)),
      learning: requireRefsField("cie", planDay, primaryLearning(block.cie)),
      activities: activitiesForSection("cie", planDay, mppeWeek, block.cie, prevBlock?.cie).map(finalizeActivity),
    },
  ];

  return {
    format: "mppe-curriculum-day",
    version: 2,
    planDay,
    week: mppeWeek,
    grade: "3er grado",
    title: `Día ${planDay}`,
    sections,
  };
}

const curriculum = JSON.parse(fs.readFileSync(curriculumPath, "utf8"));
const total = curriculum.meta?.totalPlanDays ?? 200;
fs.mkdirSync(outDir, { recursive: true });

const manifestDays = [];
let prevBlock = null;
for (let planDay = 1; planDay <= total; planDay++) {
  const ctx = findPlanDay(curriculum.weeks, planDay);
  const sheet = buildDaySheet(planDay, curriculum.weeks, prevBlock);
  prevBlock = ctx?.block ?? prevBlock;
  const fileName = `d${planDay}.mppe-day.json`;
  fs.writeFileSync(path.join(outDir, fileName), `${JSON.stringify(sheet, null, 2)}\n`, "utf8");
  manifestDays.push({
    planDay,
    week: sheet.week,
    jsonUrl: `/eoschool/requirements/curriculum/day-sheets/${fileName}`,
  });
}

const manifest = {
  format: "mppe-curriculum-day-manifest",
  version: 2,
  contentRevision: 5,
  grade: "3er grado",
  totalPlanDays: total,
  planDays: manifestDays,
};
fs.writeFileSync(
  path.join(outDir, "..", "day-sheets-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
console.log("Wrote", total, "MPPE day sheets to", outDir);
