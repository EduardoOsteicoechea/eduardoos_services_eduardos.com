/** Collapse completed curriculum weeks; the week rail toggle overrides that default. */

import { refreshCurriculumDayHeights } from "./eoschool-curriculum-day-heights";

function weekLabel(week: HTMLElement, collapsed: boolean): string {
  const n = week.dataset.week || "";
  return collapsed ? `Expandir semana ${n}` : `Contraer semana ${n}`;
}

export function applyWeekCollapsed(week: HTMLElement, collapsed: boolean): void {
  week.classList.toggle("eoschool-curriculum__week--collapsed", collapsed);
  const days = week.querySelector<HTMLElement>(".eoschool-curriculum__week-days");
  if (days) days.hidden = collapsed;

  const toggle = week.querySelector<HTMLButtonElement>("[data-curriculum-week-toggle]");
  if (!toggle) return;
  const label = weekLabel(week, collapsed);
  toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  toggle.title = label;
  toggle.setAttribute("aria-label", label);
  const chevron = toggle.querySelector<HTMLElement>("[data-curriculum-week-chevron]");
  if (chevron) chevron.textContent = collapsed ? "expand_more" : "expand_less";
}

/** Completed weeks start collapsed unless the rail toggle pinned them open or closed. */
export function syncCompletedWeekCollapse(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("[data-curriculum-week]").forEach((week) => {
    const pin = week.dataset.weekCollapseUser;
    const complete = week.classList.contains("eoschool-curriculum__week--done");
    const collapsed = pin === "open" ? false : pin === "closed" ? true : complete;
    applyWeekCollapsed(week, collapsed);
  });
}

export function initCurriculumWeekCollapse(root: HTMLElement | null): void {
  if (!root) return;
  if (root.dataset.weekCollapseBound === "true") return;
  root.dataset.weekCollapseBound = "true";

  root.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const toggle = target.closest<HTMLButtonElement>("[data-curriculum-week-toggle]");
    if (!toggle || !root.contains(toggle)) return;

    ev.preventDefault();
    ev.stopPropagation();

    const week = toggle.closest<HTMLElement>("[data-curriculum-week]");
    if (!week) return;

    const collapsed = !week.classList.contains("eoschool-curriculum__week--collapsed");
    week.dataset.weekCollapseUser = collapsed ? "closed" : "open";
    applyWeekCollapsed(week, collapsed);
    refreshCurriculumDayHeights(root);
  });
}
