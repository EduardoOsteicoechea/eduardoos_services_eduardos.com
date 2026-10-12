/**
 * Scrib daily streak client — config, today, complete, stats, snapshots.
 */

import { apiRequest } from "./api";
import { mustLog } from "./dev-log";
import type { ScribSheet } from "./scrib";

export type ScribStreakKind = "bible" | "institutes";

export type ScribStreakBibleCursor = {
  bibleBookId: string;
  chapter: number;
  verse: number;
};

export type ScribStreakInstitutesCursor = {
  paragraphId: string;
};

export type ScribStreakCursor = {
  bible?: ScribStreakBibleCursor;
  institutes?: ScribStreakInstitutesCursor;
};

export type ScribStreakItem = {
  id: string;
  kind: ScribStreakKind;
  label: string;
  quantityPerDay: number;
  scribBookId: string;
  scribSheetId: string;
  cursor: ScribStreakCursor;
  startCursor: ScribStreakCursor;
};

export type ScribStreakConfig = {
  enabled: boolean;
  startDate: string;
  reminderEnabled: boolean;
  items: ScribStreakItem[];
  updatedAt?: string;
};

export type ScribStreakAssignmentUnit = {
  kind: ScribStreakKind;
  bibleBookId?: string;
  chapter?: number;
  verse?: number;
  paragraphId?: string;
  label: string;
};

export type ScribStreakDayAssignment = {
  itemId: string;
  label: string;
  kind: ScribStreakKind;
  scribBookId: string;
  scribSheetId: string;
  units: ScribStreakAssignmentUnit[];
  snapshotId?: string;
};

export type ScribStreakToday = {
  date: string;
  enabled: boolean;
  startDate: string;
  completed: boolean;
  assignments: ScribStreakDayAssignment[];
  items: ScribStreakItem[];
};

export type ScribStreakDay = {
  date: string;
  completed: boolean;
  completedAt?: string;
  assignments: ScribStreakDayAssignment[];
};

export type ScribStreakStats = {
  currentStreak: number;
  bestStreak: number;
  completedDays: number;
  lastCompleted?: string;
  todayDate: string;
  todayDone: boolean;
};

export type ScribStreakSnapshot = {
  id: string;
  date: string;
  itemId: string;
  scribBookId: string;
  scribSheetId: string;
  sheet: ScribSheet;
  createdAt: string;
};

function errMsg(status: number, data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message?: string }).message;
    if (m) return m;
  }
  return `${fallback} (${status})`;
}

export async function fetchScribStreakConfig(): Promise<{
  config: ScribStreakConfig | null;
  error?: string;
}> {
  const { status, data } = await apiRequest<ScribStreakConfig>("/scrib/streak/config");
  if (status < 200 || status >= 300) {
    return { config: null, error: errMsg(status, data, "Could not load streak config.") };
  }
  return { config: normalizeConfig(data) };
}

function normalizeConfig(data: ScribStreakConfig | null | undefined): ScribStreakConfig | null {
  if (!data) return null;
  return {
    enabled: Boolean(data.enabled),
    startDate: data.startDate || "",
    reminderEnabled: Boolean(data.reminderEnabled),
    items: Array.isArray(data.items) ? data.items : [],
    updatedAt: data.updatedAt,
  };
}

export async function saveScribStreakConfig(
  config: ScribStreakConfig,
): Promise<{ config: ScribStreakConfig | null; error?: string }> {
  const { status, data } = await apiRequest<ScribStreakConfig>("/scrib/streak/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (status < 200 || status >= 300) {
    return { config: null, error: errMsg(status, data, "Could not save streak config.") };
  }
  if (mustLog) console.log("[scrib-streak] config saved", { items: data?.items?.length });
  return { config: normalizeConfig(data) };
}

/** Persist enabled / reminder flags without overwriting unsaved item drafts. */
export async function patchScribStreakFlags(flags: {
  enabled?: boolean;
  reminderEnabled?: boolean;
}): Promise<{ config: ScribStreakConfig | null; error?: string }> {
  const current = await fetchScribStreakConfig();
  if (current.error && !current.config) {
    return { config: null, error: current.error };
  }
  const base = current.config ?? {
    enabled: false,
    reminderEnabled: true,
    startDate: "",
    items: [],
  };
  return saveScribStreakConfig({
    ...base,
    enabled: flags.enabled ?? base.enabled,
    reminderEnabled: flags.reminderEnabled ?? base.reminderEnabled,
  });
}

export async function fetchScribStreakToday(): Promise<{
  today: ScribStreakToday | null;
  error?: string;
}> {
  const { status, data } = await apiRequest<ScribStreakToday>("/scrib/streak/today");
  if (status < 200 || status >= 300) {
    return { today: null, error: errMsg(status, data, "Could not load today.") };
  }
  return {
    today: data
      ? {
          date: data.date || "",
          enabled: Boolean(data.enabled),
          startDate: data.startDate || "",
          completed: Boolean(data.completed),
          assignments: Array.isArray(data.assignments) ? data.assignments : [],
          items: Array.isArray(data.items) ? data.items : [],
        }
      : null,
  };
}

export async function completeScribStreakDay(
  date: string,
): Promise<{ day: ScribStreakDay | null; error?: string }> {
  const { status, data } = await apiRequest<ScribStreakDay>(
    `/scrib/streak/days/${encodeURIComponent(date)}/complete`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
  if (status < 200 || status >= 300) {
    return { day: null, error: errMsg(status, data, "Could not complete day.") };
  }
  return { day: data ?? null };
}

export async function fetchScribStreakStats(): Promise<{
  stats: ScribStreakStats | null;
  error?: string;
}> {
  const { status, data } = await apiRequest<ScribStreakStats>("/scrib/streak/stats");
  if (status < 200 || status >= 300) {
    return { stats: null, error: errMsg(status, data, "Could not load streak stats.") };
  }
  return { stats: data ?? null };
}

export async function fetchScribStreakDays(
  from?: string,
  to?: string,
): Promise<{ days: ScribStreakDay[]; error?: string }> {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const path = q.toString() ? `/scrib/streak/days?${q}` : "/scrib/streak/days";
  const { status, data } = await apiRequest<{ days: ScribStreakDay[] }>(path);
  if (status < 200 || status >= 300) {
    return { days: [], error: errMsg(status, data, "Could not load days.") };
  }
  return { days: Array.isArray(data?.days) ? data!.days : [] };
}

export async function fetchScribStreakSnapshot(
  snapshotId: string,
): Promise<{ snapshot: ScribStreakSnapshot | null; error?: string }> {
  const { status, data } = await apiRequest<ScribStreakSnapshot>(
    `/scrib/streak/snapshots/${encodeURIComponent(snapshotId)}`,
  );
  if (status < 200 || status >= 300) {
    return { snapshot: null, error: errMsg(status, data, "Could not load snapshot.") };
  }
  return { snapshot: data ?? null };
}
