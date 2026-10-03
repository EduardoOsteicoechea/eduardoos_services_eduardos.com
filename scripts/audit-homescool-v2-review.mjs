import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../frontend/public/homescool/media");
const memSubjects = new Set(["esp", "ing", "lat", "his", "LT", "geo", "cie"]);
const weeks = [1, 2];
const files = [];

function allText(doc) {
  const parts = [];
  for (const p of doc.lesson?.points || []) {
    parts.push(p.heading || "", p.body || "");
  }
  parts.push(
    doc.lesson?.summary || "",
    doc.lesson?.weekRecap || "",
    doc.lesson?.priorDayRecap || "",
    doc.lesson?.memoryPhrase || "",
  );
  return parts.join("\n");
}

function countMcqWrite(qs) {
  let mcq = 0;
  let write = 0;
  for (const q of qs || []) {
    if (q.type === "mcq") mcq++;
    else if (q.type === "write") write++;
  }
  return { mcq, write };
}

function hasForbiddenBoilerplate(s) {
  const bad = [];
  if (/Observa un caso real de/i.test(s)) bad.push("Observa un caso real");
  if (/Sigamos juntos/i.test(s)) bad.push("Sigamos juntos");
  if (/Idea central:/i.test(s)) bad.push("Idea central label");
  if (/Respuesta:/i.test(s)) bad.push("Respuesta:");
  if (/\?Qu\?/i.test(s)) bad.push("mojibake");
  return bad;
}

function genericMcqPattern(q) {
  const g = [];
  const ch = (q.choices || []).join(" ");
  if (/Una idea que no se ense/i.test(ch)) g.push("generic distractor");
  if (/idea corresponde a/i.test(q.prompt || "")) g.push("identify-phrase mcq");
  return g;
}

