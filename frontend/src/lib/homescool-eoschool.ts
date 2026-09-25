/**
 * eoschool METHOD_V1 helpers — subject enum + US Letter page rendering.
 */

import type { EoschoolDocument, EoschoolQuestion } from "./homescool";
import { hcLog } from "./homescool-debug";
import { isMatTablesLayout, renderMatTablesPages } from "./homescool-mat-tables";
import {
  HOMESCOOL_SUBJECTS,
  HOMESCOOL_SUBJECT_LABELS,
  subjectClassNumber,
  subjectDisplayName,
  type HomescoolSubject,
} from "./homescool-subjects";

export {
  HOMESCOOL_SUBJECTS,
  HOMESCOOL_SUBJECT_LABELS,
  subjectClassNumber,
  subjectDisplayName,
};
export type { HomescoolSubject };

/**
 * How many MCQs can ride on the lesson sheet when the lesson is short
 * (deepen / light review). Keeps accumulated questions on the first sheet
 * instead of forcing a blank new quiz page.
 */
function inlineQuizCapacity(doc: EoschoolDocument): number {
  const kind = doc.lesson?.kind;
  if (kind === "deepen") return 0;
  if (kind === "review") {
    const points = doc.lesson?.points ?? [];
    const chars = points.reduce((n, p) => n + (p.body?.length ?? 0) + (p.heading?.length ?? 0), 0);
    if (chars < 1800) return 4;
    return 0;
  }
  return 0;
}

/** Build letter-portrait DOM pages for lesson + quiz (+ d5 expo). */
export function renderEoschoolPages(doc: EoschoolDocument): HTMLElement[] {
  hcLog("eoschool", "render.start", {
    subject: doc.subject,
    classNo: subjectClassNumber(doc.subject),
    day: doc.day,
    week: doc.week,
    kind: doc.lesson?.kind,
    points: doc.lesson?.points?.length,
    quiz: doc.quiz?.questionCount,
    supportUrl: Boolean(doc.supportUrl?.trim()),
    matTables: isMatTablesLayout(doc),
  });

  if (isMatTablesLayout(doc)) {
    const pages = renderMatTablesPages(doc);
    if (doc.day === 5) pages.push(buildExpoPage(doc));
    hcLog("eoschool", "render.done", { pages: pages.length, layout: "mat-tables" });
    return pages;
  }

  const qs = doc.quiz?.questions ?? [];
  const inlineCap = inlineQuizCapacity(doc);
  const inlineCount = Math.min(inlineCap, qs.length);
  const pages: HTMLElement[] = [];

  if (doc.supportUrl?.trim()) {
    pages.push(buildSupportPage(doc));
  }

  if (inlineCount > 0) {
    pages.push(buildLessonWithQuizPage(doc, qs.slice(0, inlineCount), 1, qs.length));
  } else {
    const lessonPages = buildLessonPages(doc);
    hcLog("eoschool", "lesson.pages", {
      count: lessonPages.length,
      kind: doc.lesson?.kind,
      points: doc.lesson?.points?.length ?? 0,
    });
    pages.push(...lessonPages);
  }

  const remaining = qs.slice(inlineCount);
  if (remaining.length) {
    const quizBatches = packQuizQuestions(doc, remaining, inlineCount);
    hcLog("eoschool", "quiz.pack", {
      remaining: remaining.length,
      batches: quizBatches.map((b) => b.length),
      filledPages: quizBatches.length,
    });
    let start = inlineCount + 1;
    for (const batch of quizBatches) {
      pages.push(buildQuizPage(doc, batch, start, qs.length));
      start += batch.length;
    }
  }

  if (doc.day === 5) {
    pages.push(buildExpoPage(doc));
    hcLog("eoschool", "expo.page", { day: 5 });
  }

  // Defensive: drop hero-only empty shells (cambio 2).
  const filtered = pages.filter((page) => !isHeroOnlyEmptyPage(page));
  if (filtered.length !== pages.length) {
    hcLog(
      "eoschool",
      "empty-page.dropped",
      { before: pages.length, after: filtered.length },
      "warn",
    );
  }

  hcLog("eoschool", "render.done", {
    pages: filtered.length,
    layout: "default",
    inlineQuiz: inlineCount,
    quizTotal: qs.length,
  });
  return filtered;
}

