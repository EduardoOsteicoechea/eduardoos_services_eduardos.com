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
const photoFiles = new Map<string, string[]>();
const photoRev = new Map<string, string>();

export function activityTaskCopy(planDay: number, _sectionId: string): string {
  if (!Number.isFinite(planDay) || planDay < ACTIVITY_FROM_PLAN_DAY) return "";
  return "";
}

export function activityPhotoNames(key: string): string[] {
  return photoFiles.get(key) ?? [];
}

export function setActivityMarks(
  nextScores: Record<string, number> | undefined,
  nextPhotos: string[] | undefined,
  nextFiles?: Record<string, string[]>,
): void {
  scores.clear();
  photoFiles.clear();
  for (const [key, value] of Object.entries(nextScores || {})) {
    if (typeof value === "number" && value >= 0 && value <= 100) scores.set(key, value);
  }
  for (const [key, names] of Object.entries(nextFiles || {})) {
    const clean = names.filter((name) => typeof name === "string" && name.length > 0);
    if (clean.length) photoFiles.set(key, clean);
  }
  for (const key of nextPhotos || []) {
    if (!photoFiles.has(key)) photoFiles.set(key, ["activity.webp"]);
  }
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
  setActivityMarks(data.activityScores, data.activityPhotos, data.activityPhotoFiles);
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
  host.replaceChildren();
  if (!dayId || !Number.isFinite(planDay) || planDay < ACTIVITY_FROM_PLAN_DAY) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  const key = sectionProgressKey(dayId, sectionId);
  const score = scores.get(key);
  const names = activityPhotoNames(key);
  const studentKey = studentKeyFromPage();
  const rev = photoRev.get(key);

  const fileLabel = document.createElement("label");
  fileLabel.className = "eoschool-curriculum-activity__file";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp";
  fileInput.multiple = true;
  fileInput.setAttribute("aria-label", "Fotos de la tarea");
  fileLabel.append(fileInput);

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

  host.append(fileLabel);
  if (names.length) {
    const gallery = document.createElement("div");
    gallery.className = "eoschool-curriculum-activity__photos";
    for (const name of names) {
      const viewURL = curriculumActivityPhotoURL(studentKey, dayId, sectionId, name);
      const img = document.createElement("img");
      img.className = "eoschool-curriculum-activity__preview";
      img.alt = "";
      img.src = rev ? `${viewURL}&v=${encodeURIComponent(rev)}` : viewURL;
      gallery.append(img);
    }
    host.append(gallery);
  }
  host.append(scoreRow);

  fileInput.addEventListener("change", () => {
    const files = [...(fileInput.files || [])];
    fileInput.value = "";
    if (!files.length) return;
    if (mustLog) console.log("[curriculum.activity] photo.upload", { dayId, sectionId, count: files.length });
    void (async () => {
      let data: CurriculumProgressPayload | null = null;
      for (const file of files) {
        data = await uploadCurriculumActivityPhoto({ studentKey, dayId, sectionId, photo: file });
      }
      if (data) {
        applyPayload(data, key);
        renderCurriculumActivity(modal, card, sectionId);
      }
    })().catch((err) => {
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
