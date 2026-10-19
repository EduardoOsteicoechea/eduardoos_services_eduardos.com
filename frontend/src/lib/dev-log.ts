const PREFIX = "[session-debug]";
const SESSION_DEBUG_KEY = "eduardoos.session-debug";
const SESSION_HINT_KEY = "eduardoos.session-hint";
const REFRESH_LOCK_KEY = "eduardoos.refresh-lock";

let sessionTraceId = "";

function debugQueryEnabled(): boolean {
  try {
    return typeof location !== "undefined" && new URLSearchParams(location.search).get("debug") === "1";
  } catch {
    return false;
  }
}

function sessionDebugStorageEnabled(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(SESSION_DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

/** Exhaustive FE diagnostics. On in DEV, `?debug=1`, or localStorage `eduardoos.session-debug=1`. */
export function sessionDebugEnabled(): boolean {
  return Boolean(import.meta.env.DEV) || debugQueryEnabled() || sessionDebugStorageEnabled();
}

/**
 * Exhaustive FE diagnostics gate (same as sessionDebugEnabled).
 * Re-read via sessionDebugEnabled() when the flag may change after load.
 */
export const mustLog = sessionDebugEnabled();

/** Short opaque id for one getMe / refresh wave; included in every sessionLog payload. */
export function beginSessionTrace(): string {
  sessionTraceId = shortTraceId();
  return sessionTraceId;
}

export function currentSessionTraceId(): string {
  return sessionTraceId;
}

function shortTraceId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 8);
}

export function sessionLog(step: string, detail: Record<string, unknown> = {}): void {
  if (!sessionDebugEnabled()) {
    return;
  }
  console.log(PREFIX, {
    step,
    at: new Date().toISOString(),
    page: typeof location !== "undefined" ? `${location.protocol}//${location.host}${location.pathname}` : "",
    sessionTraceId: sessionTraceId || undefined,
    ...detail,
  });
}

export function sessionLogCookies(context: string): void {
  if (!sessionDebugEnabled() || typeof document === "undefined") {
    return;
  }
  const readableNames = document.cookie
    ? document.cookie.split(";").map((part) => part.trim().split("=")[0]).filter(Boolean)
    : [];
  sessionLog("document.cookie", {
    context,
    note: "HttpOnly auth cookies are not visible to JavaScript",
    readableCookieNames: readableNames,
  });
}

export function sessionLogStorage(context: string): void {
  if (!sessionDebugEnabled()) {
    return;
  }
  let theme: string | null = null;
  let rootFontSize: string | null = null;
  let siteTextScale: string | null = null;
  let hasRefreshLock = false;
  let hasSessionHint = false;
  try {
    if (typeof localStorage !== "undefined") {
      theme = localStorage.getItem("theme");
      rootFontSize = localStorage.getItem("root-font-size");
      siteTextScale = localStorage.getItem("site-text-scale");
      hasRefreshLock = Boolean(localStorage.getItem(REFRESH_LOCK_KEY));
    }
  } catch {
    /* private mode */
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      hasSessionHint = sessionStorage.getItem(SESSION_HINT_KEY) === "1";
    }
  } catch {
    /* private mode */
  }
  sessionLog("localStorage", {
    context,
    theme,
    rootFontSize,
    siteTextScale,
    hasSessionHint,
    hasRefreshLock,
    note: "product data must use Mongo /api/preferences — chrome keys only here",
  });
}
