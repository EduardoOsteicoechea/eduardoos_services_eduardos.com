/**
 * Cookie-session auth shim for pamphlet-generator and product islands (no bearer JWT).
 */

import { getMe, isTransientAuthStatus } from "./api";
import { sessionDebugEnabled } from "./dev-log";

let sessionOk = false;
let sessionEmail = "";
let sessionRole = "";

export function getAuthToken(): string {
  return sessionOk ? "cookie-session" : "";
}

export function isAuthenticated(): boolean {
  return sessionOk;
}

export function getAuthEmailFromToken(): string | null {
  return sessionEmail || null;
}

/** True when last refreshAuthSession/getMe reported role === "admin". */
export function isPlatformAdmin(): boolean {
  return sessionOk && sessionRole === "admin";
}

/** Test helper: seed prior session state without a network round-trip. */
export function __setAuthSessionForTests(opts: {
  ok: boolean;
  email?: string;
  role?: string;
}): void {
  sessionOk = opts.ok;
  sessionEmail = (opts.email || "").trim();
  sessionRole = opts.ok ? String(opts.role || "").trim().toLowerCase() : "";
}

export async function refreshAuthSession(): Promise<boolean> {
  const me = await getMe();
  if (isTransientAuthStatus(me.status)) {
    // Keep prior sessionOk — timeout / 429 / 5xx must not demote to guest.
    if (sessionDebugEnabled()) {
      console.log("[auth] refreshAuthSession transient_keep", {
        ok: sessionOk,
        status: me.status,
        requestId: me.requestId,
        role: sessionRole || undefined,
      });
    }
    return sessionOk;
  }
  sessionOk = me.status === 200 && Boolean(me.data.id);
  sessionEmail = (me.data.email || "").trim();
  sessionRole = sessionOk ? String(me.data.role || "").trim().toLowerCase() : "";
  if (sessionDebugEnabled()) {
    console.log("[auth] refreshAuthSession", {
      ok: sessionOk,
      status: me.status,
      requestId: me.requestId,
      role: sessionRole || undefined,
    });
  }
  return sessionOk;
}
