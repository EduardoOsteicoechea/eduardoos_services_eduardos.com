import { showErrorModal } from "./error-modal";
import type { EoschoolDocument } from "./homescool";
import {
  downloadPdfBytes,
  fetchHomescoolPdfPreview,
  renderHomescoolPdfPreview,
} from "./homescool-pdf-preview";
import {
  planDayManifest,
  type CurriculumPlanSectionId,
} from "./eoschool-curriculum-plan-classes";
import { mustLog } from "./dev-log";

type LoadedClass = {
  sectionId: CurriculumPlanSectionId;
  label: string;
  doc: EoschoolDocument;
  jsonUrl: string;
};

let classCache: Map<string, LoadedClass> = new Map();
let activePdfBytes: Uint8Array | null = null;
let activePdfName = "clase.pdf";

function parsePlanDay(card: HTMLElement): number {
  const raw = card.dataset.planDay;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) ? n : 0;
}

async function fetchClassJson(url: string): Promise<EoschoolDocument> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    throw new Error(`No se pudo cargar la clase (${res.status}).`);
  }
  return (await res.json()) as EoschoolDocument;
}

async function ensurePlanDayClasses(planDay: number): Promise<LoadedClass[]> {
  const manifest = planDayManifest(planDay);
  if (!manifest) return [];

  const out: LoadedClass[] = [];
  for (const section of manifest.sections) {
    const cacheKey = section.jsonUrl;
    const hit = classCache.get(cacheKey);
    if (hit) {
      out.push(hit);
      continue;
    }
    const doc = await fetchClassJson(section.jsonUrl);
    const loaded: LoadedClass = {
      sectionId: section.sectionId,
      label: section.label,
      doc,
      jsonUrl: section.jsonUrl,
    };
    classCache.set(cacheKey, loaded);
    out.push(loaded);
  }
  return out;
}

function setModalSectionContent(modal: HTMLElement, card: HTMLElement, sectionId: CurriculumPlanSectionId): void {
  const source = card.querySelector<HTMLElement>(`[data-curriculum-section="${sectionId}"]`);
  const target = modal.querySelector<HTMLElement>("[data-curriculum-modal-section-content]");
  if (!target) return;
  if (source) {
    const clone = source.querySelector(".eoschool-curriculum__subject-body");
    if (clone) {
      target.replaceChildren(clone.cloneNode(true));
    } else {
      target.textContent = "";
      const inner = source.cloneNode(true) as HTMLElement;
      inner.querySelectorAll("[data-curriculum-section-check]").forEach((el) => el.remove());
      target.append(inner);
    }
  } else {
    target.textContent = "";
  }
}

async function showSectionPdf(
  modal: HTMLElement,
  loaded: LoadedClass | undefined,
): Promise<void> {
  const host = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf]");
  const empty = modal.querySelector<HTMLElement>("[data-curriculum-modal-pdf-empty]");
  const downloadBtn = modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-download]");
  if (!host) return;

  host.replaceChildren();
  activePdfBytes = null;
  if (downloadBtn) downloadBtn.disabled = true;

  if (!loaded) {
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  const preview = await fetchHomescoolPdfPreview(loaded.doc);
  if (!preview.ok || !preview.pdfBytes) {
    showErrorModal({
      message: preview.error ?? "No se pudo generar la vista previa PDF.",
      requestId: preview.requestId,
    });
    if (empty) {
      empty.hidden = false;
      empty.textContent =
        "Inicia sesión con acceso a Homescool para generar y descargar el PDF de la clase.";
    }
    return;
  }

  activePdfBytes = preview.pdfBytes;
  const safeTitle = loaded.doc.title.replace(/[^\w\sáéíóúñ-]/gi, "").trim() || "clase";
  activePdfName = `${safeTitle}.pdf`;
  if (downloadBtn) downloadBtn.disabled = false;

  await renderHomescoolPdfPreview(host, preview.pdfBytes);
}

function closeModal(modal: HTMLElement): void {
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
  let classes: LoadedClass[] = [];
  const classesPromise = planDay ? ensurePlanDayClasses(planDay) : Promise.resolve([]);

  classesPromise
    .then((loaded) => {
      classes = loaded;
      tabs.forEach((tab) => {
        const sid = tab.dataset.curriculumModalTab as CurriculumPlanSectionId;
        const hasClass = loaded.some((c) => c.sectionId === sid);
        tab.disabled = false;
        tab.classList.toggle("eoschool-curriculum-modal__tab--no-class", !hasClass);
      });
      const first = loaded[0]?.sectionId ?? "bib";
      activateTab(modal, card, first, loaded);
    })
    .catch((err: unknown) => {
      showErrorModal({
        message: err instanceof Error ? err.message : "No se pudieron cargar las clases del día.",
      });
    });

  tabs.forEach((tab) => {
    tab.onclick = () => {
      const sid = tab.dataset.curriculumModalTab as CurriculumPlanSectionId;
      activateTab(modal, card, sid, classes);
    };
  });
}

function activateTab(
  modal: HTMLElement,
  card: HTMLElement,
  sectionId: CurriculumPlanSectionId,
  classes: LoadedClass[],
): void {
  modal.querySelectorAll<HTMLButtonElement>("[data-curriculum-modal-tab]").forEach((tab) => {
    const active = tab.dataset.curriculumModalTab === sectionId;
    tab.setAttribute("aria-selected", active ? "true" : "false");
    tab.classList.toggle("eoschool-curriculum-modal__tab--active", active);
  });

  setModalSectionContent(modal, card, sectionId);
  const loaded = classes.find((c) => c.sectionId === sectionId);
  void showSectionPdf(modal, loaded);
}

export function initCurriculumDayModal(root: HTMLElement | null): void {
  if (!root) return;
  if (root.dataset.dayModalBound === "true") return;
  root.dataset.dayModalBound = "true";

  const modal = document.querySelector<HTMLElement>("[data-curriculum-day-modal]");
  if (!modal) return;

  modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-close]")?.addEventListener("click", () => {
    closeModal(modal);
  });

  modal.querySelector<HTMLButtonElement>("[data-curriculum-modal-download]")?.addEventListener("click", () => {
    if (!activePdfBytes) return;
    downloadPdfBytes(activePdfBytes, activePdfName);
  });

  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) closeModal(modal);
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !modal.hidden) closeModal(modal);
  });

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
