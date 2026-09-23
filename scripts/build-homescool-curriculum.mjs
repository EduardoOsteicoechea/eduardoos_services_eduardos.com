/**
 * Merge all .eoschool.json under frontend/public/homescool/media into
 * frontend/public/homescool/curriculum.json (agent-reviewable SoT).
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join("frontend", "public", "homescool", "media");
const dest = path.join("frontend", "public", "homescool", "curriculum.json");

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".eoschool.json")) out.push(p);
  }
}

const files = [];
walk(root, files);
files.sort((a, b) => a.localeCompare(b));

const classes = [];
for (const f of files) {
  const doc = JSON.parse(fs.readFileSync(f, "utf8"));
  const rel = f.split(path.sep).join("/");
  const source = rel.replace(/^frontend\/public/, "");
  const key = `c${doc.cycle}-w${doc.week}-d${doc.day}-l${doc.level}-${doc.subject}`;
  classes.push({ key, source, ...doc });
}

const out = {
  format: "homescool-curriculum",
  version: 1,
  level: 6,
  description:
    "Dedicated Homescool class content for agent review/validation and PDF preview. Each entry is one METHOD_V1 .eoschool lesson+quiz cell.",
  classCount: classes.length,
  classes,
};

fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote ${dest} classes=${classes.length} bytes=${fs.statSync(dest).size}`);
