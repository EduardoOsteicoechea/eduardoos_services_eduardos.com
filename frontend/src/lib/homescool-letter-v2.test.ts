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
    expect(page.textContent || "").toMatch(/Fecha:/);
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
});
