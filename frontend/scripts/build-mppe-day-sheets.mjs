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
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
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
  return {
    planDay,
    week,
    dayInWeek,
    isWeekStart,
    isPlanStart: planDay === 1,
    learning,
    objective,
    continuing,
    effectiveContinuing,
    clip,
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
      ? `Semana ${c.week} — repaso oral: ${c.clip(c.learning, 85)}.`
      : `Texto nuevo (papel o digital) sobre: ${c.clip(c.learning, 85)}.`,
    "Subraya 5 palabras clave y ordénalas por importancia.",
  ],
  (c) => [
    `Dictado de 6–8 palabras del tema «${c.clip(c.objective, 50)}».`,
    "Corrige, copia la versión final y relee.",
  ],
  (c) => [
    `Inventa un título creativo para un texto de ${c.clip(c.learning, 70)}.`,
    "Escribe el párrafo inicial (4–5 líneas).",
  ],
  (c) => [
    `Juego de roles: explica ${c.clip(c.learning, 75)} a un compañero imaginario.`,
    "Anota dos preguntas que te haría el oyente.",
  ],
  (c) => [
    `Organizador gráfico (inicio–nudo–desenlace) sobre: ${c.clip(c.learning, 75)}.`,
    "Completa con palabras del texto trabajado.",
  ],
  (c) => [
    `Busca sinónimos/antónimos de 4 palabras del tema.`,
    "Úsalos en oraciones propias.",
  ],
  (c) => [
    `Escribe una carta corta aplicando: ${c.clip(c.learning, 70)}.`,
    "Incluye saludo, cuerpo y despedida.",
  ],
  (c) => [
    `Secuencia de instrucciones (3 pasos) sobre ${c.clip(c.objective, 50)}.`,
    "Intercambia con un adulto: ¿se entiende?",
  ],
];

const MAT_WEEKLY = [
  (c) => [
    c.effectiveContinuing
      ? `Semana ${c.week}: 4 ejercicios de ${c.clip(c.learning, 80)} en el cuaderno.`
      : `Concreto: modela ${c.clip(c.learning, 80)} con fichas o dibujos.`,
    `Unidad «${c.clip(c.objective, 55)}»: explica un ejemplo del entorno.`,
  ],
  (c) => [
    `Problema del día (2 pasos) sobre ${c.clip(c.learning, 75)}.`,
    "Dibuja el procedimiento, no solo el resultado.",
  ],
  (c) => [
    `Estimación rápida antes de calcular (${c.clip(c.objective, 45)}).`,
    "Compara estimación vs resultado real.",
  ],
  (c) => [
    `Inventa 2 enunciados de práctica de «${c.clip(c.objective, 45)}» (aplica: ${c.clip(c.learning, 55)}).`,
    "Resuélvelos y explica cada paso en el cuaderno.",
  ],
  (c) => [
    `Geoplano o cuadrícula: representa ${c.clip(c.learning, 65)}.`,
    "Describe oralmente qué dibujaste.",
  ],
  (c) => [
    `Patrón numérico o geométrico (5 elementos) del tema.`,
    "Predice el siguiente elemento y justifica.",
  ],
  (c) => [
    `Mide objetos de la casa (regla o palmos) y registra.`,
    `Relaciona medidas con ${c.clip(c.learning, 60)}.`,
  ],
  (c) => [
    `Completa un procedimiento a medias de «${c.clip(c.objective, 40)}» y corrígelo.`,
    `Comprueba que tu solución cumple: ${c.clip(c.learning, 65)}`,
  ],
];

const CIE_WEEKLY = [
  (c) => [
    c.effectiveContinuing
      ? `Semana ${c.week}: observa de nuevo ${c.clip(c.learning, 80)}.`
      : `Salida al patio/balcón: observa ${c.clip(c.learning, 80)}.`,
    `Registro: dibujo + 2 datos de «${c.clip(c.objective, 50)}».`,
  ],
  (c) => [
    `Demostración o experiencia segura sobre «${c.clip(c.objective, 50)}».`,
    `Anota materiales, pasos y cómo se relaciona con: ${c.clip(c.learning, 60)}.`,
  ],
  (c) => [
    `Clasifica 6 imágenes o tarjetas según ${c.clip(c.objective, 50)}.`,
    "Justifica una clasificación difícil.",
  ],
  (c) => [
    `Investiga con un adulto un dato sobre Venezuela.`,
    "Relaciónalo con el aprendizaje del día.",
  ],
  (c) => [
    `Diagrama de causa y efecto del fenómeno estudiado.`,
    "Añade una causa más que investigar.",
  ],
  (c) => [
    c.isWeekStart
      ? `Bitácora: primera observación de la semana sobre «${c.clip(c.objective, 45)}».`
      : `Bitácora: observa de nuevo «${c.clip(c.objective, 40)}» y anota un cambio.`,
    `Hipótesis sencilla ligada a: ${c.clip(c.learning, 60)}.`,
  ],
  (c) => [
    `Maqueta o esquema de «${c.clip(c.objective, 50)}» en cartulina.`,
    `Etiqueta partes usando ideas de: ${c.clip(c.learning, 55)}.`,
  ],
  (c) => [
    `Escribe 3 preguntas «por qué» o «cómo» sobre «${c.clip(c.objective, 45)}».`,
    `Responde una con libro o adulto, aplicando: ${c.clip(c.learning, 55)}.`,
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
      activities: activitiesForSection("bib", planDay, mppeWeek, null, null),
    },
    {
      id: "ide",
      label: "Identidad",
      objective: ide.title ?? "Identidad",
      learning: (ide.learnings ?? []).join(" ") || (ide.contenidos ?? []).join("; ") || "—",
      activities: activitiesForSection("ide", planDay, mppeWeek, block.identity, prevBlock?.identity),
    },
    {
      id: "len",
      label: "Prácticas del Lenguaje",
      objective: requireRefsField("len", planDay, objectiveFromRefs(block.len)),
      learning: requireRefsField("len", planDay, primaryLearning(block.len)),
      activities: activitiesForSection("len", planDay, mppeWeek, block.len, prevBlock?.len),
    },
    {
      id: "mat",
      label: "Matemáticas",
      objective: requireRefsField("mat", planDay, objectiveFromRefs(block.mat)),
      learning: requireRefsField("mat", planDay, primaryLearning(block.mat)),
      activities: activitiesForSection("mat", planDay, mppeWeek, block.mat, prevBlock?.mat),
    },
    {
      id: "cie",
      label: "Ciencias Naturales",
      objective: requireRefsField("cie", planDay, objectiveFromRefs(block.cie)),
      learning: requireRefsField("cie", planDay, primaryLearning(block.cie)),
      activities: activitiesForSection("cie", planDay, mppeWeek, block.cie, prevBlock?.cie),
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
  contentRevision: 3,
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
