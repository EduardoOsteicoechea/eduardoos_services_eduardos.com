/**
 * Generates eoschool class JSON for MPPE plan days 1–5 (5 sections each) from
 * frontend/src/lib/eoschool-mppe-28week-curriculum.json
 *
 * Run: node frontend/scripts/build-curriculum-plan-classes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const curriculumPath = path.join(__dirname, "..", "src", "lib", "eoschool-mppe-28week-curriculum.json");
const publicBase = path.join(__dirname, "..", "public", "eoschool", "requirements", "curriculum");

const PLAN_DAYS = [1, 2, 3, 4, 5];
const SUBJECT_FILES = [
  { sectionId: "bib", file: "teb", subject: "teb" },
  { sectionId: "ide", file: "his", subject: "his" },
  { sectionId: "len", file: "LT", subject: "LT" },
  { sectionId: "mat", file: "mat", subject: "mat" },
  { sectionId: "cie", file: "cie", subject: "cie" },
];

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

/** @returns {{ day: number, kind: string, focusPoint: number | null }} */
function homescoolDayMeta(planDay) {
  switch (planDay) {
    case 1:
      return { day: 1, kind: "intro", focusPoint: null };
    case 2:
      return { day: 2, kind: "deepen", focusPoint: 1 };
    case 3:
      return { day: 3, kind: "deepen", focusPoint: 2 };
    case 4:
      return { day: 2, kind: "deepen", focusPoint: 1 };
    case 5:
      return { day: 3, kind: "deepen", focusPoint: 2 };
    default:
      return { day: 3, kind: "deepen", focusPoint: 2 };
  }
}

function quizBlock(homescoolDay) {
  return {
    questionCount: 4,
    questions: [
      {
        id: `d${homescoolDay}-q1`,
        originDay: 1,
        type: "mcq",
        prompt: "Elige la respuesta correcta según la clase.",
        choices: ["Opción A", "Opción B", "Opción C", "Opción D"],
        answer: "Opción A",
      },
      {
        id: `d${homescoolDay}-q2`,
        originDay: Math.min(2, homescoolDay),
        type: "mcq",
        prompt: "¿Qué repasaste en la clase pasada?",
        choices: ["Lo de ayer", "Otra cosa", "Nada", "Solo dibujo"],
        answer: "Lo de ayer",
      },
      {
        id: `d${homescoolDay}-q3`,
        originDay: homescoolDay,
        type: "write",
        prompt: "Dibuja o esquematiza lo principal de hoy.",
        schematic: true,
      },
      {
        id: `d${homescoolDay}-q4`,
        originDay: homescoolDay,
        type: "write",
        prompt: "Escribe con tus palabras lo que aprendiste hoy.",
      },
    ],
  };
}

function baseDoc({ subject, planDay, mppeWeek, title, summary, points, homescoolDay, kind, focusPoint }) {
  const lesson = { kind, points, summary };
  if (kind === "intro") {
    lesson.focusPoint = null;
  } else {
    lesson.focusPoint = focusPoint;
  }
  return {
    format: "eoschool",
    version: 1,
    cycle: 3,
    week: mppeWeek,
    day: homescoolDay,
    level: 6,
    subject,
    locale: "es",
    title,
    mppePlanDay: planDay,
    lesson,
    quiz: quizBlock(homescoolDay),
  };
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
    summary: `Plan 28 semanas · semana ${mppeWeek} · día ${planDay}.`,
    points: [
      { id: "p1", heading: "Pista Gén–Ester", body: `Lee: ${ge}.` },
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
  const { day, kind, focusPoint } = homescoolDayMeta(planDay);
  return baseDoc({
    subject: "his",
    planDay,
    mppeWeek,
    homescoolDay: day,
    kind,
    focusPoint,
    title: `Día ${planDay} — Identidad: ${ide.title ?? "Identidad"}`,
    summary: learning || ide.title || "Identidad MPPE.",
    points: [
      {
        id: "p1",
        heading: ide.title ?? "Identidad",
        body: [learning, contenidos ? `Contenidos: ${contenidos}.` : ""].filter(Boolean).join(" "),
      },
    ],
  });
}

function refsDoc(planDay, ctx, subject, areaLabel, refs) {
  const { mppeWeek } = ctx;
  const { day, kind, focusPoint } = homescoolDayMeta(planDay);
  const points = (refs ?? []).map((r, i) => ({
    id: `p${i + 1}`,
    heading: r.unitTitle || r.axis || areaLabel,
    body: r.text || r.unitTitle || "",
  }));
  if (!points.length) {
    points.push({ id: "p1", heading: areaLabel, body: "Contenido del plan MPPE para este día." });
  }
  return baseDoc({
    subject,
    planDay,
    mppeWeek,
    homescoolDay: day,
    kind,
    focusPoint,
    title: `Día ${planDay} — ${areaLabel}`,
    summary: points.map((p) => p.heading).join(" · "),
    points,
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

const curriculum = JSON.parse(fs.readFileSync(curriculumPath, "utf8"));
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

const manifest = {
  format: "eoschool-curriculum-plan-classes",
  version: 1,
  planDays: PLAN_DAYS.map((planDay) => ({
    planDay,
    basePath: `/eoschool/requirements/curriculum/plan-d${planDay}`,
    sections: SUBJECT_FILES.map(({ sectionId, file }) => ({
      sectionId,
      jsonUrl: `/eoschool/requirements/curriculum/plan-d${planDay}/${file}.eoschool.json`,
    })),
  })),
};
fs.writeFileSync(
  path.join(publicBase, "plan-classes-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log("Wrote", total, "class files for plan days", PLAN_DAYS.join(", "));