function isHeroOnlyEmptyPage(page: HTMLElement): boolean {
  const kids = Array.from(page.children);
  if (kids.length === 0) return true;
  if (kids.length === 1 && kids[0].classList.contains("homescool-letter__hero")) return true;
  return false;
}

type LessonPoint = EoschoolDocument["lesson"]["points"][number];

export type LessonSegment = {
  point: LessonPoint;
  pointIndex: number;
  paragraphs: string[];
  continuation: boolean;
};

export type LessonPageBlock =
  | { type: "point"; segment: LessonSegment }
  | { type: "summary" };

export type LessonBatch = {
  start: number;
  end: number;
  withSummary: boolean;
};

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

  const blocks: LessonPageBlock[] = points.map((point, pointIndex) => ({
    type: "point",
    segment: {
      point,
      pointIndex,
      paragraphs: splitLessonParagraphs(point.body),
      continuation: false,
    },
  }));
  if (doc.lesson?.summary?.trim()) blocks.push({ type: "summary" });

  if (!blocks.length) {
    hcLog("eoschool", "lesson.empty-blocks", { kind }, "warn");
    return [];
  }

  const fits = (candidate: readonly LessonPageBlock[]) =>
    lessonBlocksFit(doc, candidate, kicker, kind);

  const batches = packLessonBlocksExpanding(blocks, fits);

  if (!batches.length) {
    // Never emit a header-only blank page (cambio 2).
    hcLog("eoschool", "lesson.no-batches", { kind, blocks: blocks.length }, "warn");
    return [];
  }

  return batches.map((batch) => {
    const page = letterPage("homescool-letter-page--lesson", `homescool-letter-page--${kind}`);
    page.append(lessonHeader(doc, kicker));
    const segments = batch
      .filter((block): block is Extract<LessonPageBlock, { type: "point" }> => block.type === "point")
      .map((block) => block.segment);
    if (segments.length) page.append(buildLessonSegmentStack(doc, segments));
    if (batch.some((block) => block.type === "summary")) appendSummary(doc, page);
    return page;
  });
}

export function packLessonBlocksExpanding(
  blocks: readonly LessonPageBlock[],
  fits: (candidate: readonly LessonPageBlock[]) => boolean,
): LessonPageBlock[][] {
  const pages: LessonPageBlock[][] = [];
  const queue = [...blocks];
  let current: LessonPageBlock[] = [];

  const pointPart = (
    source: Extract<LessonPageBlock, { type: "point" }>,
    paragraphs: string[],
    continuation: boolean,
  ): LessonPageBlock => ({
    type: "point",
    segment: { ...source.segment, paragraphs, continuation },
  });

  while (queue.length) {
    const next = queue.shift()!;
    const candidate = [...current, next];
    if (fits(candidate)) {
      current = candidate;
      continue;
    }

    if (current.length > 0 && next.type === "point" && next.segment.paragraphs.length > 1) {
      const paras = next.segment.paragraphs;
      let take = 0;
      for (let n = 1; n <= paras.length; n++) {
        if (fits([...current, pointPart(next, paras.slice(0, n), next.segment.continuation)])) {
          take = n;
        } else {
          break;
        }
      }
      if (take > 0) {
        current.push(pointPart(next, paras.slice(0, take), next.segment.continuation));
        pages.push(current);
        current = [];
        if (take < paras.length) {
          queue.unshift(pointPart(next, paras.slice(take), true));
        }
        continue;
      }
    }

    if (current.length > 0) {
      pages.push(current);
      current = [];
      queue.unshift(next);
      continue;
    }

    if (next.type === "point" && next.segment.paragraphs.length > 1) {
      const parts = splitLessonSegment(next.segment);
      for (let i = parts.length - 1; i >= 0; i--) {
        queue.unshift(pointPart(next, parts[i], i > 0 || next.segment.continuation));
      }
      continue;
    }

    pages.push([next]);
  }

  if (current.length) pages.push(current);
  return pages;
}