for (const week of weeks) {
  const dir = path.join(root, `week${week}`);
  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx >= 0 ? process.argv.slice(onlyIdx + 1) : [];
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith("-l6.eoschool.json") && (!only.length || only.some((k) => f.startsWith(k))))) {
    const fp = path.join(dir, name);
    const doc = JSON.parse(fs.readFileSync(fp, "utf8"));
    const rel = `week${week}/${name}`;
    const fileIssues = [];
    const L = doc.lesson || {};

    if (L.layout !== "letter-grid-v2") fileIssues.push({ sev: "high", code: "layout" });
    if (L.v2Flow !== true) fileIssues.push({ sev: "med", code: "v2Flow" });
    if (!L.imageBandInstruction?.trim()) fileIssues.push({ sev: "high", code: "imageBandInstruction" });

    if (!doc.supportUrl?.trim() && doc.subject !== "fin") fileIssues.push({ sev: "high", code: "supportUrl" });
    if (memSubjects.has(doc.subject) && !L.memoryPhrase?.trim()) {
      fileIssues.push({ sev: "high", code: "memoryPhrase" });
    }

    const qs = doc.quiz?.questions || [];
    const { mcq, write } = countMcqWrite(qs);
    // Up to 12 questions (8 mcq + 2 write + 2 schematic). Questions are dropped when a blank line
    // between them does not fit, but the minimum mix is 2 selection, 1 schematic, 1 written reflection.
    const schematic = qs.filter((q) => q.type === "write" && q.schematic).length;
    const reflection = write - schematic;
    if (qs.length > 12 || mcq < 2 || schematic < 1 || reflection < 1) {
      fileIssues.push({
        sev: "high",
        code: "quizCount",
        detail: `${qs.length} total ${mcq} mcq ${reflection} reflection ${schematic} schematic`,
      });
    }

    const body = allText(doc);
    const day = doc.day;

    // v3: every class opens with exactly «¿Qué aprendiste la clase pasada?» and Punto 1 is «Repaso de la clase pasada».
    // `ing` is taught in English: English frame lines, "Point N:" headings, English content.
    const isIng = doc.subject === "ing";
    const OPEN = isIng ? "What did you learn in the last class?" : "¿Qué aprendiste la clase pasada?";
    const COPY = isIng ? "Write here what you learned:" : "Escribe aquí lo que aprendiste:";
    const PUNTO = isIng ? "Point" : "Punto";
    if (!body.includes(OPEN) || /aprendiste ayer|sobre esta misma materia/i.test(body)) {
      fileIssues.push({ sev: "high", code: "ayerQuestion" });
    }
    const pts = L.points || [];
    if (!new RegExp("^" + PUNTO + " 1: " + (isIng ? "Review of the last class" : "Repaso de la clase pasada"), "i").test(pts[0]?.heading || "")) {
      fileIssues.push({ sev: "high", code: "punto1Repaso" });
    }
    if (isIng) {
      const es = (" " + body.toLowerCase() + " ").match(/ (que|los|las|una|para|con|por|del|es|esto|como|cuando) /g) || [];
      if (es.length > 6) fileIssues.push({ sev: "high", code: "ingSpanish", detail: String(es.length) });
    }
    // v3b: the class image comes from the central idea only (no explanatory metaphor on the image).
    if (doc.subject !== "his") {
      const meta0 = JSON.parse(fs.readFileSync(path.join(__dirname, "homescool-venezuela-metaphors.json"), "utf8"));
      const asg = meta0["w" + doc.week]?.[doc.subject];
      const img = (L.imageBandInstruction || "").toLowerCase();
      const hit = (asg?.keywords || []).filter((k) => img.includes(k.toLowerCase()));
      if (hit.length) fileIssues.push({ sev: "high", code: "imageMetaphor", detail: hit.join(",") });
    }
    // v3: only d1..d3 (pro: d1 only); lesson kind per day.
    if (day > (doc.subject === "pro" ? 1 : 3)) fileIssues.push({ sev: "high", code: "dayBeyondV3", detail: String(day) });
    {
      const wantKind = day === 1 ? "intro" : "deepen";
      if (L.kind !== wantKind) fileIssues.push({ sev: "high", code: "lessonKind", detail: String(L.kind) });
      if (day >= 2 && L.focusPoint !== day - 1) fileIssues.push({ sev: "high", code: "focusPoint", detail: String(L.focusPoint) });
    }
    // fin: daily economic practice is mandatory.
    if (doc.subject === "fin") {
      if (!pts.some((p) => /^Punto \d+: Pr[aá]ctica econ[oó]mica de hoy/i.test(p.heading || ""))) {
        fileIssues.push({ sev: "high", code: "finPractica" });
      }
      if (!qs.some((q) => q.type === "write" && !q.schematic && /ganaste|ahorraste|ganas|ahorras/i.test(q.prompt || ""))) {
        fileIssues.push({ sev: "high", code: "finRegistro" });
      }
    }
    if (pts.length < 5 || pts.length > 7) {
      fileIssues.push({ sev: "high", code: "puntoCount", detail: String(pts.length) });
    }
    pts.forEach((pt, i) => {
      if (!new RegExp("^" + PUNTO + " " + (i + 1) + ": ").test(pt.heading || "")) {
        fileIssues.push({ sev: "high", code: "puntoNumbering", detail: pt.heading });
      }
    });
    // Venezuelan metaphor: the assigned landmark must be named in the lesson text.
    {
      const meta = JSON.parse(fs.readFileSync(path.join(__dirname, "homescool-venezuela-metaphors.json"), "utf8"));
      const assigned = meta["w" + doc.week]?.[doc.subject];
      if (!assigned) fileIssues.push({ sev: "high", code: "noMetaphorAssigned" });
      else {
        const slotTxt = (L.slotSequence || []).map((s) => s.text || "").join("\n");
        const hay = (body + "\n" + slotTxt).toLowerCase();
        if (!assigned.keywords.some((k) => hay.includes(k.toLowerCase()))) {
          fileIssues.push({ sev: "high", code: "metaphorMissing", detail: assigned.hito });
        }
      }
    }
    {
      const sl = L.slotSequence || [];
      const cues = sl.filter((s) => s.text === COPY).length;
      const dashes = sl.filter((s) => /^_{40}$/.test(s.text || "")).length;
      if (cues !== pts.length) fileIssues.push({ sev: "high", code: "copyCue", detail: cues + "/" + pts.length });
      // v3: one try-first row (at least) + TWO copy rows per Punto.
      if (dashes < pts.length * 3) fileIssues.push({ sev: "high", code: "dashRows", detail: String(dashes) });
      const dashRe = /^_{40}$/;
      sl.forEach((s, i) => {
        if (s.text === COPY) {
          if (!dashRe.test(sl[i + 1]?.text || "") || !dashRe.test(sl[i + 2]?.text || "")) {
            fileIssues.push({ sev: "high", code: "copyRowsTwo", detail: "slot " + s.index });
          }
        }
      });
    }

    const slots = L.slotSequence || doc.slotSequence;
    if (!Array.isArray(slots) || slots.length !== 156) {
      fileIssues.push({ sev: "blocker", code: "no156SlotFlow" });
    } else {
      const malformed = slots.some((slot, index) => {
        const expected = index + 1;
        return (
          slot.index !== expected ||
          slot.column !== Math.floor((expected - 1) / 52) + 1 ||
          slot.line !== ((expected - 1) % 52) + 1
        );
      });
      const questionSlots = slots.filter((slot) => slot.kind === "question");
      if (malformed || questionSlots.length !== qs.length) {
        fileIssues.push({ sev: "blocker", code: "no156SlotFlow" });
      }

      const col3Image = slots.filter(
        (s) =>
          s.column === 3 &&
          (s.kind === "imageInstruction" || s.kind === "drawing") &&
          (s.text || "").trim(),
      );
      const imageJoined = col3Image.map((s) => s.text.trim()).join(" ");
      const canonImage = (L.imageBandInstruction || "").trim();
      if (
        col3Image.length === 0 ||
        (canonImage && imageJoined.replace(/\s+/g, " ") !== canonImage.replace(/\s+/g, " "))
      ) {
        fileIssues.push({ sev: "high", code: "col3ImageInstruction" });
      }

      const col3ImageLines = col3Image.map((s) => s.line).sort((a, b) => a - b);
      if (col3ImageLines.length > 0) {
        const k = col3ImageLines.length;
        const expectStart = 52 - k + 1;
        const contiguous = col3ImageLines.every((ln, i) => ln === expectStart + i);
        const onlyImageAtTail = slots
          .filter((s) => s.column === 3 && s.line > expectStart - 1)
          .every((s) => s.kind === "imageInstruction" || s.kind === "drawing" || s.kind === "blank");
        const lessonAfterImage = slots.some(
          (s) =>
            s.column === 3 &&
            s.line >= expectStart &&
            !["imageInstruction", "drawing", "blank"].includes(s.kind) &&
            (s.text || "").trim(),
        );
        if (!contiguous || lessonAfterImage || !onlyImageAtTail) {
          fileIssues.push({ sev: "high", code: "col3ImageTail" });
        }
      }

      const kImage = col3ImageLines.length;
      const quizInk = slots.filter((s) =>
        ["question", "option", "answerLine"].includes(s.kind),
      ).length;
      const maxLessonSlots = 156 - quizInk - kImage;
      const lessonLike = slots.filter((s) =>
        ["opening", "lesson", "summary", "heading", "blank"].includes(s.kind),
      ).length;
      if (maxLessonSlots < 0) {
        fileIssues.push({ sev: "high", code: "lineBudgetQuizImage", detail: `K=${kImage}` });
      } else if (lessonLike > maxLessonSlots) {
        fileIssues.push({
          sev: "high",
          code: "lineBudgetLesson",
          detail: `${lessonLike}>${maxLessonSlots}`,
        });
      }

      for (const qSlot of questionSlots) {
        const c = qSlot.column;
        const l = qSlot.line;
        const qType =
          qSlot.questionType ||
          qs.find((q) => q.id === qSlot.questionId)?.type ||
          "mcq";
        const wantKind = qType === "mcq" ? "option" : "answerLine";
        // mcq: 4 options; write/schematic: 2 answer lines (8 pt pack).
        const followCount = qType === "mcq" ? 4 : 2;
        // Wrapped prompts continue on lesson slots that carry the same questionId.
        let promptExtra = 0;
        while (
          slots.find(
            (s) =>
              s.column === c &&
              s.line === l + 1 + promptExtra &&
              s.kind === "lesson" &&
              s.questionId === qSlot.questionId,
          )
        ) {
          promptExtra++;
        }
        const firstFollow = l + 1 + promptExtra;
        for (let off = 0; off < followCount; off++) {
          const follow = slots.find((s) => s.column === c && s.line === firstFollow + off);
          // mcq: options may wrap; only the first option row is checked here.
          if (qType === "mcq" && off > 0) break;
          if (!follow || follow.kind !== wantKind) {
            fileIssues.push({
              sev: "high",
              code: qType === "mcq" ? "questionBlock4" : "questionBlock2",
              detail: qSlot.questionId,
            });
            break;
          }
        }
      }

      // Column-major sequential: no lesson text after the first quiz slot in global order.
      const ordered = [...slots].sort((a, b) => (a.index || 0) - (b.index || 0));
      let seenQuiz = false;
      for (const s of ordered) {
        if (["question", "option", "answerLine"].includes(s.kind)) {
          seenQuiz = true;
          continue;
        }
        if (
          seenQuiz &&
          !s.questionId &&
          ["opening", "lesson", "heading", "summary"].includes(s.kind) &&
          String(s.text || "").trim()
        ) {
          fileIssues.push({ sev: "high", code: "packOrderNotSequential", detail: `index=${s.index}` });
          break;
        }
      }
      // One blank line between consecutive quiz questions (not needed at the top of a column).
      for (let oi = 1; oi < ordered.length; oi++) {
        const s = ordered[oi];
        if (s.kind !== "question") continue;
        const prev = ordered[oi - 1];
        const firstQuestion = !ordered.slice(0, oi).some((x) => x.kind === "question");
        if (firstQuestion || s.line === 1) continue;
        if (prev.kind !== "blank") {
          fileIssues.push({ sev: "high", code: "quizNoGap", detail: s.questionId });
          break;
        }
      }
      // Forbid equal-height parallel quiz bands: ≥2 columns with lesson above quiz
      // starting at the same line number (legacy section-height packing).
      const firstQByCol = {};
      for (const s of questionSlots) {
        if (firstQByCol[s.column] == null || s.line < firstQByCol[s.column]) {
          firstQByCol[s.column] = s.line;
        }
      }
      const lessonThenQuizStarts = [];
      for (const [colStr, firstQ] of Object.entries(firstQByCol)) {
        const col = Number(colStr);
        const hasLessonAbove = slots.some(
          (s) =>
            s.column === col &&
            s.line < firstQ &&
            ["opening", "lesson", "heading", "summary"].includes(s.kind) &&
            String(s.text || "").trim(),
        );
        if (hasLessonAbove) lessonThenQuizStarts.push(firstQ);
      }
      if (lessonThenQuizStarts.length >= 2 && new Set(lessonThenQuizStarts).size === 1) {
        fileIssues.push({
          sev: "high",
          code: "parallelQuizBand",
          detail: `line=${lessonThenQuizStarts[0]}`,
        });
      }

      let schematic = 0;
      for (const q of qs) {
        if (
          q.type === "schematic" ||
          q.schematic === true ||
          /esquemat|esquema|dibuj.*esquema/i.test(q.prompt || "")
        ) {
          schematic++;
        }
      }
      if (schematic < 2) {
        fileIssues.push({ sev: "high", code: "schematicMin2", detail: String(schematic) });
      }

      for (const h of slots.filter((s) => s.kind === "heading")) {
        const after = slots.find((s) => s.column === h.column && s.line === h.line + 1);
        const before = slots.find((s) => s.column === h.column && s.line === h.line - 1);
        // Multi-line headings (8 pt wrap) may continue on the next line.
        const afterOk =
          after &&
          (after.kind === "blank" || after.kind === "question" || after.kind === "heading");
        const beforeOk =
          h.line === 1 ||
          (before &&
            (before.kind === "blank" || before.kind === "opening" || before.kind === "heading"));
        if (!afterOk || !beforeOk) {
          fileIssues.push({ sev: "med", code: "headingBlankBand" });
          break;
        }
      }

      // A wrapped opening spans several consecutive `opening` slots; blanks follow the last one.
      const openings = slots.filter((s) => s.kind === "opening");
      const opening = openings.length ? openings[openings.length - 1] : null;
      if (opening) {
        const b1 = slots.find(
          (s) => s.column === opening.column && s.line === opening.line + 1,
        );
        const b2 = slots.find(
          (s) => s.column === opening.column && s.line === opening.line + 2,
        );
        if (!b1 || b1.kind !== "blank" || !b2 || !/^_{40}$/.test(b2.text || "")) {
          fileIssues.push({ sev: "high", code: "openingTwoBlankAnswers" });
        }
      }

      // Optional blank between question blocks (mcq = 4 response rows; write = 2).
      // At 8 pt, contiguous blocks are allowed when the lesson wrap needs the space.
      for (let qi = 0; qi < questionSlots.length - 1; qi++) {
        const q = questionSlots[qi];
        const nextQ = questionSlots[qi + 1];
        let end = q.index;
        for (const s of slots) {
          if (s.index <= q.index) continue;
          if (s.index >= nextQ.index) break;
          if (s.kind === "option" || s.kind === "answerLine") end = s.index;
          else if (s.kind === "lesson" && s.questionId === q.questionId) end = s.index;
          else break;
        }
        if (nextQ.index === end + 1) continue; // contiguous ok
        const between = slots.filter((s) => s.index > end && s.index < nextQ.index);
        if (!between.some((s) => s.kind === "blank")) {
          fileIssues.push({
            sev: "high",
            code: "questionBlankBetween",
            detail: q.questionId,
          });
          break;
        }
      }

      if (
        slots.some(
          (s) =>
            s.kind === "answerLine" &&
            String(s.text || "").trim() &&
            /^[.\u00B7\u2022\s]+$/.test(String(s.text || "").trim()),
        )
      ) {
        fileIssues.push({ sev: "high", code: "answerLineDotted" });
      }
    }
    if (
      qs.length &&
      (!L.quizIntegrated ||
        !Array.isArray(slots) ||
        qs.some(
          (question) =>
            !question.slot ||
            !slots.some(
              (slot) =>
                slot.kind === "question" &&
                slot.questionId === question.id &&
                slot.index === question.slot.index,
            ),
        ))
    ) {
      fileIssues.push({ sev: "blocker", code: "quizNotIntegrated" });
    }

    const lastBody = L.points?.[L.points.length - 1]?.body || "";
    const drawOk =
      /dibuj|dibuja|traza|colorea|bosqueja/i.test(lastBody) ||
      /dibuj|draw|sketch|trace|color/i.test(L.imageBandInstruction || "");
    if (!drawOk) fileIssues.push({ sev: "med", code: "drawEndCol3" });

    const forb = hasForbiddenBoilerplate(body);
    if (forb.length) fileIssues.push({ sev: "med", code: "forbidden", detail: forb.join(", ") });

    let genMcq = 0;
    for (const q of qs) {
      if (genericMcqPattern(q).length) genMcq++;
    }
    if (genMcq >= 4) {
      fileIssues.push({ sev: "high", code: "genericQuiz", detail: `${genMcq}/${qs.length}` });
    }

    const arch = path.join(dir, "archive", name.replace(".eoschool.json", ".pre-v2-20261002.eoschool.json"));
    if (!fs.existsSync(arch)) {
      if (doc.subject !== "fin") fileIssues.push({ sev: "med", code: "noBackup" });
    }
    else {
      const old = JSON.parse(fs.readFileSync(arch, "utf8"));
      if (old.supportUrl && doc.supportUrl && old.supportUrl !== doc.supportUrl) {
        fileIssues.push({ sev: "med", code: "supportUrlChanged" });
      }
    }

    const repasoMatch = body.match(/## Repaso\s*\n+([\s\S]*?)(\n\n##|\n\nPráctica:|$)/);
    if (day >= 2 && repasoMatch) {
      const lines = repasoMatch[1].split(/\n/).map((s) => s.trim()).filter(Boolean);
      if (lines.length < 3) {
        fileIssues.push({ sev: "high", code: "repasoLines", detail: String(lines.length) });
      }
    }

    files.push({ rel, day, subject: doc.subject, issues: fileIssues });
  }
}

const issueCounts = {};
for (const f of files) {
  for (const i of f.issues) {
    issueCounts[i.code] = (issueCounts[i.code] || 0) + 1;
  }
}

const blocked = files.filter((f) => f.issues.length > 0);
const onlyBlockers = files.filter((f) =>
  f.issues.length > 0 &&
  f.issues.every((i) => i.code === "no156SlotFlow" || i.code === "quizNotIntegrated"),
);

console.log(
  JSON.stringify(
    {
      total: files.length,
      filesWithAnyIssue: blocked.length,
      filesWithOnlyStructuralBlockers: onlyBlockers.length,
      issueCounts,
      examples: blocked
        .slice(0, 15)
        .map((f) => ({ file: f.rel, issues: f.issues })),
    },
    null,
    2,
  ),
);
