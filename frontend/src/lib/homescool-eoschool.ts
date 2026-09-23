/**
 * eoschool METHOD_V1 helpers — subject enum + US Letter page rendering.
 */

import type { EoschoolDocument, EoschoolQuestion } from "./homescool";

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
  const pages: HTMLElement[] = [];
  pages.push(buildLessonPage(doc));
  const qs = doc.quiz?.questions ?? [];
  for (let i = 0; i < qs.length; i += QUESTIONS_PER_PAGE) {
    pages.push(buildQuizPage(doc, qs.slice(i, i + QUESTIONS_PER_PAGE), i + 1, qs.length));
  }
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
      `Cuestionario (${startIndex}–${startIndex + questions.length - 1} de ${total})`,
    ),
  );
  const list = el("ol", "homescool-letter__quiz");
  list.start = startIndex;
  for (const q of questions) {
    const li = document.createElement("li");
    li.className = "homescool-letter__q";
    li.append(el("p", "homescool-letter__body", q.prompt));
    if (q.choices?.length) {
      const choices = el("p", "homescool-letter__choices", q.choices.join("  ·  "));
      li.append(choices);
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
