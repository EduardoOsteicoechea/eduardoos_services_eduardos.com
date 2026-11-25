/**
 * From plan day 38 (2026-11-25 for this family), shift the school calendar
 * and give a repeated Venezuela learning's slot to the next grade-3 gap.
 * Days 1–37 and every Bible chapter stay put.
 *
 * Run: node frontend/scripts/redistribute-grade3-from-day-38.mjs
 */

export const REDISTRIBUTE_FROM_DAY = 38;
export const REDISTRIBUTE_START_DATE = "2026-11-25";

/** Skills the MPPE grade-3 list does not state. Same rows as eoschool-grade3-gaps.ts. */
export const GRADE3_GAP_LESSONS = {
  len: [
    {
      unitTitle: "Leer dos textos del mismo tema",
      text: "Grade 3 compara las ideas más importantes y los detalles de dos textos sobre el mismo tema.",
    },
    {
      unitTitle: "Escribir una opinión",
      text: "Grade 3 escribe una opinión sobre un tema, da razones y cierra el texto.",
    },
    {
      unitTitle: "Palabra desconocida",
      text: "Grade 3 averigua el sentido de una palabra o frase desconocida con el contexto, el afijo o un glosario.",
    },
  ],
  mat: [
    {
      unitTitle: "Fracciones",
      text: "Grade 3 entiende una fracción como partes iguales de un entero y la ubica en la recta.",
    },
    {
      unitTitle: "División",
      text: "Grade 3 entiende la división como un reparto en grupos iguales y la relaciona con la multiplicación.",
    },
    {
      unitTitle: "Perímetro",
      text: "Grade 3 halla el perímetro de un polígono a partir de sus lados y resuelve problemas con esa medida.",
    },
    {
      unitTitle: "Área",
      text: "Grade 3 entiende el área como el número de unidades cuadradas que cubren una figura, sin huecos ni solapes.",
    },
    {
      unitTitle: "Redondeo",
      text: "Grade 3 redondea un número de hasta tres cifras a la decena o a la centena más cercana.",
    },
  ],
  cie: [
    {
      unitTitle: "Fuerzas e imanes",
      text: "Grade 3 pregunta cómo un imán atrae o repele a otro sin tocarlo.",
    },
    {
      unitTitle: "Fósiles",
      text: "Grade 3 usa fósiles para describir organismos y ambientes de hace mucho tiempo.",
    },
    {
      unitTitle: "Tiempo y ciclo del agua",
      text: "Grade 3 representa datos del tiempo de una estación y describe el clima de una región.",
    },
  ],
  ide: [
    {
      unitTitle: "El mundo",
      text: "En los grados 3–5 se usan mapas para localizar lugares y explicar cómo la geografía marca la vida de la gente.",
    },
    {
      unitTitle: "Otra civilización",
      text: "En los grados 3–5 se compara cómo vivía la gente en otro tiempo y en otro lugar.",
    },
  ],
};

const SUBJECTS = ["len", "mat", "cie", "ide"];

function dayInWeek(planDay) {
  return ((planDay - 1) % 5) + 1;
}

function scheduledSectionsForDayInWeek(d, week) {
  if (d === 5) return ["bib", "ide", "len", "mat", "cie"];
  if (week >= 7) {
    if (d === 1 || d === 3) return ["bib", "len", "cie", "mat"];
    return ["bib", "len", "ide", "mat"];
  }
  if (d === 1 || d === 3) return ["bib", "len", "cie"];
  return ["bib", "len", "ide", "mat"];
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function holidayNamesByDate(yearStart, yearEnd) {
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
    const ash = addUtcDays(easter, -46);
    add(addUtcDays(ash, -2), "Lunes de Carnaval");
    add(addUtcDays(ash, -1), "Martes de Carnaval");
    add(addUtcDays(easter, -3), "Jueves Santo");
    add(addUtcDays(easter, -2), "Viernes Santo");
  }
  return map;
}

export function planBlocks(curriculum) {
  const out = [];
  for (const week of curriculum.weeks) {
    for (const block of week.blocks ?? []) {
      const bibleDay = block.bible?.days?.[0];
      if (!bibleDay) continue;
      out.push({ week: week.week, block, dayInPlan: bibleDay.dayInPlan });
    }
  }
  out.sort((a, b) => a.dayInPlan - b.dayInPlan);
  return out;
}

function cloneRef(ref) {
  return {
    id: ref.id,
    unitTitle: ref.unitTitle,
    axis: ref.axis ?? null,
    text: ref.text,
  };
}

function cloneIdentity(identity) {
  return {
    title: identity.title,
    contenidos: [...(identity.contenidos ?? [])],
    learnings: [...(identity.learnings ?? [])],
    weekFocus: identity.weekFocus ?? identity.title,
  };
}

