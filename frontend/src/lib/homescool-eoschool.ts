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

/** Full quiz-only letter page: 4 columns × 4 rows fills US Letter under the hero. */
const QUIZ_PAGE_CAPACITY = 16;

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
    pages.push(...buildLessonPages(doc));
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

type LessonPoint = EoschoolDocument["lesson"]["points"][number];

export type LessonBatch = {
  /** Inclusive start index into lesson.points. */
  start: number;
  /** Exclusive end index. */
  end: number;
  withSummary: boolean;
};

/**
 * Greedy pack: keep adding the next section while `fits` says it still belongs
 * on the current Letter page; only then open a new page.
 */
export function packLessonBatches(
  pointCount: number,
  hasSummary: boolean,
  fits: (start: number, end: number, withSummary: boolean) => boolean,
): LessonBatch[] {
  if (pointCount <= 0) {
    return hasSummary ? [{ start: 0, end: 0, withSummary: true }] : [];
  }

  const batches: LessonBatch[] = [];
  let i = 0;
  while (i < pointCount) {
    let end = i + 1;
    while (end < pointCount && fits(i, end + 1, false)) {
      end += 1;
    }
    batches.push({ start: i, end, withSummary: false });
    i = end;
  }

  if (!hasSummary) return batches;

  const last = batches[batches.length - 1];
  if (fits(last.start, last.end, true)) {
    last.withSummary = true;
  } else {
    batches.push({ start: last.end, end: last.end, withSummary: true });
  }
  return batches;
}

/**
 * Lesson sheets: pack as many points as fit on each US Letter page (measure when
 * CSS layout is available; char/block estimate otherwise). Deepen stays one page.
 */
function buildLessonPages(doc: EoschoolDocument): HTMLElement[] {
  const kind = doc.lesson?.kind ?? "intro";
  const points = doc.lesson?.points ?? [];
  const kicker = kind === "deepen" ? "Profundización" : kind === "review" ? "Repaso" : "Clase";

  if (kind === "deepen") {
    const page = letterPage("homescool-letter-page--lesson", `homescool-letter-page--${kind}`);
    page.append(lessonHeader(doc, kicker));
    page.append(buildDeepenRibbon(doc));
    page.append(buildLessonStack(doc, points));
    appendSummary(doc, page);
    return [page];
  }

  const hasSummary = Boolean(doc.lesson?.summary?.trim());
  const batches = packLessonBatches(points.length, hasSummary, (start, end, withSummary) =>
    lessonSliceFits(doc, points, start, end, withSummary, kicker, kind),
  );

  if (!batches.length) {
    const page = letterPage("homescool-letter-page--lesson", `homescool-letter-page--${kind}`);
    page.append(lessonHeader(doc, kicker));
    return [page];
  }

  return batches.map((batch) => {
    const page = letterPage("homescool-letter-page--lesson", `homescool-letter-page--${kind}`);
    page.append(lessonHeader(doc, kicker));
    if (batch.end > batch.start) {
      page.append(buildLessonStack(doc, points.slice(batch.start, batch.end), batch.start));
    }
    if (batch.withSummary) appendSummary(doc, page);
    return page;
  });
}

/** True when the slice fits on one Letter sheet (layout measure, else estimate). */
function lessonSliceFits(
  doc: EoschoolDocument,
  points: LessonPoint[],
  start: number,
  end: number,
  withSummary: boolean,
  kicker: string,
  kind: string,
): boolean {
  const slice = points.slice(start, end);
  // A single section always gets its own page even if it overflows alone.
  if (slice.length <= 1 && !withSummary) return true;
  if (slice.length === 0 && withSummary) {
    return estimateLessonSliceFits([], true, doc.lesson?.summary);
  }

  if (typeof document === "undefined" || !document.body) {
    return estimateLessonSliceFits(slice, withSummary, doc.lesson?.summary);
  }

  const probe = letterPage("homescool-letter-page--lesson", `homescool-letter-page--${kind}`);
  probe.setAttribute("data-homescool-measure", "1");
  probe.style.position = "absolute";
  probe.style.left = "-10000px";
  probe.style.top = "0";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.append(lessonHeader(doc, kicker));
  if (slice.length) probe.append(buildLessonStack(doc, slice, start));
  if (withSummary) appendSummary(doc, probe);
  document.body.append(probe);
  // Force layout against Letter geometry from CSS.
  void probe.offsetHeight;
  const client = probe.clientHeight;
  const scroll = probe.scrollHeight;
  probe.remove();

  if (client < 8) {
    return estimateLessonSliceFits(slice, withSummary, doc.lesson?.summary);
  }
  return scroll <= client + 1;
}

