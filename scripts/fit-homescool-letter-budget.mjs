/**
 * Fit Homescool level-6 .eoschool lesson + quiz copy to US Letter word budgets
 * (0.75 cm margin, 2-col class body, --hc-fs 0.89). Preserves ids, mppe, supportUrl, quiz structure.
 *
 * Usage: node scripts/fit-homescool-letter-budget.mjs
 * Then:  node scripts/build-homescool-curriculum.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaRoot = path.resolve(__dirname, "../frontend/public/homescool/media");
const weekDirs = ["week1", "week2"];

const BUDGET = {
  d1PointBody: { target: 80, max: 110 },
  d1Summary: { target: 40, max: 55 },
  weekRecap: { target: 45, max: 65 },
  priorDayRecap: { target: 30, max: 45 },
  deepenBody: { target: 100, max: 140 },
  d5Overview: { target: 40, max: 55 },
  mcqPrompt: { target: 15, max: 22 },
  mcqChoice: { target: 4, max: 10 },
  writePrompt: { target: 28, max: 40 },
};

function walkWeekFiles() {
  const out = [];
  for (const week of weekDirs) {
    const dir = path.join(mediaRoot, week);
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith("l6.eoschool.json")) out.push(path.join(dir, name));
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function wordCount(text) {
  if (!text) return 0;
  return text
    .replace(/[#*]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

function trimToWords(text, maxWords) {
  if (!text || wordCount(text) <= maxWords) return text.trim();
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  let n = 0;
  for (const s of sentences) {
    const w = wordCount(s);
    if (n + w > maxWords && out.length) break;
    out.push(s);
    n += w;
    if (n >= maxWords) break;
  }
  if (!out.length) {
    const words = text.split(/\s+/).filter(Boolean);
    return words.slice(0, maxWords).join(" ");
  }
  return out.join(" ").trim();
}

function stripBoilerplate(text) {
  let t = text;
  t = t.replace(/^Hoy vamos a entender esta idea con calma, paso a paso\.\s*/gi, "");
  t = t.replace(/^Hoy vamos a aprender[^.\n]*\.\s*/gi, "");
  t = t.replace(/\n## Idea clave\n\n/gi, "\n\n");
  t = t.replace(/\n## Más ejemplos\n/gi, "\n\n");
  t = t.replace(/^(Sigamos juntos\.|Vamos a armarlo despacio\.)\s*/gi, "");
  t = t.replace(/\n(Sigamos juntos\.|Vamos a armarlo despacio\.)\s*/gi, "\n");
  t = t.replace(/\bIdea central:\s*/gi, "");
  t = t.replace(/\bExplora:\s*/gi, "");
  t = t.replace(/\bexplora:\s*/gi, "");
  t = t.replace(/Error común:\s*Antes de (?:cerrar, un aviso|terminar, un aviso)\.\s*/gi, "Error común: ");
  t = t.replace(/Antes de terminar, un aviso\.\s*/gi, "");
  t = t.replace(/Esta clase te ayuda a[^.\n]*\.\s*/gi, "");
  t = t.replace(/\nActitud de \*\*cuidado\*\*:[^\n]*\n/gi, "\n");
  t = t.replace(/\nEn la \*\*exposición\*\*,[^\n]*\n/gi, "\n");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

function splitBody(body) {
  const practiceIdx = body.search(/\nPráctica:\s*/i);
  const errorIdx = body.search(/\nError común:\s*/i);
  let ideaExplora = body;
  let practice = "";
  let error = "";
  if (practiceIdx >= 0) {
    ideaExplora = body.slice(0, practiceIdx).trim();
    const rest = body.slice(practiceIdx).trim();
    if (errorIdx >= 0 && errorIdx > practiceIdx) {
      practice = body.slice(practiceIdx, errorIdx).trim();
      error = body.slice(errorIdx).trim();
    } else {
      const m = rest.match(/^(Práctica:[\s\S]*?)(?=Error común:|$)/i);
      practice = m ? m[1].trim() : rest;
      const e = rest.match(/Error común:[\s\S]*$/i);
      error = e ? e[0].trim() : "";
    }
  } else if (errorIdx >= 0) {
    ideaExplora = body.slice(0, errorIdx).trim();
    error = body.slice(errorIdx).trim();
  }
  if (!practice.match(/^Práctica:/i)) {
    practice = practice ? `Práctica: Ahora te toca a ti. ${practice.replace(/^Práctica:\s*/i, "")}` : "";
  }
  if (!error.match(/^Error común:/i) && error) {
    error = `Error común: ${error.replace(/^Error común:\s*/i, "")}`;
  }
  return { ideaExplora, practice, error };
}

function joinBody(ideaExplora, practice, error) {
  const parts = [ideaExplora, practice, error].map((p) => p.trim()).filter(Boolean);
  return parts.join("\n\n");
}

function dedupeExploraBlock(body, sharedBlocks) {
  let t = body;
  for (const block of sharedBlocks) {
    if (block.length < 40) continue;
    const escaped = block.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`\\n*${escaped}`, "g"), "");
  }
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

function collectSharedExploraBlocks(points) {
  const blocks = new Map();
  for (const p of points) {
    const { ideaExplora } = splitBody(stripBoilerplate(p.body || ""));
    const paras = ideaExplora.split(/\n\n+/).map((x) => x.trim()).filter(Boolean);
    for (const para of paras) {
      if (wordCount(para) < 25) continue;
      if (/^1\)|Misma acción|Mira el modelo|Dos palabras:/i.test(para)) {
        blocks.set(para, (blocks.get(para) || 0) + 1);
      }
    }
  }
  return [...blocks.entries()].filter(([, c]) => c >= 2).map(([b]) => b);
}

