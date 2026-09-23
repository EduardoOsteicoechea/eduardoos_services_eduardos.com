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

/** Full quiz-only letter page: 4×2 cards. */
const QUIZ_PAGE_CAPACITY = 8;

/**
 * How many MCQs can ride on the lesson sheet when the lesson is short
 * (deepen / light review). Keeps accumulated questions on the first sheet
 * instead of forcing a blank new quiz page.
 */
function inlineQuizCapacity(doc: EoschoolDocument): number {
  const kind = doc.lesson?.kind;
  // Deepen = full letter lesson on the focus point; quiz always on following pages.
  if (kind === "deepen") return 0;
  if (kind === "review") {
    const points = doc.lesson?.points ?? [];
    const chars = points.reduce((n, p) => n + (p.body?.length ?? 0) + (p.heading?.length ?? 0), 0);
    // Short review overviews → leave room for one row; long → quiz on its own pages.
    if (chars < 1800) return 4;
    return 0;
  }
  // Intro day-1 fills the letter sheet with 3 points + summary.
  return 0;
}

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

  const qs = doc.quiz?.questions ?? [];
  const inlineCap = inlineQuizCapacity(doc);
  const inlineCount = Math.min(inlineCap, qs.length);
  const pages: HTMLElement[] = [];

  if (inlineCount > 0) {
    pages.push(buildLessonWithQuizPage(doc, qs.slice(0, inlineCount), 1, qs.length));
  } else {
    pages.push(buildLessonPage(doc));
  }

  for (let i = inlineCount; i < qs.length; i += QUIZ_PAGE_CAPACITY) {
    pages.push(buildQuizPage(doc, qs.slice(i, i + QUIZ_PAGE_CAPACITY), i + 1, qs.length));
  }

  if (mustLog) {
    console.log("[homescool-eoschool] render.done", {
      pages: pages.length,
      layout: "default",
      inlineQuiz: inlineCount,
      quizTotal: qs.length,
    });
  }
  return pages;
}

function buildLessonPage(doc: EoschoolDocument): HTMLElement {
  const kind = doc.lesson?.kind ?? "intro";
  const page = letterPage(
    "homescool-letter-page--lesson",
    `homescool-letter-page--${kind}`,
  );
  page.append(lessonHeader(doc, kind === "deepen" ? "Profundización" : kind === "review" ? "Repaso" : "Clase"));
  if (kind === "deepen") page.append(buildDeepenRibbon(doc));
  page.append(buildLessonStack(doc));
  appendSummary(doc, page);
  return page;
}

function buildLessonWithQuizPage(
  doc: EoschoolDocument,
  questions: EoschoolQuestion[],
  startIndex: number,
  total: number,
): HTMLElement {
  const kind = doc.lesson?.kind ?? "intro";
  const page = letterPage(
    "homescool-letter-page--lesson",
    "homescool-letter-page--with-quiz",
    `homescool-letter-page--${kind}`,
  );
  page.append(lessonHeader(doc, "Clase + cuestionario"));
  if (kind === "deepen") page.append(buildDeepenRibbon(doc));
  page.append(buildLessonStack(doc));
  appendSummary(doc, page);
  page.append(buildQuizList(questions, startIndex, total, doc.day));
  return page;
}

function buildDeepenRibbon(doc: EoschoolDocument): HTMLElement {
  const focus = doc.lesson?.focusPoint ?? 1;
  const heading = doc.lesson?.points?.[0]?.heading?.trim() || `Punto ${focus}`;
  const ribbon = el("div", "homescool-letter__ribbon");
  ribbon.append(el("span", "homescool-letter__ribbon-badge", `Punto ${focus}`));
  ribbon.append(el("span", "homescool-letter__ribbon-title", heading));
  ribbon.append(el("span", "homescool-letter__ribbon-hint", "Clase de profundización · un solo foco"));
  return ribbon;
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
  page.append(buildQuizList(questions, startIndex, total, doc.day));
  return page;
}

function buildLessonStack(doc: EoschoolDocument): HTMLElement {
  const points = doc.lesson?.points ?? [];
  const kind = doc.lesson?.kind ?? "intro";
  const stack = el("div", "homescool-letter__stack");
  if (kind === "deepen" && points.length === 1) {
    const p = points[0];
    const panel = el("section", "homescool-letter__deepen-panel homescool-letter__point--1");
    if (p?.body) panel.append(buildRichBody(p.body, { mode: "deepen" }));
    stack.append(panel);
    return stack;
  }
  points.forEach((p, index) => {
    const block = el("section", `homescool-letter__point homescool-letter__point--${(index % 3) + 1}`);
    const badge = el("span", "homescool-letter__point-badge", String(index + 1));
    const copy = el("div", "homescool-letter__point-copy");
    if (p.heading) copy.append(el("h3", "homescool-letter__point-title", p.heading));
    if (p.body) copy.append(buildRichBody(p.body, { mode: kind === "review" ? "review" : "intro" }));
    block.append(badge, copy);
    stack.append(block);
  });
  return stack;
}

type RichMode = "deepen" | "intro" | "review";
type ParaKind = "lead" | "card" | "practice" | "error" | "tip" | "goal" | "contrast";

type RichPara = { kind: ParaKind; text: string; left?: string; right?: string };

/** Split lesson bodies into typed blocks (boxes / cols) instead of one flat paragraph. */
export function classifyLessonParas(body: string): RichPara[] {
  const parts = String(body || "")
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((text, i) => {
    const kind = classifyPara(text, i);
    if (kind === "contrast") {
      const split = splitContrast(text);
      if (split) return { kind, text, left: split[0], right: split[1] };
    }
    return { kind, text };
  });
}

