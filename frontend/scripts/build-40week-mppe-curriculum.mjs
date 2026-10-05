/**
 * Builds 40-week / 200-day MPPE plan (3er grado) from the 28-week source JSON.
 * Subdivides len/mat/cie learnings across 200 days; stretches bible to 200 reading days.
 *
 * Run: node frontend/scripts/build-40week-mppe-curriculum.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, "..", "src", "lib", "eoschool-mppe-28week-curriculum.json");
const outPath = path.join(__dirname, "..", "src", "lib", "eoschool-mppe-40week-curriculum.json");

const WEEKS = 40;
const DAYS_PER_WEEK = 5;
const TOTAL_DAYS = WEEKS * DAYS_PER_WEEK;

function extractOrderedPlanDays(weeks) {
  const days = [];
  for (const week of weeks) {
    for (const block of week.blocks ?? []) {
      for (const bibleDay of block.bible?.days ?? []) {
        days.push({ sourceWeek: week.week, block, bibleDay });
      }
    }
  }
  days.sort((a, b) => a.bibleDay.dayInPlan - b.bibleDay.dayInPlan);
  return days;
}

function flattenTrack(planDays, key) {
  const out = [];
  for (const row of planDays) {
    for (const ref of row.bibleDay[key] ?? []) {
      out.push({ ...ref });
    }
  }
  return out;
}

/** Split array into n contiguous buckets (as equal as possible). */
function contiguousBuckets(items, n) {
  const buckets = Array.from({ length: n }, () => []);
  if (!items.length) return buckets;
  let start = 0;
  for (let i = 0; i < n; i++) {
    const end = Math.round(((i + 1) * items.length) / n);
    buckets[i] = items.slice(start, end);
    start = end;
  }
  return buckets;
}

function collectUniqueRefs(planDays, key) {
  const seen = new Set();
  const out = [];
  for (const row of planDays) {
    for (const ref of row.block[key] ?? []) {
      if (seen.has(ref.id)) continue;
      seen.add(ref.id);
      out.push(ref);
    }
  }
  return out;
}

function collectIdentities(planDays) {
  const seen = new Set();
  const out = [];
  for (const row of planDays) {
    const ide = row.block.identity;
    if (!ide?.title || seen.has(ide.title)) continue;
    seen.add(ide.title);
    out.push({
      title: ide.title,
      contenidos: [...(ide.contenidos ?? [])],
      learnings: [...(ide.learnings ?? [])],
    });
  }
  return out;
}

function identityForWeek(identities, weekIndex) {
  const base = identities[weekIndex % identities.length];
  const contenidoIdx = Math.floor(weekIndex / identities.length) % Math.max(1, base.contenidos.length);
  const learningIdx = weekIndex % Math.max(1, base.learnings.length);
  return {
    title: base.title,
    contenidos: base.contenidos.length ? [base.contenidos[contenidoIdx % base.contenidos.length]] : [],
    learnings: base.learnings.length ? [base.learnings[learningIdx]] : [],
    weekFocus: base.contenidos[contenidoIdx] ?? base.title,
  };
}

function build40WeekCurriculum(source) {
  const planDays = extractOrderedPlanDays(source.weeks);
  const genEsterBuckets = contiguousBuckets(flattenTrack(planDays, "genEster"), TOTAL_DAYS);
  const jobMalBuckets = contiguousBuckets(flattenTrack(planDays, "jobMal"), TOTAL_DAYS);
  const ntBuckets = contiguousBuckets(flattenTrack(planDays, "nt"), TOTAL_DAYS);

  const lenAll = collectUniqueRefs(planDays, "len");
  const matAll = collectUniqueRefs(planDays, "mat");
  const cieAll = collectUniqueRefs(planDays, "cie");
  const lenBuckets = contiguousBuckets(lenAll, TOTAL_DAYS);
  const matBuckets = contiguousBuckets(matAll, TOTAL_DAYS);
  const cieBuckets = contiguousBuckets(cieAll, TOTAL_DAYS);

  const identities = collectIdentities(planDays);
  const weeks = [];

  for (let w = 1; w <= WEEKS; w++) {
    const identity = identityForWeek(identities, w - 1);
    const blocks = [];
    for (let d = 1; d <= DAYS_PER_WEEK; d++) {
      const dayInPlan = (w - 1) * DAYS_PER_WEEK + d;
      const idx = dayInPlan - 1;
      blocks.push({
        block: d,
        days: 1,
        bible: {
          days: [
            {
              dayInPlan,
              genEster: genEsterBuckets[idx],
              jobMal: jobMalBuckets[idx],
              nt: ntBuckets[idx],
            },
          ],
        },
        identity: {
          title: identity.title,
          contenidos: identity.contenidos,
          learnings: identity.learnings,
          weekFocus: identity.weekFocus,
          grade: "3er grado",
          week: w,
          dayInWeek: d,
        },
        len: lenBuckets[idx],
        mat: matBuckets[idx],
        cie: cieBuckets[idx],
      });
    }
    weeks.push({ week: w, blocks });
  }

  return {
    meta: {
      weeks: WEEKS,
      daysPerWeek: DAYS_PER_WEEK,
      totalPlanDays: TOTAL_DAYS,
      grade: "3er grado",
      blocksPerWeek: DAYS_PER_WEEK,
      totalBlocks: WEEKS * DAYS_PER_WEEK,
      identityObjectives: identities.length,
      source: "derived-from-28week-v1",
      counts: {
        lenLearnings: lenAll.length,
        matLearnings: matAll.length,
        cieLearnings: cieAll.length,
      },
      bible: {
        ...source.meta.bible,
        readingDays: TOTAL_DAYS,
        completesCanonIn40Weeks: true,
      },
    },
    weeks,
  };
}

const source = JSON.parse(fs.readFileSync(srcPath, "utf8"));
const out = build40WeekCurriculum(source);
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log("Wrote", outPath, "—", WEEKS, "weeks,", TOTAL_DAYS, "days");
