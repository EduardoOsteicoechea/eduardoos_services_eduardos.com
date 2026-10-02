/**
 * Letter v2 HTML mirror of the Go PDF grid (52×3 slots, cabecera, images band).
 * Line text is taken as-authored — no reflow.
 */
import type { EoschoolDocument, EoschoolSlot } from "./homescool";
import { subjectDisplayName } from "./homescool-subjects";

const COLS = 3;
const LINES = 52;

export function hasLetterV2Slots(doc: EoschoolDocument): boolean {
  return Array.isArray(doc.lesson?.slotSequence) && doc.lesson!.slotSequence!.length === 156;
}

export function renderLetterV2Page(doc: EoschoolDocument): HTMLElement {
  const page = el("article", "homescool-letter-page homescool-letter-v2");
  page.setAttribute("data-homescool-letter-v2", "1");
  page.setAttribute(
    "aria-label",
    `${subjectDisplayName(doc.subject)} · ${doc.title || "Clase"}`,
  );

  page.append(buildCabecera1(doc), buildCabecera2(), buildMainGrid(doc), buildImagesBand(doc));
  return page;
}

function buildCabecera1(doc: EoschoolDocument): HTMLElement {
  const row = el("div", "homescool-letter-v2__cabecera homescool-letter-v2__cabecera--1");
  const code = `${doc.subject}-c${doc.cycle}-w${doc.week}-d${doc.day}-l${doc.level}`;
  row.append(
    fieldBox(subjectDisplayName(doc.subject), "homescool-letter-v2__field--name"),
    fieldBox(doc.title || "", "homescool-letter-v2__field--topic"),
    fieldBox(code, "homescool-letter-v2__field--code"),
  );
  return row;
}

function buildCabecera2(): HTMLElement {
  const row = el("div", "homescool-letter-v2__cabecera homescool-letter-v2__cabecera--2");
  for (const label of ["Fecha:", "Estudiante:", "Revisor:", "Firma:"]) {
    row.append(fieldBox(label, "homescool-letter-v2__field--meta"));
  }
  return row;
}

function buildMainGrid(doc: EoschoolDocument): HTMLElement {
  const main = el("div", "homescool-letter-v2__main");
  const byCol: EoschoolSlot[][] = [[], [], []];
  for (const s of doc.lesson?.slotSequence || []) {
    if (s.column >= 1 && s.column <= COLS) byCol[s.column - 1]!.push(s);
  }
  for (let c = 0; c < COLS; c++) {
    const col = el("div", "homescool-letter-v2__col");
    col.setAttribute("data-col", String(c + 1));
    const lines = byCol[c]!.slice().sort((a, b) => a.line - b.line);
    const byLine = new Map(lines.map((s) => [s.line, s]));
    for (let line = 1; line <= LINES; line++) {
      const slot = byLine.get(line);
      const row = el("div", "homescool-letter-v2__line");
      row.setAttribute("data-line", String(line));
      row.setAttribute("data-kind", slot?.kind || "blank");
      if (slot?.kind === "heading") row.classList.add("homescool-letter-v2__line--heading");
      if (slot?.kind === "question") row.classList.add("homescool-letter-v2__line--question");
      if (slot?.kind === "option") row.classList.add("homescool-letter-v2__line--option");
      if (slot?.text) row.textContent = slot.text;
      col.append(row);
    }
    main.append(col);
  }
  return main;
}

function buildImagesBand(doc: EoschoolDocument): HTMLElement {
  const band = el("div", "homescool-letter-v2__images");
  const img = el("img", "homescool-letter-v2__practice") as HTMLImageElement;
  img.alt = "Práctica visual";
  img.src = `/homescool/media/week${doc.week}/practice-images/${doc.subject}-c3-w${doc.week}-practice.jpg`;
  img.loading = "lazy";
  img.onerror = () => {
    img.remove();
    const fallback = el("p", "homescool-letter-v2__images-fallback");
    fallback.textContent =
      doc.lesson?.imageBandInstruction?.trim() || "Práctica visual (banda inferior)";
    band.append(fallback);
  };
  band.append(img);
  return band;
}

function fieldBox(text: string, extraClass = ""): HTMLElement {
  const box = el("div", `homescool-letter-v2__field ${extraClass}`.trim());
  box.textContent = text;
  return box;
}

function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
