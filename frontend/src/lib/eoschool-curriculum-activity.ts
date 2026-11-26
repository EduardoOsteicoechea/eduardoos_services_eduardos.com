import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";
import {
  curriculumActivityPhotoURL,
  DEFAULT_CURRICULUM_STUDENT_KEY,
  deleteCurriculumActivityPhoto,
  patchCurriculumActivityScore,
  uploadCurriculumActivityPhoto,
  type CurriculumActivityFact,
  type CurriculumActivityItem,
  type CurriculumActivityRecord,
  type CurriculumProgressPayload,
} from "./eoschool-curriculum-api";
import { sectionProgressKey } from "./eoschool-curriculum-progress-status";
import { showErrorModal } from "./error-modal";
import { mustLog } from "./dev-log";

export const ACTIVITY_FROM_PLAN_DAY = 38;

const scores = new Map<string, number>();
const scoreNotes = new Map<string, string>();
const scoreRecords = new Map<string, CurriculumActivityRecord>();
let scoreFacts: CurriculumActivityFact[] = [];
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
  nextRecords?: Record<string, CurriculumActivityRecord>,
  nextFacts?: CurriculumActivityFact[],
): void {
  scores.clear();
  scoreNotes.clear();
  scoreRecords.clear();
  scoreFacts = [];
  photoFiles.clear();
  for (const [key, value] of Object.entries(nextScores || {})) {
    if (typeof value === "number" && value >= 0 && value <= 100) scores.set(key, value);
  }
  for (const [key, value] of Object.entries(nextNotes || {})) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) scoreNotes.set(key, text);
  }
  for (const [key, value] of Object.entries(nextRecords || {})) {
    const summary = typeof value?.summary === "string" ? value.summary.trim() : "";
    if (summary) scoreRecords.set(key, value);
  }
  scoreFacts = (nextFacts || []).filter((fact) => fact && typeof fact.label === "string" && fact.misses > 0);
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
  paintCurriculumSubjectPhotos(root);
}

function paintCurriculumSubjectPhotos(root: HTMLElement): void {
  const studentKey = studentKeyFromPage();
  root.querySelectorAll<HTMLElement>("[data-curriculum-section]").forEach((sectionEl) => {
    const host = sectionEl.querySelector<HTMLElement>("[data-curriculum-subject-photos]");
    if (!host) return;
    const card = sectionEl.closest<HTMLElement>("[data-curriculum-day]");
    const dayId = card?.dataset.curriculumDay || "";
    const sectionId = sectionEl.dataset.curriculumSection as CurriculumPlanSectionId | undefined;
    host.replaceChildren();
    if (!dayId || !sectionId) {
      host.setAttribute("aria-hidden", "true");
      return;
    }
    const key = sectionProgressKey(dayId, sectionId);
    const names = activityPhotoNames(key);
    if (!names.length) {
      host.setAttribute("aria-hidden", "true");
      return;
    }
    host.removeAttribute("aria-hidden");
    const label = sectionEl.querySelector(".eoschool-curriculum__subject-icon")?.getAttribute("title") || "Foto";
    const rev = photoRev.get(key);
    const urls = names.map((name) => {
      const viewURL = curriculumActivityPhotoURL(studentKey, dayId, sectionId, name);
      return rev ? `${viewURL}&v=${encodeURIComponent(rev)}` : viewURL;
    });
    names.forEach((_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "eoschool-curriculum__subject-photo";
      button.dataset.curriculumSubjectPhoto = String(index);
      const tip = `${label}: foto ${index + 1} de ${names.length}`;
      button.title = tip;
      button.setAttribute("aria-label", tip);
      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "fiber_manual_record";
      button.append(icon);
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openCurriculumPhotoViewer(urls, index);
      });
      host.append(button);
    });
  });
}

type PhotoViewer = { urls: string[]; index: number };

let photoViewer: PhotoViewer = { urls: [], index: 0 };

