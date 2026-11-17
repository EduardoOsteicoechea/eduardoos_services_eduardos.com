/** Collapse/expand subject bodies on the curriculum day cards (start collapsed). */

import { refreshCurriculumDayHeights } from "./eoschool-curriculum-day-heights";

export function initCurriculumSubjectCollapse(root: HTMLElement | null): void {
  if (!root) return;
  if (root.dataset.subjectCollapseBound === "true") return;
  root.dataset.subjectCollapseBound = "true";

  root.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const toggle = target.closest<HTMLButtonElement>("[data-curriculum-subject-toggle]");
    if (!toggle || !root.contains(toggle)) return;

    ev.preventDefault();
    ev.stopPropagation();

    const subject = toggle.closest<HTMLElement>("[data-curriculum-section]");
    if (!subject) return;

    const body = subject.querySelector<HTMLElement>("[data-curriculum-subject-body]");
    if (!body) return;

    const open = toggle.getAttribute("aria-expanded") === "true";
    const nextOpen = !open;
    toggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    body.hidden = !nextOpen;
    subject.classList.toggle("eoschool-curriculum__subject--open", nextOpen);

    const chevron = toggle.querySelector<HTMLElement>("[data-curriculum-subject-chevron]");
    if (chevron) chevron.textContent = nextOpen ? "expand_less" : "expand_more";

    refreshCurriculumDayHeights(root);
  });
}
