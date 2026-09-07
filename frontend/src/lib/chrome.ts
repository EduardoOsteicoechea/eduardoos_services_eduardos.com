import { getMe } from "./api";
import { startClientRouting } from "./router";

const FONT_STEPS = ["0.875rem", "1rem", "1.125rem", "1.25rem", "1.375rem"];

function closeLeft(except?: string): void {
  for (const id of ["main-menu", "dynamic-header"]) {
    const node = document.getElementById(id);
    if (node instanceof HTMLElement && id !== except) {
      node.hidden = true;
    }
  }
}

function togglePanel(id: string): void {
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) {
    return;
  }
  const next = node.hidden;
  if (id === "agent-sidebar") {
    node.hidden = !next;
    return;
  }
  closeLeft(next ? id : undefined);
  node.hidden = !next;
}

function applyFont(size: string): void {
  document.documentElement.style.fontSize = size;
  localStorage.setItem("root-font-size", size);
}

function cycleFont(delta: number): void {
  const current = localStorage.getItem("root-font-size") || "1rem";
  const index = Math.max(0, FONT_STEPS.indexOf(current));
  const next = FONT_STEPS[Math.min(FONT_STEPS.length - 1, Math.max(0, index + delta))];
  applyFont(next);
}

export function startChrome(): void {
  startClientRouting();

  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    document.documentElement.dataset.theme = storedTheme;
  }

  const storedFont = localStorage.getItem("root-font-size");
  if (storedFont) {
    document.documentElement.style.fontSize = storedFont;
  }

  document.querySelector(".header-menu")?.addEventListener("click", () => togglePanel("main-menu"));
  document.querySelector(".header-dynamic")?.addEventListener("click", () => togglePanel("dynamic-header"));
  document.querySelector(".agent-fab")?.addEventListener("click", () => togglePanel("agent-sidebar"));
  document.querySelector("[data-font='-']")?.addEventListener("click", () => cycleFont(-1));
  document.querySelector("[data-font='+']")?.addEventListener("click", () => cycleFont(1));
  document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  });

  void getMe().then(({ status, data }) => {
    if (status === 200 && data.role === "admin") {
      document.querySelectorAll("[data-admin-only]").forEach((node) => {
        node.removeAttribute("hidden");
      });
    }
  });
}
