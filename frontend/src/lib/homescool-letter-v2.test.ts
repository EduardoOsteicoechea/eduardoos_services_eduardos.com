/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { EoschoolDocument } from "./homescool";
import { renderEoschoolPages } from "./homescool-eoschool";
import { hasLetterV2Slots, renderLetterV2Page } from "./homescool-letter-v2";

function loadEspD2(): EoschoolDocument {
  const path = resolve(
    process.cwd(),
    "public/homescool/media/week1/esp-c3-w1-d2-l6.eoschool.json",
  );
  return JSON.parse(readFileSync(path, "utf8")) as EoschoolDocument;
}

describe("Letter v2 viewer", () => {
  it("draws 52 lines × 3 columns for a published slotSequence class", () => {
    const doc = loadEspD2();
    expect(hasLetterV2Slots(doc)).toBe(true);
    const page = renderLetterV2Page(doc);
    expect(page.querySelectorAll(".homescool-letter-v2__col")).toHaveLength(3);
    expect(page.querySelectorAll(".homescool-letter-v2__line")).toHaveLength(156);
    expect(page.querySelector(".homescool-letter-v2__field--date")?.textContent).toBe("Fecha:");
    expect(page.querySelector(".homescool-letter-v2__field--student")?.textContent).toBe(
      "Estudiante:",
    );
    expect(page.querySelector(".homescool-letter-v2__field--reviewer")?.textContent).toBe(
      "Revisor:",
    );
    expect(page.querySelector(".homescool-letter-v2__field--firma")?.textContent).toBe("Firma:");
    expect(page.textContent || "").toMatch(/Punto 1/);
  });

  it("falls back to the legacy viewer without slotSequence", () => {
    const doc = loadEspD2();
    delete doc.lesson.slotSequence;
    expect(hasLetterV2Slots(doc)).toBe(false);
    const pages = renderEoschoolPages(doc);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0]!.classList.contains("homescool-letter-v2")).toBe(false);
  });

  it("keeps Spanish accents on esp and English frame on ing", () => {
    const esp = loadEspD2();
    const espPage = renderLetterV2Page(esp);
    expect(espPage.textContent || "").toContain("¿Qué aprendiste la clase pasada?");
    expect(espPage.textContent || "").toMatch(/Punto 1:.*clase pasada/);

    const ingPath = resolve(
      process.cwd(),
      "public/homescool/media/week1/ing-c3-w1-d1-l6.eoschool.json",
    );
    const ing = JSON.parse(readFileSync(ingPath, "utf8")) as EoschoolDocument;
    const pages = renderEoschoolPages(ing);
    expect(pages).toHaveLength(1);
    const text = pages[0]!.textContent || "";
    expect(text).toContain("What did you learn in the last class?");
    expect(text).toContain("Point 1: Review of the last class");
    expect(text).toContain("Write here what you learned:");
    expect(pages[0]!.querySelector(".homescool-letter-v2__practice")?.getAttribute("src")).toContain(
      "ing-c3-w1-d1-practice.jpg",
    );
  });
});
