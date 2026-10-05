/**
 * Export stratified sample + reviewer prompt for external agent review.
 * Run: node frontend/scripts/export-mppe-20-day-review-sample.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SAMPLE_DAYS, qaDaySheet } from "./mppe-day-activity-engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sheetsDir = path.join(__dirname, "..", "public", "eoschool", "requirements", "curriculum", "day-sheets");
const manifestPath = path.join(sheetsDir, "..", "day-sheets-manifest.json");
const outPath = path.join(__dirname, "..", "..", "temp_test", "mppe-20-day-sample-for-agent-review.txt");

const unique = [...SAMPLE_DAYS].sort((a, b) => a - b);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const revision = manifest.contentRevision ?? manifest.version ?? 7;

const blocks = [];
for (const planDay of unique) {
  const raw = JSON.parse(fs.readFileSync(path.join(sheetsDir, `d${planDay}.mppe-day.json`), "utf8"));
  blocks.push(raw);
}

const prompt = `# Prompt para agente revisor — currículo MPPE (3er grado, 200 días)

## Tu rol
Revisor pedagógico: ¿las actividades encajan con el aprendizaje MPPE del día y con demanda ~3er grado internacional, en 15–20 min (8–12 Biblia)?

## Contexto técnico
- Fuente oficial: plan 40 semanas.
- Generador: \`mppe-day-activity-engine.mjs\` (modo Directo / Apalancado / Fragmentado, \`activityKind\`, \`canDo\`, minutos).
- Revisión de contenido en manifiesto: **contentRevision: ${revision}**.

## Qué revisar
1. Coherencia aprendizaje ↔ actividades (no plantilla genérica desconectada).
2. Redacción al niño (sin pegar el MPPE; glosario \`topicShort\`).
3. Meta \`canDo\` observable; insumos o pasos ejecutables en casa.
4. Biblia / Identidad sensibles (fragmentar, sin discurso adulto).

## Formato de respuesta
Veredicto, fortalezas, debilidades, problemas por día/área si aplica.

---

`;

function fmtDay(sheet) {
  let s = "";
  s += `### Día ${sheet.planDay} — Semana ${sheet.week} — ${sheet.title}\n\n`;
  for (const sec of sheet.sections) {
    s += `**${sec.label} (${sec.id})**\n`;
    s += `- Objetivo: ${sec.objective}\n`;
    s += `- Aprendizaje: ${sec.learning}\n`;
    if (sec.canDo) s += `- Meta (canDo): ${sec.canDo}\n`;
    if (sec.mode) s += `- Modo: ${sec.mode}\n`;
    if (sec.activityKind) s += `- activityKind: ${sec.activityKind}\n`;
    if (sec.minutesEstimate != null) s += `- Minutos estimados: ${sec.minutesEstimate}\n`;
    if (sec.topicShort) s += `- topicShort: ${sec.topicShort}\n`;
    s += `- Actividades:\n`;
    for (const a of sec.activities ?? []) s += `  - ${a}\n`;
    s += "\n";
  }
  s += "---\n\n";
  return s;
}

let body = prompt;
body += `## Días incluidos: ${unique.join(", ")}\n\n`;
for (const sheet of blocks) body += fmtDay(sheet);

const qaFails = blocks.flatMap((s) => qaDaySheet(s));
body += `\n## QA automático (muestra)\nFallos: ${qaFails.length}\n`;
for (const f of qaFails.slice(0, 40)) {
  body += `- d${f.planDay} ${f.section}: ${f.cause}\n`;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, body, "utf8");
console.log("Wrote", outPath);
console.log("Days:", unique.join(", "));
console.log("contentRevision:", revision);
