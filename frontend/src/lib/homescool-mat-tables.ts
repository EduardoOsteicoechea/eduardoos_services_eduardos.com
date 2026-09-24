/**
 * Multiplication-tables letter layout (mat · weeks 1–2 METHOD_V1).
 * Page 1: full tables for read/sing. Page 2: thinned + blanks, density by day.
 * Week 1 = memorizar 1–12; week 2 = práctica (misma hoja, más blancos).
 */

import type { EoschoolDocument } from "./homescool";
import { mustLog } from "./dev-log";

const LEVELS: { label: string; tables: number[] }[] = [
  { label: "nivel 1", tables: [1, 2, 3, 4] },
  { label: "nivel 2", tables: [5, 6, 7, 8] },
  { label: "nivel 3", tables: [9, 10, 11, 12] },
];

/** How many of the 12 products (n×1…n×12) to show on practice page 2. */
export function matPracticeDensity(day: number): number {
  if (day <= 1) return 3;
  if (day === 2) return 6;
  if (day === 3) return 9;
  return 12;
}

export function isMatTablesLayout(doc: EoschoolDocument): boolean {
  return doc.subject === "mat" && (doc.week === 1 || doc.week === 2);
}

export function renderMatTablesPages(doc: EoschoolDocument): HTMLElement[] {
  const density = matPracticeDensity(doc.day);
  if (mustLog) {
    console.log("[homescool-mat] render.start", {
      cycle: doc.cycle,
      week: doc.week,
      day: doc.day,
      density,
    });
  }
  const pages = [buildMatPage(doc, "read", 12), buildMatPage(doc, "practice", density)];
  if (mustLog) console.log("[homescool-mat] render.done", { pages: pages.length });
  return pages;
}

function taskCopy(day: number): string {
  const base =
    "Leer o cantar en voz alta: una vez el nivel 1 (tablas del 1 al 4); dos veces el nivel 2 (tablas del 5 al 8); tres veces el nivel 3 (tablas del 9 al 12).";
  if (day <= 1) return base;
  return `${base} Día ${day}: en la hoja 2 practica ${matPracticeDensity(day)} productos por tabla (espacios en blanco).`;
}

function buildMatPage(doc: EoschoolDocument, mode: "read" | "practice", density: number): HTMLElement {
  if (mustLog) console.log("[homescool-mat] page.build", { mode, density, day: doc.day });
  const page = document.createElement("div");
  page.className = "homescool-letter-page homescool-letter-page--mat";
  page.dataset.matMode = mode;

  const header = document.createElement("header");
  header.className = "homescool-mat__header";
  const heading = document.createElement("div");
  heading.className = "homescool-mat__heading";
  heading.textContent = doc.title;
  const meta = document.createElement("div");
  meta.className = "homescool-mat__meta";
  meta.textContent = `c${doc.cycle} · s${doc.week} · d${doc.day} · nivel ${doc.level} · ${mode === "read" ? "hoja 1 · leer/cantar" : "hoja 2 · practicar"}`;
  header.append(heading, meta);

  const task = document.createElement("section");
  task.className = "homescool-mat__task";
  task.textContent = taskCopy(doc.day);

  const body = document.createElement("div");
  body.className = "homescool-mat__levels";

  for (const level of LEVELS) {
    body.append(buildLevelRow(doc, level.label, level.tables, mode, density));
  }

  const footer = document.createElement("footer");
  footer.className = "homescool-mat__footer";
  const footL = document.createElement("span");
  footL.textContent = mode === "read" ? "Meta: memorizar al cantar" : "Meta: completar sin mirar la hoja 1";
  const footR = document.createElement("span");
  footR.textContent = mode === "practice" ? String(density) : "12";
  footR.title = mode === "practice" ? `Productos por tabla hoy: ${density}` : "Productos completos por tabla";
  footer.append(footL, footR);

  page.append(header, task, body, footer);
  return page;
}

function buildLevelRow(
  doc: EoschoolDocument,
  label: string,
  tables: number[],
  mode: "read" | "practice",
  density: number,
): HTMLElement {
  const row = document.createElement("section");
  row.className = "homescool-mat__row";
  row.setAttribute("aria-label", label);

  const levelCol = document.createElement("div");
  levelCol.className = "homescool-mat__level";
  const levelText = document.createElement("span");
  levelText.className = "homescool-mat__level-text";
  levelText.textContent = label;
  levelCol.append(levelText);

  row.append(levelCol);

  for (const n of tables) {
    row.append(buildTableCol(doc, n, mode, density));
  }

  const doneCol = document.createElement("div");
  doneCol.className = "homescool-mat__done-col";
  const done = document.createElement("button");
  done.type = "button";
  done.className = "homescool-mat__done";
  done.setAttribute("aria-label", `Marcar ${label} como listo`);
  done.setAttribute("aria-pressed", "false");
  done.title = "Listo";
  done.addEventListener("click", () => {
    const on = done.getAttribute("aria-pressed") !== "true";
    done.setAttribute("aria-pressed", on ? "true" : "false");
    if (mustLog) {
      console.log("[homescool-mat] done.toggle", {
        label,
        mode,
        day: doc.day,
        pressed: on,
      });
    }
  });
  doneCol.append(done);
  row.append(doneCol);

  if (mustLog) console.log("[homescool-mat] row.built", { label, tables, mode, density });
  return row;
}

function buildTableCol(doc: EoschoolDocument, factor: number, mode: "read" | "practice", density: number): HTMLElement {
  const col = document.createElement("div");
  col.className = "homescool-mat__table";
  const title = document.createElement("div");
  title.className = "homescool-mat__table-title";
  title.textContent = `×${factor}`;
  col.append(title);

  const list = document.createElement("ol");
  list.className = "homescool-mat__products";
  const multipliers = pickMultipliers(doc.day, factor, mode, density);
  for (const m of multipliers) {
    const li = document.createElement("li");
    li.className = "homescool-mat__product";
    if (mode === "read") {
      li.textContent = `${factor}×${m}=${factor * m}`;
    } else {
      const prompt = document.createElement("span");
      prompt.textContent = `${factor}×${m}=`;
      const blank = document.createElement("span");
      blank.className = "homescool-mat__blank";
      blank.setAttribute("aria-hidden", "true");
      li.append(prompt, blank);
    }
    list.append(li);
  }
  col.append(list);
  if (mustLog) {
    console.log("[homescool-mat] table.built", {
      factor,
      mode,
      density,
      shown: multipliers.length,
      multipliers,
    });
  }
  return col;
}

/** Deterministic shuffle of 1..12, take first `density` (or all for read). */
function pickMultipliers(day: number, factor: number, mode: "read" | "practice", density: number): number[] {
  const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (mode === "read") return all;
  const seed = day * 1009 + factor * 17 + 42;
  const shuffled = seededShuffle(all, seed);
  const picked = shuffled.slice(0, Math.min(density, 12));
  // Keep ascending order on the page so kids can scan; selection was random.
  picked.sort((a, b) => a - b);
  return picked;
}

function seededShuffle(items: number[], seed: number): number[] {
  const arr = items.slice();
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
