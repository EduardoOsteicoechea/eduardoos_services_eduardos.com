/**
 * Cookie-session auth shim for pamphlet-generator and product islands (no bearer JWT).
 */

import { getMe } from "./api";
import { mustLog } from "./dev-log";

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

export async function refreshAuthSession(): Promise<boolean> {
  const me = await getMe();
  sessionOk = me.status === 200 && Boolean(me.data.id);
  sessionEmail = (me.data.email || "").trim();
  sessionRole = sessionOk ? String(me.data.role || "").trim().toLowerCase() : "";
  if (mustLog) {
    console.log("[auth] refreshAuthSession", {
      ok: sessionOk,
      status: me.status,
      requestId: me.requestId,
      role: sessionRole || undefined,
    });
  }
  return sessionOk;
}