function subjectRefs(block, subject) {
  if (subject === "ide") {
    const learnings = block.identity?.learnings ?? [];
    if (!learnings.length && !block.identity) return [];
    if (!block.identity) return [];
    return learnings.map((text, index) => ({
      id: `ide:${index}:${text}`,
      unitTitle: block.identity.title,
      axis: null,
      text,
      identity: cloneIdentity(block.identity),
    }));
  }
  return (block[subject] ?? []).map(cloneRef);
}

function textsSeen(blocks) {
  const seen = { len: new Set(), mat: new Set(), cie: new Set(), ide: new Set() };
  for (const item of blocks) {
    if (item.block.dayKind === "holiday") continue;
    for (const subject of SUBJECTS) {
      for (const ref of subjectRefs(item.block, subject)) seen[subject].add(ref.text);
    }
  }
  return seen;
}

function isKeeper(ref, seen, subject) {
  return !seen[subject].has(ref.text);
}

function gapRef(subject, cursor) {
  const rows = GRADE3_GAP_LESSONS[subject];
  const index = cursor[subject] % rows.length;
  cursor[subject] += 1;
  const row = rows[index];
  if (subject === "ide") {
    return {
      id: `gap:ide:${index}`,
      unitTitle: row.unitTitle,
      axis: null,
      text: row.text,
      identity: {
        title: row.unitTitle,
        contenidos: [row.unitTitle],
        learnings: [row.text],
        weekFocus: row.unitTitle,
      },
    };
  }
  return {
    id: `gap:${subject}:${index}`,
    unitTitle: row.unitTitle,
    axis: null,
    text: row.text,
  };
}

function writeSubject(block, subject, refs, week, dayInWeek) {
  if (subject === "ide") {
    const identity = refs[0]?.identity ?? {
      title: refs[0]?.unitTitle ?? "Identidad",
      contenidos: [],
      learnings: refs.map((ref) => ref.text),
      weekFocus: refs[0]?.unitTitle ?? "Identidad",
    };
    const learnings = [];
    const seen = new Set();
    for (const ref of refs) {
      const lines = ref.identity?.learnings?.length ? ref.identity.learnings : [ref.text];
      for (const line of lines) {
        if (seen.has(line)) continue;
        seen.add(line);
        learnings.push(line);
      }
    }
    block.identity = {
      title: identity.title,
      contenidos: [...(identity.contenidos ?? [])],
      learnings,
      weekFocus: identity.weekFocus ?? identity.title,
      grade: "3er grado",
      week,
      dayInWeek,
    };
    return;
  }
  block[subject] = refs.map((ref) => cloneRef(ref));
}

function enqueueKeepers(item, seen, queues) {
  if (item.block.dayKind === "holiday") return;
  for (const subject of SUBJECTS) {
    for (const ref of subjectRefs(item.block, subject)) {
      if (isKeeper(ref, seen, subject)) queues[subject].push(ref);
    }
  }
}

function placeSubject(item, subject, seen, queues, cursor) {
  const own = subjectRefs(item.block, subject);
  const ownKeepers = own.filter((ref) => isKeeper(ref, seen, subject));
  if (queues[subject].length) {
    const next = queues[subject].shift();
    for (const ref of ownKeepers) {
      if (ref.text !== next.text) queues[subject].push(ref);
    }
    writeSubject(item.block, subject, [next], item.week, dayInWeek(item.dayInPlan));
    return;
  }
  if (own.length && ownKeepers.length === own.length) return;
  for (const ref of ownKeepers) queues[subject].push(ref);
  writeSubject(item.block, subject, [gapRef(subject, cursor)], item.week, dayInWeek(item.dayInPlan));
}

function makeHoliday(block, name, date) {
  block.dayKind = "holiday";
  block.scheduledSections = ["bib"];
  block.holidayName = name;
  block.holidayDate = date;
  delete block.len;
  delete block.mat;
  delete block.cie;
  delete block.identity;
}

function uniqueRefs(blocks, subject) {
  const seen = new Set();
  const out = [];
  for (const block of blocks) {
    for (const ref of subjectRefs(block, subject)) {
      const key = subject === "ide" ? ref.text : ref.id;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ref);
    }
  }
  return out;
}

function assignDates(late) {
  let cursor = parseYmd(REDISTRIBUTE_START_DATE);
  for (const item of late) {
    const weekday = cursor.getUTCDay();
    if (weekday === 0 || weekday === 6) {
      throw new Error(`start date landed on a weekend: ${ymd(cursor)}`);
    }
    item.block.calendarDate = ymd(cursor);
    cursor = addUtcDays(cursor, 1);
    while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) cursor = addUtcDays(cursor, 1);
  }
}

function drainQueues(late, queues) {
  for (const subject of SUBJECTS) {
    if (!queues[subject].length) continue;
    const slots = late.filter((item) => {
      if (item.block.dayKind !== "teach") return false;
      const sections = item.block.scheduledSections ?? [];
      return sections.includes(subject === "ide" ? "ide" : subject);
    });
    const last = slots[slots.length - 1];
    if (!last) continue;
    const current = subjectRefs(last.block, subject);
    writeSubject(last.block, subject, [...current, ...queues[subject]], last.week, dayInWeek(last.dayInPlan));
    queues[subject] = [];
  }
}

