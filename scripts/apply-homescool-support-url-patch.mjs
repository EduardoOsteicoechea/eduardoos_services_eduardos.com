/**
 * Apply supportUrl values from
 * frontend/public/homescool/support-url-proposals-c3-l6.json → cell JSON.
 * Does not touch keys missing from patch (e.g. lat gaps).
 */
import fs from "node:fs";
import path from "node:path";

const proposalsPath = path.join(
  "frontend",
  "public",
  "homescool",
  "support-url-proposals-c3-l6.json",
);
const mediaRoot = path.join("frontend", "public", "homescool", "media");

const proposals = JSON.parse(fs.readFileSync(proposalsPath, "utf8"));
const patch = proposals.patch || {};
let applied = 0;
let unchanged = 0;

for (const [key, body] of Object.entries(patch)) {
  const m = /^c(\d+)-w(\d+)-d(\d+)-l(\d+)-(.+)$/.exec(key);
  if (!m) throw new Error(`bad key: ${key}`);
  const week = m[2];
  const day = m[3];
  const subject = m[5];
  const file = path.join(
    mediaRoot,
    `week${week}`,
    `${subject}-c3-w${week}-d${day}-l6.eoschool.json`,
  );
  if (!fs.existsSync(file)) throw new Error(`missing file for ${key}: ${file}`);
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  const next = String(body.supportUrl || "").trim();
  if (!next) throw new Error(`empty supportUrl for ${key}`);
  if (doc.supportUrl === next) {
    unchanged++;
    continue;
  }
  doc.supportUrl = next;
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
  applied++;
}

console.log(
  JSON.stringify(
    { patchKeys: Object.keys(patch).length, applied, unchanged },
    null,
    2,
  ),
);
