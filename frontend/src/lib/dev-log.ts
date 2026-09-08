const PREFIX = "[session-debug]";

export function sessionDebugEnabled(): boolean {
  return import.meta.env.DEV;
}

export function sessionLog(step: string, detail: Record<string, unknown> = {}): void {
  if (!sessionDebugEnabled()) {
    return;
  }
  console.log(PREFIX, {
    step,
    at: new Date().toISOString(),
    page: typeof location !== "undefined" ? `${location.protocol}//${location.host}${location.pathname}` : "",
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
  if (!sessionDebugEnabled() || typeof localStorage === "undefined") {
    return;
  }
  sessionLog("localStorage", {
    context,
    theme: localStorage.getItem("theme"),
    rootFontSize: localStorage.getItem("root-font-size"),
    siteTextScale: localStorage.getItem("site-text-scale"),
  });
}
