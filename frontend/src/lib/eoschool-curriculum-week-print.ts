import { showErrorModal } from "./error-modal";
import { clonePdfBytes, downloadPdfBytes } from "./homescool-pdf-preview";
import { fetchMppeDaySheet, type MppeCurriculumDaySheet } from "./mppe-curriculum-day-sheet";
import { fetchMppeWeekPdfPreview } from "./mppe-curriculum-pdf-preview";
import { mustLog } from "./dev-log";

function parseWeekPlanDays(section: HTMLElement): number[] {
  const raw = section.dataset.weekPlanDays ?? "";
  return raw
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

async function printWeekPdf(section: HTMLElement, button: HTMLButtonElement): Promise<void> {
  const week = Number.parseInt(section.dataset.week ?? "", 10);
  const planDays = parseWeekPlanDays(section);
  if (!planDays.length) {
    showErrorModal({ message: "No hay días de planificación en esta semana." });
    return;
  }

  button.disabled = true;
  button.setAttribute("aria-busy", "true");

  try {
    const sheets = await Promise.all(planDays.map((d) => fetchMppeDaySheet(d)));
    if (sheets.some((s) => !s)) {
      showErrorModal({ message: "No se pudieron cargar todas las hojas de la semana." });
      return;
    }
    const ordered = sheets.filter((s): s is MppeCurriculumDaySheet => s != null);
    const preview = await fetchMppeWeekPdfPreview(ordered);
    if (!preview.ok || !preview.pdfBytes?.byteLength) {
      showErrorModal({
        message: preview.error ?? "No se pudo generar el PDF de la semana.",
        requestId: preview.requestId,
      });
      return;
    }
    const name = Number.isFinite(week) && week > 0 ? `semana-${week}-mppe.pdf` : "semana-mppe.pdf";
    downloadPdfBytes(clonePdfBytes(preview.pdfBytes), name);
    if (mustLog) console.log("[curriculum-week-print] downloaded", { week, days: planDays });
  } catch (err: unknown) {
    showErrorModal({
      message: err instanceof Error ? err.message : "No se pudo generar el PDF de la semana.",
    });
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}

export function initCurriculumWeekPrint(root: HTMLElement | null): void {
  if (!root) return;
  if (root.dataset.weekPrintBound === "true") return;
  root.dataset.weekPrintBound = "true";

  root.addEventListener("click", (ev) => {
    const btn = ev.target instanceof Element ? ev.target.closest<HTMLButtonElement>("[data-curriculum-week-print]") : null;
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    const section = btn.closest<HTMLElement>("[data-curriculum-week]");
    if (!section) return;
    void printWeekPdf(section, btn);
  });
}
