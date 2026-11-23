/** Collapse/expand subject bodies on the curriculum day cards. */

import { refreshCurriculumDayHeights } from "./eoschool-curriculum-day-heights";

export function setCurriculumSubjectOpen(subject: HTMLElement, open: boolean): void {
  const body = subject.querySelector<HTMLElement>("[data-curriculum-subject-body]");
  if (!body) return;
  const toggle = subject.querySelector<HTMLButtonElement>("[data-curriculum-subject-toggle]");
  if (toggle) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    const chevron = toggle.querySelector<HTMLElement>("[data-curriculum-subject-chevron]");
    if (chevron) chevron.textContent = open ? "expand_less" : "expand_more";
  }
  body.hidden = !open;
  subject.classList.toggle("eoschool-curriculum__subject--open", open);
}

/** Open teach-day subjects. On day 5 only Biblia starts open. */
export function expandWeekSubjects(week: HTMLElement): void {
  week.querySelectorAll<HTMLElement>("[data-curriculum-section]").forEach((subject) => {
    const day = subject.closest<HTMLElement>("[data-curriculum-day]");
    const exposition = day?.dataset.curriculumDayKind === "exposition";
    const open = exposition ? subject.dataset.curriculumSection === "bib" : true;
    setCurriculumSubjectOpen(subject, open);
  });
}

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
    const day = subject.closest<HTMLElement>("[data-curriculum-day]");
    if (day?.dataset.curriculumDayKind === "exposition" && subject.dataset.curriculumSection === "bib") {
      setCurriculumSubjectOpen(subject, true);
      return;
    }

    const body = subject.querySelector<HTMLElement>("[data-curriculum-subject-body]");
    if (!body) return;

    const nextOpen = toggle.getAttribute("aria-expanded") !== "true";
    setCurriculumSubjectOpen(subject, nextOpen);

    refreshCurriculumDayHeights(root);
  });
}