function splitLessonParagraphs(body: string): string[] {
  return String(body || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitLessonSegment(segment: LessonSegment): string[][] {
  const paragraphs = segment.paragraphs;
  if (paragraphs.length <= 1) return [paragraphs];
  return paragraphs.map((paragraph) => [paragraph]);
}

function lessonBlocksFit(
  doc: EoschoolDocument,
  blocks: readonly LessonPageBlock[] | readonly LessonSegment[],
  kicker: string,
  kind: string,
): boolean {
  const segments = lessonSegmentsFromBlocks(blocks);
  const withSummary = blocks.some((block) => "type" in block && block.type === "summary");
  if (typeof document === "undefined" || !document.body) {
    return estimateLessonSliceFits(
      segments.map(({ point, paragraphs }) => ({ ...point, body: paragraphs.join("\n\n") })),
      withSummary,
      doc.lesson?.summary,
    );
  }

  const page = letterPage("homescool-letter-page--lesson", `homescool-letter-page--${kind}`);
  page.setAttribute("data-homescool-measure", "1");
  page.style.position = "absolute";
  page.style.left = "-10000px";
  page.style.top = "0";
  page.style.visibility = "hidden";
  page.style.pointerEvents = "none";
  page.style.width = "8.5in";
  page.style.height = "11in";
  page.style.maxHeight = "11in";
  page.style.overflow = "hidden";
  page.style.boxSizing = "border-box";
  page.append(lessonHeader(doc, kicker));

  if (segments.length) page.append(buildLessonSegmentStack(doc, segments));
  if (withSummary) appendSummary(doc, page);

  document.body.append(page);
  void page.offsetHeight;
  const client = page.clientHeight;
  const scroll = page.scrollHeight;
  page.remove();
  if (client < 8) {
    return estimateLessonSliceFits(
      segments.map(({ point, paragraphs }) => ({ ...point, body: paragraphs.join("\n\n") })),
      withSummary,
      doc.lesson?.summary,
    );
  }
  return scroll <= client + 1;
}

const QUIZ_FULL_PAGE_TYPES = new Set([
  "crossword",
  "wordsearch",
  "draw_image",
  "draw_box",
  "grid_mark",
]);

function quizItemType(q: EoschoolQuestion): string {
  return String(q.type || "mcq").toLowerCase().trim();
}

function isFullPageQuizType(type: string): boolean {
  return QUIZ_FULL_PAGE_TYPES.has(type);
}

function packQuizFallback(questions: EoschoolQuestion[]): EoschoolQuestion[][] {
  const out: EoschoolQuestion[][] = [];
  let i = 0;
  while (i < questions.length) {
    const typ = quizItemType(questions[i]!);
    if (isFullPageQuizType(typ)) {
      out.push([questions[i]!]);
      i += 1;
      continue;
    }
    if (typ === "match") {
      out.push([questions[i]!]);
      i += 1;
      continue;
    }
    const CAP = 20;
    let take = 0;
    while (i + take < questions.length && take < CAP) {
      const t = quizItemType(questions[i + take]!);
      if (isFullPageQuizType(t) || t === "match") break;
      take += 1;
    }
    if (take === 0) {
      out.push([questions[i]!]);
      i += 1;
    } else {
      out.push(questions.slice(i, i + take));
      i += take;
    }
  }
  return out;
}

/** Pack quiz questions filling each Letter page before opening the next (cambio 9). */
function packQuizQuestions(
  doc: EoschoolDocument,
  questions: EoschoolQuestion[],
  absoluteStartOffset: number,
): EoschoolQuestion[][] {
  if (!questions.length) return [];

  if (typeof document === "undefined" || !document.body) {
    return packQuizFallback(questions);
  }

  const pages: EoschoolQuestion[][] = [];
  let i = 0;
  while (i < questions.length) {
    const firstType = quizItemType(questions[i]!);
    if (isFullPageQuizType(firstType)) {
      pages.push([questions[i]!]);
      i += 1;
      continue;
    }

    let take = 1;
    while (i + take < questions.length) {
      const nextType = quizItemType(questions[i + take]!);
      if (isFullPageQuizType(nextType)) break;
      // Full-page activities never share a sheet with mcq/write/match.
      // Match can share only with other match if DOM fits.
      if (firstType !== "match" && nextType === "match") break;
      if (firstType === "match" && nextType !== "match") break;
      const candidate = questions.slice(i, i + take + 1);
      const startIndex = absoluteStartOffset + i + 1;
      if (quizSliceFits(doc, candidate, startIndex, absoluteStartOffset + questions.length)) {
        take += 1;
      } else {
        break;
      }
    }
    pages.push(questions.slice(i, i + take));
    i += take;
  }
  return pages;
}

function quizSliceFits(
  doc: EoschoolDocument,
  questions: EoschoolQuestion[],
  startIndex: number,
  total: number,
): boolean {
  const page = letterPage("homescool-letter-page--quiz");
  page.setAttribute("data-homescool-measure", "1");
  page.style.position = "absolute";
  page.style.left = "-10000px";
  page.style.top = "0";
  page.style.visibility = "hidden";
  page.style.pointerEvents = "none";
  page.style.width = "8.5in";
  page.style.height = "11in";
  page.style.maxHeight = "11in";
  page.style.overflow = "hidden";
  page.style.boxSizing = "border-box";
  page.append(
    lessonHeader(
      doc,
      `Cuestionario · ${total} preguntas`,
      `Días 1–${doc.day} · ${startIndex}–${startIndex + questions.length - 1}`,
    ),
  );
  page.append(buildQuizList(doc, questions, startIndex, total, { showLabel: false }));
  document.body.append(page);
  void page.offsetHeight;
  const client = page.clientHeight;
  const scroll = page.scrollHeight;
  page.remove();
  if (client < 8) {
    if (questions.some((q) => isFullPageQuizType(quizItemType(q)))) return questions.length <= 1;
    if (questions.some((q) => quizItemType(q) === "match")) return questions.length <= 1;
    return questions.length <= 20;
  }
  return scroll <= client + 1;
}

function lessonSegmentsFromBlocks(
  blocks: readonly LessonPageBlock[] | readonly LessonSegment[],
): LessonSegment[] {
  const segments: LessonSegment[] = [];
  for (const block of blocks) {
    if ("paragraphs" in block) {
      segments.push(block);
    } else if (block.type === "point") {
      segments.push(block.segment);
    }
  }
  return segments;
}

function estimateLessonSliceFits(
  points: LessonPoint[],
  withSummary: boolean,
  summary?: string,
): boolean {
  let score = 14;
  for (const p of points) {
    score += 10;
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

function buildSupportPage(doc: EoschoolDocument): HTMLElement {
  const page = letterPage("homescool-letter-page--lesson", "homescool-letter-page--support");
  page.append(lessonHeader(doc, "Apoyo"));
  const box = el("section", "homescool-letter__box homescool-letter__box--tip");
  box.append(boxLabel("Video o sitio de apoyo"));
  const url = String(doc.supportUrl || "").trim();
  const link = document.createElement("a");
  link.className = "homescool-letter__support-link";
  link.href = url;
  link.textContent = url;
  link.rel = "noopener noreferrer";
  link.target = "_blank";
  box.append(link);
  box.append(
    el(
      "p",
      "homescool-letter__body",
      "Usa este recurso para reforzar la clase. Si el enlace no abre, pídele ayuda a tu tutor.",
    ),
  );
  page.append(box);
  return page;
}

function buildExpoPage(doc: EoschoolDocument): HTMLElement {
  const page = letterPage("homescool-letter-page--expo");
  page.append(lessonHeader(doc, "Expo semanal"));
  const intro = el("section", "homescool-letter__box homescool-letter__box--goal");
  intro.append(boxLabel("Preparación de la presentación"));
  intro.append(
    el(
      "p",
      "homescool-letter__body",
      "Bosqueja o escribe aquí lo que presentarás en la expo semanal: idea principal, ejemplos y cierre.",
    ),
  );
  page.append(intro);
  const lines = el("div", "homescool-letter__expo-lines");
  lines.setAttribute("aria-hidden", "true");
  // US Letter ~11in − margins/header ≈ fill with 0.75cm rows.
  for (let i = 0; i < 28; i++) {
    lines.append(el("div", "homescool-letter__expo-line"));
  }
  page.append(lines);
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
  page.append(buildLessonStack(doc, doc.lesson?.points ?? []));
  appendSummary(doc, page);
  page.append(buildQuizList(doc, questions, startIndex, total));
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
      `Cuestionario · ${total} preguntas`,
      `Días 1–${doc.day} · ${startIndex}–${startIndex + questions.length - 1}`,
    ),
  );
  page.append(buildQuizList(doc, questions, startIndex, total, { showLabel: false }));
  return page;
}

function buildLessonStack(
  doc: EoschoolDocument,
  points: NonNullable<EoschoolDocument["lesson"]>["points"],
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
      copy.append(el("h3", "homescool-letter__point-title", p.heading));
    }
    if (p.body) copy.append(buildRichBody(p.body, { mode: kind === "review" ? "review" : "intro" }));
    block.append(badge, copy);
    stack.append(block);
  });
  return stack;
}

