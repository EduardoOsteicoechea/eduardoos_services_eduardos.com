import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";
import {
  curriculumActivityPhotoURL,
  DEFAULT_CURRICULUM_STUDENT_KEY,
  deleteCurriculumActivityPhoto,
  patchCurriculumActivityScore,
  uploadCurriculumActivityPhoto,
  type CurriculumProgressPayload,
} from "./eoschool-curriculum-api";
import { sectionProgressKey } from "./eoschool-curriculum-progress-status";
import { showErrorModal } from "./error-modal";
import { mustLog } from "./dev-log";

export const ACTIVITY_FROM_PLAN_DAY = 38;

const scores = new Map<string, number>();
const scoreNotes = new Map<string, string>();
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
  nextNotes?: Record<string, string>,
): void {
  scores.clear();
  scoreNotes.clear();
  photoFiles.clear();
  for (const [key, value] of Object.entries(nextScores || {})) {
    if (typeof value === "number" && value >= 0 && value <= 100) scores.set(key, value);
  }
  for (const [key, value] of Object.entries(nextNotes || {})) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) scoreNotes.set(key, text);
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
  setActivityMarks(data.activityScores, data.activityPhotos, data.activityPhotoFiles, data.activityScoreNotes);
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
  const scoreText = document.createElement("span");
  scoreText.textContent = "Puntaje";
  const scoreInput = document.createElement("input");
  scoreInput.type = "number";
  scoreInput.min = "0";
  scoreInput.max = "100";
  scoreInput.inputMode = "numeric";
  scoreInput.autocomplete = "off";
  scoreInput.setAttribute("aria-label", "Puntaje de 0 a 100");
  if (score != null) scoreInput.value = String(score);
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Guardar puntaje";
  scoreRow.append(scoreText, scoreInput, save);
  if (score != null) {
    const why = document.createElement("button");
    why.type = "button";
    why.className = "eoschool-curriculum-activity__why-open";
    why.dataset.curriculumScoreWhy = "";
    why.textContent = "Por qué";
    why.setAttribute("aria-label", "Ver por qué este puntaje");
    why.addEventListener("click", () => {
      openScoreReasonDialog(modal, scoreNotes.get(key) || "");
    });
    scoreRow.append(why);
  }

  host.append(fileLabel);
  if (names.length) {
    const gallery = document.createElement("div");
    gallery.className = "eoschool-curriculum-activity__photos";
    for (const name of names) {
      const viewURL = curriculumActivityPhotoURL(studentKey, dayId, sectionId, name);
      const thumb = document.createElement("div");
      thumb.className = "eoschool-curriculum-activity__thumb";
      const img = document.createElement("img");
      img.className = "eoschool-curriculum-activity__preview";
      img.alt = "";
      img.src = rev ? `${viewURL}&v=${encodeURIComponent(rev)}` : viewURL;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "eoschool-curriculum-activity__remove";
      remove.title = "Borrar foto";
      remove.setAttribute("aria-label", "Borrar foto");
      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "delete";
      remove.append(icon);
      remove.addEventListener("click", () => {
        if (mustLog) console.log("[curriculum.activity] photo.delete", { dayId, sectionId, name });
        void deleteCurriculumActivityPhoto({ studentKey, dayId, sectionId, name })
          .then((data) => {
            applyPayload(data, key);
            renderCurriculumActivity(modal, card, sectionId);
          })
          .catch((err) => {
            showErrorModal({
              message: err instanceof Error ? err.message : "No se pudo borrar la foto.",
              requestId: requestIdOf(err),
            });
          });
      });
      thumb.append(img, remove);
      gallery.append(thumb);
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
    openScoreKeyDialog(modal, async (keyValue) => {
      if (mustLog) console.log("[curriculum.activity] score.save", { dayId, sectionId, score: next });
      try {
        const data = await patchCurriculumActivityScore({ studentKey, dayId, sectionId, score: next, key: keyValue });
        applyPayload(data, key);
        renderCurriculumActivity(modal, card, sectionId);
        return "saved";
      } catch (err) {
        if (isScoreKeyRejection(err)) return "key";
        showErrorModal({
          message: err instanceof Error ? err.message : "No se pudo guardar el puntaje.",
          requestId: requestIdOf(err),
        });
        return "failed";
      }
    });
  });
}

