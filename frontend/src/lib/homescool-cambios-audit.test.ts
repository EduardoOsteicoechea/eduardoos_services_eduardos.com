/**
 * @vitest-environment jsdom
 *
 * Evidence gate for the 14 `cambios/` Homescool class-review items.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { EoschoolDocument } from "./homescool";
import { renderEoschoolPages } from "./homescool-eoschool";
import {
  HOMESCOOL_SUBJECTS,
  HOMESCOOL_SUBJECT_CLASS_NO,
  subjectClassNumber,
} from "./homescool-subjects";

const mediaRoot = path.resolve(__dirname, "../../public/homescool/media");

function loadPublishedDocs(): EoschoolDocument[] {
  const docs: EoschoolDocument[] = [];
  for (const week of ["week1", "week2"]) {
    const dir = path.join(mediaRoot, week);
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".eoschool.json")) continue;
      docs.push(JSON.parse(readFileSync(path.join(dir, name), "utf8")) as EoschoolDocument);
    }
  }
  return docs;
}

function pageHasLessonOrQuizOrSupportOrExpo(page: HTMLElement): boolean {
  // Support pages use tip box + support-link (not a dedicated __support root).
  return Boolean(
    page.querySelector(
      [
        ".homescool-letter__lesson-band",
        ".homescool-letter__quiz",
        ".homescool-letter__quiz-band",
        ".homescool-letter__quiz-wrap",
        ".homescool-letter__support-link",
        ".homescool-letter__expo-prep",
        ".homescool-letter__quiz-practice",
        ".homescool-letter-page--practice-image",
        ".homescool-mat__row",
        ".homescool-mat__table",
        ".homescool-mat__levels",
      ].join(","),
    ) || page.classList.contains("homescool-letter-page--support"),
  );
}

describe("cambios audit — published ciclo3 week1–2 pack", () => {
  const docs = loadPublishedDocs();

  it("publishes exactly 120 level-6 classes", () => {
    expect(docs).toHaveLength(120);
    expect(docs.every((d) => d.cycle === 3 && d.level === 6 && (d.week === 1 || d.week === 2))).toBe(
      true,
    );
  });

  it("uses canonical subject order teb…pro as 1–12", () => {
    expect([...HOMESCOOL_SUBJECTS]).toEqual([
      "teb",
      "exe",
      "LT",
      "his",
      "geo",
      "art",
      "mat",
      "esp",
      "ing",
      "lat",
      "cie",
      "pro",
    ]);
    expect(HOMESCOOL_SUBJECT_CLASS_NO.teb).toBe(1);
    expect(HOMESCOOL_SUBJECT_CLASS_NO.pro).toBe(12);
    expect(subjectClassNumber("cie")).toBe(11);
  });

  it("requires supportUrl on every class", () => {
    const missing = docs.filter((d) => !String(d.supportUrl || "").trim());
    expect(missing.map((d) => `${d.subject}-w${d.week}-d${d.day}`)).toEqual([]);
  });

  it("keeps teb classes with scripture or reformed citations", () => {
    const teb = docs.filter((d) => d.subject === "teb");
    expect(teb.length).toBeGreaterThan(0);
    const weak = teb.filter((d) => {
      const blob = JSON.stringify(d);
      return !/\b(Génesis|Genesis|Romanos|Juan|Salmo|Calvino|Berkhof|\d+:\d+)\b/i.test(blob);
    });
    expect(weak.map((d) => `w${d.week}-d${d.day}`)).toEqual([]);
  });

  it("avoids the forbidden colloquial tápate", () => {
    const hits = docs.flatMap((d) => {
      const blob = JSON.stringify(d);
      return /t[aá]pate/i.test(blob) ? [`${d.subject}-w${d.week}-d${d.day}`] : [];
    });
    expect(hits).toEqual([]);
  });

  it("keeps Explora paragraphs unique enough (no mass boilerplate)", () => {
    const exploraFreq = new Map<string, number>();
    for (const d of docs) {
      for (const p of d.lesson?.points || []) {
        const parts = String(p.body || "").split(/\n\n+/);
        const explora = (parts[1] || "").trim();
        if (!explora) continue;
        exploraFreq.set(explora, (exploraFreq.get(explora) || 0) + 1);
      }
    }
    const heavy = [...exploraFreq.entries()].filter(([, n]) => n >= 4).map(([t, n]) => `${n}× ${t.slice(0, 80)}`);
    expect(heavy).toEqual([]);
  });

  it("keeps Error común lines from mass-duplicating one phrase", () => {
    const errFreq = new Map<string, number>();
    for (const d of docs) {
      for (const p of d.lesson?.points || []) {
        const m = String(p.body || "").match(/Error común:\s*([^\n]+)/i);
        if (!m) continue;
        const e = m[1].trim();
        errFreq.set(e, (errFreq.get(e) || 0) + 1);
      }
    }
    const heavy = [...errFreq.entries()].filter(([, n]) => n >= 8).map(([t, n]) => `${n}× ${t}`);
    expect(heavy).toEqual([]);
  });

  it("renders every class without hero-only empty pages", () => {
    const empty: string[] = [];
    for (const d of docs) {
      const pages = renderEoschoolPages(d);
      expect(pages.length).toBeGreaterThan(0);
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]!;
        if (!pageHasLessonOrQuizOrSupportOrExpo(page)) {
          empty.push(`${d.subject}-w${d.week}-d${d.day}#${i + 1}`);
        }
      }
    }
    expect(empty).toEqual([]);
  }, 30_000);

  it("puts day-5 expo lined prep on the review lesson sheet", () => {
    const day5 = docs.filter((d) => d.day === 5 && d.subject !== "mat");
    const missing: string[] = [];
    for (const d of day5) {
      const pages = renderEoschoolPages(d);
      const hasExpo = pages.some((p) => p.querySelector(".homescool-letter__expo-prep"));
      if (!hasExpo) missing.push(`${d.subject}-w${d.week}-d5`);
    }
    expect(missing).toEqual([]);
  });

  it("renders practice check mark + reverse hint when practice blocks exist", () => {
    const withPractice = docs.filter((d) =>
      (d.lesson?.points || []).some((p) => /Práctica:|Practice:/i.test(p.body || "")),
    );
    // Ask-first classes no longer carry «Práctica:» paragraphs; the check only applies when present.
    const missing: string[] = [];
    for (const d of withPractice.slice(0, 40)) {
      const pages = renderEoschoolPages(d);
      const practice = pages.flatMap((p) => [...p.querySelectorAll(".homescool-letter__box--practice")]);
      if (!practice.length) continue;
      const ok = practice.every(
        (box) =>
          box.querySelector(".homescool-letter__practice-mark") &&
          /reverso/i.test(box.querySelector(".homescool-letter__practice-hint")?.textContent || ""),
      );
      if (!ok) missing.push(`${d.subject}-w${d.week}-d${d.day}`);
    }
    expect(missing).toEqual([]);
  });

  it("shuffles MCQ so answers are not stuck on printed A across the pack", () => {
    let aCount = 0;
    let total = 0;
    for (const d of docs) {
      const qs = d.quiz?.questions || [];
      const mcq = qs.filter((q) => (q.type || "mcq") === "mcq" && q.choices?.length && q.answer);
      if (!mcq.length) continue;
      const pages = renderEoschoolPages(d);
      const items = pages.flatMap((p) => [...p.querySelectorAll(".homescool-letter__q")]);
      for (const item of items) {
        const texts = [...item.querySelectorAll(".homescool-letter__choice-text")].map(
          (n) => n.textContent || "",
        );
        if (texts.length < 2) continue;
        const prompt = item.querySelector(".homescool-letter__body")?.textContent || "";
        const src = mcq.find((q) => q.prompt === prompt);
        if (!src?.answer) continue;
        total++;
        if (texts[0] === src.answer) aCount++;
      }
    }
    expect(total).toBeGreaterThan(100);
    // With a fair shuffle, ~25% land on A; allow headroom but forbid near-100%.
    expect(aCount / total).toBeLessThan(0.55);
  }, 30_000);
});