/**
 * jsdom / no-CSS fallback: rough content units vs Letter budget.
 * Tuned so a dense METHOD_V1 point (~5 boxes) is ~one page; short points pack together.
 */
function estimateLessonSliceFits(
  points: LessonPoint[],
  withSummary: boolean,
  summary?: string,
): boolean {
  let score = 14; // hero
  for (const p of points) {
    score += 10; // point chrome / badge
    score += Math.ceil((p.heading?.length ?? 0) / 48);
    for (const para of classifyLessonParas(p.body || "")) {
      score += 7 + Math.ceil(para.text.length / 95);
      if (para.kind === "contrast") score += 4;
    }
  }
  if (withSummary && summary?.trim()) {
    score += 10 + Math.ceil(summary.trim().length / 95);
  }
  return score <= 105;
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
  page.append(buildLessonStack(doc, doc.lesson?.points ?? []));
  appendSummary(doc, page);
  page.append(buildQuizList(questions, startIndex, total, doc.day));
  return page;
}

function buildDeepenRibbon(doc: EoschoolDocument): HTMLElement {
  const focus = doc.lesson?.focusPoint ?? 1;
  const heading = doc.lesson?.points?.[0]?.heading?.trim() || `Punto ${focus}`;
  const ribbon = el("div", "homescool-letter__ribbon");
  const badge = el("span", "homescool-letter__ribbon-badge");
  badge.append(letterIcon("center_focus_strong"), el("span", "homescool-letter__kicker-text", `Punto ${focus}`));
  ribbon.append(badge);
  const title = el("span", "homescool-letter__ribbon-title");
  title.append(letterIcon("school"), el("span", "homescool-letter__title-text", heading));
  ribbon.append(title);
  const hint = el("span", "homescool-letter__ribbon-hint");
  hint.append(
    letterIcon("filter_1"),
    el("span", "homescool-letter__title-text", "Clase de profundización · un solo foco"),
  );
  ribbon.append(hint);
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

function buildLessonStack(
  doc: EoschoolDocument,
  points: NonNullable<EoschoolDocument["lesson"]>["points"],
  /** Global point index (1-based badge / icon cycle) when slicing across pages. */
  startIndex = 0,
): HTMLElement {
  const kind = doc.lesson?.kind ?? "intro";
  const stack = el("div", "homescool-letter__stack");
  if (kind === "deepen" && points.length === 1) {
    const p = points[0];
    const panel = el("section", "homescool-letter__deepen-panel homescool-letter__point--1");
    if (p?.body) panel.append(buildRichBody(p.body, { mode: "deepen" }));
    stack.append(panel);
    return stack;
  }
  points.forEach((p, i) => {
    const index = startIndex + i;
    const block = el("section", `homescool-letter__point homescool-letter__point--${(index % 3) + 1}`);
    const badge = el("span", "homescool-letter__point-badge", String(index + 1));
    const copy = el("div", "homescool-letter__point-copy");
    if (p.heading) {
      const title = el("h3", "homescool-letter__point-title");
      title.append(
        letterIcon(POINT_ICONS[index % POINT_ICONS.length] ?? "menu_book"),
        el("span", "homescool-letter__title-text", p.heading),
      );
      copy.append(title);
    }
    if (p.body) copy.append(buildRichBody(p.body, { mode: kind === "review" ? "review" : "intro" }));
    block.append(badge, copy);
    stack.append(block);
  });
  return stack;
}

type RichMode = "deepen" | "intro" | "review";
type ParaKind = "lead" | "card" | "practice" | "error" | "tip" | "goal" | "contrast";

type RichPara = { kind: ParaKind; text: string; left?: string; right?: string };

const POINT_ICONS = ["auto_stories", "science", "history_edu", "public", "palette"] as const;

const BOX_META: Record<ParaKind, { label: string; icon: string }> = {
  lead: { label: "Idea central", icon: "lightbulb" },
  card: { label: "Explora", icon: "menu_book" },
  practice: { label: "Práctica", icon: "edit_note" },
  error: { label: "Error a corregir", icon: "warning" },
  tip: { label: "Consejo", icon: "tips_and_updates" },
  goal: { label: "Meta", icon: "flag" },
  contrast: { label: "Contraste", icon: "compare_arrows" },
};

const HERO_ICONS: Record<string, string> = {
  Clase: "school",
  Profundización: "center_focus_strong",
  Repaso: "restart_alt",
  "Clase + cuestionario": "menu_book",
};

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
  const meta = BOX_META[p.kind];
  if (p.kind === "contrast" && p.left && p.right) {
    const box = el("div", "homescool-letter__box homescool-letter__box--contrast");
    box.append(boxLabel(meta.icon, meta.label));
    const cols = el("div", "homescool-letter__cols");
    const a = el("div", "homescool-letter__col homescool-letter__col--a");
    a.append(letterIcon("arrow_back"), el("p", "homescool-letter__body", p.left));
    const b = el("div", "homescool-letter__col homescool-letter__col--b");
    b.append(letterIcon("arrow_forward"), el("p", "homescool-letter__body", p.right));
    cols.append(a, b);
    box.append(cols);
    if (p.left.length + p.right.length + 40 < p.text.length) {
      box.append(el("p", "homescool-letter__body homescool-letter__body--muted", p.text));
    }
    return box;
  }

  const box = el("div", `homescool-letter__box homescool-letter__box--${p.kind}`);
  const soft = p.kind === "card";
  box.append(boxLabel(meta.icon, meta.label, soft));
  box.append(el("p", "homescool-letter__body", p.text));
  return box;
}

