import { showErrorModal } from "./error-modal";
import { clonePdfBytes, downloadPdfBytes } from "./homescool-pdf-preview";
import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";
import { AI_FROM_PLAN_DAY } from "./eoschool-ai-signature";
import {
  fetchMppeDaySheet,
  type MppeCurriculumDaySection,
  type MppeCurriculumDaySheet,
} from "./mppe-curriculum-day-sheet";
import { fetchClassRetryPdf, fetchMppeDayPdfPreview } from "./mppe-curriculum-pdf-preview";
import { DEFAULT_CURRICULUM_STUDENT_KEY } from "./eoschool-curriculum-api";
import { dayPacketHref, dayPacketName } from "./eoschool-day38-packet";
import { mustLog } from "./dev-log";
import { dayHasActivityPhotos, printCardEvaluations, renderCurriculumActivity } from "./eoschool-curriculum-activity";

let sheetCache: Map<string, MppeCurriculumDaySheet> = new Map();
let activePdfBytes: Uint8Array | null = null;
let activePdfName = "dia-mppe.pdf";
let pdfPreviewSeq = 0;
let openDayCard: HTMLElement | null = null;

// Days whose class text is embedded in the API (pkg/pdf/classsrc).
const CLASS_RETRY_DAYS = new Set([40]);

function syncRetryButton(modal: HTMLElement, card: HTMLElement): void {
  const btn = modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-retry]");
  if (!btn) return;
  const planDay = parsePlanDay(card);
  const dayId = card.dataset.curriculumDay ?? "";
  btn.hidden = !(CLASS_RETRY_DAYS.has(planDay) && dayHasActivityPhotos(dayId));
}

async function downloadRetryPdf(card: HTMLElement, btn: HTMLButtonElement): Promise<void> {
  const planDay = parsePlanDay(card);
  const root = document.querySelector<HTMLElement>("[data-curriculum-progress]");
  const studentKey = root?.dataset.curriculumStudentKey || DEFAULT_CURRICULUM_STUDENT_KEY;
  btn.disabled = true;
  try {
    const result = await fetchClassRetryPdf(studentKey, planDay);
    if (!result.ok || !result.pdfBytes?.byteLength) {
      showErrorModal({
        message: result.error ?? "No se pudo generar el repaso.",
        requestId: result.requestId,
      });
      return;
    }
    downloadPdfBytes(result.pdfBytes, result.filename || `dia-${planDay}-repaso.pdf`);
  } finally {
    btn.disabled = false;
  }
}

function pdfActionButtons(modal: HTMLElement): HTMLButtonElement[] {
  return [
    modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-preview]"),
    modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-download]"),
  ].filter((btn): btn is HTMLButtonElement => btn instanceof HTMLButtonElement);
}

function setPdfActionsEnabled(modal: HTMLElement, enabled: boolean): void {
  for (const btn of pdfActionButtons(modal)) btn.disabled = !enabled;
}

function openPdfPreview(bytes: Uint8Array): void {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const url = URL.createObjectURL(new Blob([copy], { type: "application/pdf" }));
  const opened = window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!opened) showErrorModal({ message: "No se pudo abrir la vista previa del PDF." });
}

function setPdfPanelLoading(modal: HTMLElement, loading: boolean): void {
  const loader = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf-loading]");
  const host = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf]");
  if (loader) loader.hidden = !loading;
  if (host) host.toggleAttribute("data-pdf-loading", loading);
  if (loading) setPdfActionsEnabled(modal, false);
}

function parsePlanDay(card: HTMLElement): number {
  const raw = card.dataset.planDay;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) ? n : 0;
}

