/**
 * Repack lesson.slotSequence to column-major sequential fill with v2 spacing:
 * - opening + 2 blank answer lines
 * - heading: blank before + heading + blank after
 * - paragraph breaks (Práctica / Error común / Mira este…) get a blank before
 * - quiz blocks 1+4 kept intact; blank between questions; answerLine text cleared
 * - fill: col1 → col2 → col3; lesson → quiz → imageInstruction(K)
 *
 * Usage: node scripts/repack-homescool-v2-column-major.mjs [paths...]
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("frontend/public/homescool/media");
const QUIZ = new Set(["question", "option", "answerLine"]);
const IMAGE = new Set(["imageInstruction", "drawing"]);
const PARA_START =
  /^(Práctica:|Error común:|Mira este|Explora:|Idea |Memoriza|Ahora te toca|Observa )/i;

function listDefaultFiles() {
  const out = [];
  for (const week of ["week1", "week2"]) {
    const dir = path.join(root, week);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".eoschool.json")) out.push(path.join(dir, name));
    }
  }
  return out;
}

function blank() {
  return { kind: "blank", text: "" };
}

function cleanSlot(s) {
  const next = { ...s };
  if (next.kind === "answerLine" || isDotted(next.text)) {
    if (next.kind === "answerLine") next.text = "";
  }
  return next;
}

function isDotted(text) {
  const t = String(text || "").trim();
  if (!t || !t.includes(".")) return false;
  return /^[.\u00B7\u2022\s]+$/.test(t);
}

function extractStreams(slots) {
  const ordered = [...slots].sort((a, b) => (a.index || 0) - (b.index || 0));
  const lesson = [];
  const quiz = [];
  const image = [];
  let phase = "lesson";
  for (const s of ordered) {
    if (IMAGE.has(s.kind)) {
      phase = "image";
      image.push(s);
      continue;
    }
    if (QUIZ.has(s.kind)) {
      phase = "quiz";
      quiz.push(s);
      continue;
    }
    if (phase === "lesson") {
      lesson.push(s);
    }
  }
  return { lesson, quiz, image };
}

/** Strip old blanks and re-apply spacing rules. */
function polishLesson(raw) {
  const content = raw.filter((s) => s.kind !== "blank");
  const out = [];
  for (let i = 0; i < content.length; i++) {
    const s = cleanSlot(content[i]);
    const prev = out[out.length - 1];

    if (s.kind === "opening") {
      out.push(s);
      out.push(blank(), blank());
      continue;
    }

    if (s.kind === "heading") {
      // Dedicated blank before heading (not the same as opening's 2 answer lines).
      const o1 = out[out.length - 1];
      const o2 = out[out.length - 2];
      const o3 = out[out.length - 3];
      if (o1?.kind === "blank" && o2?.kind === "blank" && o3?.kind === "opening") {
        out.push(blank());
      } else if (!prev || prev.kind !== "blank") {
        out.push(blank());
      }
      out.push(s);
      out.push(blank());
      continue;
    }

    if (s.kind === "lesson" || s.kind === "summary") {
      const text = String(s.text || "").trim();
      if (
        PARA_START.test(text) &&
        prev &&
        prev.kind !== "blank" &&
        prev.kind !== "heading"
      ) {
        out.push(blank());
      }
      out.push(s);
      continue;
    }

    out.push(s);
  }
  // Drop leading blanks (except we never start with blank after polish unless opening missing)
  while (out.length && out[0].kind === "blank") out.shift();
  while (out.length && out[out.length - 1].kind === "blank") out.pop();
  return out;
}

function quizBlocks(quizSlots) {
  const blocks = [];
  for (let i = 0; i < quizSlots.length; ) {
    if (quizSlots[i].kind !== "question") {
      i++;
      continue;
    }
    const block = quizSlots.slice(i, i + 5).map((s) => {
      const n = { ...s };
      if (n.kind === "answerLine" || isDotted(n.text)) {
        if (n.kind === "answerLine") n.text = "";
      }
      return n;
    });
    if (block.length !== 5) break;
    blocks.push(block);
    i += 5;
  }
  return blocks;
}

function lineOfIndex(index) {
  return ((index - 1) % 52) + 1;
}

function spaceLeftInColumn(nextIndex) {
  return 52 - lineOfIndex(nextIndex) + 1;
}

function finalizeSlot(s, index) {
  const column = Math.floor((index - 1) / 52) + 1;
  const line = ((index - 1) % 52) + 1;
  const next = { ...s, index, column, line };
  if (next.kind === "answerLine") next.text = "";
  if (next.kind === "question") {
    next.gutter = {
      role: "question",
      background: "#aaa",
      border: "#fff",
      text: "#fff",
    };
  } else if (next.gutter) {
    delete next.gutter;
  }
  return next;
}

