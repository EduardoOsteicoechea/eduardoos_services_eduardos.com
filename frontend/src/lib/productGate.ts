/**
 * Shared product page helpers: session gate + entitlement gate + error modal.
 */

import { getMe } from "./api";
import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";
import { checkServiceAccess, type ServiceAccessResult } from "./serviceAccess";

export function apiFail(
  message: string,
  opts?: { requestId?: string; details?: string },
): void {
  showErrorModal({
    message,
    requestId: opts?.requestId,
    details: opts?.details,
  });
}

export async function requireSession(): Promise<{
  ok: boolean;
  email: string;
  role: string;
  id: string;
}> {
  const me = await getMe();
  const ok = me.status === 200 && Boolean(me.data.id);
  if (mustLog) {
    console.log("[productGate] session", { ok, status: me.status, requestId: me.requestId });
  }
  if (!ok && me.status !== 401) {
    apiFail(me.data.message || "Could not load the session.", {
      requestId: me.requestId,
      details: me.data.error ? `error=${me.data.error}` : undefined,
    });
  }
  return {
    ok,
    email: (me.data.email || "").trim(),
    role: (me.data.role || "").trim(),
    id: (me.data.id || "").trim(),
  };
}

export async function requireService(
  serviceId: string,
  opts?: { requireSubscription?: boolean },
): Promise<{ sessionOk: boolean; access: ServiceAccessResult }> {
  const session = await requireSession();
  if (!session.ok) {
    return {
      sessionOk: false,
      access: {
        allowed: false,
        isAdmin: false,
        hasEntitlement: false,
        isHomescoolStudent: false,
      },
    };
  }
  const access = await checkServiceAccess(serviceId);
  if (opts?.requireSubscription && serviceId === "homescool") {
    const allowed = access.isAdmin || access.hasEntitlement;
    return { sessionOk: true, access: { ...access, allowed } };
  }
  return { sessionOk: true, access };
}

export function setHidden(el: Element | null, hidden: boolean): void {
  if (!(el instanceof HTMLElement)) return;
  el.hidden = hidden;
}