function fillFridays(curriculum, cursor) {
  for (const week of curriculum.weeks) {
    if (week.week < 8) continue;
    const fridayItem = (week.blocks ?? [])
      .map((block) => ({ block, dayInPlan: block.bible?.days?.[0]?.dayInPlan ?? 0 }))
      .find((item) => item.dayInPlan >= REDISTRIBUTE_FROM_DAY && item.block.dayKind === "exposition");
    if (!fridayItem) continue;
    const teach = (week.blocks ?? []).filter((block) => block.dayKind === "teach");
    const friday = fridayItem.block;
    friday.scheduledSections = ["bib", "ide", "len", "mat", "cie"];
    friday.dayKind = "exposition";
    delete friday.holidayName;
    delete friday.holidayDate;
    for (const subject of ["len", "mat", "cie"]) {
      const refs = uniqueRefs(teach, subject);
      writeSubject(
        friday,
        subject,
        refs.length ? refs : [gapRef(subject, cursor)],
        week.week,
        5,
      );
    }
    const identities = uniqueRefs(teach, "ide");
    writeSubject(
      friday,
      "ide",
      identities.length ? identities : [gapRef("ide", cursor)],
      week.week,
      5,
    );
  }
}

function recount(blocks) {
  const teachingDays = {
    bib: blocks.length,
    len: 0,
    ide: 0,
    mat: 0,
    cie: 0,
    teachIde: 0,
    teachCie: 0,
    teachIdeCie: 0,
    teachMat: 0,
    teachMatWeeks1to6: 0,
    teachMatFromWeek7: 0,
    exposition: 0,
    holiday: 0,
  };
  for (const item of blocks) {
    const kind = item.block.dayKind;
    if (kind === "holiday") {
      teachingDays.holiday += 1;
      continue;
    }
    if (kind === "exposition") teachingDays.exposition += 1;
    const sections = new Set(item.block.scheduledSections ?? []);
    if (sections.has("len")) teachingDays.len += 1;
    if (sections.has("ide")) {
      teachingDays.ide += 1;
      if (kind === "teach") teachingDays.teachIde += 1;
    }
    if (sections.has("cie")) {
      teachingDays.cie += 1;
      if (kind === "teach") teachingDays.teachCie += 1;
    }
    if (kind === "teach" && sections.has("ide") && sections.has("cie")) teachingDays.teachIdeCie += 1;
    if (sections.has("mat")) {
      teachingDays.mat += 1;
      if (kind === "teach") {
        teachingDays.teachMat += 1;
        if (item.week < 7) teachingDays.teachMatWeeks1to6 += 1;
        else teachingDays.teachMatFromWeek7 += 1;
      }
    }
  }
  return teachingDays;
}

export function redistributeGrade3FromDay38(curriculum) {
  const all = planBlocks(curriculum);
  const early = all.filter((item) => item.dayInPlan < REDISTRIBUTE_FROM_DAY);
  const late = all.filter((item) => item.dayInPlan >= REDISTRIBUTE_FROM_DAY);
  const seen = textsSeen(early);
  assignDates(late);
  const names = holidayNamesByDate(2026, 2028);
  const queues = { len: [], mat: [], cie: [], ide: [] };
  const cursor = { len: 0, mat: 0, cie: 0, ide: 0 };

  for (const item of late) {
    const date = item.block.calendarDate;
    const holidayName = names.get(date);
    if (holidayName) {
      enqueueKeepers(item, seen, queues);
      makeHoliday(item.block, holidayName, date);
      continue;
    }
    const d = dayInWeek(item.dayInPlan);
    delete item.block.holidayName;
    delete item.block.holidayDate;
    if (d === 5) {
      item.block.dayKind = "exposition";
      continue;
    }
    item.block.dayKind = "teach";
    const sections = scheduledSectionsForDayInWeek(d, item.week);
    item.block.scheduledSections = sections;
    for (const subject of SUBJECTS) {
      const sectionId = subject;
      if (!sections.includes(sectionId)) {
        if (subject === "ide") delete item.block.identity;
        else delete item.block[subject];
        continue;
      }
      placeSubject(item, subject, seen, queues, cursor);
    }
  }

  drainQueues(late, queues);
  fillFridays(curriculum, cursor);

  const refreshed = planBlocks(curriculum);
  curriculum.meta.schoolYearEnd = refreshed[refreshed.length - 1].block.calendarDate;
  curriculum.meta.holidays = refreshed
    .filter((item) => item.block.dayKind === "holiday")
    .map((item) => ({
      planDay: item.dayInPlan,
      date: item.block.calendarDate,
      name: item.block.holidayName,
    }));
  curriculum.meta.teachingDays = recount(refreshed);
  return curriculum;
}
