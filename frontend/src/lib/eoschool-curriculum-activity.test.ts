import { describe, expect, it } from "vitest";
import {
  activityPhotoNames,
  activityTaskCopy,
  paintCurriculumSubjectScores,
  renderCurriculumActivity,
  setActivityMarks,
} from "./eoschool-curriculum-activity";

describe("activityTaskCopy", () => {
  it("starts at plan day 38 without instruction text", () => {
    expect(activityTaskCopy(37, "bib")).toBe("");
    expect(activityTaskCopy(38, "len")).toBe("");
    expect(activityTaskCopy(38, "bib")).toBe("");
  });
});

describe("activity photos", () => {
  it("keeps every uploaded image for the subject", () => {
    setActivityMarks({}, ["d38:len"], { "d38:len": ["p0123456789abcdef.webp", "pabcdef0123456789.webp"] });
    expect(activityPhotoNames("d38:len")).toEqual(["p0123456789abcdef.webp", "pabcdef0123456789.webp"]);
  });
});

describe("activity thumbnails", () => {
  it("draws a small frame and a delete control on each photo", () => {
    const modal = document.createElement("div");
    modal.innerHTML = `<div data-curriculum-activity hidden></div>`;
    const card = document.createElement("article");
    card.dataset.planDay = "38";
    card.dataset.curriculumDay = "d38";
    setActivityMarks({}, ["d38:eng"], { "d38:eng": ["p0123456789abcdef.webp"] });
    renderCurriculumActivity(modal, card, "eng");
    const thumb = modal.querySelector<HTMLElement>(".eoschool-curriculum-activity__thumb");
    const img = modal.querySelector<HTMLImageElement>(".eoschool-curriculum-activity__preview");
    const remove = modal.querySelector<HTMLButtonElement>(".eoschool-curriculum-activity__remove");
    expect(thumb).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("name=p0123456789abcdef.webp");
    expect(remove?.getAttribute("aria-label")).toBe("Borrar foto");
    expect(remove?.querySelector(".material-symbols-outlined")?.textContent).toBe("delete");
    const score = modal.querySelector(".eoschool-curriculum-activity__score");
    expect(score?.textContent).toContain("Puntaje");
    expect(score?.querySelector("input[type='number']")).not.toBeNull();
  });
});

describe("score reason", () => {
  it("opens the saved justification", () => {
    const modal = document.createElement("div");
    modal.innerHTML = `<div data-curriculum-activity hidden></div>`;
    const card = document.createElement("article");
    card.dataset.planDay = "38";
    card.dataset.curriculumDay = "d38";
    setActivityMarks({ "d38:cie": 89 }, [], undefined, {
      "d38:cie": "El grupo del queso es lácteos.",
    });
    renderCurriculumActivity(modal, card, "cie");
    const why = modal.querySelector<HTMLButtonElement>("[data-curriculum-score-why]");
    expect(why?.textContent).toBe("Por qué");
    why?.click();
    const text = modal.querySelector("[data-curriculum-score-reason-text]");
    expect(text?.textContent).toBe("El grupo del queso es lácteos.");
  });
});

describe("paintCurriculumSubjectScores", () => {
  it("writes the saved score on the subject", () => {
    const root = document.createElement("div");
    root.innerHTML = `<article data-curriculum-day="d38"><div data-curriculum-section="len"><span data-curriculum-subject-score hidden></span></div></article>`;
    setActivityMarks({ "d38:len": 80 }, ["d38:len"]);
    paintCurriculumSubjectScores(root);
    const span = root.querySelector<HTMLElement>("[data-curriculum-subject-score]")!;
    expect(span.hidden).toBe(false);
    expect(span.textContent).toBe("80");
    expect(span.getAttribute("aria-label")).toBe("Puntaje 80");
  });
});
