import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sheetsDir = path.join(__dirname, "../../public/eoschool/requirements/curriculum/day-sheets");

const STUB_PATTERNS = [
  /Planificación día \d+/i,
  /repasa el día anterior/i,
  /Introduce el objetivo y repasa/i,
];

/** Generic templates that do not name the day’s objective or learning. */
const GENERIC_ACTIVITY_PATTERNS = [
  /ejercicio «falso»/i,
  /^Preguntas científicas: escribe 3/i,
  /^Experimento simple o demostración segura del tema\./i,
  /^Crea 3 preguntas tipo quiz/i,
  /^Maqueta o esquema en cartulina del concepto clave\./i,
];

/** Pasting the official MPPE sentence into an activity (sounds unnatural). */
const AWKWARD_ACTIVITY_PATTERNS = [
  /\bobserva Comprende\b/i,
  /\bmodela Se orienta\b/i,
  /\bsobre: Ejecuta\b/i,
  /\baplicando: Reconoce\b/i,
  /\bRelaciónalo con el aprendizaje del día\./i,
  /\bsobre: Registra por escrito\b/i,
];

function activityIntegrityDefects(act: string): string[] {
  const defects: string[] = [];
  if (act.length > 120) defects.push("too long");
  if (/\w…\w/u.test(act)) defects.push("mid-word ellipsis");
  if (/…{2,}/.test(act)) defects.push("double ellipsis");
  const open = (act.match(/\(/g) ?? []).length;
  const close = (act.match(/\)/g) ?? []).length;
  if (open > close) defects.push("unclosed parenthesis");
  if (/\(los\b/i.test(act) && close <= open && !act.includes("los niños")) {
    if (!/\([^)]+\)/.test(act)) defects.push("dangling (los");
  }
  if (/«[^»]*…/.test(act) && !/«[^»]+»/.test(act)) defects.push("broken guillemet");
  return defects;
}

describe("MPPE day sheets (200 días)", () => {
  it("has no placeholder objectives, learnings, or stub activities", () => {
    const failures: string[] = [];

    for (let planDay = 1; planDay <= 200; planDay++) {
      const file = path.join(sheetsDir, `d${planDay}.mppe-day.json`);
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
        planDay: number;
        sections: Array<{
          id: string;
          objective: string;
          learning: string;
          activities: string[];
        }>;
      };
      const dayInWeek = ((planDay - 1) % 5) + 1;

      for (const section of raw.sections) {
        if (section.objective === "—" || !section.objective?.trim()) {
          failures.push(`d${planDay} ${section.id}: empty objective`);
        }
        if (
          section.learning === "Contenido del plan MPPE para este día." ||
          !section.learning?.trim()
        ) {
          failures.push(`d${planDay} ${section.id}: empty learning`);
        }
        if (!section.canDo?.trim() || !/al terminar puedes/i.test(section.canDo)) {
          failures.push(`d${planDay} ${section.id}: missing canDo`);
        }
        if (section.objective.includes(" · ") && /(.+ · )\1/.test(section.objective)) {
          failures.push(`d${planDay} ${section.id}: duplicated objective segment`);
        }
        for (const act of section.activities ?? []) {
          for (const defect of activityIntegrityDefects(act)) {
            failures.push(`d${planDay} ${section.id}: ${defect}: ${act.slice(0, 80)}`);
          }
          for (const re of STUB_PATTERNS) {
            if (re.test(act)) failures.push(`d${planDay} ${section.id}: stub activity`);
          }
          if (section.id === "mat" || section.id === "cie" || section.id === "len") {
            for (const re of GENERIC_ACTIVITY_PATTERNS) {
              if (re.test(act)) failures.push(`d${planDay} ${section.id}: generic activity`);
            }
            for (const re of AWKWARD_ACTIVITY_PATTERNS) {
              if (re.test(act)) failures.push(`d${planDay} ${section.id}: awkward activity wording`);
            }
          }
          if (planDay === 1 && /\b(repasa|ayer|día anterior)\b/i.test(act) && !/grados anteriores/i.test(act)) {
            failures.push(`d${planDay} ${section.id}: illogical review on first plan day`);
          }
          if (
            dayInWeek === 1 &&
            /\b(repaso oral|repasa el día|qué aprendiste ayer)\b/i.test(act)
          ) {
            failures.push(`d${planDay} ${section.id}: review wording on week start`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