function buildLessonSegmentStack(doc: EoschoolDocument, segments: readonly LessonSegment[]): HTMLElement {
  const stack = el("div", "homescool-letter__stack");
  const kind = doc.lesson?.kind ?? "intro";
  for (const segment of segments) {
    const tone = (segment.pointIndex % 3) + 1;
    const block = el("section", `homescool-letter__point homescool-letter__point--${tone}`);
    const badge = el("span", "homescool-letter__point-badge", String(segment.pointIndex + 1));
    const copy = el("div", "homescool-letter__point-copy");
    if (segment.point.heading) {
      const heading = segment.continuation
        ? `${segment.point.heading} · continuación`
        : segment.point.heading;
      copy.append(el("h3", "homescool-letter__point-title", heading));
    }
    const body = segment.paragraphs.join("\n\n");
    if (body) copy.append(buildRichBody(body, { mode: kind === "review" ? "review" : "intro" }));
    block.append(badge, copy);
    stack.append(block);
  }
  return stack;
}

type RichMode = "deepen" | "intro" | "review";
type ParaKind = "lead" | "card" | "practice" | "error" | "tip" | "goal" | "contrast";

type RichPara = { kind: ParaKind; text: string; left?: string; right?: string };

const BOX_META: Record<ParaKind, { label: string }> = {
  lead: { label: "Idea central" },
  card: { label: "Explora" },
  practice: { label: "Práctica" },
  error: { label: "Error a corregir" },
  tip: { label: "Consejo" },
  goal: { label: "Meta" },
  contrast: { label: "Contraste" },
};

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
  const q = text.match(/«([^»]+)»[^.]*«([^»]+)»/);
  if (q) return [`«${q[1]}»`, `«${q[2]}»`];
  return null;
}

