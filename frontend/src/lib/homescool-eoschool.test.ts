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
  it("stacks Idea, Explora, Práctica and Error full-width in reading order", () => {
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
        memoryPhrase: "**Sustantivo**, verbo, adjetivo",
      },
    });
    const pages = renderEoschoolPages(doc);
    expect(pages[0].querySelector(".homescool-letter__memory")).toBeTruthy();
    expect(pages[0].querySelector(".homescool-letter__key")?.textContent).toBe("Sustantivo");
    const rich = pages[0].querySelector(".homescool-letter__rich");
    expect(rich?.querySelector(".homescool-letter__box--lead")).toBeTruthy();
    expect(rich?.querySelector(".homescool-letter__box--card")).toBeTruthy();
    const practice = rich?.querySelector(".homescool-letter__box--practice");
    expect(practice).toBeTruthy();
    expect(practice?.querySelector(".homescool-letter__practice-workspace--write")).toBeTruthy();
    expect(rich?.querySelector(".homescool-letter__box--error")).toBeTruthy();
    expect(rich?.querySelector(".homescool-letter__lesson-row")).toBeFalsy();
    expect(pages[0].querySelector(".homescool-letter__point")?.className).not.toMatch(/border/);
  });

  it("renders Objetivos MPPE when mppe.objectives is set", () => {
    const doc = baseDoc({
      lesson: {
        kind: "intro",
        focusPoint: null,
        points: [
          { id: "p1", heading: "Panorama", body: "Idea.\n\nExplora.\n\nPráctica: hazlo.\n\nError común: saltar." },
          { id: "p2", heading: "Dos", body: "Idea dos." },
          { id: "p3", heading: "Tres", body: "Idea tres." },
        ],
        summary: "Cierre.",
      },
      mppe: {
        objectives: [{ id: "ide-ven-01", label: "Conozco estados y capitales." }],
      },
    });
    const pages = renderEoschoolPages(doc);
    const box = pages[0].querySelector(".homescool-letter__mppe");
    expect(box).toBeTruthy();
    expect(box?.textContent).toContain("Objetivos MPPE");
    expect(box?.textContent).toContain("ide-ven-01");
    expect(box?.textContent).toContain("Conozco estados y capitales.");
  });

  it("shows week and prior-day recaps on deepen days 3–4", () => {
    const doc = baseDoc({
      day: 3,
      lesson: {
        kind: "deepen",
        focusPoint: 2,
        points: [
          {
            id: "p1",
            heading: "Punto 2",
            body: [
              "Idea del día.",
              "## Más ejemplos",
              "Un ejemplo claro.",
              "Práctica: escribe uno.",
              "Error común: saltar el resumen.",
            ].join("\n\n"),
          },
        ],
        summary: "Cierre corto.",
        weekRecap: "Resumen de toda la semana en pocas líneas.",
        priorDayRecap: "Ayer vimos el punto 1.",
        memoryPhrase: "Lista corta a memorizar",
      },
    });
    const pages = renderEoschoolPages(doc);
    expect(pages[0].querySelector(".homescool-letter__memory")).toBeTruthy();
    expect(pages[0].querySelector(".homescool-letter__week-recap")).toBeTruthy();
    expect(pages[0].querySelector(".homescool-letter__prior-recap")).toBeTruthy();
    expect(pages[0].querySelector(".homescool-letter__subtitle")?.textContent).toBe("Más ejemplos");
  });

  it("gives drawing practices a blank draw workspace", () => {
    const doc = baseDoc({
      lesson: {
        kind: "intro",
        focusPoint: null,
        points: [
          {
            id: "p1",
            heading: "Panorama",
            body: ["Idea.", "Detalle.", "Práctica: dibuja un perfil.", "Error a corregir: omitir detalles."].join(
              "\n\n",
            ),
          },
        ],
        summary: "",
      },
    });
    const pages = renderEoschoolPages(doc);
    const practice = pages[0].querySelector(".homescool-letter__box--practice");
    expect(practice?.querySelector(".homescool-letter__practice-workspace--draw")).toBeTruthy();
  });

  it("attaches day-5 expo prep under the review lesson (not a separate page)", () => {
    const doc = baseDoc({
      day: 5,
      lesson: {
        kind: "review",
        focusPoint: null,
        points: [
          { id: "p1", heading: "Panorama", body: "Idea.\n\nExplora.\n\nPráctica: escribe.\n\nError común: saltar." },
          { id: "p2", heading: "Punto 1", body: "Repaso corto." },
          { id: "p3", heading: "Punto 2", body: "Repaso corto." },
          { id: "p4", heading: "Punto 3", body: "Repaso corto." },
          { id: "p5", heading: "Síntesis", body: "Cierre." },
        ],
        summary: "",
      },
    });
    const pages = renderEoschoolPages(doc);
    const lessonPages = pages.filter((p) => p.classList.contains("homescool-letter-page--lesson"));
    const withExpo = lessonPages.filter((p) => p.querySelector(".homescool-letter__expo-prep"));
    expect(withExpo.length).toBe(1);
    expect(withExpo[0].querySelectorAll(".homescool-letter__expo-prep-col").length).toBe(2);
    expect(pages.some((p) => p.classList.contains("homescool-letter-page--expo"))).toBe(false);
  });

  it("flows the lesson band as balanced CSS columns (height pinned for split)", () => {
    const doc = baseDoc({
      lesson: {
        kind: "intro",
        focusPoint: null,
        points: [
          {
            id: "p1",
            heading: "Materiales",
            body: [
              "Idea: persiste la visión.",
              "Práctica: dibuja las dos caras en el disco.",
              "Error común: desalineado.",
            ].join("\n\n"),
          },
          {
            id: "p2",
            heading: "Procedimiento",
            body: [
              "Idea: orden del giro.",
              "Práctica: anota los pasos.",
              "Error común: girar lento.",
            ].join("\n\n"),
          },
          {
            id: "p3",
            heading: "Por qué ocurre",
            body: [
              "Idea: el cerebro funde fases.",
              "Práctica: explica en tres frases.",
              "Error común: pensar que se mezclan tinta.",
            ].join("\n\n"),
          },
        ],
        summary: "El disco parece guiñar cuando gira rápido.",
      },
    });
    const pages = renderEoschoolPages(doc);
    const band = pages[0].querySelector<HTMLElement>(".homescool-letter__lesson-band");
    expect(band).toBeTruthy();
    expect(band?.querySelector(":scope > .homescool-letter__col--a")).toBeFalsy();
    expect(band?.style.height).toMatch(/px$/);
    expect(band?.querySelectorAll(".homescool-letter__point").length).toBe(3);
  });

  it("puts deepen class and quiz on one combo Letter page (lesson band + quiz band)", () => {
    const questions = Array.from({ length: 12 }, (_, i) => ({
      id: `q${i + 1}`,
      originDay: (i < 2 ? 1 : 3) as 1 | 3,
      type: (i < 8 ? "mcq" : "write") as "mcq" | "write",
      prompt: `Pregunta ${i + 1}?`,
      choices: i < 8 ? ["a", "b", "c", "d"] : undefined,
      answer: i < 8 ? "a" : undefined,
    }));
    const doc = baseDoc({
      day: 3,
      week: 1,
      lesson: {
        kind: "deepen",
        focusPoint: 2,
        points: [
          {
            id: "p1",
            heading: "adjetivo, artículo y adverbio",
            body: [
              "Idea central corta sobre adjetivos.",
              "Práctica: Ahora te toca a ti. Escribe cinco sustantivos.",
              "Error común: confundir adverbio con adjetivo.",
            ].join("\n\n"),
          },
        ],
        summary: "",
        weekRecap: "Resumen corto de la semana.",
        priorDayRecap: "Ayer vimos sustantivos.",
        memoryPhrase: "Sustantivo, verbo, adjetivo",
      },
      quiz: { questionCount: 12, questions },
    });
    const pages = renderEoschoolPages(doc);
    const combo = pages.find((p) => p.classList.contains("homescool-letter-page--combo"));
    expect(combo).toBeTruthy();
    expect(combo?.querySelector(".homescool-letter__lesson-band")).toBeTruthy();
    expect(combo?.querySelector(".homescool-letter__quiz-band")).toBeTruthy();
    const inlineQs = combo?.querySelectorAll(".homescool-letter__q").length ?? 0;
    expect(inlineQs).toBeGreaterThan(0);
    expect(inlineQs).toBeLessThanOrEqual(12);
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
    const combo = pages.find((p) => p.classList.contains("homescool-letter-page--combo"));
    expect(combo).toBeTruthy();
    expect(combo?.querySelectorAll(".homescool-letter__point")).toHaveLength(3);
    expect(combo?.querySelector(".homescool-letter__summary")).toBeTruthy();
    // Short quiz rides on the combo page; no leftover dedicated quiz sheet required.
    expect(combo?.querySelectorAll(".homescool-letter__q").length).toBe(2);
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
    // Dense intros either pack across sheets or (with 2-col) fit one combo page — never drop points.
    expect(lessonPages.length).toBeGreaterThanOrEqual(1);
    expect(lessonPages.length).toBeLessThan(4);
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
    expect(pages.length).toBeGreaterThanOrEqual(1);
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
    expect(
      pages.filter(
        (p) =>
          p.classList.contains("homescool-letter-page--lesson") &&
          !p.classList.contains("homescool-letter-page--practice-image"),
      ),
    ).toHaveLength(1);
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

    const host =
      pages.find((p) => p.classList.contains("homescool-letter-page--quiz")) ||
      pages.find((p) => p.classList.contains("homescool-letter-page--combo"));
    expect(host).toBeTruthy();
    expect(host?.querySelector(".homescool-letter__class-no")).toBeNull();
    expect(host?.querySelector(".homescool-letter__heading")?.textContent).toMatch(
      /^\d+ - .+ - .*Tiempos/,
    );
    expect(host?.querySelector(".homescool-letter__kicker")).toBeNull();
    const meta = host?.querySelector(".homescool-letter__meta")?.textContent || "";
    expect(meta).toMatch(/c\d+ - s\d+ - d\d+ - esp - p\d+ - n\d+/);
    const q = host?.querySelector(".homescool-letter__q");
    expect(q?.querySelector(".homescool-letter__q-num")?.textContent).toBe("1");
    expect(q?.querySelector(".homescool-letter__q-head .homescool-letter__body")?.textContent).toMatch(/Q\?/);
    expect(q?.querySelector(".homescool-letter__q-head + .homescool-letter__choices-list")).toBeTruthy();
    // Practice images never share the 4-col quiz sheet.
    expect(host?.querySelector(".homescool-letter__quiz-practice")).toBeFalsy();
  });

  it("puts the week-2 science practice illustration on its own Letter sheet", () => {
    const doc = baseDoc({
      subject: "cie",
      week: 2,
      day: 1,
      lesson: {
        kind: "intro",
        focusPoint: null,
        points: [{ id: "p1", heading: "Huesos", body: "Idea." }],
        summary: "",
      },
      quiz: {
        questionCount: 1,
        questions: [
          { id: "q1", originDay: 1, type: "mcq", prompt: "Q?", choices: ["a", "b"], answer: "a" },
        ],
      },
    });

    const pages = renderEoschoolPages(doc);
    const practicePage = pages.find((page) =>
      page.classList.contains("homescool-letter-page--practice-image"),
    );
    expect(practicePage).toBeTruthy();
    const image = practicePage?.querySelector<HTMLImageElement>(".homescool-letter__quiz-practice-image");
    expect(image?.src).toContain("/homescool/media/week2/practice-images/cie-c3-w2-practice.jpg");
    expect(image?.alt).toMatch(/esqueleto/i);
    expect(
      pages.some(
        (p) =>
          (p.classList.contains("homescool-letter-page--quiz") ||
            p.classList.contains("homescool-letter-page--combo")) &&
          p.querySelector(".homescool-letter__quiz-practice-image"),
      ),
    ).toBe(false);
  });

  it("resolves week-1 practice illustrations by subject convention", () => {
    const doc = baseDoc({
      subject: "geo",
      week: 1,
      day: 2,
      lesson: {
        kind: "deepen",
        focusPoint: null,
        points: [{ id: "p1", heading: "Límites", body: "Idea." }],
        summary: "",
      },
      quiz: {
        questionCount: 1,
        questions: [
          { id: "q1", originDay: 2, type: "mcq", prompt: "Q?", choices: ["a", "b"], answer: "a" },
        ],
      },
    });
    const pages = renderEoschoolPages(doc);
    const image = pages
      .find((page) => page.classList.contains("homescool-letter-page--practice-image"))
      ?.querySelector<HTMLImageElement>(".homescool-letter__quiz-practice-image");
    expect(image?.src).toContain("/homescool/media/week1/practice-images/geo-c3-w1-practice.jpg");
    expect(image?.alt).toMatch(/Venezuela/i);
  });
});
