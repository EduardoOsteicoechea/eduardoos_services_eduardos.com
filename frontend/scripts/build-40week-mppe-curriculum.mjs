/**
 * Builds 40-week / 200-day MPPE plan (3er grado) from the 28-week source JSON.
 *
 * Weekly pattern (day in week 1–5), unless the calendar day is a VE holiday:
 *   Weeks 1–6:
 *     1,3 → bib + len + cie
 *     2,4 → bib + len + ide + mat
 *   Weeks 7–40:
 *     1,3 → bib + len + cie + mat  (mat daily with lenguaje)
 *     2,4 → bib + len + ide + mat
 *   Day 5 (all weeks) → exposition of scheduled subjects (week focus; no new teach buckets)
 * Holiday → bib only (overrides teach/exposition); content redistributed elsewhere.
 *
 * Math from week 7: redistribute mat:2…mat:17 across Mon–Thu teach slots only.
 * Weeks 1–6 keep the prior Tue/Thu math placement (mat:0, mat:1, start of mat:2).
 *
 * School year anchor: plan day 1 = 2026-09-21 (Monday).
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
const SCHOOL_YEAR_START = "2026-09-21";
/** From this week onward, math is taught Mon–Thu with lenguaje. */
const DAILY_MATH_FROM_WEEK = 7;

/** @param {number} planDay 1-based */
function dayInWeek(planDay) {
  return ((planDay - 1) % DAYS_PER_WEEK) + 1;
}

/** @param {number} planDay 1-based */
function weekOfPlanDay(planDay) {
  return Math.floor((planDay - 1) / DAYS_PER_WEEK) + 1;
}

/**
 * @param {number} d day in week 1–5
 * @param {number} week 1-based plan week
 */
function scheduledSectionsForDayInWeek(d, week) {
  if (d === 5) return ["bib", "ide", "len", "mat", "cie"];
  // Identidad on Tue/Thu (2, 4); Ciencias on Mon/Wed (1, 3).
  if (week >= DAILY_MATH_FROM_WEEK) {
    if (d === 1 || d === 3) return ["bib", "len", "cie", "mat"];
    return ["bib", "len", "ide", "mat"]; // 2, 4
  }
  if (d === 1 || d === 3) return ["bib", "len", "cie"];
  return ["bib", "len", "ide", "mat"]; // 2, 4
}

