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
        for (const act of section.activities ?? []) {
          for (const re of STUB_PATTERNS) {
            if (re.test(act)) failures.push(`d${planDay} ${section.id}: stub activity`);
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