function openCurriculumPhotoViewer(urls: string[], index: number): void {
  const modal = document.querySelector<HTMLElement>("[data-curriculum-photo-modal]");
  if (!modal || !urls.length) return;
  bindCurriculumPhotoViewer(modal);
  photoViewer = { urls, index: Math.min(Math.max(index, 0), urls.length - 1) };
  showCurriculumPhoto(modal);
  modal.hidden = false;
  modal.querySelector<HTMLButtonElement>("[data-curriculum-photo-close]")?.focus();
}

function showCurriculumPhoto(modal: HTMLElement): void {
  const img = modal.querySelector<HTMLImageElement>("[data-curriculum-photo-img]");
  const prev = modal.querySelector<HTMLButtonElement>("[data-curriculum-photo-prev]");
  const next = modal.querySelector<HTMLButtonElement>("[data-curriculum-photo-next]");
  const url = photoViewer.urls[photoViewer.index];
  if (img && url) {
    img.src = url;
    img.alt = `Foto ${photoViewer.index + 1} de ${photoViewer.urls.length}`;
  }
  const single = photoViewer.urls.length < 2;
  if (prev) prev.disabled = single;
  if (next) next.disabled = single;
}

function stepCurriculumPhoto(modal: HTMLElement, delta: number): void {
  const count = photoViewer.urls.length;
  if (count < 2) return;
  photoViewer.index = (photoViewer.index + delta + count) % count;
  showCurriculumPhoto(modal);
}

function curriculumPhotoDialog(modal: HTMLElement): HTMLElement {
  return modal.querySelector<HTMLElement>(".eoschool-curriculum-photos__dialog") ?? modal;
}

function syncCurriculumPhotoFullscreen(modal: HTMLElement): void {
  const button = modal.querySelector<HTMLButtonElement>("[data-curriculum-photo-full]");
  const icon = button?.querySelector<HTMLElement>(".material-symbols-outlined");
  const on = document.fullscreenElement === curriculumPhotoDialog(modal);
  if (icon) icon.textContent = on ? "fullscreen_exit" : "fullscreen";
  if (button) button.setAttribute("aria-label", on ? "Salir de pantalla completa" : "Pantalla completa");
}

function toggleCurriculumPhotoFullscreen(modal: HTMLElement): void {
  const dialog = curriculumPhotoDialog(modal);
  if (document.fullscreenElement === dialog) {
    void document.exitFullscreen?.();
    return;
  }
  void dialog.requestFullscreen?.();
}

function closeCurriculumPhotoViewer(modal: HTMLElement): void {
  if (document.fullscreenElement === curriculumPhotoDialog(modal)) {
    void document.exitFullscreen?.();
  }
  modal.hidden = true;
  const img = modal.querySelector<HTMLImageElement>("[data-curriculum-photo-img]");
  if (img) {
    img.removeAttribute("src");
    img.alt = "";
  }
  syncCurriculumPhotoFullscreen(modal);
}