/** Anonymous Gregorian algorithm → Easter Sunday as Date (UTC noon to avoid TZ drift). */
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addUtcDays(date, n) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function parseYmd(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** Mon–Fri school days starting at SCHOOL_YEAR_START. */
function buildSchoolCalendar(totalDays) {
  const dates = [];
  let cur = parseYmd(SCHOOL_YEAR_START);
  while (dates.length < totalDays) {
    const wd = cur.getUTCDay(); // 0 Sun … 6 Sat
    if (wd >= 1 && wd <= 5) dates.push(new Date(cur.getTime()));
    cur = addUtcDays(cur, 1);
  }
  return dates;
}

/**
 * Official VE holidays (LOTTT + Ley de Fiestas Nacionales) that can fall on weekdays.
 * Returns Map<ymd, name> for years covering the school calendar.
 */
function venezuelaHolidayNamesByDate(yearStart, yearEnd) {
  const map = new Map();
  const add = (date, name) => map.set(ymd(date), name);

  for (let year = yearStart; year <= yearEnd; year++) {
    add(new Date(Date.UTC(year, 0, 1, 12)), "Año Nuevo");
    add(new Date(Date.UTC(year, 3, 19, 12)), "Declaración de la Independencia");
    add(new Date(Date.UTC(year, 4, 1, 12)), "Día del Trabajador");
    add(new Date(Date.UTC(year, 5, 24, 12)), "Batalla de Carabobo");
    add(new Date(Date.UTC(year, 6, 5, 12)), "Día de la Independencia");
    add(new Date(Date.UTC(year, 6, 24, 12)), "Natalicio de Simón Bolívar");
    add(new Date(Date.UTC(year, 9, 12, 12)), "Día de la Resistencia Indígena");
    add(new Date(Date.UTC(year, 11, 24, 12)), "Nochebuena");
    add(new Date(Date.UTC(year, 11, 25, 12)), "Navidad");
    add(new Date(Date.UTC(year, 11, 31, 12)), "Fin de Año");

    const easter = easterSunday(year);
    // Ash Wednesday = Easter − 46; Carnival Mon/Tue = two days before Ash Wednesday.
    const ash = addUtcDays(easter, -46);
    add(addUtcDays(ash, -2), "Lunes de Carnaval");
    add(addUtcDays(ash, -1), "Martes de Carnaval");
    add(addUtcDays(easter, -3), "Jueves Santo");
    add(addUtcDays(easter, -2), "Viernes Santo");
  }
  return map;
}

function buildHolidayIndex(schoolDates) {
  const y0 = schoolDates[0].getUTCFullYear();
  const y1 = schoolDates[schoolDates.length - 1].getUTCFullYear();
  const names = venezuelaHolidayNamesByDate(y0, y1);
  /** @type {Map<number, { planDay: number, date: string, name: string }>} */
  const byPlanDay = new Map();
  schoolDates.forEach((dt, i) => {
    const key = ymd(dt);
    const name = names.get(key);
    if (!name) return;
    const planDay = i + 1;
    byPlanDay.set(planDay, { planDay, date: key, name });
  });
  return byPlanDay;
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

function matNumericId(ref) {
  const m = String(ref?.id ?? "").match(/^mat:(\d+)$/);
  return m ? Number(m[1]) : NaN;
}

/** Unique learning refs from Mon–Thu teach blocks of the week (Friday exposition). */
function uniqueRefsFromTeachBlocks(blocks, key) {
  const seen = new Set();
  const out = [];
  for (const b of blocks) {
    if (b.dayKind !== "teach") continue;
    for (const ref of b[key] ?? []) {
      if (!ref?.id || seen.has(ref.id)) continue;
      seen.add(ref.id);
      out.push({ ...ref });
    }
  }
  return out;
}

function cloneRefs(refs) {
  return (refs ?? []).map((r) => ({ ...r }));
}

function lastNonNull(byDay, fromIdx, stepBackMax) {
  for (let i = fromIdx; i >= 0 && fromIdx - i <= stepBackMax; i--) {
    if (byDay[i]?.length) return byDay[i];
  }
  return null;
}

const PATTERN_WEEKS_1_6 = {
  day1: ["bib", "len", "cie"],
  day2: ["bib", "len", "ide", "mat"],
  day3: ["bib", "len", "cie"],
  day4: ["bib", "len", "ide", "mat"],
  day5: ["bib", "ide", "len", "mat", "cie"],
  day5Mode: "exposition",
  holidayOverride: ["bib"],
};

const PATTERN_FROM_WEEK_7 = {
  day1: ["bib", "len", "cie", "mat"],
  day2: ["bib", "len", "ide", "mat"],
  day3: ["bib", "len", "cie", "mat"],
  day4: ["bib", "len", "ide", "mat"],
  day5: ["bib", "ide", "len", "mat", "cie"],
  day5Mode: "exposition",
  holidayOverride: ["bib"],
};

function build40WeekCurriculum(source) {
  const schoolDates = buildSchoolCalendar(TOTAL_DAYS);
  const holidayByPlanDay = buildHolidayIndex(schoolDates);
  const isHoliday = (planDay) => holidayByPlanDay.has(planDay);

  const planDays = extractOrderedPlanDays(source.weeks);
  const genEsterBuckets = contiguousBuckets(flattenTrack(planDays, "genEster"), TOTAL_DAYS);
  const jobMalBuckets = contiguousBuckets(flattenTrack(planDays, "jobMal"), TOTAL_DAYS);
  const ntBuckets = contiguousBuckets(flattenTrack(planDays, "nt"), TOTAL_DAYS);

  const lenAll = collectUniqueRefs(planDays, "len");
  const matAll = collectUniqueRefs(planDays, "mat");
  const cieAll = collectUniqueRefs(planDays, "cie");
  const matFromWeek7 = matAll.filter((r) => matNumericId(r) >= 2);

  /**
   * Len: keep Friday in bucket indices so Mon–Thu teach placement stays identical to the
   * pre-change plan; Friday display is overwritten with the week's teach summary (no new unit).
   */
  const lenDayIndices = [];
  /** Legacy Tue/Thu mat slots (all weeks) — used only to freeze weeks 1–6 placement. */
  const legacyMatDayIndices = [];
  /** Weeks 7+ Mon–Thu teach mat slots. */
  const lateMatDayIndices = [];
  /** Ciencias Mon/Wed teach slots. */
  const cieDayIndices = [];
  /** Identidad Tue/Thu teach slots. */
  const ideDayIndices = [];
  let expositionCount = 0;
  let teachMatEarly = 0;
  let teachMatLate = 0;

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const planDay = i + 1;
    if (isHoliday(planDay)) continue;
    const d = dayInWeek(planDay);
    const w = weekOfPlanDay(planDay);
    lenDayIndices.push(i);
    if (d === 2 || d === 4) legacyMatDayIndices.push(i);
    if (w < DAILY_MATH_FROM_WEEK && (d === 2 || d === 4)) teachMatEarly += 1;
    if (w >= DAILY_MATH_FROM_WEEK && d >= 1 && d <= 4) {
      lateMatDayIndices.push(i);
      teachMatLate += 1;
    }
    if (d === 1 || d === 3) cieDayIndices.push(i);
    if (d === 2 || d === 4) ideDayIndices.push(i);
    if (d === 5) expositionCount += 1;
  }

  const lenByDay = bucketsForDayIndices(lenAll, lenDayIndices);
  const legacyMatByDay = bucketsForDayIndices(matAll, legacyMatDayIndices);
  const lateMatByDay = bucketsForDayIndices(matFromWeek7, lateMatDayIndices);
  const cieByDay = bucketsForDayIndices(cieAll, cieDayIndices);

  const identities = collectIdentities(planDays);
  const weeks = [];

  for (let w = 1; w <= WEEKS; w++) {
    const identity = identityForWeek(identities, w - 1);
    const blocks = [];
    for (let d = 1; d <= DAYS_PER_WEEK; d++) {
      const dayInPlan = (w - 1) * DAYS_PER_WEEK + d;
      const idx = dayInPlan - 1;
      const calendarDate = ymd(schoolDates[idx]);
      const holiday = holidayByPlanDay.get(dayInPlan);

      if (holiday) {
        blocks.push({
          block: d,
          days: 1,
          dayKind: "holiday",
          scheduledSections: ["bib"],
          calendarDate,
          holidayName: holiday.name,
          holidayDate: holiday.date,
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
        });
        continue;
      }

      const isExpo = d === 5;
      const dayKind = isExpo ? "exposition" : "teach";
      const scheduledSections = scheduledSectionsForDayInWeek(d, w);
      const hasMat = scheduledSections.includes("mat");
      const hasIde = scheduledSections.includes("ide");
      const hasCie = scheduledSections.includes("cie");

      const block = {
        block: d,
        days: 1,
        dayKind,
        scheduledSections,
        calendarDate,
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
        len: cloneRefs(lenByDay[idx]),
      };

      if (hasIde) {
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

      if (hasMat && !isExpo) {
        if (w < DAILY_MATH_FROM_WEEK) {
          block.mat = cloneRefs(legacyMatByDay[idx]);
        } else {
          block.mat = cloneRefs(lateMatByDay[idx]);
        }
      }

      if (hasCie && !isExpo) {
        block.cie = cloneRefs(cieByDay[idx]);
      }

      if (isExpo) {
        const weekTeach = blocks.filter((b) => b.dayKind === "teach");
        const weekLen = uniqueRefsFromTeachBlocks(weekTeach, "len");
        const weekMat = uniqueRefsFromTeachBlocks(weekTeach, "mat");
        const weekCie = uniqueRefsFromTeachBlocks(weekTeach, "cie");
        const matSource = w < DAILY_MATH_FROM_WEEK ? legacyMatByDay : lateMatByDay;
        block.len = weekLen.length ? weekLen : cloneRefs(lenByDay[idx]);
        block.mat = weekMat.length
          ? weekMat
          : cloneRefs(lastNonNull(matSource, idx - 1, 4) ?? matSource[lateMatDayIndices[0] ?? legacyMatDayIndices[0]]);
        block.cie = weekCie.length
          ? weekCie
          : cloneRefs(lastNonNull(cieByDay, idx - 1, 4) ?? cieByDay[cieDayIndices[0]]);
        // Ensure identity present for exposition even if week had no Tue/Thu (rare).
        if (!block.identity) {
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
      }

      blocks.push(block);
    }
    weeks.push({ week: w, blocks });
  }

  const holidays = [...holidayByPlanDay.values()].sort((a, b) => a.planDay - b.planDay);
  const teachMatTotal = teachMatEarly + teachMatLate;
  // len scheduled on every non-holiday day (teach + exposition)
  const lenScheduledDays = TOTAL_DAYS - holidays.length;

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
      schoolYearStart: ymd(schoolDates[0]),
      schoolYearEnd: ymd(schoolDates[schoolDates.length - 1]),
      holidays,
      dailyMathFromWeek: DAILY_MATH_FROM_WEEK,
      weeklyPatternWeeks1to6: PATTERN_WEEKS_1_6,
      weeklyPatternFromWeek7: PATTERN_FROM_WEEK_7,
      weeklyPattern: PATTERN_FROM_WEEK_7,
      teachingDays: {
        bib: TOTAL_DAYS,
        len: lenScheduledDays,
        ide: ideDayIndices.length + expositionCount,
        mat: teachMatTotal + expositionCount,
        cie: cieDayIndices.length + expositionCount,
        teachIde: ideDayIndices.length,
        teachCie: cieDayIndices.length,
        teachIdeCie: cieDayIndices.length,
        teachMat: teachMatTotal,
        teachMatWeeks1to6: teachMatEarly,
        teachMatFromWeek7: teachMatLate,
        exposition: expositionCount,
        holiday: holidays.length,
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
  "days; holidays",
  out.meta.holidays.length,
  "; start",
  out.meta.schoolYearStart,
  "; dailyMathFromWeek",
  out.meta.dailyMathFromWeek,
  "; teachMat",
  out.meta.teachingDays.teachMat,
);
