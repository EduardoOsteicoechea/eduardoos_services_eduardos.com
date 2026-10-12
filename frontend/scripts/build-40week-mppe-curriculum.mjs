/**
 * Builds 40-week / 200-day MPPE plan (3er grado) from the 28-week source JSON.
 *
 * Weekly pattern (day in week 1–5):
 *   1,3 → bib + len + ide + cie
 *   2,4 → bib + len + mat
 *   5   → exposition of all five (week focus; no new teach buckets)
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

/** @param {number} planDay 1-based */
function dayInWeek(planDay) {
  return ((planDay - 1) % DAYS_PER_WEEK) + 1;
}

/** @param {number} d day in week 1–5 */
function scheduledSectionsForDayInWeek(d) {
  if (d === 5) return ["bib", "ide", "len", "mat", "cie"];
  if (d === 1 || d === 3) return ["bib", "len", "ide", "cie"];
  return ["bib", "len", "mat"]; // 2, 4
}

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
  if (!items.length || n <= 0) return buckets;
  let start = 0;
  for (let i = 0; i < n; i++) {
    const end = Math.round(((i + 1) * items.length) / n);
    buckets[i] = items.slice(start, end);
    start = end;
  }
  return buckets;
}

/** Empty plan days repeat the previous day's learnings (3.er grado continuity). */
function forwardFillBuckets(buckets) {
  const out = buckets.map((b) => (b.length ? b.map((r) => ({ ...r })) : []));
  let last = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i].length) {
      last = out[i];
    } else if (last.length) {
      out[i] = last.map((r) => ({ ...r }));
    }
  }
  const firstIdx = out.findIndex((b) => b.length);
  if (firstIdx > 0) {
    const seed = out[firstIdx];
    for (let i = 0; i < firstIdx; i++) {
      out[i] = seed.map((r) => ({ ...r }));
    }
  }
  return out;
}

/**
 * Distribute learnings across selected plan-day indices only (0-based).
 * Returns TOTAL_DAYS-length array; non-selected days are null.
 */
function bucketsForDayIndices(items, dayIndices) {
  const byDay = Array.from({ length: TOTAL_DAYS }, () => null);
  if (!dayIndices.length) return byDay;
  const filled = forwardFillBuckets(contiguousBuckets(items, dayIndices.length));
  dayIndices.forEach((dayIdx, slot) => {
    byDay[dayIdx] = filled[slot];
  });
  return byDay;
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

function lastNonNull(byDay, fromIdx, stepBackMax) {
  for (let i = fromIdx; i >= 0 && fromIdx - i <= stepBackMax; i--) {
    if (byDay[i]?.length) return byDay[i];
  }
  return null;
}

function build40WeekCurriculum(source) {
  const planDays = extractOrderedPlanDays(source.weeks);
  const genEsterBuckets = contiguousBuckets(flattenTrack(planDays, "genEster"), TOTAL_DAYS);
  const jobMalBuckets = contiguousBuckets(flattenTrack(planDays, "jobMal"), TOTAL_DAYS);
  const ntBuckets = contiguousBuckets(flattenTrack(planDays, "nt"), TOTAL_DAYS);

  const lenAll = collectUniqueRefs(planDays, "len");
  const matAll = collectUniqueRefs(planDays, "mat");
  const cieAll = collectUniqueRefs(planDays, "cie");

  /** Len every calendar day (including exposition Friday). */
  const lenByDay = forwardFillBuckets(contiguousBuckets(lenAll, TOTAL_DAYS));

  const matDayIndices = [];
  const ideCieDayIndices = [];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = dayInWeek(i + 1);
    if (d === 2 || d === 4) matDayIndices.push(i);
    if (d === 1 || d === 3) ideCieDayIndices.push(i);
  }

  const matByDay = bucketsForDayIndices(matAll, matDayIndices);
  const cieByDay = bucketsForDayIndices(cieAll, ideCieDayIndices);

  const identities = collectIdentities(planDays);
  const weeks = [];

  for (let w = 1; w <= WEEKS; w++) {
    const identity = identityForWeek(identities, w - 1);
    const blocks = [];
    for (let d = 1; d <= DAYS_PER_WEEK; d++) {
      const dayInPlan = (w - 1) * DAYS_PER_WEEK + d;
      const idx = dayInPlan - 1;
      const scheduledSections = scheduledSectionsForDayInWeek(d);
      const isExpo = d === 5;
      const dayKind = isExpo ? "exposition" : "teach";

      const block = {
        block: d,
        days: 1,
        dayKind,
        scheduledSections,
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
        len: lenByDay[idx] ?? [],
      };

      if (d === 1 || d === 3 || isExpo) {
        block.identity = {
          title: identity.title,
          contenidos: identity.contenidos,
          learnings: identity.learnings,
          weekFocus: identity.weekFocus,
          grade: "3er grado",
          week: w,
          dayInWeek: d,
        };
      }

      if (d === 2 || d === 4 || isExpo) {
        const matRefs = isExpo
          ? lastNonNull(matByDay, idx - 1, 4) ?? matByDay[matDayIndices[0]] ?? []
          : matByDay[idx] ?? [];
        block.mat = matRefs.map((r) => ({ ...r }));
      }

      if (d === 1 || d === 3 || isExpo) {
        const cieRefs = isExpo
          ? lastNonNull(cieByDay, idx - 1, 4) ?? cieByDay[ideCieDayIndices[0]] ?? []
          : cieByDay[idx] ?? [];
        block.cie = cieRefs.map((r) => ({ ...r }));
      }

      // Exposition Friday: len should reflect week's teaching focus (prefer day 4 / last filled).
      if (isExpo) {
        const weekStart = (w - 1) * DAYS_PER_WEEK;
        const weekLen = lastNonNull(lenByDay, weekStart + 3, 3) ?? lenByDay[idx];
        block.len = (weekLen ?? []).map((r) => ({ ...r }));
      }

      blocks.push(block);
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
      weeklyPattern: {
        day1: ["bib", "len", "ide", "cie"],
        day2: ["bib", "len", "mat"],
        day3: ["bib", "len", "ide", "cie"],
        day4: ["bib", "len", "mat"],
        day5: ["bib", "ide", "len", "mat", "cie"],
        day5Mode: "exposition",
      },
      teachingDays: {
        bib: TOTAL_DAYS,
        len: TOTAL_DAYS,
        ide: ideCieDayIndices.length + WEEKS, // teach + expo Friday
        mat: matDayIndices.length + WEEKS,
        cie: ideCieDayIndices.length + WEEKS,
        teachIdeCie: ideCieDayIndices.length,
        teachMat: matDayIndices.length,
        exposition: WEEKS,
      },
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
console.log(
  "Wrote",
  outPath,
  "—",
  WEEKS,
  "weeks,",
  TOTAL_DAYS,
  "days; pattern D1/D3 ide+cie, D2/D4 mat, D5 exposition",
);
