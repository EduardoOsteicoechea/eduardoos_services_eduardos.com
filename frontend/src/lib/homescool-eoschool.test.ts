/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { EoschoolDocument } from "./homescool";
import {
  classifyLessonParas,
  packLessonBatches,
  packLessonBlocksExpanding,
  renderEoschoolPages,
  type LessonPageBlock,
} from "./homescool-eoschool";
import { calculateLetterPages } from "./homescool-letter-layout";

describe("classifyLessonParas", () => {
  it("marks lead, cards, practice and error for deepen bodies", () => {
    const body = [
      "Hoy profundizas solo el cráneo. Fija qué protege.",
      "El cráneo es la caja ósea de la cabeza.",
      "Contraste clave: cráneo frente a tórax protege órganos distintos.",
      "Práctica: dibuja un perfil y señala bóveda vs mandíbula.",
      "Error a corregir: decir que el cráneo protege el corazón.",
    ].join("\n\n");

    const paras = classifyLessonParas(body);
    expect(paras.map((p) => p.kind)).toEqual(["lead", "card", "contrast", "practice", "error"]);
    expect(paras[2].left).toBeTruthy();
    expect(paras[2].right).toBeTruthy();
  });

  it("keeps a single paragraph as lead", () => {
    const paras = classifyLessonParas("Solo una idea.");
    expect(paras).toEqual([{ kind: "lead", text: "Solo una idea." }]);
  });
});

describe("lesson rich layout", () => {
  it("places Explora left and Práctica + Error right under Idea central", () => {
    const doc = baseDoc({
      lesson: {
        kind: "intro",
        focusPoint: null,
        points: [
          {
            id: "p1",
            heading: "Panorama",
            body: [
              "Idea central del punto.",
              "Texto de exploración.",
              "Práctica: haz el ejercicio.",
              "Error a corregir: no confundir fechas.",
            ].join("\n\n"),
          },
        ],
        summary: "",
      },
    });
    const pages = renderEoschoolPages(doc);
    const rich = pages[0].querySelector(".homescool-letter__rich");
    const row = rich?.querySelector(".homescool-letter__lesson-row");
    expect(row).toBeTruthy();
    const main = row?.querySelector(".homescool-letter__lesson-main");
    const side = row?.querySelector(".homescool-letter__lesson-side");
    expect(main?.querySelector(".homescool-letter__box--card")).toBeTruthy();
    expect(side?.querySelectorAll(".homescool-letter__box--practice, .homescool-letter__box--error")).toHaveLength(2);
    expect(rich?.querySelector(".homescool-letter__box--lead")).toBeTruthy();
    expect(pages[0].querySelector(".homescool-letter__point")?.className).not.toMatch(/border/);
  });
});

describe("packLessonBatches", () => {
  it("keeps following sections on the same page while they fit", () => {
    const batches = packLessonBatches(3, true, (start, end, withSummary) => {
      // Capacity: 2 sections, or 1 section + summary — not 3, not 2+summary.
      const n = end - start;
      if (withSummary) return n <= 1;
      return n <= 2;
    });
    expect(batches).toEqual([
      { start: 0, end: 2, withSummary: false },
      { start: 2, end: 3, withSummary: true },
    ]);
  });

  it("puts summary on its own page when it no longer fits with the last sections", () => {
    const batches = packLessonBatches(2, true, (_s, _e, withSummary) => !withSummary);
    expect(batches).toEqual([
      { start: 0, end: 2, withSummary: false },
      { start: 2, end: 2, withSummary: true },
    ]);
  });
});

describe("calculateLetterPages", () => {
  it("does not overflow and only creates another page when required", () => {
    const pages = calculateLetterPages(["a", "bb", "ccc", "d"], (candidate) =>
      candidate.join("").length <= 3,
    );
    expect(pages).toEqual([["a", "bb"], ["ccc"], ["d"]]);
  });

  it("makes progress when a block requires a continuation split", () => {
    const pages = calculateLetterPages(["oversize"], () => false);
    expect(pages).toEqual([["oversize"]]);
  });
});

