/**
 * Subscription entitlement gate — GET /api/subscriptions/access/{id}.
 */

import { apiRequest } from "./api";
import { mustLog } from "./dev-log";

export type ServiceAccessResult = {
  allowed: boolean;
  isAdmin: boolean;
  hasEntitlement: boolean;
  isHomescoolStudent: boolean;
};

export async function checkServiceAccess(serviceId: string): Promise<ServiceAccessResult> {
  if (mustLog) {
    console.log("[serviceAccess] check", { serviceId });
  }
  const { status, data, requestId } = await apiRequest<{
    allowed?: boolean;
    is_admin?: boolean;
    has_entitlement?: boolean;
    is_homescool_student?: boolean;
  }>(`/subscriptions/access/${encodeURIComponent(serviceId)}`);
  if (mustLog) {
    console.log("[serviceAccess] response", {
      serviceId,
      status,
      requestId,
      allowed: data.allowed,
    });
  }
  if (status < 200 || status >= 300) {
    return {
      allowed: false,
      isAdmin: false,
      hasEntitlement: false,
      isHomescoolStudent: false,
    };
  }
  const isAdmin = Boolean(data.is_admin);
  const hasEntitlement = Boolean(data.has_entitlement) || isAdmin;
  const isHomescoolStudent = Boolean(data.is_homescool_student);
  return {
    allowed: Boolean(data.allowed) || isAdmin,
    isAdmin,
    hasEntitlement,
    isHomescoolStudent,
  };
}

/** Teacher surfaces require entitlement; student learning uses `allowed`. */
export function gateAllowsHomescool(
  remote: ServiceAccessResult,
  requireSubscription: boolean,
): boolean {
  if (remote.isAdmin) return true;
  if (requireSubscription) return Boolean(remote.hasEntitlement);
  return Boolean(remote.allowed);
}
