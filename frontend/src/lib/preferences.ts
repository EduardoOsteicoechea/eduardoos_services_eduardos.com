/**
 * User preferences — GET/PUT /api/preferences/{key}.
 * Product prefs must NOT use localStorage (spec 002).
 */

import { apiRequest } from "./api";
import { mustLog } from "./dev-log";

export const PREF_SCRIB_INSTITUTES_NAV = "scrib.institutesNav";
export const PREF_PAMPHLET_LAST_EPAM = "pamphlet.lastEpamId";
export const PREF_INSTITUTES_SIDEBAR = "latin.institutesSidebarOpen";
export const PREF_HOMESCOOL_FOLDERS_OPEN = "homescool.foldersOpen";

export type PreferenceResponse = {
  key?: string;
  value?: unknown;
  updated_at?: string;
};

export async function getPreference<T = unknown>(
  key: string,
): Promise<{ value: T | null; status: number; requestId: string }> {
  const { status, data, requestId } = await apiRequest<PreferenceResponse>(
    `/preferences/${encodeURIComponent(key)}`,
  );
  if (mustLog) {
    console.log("[preferences] get", { key, status, requestId });
  }
  if (status === 404) {
    return { value: null, status, requestId };
  }
  if (status < 200 || status >= 300) {
    return { value: null, status, requestId };
  }
  return { value: (data.value as T) ?? null, status, requestId };
}

export async function putPreference(
  key: string,
  value: unknown,
): Promise<{ ok: boolean; status: number; requestId: string; message?: string }> {
  const { status, data, requestId } = await apiRequest<PreferenceResponse>(
    `/preferences/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
  );
  if (mustLog) {
    console.log("[preferences] put", { key, status, requestId });
  }
  if (status < 200 || status >= 300) {
    return {
      ok: false,
      status,
      requestId,
      message: data.message || "Could not save preference.",
    };
  }
  return { ok: true, status, requestId };
}
