/** Only the current curriculum week stays expanded. A radio picks that week. */

import { refreshCurriculumDayHeights } from "./eoschool-curriculum-day-heights";

export const DEFAULT_CURRENT_WEEK = 7;
const STORAGE_KEY = "eoschool-curriculum-current-week";

function weeksIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("[data-curriculum-week]")];
}

function readStoredWeek(): number | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeStoredWeek(week: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(week));
  } catch {
    /* private mode */
  }
}

export function applyWeekCollapsed(week: HTMLElement, collapsed: boolean): void {
  week.classList.toggle("eoschool-curriculum__week--collapsed", collapsed);
  week.classList.toggle("eoschool-curriculum__week--current", !collapsed);
  if (collapsed) week.removeAttribute("aria-current");
  else week.setAttribute("aria-current", "true");

  const days = week.querySelector<HTMLElement>(".eoschool-curriculum__week-days");
  if (days) days.hidden = collapsed;

  const radio = week.querySelector<HTMLInputElement>("[data-curriculum-week-current]");
  if (radio) radio.checked = !collapsed;
}

/** Expand exactly one week and collapse the rest into horizontal bars. */
export function selectCurrentWeek(root: HTMLElement, weekNumber: number): number {
  const weeks = weeksIn(root);
  const numbers = weeks
    .map((week) => Number(week.dataset.week))
    .filter((n) => Number.isFinite(n) && n > 0);
  const target = numbers.includes(weekNumber)
    ? weekNumber
    : numbers.includes(DEFAULT_CURRENT_WEEK)
      ? DEFAULT_CURRENT_WEEK
      : (numbers[0] ?? DEFAULT_CURRENT_WEEK);

  for (const week of weeks) {
    applyWeekCollapsed(week, Number(week.dataset.week) !== target);
  }
  writeStoredWeek(target);
  return target;
}

export function initCurriculumWeekCollapse(root: HTMLElement | null): void {
  if (!root) return;

  const stored = readStoredWeek();
  selectCurrentWeek(root, stored ?? DEFAULT_CURRENT_WEEK);

  if (root.dataset.weekCollapseBound === "true") return;
  root.dataset.weekCollapseBound = "true";

  root.addEventListener("change", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-curriculum-week-current]")) return;
    if (!root.contains(target)) return;
    const week = Number(target.value);
    selectCurrentWeek(root, week);
    refreshCurriculumDayHeights(root);
    const current = target.closest<HTMLElement>("[data-curriculum-week]");
    if (current && typeof current.scrollIntoView === "function") {
      current.scrollIntoView({ block: "nearest" });
    }
  });
}
