/**
 * Rewrite the 40-week plan from day 38. Days 1–37 stay byte-for-byte in content.
 * Run: node frontend/scripts/redistribute-grade3-from-day-38.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { redistributeGrade3FromDay38 } from "./grade3-redistribute.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const curriculumPath = path.join(__dirname, "..", "src", "lib", "eoschool-mppe-40week-curriculum.json");
const curriculum = JSON.parse(fs.readFileSync(curriculumPath, "utf8"));
redistributeGrade3FromDay38(curriculum);
fs.writeFileSync(curriculumPath, `${JSON.stringify(curriculum, null, 2)}\n`, "utf8");
const day38 = curriculum.weeks
  .flatMap((week) => week.blocks)
  .find((block) => block.bible?.days?.[0]?.dayInPlan === 38);
console.log("day 38", day38?.calendarDate, day38?.dayKind, day38?.holidayName ?? "");
console.log("schoolYearEnd", curriculum.meta.schoolYearEnd);
console.log("holidays", curriculum.meta.holidays.length);