function bindCurriculumPhotoViewer(modal: HTMLElement): void {
  if (modal.dataset.photoViewerBound === "true") return;
  modal.dataset.photoViewerBound = "true";
  modal.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-curriculum-photo-close]") || target === modal) {
      closeCurriculumPhotoViewer(modal);
      return;
    }
    if (target.closest("[data-curriculum-photo-prev]")) stepCurriculumPhoto(modal, -1);
    if (target.closest("[data-curriculum-photo-next]")) stepCurriculumPhoto(modal, 1);
    if (target.closest("[data-curriculum-photo-full]")) toggleCurriculumPhotoFullscreen(modal);
  });
  document.addEventListener("fullscreenchange", () => syncCurriculumPhotoFullscreen(modal));
  document.addEventListener("keydown", (ev) => {
    if (modal.hidden) return;
    if (ev.key === "Escape") closeCurriculumPhotoViewer(modal);
    if (ev.key === "ArrowLeft") stepCurriculumPhoto(modal, -1);
    if (ev.key === "ArrowRight") stepCurriculumPhoto(modal, 1);
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
  setActivityMarks(
    data.activityScores,
    data.activityPhotos,
    data.activityPhotoFiles,
    data.activityScoreNotes,
    data.activityRecords,
    data.activityFacts,
  );
  photoRev.set(key, String(Date.now()));
  const root = document.querySelector<HTMLElement>("[data-curriculum-progress]");
  if (root) paintCurriculumSubjectScores(root);
}

export function renderCurriculumActivity(
  modal: HTMLElement,
  card: HTMLElement,
  sectionId: CurriculumPlanSectionId,
): void {
  const host = modal.querySelector<HTMLElement>("[data-curriculum-evidence]")
    ?? modal.querySelector<HTMLElement>("[data-curriculum-activity]");
  const scoreHost = modal.querySelector<HTMLElement>("[data-curriculum-score]");
  if (!host) return;
  const planDay = Number(card.dataset.planDay || "0");
  const dayId = card.dataset.curriculumDay || "";
  host.replaceChildren();
  if (scoreHost && scoreHost !== host) scoreHost.replaceChildren();
  const hidePanels = () => {
    host.hidden = true;
    if (scoreHost) scoreHost.hidden = true;
  };
  if (!dayId || !Number.isFinite(planDay) || planDay < ACTIVITY_FROM_PLAN_DAY) {
    hidePanels();
    return;
  }
  host.hidden = false;
  if (scoreHost) scoreHost.hidden = false;
  const key = sectionProgressKey(dayId, sectionId);
  const score = scores.get(key);
  const names = activityPhotoNames(key);
  const studentKey = studentKeyFromPage();
  const rev = photoRev.get(key);

  const fileLabel = document.createElement("label");
  fileLabel.className = "eoschool-curriculum-activity__file";
  const uploadIcon = document.createElement("span");
  uploadIcon.className = "material-symbols-outlined";
  uploadIcon.setAttribute("aria-hidden", "true");
  uploadIcon.textContent = "upload";
  const uploadText = document.createElement("span");
  uploadText.textContent = "Evidencias";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.className = "eoschool-curriculum-activity__file-input";
  fileInput.accept = "image/jpeg,image/png,image/webp";
  fileInput.multiple = true;
  fileInput.setAttribute("aria-label", "Fotos de la tarea");
  const progress = document.createElement("progress");
  progress.className = "eoschool-curriculum-activity__progress";
  progress.max = 100;
  progress.value = 0;
  progress.hidden = true;
  progress.setAttribute("aria-label", "Progreso de la foto");
  const progressLabel = document.createElement("span");
  progressLabel.className = "eoschool-curriculum-activity__progress-label";
  progressLabel.hidden = true;
  fileLabel.append(uploadIcon, uploadText, fileInput, progress, progressLabel);

  const scoreRow = document.createElement("div");
  scoreRow.className = "eoschool-curriculum-activity__score";
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
  save.className = "eoschool-curriculum-activity__grade";
  save.textContent = "Calificar";
  scoreRow.append(scoreInput, save);
  if (score != null) {
    const why = document.createElement("button");
    why.type = "button";
    why.className = "eoschool-curriculum-activity__why-open";
    why.dataset.curriculumScoreWhy = "";
    why.textContent = "Por qué";
    why.setAttribute("aria-label", "Ver por qué este puntaje");
    why.addEventListener("click", () => {
      openScoreReasonDialog(modal, scoreNotes.get(key) || "", scoreRecords.get(key), scoreFacts);
    });
    scoreRow.append(why);
  }

  host.append(fileLabel);
  const scoreTarget = scoreHost && scoreHost !== host ? scoreHost : host;
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
        if (!window.confirm("¿Borrar esta foto?")) return;
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
  scoreTarget.append(scoreRow);

  fileInput.addEventListener("change", () => {
    const files = [...(fileInput.files || [])];
    fileInput.value = "";
    if (!files.length) return;
    if (mustLog) console.log("[curriculum.activity] photo.upload", { dayId, sectionId, count: files.length });
    fileInput.disabled = true;
    progress.hidden = false;
    progressLabel.hidden = false;
    void (async () => {
      let data: CurriculumProgressPayload | null = null;
      for (let i = 0; i < files.length; i++) {
        const which = files.length > 1 ? ` ${i + 1} de ${files.length}` : "";
        progressLabel.textContent = `Subiendo${which}…`;
        progress.value = 0;
        data = await uploadCurriculumActivityPhoto({
          studentKey,
          dayId,
          sectionId,
          photo: files[i],
          onProgress: (event) => {
            progress.value = event.percent;
            if (event.percent >= 100) progressLabel.textContent = `Procesando${which}…`;
          },
        });
      }
      if (data) {
        applyPayload(data, key);
        renderCurriculumActivity(modal, card, sectionId);
      }
    })().catch((err) => {
      progress.hidden = true;
      progressLabel.hidden = true;
      fileInput.disabled = false;
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

function arithItems(items: CurriculumActivityItem[]): CurriculumActivityItem[] {
  return items
    .filter((item) => item.kind === "mult" || item.kind === "div")
    .slice()
    .sort((a, b) => (a.page || 0) - (b.page || 0) || (a.row || 0) - (b.row || 0) || (a.col || 0) - (b.col || 0));
}

function openScoreReasonDialog(
  modal: HTMLElement,
  note: string,
  record: CurriculumActivityRecord | undefined,
  facts: CurriculumActivityFact[],
): void {
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

  const body = document.createElement("div");
  body.className = "eoschool-curriculum-activity__reason-body";
  const summary = document.createElement("p");
  summary.dataset.curriculumScoreReasonText = "";
  summary.textContent = record?.summary?.trim() || note || "Este puntaje no tiene justificación escrita.";
  body.append(summary);
  const rewrite = record?.rewrite?.trim() || "";
  if (rewrite) {
    const line = document.createElement("p");
    line.dataset.curriculumScoreRewrite = "";
    line.textContent = rewrite;
    body.append(line);
  }
  const items = record?.items || [];
  const arith = arithItems(items);
  if (arith.length) {
    const grid = document.createElement("div");
    grid.className = "eoschool-curriculum-activity__cells";
    for (const item of arith) {
      const cell = document.createElement("article");
      cell.className = "eoschool-curriculum-activity__cell";
      cell.dataset.curriculumScoreCell = "";
      const op = item.kind === "div" ? "÷" : "×";
      const factors = document.createElement("p");
      factors.className = "eoschool-curriculum-activity__cell-factors";
      factors.textContent = `${item.a} ${op} ${item.b}`;
      const given = document.createElement("p");
      given.textContent = item.given == null ? "Sin número" : String(item.given);
      cell.append(factors, given);
      if (item.correct === false) {
        cell.classList.add("eoschool-curriculum-activity__cell--miss");
        const expected = document.createElement("p");
        expected.textContent = `Esperado ${item.expected}`;
        cell.append(expected);
      }
      grid.append(cell);
    }
    body.append(grid);
  }
  for (const item of items) {
    if (item.kind === "mult" || item.kind === "div") continue;
    const block = document.createElement("article");
    block.className = "eoschool-curriculum-activity__answer";
    block.dataset.curriculumScoreAnswer = "";
    if (item.prompt) {
      const prompt = document.createElement("p");
      prompt.textContent = item.prompt;
      block.append(prompt);
    }
    const written = item.rewrite?.trim() || item.answer?.trim() || "";
    if (written) {
      const line = document.createElement("p");
      line.textContent = written;
      block.append(line);
    }
    if (block.childElementCount) body.append(block);
  }
  const misses = facts.filter((fact) => fact.misses > 0 && fact.label);
  if (misses.length) {
    const reinforce = document.createElement("p");
    reinforce.dataset.curriculumScoreReinforce = "";
    reinforce.textContent = `A reforzar: ${misses.map((fact) => fact.label).join(", ")}`;
    body.append(reinforce);
  }
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
