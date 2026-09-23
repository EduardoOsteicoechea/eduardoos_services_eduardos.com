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

/** 8 new MCQs per day; letter quiz pages show 8 cards (4×2 grid). */
const QUESTIONS_PER_PAGE = 8;

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
  const page = letterPage("homescool-letter-page--lesson");
  page.append(lessonHeader(doc, "Clase"));

  const points = doc.lesson?.points ?? [];
  const stack = el("div", "homescool-letter__stack");
  points.forEach((p, index) => {
    const block = el("section", `homescool-letter__point homescool-letter__point--${(index % 3) + 1}`);
    const badge = el("span", "homescool-letter__point-badge", String(index + 1));
    const copy = el("div", "homescool-letter__point-copy");
    if (p.heading) copy.append(el("h3", "homescool-letter__point-title", p.heading));
    if (p.body) copy.append(el("p", "homescool-letter__body", p.body));
    block.append(badge, copy);
    stack.append(block);
  });
  page.append(stack);

  if (doc.lesson?.summary) {
    const sum = el("section", "homescool-letter__summary");
    sum.append(el("h3", "homescool-letter__summary-label", "Resumen"));
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
  const page = letterPage("homescool-letter-page--quiz");
  page.append(
    lessonHeader(
      doc,
      `Cuestionario · ${total} preguntas (días 1–${doc.day})`,
      `${startIndex}–${startIndex + questions.length - 1}`,
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
        const markEl = el("span", "homescool-letter__choice-mark", mark);
        const textEl = el("span", "homescool-letter__choice-text", c);
        opt.append(markEl, textEl);
        ul.append(opt);
      });
      li.append(ul);
    }
    list.append(li);
  }
  page.append(list);
  return page;
}

function letterPage(...extra: string[]): HTMLElement {
  const page = document.createElement("div");
  page.className = ["homescool-letter-page", ...extra].filter(Boolean).join(" ");
  return page;
}

function lessonHeader(doc: EoschoolDocument, kicker: string, sub?: string): HTMLElement {
  const head = el("header", "homescool-letter__hero");
  const top = el("div", "homescool-letter__hero-top");
  top.append(el("span", "homescool-letter__kicker", kicker));
  top.append(
    el(
      "span",
      "homescool-letter__meta",
      `c${doc.cycle} · s${doc.week} · d${doc.day} · ${doc.subject} · nivel ${doc.level}`,
    ),
  );
  head.append(top);
  head.append(el("h2", "homescool-letter__heading", doc.title));
  if (sub) head.append(el("p", "homescool-letter__sub", sub));
  return head;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
