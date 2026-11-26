/** Day cards keep their own content height. Clear any leftover equalized inline heights. */

function clearWeekHeights(weekDays: HTMLElement): void {
  const cards = weekDays.querySelectorAll<HTMLElement>(".eoschool-curriculum__day-card");
  for (const card of cards) {
    card.style.height = "";
    card.style.maxHeight = "";
  }
}

/** Drop equalized heights after subject or day expand/collapse. */
export function refreshCurriculumDayHeights(root: HTMLElement | null): void {
  if (!root || typeof window === "undefined") return;
  const weeks = root.querySelectorAll<HTMLElement>(".eoschool-curriculum__week-days");
  for (const week of weeks) clearWeekHeights(week);
}

export function initCurriculumDayHeights(root: HTMLElement | null): void {
  refreshCurriculumDayHeights(root);
}
