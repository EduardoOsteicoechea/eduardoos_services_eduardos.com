/**
 * MPPE requirements route — day sheets (NOT Homescool eoschool classes).
 * Source: eoschool-mppe-40week-curriculum.json
 *
 * Run: node frontend/scripts/build-mppe-day-sheets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSectionPack,
  dedupeObjectiveTitle,
  qaDaySheet,
  SAMPLE_DAYS,
} from "./mppe-day-activity-engine.mjs";

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

function emitSectionActivities(sectionId, planDay, week, refs, prevRefs, extra = {}) {
  const ctx = activityCtx(planDay, week, refs, prevRefs, extra);
  const pack = buildSectionPack(sectionId, {
    planDay,
    week,
    learning: ctx.learning,
    learningPhrase: ctx.learningActivity,
    objective: ctx.objective,
    ideTitle: extra.ideTitle,
    finalizeActivity,
    exposition: Boolean(extra.exposition),
  });
  const qaFails = qaDaySheet({
    planDay,
    sections: [
      {
        id: sectionId,
        learning: ctx.learning,
        canDo: pack.canDo,
        mode: pack.mode,
        activityKind: pack.kind,
        minutesEstimate: pack.minutesEstimate,
        activities: pack.activities,
      },
    ],
  });
  if (qaFails.length) {
    console.warn(`QA warn d${planDay} ${sectionId}:`, qaFails.map((f) => f.cause).join(", "));
  }
  return pack;
}

function requireRefsField(sectionId, planDay, value) {
  if (value) return value;
  throw new Error(`plan day ${planDay}: missing MPPE ${sectionId} objective/learning (regenerate 40-week plan)`);
}

function sectionFromPack(id, label, objective, learning, pack, exposition) {
  const baseLabel = exposition && id !== "bib" ? `${label} · Exposición` : label;
  const bibLabel = exposition && id === "bib" ? "Biblia · Exposición" : label;
  return {
    id,
    label: id === "bib" ? bibLabel : baseLabel,
    objective,
    learning,
    canDo: pack.canDo,
    mode: pack.mode,
    activityKind: pack.kind,
    minutesEstimate: pack.minutesEstimate,
    topicShort: pack.topicShort,
    activities: pack.activities,
  };
}

function buildDaySheet(planDay, weeks, prevBlock) {
  const ctx = findPlanDay(weeks, planDay);
  if (!ctx) throw new Error(`missing plan day ${planDay}`);
  const { mppeWeek, block, bibleDay } = ctx;
  const scheduled =
    block.scheduledSections?.length > 0
      ? block.scheduledSections
      : SECTION_ORDER.map((s) => s.id);
  const exposition = block.dayKind === "exposition";
  const ide = block.identity ?? {};
  const bibLearn = [
    `Gén–Ester: ${formatTrack(bibleDay.genEster)}`,
    `Job–Mal: ${formatTrack(bibleDay.jobMal)}`,
    `NT: ${formatTrack(bibleDay.nt)}`,
  ].join(" · ");

  const ideTitle = dedupeObjectiveTitle(ide.title ?? "Identidad");
  const ideLearning = (ide.learnings ?? []).join(" ") || (ide.contenidos ?? []).join("; ") || "—";
  const expoExtra = exposition ? { exposition: true } : {};

  const builders = {
    bib: () => {
      const pack = emitSectionActivities("bib", planDay, mppeWeek, null, null, expoExtra);
      const objective = exposition
        ? "Exposición bíblica (repaso de la semana)"
        : "Lectura bíblica diaria (tres pistas)";
      const learning = exposition
        ? `Prepara una exposición breve sobre la lectura de la semana. ${bibLearn}`
        : bibLearn;
      return sectionFromPack("bib", "Biblia", objective, learning, pack, exposition);
    },
    ide: () => {
      if (!block.identity) {
        throw new Error(`plan day ${planDay}: ide scheduled but identity missing`);
      }
      const pack = emitSectionActivities("ide", planDay, mppeWeek, block.identity, prevBlock?.identity, {
        ideTitle,
        objective: ideTitle,
        learning: ideLearning,
        ...expoExtra,
      });
      const objective = exposition ? `Exposición · ${ideTitle}` : ideTitle;
      const learning = exposition
        ? `Prepara una exposición sobre el foco de Identidad de la semana: ${ideLearning}`
        : ideLearning;
      return sectionFromPack("ide", "Identidad", objective, learning, pack, exposition);
    },
    len: () => {
      const pack = emitSectionActivities("len", planDay, mppeWeek, block.len, prevBlock?.len, expoExtra);
      const objective = requireRefsField(
        "len",
        planDay,
        dedupeObjectiveTitle(objectiveFromRefs(block.len)),
      );
      const learning = requireRefsField("len", planDay, primaryLearning(block.len));
      return sectionFromPack(
        "len",
        "Prácticas del Lenguaje",
        exposition ? `Exposición · ${objective}` : objective,
        exposition ? `Prepara una exposición sobre: ${learning}` : learning,
        pack,
        exposition,
      );
    },
    mat: () => {
      if (!block.mat?.length) {
        throw new Error(`plan day ${planDay}: mat scheduled but refs missing`);
      }
      const pack = emitSectionActivities("mat", planDay, mppeWeek, block.mat, prevBlock?.mat, expoExtra);
      const objective = requireRefsField(
        "mat",
        planDay,
        dedupeObjectiveTitle(objectiveFromRefs(block.mat)),
      );
      const learning = requireRefsField("mat", planDay, primaryLearning(block.mat));
      return sectionFromPack(
        "mat",
        "Matemáticas",
        exposition ? `Exposición · ${objective}` : objective,
        exposition ? `Prepara una exposición sobre: ${learning}` : learning,
        pack,
        exposition,
      );
    },
    cie: () => {
      if (!block.cie?.length) {
        throw new Error(`plan day ${planDay}: cie scheduled but refs missing`);
      }
      const pack = emitSectionActivities("cie", planDay, mppeWeek, block.cie, prevBlock?.cie, expoExtra);
      const objective = requireRefsField(
        "cie",
        planDay,
        dedupeObjectiveTitle(objectiveFromRefs(block.cie)),
      );
      const learning = requireRefsField("cie", planDay, primaryLearning(block.cie));
      return sectionFromPack(
        "cie",
        "Ciencias Naturales",
        exposition ? `Exposición · ${objective}` : objective,
        exposition ? `Prepara una exposición sobre: ${learning}` : learning,
        pack,
        exposition,
      );
    },
  };

  const sections = [];
  for (const id of scheduled) {
    const build = builders[id];
    if (!build) throw new Error(`plan day ${planDay}: unknown section ${id}`);
    sections.push(build());
  }

  return {
    format: "mppe-curriculum-day",
    version: 3,
    planDay,
    week: mppeWeek,
    grade: "3er grado",
    title: exposition ? `Día ${planDay} · Exposiciones` : `Día ${planDay}`,
    dayKind: exposition ? "exposition" : "teach",
    scheduledSections: scheduled,
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
  version: 3,
  contentRevision: 8,
  grade: "3er grado",
  weeklyPattern: curriculum.meta?.weeklyPattern ?? null,
  totalPlanDays: total,
  planDays: manifestDays,
};
fs.writeFileSync(
  path.join(outDir, "..", "day-sheets-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
console.log("Wrote", total, "MPPE day sheets to", outDir);

const sampleFailures = [];
let sampleSectionCount = 0;
for (const planDay of SAMPLE_DAYS) {
  const file = path.join(outDir, `d${planDay}.mppe-day.json`);
  const sheet = JSON.parse(fs.readFileSync(file, "utf8"));
  sampleSectionCount += sheet.sections?.length ?? 0;
  sampleFailures.push(...qaDaySheet(sheet));
}
const samplePass = sampleSectionCount > 0 ? 1 - sampleFailures.length / sampleSectionCount : 1;
console.log(
  `QA sample (${SAMPLE_DAYS.length} days, ${sampleSectionCount} sections): ${(samplePass * 100).toFixed(1)}% pass; failures=${sampleFailures.length}`,
);
if (sampleFailures.length && sampleFailures.length <= 30) {
  for (const f of sampleFailures) console.warn(`  d${f.planDay} ${f.section}: ${f.cause}`);
}
if (samplePass < 0.95) {
  console.error("Sample QA below 95% — fix engine before publishing.");
  process.exitCode = 1;
}
