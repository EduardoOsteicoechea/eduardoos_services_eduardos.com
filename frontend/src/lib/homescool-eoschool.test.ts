/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import type { EoschoolDocument } from "./homescool";
import { classifyLessonParas, renderEoschoolPages } from "./homescool-eoschool";

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
  it("splits intro lessons with 3 points into 3 letter pages (+ quiz)", () => {
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
    expect(pages).toHaveLength(4); // 3 lesson + 1 quiz
    expect(pages.every((p) => p.classList.contains("homescool-letter-page"))).toBe(true);
    expect(pages.filter((p) => p.classList.contains("homescool-letter-page--lesson"))).toHaveLength(3);
    expect(pages.filter((p) => p.classList.contains("homescool-letter-page--quiz"))).toHaveLength(1);

    const lastLesson = pages[2];
    expect(lastLesson.querySelector(".homescool-letter__summary")).toBeTruthy();
    expect(pages[0].querySelector(".homescool-letter__summary")).toBeNull();
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