function buildRichBody(body: string, opts: { mode: RichMode }): HTMLElement {
  const paras = classifyLessonParas(body);
  const root = el("div", `homescool-letter__rich homescool-letter__rich--${opts.mode}`);

  const lead = paras.filter((p) => p.kind === "lead");
  const mid = paras.filter((p) => p.kind === "card" || p.kind === "contrast");
  const specials = paras.filter(
    (p) => p.kind === "practice" || p.kind === "error" || p.kind === "tip" || p.kind === "goal",
  );

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
    if (opts.mode === "deepen" && specials.length >= 2) {
      const row = el("div", "homescool-letter__specials-row");
      for (const p of specials) row.append(renderParaBlock(p));
      strip.append(row);
    } else {
      for (const p of specials) strip.append(renderParaBlock(p));
    }
    root.append(strip);
  }

  if (!paras.length && body.trim()) {
    root.append(el("p", "homescool-letter__body", body));
  }
  return root;
}

function renderParaBlock(p: RichPara): HTMLElement {
  const meta = BOX_META[p.kind];
  if (p.kind === "contrast" && p.left && p.right) {
    const box = el("div", "homescool-letter__box homescool-letter__box--contrast");
    box.append(boxLabel(meta.label));
    const cols = el("div", "homescool-letter__cols");
    const a = el("div", "homescool-letter__col homescool-letter__col--a");
    a.append(el("p", "homescool-letter__body", p.left));
    const b = el("div", "homescool-letter__col homescool-letter__col--b");
    b.append(el("p", "homescool-letter__body", p.right));
    cols.append(a, b);
    box.append(cols);
    if (p.left.length + p.right.length + 40 < p.text.length) {
      box.append(el("p", "homescool-letter__body homescool-letter__body--muted", p.text));
    }
    return box;
  }

  const box = el("div", `homescool-letter__box homescool-letter__box--${p.kind}`);
  const soft = p.kind === "card";
  box.append(boxLabel(meta.label, soft));

  if (p.kind === "practice") {
    const row = el("div", "homescool-letter__practice-row");
    const mark = el("span", "homescool-letter__practice-mark");
    mark.setAttribute("aria-hidden", "true");
    mark.title = "Marca cuando hayas hecho la práctica";
    row.append(mark);
    const copy = el("div", "homescool-letter__practice-copy");
    copy.append(el("p", "homescool-letter__body", p.text));
    copy.append(
      el(
        "p",
        "homescool-letter__practice-hint",
        "Si hace falta, haz la práctica en el reverso de la hoja.",
      ),
    );
    row.append(copy);
    box.append(row);
    return box;
  }

  box.append(el("p", "homescool-letter__body", p.text));
  return box;
}

