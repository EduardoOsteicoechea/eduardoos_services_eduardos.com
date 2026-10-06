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
  let access = await checkServiceAccess(serviceId);
  // Soft navigations / expired access can yield a false deny; re-hydrate once.
  if (!access.allowed && !access.isAdmin && !access.hasEntitlement) {
    const again = await requireSession();
    if (again.ok) {
      access = await checkServiceAccess(serviceId);
    }
  }
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

/**
 * ClientRouter keeps ES modules alive across soft navigations, so top-level
 * `await requireService()` only runs once. Re-bind product boots on every
 * `astro:page-load` and gate by `html[data-page]`.
 */
export function onAstroPageLoad(
  page: string | ((doc: Document) => boolean),
  boot: () => void | Promise<void>,
): void {
  let seq = 0;
  const matches = (): boolean =>
    typeof page === "function"
      ? page(document)
      : document.documentElement.getAttribute("data-page") === page;

  const run = (): void => {
    if (!matches()) return;
    const my = ++seq;
    void (async () => {
      try {
        await boot();
      } catch (err) {
        if (mustLog) {
          console.log("[productGate] boot failed", {
            page: typeof page === "string" ? page : "custom",
            err: err instanceof Error ? err.message : String(err),
          });
        }
        if (my === seq && matches()) {
          apiFail(err instanceof Error ? err.message : "Could not load this page.");
        }
      }
    })();
  };

  document.addEventListener("astro:page-load", run);
  // after-swap covers ClientRouter cases where page-load ordering races the new DOM.
  document.addEventListener("astro:after-swap", run);
}
