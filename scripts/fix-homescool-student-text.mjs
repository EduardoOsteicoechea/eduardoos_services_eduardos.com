/**
 * Fix student-facing orthography and replace menu subject codes (his, geo, …)
 * with full Spanish labels in lesson + quiz text. Does not change JSON "subject" field.
 */
import fs from "node:fs";
import path from "node:path";

const mediaRoot = path.join("frontend", "public", "homescool", "media");

const SUBJECT_LABELS = {
  his: "Historia",
  geo: "Geografía",
  esp: "Español",
  ing: "Inglés",
  mat: "Matemáticas",
  art: "Bellas artes",
  cie: "Ciencias",
  lat: "Latín",
  pro: "Proyecto",
  LT: "Línea de tiempo",
  teb: "Teología bíblica",
  exe: "Exégesis",
};

const ORTHO_REPLACEMENTS = [
  [/áido/g, "árido"],
  [/precolombino/g, "precolombiano"],
  [/Coln/g, "Colón"],
  [/indgenas/g, "indígenas"],
  [/indgeno/g, "indígeno"],
  [/poltico/g, "político"],
  [/estadocapital/g, "estado y capital"],
  [/MirandaLos/g, "Miranda—Los"],
  [/ZuliaMaracaibo/g, "Zulia—Maracaibo"],
  [/CaraboboValencia/g, "Carabobo—Valencia"],
  [/Bolvar/g, "Bolívar"],
  [/atrs/g, "atrás"],
  [/Prctica/g, "Práctica"],
  [/travesa\b/g, "travesía"],
  [/\bPractica encontrando\b/g, "Prueba a encontrar"],
  [/Nombre el error común/g, "Nombra el error común"],
];

function fixOrthography(text) {
  let t = text;
  for (const [re, rep] of ORTHO_REPLACEMENTS) t = t.replace(re, rep);
  return t;
}

function replaceSubjectCode(text, code, label) {
  if (!code || !label) return text;
  const pairs = [
    [`ideas clave de ${code} `, `ideas clave de ${label} `],
    [`ideas clave de ${code}.`, `ideas clave de ${label}.`],
    [`profundizaste hoy en ${code}.`, `profundizaste hoy en ${label}.`],
    [`profundizaste hoy en ${code} `, `profundizaste hoy en ${label} `],
    [`relacionado con ${code}.`, `relacionado con ${label}.`],
    [`relacionado con ${code} `, `relacionado con ${label} `],
    [`te queda de ${code}?`, `te queda de ${label}?`],
    [`semana de ${code}.`, `semana de ${label}.`],
    [`semana de ${code} `, `semana de ${label} `],
    [`principales de ${code} `, `principales de ${label} `],
    [`repaso sobre ${code} `, `repaso sobre ${label} `],
    [`conectarías ${code} `, `conectarías ${label} `],
    [`evitar en ${code}.`, `evitar en ${label}.`],
    [`esquema mental de ${code}.`, `esquema mental de ${label}.`],
    [`una idea de ${code} `, `una idea de ${label} `],
    [`próxima semana en ${code}.`, `próxima semana en ${label}.`],
    [`próxima semana en ${code} `, `próxima semana en ${label} `],
  ];
  let t = text;
  for (const [from, to] of pairs) t = t.split(from).join(to);
  return t;
}

function fixSoloDistractors(text) {
  let t = text;
  for (const [code, label] of Object.entries(SUBJECT_LABELS)) {
    t = t.replace(new RegExp(`solo ${code}\\b`, "gi"), `solo ${label}`);
  }
  return t;
}

function fixStudentText(text, subjectCode) {
  let t = fixOrthography(text);
  t = fixSoloDistractors(t);
  const label = SUBJECT_LABELS[subjectCode];
  if (label) t = replaceSubjectCode(t, subjectCode, label);
  return t;
}

function walkStrings(doc, subjectCode, mutate) {
  if (doc.title) doc.title = mutate(doc.title, subjectCode);
  if (doc.lesson?.summary) doc.lesson.summary = mutate(doc.lesson.summary, subjectCode);
  for (const p of doc.lesson?.points ?? []) {
    if (p.heading) p.heading = mutate(p.heading, subjectCode);
    if (p.body) p.body = mutate(p.body, subjectCode);
  }
  for (const q of doc.quiz?.questions ?? []) {
    if (q.prompt) q.prompt = mutate(q.prompt, subjectCode);
    if (Array.isArray(q.choices)) {
      q.choices = q.choices.map((c) => mutate(c, subjectCode));
    }
    if (q.answer && typeof q.answer === "string") {
      q.answer = mutate(q.answer, subjectCode);
    }
    if (q.crossword) walkActivity(q.crossword, mutate, subjectCode);
    if (q.wordsearch) walkActivity(q.wordsearch, mutate, subjectCode);
    if (q.match) walkMatch(q.match, mutate, subjectCode);
  }
}

function walkActivity(obj, mutate, subjectCode) {
  if (!obj) return;
  for (const clue of obj.cluesAcross ?? []) {
    if (clue.clue) clue.clue = mutate(clue.clue, subjectCode);
  }
  for (const clue of obj.cluesDown ?? []) {
    if (clue.clue) clue.clue = mutate(clue.clue, subjectCode);
  }
  if (Array.isArray(obj.words)) {
    obj.words = obj.words.map((w) => mutate(w, subjectCode));
  }
}

function walkMatch(match, mutate, subjectCode) {
  if (!match) return;
  if (Array.isArray(match.left)) {
    match.left = match.left.map((s) => mutate(s, subjectCode));
  }
  if (Array.isArray(match.right)) {
    match.right = match.right.map((s) => mutate(s, subjectCode));
  }
}

let changed = 0;
for (const weekDir of ["week1", "week2"]) {
  const root = path.join(mediaRoot, weekDir);
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith(".eoschool.json")) continue;
    const file = path.join(root, name);
    const raw = fs.readFileSync(file, "utf8");
    const doc = JSON.parse(raw);
    const before = JSON.stringify(doc);
    walkStrings(doc, doc.subject, fixStudentText);
    const after = JSON.stringify(doc);
    if (before !== after) {
      fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
      changed++;
      console.log("fixed", path.join(weekDir, name));
    }
  }
}
console.log(`done files_changed=${changed}`);
