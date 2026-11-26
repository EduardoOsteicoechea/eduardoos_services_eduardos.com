/** Collapse one day card. Incomplete days stay open until the control is used. */

import { refreshCurriculumDayHeights } from "./eoschool-curriculum-day-heights";

export function applyDayCollapsed(card: HTMLElement, collapsed: boolean): void {
  card.classList.toggle("eoschool-curriculum__day-card--collapsed", collapsed);
  const body = card.querySelector<HTMLElement>(".eoschool-curriculum__day-body");
  if (body) body.hidden = collapsed;
  const button = card.querySelector<HTMLButtonElement>("[data-curriculum-day-collapse]");
  const day = card.dataset.planDay || "";
  if (!button) return;
  button.setAttribute("aria-expanded", collapsed ? "false" : "true");
  const label = collapsed ? `Mostrar día ${day}` : `Colapsar día ${day}`;
  button.setAttribute("aria-label", label);
  button.title = label;
  const icon = button.querySelector(".material-symbols-outlined");
  if (icon) icon.textContent = collapsed ? "expand_more" : "expand_less";
}

export function initCurriculumDayCollapse(root: HTMLElement | null): void {
  if (!root || root.dataset.dayCollapseBound === "true") return;
  root.dataset.dayCollapseBound = "true";
  root.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("[data-curriculum-day-collapse]");
    if (!button || !root.contains(button)) return;
    const card = button.closest<HTMLElement>("[data-curriculum-day]");
    if (!card) return;
    ev.preventDefault();
    ev.stopPropagation();
    applyDayCollapsed(card, !card.classList.contains("eoschool-curriculum__day-card--collapsed"));
    refreshCurriculumDayHeights(root);
  });
}