function fitPointBody(body, maxWords, isOverview = false) {
  let t = stripBoilerplate(body);
  const { ideaExplora, practice, error } = splitBody(t);
  let ie = ideaExplora;
  if (isOverview) {
    ie = trimToWords(ie, Math.min(wordCount(ie), 22));
  }
  const practiceW = wordCount(practice);
  const errorW = wordCount(error);
  const fixed = practiceW + errorW + 4;
  let ieMax = Math.max(20, maxWords - fixed);
  if (isOverview) {
    ieMax = Math.max(15, maxWords - fixed);
  }
  ie = trimToWords(ie, ieMax);
  let pr = practice;
  const practiceWordCap = isOverview ? 14 : 28;
  if (wordCount(pr) > practiceWordCap + 3) {
    pr = trimToWords(pr.replace(/^Práctica:\s*Ahora te toca a ti\.\s*/i, ""), practiceWordCap);
  }
  if (!/^Práctica:/i.test(pr)) pr = `Práctica: Ahora te toca a ti. ${pr}`;
  pr = pr
    .replace(/^Práctica:\s*/i, "Práctica: Ahora te toca a ti. ")
    .replace(/(Ahora te toca a ti\.\s*){2,}/gi, "Ahora te toca a ti. ");
  let er = error;
  if (isOverview) {
    pr = "Práctica: Ahora te toca a ti. Di en voz alta la idea clave.";
    er = `Error común: ${trimToWords(error.replace(/^Error común:\s*/i, ""), 8)}`;
  }
  const errorWordCap = isOverview ? 12 : 22;
  if (wordCount(er) > errorWordCap + 2) er = trimToWords(er.replace(/^Error común:\s*/i, ""), errorWordCap);
  if (!/^Error común:/i.test(er)) er = `Error común: ${er}`;
  let result = joinBody(ie, pr, er);
  for (let i = 0; i < 40 && wordCount(result) > maxWords; i++) {
    if (wordCount(ie) > 8) {
      ie = trimToWords(ie, wordCount(ie) - 1);
    } else {
      const core = pr.replace(/^Práctica:\s*Ahora te toca a ti\.\s*/i, "");
      if (wordCount(core) > 4) {
        pr = `Práctica: Ahora te toca a ti. ${trimToWords(core, wordCount(core) - 1)}`;
      } else if (wordCount(er.replace(/^Error común:\s*/i, "")) > 4) {
        er = `Error común: ${trimToWords(er.replace(/^Error común:\s*/i, ""), wordCount(er) - 2)}`;
      } else break;
    }
    result = joinBody(ie, pr, er);
  }
  return result;
}

function fitRecap(text, maxWords) {
  if (!text) return text;
  return trimToWords(stripBoilerplate(text), maxWords);
}

