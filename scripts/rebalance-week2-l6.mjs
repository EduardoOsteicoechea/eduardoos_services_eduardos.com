/**
 * Rebalance week2 level-6 lesson copy: strip forbidden boilerplate, trim over-budget, pad under-budget.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const week2 = path.resolve(__dirname, "../frontend/public/homescool/media/week2");

const BUDGET = {
  d1PointBody: { min: 80, max: 110 },
  d1Summary: { max: 55 },
  d1Total: { min: 280, max: 350 },
  weekRecap: { max: 65 },
  priorDayRecap: { max: 45 },
  deepenBody: { min: 180, max: 260 },
  d5Overview: { max: 38 },
  d5Total: { max: 220 },
};

function wordCount(text) {
  if (!text) return 0;
  return text
    .replace(/[#*]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

function trimToWords(text, maxWords) {
  if (!text || wordCount(text) <= maxWords) return (text || "").trim();
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
    return text.split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");
  }
  return out.join(" ").trim();
}

function stripBoilerplate(text) {
  let t = text || "";
  t = t.replace(/^Hoy vamos a[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Hoy seguimos[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Hoy conocemos[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Hoy ubicamos[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Hoy llegamos[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Hoy aprendemos[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Hoy nos quedamos[^.\n]*\.\s*/gi, "");
  t = t.replace(/\nSigamos juntos\.\s*/gi, "\n");
  t = t.replace(/^Sigamos juntos\.\s*/gi, "");
  t = t.replace(/\bIdea central:\s*/gi, "");
  t = t.replace(/\bExplora:\s*/gi, "");
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
    if (errorIdx >= 0 && errorIdx > practiceIdx) {
      practice = body.slice(practiceIdx, errorIdx).trim();
      error = body.slice(errorIdx).trim();
    } else {
      practice = body.slice(practiceIdx).trim();
    }
  } else if (errorIdx >= 0) {
    ideaExplora = body.slice(0, errorIdx).trim();
    error = body.slice(errorIdx).trim();
  }
  if (practice && !/^Práctica:/i.test(practice)) {
    practice = `Práctica: Ahora te toca a ti. ${practice}`;
  }
  if (error && !/^Error común:/i.test(error)) {
    error = `Error común: ${error}`;
  }
  return { ideaExplora, practice, error };
}

function joinBody(ideaExplora, practice, error) {
  return [ideaExplora, practice, error].map((p) => p.trim()).filter(Boolean).join("\n\n");
}

function fitPointBody(body, maxWords, isOverview = false) {
  let t = stripBoilerplate(body);
  const { ideaExplora, practice, error } = splitBody(t);
  const fixed = wordCount(practice) + wordCount(error) + 2;
  let ieMax = Math.max(15, maxWords - fixed);
  if (isOverview) ieMax = Math.min(ieMax, 22);
  let ie = trimToWords(ideaExplora, ieMax);
  let pr = practice;
  if (!/^Práctica:/i.test(pr)) pr = `Práctica: Ahora te toca a ti. ${pr}`;
  pr = pr.replace(/^Práctica:\s*/i, "Práctica: Ahora te toca a ti. ").replace(/(Ahora te toca a ti\.\s*){2,}/gi, "Ahora te toca a ti. ");
  if (isOverview) {
    pr = "Práctica: Ahora te toca a ti. Di en voz alta la idea clave.";
  }
  let er = error;
  if (!/^Error común:/i.test(er)) er = `Error común: ${er}`;
  if (isOverview) er = `Error común: ${trimToWords(er.replace(/^Error común:\s*/i, ""), 10)}`;
  return joinBody(ie, pr, er);
}

function padExplora(body, addWords, locale = "es") {
  const t = stripBoilerplate(body);
  const { ideaExplora, practice, error } = splitBody(t);
  const extra =
    locale === "en"
      ? "Compare two short examples out loud. Say what changes and what stays the same. Write one sentence in your own words before you start the practice task."
      : "Compara dos ejemplos en voz alta y señala qué cambia y qué se mantiene igual. Escribe una frase corta con tus propias palabras antes de pasar a la práctica.";
  let ie = ideaExplora;
  if (wordCount(ie) < addWords) {
    ie = `${ie}\n\n${extra}`;
  }
  return joinBody(ie, practice, error);
}

