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
const MAX_CHARS = 66; // soft guard; real width is checked by the Go width test
const root = path.resolve("frontend/public/homescool/media");

const blank = () => ({ kind: "blank", text: "" });
const line = (text, kind = "lesson") => ({ kind, text });

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

const COPY_CUE = "Cópiala aquí:";

/**
 * One continuous ask-first narrative. Each unit is:
 *   question -> blank answer space -> "Punto N: ..." + answer -> copy cue + blank copy space.
 * `extra` spare blank lines are spread over the answer spaces (never the opening's 2).
 */
function buildLesson(c, extra = 0) {
  const out = [];
  const prevIsBlank = () => out.length && out[out.length - 1].kind === "blank";
  const ensureBlank = () => {
    if (!prevIsBlank()) out.push(blank());
  };
  const pushHeading = (text) => {
    ensureBlank();
    out.push(line(text, "heading"));
    out.push(blank());
  };

  out.push(line(c.opening, "opening"));
  out.push(blank(), blank()); // exactly 2 answer lines

  if (c.repaso?.length) {
    pushHeading("Repaso");
    for (const t of c.repaso) out.push(line(t));
  }

  const spread = c.units.map((u) => (u.q?.length ? 1 : 0));
  const slots = spread.reduce((a, b) => a + b, 0) || 1;
  let left = extra;
  const bonus = c.units.map(() => 0);
  for (let k = 0; left > 0; k = (k + 1) % c.units.length) {
    if (!spread[k]) continue;
    bonus[k]++;
    left--;
  }
  void slots;

  c.units.forEach((u, i) => {
    if (u.q?.length) {
      ensureBlank();
      for (const t of u.q) out.push(line(t));
      for (let k = 0; k < (u.w ?? 2) + bonus[i]; k++) out.push(blank());
    }
    pushHeading(u.h);
    for (const t of u.a) out.push(line(t));
    out.push(blank());
    out.push(line(COPY_CUE));
    for (let k = 0; k < (u.c ?? 2); k++) out.push(blank());
  });
  return out;
}

function lineOf(index) {
  return ((index - 1) % COL) + 1;
}
function spaceLeft(nextIndex) {
  return COL - lineOf(nextIndex) + 1;
}

/** Pad so blank+heading+blank never straddles columns. */
function placeLesson(lesson) {
  const placed = [];
  for (let i = 0; i < lesson.length; i++) {
    const s = lesson[i];
    const next = placed.length + 1;
    let need = 1;
    if (s.kind === "blank" && lesson[i + 1]?.kind === "heading" && lesson[i + 2]?.kind === "blank") need = 3;
    if (need > 1 && spaceLeft(next) < need) {
      while (spaceLeft(placed.length + 1) !== COL) placed.push(blank());
    }
    placed.push(s);
  }
  return placed;
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
    blocks.push({
      id,
      type: "mcq",
      prompt: m.q,
      choices: opts,
      answer: correct,
      slots: [
        { kind: "question", text: m.q, questionId: id, questionType: "mcq" },
        ...opts.map((o, k) => ({ kind: "option", text: `${"ABCD"[k]}) ${o}`, questionId: id })),
      ],
    });
  });
  const mk = (prompt, id, schematic) => ({
    id,
    type: "write",
    schematic,
    prompt,
    slots: [
      { kind: "question", text: prompt, questionId: id, questionType: schematic ? "schematic" : "write" },
      ...[0, 1, 2, 3].map(() => ({ kind: "answerLine", text: "", questionId: id })),
    ],
  });
  c.quiz.write.forEach((p, i) => blocks.push(mk(p, `d${day}-w${i + 1}`, false)));
  c.quiz.schematic.forEach((p, i) => blocks.push(mk(p, `d${day}-w${i + 3}`, true)));
  return blocks;
}

function placeAll(lessonPlaced, blocks, imageSlots, pad) {
  const body = [...lessonPlaced];
  for (let i = 0; i < pad; i++) body.push(blank());
  const bodyEnd = SLOTS - imageSlots.length;
  for (let bi = 0; bi < blocks.length; bi++) {
    if (spaceLeft(body.length + 1) < 5) {
      while (spaceLeft(body.length + 1) !== COL) body.push(blank());
    }
    if (body.length + 5 > bodyEnd) return null;
    body.push(...blocks[bi].slots);
    if (bi < blocks.length - 1) {
      if (body.length + 1 > bodyEnd) return null;
      body.push(blank());
    }
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
    if (i === 0) {
      // Compat markers read by FE + audit: opening, then ## Repaso (days 2-5).
      paras.push(c.opening);
      if (c.repaso?.length) paras.push("## Repaso\n" + c.repaso.join("\n"));
    }
    if (u.q?.length) paras.push(u.q.join(" "));
    paras.push(u.a.join(" "));
    return { id: `p${i + 1}`, heading: u.h, body: paras.join("\n\n") };
  });
}

function build(c, doc) {
  const m = c.key.match(/-d(\d)$/);
  const day = Number(m[1]);
  const problems = [];

  const all = [];
  const blocks = quizBlocks(c, day);
  const imageSlots = c.image.map((t) => line(t, "imageInstruction"));

  // Spread spare space over the answer spaces (largest `extra` that still packs), then pad the rest.
  let best = null;
  let lessonPlaced = null;
  for (let extra = 0; extra <= 40; extra++) {
    const lp = placeLesson(buildLesson(c, extra));
    let ok = null;
    for (let pad = 0; pad <= MAX_PAD; pad++) {
      const body = placeAll(lp, blocks, imageSlots, pad);
      if (body) ok = { body, pad, extra };
      else if (pad > 0 && ok) break;
    }
    if (ok && (!best || ok.pad <= best.pad)) {
      best = ok;
      lessonPlaced = lp;
    }
  }
  if (!best) {
    const lp = placeLesson(buildLesson(c, 0));
    problems.push(`OVERFLOW: lesson=${lp.length} slots (max ~${SLOTS - imageSlots.length - 71})`);
    return { problems };
  }
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
    if (s.kind !== "blank" && s.kind !== "answerLine" && s.text.length > MAX_CHARS) {
      problems.push(`LONG(${s.text.length}) #${s.index}: ${s.text}`);
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
  L.imageBandInstruction = c.image.join(" ");
  L.slotSequence = seq;

  const qSlots = new Map(seq.filter((s) => s.kind === "question").map((s) => [s.questionId, s]));
  doc.quiz.questionCount = 12;
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
    stats: { lessonSlots: lessonPlaced.length, pad: best.pad, gapBeforeQuiz: trailingBlanks, gapAfterQuiz: afterQuiz, lastLesson },
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
  if (r.stats) console.log(`${c.key}: lessonSlots=${r.stats.lessonSlots} pad=${r.stats.pad} gapBeforeQuiz=${r.stats.gapBeforeQuiz} gapAfterQuiz=${r.stats.gapAfterQuiz}`);
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
