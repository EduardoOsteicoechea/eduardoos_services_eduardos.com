#!/usr/bin/env node
/**
 * Builds one image-generation prompt per published Homescool class (v3) from the class's own
 * `lesson.imageBandInstruction` (the 4 image lines printed at the end of the sheet).
 *
 * Output: docs/homescool-image-prompts.md and docs/homescool-image-prompts.json
 * Template: .cursor/rules/homescool-letter-practice-images-v2.mdc (section v3).
 *
 * Run from the repo root: node scripts/build-homescool-image-prompts.mjs
 */
import fs from "node:fs";
import path from "node:path";

const MEDIA = "frontend/public/homescool/media";

const SUBJECT_LABEL = {
  teb: "Teología bíblica",
  exe: "Exégesis",
  LT: "Línea de tiempo",
  his: "Historia de Venezuela",
  geo: "Geografía",
  art: "Bellas artes",
  mat: "Matemáticas",
  esp: "Español",
  ing: "Inglés",
  lat: "Latín",
  cie: "Ciencias",
  pro: "Proyecto",
  fin: "Finanzas",
};
const ORDER = Object.keys(SUBJECT_LABEL);

const SUBJECT_NOTE = {
  teb: "Materia de fe: imagen sobria, sin representar a Dios; solo símbolos, mapas, líneas de tiempo o manuscritos.",
  exe: "Materia de fe: imagen sobria, sin representar a Dios; solo símbolos, mapas, líneas de tiempo o manuscritos.",
  fin: "La imagen es un registro por completar (tabla de ganancias y ahorros, frascos de dar-ahorrar-gastar, libreta), nunca fajos de dinero llamativos.",
  mat: "Solo la cuadrícula o matriz que pide la hoja; si aparecen números, deben ser correctos.",
};

function buildPrompt(doc) {
  const instr = (doc.lesson?.imageBandInstruction || "").replace(/\s+/g, " ").trim();
  const lines = [
    "Ilustración de hoja de trabajo infantil (niño de 8 años), arte lineal en blanco y negro sobre fondo blanco, trazo limpio y uniforme, sin rellenos sólidos de tinta, sin sombreados oscuros, sin texto que el niño deba leer (solo rótulos cortos si la indicación los pide, en el mismo idioma que la indicación, letra imprenta grande).",
    "Formato: horizontal 203 × 70 mm (relación 2.9 : 1), 2398 × 827 px, JPEG sRGB; contenido importante a ≥ 2 mm de los bordes.",
    `Materia: ${SUBJECT_LABEL[doc.subject] || doc.subject}. Tema de la clase: ${doc.title}.`,
    "Debe mostrar exactamente lo que pide la indicación de la hoja:",
    `«${instr}»`,
    "Deja vacíos (con cajas, líneas punteadas o círculos) los espacios que el niño completará dibujando o escribiendo.",
  ];
  lines.push("Ilustra únicamente el tema de la clase tal como lo pide la indicación. No añadas metáforas, paisajes ni lugares emblemáticos que no estén en la indicación.");
  if (doc.subject === "ing") lines.push("Todos los rótulos van en inglés, tal como están en la indicación.");
  if (SUBJECT_NOTE[doc.subject]) lines.push(SUBJECT_NOTE[doc.subject]);
  lines.push("Sin marcas de agua, sin firmas, sin personas reales identificables.");
  return lines.join("\n");
}

const items = [];
for (const w of [1, 2]) {
  const dir = path.join(MEDIA, `week${w}`);
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith("-l6.eoschool.json")) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    if (!doc.lesson?.imageBandInstruction) {
      console.error(`WARN ${name}: no imageBandInstruction`);
      continue;
    }
    const file = `${doc.subject}-c3-w${doc.week}-d${doc.day}-practice.jpg`;
    items.push({
      file,
      outPath: `${MEDIA}/week${doc.week}/practice-images/${file}`,
      week: doc.week,
      day: doc.day,
      subject: doc.subject,
      title: doc.title,
      instruction: doc.lesson.imageBandInstruction,
      prompt: buildPrompt(doc),
    });
  }
}
items.sort(
  (a, b) => a.week - b.week || ORDER.indexOf(a.subject) - ORDER.indexOf(b.subject) || a.day - b.day,
);

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/homescool-image-prompts.json", JSON.stringify(items, null, 2) + "\n", "utf8");

const md = [
  "# Prompts de imágenes — Homescool ciclo 3 · nivel 6 (semanas 1–2, método v3)",
  "",
  "Generado con `node scripts/build-homescool-image-prompts.mjs` desde `lesson.imageBandInstruction` de cada clase.",
  "Cada imagen: **203 × 70 mm · 2398 × 827 px · JPEG** en `frontend/public/homescool/media/week{N}/practice-images/`.",
  "",
  `Total: ${items.length} imágenes.`,
  "",
];
let lastWeek = 0;
for (const it of items) {
  if (it.week !== lastWeek) {
    md.push(`## Semana ${it.week}`, "");
    lastWeek = it.week;
  }
  md.push(`### ${it.file}`, "", `Clase: ${it.subject} · semana ${it.week} · día ${it.day} · ${it.title}`, "", "```text", it.prompt, "```", "");
}
fs.writeFileSync("docs/homescool-image-prompts.md", md.join("\n"), "utf8");
console.log(`prompts: ${items.length}`);
