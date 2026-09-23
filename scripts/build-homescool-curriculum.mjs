/**
 * Publish pack: only frontend/public/homescool/media/week2/*.eoschool.json
 * → curriculum.json (FE backup) + optional Mongo upsert (runtime SoT).
 *
 * Sync env (optional):
 *   EDUARDOOS_API_KEY   — eos_live_… key with api + homescool
 *   EDUARDOOS_BASE_URL  — e.g. https://eduardoos.com or http://127.0.0.1:8081
 */
import fs from "node:fs";
import path from "node:path";

const week2Root = path.join("frontend", "public", "homescool", "media", "week2");
const dest = path.join("frontend", "public", "homescool", "curriculum.json");

const files = fs
  .readdirSync(week2Root)
  .filter((n) => n.endsWith(".eoschool.json"))
  .map((n) => path.join(week2Root, n))
  .sort((a, b) => a.localeCompare(b));

const classes = [];
for (const f of files) {
  const doc = JSON.parse(fs.readFileSync(f, "utf8"));
  if (doc.cycle !== 3 || doc.week !== 2 || doc.level !== 6) {
    throw new Error(
      `refusing unpublished cell ${f}: cycle=${doc.cycle} week=${doc.week} level=${doc.level}`,
    );
  }
  const base = path.basename(f);
  if (!/-c3-w2-/.test(base)) {
    throw new Error(`refusing filename without -c3-w2-: ${base}`);
  }
  const rel = f.split(path.sep).join("/");
  const source = rel.replace(/^frontend\/public/, "");
  const key = `c${doc.cycle}-w${doc.week}-d${doc.day}-l${doc.level}-${doc.subject}`;
  classes.push({ key, source, ...doc });
}

if (classes.length !== 60) {
  throw new Error(`expected 60 published classes, got ${classes.length}`);
}

const out = {
  format: "homescool-curriculum",
  version: 1,
  level: 6,
  description:
    "Published Homescool pack: ciclo 3 / semana 2 / nivel 6 only (60 cells). FE backup for review; Mongo is runtime SoT.",
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
