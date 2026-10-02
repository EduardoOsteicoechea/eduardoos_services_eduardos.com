/**
 * Build Homescool v2 classes with the "ask first -> compare -> try again" method.
 *
 * Reads authored content (scripts/homescool-ask-first-content/*.mjs), backs up the
 * live JSON to media/week{N}/archive/{base}.pre-askfirst-{YYYYMMDD}.eoschool.json
 * (never overwrites an existing backup), then rewrites lesson.points, lesson.summary,
 * lesson.slotSequence (156, column-major), lesson.imageBandInstruction and quiz.
 * Everything else (title, mppe, supportUrl, memoryPhrase, recaps, media...) is kept.
 *
 * Usage:
 *   node scripts/build-homescool-ask-first-v2.mjs scripts/homescool-ask-first-content/esp-c3-w1.mjs [--dry] [--dump-lines out.json]
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SLOTS = 156;
const COL = 52;
const MAX_PAD = 12;
/** Quiz question ids (suffix after "d{day}-") dropped first when the quiz does not fit. Never drops q1, q2, w1, w3. */
const QUIZ_DROP_ORDER = ["q8", "q7", "w2", "w4", "q6", "q5", "q4", "q3"];
// Letter body is 8 pt. Line fit is measured with the real Raleway advances exported from the Go PDF
// engine (scripts/homescool-glyph-widths.json); text width = column width - 2 x 2 mm padding.
const GLYPHS = JSON.parse(fs.readFileSync(new URL("./homescool-glyph-widths.json", import.meta.url), "utf8"));
const LIMIT_PT = GLYPHS.textWidthPt - 0.6; // small safety margin
const root = path.resolve("frontend/public/homescool/media");

const blank = () => ({ kind: "blank", text: "" });
const line = (text, kind = "lesson") => ({ kind, text });

function widthPt(text, bold = false) {
  const table = bold ? GLYPHS.bold : GLYPHS.regular;
  let w = 0;
  // Mirror Go glyphWidthEm: a missing or zero advance (e.g. space) counts as 0.6 em.
  for (const ch of String(text)) w += table[ch] > 0 ? table[ch] : 0.6;
  return w * GLYPHS.fontPt;
}

/**
 * Word-wrap to the column's text width. NEVER drops words: overflow goes to the next line.
 * Overlong single tokens are hard-split by character.
 */
