/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { EoschoolDocument } from "./homescool";
import {
  classifyLessonParas,
  packLessonBatches,
  renderEoschoolPages,
} from "./homescool-eoschool";

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
    const pointCounts = lessonPages.map((p) => p.querySelectorAll(".homescool-letter__point").length);
    expect(pointCounts.reduce((a, b) => a + b, 0)).toBe(3);
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

  it("isolates icon ligatures from uppercase label text", () => {
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
    });
    const [page] = renderEoschoolPages(doc);
    const icon = page.querySelector(".homescool-letter__heading .homescool-letter__icon");
    expect(icon?.textContent).toBe("auto_stories");
    expect((icon as HTMLElement).style.textTransform).toBe("none");

    const labelText = page.querySelector(".homescool-letter__box-label-text");
    expect(labelText?.textContent).toMatch(/Idea central|Consejo|Error/i);
    expect(labelText?.previousElementSibling?.classList.contains("homescool-letter__icon")).toBe(true);
  });
});