function classBand(doc) {
  const L = doc.lesson || {};
  let n = 0;
  for (const p of L.points || []) n += wordCount(p.body);
  if (doc.day === 1 && L.kind === "intro") n += wordCount(L.summary);
  n += wordCount(L.weekRecap);
  n += wordCount(L.priorDayRecap);
  return n;
}

function processDoc(doc) {
  const day = doc.day;
  const kind = doc.lesson?.kind;
  const subject = doc.subject;

  if (doc.lesson?.weekRecap) {
    doc.lesson.weekRecap = trimToWords(stripBoilerplate(doc.lesson.weekRecap), BUDGET.weekRecap.max);
  }
  if (doc.lesson?.priorDayRecap) {
    doc.lesson.priorDayRecap = trimToWords(stripBoilerplate(doc.lesson.priorDayRecap), BUDGET.priorDayRecap.max);
  }
  if (doc.lesson?.summary) {
    doc.lesson.summary = trimToWords(stripBoilerplate(doc.lesson.summary), BUDGET.d1Summary.max);
  }

  const recapWords =
    wordCount(doc.lesson?.weekRecap) + wordCount(doc.lesson?.priorDayRecap);

  for (const p of doc.lesson?.points ?? []) {
    let body = stripBoilerplate(p.body || "");
    if (day === 1 && kind === "intro") {
      p.body = fitPointBody(body, BUDGET.d1PointBody.max);
    } else if (day === 5 && kind === "review" && subject !== "pro") {
      p.body = fitPointBody(body, BUDGET.d5Overview.max, true);
    } else if (day >= 2 && day <= 4) {
      const bodyMax = Math.min(165, Math.max(115, 248 - recapWords));
      p.body = fitPointBody(body, bodyMax);
    } else if (day === 5 && subject === "pro") {
      p.body = fitPointBody(body, 130, false);
    } else {
      p.body = fitPointBody(body, 140);
    }
  }

  if (day === 5 && kind === "review" && subject !== "pro") {
    let total = (doc.lesson.points || []).reduce((s, p) => s + wordCount(p.body), 0);
    while (total > BUDGET.d5Total.max) {
      for (const p of doc.lesson.points) {
        p.body = fitPointBody(p.body, Math.max(28, BUDGET.d5Overview.max - 4), true);
      }
      total = (doc.lesson.points || []).reduce((s, p) => s + wordCount(p.body), 0);
      if (total <= BUDGET.d5Total.max) break;
    }
  }

  let band = classBand(doc);
  const loc = doc.locale || "es";
  if (day >= 2 && day <= 4 && band < BUDGET.deepenBody.min) {
    for (const p of doc.lesson.points) {
      p.body = padExplora(p.body, BUDGET.deepenBody.min, loc);
    }
    band = classBand(doc);
  }
  if (day === 5 && kind === "review" && subject !== "pro" && band < 180) {
    for (const p of doc.lesson.points) {
      if (wordCount(p.body) < 36) p.body = padExplora(p.body, 36, loc);
    }
  }
  if (day === 5 && kind === "review" && subject === "pro" && band < 120) {
    for (const p of doc.lesson.points) {
      p.body = padExplora(p.body, 120, loc);
    }
  }
}

const files = fs.readdirSync(week2).filter((f) => f.endsWith("l6.eoschool.json"));
const report = [];
for (const name of files) {
  const file = path.join(week2, name);
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  if (["teb", "exe"].includes(doc.subject)) continue;
  processDoc(doc);
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  const band = classBand(doc);
  const kind = doc.lesson?.kind;
  const min = kind === "intro" ? BUDGET.d1Total.min : kind === "review" && doc.subject !== "pro" ? 180 : 180;
  const max = kind === "intro" ? BUDGET.d1Total.max : kind === "review" && doc.subject !== "pro" ? BUDGET.d5Total.max : BUDGET.deepenBody.max;
  report.push({
    key: name.replace(".eoschool.json", ""),
    words: band,
    fills: band >= min && band <= max ? "yes" : band >= min - 5 ? "yes*" : "no",
  });
}
console.log(JSON.stringify(report.sort((a, b) => a.key.localeCompare(b.key)), null, 2));
