/**
 * Cookie-session auth shim for pamphlet-generator (no bearer JWT).
 */

import { getMe } from "./api";
import { mustLog } from "./dev-log";

let sessionOk = false;
let sessionEmail = "";

export function getAuthToken(): string {
  return sessionOk ? "cookie-session" : "";
}

export function isAuthenticated(): boolean {
  return sessionOk;
}

export function getAuthEmailFromToken(): string | null {
  return sessionEmail || null;
}

export async function refreshAuthSession(): Promise<boolean> {
  const me = await getMe();
  sessionOk = me.status === 200 && Boolean(me.data.id);
  sessionEmail = (me.data.email || "").trim();
  if (mustLog) {
    console.log("[auth] refreshAuthSession", { ok: sessionOk, status: me.status, requestId: me.requestId });
  }
  return sessionOk;
}