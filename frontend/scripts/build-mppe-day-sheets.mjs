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
  if (!refs?.length) return "Contenido del plan MPPE para este día.";
  const r = refs[0];
  return r.text || r.unitTitle || "—";
}

function objectiveFromRefs(refs) {
  if (!refs?.length) return "—";
  const titles = [...new Set(refs.map((r) => r.unitTitle).filter(Boolean))];
  return titles.join(" · ") || primaryLearning(refs);
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

function activitiesForSection(sectionId, planDay, week, refs, prevRefs) {
  const d = ((planDay - 1) % 5) + 1;
  if (sectionId === "bib") {
    return ["Lee las tres pistas con calma.", "Subraya una idea para compartir en familia."];
  }

  const learning = primaryLearning(refs);
  const objective = objectiveFromRefs(refs);
  const continuing = sameRefs(refs, prevRefs);

  if (sectionId === "ide") {
    const ideTitle = refs?.title ?? objective;
    const ideContinuing =
      prevRefs && prevRefs.title === refs?.title && (refs?.learnings?.[0] ?? "") === (prevRefs?.learnings?.[0] ?? "");
    return [
      ideContinuing
        ? `Repasa «${clip(ideTitle, 70)}» con un ejemplo venezolano del día a día.`
        : `Presenta el foco de identidad: ${clip(ideTitle, 70)}.`,
      "Escribe dos frases: qué significa para ti y qué puedes hacer en tu comunidad.",
    ];
  }

  if (sectionId === "len") {
    const prompts = [
      continuing
        ? `Vuelve a practicar: ${clip(learning, 90)} (lectura o escucha breve).`
        : `Lee o escucha un texto corto ligado a: ${clip(learning, 90)}.`,
      d <= 2 ? "Subraya palabras clave y ordénalas en el cuaderno." : "Redacta 4–6 líneas usando lo trabajado.",
    ];
    return prompts;
  }

  if (sectionId === "mat") {
    return [
      continuing
        ? `Consolida en el cuaderno: ${clip(learning, 90)} (3 ejercicios).`
        : `Explora con material concreto: ${clip(learning, 90)}.`,
      `Unidad MPPE: ${clip(objective, 60)}. Explica un ejemplo con dibujo o esquema.`,
    ];
  }

  if (sectionId === "cie") {
    return [
      continuing
        ? `Profundiza la observación sobre: ${clip(learning, 90)}.`
        : `Observa el entorno y relaciona: ${clip(learning, 90)}.`,
      `Tema: ${clip(objective, 60)}. Registra dibujo + dos preguntas que te surjan.`,
    ];
  }

  return [
    `Día ${planDay} (semana ${week}, 3.er grado): ${clip(learning, 80)}.`,
    "Cierra con una frase: «Hoy aprendí…».",
  ];
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
      objective: objectiveFromRefs(block.len),
      learning: primaryLearning(block.len),
      activities: activitiesForSection("len", planDay, mppeWeek, block.len, prevBlock?.len),
    },
    {
      id: "mat",
      label: "Matemáticas",
      objective: objectiveFromRefs(block.mat),
      learning: primaryLearning(block.mat),
      activities: activitiesForSection("mat", planDay, mppeWeek, block.mat, prevBlock?.mat),
    },
    {
      id: "cie",
      label: "Ciencias Naturales",
      objective: objectiveFromRefs(block.cie),
      learning: primaryLearning(block.cie),
      activities: activitiesForSection("cie", planDay, mppeWeek, block.cie, prevBlock?.cie),
    },
  ];

  return {
    format: "mppe-curriculum-day",
    version: 1,
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
  version: 1,
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
