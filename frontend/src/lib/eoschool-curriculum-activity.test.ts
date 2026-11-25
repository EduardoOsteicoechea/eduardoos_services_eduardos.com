import { describe, expect, it } from "vitest";
import { activityTaskCopy, paintCurriculumSubjectScores, setActivityMarks } from "./eoschool-curriculum-activity";

describe("activityTaskCopy", () => {
  it("starts at plan day 38 and gives Bible its own sheet", () => {
    expect(activityTaskCopy(37, "bib")).toBe("");
    expect(activityTaskCopy(38, "len")).toContain("preguntas");
    expect(activityTaskCopy(38, "bib")).toContain("pareo");
    expect(activityTaskCopy(38, "bib")).toContain("reflexión");
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
