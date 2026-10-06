import { showErrorModal } from "./error-modal";
import { clonePdfBytes, downloadPdfBytes, renderHomescoolPdfPreview } from "./homescool-pdf-preview";
import type { CurriculumPlanSectionId } from "./eoschool-curriculum-plan-classes";
import {
  bindCurriculumMaterialsPanel,
  loadCurriculumMaterialsPanel,
} from "./eoschool-curriculum-materials";
import {
  fetchMppeDaySheet,
  type MppeCurriculumDaySection,
  type MppeCurriculumDaySheet,
} from "./mppe-curriculum-day-sheet";
import { fetchMppeDayPdfPreview } from "./mppe-curriculum-pdf-preview";
import { mustLog } from "./dev-log";

let materialsRoot: HTMLElement | null = null;

let sheetCache: Map<string, MppeCurriculumDaySheet> = new Map();
let activePdfBytes: Uint8Array | null = null;
let activePdfName = "dia-mppe.pdf";
let pdfPreviewSeq = 0;

function setPdfPanelLoading(modal: HTMLElement, loading: boolean): void {
  const loader = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf-loading]");
  const downloadBtn = modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-download]");
  const host = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf]");
  if (loader) loader.hidden = !loading;
  if (host) host.toggleAttribute("data-pdf-loading", loading);
  if (downloadBtn && loading) downloadBtn.disabled = true;
}

function parsePlanDay(card: HTMLElement): number {
  const raw = card.dataset.planDay;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) ? n : 0;
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

function renderSectionContent(target: HTMLElement, section: MppeCurriculumDaySection | undefined): void {
  target.replaceChildren();
  if (!section) return;

  const root = document.createElement("div");
  root.className = "mppe-day-sheet";

  const area = document.createElement("p");
  area.className = "mppe-day-sheet__area";
  area.textContent = section.label;
  root.append(area);

  if (section.objective?.trim()) {
    const objBlock = document.createElement("div");
    objBlock.className = "mppe-day-sheet__block";
    const objLabel = document.createElement("p");
    objLabel.className = "mppe-day-sheet__label";
    objLabel.textContent = "Objetivo:";
    const objBody = document.createElement("p");
    objBody.className = "mppe-day-sheet__text";
    objBody.textContent = section.objective;
    objBlock.append(objLabel, objBody);
    root.append(objBlock);
  }

  const learnItems = splitLearnings(section.learning);
  if (learnItems.length) {
    const learnBlock = document.createElement("div");
    learnBlock.className = "mppe-day-sheet__block";
    const learnLabel = document.createElement("p");
    learnLabel.className = "mppe-day-sheet__label";
    learnLabel.textContent = "Aprendizajes:";
    const ul = document.createElement("ul");
    ul.className = "mppe-day-sheet__list";
    for (const item of learnItems) {
      const li = document.createElement("li");
      li.textContent = item;
      ul.append(li);
    }
    learnBlock.append(learnLabel, ul);
    root.append(learnBlock);
  }

  const canDo = section.canDo?.trim();
  if (canDo) {
    const metaBlock = document.createElement("div");
    metaBlock.className = "mppe-day-sheet__block";
    const metaLabel = document.createElement("p");
    metaLabel.className = "mppe-day-sheet__label";
    metaLabel.textContent = "Meta del día:";
    const metaBody = document.createElement("p");
    metaBody.className = "mppe-day-sheet__text";
    metaBody.textContent = canDo;
    metaBlock.append(metaLabel, metaBody);
    root.append(metaBlock);
  }

  const acts = (section.activities ?? []).map((a) => a.trim()).filter(Boolean);
  if (acts.length) {
    const actBlock = document.createElement("div");
    actBlock.className = "mppe-day-sheet__block";
    const actLabel = document.createElement("p");
    actLabel.className = "mppe-day-sheet__label";
    actLabel.textContent = "Actividad sugerida:";
    const ul = document.createElement("ul");
    ul.className = "mppe-day-sheet__list";
    for (const act of acts) {
      const li = document.createElement("li");
      li.textContent = act;
      ul.append(li);
    }
    actBlock.append(actLabel, ul);
    root.append(actBlock);
  }

  target.append(root);
}