function classifyPara(text: string, index: number): ParaKind {
  if (/^(Error a corregir|Error to fix|Error común|Mistake to fix|Error:)/i.test(text)) return "error";
  if (/^(Práctica|Ejercicio|Practice|Class practice|Método|Method:)/i.test(text)) return "practice";
  if (/^(Consejo|Tip|Detalle útil|Señal|Nota|Atención:)/i.test(text)) return "tip";
  if (/^(Meta|Goal|Criterio de éxito)/i.test(text)) return "goal";
  if (/\bfrente a\b|\bvs\.?\b|↔|contraste clave|study pairs|pares contrastados/i.test(text)) return "contrast";
  if (index === 0) return "lead";
  return "card";
}

function splitContrast(text: string): [string, string] | null {
  const markers = [" frente a ", " vs. ", " vs ", " ↔ ", " versus "];
  const lower = text.toLowerCase();
  for (const m of markers) {
    const at = lower.indexOf(m.toLowerCase());
    if (at > 12 && at < text.length - 12) {
      return [text.slice(0, at).trim(), text.slice(at + m.length).trim()];
    }
  }
  // Quoted pair: «A» … «B»
  const q = text.match(/«([^»]+)»[^.]*«([^»]+)»/);
  if (q) return [`«${q[1]}»`, `«${q[2]}»`];
  return null;
}

function buildRichBody(body: string, opts: { mode: RichMode }): HTMLElement {
  const paras = classifyLessonParas(body);
  const root = el("div", `homescool-letter__rich homescool-letter__rich--${opts.mode}`);

  const lead = paras.filter((p) => p.kind === "lead");
  const mid = paras.filter((p) => p.kind === "card" || p.kind === "contrast");
  const specials = paras.filter((p) => p.kind === "practice" || p.kind === "error" || p.kind === "tip" || p.kind === "goal");

  for (const p of lead) root.append(renderParaBlock(p));

  if (mid.length) {
    const grid = el("div", "homescool-letter__cards");
    mid.forEach((p, i) => {
      const node = renderParaBlock(p);
      if (p.kind === "card") node.classList.add(`homescool-letter__card-tone--${(i % 4) + 1}`);
      grid.append(node);
    });
    root.append(grid);
  }

  if (specials.length) {
    const strip = el("div", "homescool-letter__specials");
    // Pair practice|error side-by-side when both present on deepen.
    if (opts.mode === "deepen" && specials.length >= 2) {
      const row = el("div", "homescool-letter__specials-row");
      for (const p of specials) row.append(renderParaBlock(p));
      strip.append(row);
    } else {
      for (const p of specials) strip.append(renderParaBlock(p));
    }
    root.append(strip);
  }

  // Fallback: unclassified empty → keep readable text
  if (!paras.length && body.trim()) {
    root.append(el("p", "homescool-letter__body", body));
  }
  return root;
}

function renderParaBlock(p: RichPara): HTMLElement {
  if (p.kind === "contrast" && p.left && p.right) {
    const box = el("div", "homescool-letter__box homescool-letter__box--contrast");
    box.append(el("span", "homescool-letter__box-label", "Contraste"));
    const cols = el("div", "homescool-letter__cols");
    const a = el("div", "homescool-letter__col homescool-letter__col--a");
    a.append(el("p", "homescool-letter__body", p.left));
    const b = el("div", "homescool-letter__col homescool-letter__col--b");
    b.append(el("p", "homescool-letter__body", p.right));
    cols.append(a, b);
    box.append(cols);
            // Keep leftover context only when the split was a short extract.
            if (p.left.length + p.right.length + 40 < p.text.length) {
              box.append(el("p", "homescool-letter__body homescool-letter__body--muted", p.text));
            }
            return box;
  }

  const label =
    p.kind === "lead"
      ? "Idea central"
      : p.kind === "practice"
        ? "Práctica"
        : p.kind === "error"
          ? "Error a corregir"
          : p.kind === "tip"
            ? "Consejo"
            : p.kind === "goal"
              ? "Meta"
              : "Explora";

  const box = el(
    "div",
    `homescool-letter__box homescool-letter__box--${p.kind}`,
  );
  if (p.kind !== "lead" && p.kind !== "card") {
    box.append(el("span", "homescool-letter__box-label", label));
  } else if (p.kind === "card") {
    box.append(el("span", "homescool-letter__box-label homescool-letter__box-label--soft", label));
  }
  box.append(el("p", "homescool-letter__body", p.text));
  return box;
}

function appendSummary(doc: EoschoolDocument, page: HTMLElement): void {
  if (!doc.lesson?.summary) return;
  const sum = el("section", "homescool-letter__summary");
  sum.append(el("h3", "homescool-letter__summary-label", "Resumen"));
  sum.append(el("p", "homescool-letter__body", doc.lesson.summary));
  page.append(sum);
}

function buildQuizList(
  questions: EoschoolQuestion[],
  startIndex: number,
  total: number,
  day: number,
): HTMLElement {
  const wrap = el("section", "homescool-letter__quiz-wrap");
  wrap.append(
    el(
      "h3",
      "homescool-letter__quiz-label",
      `Cuestionario · ${total} (días 1–${day}) · ${startIndex}–${startIndex + questions.length - 1}`,
    ),
  );
  const list = el("ol", "homescool-letter__quiz") as HTMLOListElement;
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
  wrap.append(list);
  return wrap;
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