async function showPackedDayPdf(
  modal: HTMLElement,
  href: string,
  seq: number,
  isStale: () => boolean,
): Promise<boolean> {
  const host = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf]");
  const empty = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf-empty]");
  if (!host) return false;

  let response: Response;
  try {
    response = await fetch(href);
  } catch (err: unknown) {
    if (mustLog) console.log("[curriculum-day-modal] packet fetch failed", { href });
    if (!isStale()) {
      showErrorModal({
        message: err instanceof Error ? err.message : "No se pudo abrir el PDF de las clases de este día.",
      });
    }
    return false;
  }
  if (isStale()) return true;
  if (!response.ok) {
    setPdfPanelLoading(modal, false);
    showErrorModal({ message: "No se pudo abrir el PDF de las clases de este día." });
    if (empty) {
      empty.hidden = false;
      empty.textContent = "No se pudo abrir el PDF de las clases de este día.";
    }
    setPdfActionsEnabled(modal, false);
    return false;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (isStale()) return true;
  if (!bytes.byteLength) return false;

  activePdfBytes = clonePdfBytes(bytes);
  activePdfName = dayPacketName(href);
  if (empty) empty.hidden = true;
  if (isStale()) return true;
  setPdfPanelLoading(modal, false);
  setPdfActionsEnabled(modal, Boolean(activePdfBytes?.byteLength));
  if (mustLog) console.log("[curriculum-day-modal] packet ready", { href, bytes: bytes.byteLength, seq });
  return true;
}

async function loadDaySheet(planDay: number): Promise<MppeCurriculumDaySheet | null> {
  const sheet = await fetchMppeDaySheet(planDay);
  if (!sheet) return null;
  const key = `${sheet.version ?? 1}:${planDay}`;
  const hit = sheetCache.get(key);
  if (hit) return hit;
  sheetCache.set(key, sheet);
  return sheet;
}

function splitLearnings(learning: string): string[] {
  const parts = learning
    .split("·")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : learning.trim() ? [learning.trim()] : [];
}

function paintCopy(target: HTMLElement, text: string, empty: string): void {
  target.replaceChildren();
  const p = document.createElement("p");
  p.className = "eoschool-curriculum-modal__copy";
  p.textContent = text || empty;
  target.append(p);
}

function paintTema(target: HTMLElement, section: MppeCurriculumDaySection | undefined): void {
  const text = section?.topicShort?.trim() || section?.objective?.trim() || "";
  paintCopy(target, text, "Sin tema para esta área.");
}

function paintAprendizajes(target: HTMLElement, section: MppeCurriculumDaySection | undefined): void {
  target.replaceChildren();
  const items = section ? splitLearnings(section.learning) : [];
  if (!items.length) {
    paintCopy(target, "", "Sin aprendizajes para esta área.");
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "eoschool-curriculum-modal__list";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    ul.append(li);
  }
  target.append(ul);
}

function setModalSectionContent(
  modal: HTMLElement,
  card: HTMLElement,
  sectionId: CurriculumPlanSectionId,
  sheet: MppeCurriculumDaySheet | null,
): void {
  const tema = modal.querySelector<HTMLElement>("[data-curriculum-modal-tema]");
  const learn = modal.querySelector<HTMLElement>("[data-curriculum-modal-aprendizajes]");
  if (!tema || !learn) return;
  const fromSheet = sheet?.sections.find((s) => s.id === sectionId);
  if (fromSheet) {
    paintTema(tema, fromSheet);
    paintAprendizajes(learn, fromSheet);
    return;
  }
  const source = card.querySelector<HTMLElement>(`[data-curriculum-section="${sectionId}"]`);
  const objective = source?.querySelector(".eoschool-curriculum__objective");
  const learnings = source?.querySelector(".eoschool-curriculum__learnings");
  const objectiveText = objective?.textContent?.replace(/^\s*Objetivo\s*/i, "").trim() || "";
  paintCopy(tema, objectiveText, "Sin tema para esta área.");
  if (learnings) {
    learn.replaceChildren(learnings.cloneNode(true));
    return;
  }
  paintAprendizajes(learn, undefined);
}