function wrapToLines(text, bold = false) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return [];
  if (widthPt(t, bold) <= LIMIT_PT) return [t];
  const lines = [];
  let cur = "";
  const pushHard = (token) => {
    let rest = "";
    for (const ch of token) {
      if (widthPt(rest + ch, bold) > LIMIT_PT) {
        lines.push(rest);
        rest = ch;
      } else rest += ch;
    }
    return rest;
  };
  for (const w of t.split(" ")) {
    if (!cur) {
      cur = widthPt(w, bold) > LIMIT_PT ? pushHard(w) : w;
      continue;
    }
    if (widthPt(cur + " " + w, bold) <= LIMIT_PT) {
      cur += " " + w;
      continue;
    }
    lines.push(cur);
    cur = widthPt(w, bold) > LIMIT_PT ? pushHard(w) : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

function pushWrapped(out, texts, kind = "lesson") {
  for (const t of texts || []) {
    for (const part of wrapToLines(t)) out.push(line(part, kind));
  }
}
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

const COPY_CUE = "Escribe aqu\u00ed lo que aprendiste:";
/** Reflection / copy line (a row of underscores, one slot). Must fit the 59 mm text width. */
const DASH = "_".repeat(40);
export const OPENING = "\u00bfQu\u00e9 aprendiste ayer?";

/**
 * One continuous ask-first narrative (docs: homescool-class-method-v2.mdc).
 * Every idea is: question -> blank -> DASH (try first) -> blank -> "Punto N: ..." -> blank -> answer
 *   -> blank -> COPY_CUE -> DASH -> blank.
 * Unit 0 is "Punto 1: Repaso de ayer": the opening question itself is its question.
 * Exactly one blank line between blocks. No separate practice / error / final-question sections.
 */
function buildLesson(c, extra = 0) {
  const out = [];
  // Spare slots become extra dash rows in the "try first" space (max 2 per idea), round-robin.
  const bonus = c.units.map(() => 0);
  for (let k = 0, left = extra; left > 0 && k < c.units.length * 3; k++, left--) {
    const at = k % c.units.length;
    if (bonus[at] < 2) bonus[at]++;
    else left++;
  }
  const prevIsBlank = () => out.length && out[out.length - 1].kind === "blank";
  const ensureBlank = () => {
    if (!prevIsBlank()) out.push(blank());
  };

  c.units.forEach((u, i) => {
    if (i === 0) pushWrapped(out, [OPENING], "opening");
    else {
      ensureBlank();
      pushWrapped(out, u.q);
    }
    out.push(blank());
    for (let k = 0; k < 1 + bonus[i]; k++) out.push(line(DASH));
    out.push(blank());
    for (const part of wrapToLines(u.h, true)) out.push(line(part, "heading"));
    out.push(blank());
    pushWrapped(out, u.a);
    out.push(blank());
    out.push(line(COPY_CUE));
    out.push(line(DASH));
    out.push(blank());
  });
  return out;
}

function lineOf(index) {
  return ((index - 1) % COL) + 1;
}
function spaceLeft(nextIndex) {
  return COL - lineOf(nextIndex) + 1;
}

/** Pad so blank + heading block + blank never straddles columns. */
function placeLesson(lesson) {
  const placed = [];
  for (let i = 0; i < lesson.length; i++) {
    const s = lesson[i];
    const next = placed.length + 1;
    let need = 1;
    if (s.kind === "blank" && lesson[i + 1]?.kind === "heading") {
      let j = i + 1;
      while (j < lesson.length && lesson[j].kind === "heading") j++;
      if (lesson[j]?.kind === "blank") need = j - i + 1; // blank + headings + blank
    }
    if (need > 1 && spaceLeft(next) < need) {
      while (spaceLeft(placed.length + 1) !== COL) placed.push(blank());
    }
    placed.push(s);
  }
  return placed;
}

/** First wrapped line is the `question` slot; continuation lines are plain `lesson` slots. */
function promptSlotsFor(prompt, id, questionType) {
  const parts = wrapToLines(prompt);
  return parts.map((text, i) =>
    i === 0
      ? { kind: "question", text, questionId: id, questionType }
      : { kind: "lesson", text, questionId: id },
  );
}

function quizBlocks(c, day) {
  const blocks = [];
  const pos = [2, 0, 3, 1, 2, 3, 1, 0];
  c.quiz.mcq.forEach((m, i) => {
    const id = `d${day}-q${i + 1}`;
    const [correct, ...wrong] = m.o;
    const opts = [];
    let w = 0;
    const at = pos[(i + day) % pos.length];
    for (let k = 0; k < 4; k++) opts.push(k === at ? correct : wrong[w++]);
    // Prompt and options wrap onto continuation slots; no word is ever dropped.
    const promptSlots = promptSlotsFor(m.q, id, "mcq");
    const optSlots = opts.flatMap((o, k) =>
      wrapToLines(`${"ABCD"[k]}) ${o}`).map((part) => ({ kind: "option", text: part, questionId: id })),
    );
    blocks.push({
      id,
      type: "mcq",
      prompt: m.q,
      choices: opts,
      answer: correct,
      slots: [...promptSlots, ...optSlots],
    });
  });
  const mk = (prompt, id, schematic) => {
    // 2 answer lines so the lesson still packs at 8 pt.
    return {
      id,
      type: "write",
      schematic,
      prompt,
      slots: [
        ...promptSlotsFor(prompt, id, schematic ? "schematic" : "write"),
        ...[0, 1].map(() => ({ kind: "answerLine", text: "", questionId: id })),
      ],
    };
  };
  c.quiz.write.forEach((p, i) => blocks.push(mk(p, `d${day}-w${i + 1}`, false)));
  c.quiz.schematic.forEach((p, i) => blocks.push(mk(p, `d${day}-w${i + 3}`, true)));
  return blocks;
}

function placeAll(lessonPlaced, blocks, imageSlots, pad) {
  const body = [...lessonPlaced];
  for (let i = 0; i < pad; i++) body.push(blank());
  const bodyEnd = SLOTS - imageSlots.length;
  for (let bi = 0; bi < blocks.length; bi++) {
    const n = blocks[bi].slots.length;
    // One blank line between quiz questions (skipped at the top of a column).
    if (bi > 0 && lineOf(body.length + 1) !== 1) body.push(blank());
    if (spaceLeft(body.length + 1) < n) {
      while (spaceLeft(body.length + 1) !== COL) body.push(blank());
    }
    if (body.length + n > bodyEnd) return null;
    body.push(...blocks[bi].slots);
  }
  while (body.length < bodyEnd) body.push(blank());
  if (body.length !== bodyEnd) return null;
  return body;
}

function finalize(s, index) {
  const column = Math.floor((index - 1) / COL) + 1;
  const ln = ((index - 1) % COL) + 1;
  const out = { index, column, line: ln, kind: s.kind, text: s.text ?? "" };
  if (s.questionId) out.questionId = s.questionId;
  if (s.questionType) out.questionType = s.questionType;
  if (s.kind === "question") {
    out.gutter = { role: "question", background: "#aaa", border: "#fff", text: "#fff" };
  }
  return out;
}

function pointsFrom(c) {
  return c.units.map((u, i) => {
    const paras = [];
    if (i === 0) paras.push(OPENING);
    else if (u.q?.length) paras.push(u.q.join(" "));
    paras.push(u.a.join(" "));
    return { id: `p${i + 1}`, heading: u.h, body: paras.join("\n\n") };
  });
}

function build(c, doc) {
  const m = c.key.match(/-d(\d)$/);
  const day = Number(m[1]);
  const problems = [];

  const allBlocks = quizBlocks(c, day);
  // Image-band instruction: one bold paragraph wrapped to the column; K = its line count (max 6).
  const imageSlots = wrapToLines((c.image || []).map((s) => String(s).trim()).join(" "), true).map((part) =>
    line(part, "imageInstruction"),
  );
  if (imageSlots.length > 6) problems.push(`IMAGE>6 lines (${imageSlots.length}): shorten c.image`);
  // Spread spare space over the answer spaces (largest `extra` that still packs), then pad the rest.
  // A blank line separates quiz questions. If the full quiz (8 mcq + 2 write + 2 schematic) does not
  // fit with those gaps, questions are dropped in QUIZ_DROP_ORDER, never below the minimum mix:
  // 2 selection (mcq), 1 schematic and 1 written reflection.
  let best = null;
  let lessonPlaced = null;
  let blocks = null;
  for (let nDrop = 0; nDrop <= QUIZ_DROP_ORDER.length && !best; nDrop++) {
    const drop = new Set(QUIZ_DROP_ORDER.slice(0, nDrop).map((s) => `d${day}-${s}`));
    const trial = allBlocks.filter((b) => !drop.has(b.id));
    for (let extra = 0; extra <= c.units.length * 2; extra++) {
      const lp = placeLesson(buildLesson(c, extra));
      let ok = null;
      for (let pad = 0; pad <= MAX_PAD; pad++) {
        const body = placeAll(lp, trial, imageSlots, pad);
        if (body) ok = { body, pad, extra };
        else if (pad > 0 && ok) break;
      }
      if (ok && (!best || ok.pad <= best.pad)) {
        best = ok;
        lessonPlaced = lp;
        blocks = trial;
      }
    }
  }
  if (!best) {
    const lp = placeLesson(buildLesson(c));
    const quizSlots = allBlocks.reduce((n, b) => n + b.slots.length, 0);
    problems.push(`OVERFLOW: lesson=${lp.length} slots (max ~${SLOTS - imageSlots.length - quizSlots})`);
    return { problems };
  }
  const dropped = allBlocks.length - blocks.length;
  const full = [...best.body, ...imageSlots];
  const seq = full.map((s, i) => finalize(s, i + 1));
  if (seq.length !== SLOTS) problems.push(`len=${seq.length}`);

  const lastLesson = lessonPlaced.length + best.pad;
  const trailingBlanks = (() => {
    const firstQ = seq.findIndex((s) => s.kind === "question");
    let k = 0;
    for (let i = firstQ - 1; i >= 0 && seq[i].kind === "blank"; i--) k++;
    return k;
  })();
  const afterQuiz = (() => {
    const firstImg = seq.findIndex((s) => s.kind === "imageInstruction");
    let k = 0;
    for (let i = firstImg - 1; i >= 0 && seq[i].kind === "blank"; i--) k++;
    return k;
  })();

  for (const s of seq) {
    if (s.kind !== "blank" && s.kind !== "answerLine" && widthPt(s.text, s.kind === "heading" || s.kind === "imageInstruction") > GLYPHS.textWidthPt) {
      problems.push(`LONG(${Math.round(widthPt(s.text, s.kind === "heading" || s.kind === "imageInstruction"))}pt) #${s.index}: ${s.text}`);
    }
    if (/\*\*|##|Respuesta:/.test(s.text)) problems.push(`MD #${s.index}: ${s.text}`);
  }

  // mutate doc
  const L = doc.lesson;
  L.points = pointsFrom(c);
  L.summary = c.summary;
  L.layout = "letter-grid-v2";
  L.v2Flow = true;
  L.quizIntegrated = true;
  L.packOrder = "column-major-sequential";
  L.method = "ask-first-v1";
  L.imageBandInstruction = (c.image || []).map((t) => String(t).trim()).filter(Boolean).join(" ");
  L.slotSequence = seq;

  const qSlots = new Map(seq.filter((s) => s.kind === "question").map((s) => [s.questionId, s]));
  doc.quiz.questionCount = blocks.length;
  doc.quiz.questions = blocks.map((b) => {
    const s = qSlots.get(b.id);
    const q = { id: b.id, originDay: day, type: b.type, prompt: b.prompt };
    if (b.type === "mcq") {
      q.choices = b.choices;
      q.answer = b.answer;
    } else if (b.schematic) {
      q.schematic = true;
      q.slotQuestionType = "schematic";
    }
    q.slot = { column: s.column, line: s.line, index: s.index };
    return q;
  });

  return {
    problems,
    stats: { lessonSlots: lessonPlaced.length, quiz: blocks.length, dropped, pad: best.pad, gapBeforeQuiz: trailingBlanks, gapAfterQuiz: afterQuiz, lastLesson },
    lines: seq.filter((s) => s.kind !== "blank" && s.kind !== "answerLine").map((s) => ({ i: s.index, k: s.kind, t: s.text })),
  };
}

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const dumpIdx = args.indexOf("--dump-lines");
const dumpPath = dumpIdx >= 0 ? args[dumpIdx + 1] : null;
const contentPath = args.find((a) => a.endsWith(".mjs"));
if (!contentPath) {
  console.error("usage: node scripts/build-homescool-ask-first-v2.mjs <content.mjs> [--dry] [--dump-lines out.json]");
  process.exit(2);
}

const mod = await import(pathToFileURL(path.resolve(contentPath)).href);
const classes = mod.default;
const dumped = [];
let fail = 0;
for (const c of classes) {
  const week = c.key.match(/-w(\d)-/)[1];
  const file = path.join(root, `week${week}`, `${c.key}-l6.eoschool.json`);
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  const r = build(c, doc);
  if (r.problems.length) {
    fail++;
    console.log(`\n!! ${c.key}`);
    for (const p of r.problems) console.log("   ", p);
    if (!r.stats) continue;
  }
  if (r.stats) console.log(`${c.key}: lessonSlots=${r.stats.lessonSlots} quiz=${r.stats.quiz} dropped=${r.stats.dropped} pad=${r.stats.pad} gapBeforeQuiz=${r.stats.gapBeforeQuiz} gapAfterQuiz=${r.stats.gapAfterQuiz}`);
  if (dumpPath && r.lines) dumped.push(...r.lines.map((x) => ({ file: c.key, ...x })));
  if (!dry && r.stats && !r.problems.some((p) => p.startsWith("OVERFLOW") || p.startsWith("len="))) {
    const archiveDir = path.join(root, `week${week}`, "archive");
    fs.mkdirSync(archiveDir, { recursive: true });
    const bak = path.join(archiveDir, `${c.key}-l6.pre-askfirst-${stamp()}.eoschool.json`);
    if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
    fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n", "utf8");
  }
}
if (dumpPath) fs.writeFileSync(dumpPath, JSON.stringify(dumped));
console.log(JSON.stringify({ classes: classes.length, withProblems: fail, dry }));
