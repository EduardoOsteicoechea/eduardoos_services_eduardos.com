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
      span.hidden = false;
      span.textContent = "";
      span.removeAttribute("aria-label");
      span.removeAttribute("title");
      span.removeAttribute("role");
      span.removeAttribute("tabindex");
      span.onclick = null;
      span.onkeydown = null;
      return;
    }
    const label =
      sectionEl.querySelector(".eoschool-curriculum__subject-icon")?.getAttribute("title")?.trim() || sectionId;
    const key = sectionProgressKey(dayId, sectionId);
    span.hidden = false;
    span.textContent = String(score);
    span.title = "Ver evaluación";
    span.tabIndex = 0;
    span.setAttribute("role", "button");
    span.setAttribute("aria-label", `Ver evaluación. Puntaje ${score}`);
    span.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openScoreReasonDialog(document.body, {
        label,
        score,
        note: scoreNotes.get(key) || "",
        record: scoreRecords.get(key),
      }, scoreFacts, true);
    };
    span.onkeydown = (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      span.click();
    };
  });
  paintCurriculumSubjectPhotos(root);
  bindCurriculumPhotoTooltip(root);
}

function curriculumPhotoTip(): HTMLElement {
  let tip = document.querySelector<HTMLElement>("[data-curriculum-photo-tip]");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "eoschool-curriculum__photo-tip";
    tip.dataset.curriculumPhotoTip = "";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    document.body.append(tip);
  }
  return tip;
}

function bindCurriculumPhotoTooltip(root: HTMLElement): void {
  if (root.dataset.photoTipBound === "true") return;
  root.dataset.photoTipBound = "true";

  const hide = () => {
    const tip = document.querySelector<HTMLElement>("[data-curriculum-photo-tip]");
    if (tip) tip.hidden = true;
  };

  const show = (button: HTMLElement) => {
    const text = button.getAttribute("title") || button.getAttribute("aria-label") || "";
    if (!text) return;
    const tip = curriculumPhotoTip();
    tip.textContent = text;
    tip.hidden = false;
    const anchor = button.getBoundingClientRect();
    const box = tip.getBoundingClientRect();
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gap = 0.5 * rootPx;
    let left = anchor.left - box.width - gap;
    let top = anchor.top + anchor.height / 2 - box.height / 2;
    if (left < gap) left = anchor.right + gap;
    if (left + box.width > window.innerWidth - gap) {
      left = Math.max(gap, window.innerWidth - box.width - gap);
      top = anchor.top - box.height - gap;
    }
    if (top < gap) top = anchor.bottom + gap;
    if (top + box.height > window.innerHeight - gap) top = Math.max(gap, window.innerHeight - box.height - gap);
    tip.style.left = `${left / rootPx}rem`;
    tip.style.top = `${top / rootPx}rem`;
  };

  const photoFrom = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    const button = target.closest<HTMLElement>("[data-curriculum-subject-photo]");
    if (!button || !root.contains(button)) return null;
    return button;
  };

  root.addEventListener("pointerover", (ev) => {
    const button = photoFrom(ev.target);
    if (button) show(button);
  });
  root.addEventListener("pointerout", (ev) => {
    const button = photoFrom(ev.target);
    if (!button) return;
    const next = ev.relatedTarget;
    if (next instanceof Node && button.contains(next)) return;
    hide();
  });
  root.addEventListener("focusin", (ev) => {
    const button = photoFrom(ev.target);
    if (button) show(button);
  });
  root.addEventListener("focusout", (ev) => {
    if (photoFrom(ev.target)) hide();
  });
  window.addEventListener("scroll", hide, true);
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
  document.dispatchEvent(new CustomEvent("eoschool-curriculum-progress", { detail: data }));
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
      const label =
        card.querySelector(`[data-curriculum-section="${sectionId}"] .eoschool-curriculum__subject-icon`)?.getAttribute("title")?.trim()
        || sectionId;
      openScoreReasonDialog(modal, {
        label,
        score,
        note: scoreNotes.get(key) || "",
        record: scoreRecords.get(key),
      }, scoreFacts, false);
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

type EvalBlock = {
  label: string;
  score: number | null;
  note: string;
  record?: CurriculumActivityRecord;
};

const SECTION_PRINT_LABEL: Record<string, string> = {
  bib: "Biblia",
  ide: "Identidad",
  len: "Lenguaje",
  mat: "Matemáticas",
  cie: "Ciencias",
  eng: "Inglés",
  ia: "Inteligencia artificial",
};

