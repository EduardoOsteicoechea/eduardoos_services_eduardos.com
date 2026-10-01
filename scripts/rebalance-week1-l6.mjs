/**
 * Rebalance week1 level-6 lesson copy: strip forbidden boilerplate, trim over-budget, pad under-budget.
 * Adapted from scripts/rebalance-week2-l6.mjs with Practice/Common mistake for locale:en.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const week1 = path.resolve(__dirname, "../frontend/public/homescool/media/week1");

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
  t = t.replace(/^Hoy profundizaremos[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Hoy profundizamos[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Hoy practicamos[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Hoy cierras[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Today we walk through this idea step by step\.\s*/gi, "");
  t = t.replace(/^Today we stay on[^.\n]*\.\s*/gi, "");
  t = t.replace(/\nSigamos juntos\.\s*/gi, "\n");
  t = t.replace(/^Sigamos juntos\.\s*/gi, "");
  t = t.replace(/^Sigamos con[^.\n]*\.\s*/gi, "");
  t = t.replace(/^Let's keep going together\.\s*/gi, "");
  t = t.replace(/\bIdea central:\s*/gi, "");
  t = t.replace(/\bMain idea:\s*/gi, "");
  t = t.replace(/\bExplora:\s*/gi, "");
  t = t.replace(/\bexplore:\s*/gi, "");
  t = t.replace(/##\s*Key idea\s*/gi, "");
  t = t.replace(/\bLa La la\b/gi, "La");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

function practiceLabel(locale) {
  return locale === "en" ? "Practice: Your turn." : "Práctica: Ahora te toca a ti.";
}

function errorLabel(locale) {
  return locale === "en" ? "Common mistake:" : "Error común:";
}

function splitBody(body, locale = "es") {
  const prRe = locale === "en" ? /\nPractice:\s*/i : /\nPráctica:\s*/i;
  const erRe = locale === "en" ? /\nCommon mistake:\s*/i : /\nError común:\s*/i;
  // Also accept Spanish labels in en docs (legacy)
  const practiceIdx = Math.max(body.search(/\nPráctica:\s*/i), body.search(/\nPractice:\s*/i));
  const errorIdx = Math.max(body.search(/\nError común:\s*/i), body.search(/\nCommon mistake:\s*/i));
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
  const pl = practiceLabel(locale);
  const el = errorLabel(locale);
  if (practice && !/^(Práctica:|Practice:)/i.test(practice)) {
    practice = `${pl} ${practice}`;
  }
  if (error && !/^(Error común:|Common mistake:)/i.test(error)) {
    error = `${el} ${error}`;
  }
  return { ideaExplora, practice, error };
}

function joinBody(ideaExplora, practice, error) {
  return [ideaExplora, practice, error].map((p) => p.trim()).filter(Boolean).join("\n\n");
}

function normalizePractice(practice, locale, isOverview) {
  const pl = practiceLabel(locale);
  let pr = practice || "";
  pr = pr.replace(/^(Práctica:|Practice:)\s*/i, `${pl} `);
  pr = pr.replace(/(Ahora te toca a ti\.\s*){2,}/gi, "Ahora te toca a ti. ");
  pr = pr.replace(/(Your turn\.\s*){2,}/gi, "Your turn. ");
  if (!/^(Práctica:|Practice:)/i.test(pr)) pr = `${pl} ${pr}`.trim();
  if (isOverview) {
    pr =
      locale === "en"
        ? "Practice: Your turn. Say the key idea out loud."
        : "Práctica: Ahora te toca a ti. Di en voz alta la idea clave.";
  }
  // Drop empty practice tails
  if (/^(Práctica: Ahora te toca a ti\.|Practice: Your turn\.)\s*$/i.test(pr)) {
    pr =
      locale === "en"
        ? "Practice: Your turn. Write one clear example in your notebook."
        : "Práctica: Ahora te toca a ti. Escribe un ejemplo claro en tu cuaderno.";
  }
  return pr;
}

function normalizeError(error, locale, isOverview) {
  const el = errorLabel(locale);
  let er = error || "";
  er = er.replace(/^(Error común:|Common mistake:)\s*/i, `${el} `);
  if (!/^(Error común:|Common mistake:)/i.test(er)) er = `${el} ${er}`.trim();
  if (/^(Error común:|Common mistake:)\s*$/i.test(er)) {
    er =
      locale === "en"
        ? "Common mistake: Mixing two different ideas in one answer."
        : "Error común: Mezclar dos ideas distintas en una sola respuesta.";
  }
  if (isOverview) {
    const rest = er.replace(/^(Error común:|Common mistake:)\s*/i, "");
    er = `${el} ${trimToWords(rest, 12)}`;
  }
  return er;
}

function fitPointBody(body, maxWords, locale = "es", isOverview = false) {
  let t = stripBoilerplate(body);
  const { ideaExplora, practice, error } = splitBody(t, locale);
  let pr = normalizePractice(practice, locale, isOverview);
  let er = normalizeError(error, locale, isOverview);
  const fixed = wordCount(pr) + wordCount(er) + 2;
  let ieMax = Math.max(15, maxWords - fixed);
  if (isOverview) ieMax = Math.min(ieMax, 28);
  let ie = trimToWords(ideaExplora, ieMax);
  return joinBody(ie, pr, er);
}

const EXTRA_ES = [
  "Compara dos ejemplos en voz alta y señala qué cambia y qué se mantiene igual.",
  "Escribe una frase corta con tus propias palabras antes de pasar a la práctica.",
  "Repite la idea clave sin mirar el texto y comprueba si faltó algún detalle importante.",
  "Enseña el punto a alguien en casa con un ejemplo nuevo inventado por ti.",
];
const EXTRA_EN = [
  "Compare two short examples out loud. Say what changes and what stays the same.",
  "Write one sentence in your own words before you start the practice task.",
  "Say the key idea without looking, then check whether any important detail is missing.",
  "Teach this point to someone at home with a new example you invent.",
];

function padExplora(body, targetIdeaWords, locale = "es") {
  const t = stripBoilerplate(body);
  const { ideaExplora, practice, error } = splitBody(t, locale);
  const extras = locale === "en" ? EXTRA_EN : EXTRA_ES;
  let ie = ideaExplora.replace(
    /\n\nCompara dos ejemplos[\s\S]*$/i,
    "",
  ).replace(
    /\n\nCompare two short examples[\s\S]*$/i,
    "",
  ).trim();
  let i = 0;
  while (wordCount(ie) < targetIdeaWords && i < extras.length * 3) {
    ie = `${ie}\n\n${extras[i % extras.length]}`;
    i += 1;
  }
  return joinBody(ie, normalizePractice(practice, locale, false), normalizeError(error, locale, false));
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
  const loc = doc.locale || "es";

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
    // Strip prior pad leftovers before fitting
    body = body
      .replace(/\n\nCompara dos ejemplos[\s\S]*?(?=\n\nPráctica:|\n\nPractice:)/gi, "\n\n")
      .replace(/\n\nCompare two short examples[\s\S]*?(?=\n\nPráctica:|\n\nPractice:)/gi, "\n\n")
      .replace(/\n\nEscribe una frase corta[\s\S]*?(?=\n\nPráctica:|\n\nPractice:)/gi, "\n\n")
      .replace(/\n\nRepite la idea clave[\s\S]*?(?=\n\nPráctica:|\n\nPractice:)/gi, "\n\n")
      .replace(/\n\nEnseña el punto[\s\S]*?(?=\n\nPráctica:|\n\nPractice:)/gi, "\n\n")
      .replace(/\n\nWrite one sentence[\s\S]*?(?=\n\nPráctica:|\n\nPractice:)/gi, "\n\n")
      .replace(/\n\nSay the key idea without looking[\s\S]*?(?=\n\nPráctica:|\n\nPractice:)/gi, "\n\n")
      .replace(/\n\nTeach this point[\s\S]*?(?=\n\nPráctica:|\n\nPractice:)/gi, "\n\n");

    if (day === 1 && kind === "intro") {
      p.body = fitPointBody(body, BUDGET.d1PointBody.max, loc);
    } else if (day === 5 && kind === "review" && subject !== "pro") {
      // Compact overview: short idea + fixed practice/error (~36–42 words/point)
      p.body = fitPointBody(body, 42, loc, true);
    } else if (day >= 2 && day <= 4) {
      // Soft max so curated deepen copy is kept; pad loop fills the band
      p.body = fitPointBody(body, 220, loc);
    } else if (day === 5 && subject === "pro") {
      p.body = fitPointBody(body, 160, loc, false);
    } else {
      p.body = fitPointBody(body, 140, loc);
    }
  }

  if (day === 5 && kind === "review" && subject !== "pro") {
    let total = (doc.lesson.points || []).reduce((s, p) => s + wordCount(p.body), 0);
    let guard = 0;
    while (total > BUDGET.d5Total.max && guard < 10) {
      for (const p of doc.lesson.points) {
        p.body = fitPointBody(p.body, 30, loc, true);
      }
      total = (doc.lesson.points || []).reduce((s, p) => s + wordCount(p.body), 0);
      guard += 1;
    }
  }

  let band = classBand(doc);
  if (day >= 2 && day <= 4) {
    let guard = 0;
    while (band < BUDGET.deepenBody.min && guard < 8) {
      const need = BUDGET.deepenBody.min - band + 10;
      const perPoint = Math.ceil(need / Math.max(1, doc.lesson.points.length));
      for (const p of doc.lesson.points) {
        const { ideaExplora } = splitBody(p.body, loc);
        p.body = padExplora(p.body, wordCount(ideaExplora) + perPoint, loc);
      }
      band = classBand(doc);
      guard += 1;
    }
    guard = 0;
    while (band > BUDGET.deepenBody.max && guard < 8) {
      for (const p of doc.lesson.points) {
        p.body = fitPointBody(p.body, Math.max(120, wordCount(p.body) - 25), loc);
      }
      band = classBand(doc);
      guard += 1;
    }
  }
  if (day === 1 && kind === "intro") {
    let guard = 0;
    while (band < BUDGET.d1Total.min && guard < 6) {
      for (const p of doc.lesson.points) {
        const { ideaExplora } = splitBody(p.body, loc);
        p.body = padExplora(p.body, wordCount(ideaExplora) + 20, loc);
      }
      band = classBand(doc);
      guard += 1;
    }
    guard = 0;
    while (band > BUDGET.d1Total.max && guard < 6) {
      for (const p of doc.lesson.points) {
        p.body = fitPointBody(p.body, Math.max(70, BUDGET.d1PointBody.max - 10 - guard * 5), loc);
      }
      if (doc.lesson.summary) {
        doc.lesson.summary = trimToWords(doc.lesson.summary, Math.max(25, BUDGET.d1Summary.max - guard * 5));
      }
      band = classBand(doc);
      guard += 1;
    }
  }
  // Day 5 reviews: never padExplora (would multiply across 5 overviews).
  if (day === 5 && kind === "review" && subject === "pro" && band < 100) {
    for (const p of doc.lesson.points) {
      const { ideaExplora } = splitBody(p.body, loc);
      p.body = padExplora(p.body, wordCount(ideaExplora) + 40, loc);
    }
  }
}

const files = fs.readdirSync(week1).filter((f) => f.endsWith("l6.eoschool.json"));
const report = [];
for (const name of files) {
  const file = path.join(week1, name);
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  processDoc(doc);
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  const band = classBand(doc);
  const kind = doc.lesson?.kind;
  const min =
    kind === "intro"
      ? BUDGET.d1Total.min
      : kind === "review" && doc.subject !== "pro"
        ? 160
        : kind === "review" && doc.subject === "pro"
          ? 90
          : BUDGET.deepenBody.min;
  const max =
    kind === "intro"
      ? BUDGET.d1Total.max
      : kind === "review"
        ? BUDGET.d5Total.max
        : BUDGET.deepenBody.max;
  report.push({
    key: name.replace(".eoschool.json", ""),
    words: band,
    fills: band >= min && band <= max ? "sí" : "no",
  });
}
console.log(JSON.stringify(report.sort((a, b) => a.key.localeCompare(b.key)), null, 2));
