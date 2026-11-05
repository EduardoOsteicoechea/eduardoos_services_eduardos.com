/**
 * eEyes hub API client (cookie + CSRF via api.ts).
 */

import { deleteJSON, getJSON, patchJSON, postJSON } from "./api";
import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";

export type EeyesPairing = {
  id: string;
  code1?: string;
  code2?: string;
  code3?: string;
  expiresAt: string;
  status: string;
  deviceId?: string;
  deviceLabel?: string;
};

export type EeyesDevice = {
  id: string;
  label: string;
  platform: string;
  model: string;
  shellVersion: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt?: string | null;
};

export type EeyesTask = {
  id: string;
  deviceId: string;
  title: string;
  instructions: string;
  status: string;
  /** `notice` = notification only (no capture); absent = capture task. */
  kind?: string;
  notifyAt?: string | null;
  reminders?: string[];
  dueAt?: string | null;
  photoIntervalSec: number;
  maxPhotos: number;
  audioSeconds: number;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EeyesMedia = {
  id: string;
  taskId: string;
  kind: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  durationMs?: number;
  capturedAt: string;
  createdAt: string;
};

export type EeyesCompletion = {
  task: EeyesTask;
  media: EeyesMedia[];
};

export type EeyesRelease = {
  versionCode: number;
  versionName: string;
  sha256: string;
  size: number;
  minVersionCode: number;
  notes?: string;
  file: string;
  platform?: string;
  downloadPath?: string;
} | null;

function unwrap<T>(
  status: number,
  data: T & { error?: string; message?: string },
  requestId: string,
  path: string,
): T {
  if (status < 200 || status >= 300) {
    showErrorModal({
      message: data.message || "eEyes request failed.",
      requestId,
      details: data.error || String(status),
    });
    throw new Error(data.error || `eeyes_${status}`);
  }
  if (mustLog) console.log("[eeyes]", path, status, requestId);
  return data;
}

export async function createEeyesPairing(): Promise<EeyesPairing> {
  const { status, data, requestId } = await postJSON<EeyesPairing>("/eeyes/pairings", {});
  return unwrap(status, data, requestId, "/eeyes/pairings");
}

export async function getEeyesPairing(id: string): Promise<EeyesPairing> {
  const path = `/eeyes/pairings/${encodeURIComponent(id)}`;
  const { status, data, requestId } = await getJSON<EeyesPairing>(path);
  return unwrap(status, data, requestId, path);
}

export async function listEeyesDevices(): Promise<EeyesDevice[]> {
  const { status, data, requestId } = await getJSON<{ devices: EeyesDevice[] }>("/eeyes/devices");
  return unwrap(status, data, requestId, "/eeyes/devices").devices || [];
}

export async function renameEeyesDevice(id: string, label: string): Promise<EeyesDevice> {
  const path = `/eeyes/devices/${encodeURIComponent(id)}`;
  const { status, data, requestId } = await patchJSON<{ device: EeyesDevice }>(path, { label });
  return unwrap(status, data, requestId, path).device;
}

export async function revokeEeyesDevice(id: string): Promise<void> {
  const path = `/eeyes/devices/${encodeURIComponent(id)}`;
  const { status, data, requestId } = await deleteJSON(path);
  unwrap(status, data, requestId, path);
}

export async function listEeyesTasks(): Promise<EeyesTask[]> {
  const { status, data, requestId } = await getJSON<{ tasks: EeyesTask[] }>("/eeyes/tasks");
  return unwrap(status, data, requestId, "/eeyes/tasks").tasks || [];
}

export type CreateEeyesTaskInput = {
  title: string;
  instructions: string;
  deviceId: string;
  notifyAt?: string;
  reminders?: string[];
  dueAt?: string;
  photoIntervalSec: number;
  maxPhotos: number;
  audioSeconds: number;
};

export async function createEeyesTask(input: CreateEeyesTaskInput): Promise<EeyesTask> {
  const { status, data, requestId } = await postJSON<{ task: EeyesTask }>("/eeyes/tasks", input);
  return unwrap(status, data, requestId, "/eeyes/tasks").task;
}

export type SendEeyesNoticeInput = {
  deviceId: string;
  title: string;
  message: string;
  /** RFC3339; omitted = deliver on the device's next sync. */
  notifyAt?: string;
};

export async function sendEeyesNotice(input: SendEeyesNoticeInput): Promise<EeyesTask> {
  const { status, data, requestId } = await postJSON<{ task: EeyesTask }>("/eeyes/tasks", {
    kind: "notice",
    deviceId: input.deviceId,
    title: input.title,
    instructions: input.message,
    notifyAt: input.notifyAt,
  });
  return unwrap(status, data, requestId, "/eeyes/tasks").task;
}

export function isEeyesNotice(task: EeyesTask): boolean {
  return task.kind === "notice";
}

export async function cancelEeyesTask(id: string): Promise<void> {
  const path = `/eeyes/tasks/${encodeURIComponent(id)}`;
  const { status, data, requestId } = await patchJSON(path, { status: "cancelled" });
  unwrap(status, data, requestId, path);
}

export async function deleteEeyesTask(id: string): Promise<void> {
  const path = `/eeyes/tasks/${encodeURIComponent(id)}`;
  const { status, data, requestId } = await deleteJSON(path);
  unwrap(status, data, requestId, path);
}

export async function listEeyesCompletions(): Promise<EeyesCompletion[]> {
  const { status, data, requestId } = await getJSON<{ completions: EeyesCompletion[] }>(
    "/eeyes/completions",
  );
  return unwrap(status, data, requestId, "/eeyes/completions").completions || [];
}

export async function listEeyesReleases(): Promise<{ android: EeyesRelease; desktop: EeyesRelease }> {
  const { status, data, requestId } = await getJSON<{ android: EeyesRelease; desktop: EeyesRelease }>(
    "/eeyes/releases",
  );
  return unwrap(status, data, requestId, "/eeyes/releases");
}

export function eeyesMediaUrl(id: string): string {
  return `/api/eeyes/media/${encodeURIComponent(id)}`;
}

export function eeyesDownloadUrl(platform: "android" | "desktop"): string {
  return `/api/eeyes/downloads/${platform}`;
}