function openScoreReasonDialog(modal: HTMLElement, note: string): void {
  modal.querySelector("[data-curriculum-score-reason]")?.remove();
  const layer = document.createElement("div");
  layer.className = "eoschool-curriculum-activity__reason";
  layer.dataset.curriculumScoreReason = "";
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-labelledby", "curriculum-score-reason-title");

  const box = document.createElement("div");
  box.className = "eoschool-curriculum-activity__reason-box";
  const top = document.createElement("div");
  top.className = "eoschool-curriculum-activity__reason-top";
  const title = document.createElement("h2");
  title.className = "eoschool-curriculum-activity__reason-title";
  title.id = "curriculum-score-reason-title";
  title.textContent = "Por qué este puntaje";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "icon-btn eoschool-curriculum-activity__reason-close";
  closeBtn.setAttribute("aria-label", "Cerrar");
  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "close";
  closeBtn.append(icon);
  top.append(title, closeBtn);

  const body = document.createElement("p");
  body.className = "eoschool-curriculum-activity__reason-body";
  body.dataset.curriculumScoreReasonText = "";
  body.textContent = note || "Este puntaje no tiene justificación escrita.";
  box.append(top, body);
  layer.append(box);
  modal.append(layer);
  closeBtn.focus();

  const close = () => layer.remove();
  closeBtn.addEventListener("click", close);
  layer.addEventListener("click", (ev) => {
    if (ev.target === layer) close();
  });
  layer.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") close();
  });
}

function isScoreKeyRejection(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "keyRejected" in err && (err as { keyRejected?: boolean }).keyRejected);
}

function openScoreKeyDialog(
  modal: HTMLElement,
  onConfirm: (keyValue: string) => Promise<"saved" | "key" | "failed">,
): void {
  modal.querySelector("[data-curriculum-score-key]")?.remove();
  const layer = document.createElement("div");
  layer.className = "eoschool-curriculum-activity__key";
  layer.dataset.curriculumScoreKey = "";
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-label", "Clave de administrador");

  const box = document.createElement("div");
  box.className = "eoschool-curriculum-activity__key-box";
  const label = document.createElement("label");
  label.className = "eoschool-curriculum-activity__key-label";
  label.textContent = "Clave";
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("autocapitalize", "off");
  input.setAttribute("data-1p-ignore", "true");
  input.setAttribute("data-lpignore", "true");
  input.className = "eoschool-curriculum-activity__key-input";
  input.setAttribute("aria-label", "Clave de administrador");
  label.append(input);

  const actions = document.createElement("div");
  actions.className = "eoschool-curriculum-activity__key-actions";
  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.textContent = "Confirmar";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancelar";
  actions.append(confirm, cancel);
  box.append(label, actions);
  layer.append(box);
  modal.append(layer);
  input.focus();

  const close = () => layer.remove();
  cancel.addEventListener("click", close);
  layer.addEventListener("click", (ev) => {
    if (ev.target === layer) close();
  });
  const rejectKey = () => {
    alert("La clave no es válida.");
    input.focus();
    input.select();
  };
  const submit = () => {
    const keyValue = input.value.trim();
    if (!keyValue) {
      rejectKey();
      return;
    }
    confirm.disabled = true;
    void onConfirm(keyValue).then((result) => {
      if (result === "saved" || result === "failed") {
        close();
        return;
      }
      confirm.disabled = false;
      rejectKey();
    });
  };
  confirm.addEventListener("click", submit);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      submit();
    }
    if (ev.key === "Escape") close();
  });
}
