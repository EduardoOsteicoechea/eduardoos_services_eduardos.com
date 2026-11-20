import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENT_WEEK,
  initCurriculumWeekCollapse,
  selectCurrentWeek,
} from "./eoschool-curriculum-week-collapse";

function weekMarkup(week: number): string {
  return `<section class="eoschool-curriculum__week" data-curriculum-week="w${week}" data-week="${week}">
    <input type="radio" name="eoschool-current-week" value="${week}" data-curriculum-week-current />
    <div class="eoschool-curriculum__week-days"></div>
  </section>`;
}

function rootWithWeeks(): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = [1, 7, 8].map(weekMarkup).join("");
  return root;
}

beforeEach(() => {
  localStorage.clear();
});

describe("selectCurrentWeek", () => {
  it("expands only the chosen week", () => {
    const root = rootWithWeeks();
    expect(selectCurrentWeek(root, 7)).toBe(7);

    const weeks = [...root.querySelectorAll<HTMLElement>("[data-curriculum-week]")];
    expect(weeks.map((week) => week.classList.contains("eoschool-curriculum__week--collapsed"))).toEqual([
      true,
      false,
      true,
    ]);
    expect(weeks[1].getAttribute("aria-current")).toBe("true");
    expect(weeks[0].hasAttribute("aria-current")).toBe(false);
    expect(weeks[1].querySelector<HTMLElement>(".eoschool-curriculum__week-days")?.hidden).toBe(false);
    expect(weeks[0].querySelector<HTMLElement>(".eoschool-curriculum__week-days")?.hidden).toBe(true);
    expect(root.querySelectorAll<HTMLInputElement>("[data-curriculum-week-current]:checked")).toHaveLength(1);
    expect(root.querySelector<HTMLInputElement>("[data-curriculum-week-current]:checked")?.value).toBe("7");
  });

  it("opens subject bodies on the current week", () => {
    const root = rootWithWeeks();
    const week = root.querySelector<HTMLElement>('[data-week="7"]')!;
    const days = week.querySelector(".eoschool-curriculum__week-days");
    if (!days) throw new Error("missing days");
    days.innerHTML = `<div data-curriculum-section>
      <button type="button" data-curriculum-subject-toggle aria-expanded="false">
        <span data-curriculum-subject-chevron>expand_more</span>
      </button>
      <div data-curriculum-subject-body hidden></div>
    </div>`;

    selectCurrentWeek(root, 7);

    expect(week.querySelector("[data-curriculum-subject-toggle]")?.getAttribute("aria-expanded")).toBe("true");
    expect(week.querySelector<HTMLElement>("[data-curriculum-subject-body]")?.hidden).toBe(false);
    expect(week.querySelector("[data-curriculum-subject-chevron]")?.textContent).toBe("expand_less");
  });

  it("falls back to week 7 when the requested week is missing", () => {
    const root = rootWithWeeks();
    expect(selectCurrentWeek(root, 40)).toBe(DEFAULT_CURRENT_WEEK);
    expect(root.querySelector<HTMLInputElement>("[data-curriculum-week-current]:checked")?.value).toBe("7");
  });
});

describe("initCurriculumWeekCollapse", () => {
  it("starts on week 7 and switches with the radio", () => {
    const root = rootWithWeeks();
    initCurriculumWeekCollapse(root);
    expect(root.querySelector<HTMLInputElement>("[data-curriculum-week-current]:checked")?.value).toBe("7");

    const week1 = root.querySelector<HTMLInputElement>('[data-curriculum-week-current][value="1"]')!;
    week1.checked = true;
    week1.dispatchEvent(new Event("change", { bubbles: true }));

    expect(root.querySelector('[data-week="1"]')?.classList.contains("eoschool-curriculum__week--collapsed")).toBe(
      false,
    );
    expect(root.querySelector('[data-week="7"]')?.classList.contains("eoschool-curriculum__week--collapsed")).toBe(
      true,
    );
    expect(localStorage.getItem("eoschool-curriculum-current-week")).toBe("1");
  });

  it("restores the stored current week", () => {
    localStorage.setItem("eoschool-curriculum-current-week", "8");
    const root = rootWithWeeks();
    initCurriculumWeekCollapse(root);
    expect(root.querySelector<HTMLInputElement>("[data-curriculum-week-current]:checked")?.value).toBe("8");
    expect(root.querySelector('[data-week="7"]')?.classList.contains("eoschool-curriculum__week--collapsed")).toBe(
      true,
    );
  });
});
