import { describe, expect, it } from "vitest";
import { applyDayCollapsed, initCurriculumDayCollapse } from "./eoschool-curriculum-day-collapse";

function dayCard(planDay: string, done = false): string {
  return `<article class="eoschool-curriculum__day-card${done ? " eoschool-curriculum__day-card--done" : ""}" data-curriculum-day="d${planDay}" data-plan-day="${planDay}">
    <button type="button" data-curriculum-day-collapse aria-expanded="true" aria-label="Colapsar día ${planDay}">
      <span class="material-symbols-outlined">expand_less</span>
    </button>
    <div class="eoschool-curriculum__day-body">materia</div>
  </article>`;
}

describe("day collapse", () => {
  it("leaves incomplete days open", () => {
    const root = document.createElement("div");
    root.innerHTML = dayCard("39");
    initCurriculumDayCollapse(root);
    const card = root.querySelector<HTMLElement>("[data-curriculum-day]")!;
    const body = card.querySelector<HTMLElement>(".eoschool-curriculum__day-body")!;
    expect(card.classList.contains("eoschool-curriculum__day-card--collapsed")).toBe(false);
    expect(body.hidden).toBe(false);
  });

  it("collapses and reopens that day from the control", () => {
    const root = document.createElement("div");
    root.innerHTML = dayCard("39");
    initCurriculumDayCollapse(root);
    const button = root.querySelector<HTMLButtonElement>("[data-curriculum-day-collapse]")!;
    button.click();
    const card = root.querySelector<HTMLElement>("[data-curriculum-day]")!;
    const body = card.querySelector<HTMLElement>(".eoschool-curriculum__day-body")!;
    expect(card.classList.contains("eoschool-curriculum__day-card--collapsed")).toBe(true);
    expect(body.hidden).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.querySelector(".material-symbols-outlined")?.textContent).toBe("expand_more");
    button.click();
    expect(card.classList.contains("eoschool-curriculum__day-card--collapsed")).toBe(false);
    expect(body.hidden).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("does not collapse a finished day until the control is used", () => {
    const card = document.createElement("article");
    card.className = "eoschool-curriculum__day-card eoschool-curriculum__day-card--done";
    card.dataset.planDay = "38";
    card.innerHTML = `<button type="button" data-curriculum-day-collapse aria-expanded="true"><span class="material-symbols-outlined">expand_less</span></button><div class="eoschool-curriculum__day-body"></div>`;
    applyDayCollapsed(card, false);
    expect(card.classList.contains("eoschool-curriculum__day-card--collapsed")).toBe(false);
    expect(card.querySelector<HTMLElement>(".eoschool-curriculum__day-body")?.hidden).toBe(false);
  });
});