describe("packLessonBlocksExpanding", () => {
  const point = (id: string, paragraphs: string[], continuation = false): LessonPageBlock => ({
    type: "point",
    segment: {
      point: { id, heading: id, body: paragraphs.join("\n\n") },
      pointIndex: Number(id.replace(/\D/g, "") || 0),
      paragraphs,
      continuation,
    },
  });

  it("packs whole sections before splitting", () => {
    const blocks = [point("p1", ["a", "b"]), point("p2", ["c"]), { type: "summary" as const }];
    // Capacity: two whole sections, or one section + summary — not three blocks of chrome.
    const pages = packLessonBlocksExpanding(blocks, (candidate) => {
      const points = candidate.filter((b) => b.type === "point").length;
      const summary = candidate.some((b) => b.type === "summary");
      if (summary) return points <= 1;
      return points <= 2;
    });
    expect(pages).toEqual([
      [blocks[0], blocks[1]],
      [{ type: "summary" }],
    ]);
  });

  it("only atomizes a section when it overflows an empty page", () => {
    const oversized = point("p1", ["one", "two", "three"]);
    const pages = packLessonBlocksExpanding([oversized], (candidate) => {
      const segs = candidate.filter((b): b is Extract<LessonPageBlock, { type: "point" }> => b.type === "point");
      return segs.every((s) => s.segment.paragraphs.length <= 1) && segs.length <= 1;
    });
    expect(pages).toHaveLength(3);
    expect(pages.every((page) => page.length === 1)).toBe(true);
    expect(
      pages.map((page) => (page[0].type === "point" ? page[0].segment.paragraphs.join("") : "")),
    ).toEqual(["one", "two", "three"]);
  });

  it("fills the current page with a paragraph prefix before continuing", () => {
    const first = point("p1", ["short"]);
    const second = point("p2", ["a", "b", "c"]);
    const pages = packLessonBlocksExpanding([first, second], (candidate) => {
      const paras = candidate
        .filter((b): b is Extract<LessonPageBlock, { type: "point" }> => b.type === "point")
        .reduce((n, b) => n + b.segment.paragraphs.length, 0);
      return paras <= 2;
    });
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(2);
    expect(pages[0][0].type === "point" && pages[0][0].segment.paragraphs).toEqual(["short"]);
    expect(pages[0][1].type === "point" && pages[0][1].segment.paragraphs).toEqual(["a"]);
    expect(pages[1][0].type === "point" && pages[1][0].segment.continuation).toBe(true);
    expect(pages[1][0].type === "point" && pages[1][0].segment.paragraphs).toEqual(["b", "c"]);
  });
});

function baseDoc(over: Partial<EoschoolDocument> & { lesson: EoschoolDocument["lesson"] }): EoschoolDocument {
  return {
    format: "eoschool",
    version: 1,
    cycle: 3,
    week: 2,
    day: 1,
    level: 6,
    subject: "esp",
    locale: "es",
    title: "Tiempos verbales del indicativo",
    quiz: { questionCount: 0, questions: [] },
    ...over,
  };
}

