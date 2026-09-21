import { navigate } from "astro:transitions/client";

declare global {
  interface Window {
    __clientRoutingStarted?: boolean;
  }
}

/** Heavy pamphlet editor: full document loads avoid VT zombies (async replaceState after soft-leave). */
function needsFullDocumentNav(pathOrHref: string): boolean {
  try {
    const url = new URL(pathOrHref, window.location.origin);
    return url.pathname.startsWith("/documents/pamphlet");
  } catch {
    return pathOrHref.startsWith("/documents/pamphlet");
  }
}

function assignSameOrigin(href: string): void {
  const url = new URL(href, window.location.origin);
  window.location.assign(`${url.pathname}${url.search}${url.hash}`);
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
    if (needsFullDocumentNav(href) || needsFullDocumentNav(window.location.pathname)) {
      assignSameOrigin(href);
      return;
    }
    void navigate(href);
  });
}

export function go(path: string): void {
  if (needsFullDocumentNav(path) || needsFullDocumentNav(window.location.pathname)) {
    assignSameOrigin(path);
    return;
  }
  void navigate(path);
}
