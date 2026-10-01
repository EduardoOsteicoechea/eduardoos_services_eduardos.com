/**
 * Trim Homescool l6 quizzes to 12 items: 8 mcq + 4 write.
 * Day 1: 8 mcq (originDay 1) + 4 write.
 * Days 2–5: 2 review mcq + 6 today mcq + 4 write.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const media = path.join(root, "frontend/public/homescool/media");

function trimQuiz(doc) {
  const day = Number(doc.day) || 1;
  const qs = Array.isArray(doc.quiz?.questions) ? doc.quiz.questions : [];
  const mcq = qs.filter((q) => String(q.type || "").toLowerCase() === "mcq");
  const write = qs.filter((q) => String(q.type || "").toLowerCase() === "write");

  let keptMcq;
  if (day <= 1) {
    keptMcq = mcq.filter((q) => Number(q.originDay) === 1).slice(0, 8);
    if (keptMcq.length < 8) keptMcq = mcq.slice(0, 8);
  } else {
    const review = mcq.filter((q) => Number(q.originDay) !== day).slice(0, 2);
    const today = mcq.filter((q) => Number(q.originDay) === day).slice(0, 6);
    keptMcq = [...review, ...today];
    // Fallback if originDay tags are sparse.
    if (keptMcq.length < 8) {
      const used = new Set(keptMcq.map((q) => q.id));
      for (const q of mcq) {
        if (keptMcq.length >= 8) break;
        if (!used.has(q.id)) keptMcq.push(q);
      }
    }
  }

  const keptWrite = write.slice(0, 4);
  const next = [...keptMcq.slice(0, 8), ...keptWrite.slice(0, 4)];
  doc.quiz = {
    ...(doc.quiz || {}),
    questionCount: next.length,
    questions: next,
  };
  return {
    before: qs.length,
    after: next.length,
    mcq: keptMcq.length,
    write: keptWrite.length,
  };
}

let files = 0;
let trimmed = 0;
for (const week of ["week1", "week2"]) {
  const dir = path.join(media, week);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".eoschool.json"))) {
    const fp = path.join(dir, name);
    const doc = JSON.parse(fs.readFileSync(fp, "utf8"));
    const r = trimQuiz(doc);
    files += 1;
    if (r.before !== r.after) trimmed += 1;
    fs.writeFileSync(fp, `${JSON.stringify(doc, null, 2)}\n`);
    if (r.after !== 12 || r.mcq !== 8 || r.write !== 4) {
      console.warn(`warn ${name}: after=${r.after} mcq=${r.mcq} write=${r.write}`);
    }
  }
}
console.log(`trim-quiz-to-12: files=${files} changed=${trimmed}`);
