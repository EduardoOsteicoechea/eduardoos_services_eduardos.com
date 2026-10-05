/**
 * Generates eoschool class JSON for MPPE plan days from eoschool-mppe-40week-curriculum.json
 *
 * Run: node frontend/scripts/build-curriculum-plan-classes.mjs
 * Optional: node frontend/scripts/build-curriculum-plan-classes.mjs 1 50  (inclusive range)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const curriculumPath = path.join(__dirname, "..", "src", "lib", "eoschool-mppe-40week-curriculum.json");
const publicBase = path.join(__dirname, "..", "public", "eoschool", "requirements", "curriculum");

const GRADE_LEVEL = 3;
const CYCLE = 3;

const SUBJECT_FILES = [
  { sectionId: "bib", file: "teb", subject: "teb" },
  { sectionId: "ide", file: "his", subject: "his" },
  { sectionId: "len", file: "LT", subject: "LT" },
  { sectionId: "mat", file: "mat", subject: "mat" },
  { sectionId: "cie", file: "cie", subject: "cie" },
];

function parsePlanDayRange(argv, totalDays) {
  const a = Number.parseInt(argv[2] ?? "1", 10);
  const b = Number.parseInt(argv[3] ?? String(totalDays), 10);
  const start = Number.isFinite(a) ? Math.max(1, a) : 1;
  const end = Number.isFinite(b) ? Math.min(totalDays, b) : totalDays;
  const days = [];
  for (let d = start; d <= end; d++) days.push(d);
  return days;
}

function formatTrack(chapters) {
  if (!chapters?.length) return "";
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

function homescoolDayMeta(planDay) {
  const dayInWeek = ((planDay - 1) % 5) + 1;
  if (dayInWeek === 1) return { day: 1, kind: "intro", focusPoint: null };
  if (dayInWeek === 2) return { day: 2, kind: "deepen", focusPoint: 1 };
  if (dayInWeek === 3) return { day: 3, kind: "deepen", focusPoint: 2 };
  if (dayInWeek === 4) return { day: 2, kind: "deepen", focusPoint: 1 };
  return { day: 3, kind: "deepen", focusPoint: 2 };
}

function quizBlock(homescoolDay, prompts) {
  const mcq1 = prompts?.mcq1 ?? "Elige la respuesta que mejor resume la clase de hoy.";
  const mcq2 = prompts?.mcq2 ?? "¿Qué repasaste de la clase anterior?";
  return {
    questionCount: 4,
    questions: [
      {
        id: `d${homescoolDay}-q1`,
        originDay: 1,
        type: "mcq",
        prompt: mcq1,
        choices: ["Respuesta A", "Respuesta B", "Respuesta C", "Respuesta D"],
        answer: "Respuesta A",
      },
      {
        id: `d${homescoolDay}-q2`,
        originDay: Math.min(2, homescoolDay),
        type: "mcq",
        prompt: mcq2,
        choices: ["Lo de ayer", "Otra cosa", "Nada", "Solo dibujo"],
        answer: "Lo de ayer",
      },
      {
        id: `d${homescoolDay}-q3`,
        originDay: homescoolDay,
        type: "write",
        prompt: prompts?.draw ?? "Dibuja o esquematiza lo principal de hoy.",
        schematic: true,
      },
      {
        id: `d${homescoolDay}-q4`,
        originDay: homescoolDay,
        type: "write",
        prompt: prompts?.write ?? "Escribe con tus palabras lo que aprendiste hoy.",
      },
    ],
  };
}

function baseDoc({ subject, planDay, mppeWeek, title, summary, points, homescoolDay, kind, focusPoint, memoryPhrase }) {
  const lesson = { kind, points, summary };
  if (kind === "intro") lesson.focusPoint = null;
  else lesson.focusPoint = focusPoint;
  if (memoryPhrase) lesson.memoryPhrase = memoryPhrase;
  return {
    format: "eoschool",
    version: 1,
    cycle: CYCLE,
    week: mppeWeek,
    day: homescoolDay,
    level: GRADE_LEVEL,
    subject,
    locale: "es",
    title,
    mppePlanDay: planDay,
    lesson,
    quiz: quizBlock(homescoolDay),
  };
}

function richPoints(areaLabel, refs, planDay) {
  const primary = refs[0];
  const heading = primary?.unitTitle || primary?.text || areaLabel;
  const body = primary?.text || heading;
  const axis = primary?.axis ? ` (${primary.axis})` : "";
  return [
    {
      id: "p1",
      heading: "Apertura — activar conocimientos",
      body: `Hoy en ${areaLabel}${axis}: repasa en voz alta qué aprendiste ayer. Pregunta guía: ¿cómo se conecta con ${heading}?`,
    },
    {
      id: "p2",
      heading: "Exploración — concepto del día",
      body: `${body}\n\nLee el enunciado dos veces. Subraya las palabras clave y explica con un ejemplo de la vida cotidiana (3er grado).`,
    },
    {
      id: "p3",
      heading: "Práctica guiada",
      body: `Resuelve o redacta en tu cuaderno una actividad corta sobre: ${heading}. Si hay más ítems del plan (${refs.length}), elige uno adicional y complétalo.`,
    },
    {
      id: "p4",
      heading: "Cierre y metacognición",
      body: `Completa: «Hoy aprendí que…» y «Me costó…». Plan día ${planDay} · semana ${Math.ceil(planDay / 5)}.`,
    },
  ];
}

function bibleDoc(planDay, ctx) {
  const { mppeWeek, bibleDay } = ctx;
  const ge = formatTrack(bibleDay.genEster);
  const jm = formatTrack(bibleDay.jobMal);
  const nt = formatTrack(bibleDay.nt);
  const { day, kind, focusPoint } = homescoolDayMeta(planDay);
  return baseDoc({
    subject: "teb",
    planDay,
    mppeWeek,
    homescoolDay: day,
    kind,
    focusPoint,
    title: `Día ${planDay} — Lectura bíblica`,
    summary: `Plan 40 semanas · semana ${mppeWeek} · día ${planDay}.`,
    points: [
      { id: "p1", heading: "Pista Gén–Ester", body: `Lee con atención: ${ge}.` },
      { id: "p2", heading: "Pista Job–Mal", body: `Lee: ${jm}.` },
      { id: "p3", heading: "Pista Nuevo Testamento", body: `Lee: ${nt}.` },
    ],
  });
}

function identityDoc(planDay, ctx) {
  const { mppeWeek, block } = ctx;
  const ide = block.identity ?? {};
  const learning = (ide.learnings ?? []).join(" ");
  const contenidos = (ide.contenidos ?? []).join("; ");
  const focus = ide.weekFocus ?? ide.title ?? "Identidad";
  const { day, kind, focusPoint } = homescoolDayMeta(planDay);
  const points = richPoints("Identidad", [{ unitTitle: ide.title, text: learning || focus }], planDay);
  points[1].body = [learning, contenidos ? `Contenido de la semana: ${contenidos}.` : "", points[1].body]
    .filter(Boolean)
    .join("\n\n");
  return baseDoc({
    subject: "his",
    planDay,
    mppeWeek,
    homescoolDay: day,
    kind,
    focusPoint,
    title: `Día ${planDay} — Identidad: ${ide.title ?? "Identidad"}`,
    summary: learning || ide.title || "Identidad MPPE · 3er grado.",
    points,
    memoryPhrase: `Semana ${mppeWeek}: ${focus}`,
  });
}

function refsDoc(planDay, ctx, subject, areaLabel, refs) {
  const { mppeWeek } = ctx;
  const { day, kind, focusPoint } = homescoolDayMeta(planDay);
  const list = refs?.length ? refs : [{ unitTitle: areaLabel, text: `Contenido MPPE del día ${planDay}.` }];
  const points = richPoints(areaLabel, list, planDay);
  const summary = list.map((r) => r.unitTitle || r.text).filter(Boolean).join(" · ");
  return baseDoc({
    subject,
    planDay,
    mppeWeek,
    homescoolDay: day,
    kind,
    focusPoint,
    title: `Día ${planDay} — ${areaLabel}`,
    summary,
    points,
    memoryPhrase: list[0]?.text?.slice(0, 120) ?? summary.slice(0, 120),
  });
}

function buildDayClasses(planDay, weeks) {
  const ctx = findPlanDay(weeks, planDay);
  if (!ctx) throw new Error(`Plan day ${planDay} not found in curriculum JSON`);
  return {
    teb: bibleDoc(planDay, ctx),
    his: identityDoc(planDay, ctx),
    LT: refsDoc(planDay, ctx, "LT", "Prácticas del Lenguaje", ctx.block.len),
    mat: refsDoc(planDay, ctx, "mat", "Matemáticas", ctx.block.mat),
    cie: refsDoc(planDay, ctx, "cie", "Ciencias Naturales", ctx.block.cie),
  };
}

if (!fs.existsSync(curriculumPath)) {
  console.error("Missing", curriculumPath, "— run build-40week-mppe-curriculum.mjs first");
  process.exit(1);
}

const curriculum = JSON.parse(fs.readFileSync(curriculumPath, "utf8"));
const totalDays = curriculum.meta?.totalPlanDays ?? 200;
const PLAN_DAYS = parsePlanDayRange(process.argv, totalDays);
let total = 0;

for (const planDay of PLAN_DAYS) {
  const outDir = path.join(publicBase, `plan-d${planDay}`);
  fs.mkdirSync(outDir, { recursive: true });
  const classes = buildDayClasses(planDay, curriculum.weeks);
  for (const { file } of SUBJECT_FILES) {
    const filePath = path.join(outDir, `${file}.eoschool.json`);
    fs.writeFileSync(filePath, `${JSON.stringify(classes[file], null, 2)}\n`, "utf8");
    total += 1;
  }
}

const allPlanDays =
  PLAN_DAYS.length >= totalDays
    ? Array.from({ length: totalDays }, (_, i) => i + 1)
    : PLAN_DAYS;

const manifest = {
  format: "eoschool-curriculum-plan-classes",
  version: 2,
  grade: "3er grado",
  totalPlanDays: totalDays,
  planDays: allPlanDays.map((planDay) => ({
    planDay,
    mppeWeek: Math.ceil(planDay / 5),
    basePath: `/eoschool/requirements/curriculum/plan-d${planDay}`,
    sections: SUBJECT_FILES.map(({ sectionId, file }) => ({
      sectionId,
      jsonUrl: `/eoschool/requirements/curriculum/plan-d${planDay}/${file}.eoschool.json`,
    })),
  })),
};
fs.writeFileSync(path.join(publicBase, "plan-classes-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log("Wrote", total, "class files for plan days", PLAN_DAYS[0], "–", PLAN_DAYS[PLAN_DAYS.length - 1]);
