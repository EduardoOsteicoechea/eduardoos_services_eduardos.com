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

  it("opens only Biblia on day 5", () => {
    const root = rootWithWeeks();
    const week = root.querySelector<HTMLElement>('[data-week="7"]')!;
    const days = week.querySelector(".eoschool-curriculum__week-days");
    if (!days) throw new Error("missing days");
    days.innerHTML = `<article data-curriculum-day data-curriculum-day-kind="teach">
      <div data-curriculum-section>
        <button type="button" data-curriculum-subject-toggle aria-expanded="false">
          <span data-curriculum-subject-chevron>expand_more</span>
        </button>
        <div data-curriculum-subject-body hidden></div>
      </div>
    </article>
    <article data-curriculum-day data-curriculum-day-kind="exposition">
      <div data-curriculum-section="bib">
        <button type="button" data-curriculum-subject-toggle aria-expanded="false">
          <span data-curriculum-subject-chevron>expand_more</span>
        </button>
        <div data-curriculum-subject-body hidden></div>
      </div>
      <div data-curriculum-section="len">
        <button type="button" data-curriculum-subject-toggle aria-expanded="true">
          <span data-curriculum-subject-chevron>expand_less</span>
        </button>
        <div data-curriculum-subject-body></div>
      </div>
    </article>`;

    selectCurrentWeek(root, 7);

    const toggles = [...week.querySelectorAll("[data-curriculum-subject-toggle]")];
    expect(toggles[0]?.getAttribute("aria-expanded")).toBe("true");
    expect(toggles[1]?.getAttribute("aria-expanded")).toBe("true");
    expect(toggles[2]?.getAttribute("aria-expanded")).toBe("false");
    const expoBodies = [
      ...week.querySelectorAll<HTMLElement>('[data-curriculum-day-kind="exposition"] [data-curriculum-subject-body]'),
    ];
    expect(expoBodies[0]?.hidden).toBe(false);
    expect(expoBodies[1]?.hidden).toBe(true);
  });

  it("opens Biblia on day 5 when the card has no heading toggle", () => {
    const root = rootWithWeeks();
    const week = root.querySelector<HTMLElement>('[data-week="7"]')!;
    const days = week.querySelector(".eoschool-curriculum__week-days");
    if (!days) throw new Error("missing days");
    days.innerHTML = `<article data-curriculum-day data-curriculum-day-kind="teach">
      <div data-curriculum-section class="eoschool-curriculum__subject">
        <div data-curriculum-subject-body hidden></div>
      </div>
    </article>
    <article data-curriculum-day data-curriculum-day-kind="exposition">
      <div data-curriculum-section="bib" class="eoschool-curriculum__subject">
        <div data-curriculum-subject-body hidden></div>
      </div>
      <div data-curriculum-section="len" class="eoschool-curriculum__subject eoschool-curriculum__subject--open">
        <div data-curriculum-subject-body></div>
      </div>
    </article>`;

    selectCurrentWeek(root, 7);

    const teach = week.querySelector<HTMLElement>('[data-curriculum-day-kind="teach"] [data-curriculum-section]')!;
    const bible = week.querySelector<HTMLElement>('[data-curriculum-section="bib"]')!;
    const language = week.querySelector<HTMLElement>('[data-curriculum-section="len"]')!;
    expect(teach.classList.contains("eoschool-curriculum__subject--open")).toBe(true);
    expect(teach.querySelector<HTMLElement>("[data-curriculum-subject-body]")?.hidden).toBe(false);
    expect(bible.classList.contains("eoschool-curriculum__subject--open")).toBe(true);
    expect(bible.querySelector<HTMLElement>("[data-curriculum-subject-body]")?.hidden).toBe(false);
    expect(language.classList.contains("eoschool-curriculum__subject--open")).toBe(false);
    expect(language.querySelector<HTMLElement>("[data-curriculum-subject-body]")?.hidden).toBe(true);
  });

  it("falls back to the current week when the requested week is missing", () => {
    const root = rootWithWeeks();
    expect(selectCurrentWeek(root, 40)).toBe(DEFAULT_CURRENT_WEEK);
    expect(root.querySelector<HTMLInputElement>("[data-curriculum-week-current]:checked")?.value).toBe(
      String(DEFAULT_CURRENT_WEEK),
    );
  });
});

describe("initCurriculumWeekCollapse", () => {
  it("starts on the current week and switches with the radio", () => {
    const root = rootWithWeeks();
    initCurriculumWeekCollapse(root);
    expect(root.querySelector<HTMLInputElement>("[data-curriculum-week-current]:checked")?.value).toBe(
      String(DEFAULT_CURRENT_WEEK),
    );

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