async function showDayPdf(modal: HTMLElement, sheet: MppeCurriculumDaySheet | null): Promise<void> {
  const host = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf]");
  const empty = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf-empty]");
  if (!host) return;

  const seq = ++pdfPreviewSeq;
  const isStale = () => seq !== pdfPreviewSeq;

  host.replaceChildren();
  activePdfBytes = null;
  setPdfPanelLoading(modal, false);

  if (!sheet) {
    if (empty) {
      empty.hidden = false;
      empty.textContent = "Hoja del día en preparación.";
    }
    setPdfActionsEnabled(modal, false);
    return;
  }
  if (empty) empty.hidden = true;
  setPdfPanelLoading(modal, true);

  const packetHref = dayPacketHref(sheet.planDay);
  if (packetHref) {
    await showPackedDayPdf(modal, packetHref, seq, isStale);
    return;
  }

  const preview = await fetchMppeDayPdfPreview(sheet);
  if (isStale()) return;

  if (!preview.ok || !preview.pdfBytes?.byteLength) {
    setPdfPanelLoading(modal, false);
    showErrorModal({
      message: preview.error ?? "No se pudo generar la hoja PDF del día.",
      requestId: preview.requestId,
    });
    if (empty) {
      empty.hidden = false;
      empty.textContent =
        "No se pudo generar el PDF (5 materias en una hoja). Inicia sesión con acceso Homescool para la vista previa.";
    }
    setPdfActionsEnabled(modal, false);
    return;
  }

  activePdfBytes = clonePdfBytes(preview.pdfBytes);
  activePdfName = `dia-${sheet.planDay}-mppe.pdf`;
  if (isStale()) return;
  setPdfPanelLoading(modal, false);
  setPdfActionsEnabled(modal, Boolean(activePdfBytes?.byteLength));
}

function closeModal(modal: HTMLElement): void {
  pdfPreviewSeq += 1;
  setPdfPanelLoading(modal, false);
  modal.hidden = true;
  document.body.classList.remove("eoschool-curriculum-modal-open");
  const host = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf]");
  if (host) host.replaceChildren();
  activePdfBytes = null;
}

function openModal(card: HTMLElement): void {
  const modal = document.querySelector<HTMLElement>("[data-curriculum-day-modal]");
  if (!modal) return;

  const planDay = parsePlanDay(card);
  const dayId = card.dataset.curriculumDay ?? "";
  const titleEl = modal.querySelector<HTMLElement>("[data-curriculum-modal-title]");
  const scheduledRaw = card.dataset.curriculumScheduled?.split(",").map((s) => s.trim()) ?? [];
  const dayKind = card.dataset.curriculumDayKind ?? "teach";
  if (titleEl) {
    const dayNumber = planDay ? String(planDay) : dayId.replace(/^d/, "");
    const base = `Día ${dayNumber}`;
    let label = base;
    if (dayKind === "holiday") {
      const holidayName = card.dataset.holidayName?.trim();
      label = holidayName ? `${base} · Feriado — ${holidayName}` : `${base} · Feriado`;
    } else if (dayKind === "exposition") {
      label = `${base} · Exposiciones`;
    }
    titleEl.textContent = dayNumber || "—";
    titleEl.setAttribute("aria-label", label);
  }

  modal.hidden = false;
  openDayCard = card;
  syncRetryButton(modal, card);
  document.body.classList.add("eoschool-curriculum-modal-open");

  const tabs = modal.querySelectorAll<HTMLButtonElement>("[data-curriculum-modal-tab]");
  let sheet: MppeCurriculumDaySheet | null = null;

  const loadPromise = planDay ? loadDaySheet(planDay) : Promise.resolve(null);

  loadPromise
    .then((loaded) => {
      sheet = loaded;
      const scheduled: string[] = loaded?.scheduledSections?.length
        ? [...loaded.scheduledSections]
        : scheduledRaw.length
          ? [...scheduledRaw]
          : loaded?.sections.map((s) => s.id) ?? ["bib"];
      const week = Number(card.dataset.curriculumWeek || "0");
      if (week >= 8 && dayKind !== "holiday" && !scheduled.includes("eng")) scheduled.push("eng");
      const planDayNum = Number(card.dataset.planDay || "0");
      if (planDayNum >= AI_FROM_PLAN_DAY && dayKind !== "holiday" && !scheduled.includes("ia")) {
        scheduled.push("ia");
      }
      tabs.forEach((tab) => {
        const sid = tab.dataset.curriculumModalTab as CurriculumPlanSectionId;
        const has = scheduled.includes(sid);
        tab.disabled = !has;
        tab.hidden = !has;
        tab.classList.toggle("eoschool-curriculum-modal__tab--no-class", !has);
      });
      void showDayPdf(modal, loaded);
      const first = (scheduled[0] as CurriculumPlanSectionId | undefined) ?? "bib";
      activateTab(modal, card, first, loaded);
    })
    .catch((err: unknown) => {
      showErrorModal({
        message: err instanceof Error ? err.message : "No se pudo cargar la hoja del día.",
      });
    });

  tabs.forEach((tab) => {
    tab.onclick = () => {
      const sid = tab.dataset.curriculumModalTab as CurriculumPlanSectionId;
      activateTab(modal, card, sid, sheet);
    };
  });
}

