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
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith("-l6.eoschool.json"))) {
    const fp = path.join(dir, name);
    const doc = JSON.parse(fs.readFileSync(fp, "utf8"));
    const rel = `week${week}/${name}`;
    const fileIssues = [];
    const L = doc.lesson || {};

    if (L.layout !== "letter-grid-v2") fileIssues.push({ sev: "high", code: "layout" });
    if (L.v2Flow !== true) fileIssues.push({ sev: "med", code: "v2Flow" });
    if (!L.imageBandInstruction?.trim()) fileIssues.push({ sev: "high", code: "imageBandInstruction" });

    if (!doc.supportUrl?.trim()) fileIssues.push({ sev: "high", code: "supportUrl" });
    if (memSubjects.has(doc.subject) && !L.memoryPhrase?.trim()) {
      fileIssues.push({ sev: "high", code: "memoryPhrase" });
    }

    const qs = doc.quiz?.questions || [];
    const { mcq, write } = countMcqWrite(qs);
    if (qs.length !== 12 || mcq !== 8 || write !== 4) {
      fileIssues.push({
        sev: "high",
        code: "quizCount",
        detail: `${qs.length} total ${mcq} mcq ${write} write`,
      });
    }

    const body = allText(doc);
    const day = doc.day;

    if (day >= 2) {
      if (!/¿Qué aprendiste ayer sobre esta misma materia\?/i.test(body)) {
        fileIssues.push({ sev: "high", code: "ayerQuestion" });
      }
      if (!/## Repaso/i.test(body)) fileIssues.push({ sev: "high", code: "repasoHeading" });
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
      const maxLessonSlots = 156 - questionSlots.length * 5 - kImage;
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
        for (let off = 1; off <= 4; off++) {
          const follow = slots.find((s) => s.column === c && s.line === l + off);
          if (!follow || follow.kind !== wantKind) {
            fileIssues.push({ sev: "high", code: "questionBlock4", detail: qSlot.questionId });
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
          ["opening", "lesson", "heading", "summary"].includes(s.kind) &&
          String(s.text || "").trim()
        ) {
          fileIssues.push({ sev: "high", code: "packOrderNotSequential", detail: `index=${s.index}` });
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
        const afterOk =
          after && (after.kind === "blank" || after.kind === "question");
        const beforeOk =
          h.line === 1 ||
          (before && (before.kind === "blank" || before.kind === "opening"));
        if (!afterOk || !beforeOk) {
          fileIssues.push({ sev: "med", code: "headingBlankBand" });
          break;
        }
      }

      const opening = slots.find((s) => s.kind === "opening");
      if (opening) {
        const b1 = slots.find(
          (s) => s.column === opening.column && s.line === opening.line + 1,
        );
        const b2 = slots.find(
          (s) => s.column === opening.column && s.line === opening.line + 2,
        );
        if (!b1 || b1.kind !== "blank" || !b2 || b2.kind !== "blank") {
          fileIssues.push({ sev: "high", code: "openingTwoBlankAnswers" });
        }
      }

      // Blank between consecutive question blocks (after 4 response rows).
      for (let qi = 0; qi < questionSlots.length - 1; qi++) {
        const q = questionSlots[qi];
        const nextQ = questionSlots[qi + 1];
        const gapIndex = q.index + 5;
        const gap = slots.find((s) => s.index === gapIndex);
        if (!gap || gap.kind !== "blank" || nextQ.index !== gapIndex + 1) {
          // Allow column-pad blanks between end of block and next question.
          const between = slots.filter(
            (s) => s.index > q.index + 4 && s.index < nextQ.index,
          );
          if (!between.some((s) => s.kind === "blank")) {
            fileIssues.push({
              sev: "high",
              code: "questionBlankBetween",
              detail: q.questionId,
            });
            break;
          }
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
      fileIssues.push({ sev: "high", code: "genericQuiz", detail: `${genMcq}/12` });
    }

    const arch = path.join(dir, "archive", name.replace(".eoschool.json", ".pre-v2-20261002.eoschool.json"));
    if (!fs.existsSync(arch)) fileIssues.push({ sev: "med", code: "noBackup" });
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
        .filter((f) => f.issues.some((i) => i.code === "genericQuiz"))
        .slice(0, 5)
        .map((f) => ({ file: f.rel, issues: f.issues })),
    },
    null,
    2,
  ),
);