function escapePrint(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemPrintRows(item: CurriculumActivityItem): { ask: string; wrote: string; fix: string } {
  if (item.kind === "mult" || item.kind === "div") {
    const op = item.kind === "div" ? "÷" : "×";
    return {
      ask: `${item.a ?? ""} ${op} ${item.b ?? ""}`.trim(),
      wrote: item.given == null ? "Sin número" : String(item.given),
      fix: item.correct === false && item.expected != null ? String(item.expected) : "",
    };
  }
  return {
    ask: item.prompt?.trim() || "",
    wrote: item.answer?.trim() || "",
    fix: item.rewrite?.trim() || "",
  };
}

export function evaluationPrintDocument(title: string, blocks: EvalBlock[]): string {
  const sections = blocks.map((block) => {
    const head = `${block.label}${block.score == null ? "" : ` · ${block.score}`}`;
    const summary = block.record?.summary?.trim() || block.note.trim();
    const rows = (block.record?.items || [])
      .map((item) => itemPrintRows(item))
      .filter((row) => row.ask || row.wrote || row.fix);
    const questions = rows.length
      ? rows.map((row, index) => `
        <article>
          <h3>${index + 1}. ${escapePrint(row.ask || "Pregunta")}</h3>
          <p><strong>Respuesta.</strong> ${escapePrint(row.wrote || "Sin respuesta.")}</p>
          ${row.fix ? `<p><strong>Corrección.</strong> ${escapePrint(row.fix)}</p>` : ""}
        </article>`).join("")
      : `<p>${escapePrint(summary || "Esta materia no tiene preguntas anotadas.")}</p>`;
    const lead = rows.length && summary ? `<p>${escapePrint(summary)}</p>` : "";
    return `<section><h2>${escapePrint(head)}</h2>${lead}${questions}</section>`;
  }).join("");
  const body = sections || "<p>Este día no tiene evaluaciones.</p>";
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${escapePrint(title)}</title>
    <style>
      @page { size: letter; margin: 1.5rem; }
      body { margin: 0; font-family: sans-serif; font-size: 0.875rem; line-height: 1.4; color: #121212; }
      h1 { font-size: 1.25rem; margin: 0 0 1rem; }
      h2 { font-size: 1rem; margin: 1rem 0 0.5rem; }
      h3 { font-size: 0.875rem; margin: 0.75rem 0 0.25rem; }
      p { margin: 0 0 0.25rem; }
      section { break-inside: avoid; margin-bottom: 1rem; }
    </style></head><body><h1>${escapePrint(title)}</h1>${body}</body></html>`;
}

function printEvaluationDocument(title: string, blocks: EvalBlock[]): void {
  const html = evaluationPrintDocument(title, blocks);
  let frame = document.querySelector<HTMLIFrameElement>("[data-curriculum-day-print-frame]");
  if (!frame) {
    frame = document.createElement("iframe");
    frame.dataset.curriculumDayPrintFrame = "";
    frame.setAttribute("title", "Impresión de la evaluación");
    frame.className = "eoschool-curriculum-modal__print-frame";
    document.body.append(frame);
  }
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) return;
  doc.open();
  doc.write(html);
  doc.close();
  win.focus();
  window.setTimeout(() => win.print(), 40);
}

export function printCardEvaluations(card: HTMLElement): void {
  const dayId = card.dataset.curriculumDay || "";
  const dayNumber = card.dataset.planDay || dayId.replace(/^d/, "");
  const blocks: EvalBlock[] = [];
  card.querySelectorAll<HTMLElement>("[data-curriculum-section]").forEach((sectionEl) => {
    const sectionId = sectionEl.dataset.curriculumSection || "";
    if (!dayId || !sectionId) return;
    const key = sectionProgressKey(dayId, sectionId as CurriculumPlanSectionId);
    const score = scores.get(key);
    const record = scoreRecords.get(key);
    const note = scoreNotes.get(key) || "";
    if (score == null && !record && !note) return;
    const label =
      sectionEl.querySelector(".eoschool-curriculum__subject-icon")?.getAttribute("title")?.trim()
      || SECTION_PRINT_LABEL[sectionId]
      || sectionId;
    blocks.push({ label, score: score ?? null, note, record });
  });
  printEvaluationDocument(`Evaluaciones · Día ${dayNumber}`, blocks);
}

function openScoreReasonDialog(
  host: HTMLElement,
  block: EvalBlock,
  facts: CurriculumActivityFact[],
  viewport: boolean,
): void {
  host.querySelector("[data-curriculum-score-reason]")?.remove();
  const layer = document.createElement("div");
  layer.className = viewport
    ? "eoschool-curriculum-activity__reason eoschool-curriculum-activity__reason--viewport"
    : "eoschool-curriculum-activity__reason";
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
  const actions = document.createElement("div");
  actions.className = "eoschool-curriculum-activity__reason-actions";
  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.className = "eoschool-curriculum-activity__why-open";
  printBtn.dataset.curriculumScorePrint = "";
  printBtn.textContent = "Imprimir";
  printBtn.addEventListener("click", () => {
    const scoreBit = block.score == null ? "" : ` · ${block.score}`;
    printEvaluationDocument(`Evaluación · ${block.label}${scoreBit}`, [block]);
  });
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "icon-btn eoschool-curriculum-activity__reason-close";
  closeBtn.setAttribute("aria-label", "Cerrar");
  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "close";
  closeBtn.append(icon);
  actions.append(printBtn, closeBtn);
  top.append(title, actions);

  const body = document.createElement("div");
  body.className = "eoschool-curriculum-activity__reason-body";
  const summary = document.createElement("p");
  summary.dataset.curriculumScoreReasonText = "";
  summary.textContent = block.record?.summary?.trim() || block.note || "Este puntaje no tiene justificación escrita.";
  body.append(summary);
  const rewrite = block.record?.rewrite?.trim() || "";
  if (rewrite) {
    const line = document.createElement("p");
    line.dataset.curriculumScoreRewrite = "";
    line.textContent = rewrite;
    body.append(line);
  }
  const items = block.record?.items || [];
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
    const answer = document.createElement("article");
    answer.className = "eoschool-curriculum-activity__answer";
    answer.dataset.curriculumScoreAnswer = "";
    const question = item.prompt?.trim() || "";
    if (question) {
      const prompt = document.createElement("p");
      prompt.dataset.curriculumScorePrompt = "";
      prompt.textContent = question;
      answer.append(prompt);
    }
    const written = item.answer?.trim() || item.rewrite?.trim() || "";
    if (written) {
      const line = document.createElement("p");
      line.dataset.curriculumScoreWrote = "";
      line.textContent = written;
      answer.append(line);
    }
    if (answer.childElementCount) body.append(answer);
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
  host.append(layer);
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