function boxLabel(icon: string, text: string, soft = false): HTMLElement {
  const label = el(
    "span",
    soft ? "homescool-letter__box-label homescool-letter__box-label--soft" : "homescool-letter__box-label",
  );
  label.append(letterIcon(icon), el("span", "homescool-letter__box-label-text", text));
  return label;
}

/**
 * Letter-sheet marks — CSS geometry only (no Material Symbols ligature text).
 * Web-font icons paint as raw names (quiz, auto_stories…) in PDF capture when
 * the icon font is missing or uppercase inheritance breaks ligatures.
 */
function letterIcon(name: string): HTMLElement {
  const icon = document.createElement("span");
  icon.className = "homescool-letter__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("data-icon", name);
  return icon;
}

function appendSummary(doc: EoschoolDocument, page: HTMLElement): void {
  if (!doc.lesson?.summary) return;
  const sum = el("section", "homescool-letter__summary");
  const label = el("h3", "homescool-letter__summary-label");
  label.append(letterIcon("summarize"), el("span", "homescool-letter__box-label-text", "Resumen"));
  sum.append(label);
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
  const quizLabel = el("h3", "homescool-letter__quiz-label");
  quizLabel.append(
    letterIcon("quiz"),
    el(
      "span",
      "homescool-letter__box-label-text",
      `Cuestionario · ${total} (días 1–${day}) · ${startIndex}–${startIndex + questions.length - 1}`,
    ),
  );
  wrap.append(quizLabel);
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
  const kick = el("span", "homescool-letter__kicker");
  const kickIcon =
    HERO_ICONS[kicker] ??
    (kicker.startsWith("Cuestionario") ? "quiz" : "school");
  kick.append(letterIcon(kickIcon), el("span", "homescool-letter__kicker-text", kicker));
  top.append(kick);
  top.append(
    el(
      "span",
      "homescool-letter__meta",
      `c${doc.cycle} · s${doc.week} · d${doc.day} · ${doc.subject} · nivel ${doc.level}`,
    ),
  );
  head.append(top);
  const title = el("h2", "homescool-letter__heading");
  title.append(letterIcon("auto_stories"), el("span", "homescool-letter__title-text", doc.title));
  head.append(title);
  if (sub) head.append(el("p", "homescool-letter__sub", sub));
  return head;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
