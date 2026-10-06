import { CURRICULUM_SECTION_IDS, type CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";
import {
  DEFAULT_CURRICULUM_STUDENT_KEY,
  fetchCurriculumProgress,
  patchCurriculumSection,
  type CurriculumStudent,
} from "./eoschool-curriculum-api";
import { showErrorModal } from "./error-modal";
import { mustLog } from "./dev-log";

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
  });
}

function formatStudentBanner(student: CurriculumStudent): string {
  return `Progreso de ${student.displayName} (${student.age} años, ${student.grade})`;
}

function setStudentBanner(
  root: HTMLElement,
  student: CurriculumStudent | null,
  mode: "remote" | "guest" | "offline" | "hidden",
): void {
  const el = root.querySelector<HTMLElement>("[data-curriculum-student-banner]");
  if (!el) return;
  if (mode === "hidden") {
    el.hidden = true;
    el.textContent = "";
    el.removeAttribute("data-curriculum-persist");
    root.removeAttribute("data-curriculum-persist");
    return;
  }
  if (mode === "offline") {
    el.textContent =
      "Progreso en el navegador: el API de currículo aún no está disponible en este entorno. Los checks no se guardan en la nube.";
    el.hidden = false;
    el.dataset.curriculumPersist = "local";
    root.dataset.curriculumPersist = "local";
    return;
  }
  if (mode === "guest") {
    el.textContent =
      "Invitado: los checks no se guardan. Inicia sesión con Homescool para persistir el progreso de Elías.";
    el.hidden = false;
    el.dataset.curriculumPersist = "guest";
    root.dataset.curriculumPersist = "guest";
    return;
  }
  if (!student) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.textContent = formatStudentBanner(student);
  el.hidden = false;
  el.dataset.curriculumPersist = "remote";
  root.dataset.curriculumPersist = "remote";
  root.dataset.curriculumStudentKey = student.studentKey;
}

export async function initCurriculumProgress(root: HTMLElement | null): Promise<void> {
  if (!root) return;

  const done = new Set<string>();
  let studentKey = DEFAULT_CURRICULUM_STUDENT_KEY;
  let persistRemote = false;

  try {
    const loaded = await fetchCurriculumProgress(studentKey);
    if (loaded.ok) {
      persistRemote = true;
      studentKey = loaded.data.student.studentKey;
      root.dataset.curriculumStudentKey = studentKey;
      loaded.data.sectionsDone.forEach((key) => done.add(key));
      setStudentBanner(root, loaded.data.student, "remote");
      if (mustLog) {
        console.log("[curriculum.progress] loaded", {
          count: done.size,
          studentKey,
          requestId: undefined,
        });
      }
    } else if (loaded.status === 404) {
      setStudentBanner(root, null, "offline");
      if (mustLog) {
        console.log("[curriculum.progress] api_not_deployed", { requestId: loaded.requestId });
      }
    } else {
      // 401/403: guest or no Homescool access — not a logout signal.
      setStudentBanner(root, null, "guest");
      if (mustLog) {
        console.log("[curriculum.progress] guest_or_denied", {
          status: loaded.status,
          requestId: loaded.requestId,
        });
      }
    }
  } catch (err) {
    setStudentBanner(root, null, "offline");
    if (mustLog) {
      console.log("[curriculum.progress] load_error", err);
    }
  }

  applyProgress(root, done);

  if (root.dataset.progressBound === "true") return;
  root.dataset.progressBound = "true";

  root.addEventListener("change", async (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-curriculum-section-check]")) return;
    const sectionEl = target.closest<HTMLElement>("[data-curriculum-section]");
    const card = target.closest<HTMLElement>("[data-curriculum-day]");
    const dayId = card?.dataset.curriculumDay;
    const sectionId = sectionEl?.dataset.curriculumSection as CurriculumPlanSectionId | undefined;
    if (!dayId || !sectionId) return;
    const key = sectionProgressKey(dayId, sectionId);
    const prev = done.has(key);
    if (target.checked) done.add(key);
    else done.delete(key);
    applyProgress(root, done);

    if (!persistRemote) {
      // Optimistic local-only for guests; do not confuse with session loss.
      return;
    }

    try {
      const data = await patchCurriculumSection({
        studentKey,
        dayId,
        sectionId,
        completed: target.checked,
      });
      done.clear();
      data.sectionsDone.forEach((k) => done.add(k));
      setStudentBanner(root, data.student, "remote");
      applyProgress(root, done);
    } catch (err) {
      if (prev) done.add(key);
      else done.delete(key);
      target.checked = prev;
      applyProgress(root, done);
      const requestId =
        err && typeof err === "object" && "requestId" in err
          ? String((err as { requestId?: string }).requestId || "")
          : "";
      showErrorModal({
        message: err instanceof Error ? err.message : "No se pudo guardar el progreso.",
        requestId: requestId || undefined,
      });
    }
  });
}