function activateTab(
  modal: HTMLElement,
  card: HTMLElement,
  sectionId: CurriculumPlanSectionId,
  sheet: MppeCurriculumDaySheet | null,
): void {
  modal.querySelectorAll<HTMLButtonElement>("[data-curriculum-modal-tab]").forEach((tab) => {
    const active = tab.dataset.curriculumModalTab === sectionId;
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.classList.toggle("eoschool-curriculum-modal__tab--active", active);
  });
  setModalSectionContent(modal, card, sectionId, sheet);
  renderCurriculumActivity(modal, card, sectionId);
}

export function bindCurriculumDayModalShell(modal: HTMLElement): void {
  if (modal.dataset.curriculumModalBound === "true") return;
  modal.dataset.curriculumModalBound = "true";

  modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-close]")?.addEventListener("click", () => {
    closeModal(modal);
  });

  modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-download]")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const btn = ev.currentTarget;
    if (btn instanceof HTMLButtonElement && btn.disabled) return;
    if (!activePdfBytes?.byteLength) return;
    downloadPdfBytes(clonePdfBytes(activePdfBytes), activePdfName);
  });

  modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-preview]")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const btn = ev.currentTarget;
    if (btn instanceof HTMLButtonElement && btn.disabled) return;
    if (!activePdfBytes?.byteLength) return;
    if (mustLog) console.log("[curriculum-day-modal] preview", { name: activePdfName });
    openPdfPreview(activePdfBytes);
  });

  modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-retry]")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const btn = ev.currentTarget;
    if (!(btn instanceof HTMLButtonElement) || btn.disabled || btn.hidden || !openDayCard) return;
    void downloadRetryPdf(openDayCard, btn);
  });

  modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-print-evals]")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!openDayCard) return;
    printCardEvaluations(openDayCard);
  });

  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) closeModal(modal);
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modal.hidden) closeModal(modal);
  });
}

export function initCurriculumDayModal(root: HTMLElement | null): void {
  const modal = document.querySelector<HTMLElement>("[data-curriculum-day-modal]");
  if (modal) {
    bindCurriculumDayModalShell(modal);
  }

  if (!root) return;
  if (root.dataset.dayModalBound === "true") return;
  root.dataset.dayModalBound = "true";

  root.addEventListener("click", (ev) => {
    const target = ev.target;
    if (
      target instanceof HTMLElement &&
      (target.closest("[data-curriculum-subject-toggle]") ||
        target.closest("[data-expo-route]") ||
        target.closest("[data-eng-sheet]"))
    ) {
      ev.stopPropagation();
      return;
    }

    const opener = target instanceof Element
      ? target.closest<HTMLElement>("[data-curriculum-day-bubble], [data-curriculum-day-open]")
      : null;
    const card = opener?.closest<HTMLElement>("[data-curriculum-day]") ?? null;
    if (!card) return;
    if (mustLog) console.log("[curriculum-day-modal] open", { day: card.dataset.curriculumDay });
    openModal(card);
  });
}