function boxLabel(text: string, soft = false): HTMLElement {
  const label = el(
    "span",
    soft ? "homescool-letter__box-label homescool-letter__box-label--soft" : "homescool-letter__box-label",
  );
  label.append(el("span", "homescool-letter__box-label-text", text));
  return label;
}

function appendSummary(doc: EoschoolDocument, page: HTMLElement): void {
  if (!doc.lesson?.summary) return;
  const sum = el("section", "homescool-letter__summary");
  const label = el("h3", "homescool-letter__summary-label");
  label.append(el("span", "homescool-letter__box-label-text", "Resumen"));
  sum.append(label);
  sum.append(el("p", "homescool-letter__body", doc.lesson.summary));
  page.append(sum);
}

function buildQuizList(
  doc: EoschoolDocument,
  questions: EoschoolQuestion[],
  startIndex: number,
  total: number,
  opts?: { showLabel?: boolean },
): HTMLElement {
  const wrap = el("section", "homescool-letter__quiz-wrap");
  if (opts?.showLabel !== false) {
    const quizLabel = el("h3", "homescool-letter__quiz-label");
    quizLabel.append(
      el(
        "span",
        "homescool-letter__box-label-text",
        `Cuestionario · ${startIndex}–${startIndex + questions.length - 1} de ${total}`,
      ),
    );
    wrap.append(quizLabel);
  }
  const hasActivity = questions.some((q) => {
    const t = quizItemType(q);
    return t !== "mcq" && t !== "write";
  });
  const list = el(
    "ol",
    hasActivity ? "homescool-letter__quiz homescool-letter__quiz--activities" : "homescool-letter__quiz",
  ) as HTMLOListElement;
  list.start = startIndex;
  questions.forEach((q, i) => {
    list.append(buildQuizItem(doc, q, startIndex + i));
  });
  wrap.append(list);
  return wrap;
}

function buildQuizItem(doc: EoschoolDocument, q: EoschoolQuestion, index: number): HTMLElement {
  const typ = quizItemType(q);
  const li = document.createElement("li");
  li.className = `homescool-letter__q homescool-letter__q--${typ}`;
  const head = el("div", "homescool-letter__q-head");
  const num = el("span", "homescool-letter__q-num", String(index));
  num.setAttribute("aria-hidden", "true");
  head.append(num, el("p", "homescool-letter__body", q.prompt));
  li.append(head);

  switch (typ) {
    case "write":
      li.append(buildWriteLines());
      break;
    case "crossword":
      li.append(buildCrosswordActivity(q));
      break;
    case "wordsearch":
      li.append(buildWordsearchActivity(q));
      break;
    case "match":
      li.append(buildMatchActivity(q));
      break;
    case "draw_image":
      li.append(buildDrawImageActivity(doc, q));
      break;
    case "draw_box":
      li.append(buildDrawBoxActivity(q));
      break;
    case "grid_mark":
      li.append(buildGridMarkActivity(q));
      break;
    default:
      li.append(buildMcqChoices(q));
      break;
  }
  return li;
}

function buildWriteLines(): HTMLElement {
  const lines = el("div", "homescool-letter__write-lines");
  lines.setAttribute("aria-hidden", "true");
  for (let n = 0; n < 4; n++) {
    lines.append(el("div", "homescool-letter__write-line"));
  }
  return lines;
}

function buildMcqChoices(q: EoschoolQuestion): HTMLElement {
  const letters = ["A", "B", "C", "D", "E", "F"];
  const choices = q.choices?.filter((c) => String(c).trim()) ?? [];
  const ul = el("ul", "homescool-letter__choices-list");
  choices.forEach((c, idx) => {
    const opt = document.createElement("li");
    opt.className = "homescool-letter__choice";
    const mark = letters[idx] ?? String(idx + 1);
    opt.append(el("span", "homescool-letter__choice-mark", mark), el("span", "homescool-letter__choice-text", c));
    ul.append(opt);
  });
  return ul;
}

function isCrosswordBlock(cell: string): boolean {
  const t = String(cell ?? "").trim();
  return t === "." || t === "#" || t.toLowerCase() === "block";
}