function placeLesson(lesson, bodyEnd) {
  const lessonPlaced = [];
  let next = 1;
  for (let i = 0; i < lesson.length; i++) {
    const s = lesson[i];
    // Keep blank-before+heading+blank-after or heading+blank atomic when possible.
    let need = 1;
    if (s.kind === "heading" && lesson[i + 1]?.kind === "blank") need = 2;
    if (
      s.kind === "blank" &&
      lesson[i + 1]?.kind === "heading" &&
      lesson[i + 2]?.kind === "blank"
    ) {
      need = 3;
    }
    if (spaceLeftInColumn(next) < need) {
      while (spaceLeftInColumn(next) > 0 && next <= bodyEnd) {
        lessonPlaced.push(blank());
        next++;
      }
    }
    if (next + need - 1 > bodyEnd) return null;
    for (let k = 0; k < need; k++) {
      lessonPlaced.push(lesson[i + k]);
      next++;
    }
    i += need - 1;
  }
  return lessonPlaced;
}

function placeQuiz(lessonPlaced, blocks, bodyEnd) {
  const body = [...lessonPlaced];
  let next = body.length + 1;
  let quizStartIndex = 0;

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const isLast = bi === blocks.length - 1;
    // 5 response lines; +1 blank between questions (not after last).
    const need = isLast ? 5 : 6;
    if (spaceLeftInColumn(next) < 5) {
      while (spaceLeftInColumn(next) > 0 && next <= bodyEnd) {
        body.push(blank());
        next++;
      }
    }
    // If 5 fit but trailing inter-question blank doesn't, place 5 then blank on next col.
    if (next + 4 > bodyEnd) return null;
    if (!quizStartIndex) quizStartIndex = next;
    for (const s of block) {
      body.push(s);
      next++;
    }
    if (!isLast) {
      if (next > bodyEnd) return null;
      body.push(blank());
      next++;
    }
    void need;
  }

  while (body.length < bodyEnd) body.push(blank());
  if (body.length !== bodyEnd) return null;
  return { body, quizStartIndex };
}

function repack(doc) {
  const slots = doc.lesson?.slotSequence;
  if (!Array.isArray(slots) || slots.length !== 156) {
    return { ok: false, reason: "no156" };
  }
  const extracted = extractStreams(slots);
  const lesson = polishLesson(extracted.lesson);
  const blocks = quizBlocks(extracted.quiz);
  if (blocks.length !== 12) {
    return { ok: false, reason: `blocks=${blocks.length}` };
  }
  const image = extracted.image;
  const K = image.length;
  if (K < 2) return { ok: false, reason: `K=${K}` };
  const bodyEnd = 156 - K;

  let lessonWork = [...lesson];
  let placed = null;
  let trimmed = 0;
  while (lessonWork.length >= 0) {
    const lessonPlaced = placeLesson(lessonWork, bodyEnd);
    if (lessonPlaced) {
      const quizPlaced = placeQuiz(lessonPlaced, blocks, bodyEnd);
      if (quizPlaced) {
        placed = { lessonPlaced, ...quizPlaced };
        break;
      }
    }
    if (lessonWork.length === 0) break;
    // Prefer trimming trailing lesson/summary, keep opening+heading structure.
    lessonWork.pop();
    trimmed++;
  }
  if (!placed) return { ok: false, reason: "quizOverflow" };

  const full = [...placed.body, ...image];
  if (full.length !== 156) return { ok: false, reason: `len=${full.length}` };

  const seq = full.map((s, i) => finalizeSlot(s, i + 1));
  doc.lesson.slotSequence = seq;
  doc.lesson.layout = "letter-grid-v2";
  doc.lesson.v2Flow = true;
  doc.lesson.quizIntegrated = true;
  doc.lesson.packOrder = "column-major-sequential";

  const qSlots = seq.filter((s) => s.kind === "question");
  if (Array.isArray(doc.quiz?.questions)) {
    for (const q of doc.quiz.questions) {
      const match = qSlots.find((s) => s.questionId === q.id);
      if (match) {
        q.slot = { column: match.column, line: match.line, index: match.index };
      }
    }
  }

  return {
    ok: true,
    lessonSlots: placed.lessonPlaced.length,
    K,
    quizStartIndex: placed.quizStartIndex,
    trimmed,
  };
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2).map((p) => path.resolve(p))
  : listDefaultFiles();

let ok = 0;
let fail = 0;
for (const file of files) {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error("READ", file, e.message);
    fail++;
    continue;
  }
  const result = repack(doc);
  if (!result.ok) {
    console.error("SKIP", path.relative(process.cwd(), file), result.reason);
    fail++;
    continue;
  }
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n", "utf8");
  console.log(
    "OK",
    path.relative(process.cwd(), file),
    `lessonSlots=${result.lessonSlots} quizStart=#${result.quizStartIndex} K=${result.K}` +
      (result.trimmed ? ` trimmed=${result.trimmed}` : ""),
  );
  ok++;
}
console.log(JSON.stringify({ ok, fail, total: files.length }));
