/**
 * Homescool curriculum SoT backup — FE JSON for agent review.
 * Runtime load prefers Mongo materials; this file remains the reviewable mirror.
 */
import { HOMESCOOL_ROUTES } from "../config/routes";
import { mustLog } from "./dev-log";
import type { EoschoolDocument } from "./homescool";

export type HomescoolCurriculumClass = EoschoolDocument & {
  key: string;
  source?: string;
};

export type HomescoolCurriculum = {
  format: string;
  version: number;
  level: number;
  description?: string;
  classCount: number;
  classes: HomescoolCurriculumClass[];
};

/** Strip curriculum metadata so the API / renderer receive a pure eoschool document. */
export function toEoschoolDocument(row: HomescoolCurriculumClass): EoschoolDocument {
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
    supportUrl: row.supportUrl,
  };
}

export function curriculumCellKey(
  cycle: number,
  week: number,
  day: number,
  level: number,
  subject: string,
): string {
  return `c${cycle}-w${week}-d${day}-l${level}-${subject}`;
}

export function findCurriculumClass(
  curriculum: HomescoolCurriculum,
  sel: { cycle: number; week: number; day: number; subject: string },
  level = 6,
): HomescoolCurriculumClass | undefined {
  const key = curriculumCellKey(sel.cycle, sel.week, sel.day, level, sel.subject);
  return curriculum.classes.find(
    (c) =>
      c.key === key ||
      (c.cycle === sel.cycle &&
        c.week === sel.week &&
        c.day === sel.day &&
        c.level === level &&
        c.subject === sel.subject),
  );
}

/**
 * Nginx serves public/*.json with long-lived immutable cache. Bust the URL so
 * allowlist updates are not stuck on a year-old curriculum.json in the browser.
 */
export function curriculumFetchUrl(url = HOMESCOOL_ROUTES.curriculum): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${Date.now()}`;
}

export async function loadHomescoolCurriculum(
  url = HOMESCOOL_ROUTES.curriculum,
): Promise<{ curriculum: HomescoolCurriculum | null; error?: string }> {
  const fetchUrl = curriculumFetchUrl(url);
  if (mustLog) console.log("[homescool-curriculum] load.start", { url: fetchUrl });
  try {
    const res = await fetch(fetchUrl, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) {
      if (mustLog) console.log("[homescool-curriculum] load.fail", { status: res.status });
      return { curriculum: null, error: `Could not load curriculum backup (${res.status}).` };
    }
    const data = (await res.json()) as HomescoolCurriculum;
    if (data.format !== "homescool-curriculum" || !Array.isArray(data.classes)) {
      return { curriculum: null, error: "Invalid curriculum format." };
    }
    if (mustLog) {
      console.log("[homescool-curriculum] load.ok", {
        classCount: data.classCount ?? data.classes.length,
        version: data.version,
        cycles: [...new Set(data.classes.map((c) => c.cycle))].sort((a, b) => a - b),
        weeks: [...new Set(data.classes.map((c) => c.week))].sort((a, b) => a - b),
      });
    }
    return { curriculum: data };
  } catch (err) {
    if (mustLog) console.log("[homescool-curriculum] load.error", { err: String(err) });
    return { curriculum: null, error: "Could not load curriculum backup." };
  }
}
