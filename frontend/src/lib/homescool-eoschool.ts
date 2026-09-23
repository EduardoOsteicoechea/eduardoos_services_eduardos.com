/**
 * eoschool METHOD_V1 helpers — subject enum + US Letter page rendering.
 */

import type { EoschoolDocument, EoschoolQuestion } from "./homescool";
import { mustLog } from "./dev-log";
import { isMatTablesLayout, renderMatTablesPages } from "./homescool-mat-tables";

export const HOMESCOOL_SUBJECTS = [
  "mat",
  "esp",
  "ing",
  "his",
  "lat",
  "LT",
  "geo",
  "cie",
  "art",
  "pro",
  "teb",
  "exe",
] as const;

export type HomescoolSubject = (typeof HOMESCOOL_SUBJECTS)[number];

const QUESTIONS_PER_PAGE = 7;

/** Build letter-portrait DOM pages for lesson + quiz. */
export function renderEoschoolPages(doc: EoschoolDocument): HTMLElement[] {
  if (mustLog) {
    console.log("[homescool-eoschool] render.start", {
      subject: doc.subject,
      day: doc.day,
      week: doc.week,
      kind: doc.lesson?.kind,
      points: doc.lesson?.points?.length,
      quiz: doc.quiz?.questionCount,
      matTables: isMatTablesLayout(doc),
    });
  }

  if (isMatTablesLayout(doc)) {
    const pages = renderMatTablesPages(doc);
    if (mustLog) console.log("[homescool-eoschool] render.done", { pages: pages.length, layout: "mat-tables" });
    return pages;
  }

  const pages: HTMLElement[] = [];
  pages.push(buildLessonPage(doc));
  const qs = doc.quiz?.questions ?? [];
  for (let i = 0; i < qs.length; i += QUESTIONS_PER_PAGE) {
    pages.push(buildQuizPage(doc, qs.slice(i, i + QUESTIONS_PER_PAGE), i + 1, qs.length));
  }
  if (mustLog) console.log("[homescool-eoschool] render.done", { pages: pages.length, layout: "default" });
  return pages;
}

function buildLessonPage(doc: EoschoolDocument): HTMLElement {
  const page = letterPage();
  page.append(metaHeader(doc), el("h2", "homescool-letter__heading", "Clase"));
  const points = doc.lesson?.points ?? [];
  for (const p of points) {
    const block = el("section", "homescool-letter__point");
    if (p.heading) block.append(el("h3", "homescool-letter__point-title", p.heading));
    if (p.body) block.append(el("p", "homescool-letter__body", p.body));
    page.append(block);
  }
  if (doc.lesson?.summary) {
    const sum = el("section", "homescool-letter__summary");
    sum.append(el("h3", "homescool-letter__point-title", "Resumen"));
    sum.append(el("p", "homescool-letter__body", doc.lesson.summary));
    page.append(sum);
  }
  return page;
}

function buildQuizPage(
  doc: EoschoolDocument,
  questions: EoschoolQuestion[],
  startIndex: number,
  total: number,
): HTMLElement {
  const page = letterPage();
  page.append(
    metaHeader(doc),
    el(
      "h2",
      "homescool-letter__heading",
      `Cuestionario — ${total} preguntas (días 1–${doc.day}) · ${startIndex}–${startIndex + questions.length - 1}`,
    ),
  );
  const list = el("ol", "homescool-letter__quiz");
  list.start = startIndex;
  const letters = ["A", "B", "C", "D", "E", "F"];
  for (const q of questions) {
    const li = document.createElement("li");
    li.className = "homescool-letter__q";
    li.append(el("p", "homescool-letter__body", q.prompt));
    const choices = q.choices?.filter((c) => String(c).trim()) ?? [];
    if (choices.length) {
      const ul = el("ul", "homescool-letter__choices-list");
      choices.forEach((c, idx) => {
        const opt = document.createElement("li");
        opt.className = "homescool-letter__choice";
        const mark = letters[idx] ?? String(idx + 1);
        opt.textContent = `${mark}) ${c}`;
        ul.append(opt);
      });
      li.append(ul);
    }
    list.append(li);
  }
  page.append(list);
  return page;
}

function letterPage(): HTMLElement {
  const page = document.createElement("div");
  page.className = "homescool-letter-page";
  return page;
}

function metaHeader(doc: EoschoolDocument): HTMLElement {
  const head = el(
    "header",
    "homescool-letter__meta",
    `${doc.title} · c${doc.cycle} s${doc.week} d${doc.day} · ${doc.subject} · nivel ${doc.level}`,
  );
  return head;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