function buildCrosswordActivity(q: EoschoolQuestion): HTMLElement {
  const cw = q.crossword;
  const wrap = el("div", "homescool-letter__activity homescool-letter__crossword");
  if (!cw?.grid?.length) return wrap;

  const rows = cw.rows || cw.grid.length;
  const cols = cw.cols || (cw.grid[0]?.length ?? 0);
  const board = el("div", "homescool-letter__cw-board");
  board.style.setProperty("--hc-cw-cols", String(cols));
  board.style.setProperty("--hc-cw-rows", String(rows));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const raw = String(cw.grid[r]?.[c] ?? "").trim();
      const cell = el("div", "homescool-letter__cw-cell");
      if (isCrosswordBlock(raw)) {
        cell.classList.add("homescool-letter__cw-cell--block");
      } else if (/^\d+$/.test(raw)) {
        // Author put the clue number in the cell (student sheet).
        cell.append(el("span", "homescool-letter__cw-num", raw));
      }
      // Answer letters are never printed on the student sheet.
      board.append(cell);
    }
  }
  wrap.append(board);

  const clues = el("div", "homescool-letter__cw-clues");
  const acrossCol = el("div", "homescool-letter__cw-clue-col");
  acrossCol.append(el("h4", "homescool-letter__cw-clue-title", "Horizontales"));
  const acrossOl = document.createElement("ol");
  acrossOl.className = "homescool-letter__cw-clue-list";
  for (const c of cw.cluesAcross ?? []) {
    const item = document.createElement("li");
    item.value = c.num;
    item.textContent = c.clue;
    acrossOl.append(item);
  }
  acrossCol.append(acrossOl);

  const downCol = el("div", "homescool-letter__cw-clue-col");
  downCol.append(el("h4", "homescool-letter__cw-clue-title", "Verticales"));
  const downOl = document.createElement("ol");
  downOl.className = "homescool-letter__cw-clue-list";
  for (const c of cw.cluesDown ?? []) {
    const item = document.createElement("li");
    item.value = c.num;
    item.textContent = c.clue;
    downOl.append(item);
  }
  downCol.append(downOl);
  clues.append(acrossCol, downCol);
  wrap.append(clues);
  return wrap;
}

function buildWordsearchActivity(q: EoschoolQuestion): HTMLElement {
  const ws = q.wordsearch;
  const wrap = el("div", "homescool-letter__activity homescool-letter__wordsearch");
  if (!ws?.grid?.length) return wrap;

  const rows = ws.grid.length;
  const cols = ws.grid[0]?.length ?? 0;
  const board = el("div", "homescool-letter__ws-board");
  board.style.setProperty("--hc-ws-cols", String(cols));
  board.style.setProperty("--hc-ws-rows", String(rows));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const letter = String(ws.grid[r]?.[c] ?? "").trim().toUpperCase() || "·";
      board.append(el("div", "homescool-letter__ws-cell", letter));
    }
  }
  wrap.append(board);

  const wordList = el("ul", "homescool-letter__ws-words");
  for (const w of ws.words ?? []) {
    const li = document.createElement("li");
    li.textContent = w;
    wordList.append(li);
  }
  wrap.append(wordList);
  return wrap;
}

/** Stable shuffle seeded by question id (student sheet; answer stays author-only). */
function stableShuffle<T>(items: T[], seed: string): T[] {
  const out = items.slice();
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = out.length - 1; i > 0; i--) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

function buildMatchActivity(q: EoschoolQuestion): HTMLElement {
  const m = q.match;
  const wrap = el("div", "homescool-letter__activity homescool-letter__match");
  if (!m?.left?.length || !m.right?.length) return wrap;

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const rightShuffled = stableShuffle(m.right, q.id || q.prompt || "match");

  const cols = el("div", "homescool-letter__match-cols");
  const leftCol = el("ol", "homescool-letter__match-left");
  m.left.forEach((text, i) => {
    const li = document.createElement("li");
    const blank = el("span", "homescool-letter__match-blank", "____");
    blank.setAttribute("aria-hidden", "true");
    li.append(blank, document.createTextNode(` ${text}`));
    leftCol.append(li);
    void i;
  });
  const rightCol = el("ol", "homescool-letter__match-right");
  rightShuffled.forEach((text, i) => {
    const li = document.createElement("li");
    const mark = el("span", "homescool-letter__match-mark", letters[i] ?? String(i + 1));
    li.append(mark, document.createTextNode(` ${text}`));
    rightCol.append(li);
  });
  cols.append(leftCol, rightCol);
  wrap.append(cols);
  wrap.append(
    el(
      "p",
      "homescool-letter__match-hint",
      "Escribe la letra de la derecha en la línea de cada ítem de la izquierda.",
    ),
  );
  return wrap;
}

