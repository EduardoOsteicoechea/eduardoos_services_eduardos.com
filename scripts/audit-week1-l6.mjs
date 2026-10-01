import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const week1 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../frontend/public/homescool/media/week1");
const subjects = ["pro", "esp", "ing", "lat", "mat", "his", "LT", "geo", "cie", "art", "exe", "teb"];

function wc(t) {
  return (t || "")
    .replace(/[#*]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
}

function band(doc) {
  const L = doc.lesson || {};
  let n = 0;
  for (const p of L.points || []) n += wc(p.body);
  if (doc.day === 1 && L.kind === "intro") n += wc(L.summary);
  n += wc(L.weekRecap) + wc(L.priorDayRecap);
  return n;
}

const rows = [];
for (const s of subjects) {
  for (let d = 1; d <= 5; d++) {
    const key = `${s}-c3-w1-d${d}-l6`;
    const f = path.join(week1, `${key}.eoschool.json`);
    if (!fs.existsSync(f)) {
      rows.push({ key, missing: true });
      continue;
    }
    const doc = JSON.parse(fs.readFileSync(f, "utf8"));
    const b = band(doc);
    let ok = "?";
    if (d === 1) ok = b >= 280 && b <= 350 ? "sí" : b < 280 ? "no-bajo" : "no-alto";
    else if (d >= 2 && d <= 4) ok = b >= 180 && b <= 260 ? "sí" : b < 180 ? "no-bajo" : "no-alto";
    else if (d === 5) {
      if (s === "pro") ok = b <= 220 && b >= 90 ? "sí" : b > 220 ? "no-alto" : "no-bajo";
      else ok = b <= 220 && b >= 150 ? "sí" : b > 220 ? "no-alto" : "no-bajo";
    }
    rows.push({
      key,
      day: d,
      kind: doc.lesson?.kind,
      band: b,
      ok,
      title: doc.title,
      pts: (doc.lesson?.points || []).length,
      locale: doc.locale,
    });
  }
}

const outPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "week1-l6-audit.json");
fs.writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`);
const under = rows.filter((r) => String(r.ok).includes("bajo")).length;
const ok = rows.filter((r) => r.ok === "sí").length;
const over = rows.filter((r) => String(r.ok).includes("alto")).length;
console.log(JSON.stringify({ total: rows.length, ok, under, over, outPath }, null, 2));
for (const r of rows.filter((x) => x.ok !== "sí")) {
  console.log(`${r.key}\t${r.band}\t${r.ok}`);
}