describe("renderEoschoolPages pagination", () => {
  it("packs short intro sections onto one letter page when they fit", () => {
    const doc = baseDoc({
      lesson: {
        kind: "intro",
        focusPoint: null,
        points: [
          { id: "p1", heading: "Tiempos simples", body: "Lead.\n\nConsejo: practicar." },
          { id: "p2", heading: "Tiempos compuestos", body: "Lead dos." },
          { id: "p3", heading: "Uso", body: "Lead tres." },
        ],
        summary: "Resumen corto.",
      },
      quiz: {
        questionCount: 2,
        questions: [
          { id: "q1", originDay: 1, type: "mcq", prompt: "Q1?", choices: ["a", "b"], answer: "a" },
          { id: "q2", originDay: 1, type: "mcq", prompt: "Q2?", choices: ["a", "b"], answer: "b" },
        ],
      },
    });

    const pages = renderEoschoolPages(doc);
    const lessonPages = pages.filter((p) => p.classList.contains("homescool-letter-page--lesson"));
    expect(lessonPages).toHaveLength(1);
    expect(lessonPages[0].querySelectorAll(".homescool-letter__point")).toHaveLength(3);
    expect(lessonPages[0].querySelector(".homescool-letter__summary")).toBeTruthy();
    expect(pages.filter((p) => p.classList.contains("homescool-letter-page--quiz"))).toHaveLength(1);
  });

  it("opens a new page only when the next dense section no longer fits", () => {
    const dense = [
      "Idea central densa sobre el tema con bastante texto para llenar.",
      "Explora más detalles del punto con ejemplos y matices importantes.",
      "Contraste clave: opción A frente a opción B en el mismo marco.",
      "Consejo: repasa con calma y escribe tres oraciones propias.",
      "Error común: confundir las dos formas y mezclar desinencias.",
    ].join("\n\n");

    const doc = baseDoc({
      lesson: {
        kind: "intro",
        focusPoint: null,
        points: [
          { id: "p1", heading: "Uno", body: dense },
          { id: "p2", heading: "Dos", body: dense },
          { id: "p3", heading: "Tres", body: dense },
        ],
        summary: "Resumen final del día.",
      },
    });

    const pages = renderEoschoolPages(doc);
    const lessonPages = pages.filter((p) => p.classList.contains("homescool-letter-page--lesson"));
    // Three dense METHOD_V1 points do not share a single Letter sheet.
    expect(lessonPages.length).toBeGreaterThan(1);
    expect(lessonPages.length).toBeLessThan(4); // still packs when possible, not forced 1/page
    const badges = lessonPages.flatMap((p) =>
      [...p.querySelectorAll(".homescool-letter__point-badge")].map((b) => b.textContent?.trim()),
    );
    expect(new Set(badges)).toEqual(new Set(["1", "2", "3"]));
  });

  it("enumerates ciclo-semana-día-materia-página-nivel in each sheet header", () => {
    const dense = [
      "Idea central densa sobre el tema con bastante texto para llenar.",
      "Explora más detalles del punto con ejemplos y matices importantes.",
      "Contraste clave: opción A frente a opción B en el mismo marco.",
      "Consejo: repasa con calma y escribe tres oraciones propias.",
      "Error común: confundir las dos formas y mezclar desinencias.",
    ].join("\n\n");

    const doc = baseDoc({
      lesson: {
        kind: "intro",
        focusPoint: null,
        points: [
          { id: "p1", heading: "Uno", body: dense },
          { id: "p2", heading: "Dos", body: dense },
          { id: "p3", heading: "Tres", body: dense },
        ],
        summary: "Resumen.",
      },
      quiz: {
        questionCount: 1,
        questions: [
          { id: "q1", originDay: 1, type: "mcq", prompt: "Q?", choices: ["a", "b"], answer: "a" },
        ],
      },
    });

    const pages = renderEoschoolPages(doc);
    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((page, index) => {
      const meta = page.querySelector(".homescool-letter__meta")?.textContent || "";
      expect(meta).toContain(`c3 - s2 - d1 - esp - p${index + 1} - n6`);
    });
  });

  it("keeps deepen on a single lesson page", () => {
    const doc = baseDoc({
      lesson: {
        kind: "deepen",
        focusPoint: 1,
        points: [{ id: "p1", heading: "Foco", body: "Solo un punto." }],
        summary: "Ok.",
      },
    });
    const pages = renderEoschoolPages(doc);
    expect(pages.filter((p) => p.classList.contains("homescool-letter-page--lesson"))).toHaveLength(1);
  });

  it("keeps quiz and lesson headings free of decorative icon marks", () => {
    const doc = baseDoc({
      lesson: {
        kind: "intro",
        focusPoint: null,
        points: [
          {
            id: "p1",
            heading: "Uno",
            body: "Idea.\n\nConsejo: tip.\n\nError común: fallo.",
          },
        ],
        summary: "S.",
      },
      quiz: {
        questionCount: 1,
        questions: [
          { id: "q1", originDay: 1, type: "mcq", prompt: "Q?", choices: ["a", "b"], answer: "a" },
        ],
      },
    });
    const pages = renderEoschoolPages(doc);
    expect(pages.every((p) => p.querySelectorAll(".homescool-letter__icon").length === 0)).toBe(true);
    expect(pages.every((p) => p.querySelectorAll(".material-symbols-outlined").length === 0)).toBe(true);

    const quizPage = pages.find((p) => p.classList.contains("homescool-letter-page--quiz"));
    expect(quizPage?.querySelector(".homescool-letter__quiz-label")).toBeNull();
    expect(quizPage?.querySelector(".homescool-letter__heading")?.textContent).toContain("Tiempos");
    expect(quizPage?.querySelector(".homescool-letter__kicker")).toBeNull();
    // Single-line hero: number · tema · código (ciclo-semana-día-materia-página-nivel) + extras.
    const meta = quizPage?.querySelector(".homescool-letter__meta")?.textContent || "";
    expect(meta).toMatch(/c\d+ - s\d+ - d\d+ - esp - p\d+ - n\d+/);
    expect(meta).toMatch(/Cuestionario/i);
    expect(meta).toMatch(/Días/i);
    expect(quizPage?.querySelector(".homescool-letter__sub")).toBeNull();
    expect(quizPage?.querySelector(".homescool-letter__heading + .homescool-letter__sub")).toBeNull();
    // Number badge sits beside the prompt, not over it.
    const q = quizPage?.querySelector(".homescool-letter__q");
    expect(q?.querySelector(".homescool-letter__q-num")?.textContent).toBe("1");
    expect(q?.querySelector(".homescool-letter__q-head .homescool-letter__body")?.textContent).toMatch(/Q\?/);
    expect(q?.querySelector(".homescool-letter__q-head + .homescool-letter__choices-list")).toBeTruthy();
  });
});