function setModalSectionContent(
  modal: HTMLElement,
  card: HTMLElement,
  sectionId: CurriculumPlanSectionId,
  sheet: MppeCurriculumDaySheet | null,
): void {
  const target = modal.querySelector<HTMLElement>("[data-curriculum-modal-section-content]");
  if (!target) return;
  const fromSheet = sheet?.sections.find((s) => s.id === sectionId);
  if (fromSheet) {
    renderSectionContent(target, fromSheet);
    return;
  }
  const source = card.querySelector<HTMLElement>(`[data-curriculum-section="${sectionId}"]`);
  if (source) {
    const clone =
      source.querySelector(".eoschool-curriculum__subject-detail") ??
      source.querySelector(".eoschool-curriculum__subject-body");
    if (clone) target.replaceChildren(clone.cloneNode(true));
  } else {
    target.textContent = "";
  }
}

async function showDayPdf(modal: HTMLElement, sheet: MppeCurriculumDaySheet | null): Promise<void> {
  const host = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf]");
  const empty = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf-empty]");
  const downloadBtn = modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-download]");
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
    if (downloadBtn) downloadBtn.disabled = true;
    return;
  }
  if (empty) empty.hidden = true;
  setPdfPanelLoading(modal, true);

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
    if (downloadBtn) downloadBtn.disabled = true;
    return;
  }

  activePdfBytes = clonePdfBytes(preview.pdfBytes);
  activePdfName = `dia-${sheet.planDay}-mppe.pdf`;

  try {
    await renderHomescoolPdfPreview(host, preview.pdfBytes, {
      fitWidth: true,
      pageWidthMm: preview.pageWidthMm,
      pageHeightMm: preview.pageHeightMm,
      isStale,
    });
  } catch (err: unknown) {
    if (!isStale()) {
      setPdfPanelLoading(modal, false);
      showErrorModal({
        message: err instanceof Error ? err.message : "No se pudo mostrar la vista previa del PDF.",
      });
    }
    if (!isStale() && activePdfBytes?.byteLength) {
      if (downloadBtn) downloadBtn.disabled = false;
    }
    return;
  }

  if (isStale()) return;
  setPdfPanelLoading(modal, false);
  if (downloadBtn) downloadBtn.disabled = !activePdfBytes?.byteLength;
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
  const titleEl = modal.querySelector("[data-curriculum-modal-title]");
  if (titleEl) titleEl.textContent = planDay ? `Día ${planDay}` : `Día ${dayId.replace(/^d/, "")}`;

  modal.hidden = false;
  document.body.classList.add("eoschool-curriculum-modal-open");

  const tabs = modal.querySelectorAll<HTMLButtonElement>("[data-curriculum-modal-tab]");
  let sheet: MppeCurriculumDaySheet | null = null;

  const loadPromise = planDay ? loadDaySheet(planDay) : Promise.resolve(null);

  loadPromise
    .then((loaded) => {
      sheet = loaded;
      tabs.forEach((tab) => {
        const sid = tab.dataset.curriculumModalTab as CurriculumPlanSectionId;
        const has = loaded?.sections.some((s) => s.id === sid) ?? false;
        tab.disabled = false;
        tab.classList.toggle("eoschool-curriculum-modal__tab--no-class", !has);
      });
      void showDayPdf(modal, loaded);
      activateTab(modal, card, "bib", loaded);
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
  const dayId = card.dataset.curriculumDay ?? "";
  if (dayId) {
    void loadCurriculumMaterialsPanel(modal, materialsRoot, dayId, sectionId);
  }
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

  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) closeModal(modal);
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modal.hidden) closeModal(modal);
  });
}

export function initCurriculumDayModal(root: HTMLElement | null): void {
  materialsRoot = root;
  const modal = document.querySelector<HTMLElement>("[data-curriculum-day-modal]");
  if (modal) {
    bindCurriculumDayModalShell(modal);
    bindCurriculumMaterialsPanel(modal, root);
  }

  if (!root) return;
  if (root.dataset.dayModalBound === "true") return;
  root.dataset.dayModalBound = "true";

  root.addEventListener("click", (ev) => {
    const target = ev.target;
    if (target instanceof HTMLElement && target.closest(".eoschool-curriculum__section-check")) {
      ev.stopPropagation();
      return;
    }

    const card = target instanceof Element ? target.closest<HTMLElement>("[data-curriculum-day-trigger]") : null;
    if (!card) return;
    if (mustLog) console.log("[curriculum-day-modal] open", { day: card.dataset.curriculumDay });
    openModal(card);
  });

  root.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const card = (ev.target as HTMLElement | null)?.closest<HTMLElement>("[data-curriculum-day-trigger]");
    if (!card) return;
    ev.preventDefault();
    openModal(card);
  });
}