function shortenChoice(choice) {
  if (!choice || wordCount(choice) <= BUDGET.mcqChoice.max) return choice.trim();
  const words = choice.replace(/[#*]/g, "").split(/\s+/).filter(Boolean);
  if (words.length <= BUDGET.mcqChoice.max) return words.join(" ");
  return words.slice(0, BUDGET.mcqChoice.max).join(" ");
}

function fitQuizQuestion(q) {
  if (q.type === "mcq") {
    if (q.prompt) q.prompt = trimToWords(q.prompt.replace(/\s+/g, " ").trim(), BUDGET.mcqPrompt.max);
    if (Array.isArray(q.choices)) {
      q.choices = q.choices.map(shortenChoice);
      if (q.answer) q.answer = q.choices.find((c) => c === q.answer || c.startsWith(q.answer.slice(0, 8))) ?? shortenChoice(q.answer);
    }
    for (const c of q.choices || []) {
      if (c && /^Respuesta:/i.test(c)) q.choices[q.choices.indexOf(c)] = c.replace(/^Respuesta:\s*/i, "");
    }
  }
  if (q.type === "write" && q.prompt) {
    q.prompt = trimToWords(q.prompt.replace(/\s+/g, " ").trim(), BUDGET.writePrompt.max);
  }
}

function processDoc(doc) {
  const day = doc.day;
  const kind = doc.lesson?.kind;
  const subject = doc.subject;
  const points = doc.lesson?.points ?? [];

  const sharedExplora = collectSharedExploraBlocks(points);
  let pointIdx = 0;
  for (const p of points) {
    let body = p.body || "";
    if (pointIdx > 0 && sharedExplora.length) {
      body = dedupeExploraBlock(body, sharedExplora);
    }
    if (day === 1 && kind === "intro") {
      p.body = fitPointBody(body, BUDGET.d1PointBody.max);
    } else if (day === 5 && kind === "review") {
      const max = subject === "pro" ? 90 : BUDGET.d5Overview.max;
      p.body = fitPointBody(body, max, true);
    } else if (day >= 2 && day <= 4) {
      p.body = fitPointBody(body, BUDGET.deepenBody.max);
    } else {
      p.body = fitPointBody(body, BUDGET.deepenBody.max);
    }
    pointIdx += 1;
  }

  if (doc.lesson?.summary) {
    doc.lesson.summary = fitRecap(doc.lesson.summary, day === 1 ? BUDGET.d1Summary.max : 55);
  }
  if (doc.lesson?.weekRecap) {
    doc.lesson.weekRecap = fitRecap(doc.lesson.weekRecap, BUDGET.weekRecap.max);
  }
  if (doc.lesson?.priorDayRecap) {
    doc.lesson.priorDayRecap = fitRecap(doc.lesson.priorDayRecap, BUDGET.priorDayRecap.max);
  }
  if (doc.lesson?.memoryPhrase) {
    doc.lesson.memoryPhrase = trimToWords(doc.lesson.memoryPhrase, 35);
  }

  for (const q of doc.quiz?.questions ?? []) {
    fitQuizQuestion(q);
  }

  if (day === 5 && kind === "review" && subject !== "pro") {
    capDay5ReviewTotals(doc);
  }
}

/** Day 5 lesson + expo band: keep five overview bodies within 220 words total. */
function capDay5ReviewTotals(doc) {
  const points = doc.lesson?.points ?? [];
  if (!points.length) return;
  const hardPer = 38;
  for (const p of points) {
    p.body = fitPointBody(p.body, hardPer, true);
  }
  let total = points.reduce((s, p) => s + wordCount(p.body), 0);
  if (total <= 220) return;
  for (const p of points) {
    p.body = fitPointBody(p.body, 34, true);
  }
}

function auditFile(file, doc) {
  const issues = [];
  const day = doc.day;
  const kind = doc.lesson?.kind;
  if (day === 1 && kind === "intro") {
    for (const p of doc.lesson.points || []) {
      const n = wordCount(p.body);
      if (n > BUDGET.d1PointBody.max) issues.push({ type: "d1-point", n, h: p.heading });
    }
    const tot =
      wordCount((doc.lesson.points || []).map((p) => p.body).join(" ")) + wordCount(doc.lesson.summary);
    if (tot > 350) issues.push({ type: "d1-total", n: tot });
  }
  if (day >= 2 && day <= 4) {
    if (doc.lesson.weekRecap && wordCount(doc.lesson.weekRecap) > BUDGET.weekRecap.max) {
      issues.push({ type: "weekRecap", n: wordCount(doc.lesson.weekRecap) });
    }
    if (doc.lesson.priorDayRecap && wordCount(doc.lesson.priorDayRecap) > BUDGET.priorDayRecap.max) {
      issues.push({ type: "prior", n: wordCount(doc.lesson.priorDayRecap) });
    }
    for (const p of doc.lesson.points || []) {
      if (wordCount(p.body) > BUDGET.deepenBody.max) issues.push({ type: "deepen", n: wordCount(p.body), h: p.heading });
    }
  }
  if (day === 5) {
    let tot = 0;
    for (const p of doc.lesson.points || []) {
      const n = wordCount(p.body);
      tot += n;
      if (n > BUDGET.d5Overview.max && doc.subject !== "pro") issues.push({ type: "d5-point", n, h: p.heading });
    }
    if (tot > 220 && doc.subject !== "pro") issues.push({ type: "d5-total", n: tot });
  }
  return issues;
}

const files = walkWeekFiles();
let processed = 0;
const allIssues = [];

for (const file of files) {
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  processDoc(doc);
  // Second pass: aggressive if still over hard max
  let issues = auditFile(file, doc);
  if (issues.length) {
    for (const p of doc.lesson?.points ?? []) {
      const day = doc.day;
      let max = BUDGET.deepenBody.max;
      if (day === 1) max = BUDGET.d1PointBody.max;
      if (day === 5) max = doc.subject === "pro" ? 85 : BUDGET.d5Overview.max;
      if (wordCount(p.body) > max) {
        p.body = fitPointBody(p.body, max - 5, day === 5);
      }
    }
    issues = auditFile(file, doc);
  }
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  processed += 1;
  if (issues.length) allIssues.push({ file: path.basename(file), issues });
}

console.log(
  JSON.stringify(
    {
      processed,
      remainingFilesWithIssues: allIssues.length,
      sample: allIssues.slice(0, 15),
    },
    null,
    2,
  ),
);
