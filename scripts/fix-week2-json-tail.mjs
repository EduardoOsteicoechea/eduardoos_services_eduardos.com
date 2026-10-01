import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const week2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/public/homescool/media/week2");
const keys = [
  "art-c3-w2-d5-l6",
  "cie-c3-w2-d5-l6",
  "geo-c3-w2-d5-l6",
  "ing-c3-w2-d5-l6",
  "lat-c3-w2-d5-l6",
  "pro-c3-w2-d2-l6",
];

function cleanBody(body, locale) {
  let t = body.replace(/\\n\\n/g, "\n\n").replace(/\\n/g, "\n");
  const dupEs =
    "\n\nPráctica: Ahora te toca a ti. Di en voz alta la idea clave.\n\nError común: Mezclar ideas de dos puntos distintos.";
  const dupEn =
    "\n\nPractice: Your turn. Say the key idea out loud.\n\nCommon mistake: Mixing up two different points.";
  while (t.includes(dupEs)) t = t.replace(dupEs, "");
  while (t.includes(dupEn)) t = t.replace(dupEn, "");
  if (locale === "en") {
    t = t.replace(
      /Práctica: Ahora te toca a ti\. Di en voz alta la idea clave\./g,
      "Practice: Your turn. Say the key idea out loud.",
    );
    t = t.replace(/Error común: Mezclar ideas de dos puntos distintos\./g, "Common mistake: Mixing up two different points.");
    if (!/Practice:/i.test(t)) {
      t += "\n\nPractice: Your turn. Say the key idea out loud.\n\nCommon mistake: Mixing up two different points.";
    }
  }
  return t.trim();
}

for (const key of keys) {
  const file = path.join(week2, `${key}.eoschool.json`);
  let raw = fs.readFileSync(file, "utf8");
  if (raw.charCodeAt(raw.length - 2) === 92 && raw.charCodeAt(raw.length - 1) === 110) {
    raw = raw.slice(0, -2);
  }
  const doc = JSON.parse(raw);
  for (const pt of doc.lesson.points ?? []) {
    pt.body = cleanBody(pt.body, doc.locale);
  }
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  JSON.parse(fs.readFileSync(file, "utf8"));
  console.log("fixed", key);
}
