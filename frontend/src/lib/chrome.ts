import { getMe, postJSON } from "./api";
import { go, startClientRouting } from "./router";

const FONT_STEPS = ["0.875rem", "1rem", "1.125rem", "1.25rem", "1.375rem"];

declare global {
  interface Window {
    __chromeStarted?: boolean;
  }
}

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

export async function refreshAuthChrome(): Promise<void> {
  const { status, data } = await getMe();
  const authed = status === 200 && Boolean(data.id);
  document.querySelectorAll("[data-guest-only]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.hidden = authed;
    }
  });
  document.querySelectorAll("[data-authed-only]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.hidden = !authed;
    }
  });
  document.querySelectorAll("[data-admin-only]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.hidden = !(authed && data.role === "admin");
    }
  });
  const avatar = document.querySelector(".header-avatar");
  if (avatar instanceof HTMLAnchorElement) {
    const href = authed ? avatar.dataset.authedHref : avatar.dataset.guestHref;
    const label = authed ? avatar.dataset.authedLabel : avatar.dataset.guestLabel;
    if (href) {
      avatar.href = href;
    }
    if (label) {
      avatar.setAttribute("aria-label", label);
    }
  }
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

  if (!window.__chromeStarted) {
    window.__chromeStarted = true;
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
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const logout = target.closest("[data-logout]");
      if (!(logout instanceof HTMLElement)) {
        return;
      }
      event.preventDefault();
      void (async () => {
        await postJSON("/auth/logout", {});
        await refreshAuthChrome();
        go("/session");
      })();
    });
  }

  void refreshAuthChrome();
}