function resolveMediaPath(doc: EoschoolDocument, mediaId: string): { path: string; alt: string } | null {
  const id = mediaId.trim();
  if (!id) return null;
  const hit = (doc.media ?? []).find((m) => String(m.id || "").trim() === id);
  if (!hit?.path) return null;
  return { path: hit.path, alt: hit.alt || "" };
}

function buildDrawImageActivity(doc: EoschoolDocument, q: EoschoolQuestion): HTMLElement {
  const wrap = el("div", "homescool-letter__activity homescool-letter__draw-image");
  const mediaId = q.drawImage?.mediaId ?? "";
  const media = resolveMediaPath(doc, mediaId);
  const frame = el("div", "homescool-letter__draw-frame homescool-letter__draw-frame--image");
  if (media) {
    const img = document.createElement("img");
    img.className = "homescool-letter__draw-img";
    img.src = media.path;
    img.alt = media.alt || q.prompt;
    frame.append(img);
  } else {
    frame.append(el("p", "homescool-letter__body", "[Imagen no disponible]"));
  }
  wrap.append(frame);
  return wrap;
}

function buildDrawBoxActivity(q: EoschoolQuestion): HTMLElement {
  const wrap = el("div", "homescool-letter__activity homescool-letter__draw-box");
  const height = q.drawBox?.heightCm && q.drawBox.heightCm > 0 ? q.drawBox.heightCm : 8;
  const frame = el("div", "homescool-letter__draw-frame homescool-letter__draw-frame--box");
  frame.style.minHeight = `${height}cm`;
  frame.setAttribute("aria-label", "Espacio para dibujar");
  wrap.append(frame);
  return wrap;
}

function colLabel(index: number): string {
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function buildGridMarkActivity(q: EoschoolQuestion): HTMLElement {
  const gm = q.gridMark;
  const wrap = el("div", "homescool-letter__activity homescool-letter__grid-mark");
  if (!gm) return wrap;
  const cols = Math.max(2, Math.min(16, gm.cols || 8));
  const rows = Math.max(2, Math.min(16, gm.rows || 8));

  const board = el("div", "homescool-letter__gm-board");
  board.style.setProperty("--hc-gm-cols", String(cols + 1));
  board.style.setProperty("--hc-gm-rows", String(rows + 1));

  board.append(el("div", "homescool-letter__gm-corner"));
  for (let c = 0; c < cols; c++) {
    board.append(el("div", "homescool-letter__gm-col-label", colLabel(c)));
  }
  for (let r = 0; r < rows; r++) {
    board.append(el("div", "homescool-letter__gm-row-label", String(r + 1)));
    for (let c = 0; c < cols; c++) {
      const cell = el("div", "homescool-letter__gm-cell");
      cell.setAttribute("aria-label", `${colLabel(c)}${r + 1}`);
      board.append(cell);
    }
  }
  wrap.append(board);
  wrap.append(
    el(
      "p",
      "homescool-letter__gm-hint",
      "Marca con X o sombrea las casillas correctas (ej. A6, G4).",
    ),
  );
  return wrap;
}

function letterPage(...extra: string[]): HTMLElement {
  const page = document.createElement("div");
  page.className = ["homescool-letter-page", ...extra].filter(Boolean).join(" ");
  return page;
}

function lessonHeader(doc: EoschoolDocument, kicker: string, sub?: string): HTMLElement {
  const head = el("header", "homescool-letter__hero");
  const classNo = subjectClassNumber(doc.subject);
  if (classNo > 0) {
    const num = el("span", "homescool-letter__class-no", String(classNo));
    num.setAttribute("aria-label", `Clase número ${classNo}`);
    head.append(num);
  }
  const main = el("div", "homescool-letter__hero-main");
  const top = el("div", "homescool-letter__hero-top");
  top.append(el("span", "homescool-letter__kicker", kicker));
  const end = el("div", "homescool-letter__hero-end");
  const metaParts = [
    `c${doc.cycle} · s${doc.week} · d${doc.day} · ${doc.subject} · nivel ${doc.level}`,
  ];
  if (sub) metaParts.push(sub);
  end.append(el("span", "homescool-letter__meta", metaParts.join(" · ")));
  top.append(end);
  main.append(top);
  main.append(el("h2", "homescool-letter__heading", doc.title));
  head.append(main);
  return head;
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
