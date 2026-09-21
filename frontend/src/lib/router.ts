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

/**
 * `/documents/pamphlet/e/{id}` is pretty only when Nginx rewrites it to e/index.html.
 * On VPS builds without that location, unknown paths fall through to the homepage HTML
 * (URL stays /e/{id}, DOM is home). Redirect to a real static page + hash instead.
 */
function rewriteLegacyPamphletEditPath(): void {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const match = /^\/documents\/pamphlet\/e\/([^/]+)$/.exec(path);
  if (!match) return;
  let id = match[1];
  try {
    id = decodeURIComponent(id);
  } catch {
    /* keep raw segment */
  }
  window.location.replace(`/documents/pamphlet/open#${encodeURIComponent(id)}`);
}

export function startClientRouting(): void {
  if (window.__clientRoutingStarted) {
    return;
  }
  window.__clientRoutingStarted = true;

  rewriteLegacyPamphletEditPath();

  // ClientRouter intercepts all same-origin links — not only [data-route].
  // Cancel soft transitions that touch pamphlet so we never swap home HTML onto /e/{id}.
  document.addEventListener("astro:before-preparation", (event) => {
    const ev = event as Event & { from: URL; to: URL };
    if (needsFullDocumentNav(ev.to.pathname) || needsFullDocumentNav(ev.from.pathname)) {
      event.preventDefault();
      assignSameOrigin(ev.to.href);
    }
  });

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
