/**
 * Batch-fix Homescool .eoschool JSON for cambios 6–8, 10, 12–13 + quiz shuffle (7).
 * Usage: node scripts/patch-homescool-cambios.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaRoot = path.resolve(__dirname, "../frontend/public/homescool/media");

const REFORMED_CITATIONS = [
  "Escritura: Génesis 1:1. Calvino (Institución I.i): el conocimiento de Dios y de nosotros mismos van unidos.",
  "Escritura: Romanos 1:16–17. Lutero subrayó que el justo vive por la fe; la justicia es don, no mérito.",
  "Escritura: Efesios 2:8–9. La gracia sola salva; las obras son fruto, no causa (confesión reformada).",
  "Escritura: Juan 1:1–3. El Verbo eterno; Agustín y los reformados afirman la deidad de Cristo.",
  "Escritura: Salmo 119:105. La Escritura ilumina el camino; sola Scriptura no desprecia la iglesia, la corrige.",
  "Escritura: 2 Timoteo 3:16–17. Toda la Escritura es inspirada y útil; Calvino la llamó regla de fe y vida.",
  "Escritura: Hebreos 1:1–2. Dios habló por los profetas y en el Hijo; la revelación culmina en Cristo.",
  "Escritura: Isaías 40:8. La hierba se seca; la palabra de nuestro Dios permanece para siempre.",
];

const ERROR_VARIANTS = [
  (core) => `Error común: Antes de terminar, un aviso. ${core}`,
  (core) => `Error a corregir: Vigila este tropiezo frecuente: ${core}`,
  (core) => `Error común: No te quedes con esta confusión: ${core}`,
  (core) => `Error a corregir: Corrige a tiempo esta idea: ${core}`,
  (core) => `Error común: Diferéncialo con claridad: ${core}`,
];

const EXPLORA_PREFIXES = [
  "Explora con detalle:",
  "Observa con atención:",
  "Compara y anota:",
  "Investiga en tu entorno:",
  "Relaciona con lo ya visto:",
  "Describe con precisión:",
];

function walkJsonFiles(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkJsonFiles(full, out);
    else if (name.endsWith(".eoschool.json")) out.push(full);
  }
  return out;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function polishLanguage(text) {
  return text
    .replace(/\b[Tt]ápate\b/g, "Cubre")
    .replace(/\btapate\b/gi, "cubre")
    .replace(/\bchévere\b/gi, "buena")
    .replace(/\bpana\b/gi, "compañero")
    .replace(/\bvaina\b/gi, "asunto");
}

function stripErrorPrefix(text) {
  return text
    .replace(/^(Error común|Error a corregir|Error to fix|Mistake to fix|Error:)\s*/i, "")
    .replace(/^Antes de terminar, un aviso\.\s*/i, "")
    .trim();
}

function rewriteErrorParagraph(text, seed) {
  const core = stripErrorPrefix(text);
  if (!core) return text;
  const fn = ERROR_VARIANTS[seed % ERROR_VARIANTS.length];
  return fn(core.charAt(0).toLowerCase() + core.slice(1));
}

function rewriteExploraParagraph(text, seed) {
  // Avoid duplicating a generic opener; swap or prepend a varied lead-in.
  let body = text.trim();
  body = body.replace(/^(Ahora mira esto con calma\.|Sigamos juntos\.|Explora:)\s*/i, "");
  const prefix = EXPLORA_PREFIXES[seed % EXPLORA_PREFIXES.length];
  return `${prefix} ${body}`;
}

function ensureTebCitation(body, seed) {
  if (/Escritura:|Génesis|Romanos|Efesios|Salmo|Hebreos|Isaías|Juan |Calvino|Lutero/i.test(body)) {
    return body;
  }
  const cite = REFORMED_CITATIONS[seed % REFORMED_CITATIONS.length];
  return `${cite}\n\n${body}`;
}

function looksSpanishPrompt(prompt) {
  return /\b(cuál|cuál|qué|quién|dónde|cómo|cuánt|explica|escribe|elige|verdadero|falso)\b/i.test(
    prompt,
  );
}

function patchDoc(doc, filePath) {
  const stats = {
    shuffled: 0,
    language: 0,
    errors: 0,
    explora: 0,
    tebCite: 0,
    ingPrompt: 0,
  };
  const baseSeed = hash(filePath);

  if (Array.isArray(doc.lesson?.points)) {
    doc.lesson.points = doc.lesson.points.map((p, pi) => {
      let body = String(p.body || "");
      const before = body;
      body = polishLanguage(body);
      if (body !== before) stats.language += 1;

      if (doc.subject === "teb") {
        const cited = ensureTebCitation(body, baseSeed + pi * 17);
        if (cited !== body) {
          body = cited;
          stats.tebCite += 1;
        }
      }

      const paras = body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
      const next = paras.map((para, qi) => {
        const seed = baseSeed + pi * 31 + qi * 13 + (doc.day || 1) * 7;
        if (/^(Error común|Error a corregir|Error to fix|Mistake to fix|Error:)/i.test(para)) {
          stats.errors += 1;
          return rewriteErrorParagraph(para, seed);
        }
        if (doc.subject === "cie") {
          // Mid paragraphs (Explora / card) — skip practice/error/lead-like practice
          if (
            !/^(Práctica|Error|Meta|Consejo|Practice|Idea)/i.test(para) &&
            qi > 0
          ) {
            stats.explora += 1;
            return rewriteExploraParagraph(para, seed);
          }
        }
        return para;
      });
      return { ...p, body: next.join("\n\n") };
    });
  }

  if (doc.lesson?.summary) {
    const s = polishLanguage(doc.lesson.summary);
    if (s !== doc.lesson.summary) {
      doc.lesson.summary = s;
      stats.language += 1;
    }
  }

  if (Array.isArray(doc.quiz?.questions)) {
    doc.quiz.questions = doc.quiz.questions.map((q, qi) => {
      let prompt = polishLanguage(String(q.prompt || ""));
      if (doc.subject === "ing" && looksSpanishPrompt(prompt)) {
        // Soft cue: keep meaning but mark as English practice framing.
        prompt = `In English: ${prompt.replace(/^(Cuál|Qué|Quién|Dónde|Cómo)\b/i, "What")}`;
        stats.ingPrompt += 1;
      }
      const next = { ...q, prompt };
      if (String(q.type || "").toLowerCase() === "mcq" && Array.isArray(q.choices) && q.choices.length > 1) {
        const answer = String(q.answer || "").trim();
        const shuffled = seededShuffle(
          q.choices.map(String),
          baseSeed + qi * 97 + (doc.day || 1) * 11,
        );
        next.choices = shuffled;
        if (answer) {
          // Keep answer as the choice text (engine compares text, not letter).
          const match = shuffled.find((c) => c.trim() === answer) || answer;
          next.answer = match;
        }
        stats.shuffled += 1;
      }
      return next;
    });
  }

  return stats;
}

const files = walkJsonFiles(mediaRoot);
const totals = {
  files: 0,
  shuffled: 0,
  language: 0,
  errors: 0,
  explora: 0,
  tebCite: 0,
  ingPrompt: 0,
};

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const doc = JSON.parse(raw);
  const stats = patchDoc(doc, file);
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  totals.files += 1;
  for (const k of Object.keys(stats)) totals[k] = (totals[k] || 0) + stats[k];
}

console.log("[patch-homescool-cambios]", totals);
