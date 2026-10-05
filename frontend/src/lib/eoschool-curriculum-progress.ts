import { CURRICULUM_SECTION_IDS, type CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";

const SECTIONS_STORAGE_KEY = "eoschool-curriculum-sections-done";

function readSectionsDone(): Set<string> {
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeSectionsDone(done: Set<string>): void {
  try {
    localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify([...done]));
  } catch {
    /* ignore */
  }
}

export function sectionProgressKey(dayId: string, sectionId: CurriculumPlanSectionId): string {
  return `${dayId}:${sectionId}`;
}

function daysInWeek(weekEl: HTMLElement): HTMLElement[] {
  return [...weekEl.querySelectorAll<HTMLElement>("[data-curriculum-day]")];
}

function dayComplete(dayId: string, done: Set<string>): boolean {
  return CURRICULUM_SECTION_IDS.every((sectionId) => done.has(sectionProgressKey(dayId, sectionId)));
}

function applyProgress(root: HTMLElement, done: Set<string>): void {
  root.querySelectorAll<HTMLElement>("[data-curriculum-day]").forEach((card) => {
    const dayId = card.dataset.curriculumDay;
    if (!dayId) return;

    card.querySelectorAll<HTMLElement>("[data-curriculum-section]").forEach((sectionEl) => {
      const sectionId = sectionEl.dataset.curriculumSection as CurriculumPlanSectionId | undefined;
      if (!sectionId || !CURRICULUM_SECTION_IDS.includes(sectionId)) return;
      const key = sectionProgressKey(dayId, sectionId);
      const checked = done.has(key);
      sectionEl.classList.toggle("eoschool-curriculum__subject--done", checked);
      const input = sectionEl.querySelector<HTMLInputElement>("[data-curriculum-section-check]");
      if (input) input.checked = checked;
    });

    const complete = dayComplete(dayId, done);
    card.classList.toggle("eoschool-curriculum__day-card--done", complete);
    card.classList.toggle("product-dash__card--done", complete);
  });

  root.querySelectorAll<HTMLElement>("[data-curriculum-week]").forEach((week) => {
    const dayCards = daysInWeek(week);
    const doneCount = dayCards.filter((c) => {
      const id = c.dataset.curriculumDay;
      return id && dayComplete(id, done);
    }).length;
    const total = dayCards.length;
    const complete = total > 0 && doneCount === total;

    week.classList.toggle("eoschool-curriculum__week--done", complete);
    week.classList.toggle("product-dash__card--done", complete);

    const status = week.querySelector("[data-curriculum-week-status]");
    if (status) {
      if (complete) {
        status.textContent = "Semana completada";
      } else {
        status.textContent = `${doneCount}/${total} días`;
      }
    }
  });
}

export function initCurriculumProgress(root: HTMLElement | null): void {
  if (!root) return;

  const done = readSectionsDone();
  applyProgress(root, done);

  if (root.dataset.progressBound === "true") return;
  root.dataset.progressBound = "true";

  root.addEventListener("change", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-curriculum-section-check]")) return;
    const sectionEl = target.closest<HTMLElement>("[data-curriculum-section]");
    const card = target.closest<HTMLElement>("[data-curriculum-day]");
    const dayId = card?.dataset.curriculumDay;
    const sectionId = sectionEl?.dataset.curriculumSection as CurriculumPlanSectionId | undefined;
    if (!dayId || !sectionId) return;
    const key = sectionProgressKey(dayId, sectionId);
    if (target.checked) done.add(key);
    else done.delete(key);
    writeSectionsDone(done);
    applyProgress(root, done);
  });
}
