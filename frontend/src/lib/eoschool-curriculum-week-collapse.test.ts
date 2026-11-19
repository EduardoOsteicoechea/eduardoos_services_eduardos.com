import { describe, expect, it } from "vitest";
import {
  applyWeekCollapsed,
  initCurriculumWeekCollapse,
  syncCompletedWeekCollapse,
} from "./eoschool-curriculum-week-collapse";

function weekMarkup(week: number, done = false): string {
  return `<section class="eoschool-curriculum__week${done ? " eoschool-curriculum__week--done" : ""}" data-curriculum-week="w${week}" data-week="${week}">
    <button type="button" data-curriculum-week-toggle aria-expanded="true" aria-label="Contraer semana ${week}">
      <span data-curriculum-week-chevron>expand_less</span>
    </button>
    <div class="eoschool-curriculum__week-days"></div>
  </section>`;
}

describe("syncCompletedWeekCollapse", () => {
  it("collapses completed weeks and leaves the rest open", () => {
    const root = document.createElement("div");
    root.innerHTML = weekMarkup(1, true) + weekMarkup(2, false);
    syncCompletedWeekCollapse(root);

    const weeks = [...root.querySelectorAll<HTMLElement>("[data-curriculum-week]")];
    expect(weeks[0].classList.contains("eoschool-curriculum__week--collapsed")).toBe(true);
    expect(weeks[0].querySelector<HTMLElement>(".eoschool-curriculum__week-days")?.hidden).toBe(true);
    expect(weeks[0].querySelector("[data-curriculum-week-toggle]")?.getAttribute("aria-expanded")).toBe("false");
    expect(weeks[0].querySelector("[data-curriculum-week-chevron]")?.textContent).toBe("expand_more");

    expect(weeks[1].classList.contains("eoschool-curriculum__week--collapsed")).toBe(false);
    expect(weeks[1].querySelector<HTMLElement>(".eoschool-curriculum__week-days")?.hidden).toBe(false);
  });

  it("keeps a manual pin over the completed default", () => {
    const root = document.createElement("div");
    root.innerHTML = weekMarkup(3, true);
    const week = root.querySelector<HTMLElement>("[data-curriculum-week]")!;
    week.dataset.weekCollapseUser = "open";
    syncCompletedWeekCollapse(root);
    expect(week.classList.contains("eoschool-curriculum__week--collapsed")).toBe(false);
  });
});

describe("initCurriculumWeekCollapse", () => {
  it("toggles from the week rail and pins the choice", () => {
    const root = document.createElement("div");
    root.innerHTML = weekMarkup(4, false);
    initCurriculumWeekCollapse(root);
    const toggle = root.querySelector<HTMLButtonElement>("[data-curriculum-week-toggle]")!;
    toggle.click();

    const week = root.querySelector<HTMLElement>("[data-curriculum-week]")!;
    expect(week.classList.contains("eoschool-curriculum__week--collapsed")).toBe(true);
    expect(week.dataset.weekCollapseUser).toBe("closed");
    expect(toggle.getAttribute("aria-label")).toBe("Expandir semana 4");

    toggle.click();
    expect(week.classList.contains("eoschool-curriculum__week--collapsed")).toBe(false);
    expect(week.dataset.weekCollapseUser).toBe("open");
  });
});

describe("applyWeekCollapsed", () => {
  it("sets the expand label when collapsed", () => {
    const root = document.createElement("div");
    root.innerHTML = weekMarkup(8, true);
    const week = root.querySelector<HTMLElement>("[data-curriculum-week]")!;
    applyWeekCollapsed(week, true);
    expect(week.querySelector("[data-curriculum-week-toggle]")?.getAttribute("aria-label")).toBe(
      "Expandir semana 8",
    );
  });
});
