/**
 * Rewrite Homescool .eoschool lesson bodies into concise, natural narrative.
 * Removes telegraphic separators (| , bare Term = def, → chains in prose),
 * stacked error prefixes, and "Línea: A | B" style prompts.
 *
 * Usage: node scripts/rewrite-homescool-narrative.mjs
 * Then:  node scripts/build-homescool-curriculum.mjs  (with API env to sync Mongo)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaRoot = path.resolve(__dirname, "../frontend/public/homescool/media");
const weekDirs = ["week1", "week2"];

function walkWeekFiles() {
  const out = [];
  for (const week of weekDirs) {
    const dir = path.join(mediaRoot, week);
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".eoschool.json")) out.push(path.join(dir, name));
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

/** Keep math / conjugation equations; rewrite glossary-style Term = gloss. */
function isEquationLeft(left) {
  const t = left.trim();
  if (!t) return true;
  if (/[0-9×*/÷]/.test(t)) return true;
  if (/\d\s*[xX]\s*\d/.test(t)) return true; // 3x7 style only
  if (/-\s*$/.test(t)) return true; // habl- / cant-
  if (/\+\s*-/.test(t)) return true; // beb- + -o
  return false;
}

function capitalizeIfSentenceStart(s, full, idx) {
  if (!s) return s;
  const before = full.slice(Math.max(0, idx - 12), idx);
  if (/(^|[\n.!?]\s*)$/.test(before) || before.trim() === "") {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

function joinListNatural(parts) {
  const clean = parts.map((p) => p.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} y ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} y ${clean[clean.length - 1]}`;
}

function rewritePipesInPractice(text) {
  return text
    // "Línea: A | B | C — una frase por bloque"
    .replace(
      /L[ií]nea\s*:\s*([^.\n]+?)\s*[—\-–]\s*una frase por bloque\.?/gi,
      (_, list) => {
        const parts = list.split("|").map((s) => s.trim()).filter(Boolean);
        if (parts.length < 2) return `Escribe una frase corta sobre ${list.trim()}.`;
        return `Escribe una frase corta sobre ${joinListNatural(parts)}.`;
      },
    )
    // "Dos columnas: X | Y" / "Tabla …: a | b | c"
    .replace(
      /((?:Dos|Tres|Cuatro)\s+columnas|Tabla(?:\s+[^\n:]{0,40})?)\s*:\s*([^.\n]*\|[^.\n]*)/gi,
      (_, lead, cols) => {
        const parts = cols.split("|").map((s) => s.replace(/[—\-–].*$/, "").trim()).filter(Boolean);
        const n = parts.length;
        const label =
          /tabla/i.test(lead) ? `Haz una tabla de ${n} columnas` : `Haz ${String(lead).toLowerCase()}`;
        return `${label} con estos encabezados: ${joinListNatural(parts)}`;
      },
    )
    // "velocidad | ¿fusiona?"
    .replace(
      /Tabla:\s*([^.\n]*\|[^.\n]*)/gi,
      (_, cols) => {
        const parts = cols.split("|").map((s) => s.trim()).filter(Boolean);
        return `En una tabla anota ${joinListNatural(parts)}`;
      },
    )
    // Generic remaining "A | B | C" in practice lines → commas
    .replace(/([^|\n]{2,40})\s*\|\s*([^|\n]{2,40})(?:\s*\|\s*([^|\n]{2,40}))?/g, (m, a, b, c) => {
      // Skip if looks like a code path
      if (/https?:|\.js|\.json|\\|\//.test(m)) return m;
      const parts = [a, b, c].filter(Boolean).map((s) => s.trim());
      return joinListNatural(parts);
    });
}

function rewriteEqualsGlossary(text) {
  // Any leftover "Term = gloss" (including mid-sentence), except math/conjugation.
  return text.replace(
    /([A-Za-záéíóúñÁÉÍÓÚÑ«»""][^ =\n|]{0,48}?)\s=\s+([^.\n|;]+)/g,
    (full, left, right) => {
      if (isEquationLeft(left)) return full;
      const term = left.replace(/^["«]|["»]$/g, "").trim();
      const gloss = right.trim().replace(/\s+/g, " ");
      if (/^[OiLS]$/.test(term)) return `${term} significa ${gloss}`;
      if (/^(decir|comparar|dibujar|cubrir|unir|explicar|prueba)/i.test(gloss)) {
        return `${term} quiere decir ${gloss}`;
      }
      return `${term} es ${gloss.replace(/^es\s+/i, "")}`;
    },
  );
}

function rewriteArrows(text) {
  return text
    // Narrative panorama chains (not conjugation habl- → hablo)
    .replace(
      /(creación|caída|diluvio|rescate|promesa|patriarcas)(\s*(?:→|->)\s*(?:creación|caída|diluvio|rescate|promesa|patriarcas|Abraham)(?:\s*(?:→|->)\s*(?:creación|caída|diluvio|rescate|promesa|patriarcas|Abraham))?)/gi,
      (m) => {
        const parts = m.split(/\s*(?:→|->)\s*/i).map((s) => s.trim());
        return joinListNatural(parts);
      },
    )
    .replace(
      /mini\s+l[ií]nea\s*:\s*([^.\n]+)/gi,
      (_, chain) => {
        const parts = chain.split(/\s*(?:→|->|\|)\s*/).map((s) => s.trim()).filter(Boolean);
        return `mini línea del tiempo con ${joinListNatural(parts)}`;
      },
    )
    .replace(
      /panorama une\s+([^.\n]+)/gi,
      (_, chain) => {
        const parts = chain.split(/\s*(?:→|->|\|)\s*/).map((s) => s.trim()).filter(Boolean);
        return `El panorama une ${joinListNatural(parts)}`;
      },
    )
    // Stimulus chain: Ver peligro → nervio → músculo
    .replace(
      /Ver peligro\s*(?:→|->)\s*nervio\s*(?:→|->)\s*músculo/gi,
      "Ver un peligro, el nervio avisa y el músculo responde",
    );
}

function rewriteErrorBlocks(text) {
  return text
    // Collapse stacked prefixes + double colon
    .replace(
      /Error(?:\s+(?:común|a corregir))\s*:\s*(?:Antes de terminar, un aviso\.|Vigila este tropiezo frecuente:|No te quedes con esta confusión:|Corrige a tiempo esta idea:|Diferéncialo con claridad:)\s*:?\s*(?:Antes de terminar, un aviso\.\s*)?/gi,
      "Error común: ",
    )
    .replace(/:\s*:\s*/g, ": ")
    .replace(/(Error común:\s*)+/gi, "Error común: ")
    .replace(/(Error a corregir:\s*)+/gi, "Error común: ")
    .replace(/Error común:\s*Error común:/gi, "Error común:");
}

function rewriteFocoTelegraph(text) {
  return text
    .replace(
      /(?:Ahora mira esto con calma\.\s*)?foco(?:\s+de hoy)?\s*\(\s*[«"]([^»"]+)[»"]\s*\)\s*:\s*/gi,
      (_m, topic) => `Ahora mira con calma el punto «${topic.trim()}». `,
    )
    .replace(
      /enfoque de esta clase\s*\(\s*[«"]([^»"]+)[»"]\s*\)\s*:\s*/gi,
      (_m, topic) => `En esta clase el enfoque es «${topic.trim()}». `,
    )
    .replace(/\bHoy\s+hoy\s+profundizas\b/gi, "Hoy profundizas")
    .replace(/\bProfundizas\b/g, "Hoy profundizas");
}

function rewritePracticeLead(text) {
  return text
    .replace(
      /Práctica:\s*Ahora te toca a ti\.\s*Tres palabras:\s*([^—\n]+)\s*[—\-–]\s*define cada una\.?/gi,
      (_m, words) => {
        const parts = words.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        return `Práctica: Ahora te toca a ti. Define con tus palabras ${joinListNatural(parts)}.`;
      },
    )
    .replace(
      /Práctica:\s*Ahora te toca a ti\.\s*(?:L[ií]nea:\s*)?([^\n]*\|[^\n]*?)(?:\s*[—\-–]\s*una frase por bloque)?\.?/gi,
      (_m, list) => {
        const parts = list
          .replace(/\s*[—\-–]\s*una frase por bloque\.?/gi, "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        return `Práctica: Ahora te toca a ti. Escribe una frase corta sobre ${joinListNatural(parts)}.`;
      },
    )
    .replace(
      /Práctica:\s*Ahora te toca a ti\.\s*Escribe una frase corta sobre Creación y Caída\/Diluvio\.\s*Abraham\s*[—\-–]\s*una frase por bloque\.?/gi,
      "Práctica: Ahora te toca a ti. Escribe una frase corta sobre la creación, otra sobre la caída y el diluvio, y otra sobre Abraham.",
    )
    .replace(
      /Práctica:\s*Ahora te toca a ti\.\s*L[ií]nea:\s*/gi,
      "Práctica: Ahora te toca a ti. ",
    );
}

function polishAwkwardEs(text) {
  return text
    .replace(/\bPromesa es Dios jura\b/gi, "La promesa es el juramento de Dios de")
    .replace(/\bPatriarcas es padres fundadores\b/gi, "Los patriarcas son los padres fundadores")
    .replace(/\bCaída es desobediencia\b/gi, "La caída es la desobediencia")
    .replace(/\bPecado es romper\b/gi, "El pecado es romper")
    .replace(/\bDiluvio es gran juicio\b/gi, "El diluvio es el gran juicio")
    .replace(/\bCreación es Dios hace\b/gi, "La creación es cuando Dios hace")
    .replace(/\bbondad es\b/gi, "la bondad es")
    .replace(/\bPanorama es vista general\b/gi, "Un panorama es una vista general")
    .replace(/\bGénesis es el primer libro\b/gi, "Génesis es el primer libro")
    .replace(/\btierra prometida es\b/gi, "La tierra prometida es")
    .replace(/\bExégesis es explicar\b/gi, "La exégesis es explicar")
    .replace(/\bexégesis es explicar\b/g, "la exégesis es explicar")
    .replace(/\bExpresar = dibujar y mejorar\b/gi, "Expresar quiere decir dibujar y mejorar")
    .replace(/\bExégesis = explicar\b/gi, "La exégesis es explicar")
    .replace(/\bexégesis = explicar\b/g, "la exégesis es explicar")
    .replace(/\bExperimento = prueba ordenada\b/gi, "Un experimento es una prueba ordenada")
    .replace(/\bEl El panorama\b/g, "El panorama")
    .replace(/\bHoy hoy /gi, "Hoy ");
}

function tidyWhitespace(text) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/  +/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.\s*\./g, ".")
    .trim();
}

function rewriteBody(body) {
  if (typeof body !== "string" || !body.trim()) return body;
  let t = body;
  t = rewriteErrorBlocks(t);
  t = rewritePracticeLead(t);
  t = rewritePipesInPractice(t);
  t = rewriteEqualsGlossary(t);
  t = rewriteArrows(t);
  t = rewriteFocoTelegraph(t);
  // Second pass: leftover glossary equals mid-sentence
  t = rewriteEqualsGlossary(t);
  t = polishAwkwardEs(t);
  t = tidyWhitespace(t);
  return t;
}

function rewriteDoc(doc) {
  let changed = false;
  if (doc.lesson?.points) {
    for (const p of doc.lesson.points) {
      if (typeof p.body === "string") {
        const next = rewriteBody(p.body);
        if (next !== p.body) {
          p.body = next;
          changed = true;
        }
      }
    }
  }
  if (typeof doc.lesson?.summary === "string" && doc.lesson.summary) {
    const next = rewriteBody(doc.lesson.summary);
    if (next !== doc.lesson.summary) {
      doc.lesson.summary = next;
      changed = true;
    }
  }
  return changed;
}

function stillDirty(text) {
  const issues = [];
  if (/\|/.test(text)) issues.push("pipe");
  if (/L[ií]nea\s*:/i.test(text)) issues.push("linea");
  if (/:\s*:/.test(text) || /aviso\.\s*:\s*Antes/i.test(text)) issues.push("doubleColon");
  if (/\b[A-Za-záéíóúñÁÉÍÓÚÑ][^ =\n]{0,40}\s=\s/.test(text) && !/[0-9×]|-\s*\+|habl-|cant-|beb-|com-|viv-|abr-/.test(text)) {
    // count glossary-like equals remaining
    const m = text.match(/(^|[\n.!?]\s*)([A-Za-záéíóúñÁÉÍÓÚÑ][^ =\n]{0,40})\s=\s+/gm);
    if (m && m.some((x) => !isEquationLeft(x.replace(/^.*=/, "x").slice(0, -1)))) issues.push("eq");
  }
  return issues;
}

const files = walkWeekFiles();
let changedFiles = 0;
const remaining = [];

for (const file of files) {
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  if (rewriteDoc(doc)) {
    fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
    changedFiles += 1;
  }
  const texts = [];
  for (const p of doc.lesson?.points || []) if (p.body) texts.push(p.body);
  if (doc.lesson?.summary) texts.push(doc.lesson.summary);
  const blob = texts.join("\n");
  const issues = stillDirty(blob);
  if (issues.length) remaining.push({ file: path.basename(file), issues, snippet: blob.match(/[^\n]*\|[^\n]*|[^\n]*L[ií]nea[^\n]*|[^\n]*aviso\.\s*:[^\n]*/i)?.[0] });
}

console.log(JSON.stringify({ files: files.length, changedFiles, remainingCount: remaining.length, remaining: remaining.slice(0, 25) }, null, 2));
