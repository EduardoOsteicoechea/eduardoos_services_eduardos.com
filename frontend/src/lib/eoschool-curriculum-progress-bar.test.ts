import { describe, expect, it } from "vitest";
import { paintWeekProgress } from "./eoschool-curriculum-progress";

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

  it("stays empty when the week has no sections", () => {
    const week = document.createElement("section");
    week.dataset.week = "1";
    week.innerHTML = `<div data-curriculum-week-progress><span data-curriculum-week-progress-fill></span></div>`;
    paintWeekProgress(week, 0, 0);
    expect(week.querySelector<HTMLElement>("[data-curriculum-week-progress-fill]")!.style.transform).toBe(
      "scaleX(0)",
    );
  });
});
