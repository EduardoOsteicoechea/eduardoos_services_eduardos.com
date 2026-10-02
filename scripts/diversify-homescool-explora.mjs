/**
 * Replace boilerplate Explora paragraphs in ciclo-3 week1–2 eoschool JSON.
 */
import fs from "node:fs";
import path from "node:path";

const roots = [
  "frontend/public/homescool/media/week1",
  "frontend/public/homescool/media/week2",
];

const BOILERS = new Set([
  "Mira de nuevo el ejemplo de la primera oración. Di qué cambia y qué se mantiene igual.",
  "Look again at the example in the first sentence. Say what changes and what stays the same.",
  "Compara dos ejemplos en voz alta y señala qué cambia y qué se mantiene igual. Escribe una frase corta con tus propias palabras antes de pasar a la práctica.",
  "Práctica: Ahora te toca a ti. Di en voz alta la idea clave.",
]);

const used = new Set();

function clip(s, n) {
  return String(s || "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
}

const templatesEs = [
  (h, idea) =>
    `Observa un caso real de «${h}». Di en una frase qué aprendiste: ${clip(idea, 50)}.`,
  (h) => `Compara «${h}» con algo de tu casa o patio. ¿En qué se parecen?`,
  (h) => `Señala la palabra más importante de «${h}» y explica por qué importa.`,
  (h) => `Haz una pregunta de detective sobre «${h}» y responde con lo leído.`,
  (h) => `Dibuja un esquema rápido de «${h}» con tres flechas o cajas.`,
  (h) => `Explica «${h}» a un compañero más pequeño usando solo palabras sencillas.`,
  (h) => `Elige un detalle de «${h}» que podrías olvidar y escríbelo otra vez.`,
  (h, idea) => `Busca en el párrafo la prueba de: ${clip(idea, 55)}.`,
  (h) => `Di en voz alta: «Antes pensaba…; ahora veo que «${h}»…».`,
  (h) => `Inventa un ejemplo nuevo (no el del texto) que ilustre «${h}».`,
];

const templatesEn = [
  (h) => `Look at a real case of "${h}". Say one sentence about what you learned.`,
  (h) => `Compare "${h}" with something at home. How are they alike?`,
  (h) => `Point to the key word in "${h}" and say why it matters.`,
  (h) => `Ask a detective question about "${h}" and answer from the text.`,
  (h) => `Sketch "${h}" with three quick boxes or arrows.`,
  (h) => `Explain "${h}" to a younger child with simple words.`,
  (h) => `Pick one detail from "${h}" you might forget and write it again.`,
  (_h, idea) => `Find the proof in the paragraph for: ${clip(idea, 55)}.`,
  (h) => `Say aloud: "Before I thought…; now I see that '${h}'…".`,
  (h) => `Make a brand-new example (not from the text) for "${h}".`,
];

function makeExplora(d, p, idea) {
  const en = d.locale === "en" || d.subject === "ing";
  const list = en ? templatesEn : templatesEs;
  const h = p.heading || d.title || "este punto";
  for (let t = 0; t < list.length; t++) {
    for (let k = 0; k < 3; k++) {
      const text = list[(t + k) % list.length](h, idea);
      const key = `${d.subject}|${text}`;
      if (!used.has(key)) {
        used.add(key);
        return text;
      }
    }
  }
  const fallback = en
    ? `Explore "${h}" with a new example today.`
    : `Explora «${h}» con un ejemplo nuevo hoy.`;
  used.add(`${d.subject}|${fallback}`);
  return fallback;
}

const files = [];
for (const r of roots) {
  for (const f of fs.readdirSync(r)) {
    if (f.endsWith(".eoschool.json")) files.push(path.join(r, f));
  }
}

let fixed = 0;
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  let changed = false;
  for (const p of d.lesson?.points || []) {
    const parts = String(p.body || "").split(/\n\n+/);
    if (parts.length < 2) continue;
    const explora = parts[1].trim();
    if (!BOILERS.has(explora)) continue;
    parts[1] = makeExplora(d, p, parts[0]);
    p.body = parts.join("\n\n");
    changed = true;
    fixed++;
  }
  if (changed) fs.writeFileSync(f, `${JSON.stringify(d, null, 2)}\n`);
}

console.log(JSON.stringify({ fixed, files: files.length }));
