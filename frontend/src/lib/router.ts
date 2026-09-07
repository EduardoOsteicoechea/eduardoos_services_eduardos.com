import { navigate } from "astro:transitions/client";

declare global {
  interface Window {
    __clientRoutingStarted?: boolean;
  }
}

export function startClientRouting(): void {
  if (window.__clientRoutingStarted) {
    return;
  }
  window.__clientRoutingStarted = true;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest("a[data-route]");
    if (!(anchor instanceof HTMLAnchorElement)) {
      return;
    }

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("#")) {
      return;
    }

    event.preventDefault();
    void navigate(href);
  });
}

export function go(path: string): void {
  void navigate(path);
}
