import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";
import {
  curriculumActivityPhotoURL,
  DEFAULT_CURRICULUM_STUDENT_KEY,
  patchCurriculumActivityScore,
  uploadCurriculumActivityPhoto,
  type CurriculumProgressPayload,
} from "./eoschool-curriculum-api";
import { sectionProgressKey } from "./eoschool-curriculum-progress-status";
import { showErrorModal } from "./error-modal";
import { mustLog } from "./dev-log";

export const ACTIVITY_FROM_PLAN_DAY = 38;

const scores = new Map<string, number>();
const photos = new Set<string>();
const photoRev = new Map<string, string>();

export function activityTaskCopy(planDay: number, sectionId: string): string {
  if (!Number.isFinite(planDay) || planDay < ACTIVITY_FROM_PLAN_DAY) return "";
  if (sectionId === "bib") {
    return "Una hoja. A la izquierda: preguntas, pareo y selección. A la derecha: escribe una enseñanza o una reflexión. Sube la foto de la hoja.";
  }
  return "Responde las preguntas de la hoja y escribe con tus palabras. Sube la foto de la hoja.";
}

export function setActivityMarks(
  nextScores: Record<string, number> | undefined,
  nextPhotos: string[] | undefined,
): void {
  scores.clear();
  photos.clear();
  for (const [key, value] of Object.entries(nextScores || {})) {
    if (typeof value === "number" && value >= 0 && value <= 100) scores.set(key, value);
  }
  for (const key of nextPhotos || []) photos.add(key);
}

export function paintCurriculumSubjectScores(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("[data-curriculum-section]").forEach((sectionEl) => {
    const card = sectionEl.closest<HTMLElement>("[data-curriculum-day]");
    const dayId = card?.dataset.curriculumDay || "";
    const sectionId = sectionEl.dataset.curriculumSection as CurriculumPlanSectionId | undefined;
    const span = sectionEl.querySelector<HTMLElement>("[data-curriculum-subject-score]");
    if (!span || !dayId || !sectionId) return;
    const score = scores.get(sectionProgressKey(dayId, sectionId));
    if (score == null) {
      span.hidden = true;
      span.textContent = "";
      span.removeAttribute("aria-label");
      return;
    }
    span.hidden = false;
    span.textContent = String(score);
    span.setAttribute("aria-label", `Puntaje ${score}`);
  });
}

function studentKeyFromPage(): string {
  const root = document.querySelector<HTMLElement>("[data-curriculum-progress]");
  return root?.dataset.curriculumStudentKey || DEFAULT_CURRICULUM_STUDENT_KEY;
}

function requestIdOf(err: unknown): string | undefined {
  if (err && typeof err === "object" && "requestId" in err) {
    const id = String((err as { requestId?: string }).requestId || "");
    return id || undefined;
  }
  return undefined;
}

function applyPayload(data: CurriculumProgressPayload, key: string): void {
  setActivityMarks(data.activityScores, data.activityPhotos);
  photoRev.set(key, String(Date.now()));
  const root = document.querySelector<HTMLElement>("[data-curriculum-progress]");
  if (root) paintCurriculumSubjectScores(root);
}

export function renderCurriculumActivity(
  modal: HTMLElement,
  card: HTMLElement,
  sectionId: CurriculumPlanSectionId,
): void {
  const host = modal.querySelector<HTMLElement>("[data-curriculum-activity]");
  if (!host) return;
  const planDay = Number(card.dataset.planDay || "0");
  const dayId = card.dataset.curriculumDay || "";
  const copy = activityTaskCopy(planDay, sectionId);
  host.replaceChildren();
  if (!copy || !dayId) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  const key = sectionProgressKey(dayId, sectionId);
  const score = scores.get(key);
  const hasPhoto = photos.has(key);
  const studentKey = studentKeyFromPage();
  const rev = photoRev.get(key);
  const viewURL = curriculumActivityPhotoURL(studentKey, dayId, sectionId);
  const downloadURL = curriculumActivityPhotoURL(studentKey, dayId, sectionId, true);

  const task = document.createElement("p");
  task.className = "eoschool-curriculum-activity__task";
  task.textContent = copy;

  const fileLabel = document.createElement("label");
  fileLabel.className = "eoschool-curriculum-activity__file";
  const fileCaption = document.createElement("span");
  fileCaption.textContent = "Foto de la tarea";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp";
  fileInput.required = true;
  fileInput.setAttribute("aria-label", "Foto de la tarea");
  fileLabel.append(fileCaption, fileInput);

  const scoreRow = document.createElement("div");
  scoreRow.className = "eoschool-curriculum-activity__score";
  const scoreLabel = document.createElement("label");
  scoreLabel.textContent = "Puntaje";
  const scoreInput = document.createElement("input");
  scoreInput.type = "number";
  scoreInput.min = "0";
  scoreInput.max = "100";
  scoreInput.inputMode = "numeric";
  scoreInput.setAttribute("aria-label", "Puntaje de 0 a 100");
  if (score != null) scoreInput.value = String(score);
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Guardar puntaje";
  scoreLabel.append(scoreInput);
  scoreRow.append(scoreLabel, save);

  host.append(task, fileLabel);
  if (hasPhoto) {
    const img = document.createElement("img");
    img.className = "eoschool-curriculum-activity__preview";
    img.alt = "Foto de la tarea";
    img.src = rev ? `${viewURL}&v=${encodeURIComponent(rev)}` : viewURL;
    const link = document.createElement("a");
    link.href = downloadURL;
    link.textContent = "Descargar foto";
    host.append(img, link);
  }
  host.append(scoreRow);

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (mustLog) console.log("[curriculum.activity] photo.upload", { dayId, sectionId });
    void uploadCurriculumActivityPhoto({ studentKey, dayId, sectionId, photo: file })
      .then((data) => {
        applyPayload(data, key);
        renderCurriculumActivity(modal, card, sectionId);
      })
      .catch((err) => {
        showErrorModal({
          message: err instanceof Error ? err.message : "No se pudo subir la foto.",
          requestId: requestIdOf(err),
        });
      });
  });

  save.addEventListener("click", () => {
    const next = Number(scoreInput.value);
    if (!Number.isInteger(next) || next < 0 || next > 100) {
      showErrorModal({ message: "El puntaje va de 0 a 100." });
      return;
    }
    if (mustLog) console.log("[curriculum.activity] score.save", { dayId, sectionId, score: next });
    void patchCurriculumActivityScore({ studentKey, dayId, sectionId, score: next })
      .then((data) => {
        applyPayload(data, key);
        renderCurriculumActivity(modal, card, sectionId);
      })
      .catch((err) => {
        showErrorModal({
          message: err instanceof Error ? err.message : "No se pudo guardar el puntaje.",
          requestId: requestIdOf(err),
        });
      });
  });
}
