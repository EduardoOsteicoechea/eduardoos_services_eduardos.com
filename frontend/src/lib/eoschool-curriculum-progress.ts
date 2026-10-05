const STORAGE_KEY = "eoschool-curriculum-days-done";

function readDone(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeDone(done: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
  } catch {
    /* ignore */
  }
}

function daysInWeek(weekEl: HTMLElement): HTMLElement[] {
  return [...weekEl.querySelectorAll<HTMLElement>("[data-curriculum-day]")];
}

function weekComplete(weekEl: HTMLElement, done: Set<string>): boolean {
  const days = daysInWeek(weekEl);
  if (!days.length) return false;
  return days.every((card) => {
    const id = card.dataset.curriculumDay;
    return id ? done.has(id) : false;
  });
}

function applyProgress(root: HTMLElement, done: Set<string>): void {
  root.querySelectorAll<HTMLElement>("[data-curriculum-day]").forEach((card) => {
    const id = card.dataset.curriculumDay;
    const checked = id ? done.has(id) : false;
    card.classList.toggle("eoschool-curriculum__day-card--done", checked);
    card.classList.toggle("product-dash__card--done", checked);
    const input = card.querySelector<HTMLInputElement>("[data-curriculum-day-check]");
    if (input) input.checked = checked;
  });

  root.querySelectorAll<HTMLElement>("[data-curriculum-week]").forEach((week) => {
    const dayCards = daysInWeek(week);
    const doneCount = dayCards.filter((c) => {
      const id = c.dataset.curriculumDay;
      return id && done.has(id);
    }).length;
    const total = dayCards.length;
    const complete = weekComplete(week, done);

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

  const done = readDone();
  applyProgress(root, done);

  if (root.dataset.progressBound === "true") return;
  root.dataset.progressBound = "true";

  root.addEventListener("change", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-curriculum-day-check]")) return;
    const card = target.closest<HTMLElement>("[data-curriculum-day]");
    const id = card?.dataset.curriculumDay;
    if (!id) return;
    if (target.checked) done.add(id);
    else done.delete(id);
    writeDone(done);
    applyProgress(root, done);
  });
}
