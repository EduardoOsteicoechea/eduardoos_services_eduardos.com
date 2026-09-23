/**
 * Merge all .eoschool.json under frontend/public/homescool/media into
 * frontend/public/homescool/curriculum.json (agent-reviewable FE backup),
 * then optionally upsert every class into Mongo via the Homescool v1 API
 * (runtime SoT). Both stores update in the same run when credentials exist.
 *
 * Sync env (optional):
 *   EDUARDOOS_API_KEY   — eos_live_… key with api + homescool
 *   EDUARDOOS_BASE_URL  — e.g. https://eduardoos.com or http://127.0.0.1:8081
 */
import fs from "node:fs";
import path from "node:path";

const root = path.join("frontend", "public", "homescool", "media");
const dest = path.join("frontend", "public", "homescool", "curriculum.json");

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "pilot") walk(p, out);
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
    "FE backup for agent review/validation. Runtime SoT is Mongo (homescool_materials). Rebuild + sync with this script so both stay aligned.",
  classCount: classes.length,
  classes,
};

fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote ${dest} classes=${classes.length} bytes=${fs.statSync(dest).size}`);

const apiKey = (process.env.EDUARDOOS_API_KEY || "").trim();
const baseURL = (process.env.EDUARDOOS_BASE_URL || "").replace(/\/$/, "");
if (!apiKey || !baseURL) {
  console.log(
    "mongo sync skipped (set EDUARDOOS_API_KEY + EDUARDOOS_BASE_URL to upsert runtime SoT)",
  );
  process.exit(0);
}

/** Strip curriculum-only fields before POST. */
function toEoschoolBody(row) {
  return {
    format: row.format,
    version: row.version,
    cycle: row.cycle,
    week: row.week,
    day: row.day,
    level: row.level,
    subject: row.subject,
    locale: row.locale,
    title: row.title,
    lesson: row.lesson,
    quiz: row.quiz,
    media: row.media,
  };
}

let ok = 0;
let fail = 0;
for (const row of classes) {
  const body = {
    confirmOverwrite: true,
    material: toEoschoolBody(row),
  };
  const url = `${baseURL}/api/v1/homescool/materials`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      fail++;
      console.error(`upsert fail ${row.key} status=${res.status} body=${text.slice(0, 200)}`);
      continue;
    }
    ok++;
    if (ok % 10 === 0 || ok === classes.length) {
      console.log(`mongo upsert progress ${ok}/${classes.length}`);
    }
  } catch (err) {
    fail++;
    console.error(`upsert error ${row.key}`, err);
  }
}
console.log(`mongo sync done upserted=${ok} failed=${fail}`);
if (fail > 0) process.exit(1);
