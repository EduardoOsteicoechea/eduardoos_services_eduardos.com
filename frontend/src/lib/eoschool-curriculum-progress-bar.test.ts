import { describe, expect, it } from "vitest";
import { paintDayProgress, paintSubjectProgress, paintWeekProgress } from "./eoschool-curriculum-progress";

describe("paintWeekProgress", () => {
  it("fills the bar from completed sections", () => {
    const week = document.createElement("section");
    week.dataset.week = "7";
    week.innerHTML = `<div data-curriculum-week-progress role="progressbar" aria-valuenow="0">
      <span data-curriculum-week-progress-fill></span>
    </div>`;
    paintWeekProgress(week, 1, 4);
    const fill = week.querySelector<HTMLElement>("[data-curriculum-week-progress-fill]")!;
    const bar = week.querySelector<HTMLElement>("[data-curriculum-week-progress]")!;
    expect(fill.style.transform).toBe("scaleX(0.25)");
    expect(bar.getAttribute("aria-valuenow")).toBe("25");
    expect(bar.getAttribute("aria-label")).toBe("Progreso de la semana 7: 1 de 4");
  });

  it("marks an open subject yellow at 10% and a checked one complete", () => {
    const section = document.createElement("div");
    section.innerHTML = `<div data-curriculum-subject-progress role="progressbar" aria-valuenow="10" aria-label="Progreso de Biblia"></div>`;
    paintSubjectProgress(section, false);
    const bar = section.querySelector<HTMLElement>("[data-curriculum-subject-progress]")!;
    expect(bar.getAttribute("aria-valuenow")).toBe("10");
    expect(bar.getAttribute("aria-label")).toBe("Progreso de Biblia: pendiente");
    paintSubjectProgress(section, true);
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(bar.getAttribute("aria-label")).toBe("Progreso de Biblia: completada");
  });

  it("stays empty when the week has no sections", () => {
    const week = document.createElement("section");
    week.dataset.week = "1";
    week.innerHTML = `<div data-curriculum-week-progress><span data-curriculum-week-progress-fill></span></div>`;
    paintWeekProgress(week, 0, 0);
    expect(week.querySelector<HTMLElement>("[data-curriculum-week-progress-fill]")!.style.transform).toBe(
      "scaleX(0)",
    );
  });

  it("fills the day bubble as subjects are checked", () => {
    const card = document.createElement("article");
    card.dataset.planDay = "38";
    card.innerHTML = `<button data-curriculum-day-bubble><span data-curriculum-day-bubble-fill role="progressbar"></span></button>`;
    paintDayProgress(card, 3, 6);
    const fill = card.querySelector<HTMLElement>("[data-curriculum-day-bubble-fill]")!;
    expect(fill.style.height).toBe("50%");
    expect(fill.getAttribute("aria-valuenow")).toBe("50");
    expect(fill.getAttribute("aria-label")).toBe("Progreso del día 38: 3 de 6");
  });
});
