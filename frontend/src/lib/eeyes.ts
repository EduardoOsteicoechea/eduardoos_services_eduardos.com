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
  /** Codes accepted so far (0–3); the hub reveals code `step + 1`. */
  step?: number;
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
  lastSyncAt?: string | null;
  lastSyncNotifications?: number;
};

export type EeyesTask = {
  id: string;
  deviceId: string;
  title: string;
  instructions: string;
  status: string;
  /** `notice` = notification only; `photo` = scheduled automatic photo; absent = capture task. */
  kind?: string;
  /** Scheduled photos only. */
  cameraFacing?: EeyesCameraFacing;
  notifyAt?: string | null;
  reminders?: string[];
  dueAt?: string | null;
  photoIntervalSec: number;
  maxPhotos: number;
  audioSeconds: number;
  /** Same id on every device copy of one send. */
  batchId?: string;
  /** Reading of the whole pack, shared by every device copy. */
  packAnalysis?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  notifyDispatchedAt?: string | null;
  notifyAckedAt?: string | null;
};

export type EeyesNoticeStage = "cancelled" | "scheduled" | "waiting_sync" | "dispatched" | "shown";

/** Where a task notification is in the hub → device → screen pipeline. */
export function eeyesNoticeStage(task: EeyesTask, now = Date.now()): EeyesNoticeStage {
  if (task.notifyAckedAt) return "shown";
  if (task.status === "cancelled") return "cancelled";
  if (task.notifyDispatchedAt) return "dispatched";
  if (task.notifyAt && Date.parse(task.notifyAt) > now) return "scheduled";
  return "waiting_sync";
}

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
  analysis?: string;
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
  batchId?: string;
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
  batchId?: string;
};

export async function sendEeyesNotice(input: SendEeyesNoticeInput): Promise<EeyesTask> {
  const { status, data, requestId } = await postJSON<{ task: EeyesTask }>("/eeyes/tasks", {
    kind: "notice",
    deviceId: input.deviceId,
    title: input.title,
    instructions: input.message,
    notifyAt: input.notifyAt,
    batchId: input.batchId,
  });
  return unwrap(status, data, requestId, "/eeyes/tasks").task;
}

export function isEeyesNotice(task: EeyesTask): boolean {
  return task.kind === "notice";
}

export type EeyesCameraFacing = "back" | "front";

export type ScheduleEeyesPhotoInput = {
  deviceId: string;
  title: string;
  cameraFacing: EeyesCameraFacing;
  /** RFC3339; omitted = take it as soon as the device receives it. */
  notifyAt?: string;
  batchId?: string;
  /** Seconds between shots. 0 keeps a single photo. */
  photoIntervalSec?: number;
  /** Shots in the burst. 1 keeps a single photo. */
  maxPhotos?: number;
};

export async function scheduleEeyesPhoto(input: ScheduleEeyesPhotoInput): Promise<EeyesTask> {
  const shots = input.maxPhotos && input.maxPhotos > 1 ? input.maxPhotos : 1;
  const interval = shots > 1 ? input.photoIntervalSec || 0 : 0;
  const { status, data, requestId } = await postJSON<{ task: EeyesTask }>("/eeyes/tasks", {
    kind: "photo",
    deviceId: input.deviceId,
    title: input.title,
    cameraFacing: input.cameraFacing,
    notifyAt: input.notifyAt,
    batchId: input.batchId,
    photoIntervalSec: interval,
    maxPhotos: shots,
    instructions:
      shots > 1 ? `Una foto cada ${interval} s, hasta ${shots} tomas.` : undefined,
  });
  return unwrap(status, data, requestId, "/eeyes/tasks").task;
}

export function isEeyesPhoto(task: EeyesTask): boolean {
  return task.kind === "photo";
}

/** One live device per platform and model. The most recent contact wins. */
export function eeyesCaptureDevices(devices: EeyesDevice[]): EeyesDevice[] {
  const best = new Map<string, EeyesDevice>();
  for (const device of devices) {
    if (device.revokedAt) continue;
    const model = (device.model || device.label || device.platform || "").trim().toLowerCase();
    const key = `${device.platform}\n${model}`;
    const prev = best.get(key);
    const seen = Date.parse(device.lastSeenAt || "") || 0;
    const prevSeen = prev ? Date.parse(prev.lastSeenAt || "") || 0 : -1;
    if (!prev || seen >= prevSeen) best.set(key, device);
  }
  return [...best.values()];
}

function eeyesPackTaskRank(task: EeyesTask): number {
  if (task.status === "completed") return 3;
  if (task.status === "in_progress") return 2;
  if (task.status === "pending") return 1;
  return 0;
}

/** One card per apparatus inside a pack. A cancelled duplicate stays out. */
export function eeyesUniquePackTasks(tasks: EeyesTask[], devices: EeyesDevice[]): EeyesTask[] {
  const byId = new Map(devices.map((device) => [device.id, device]));
  const best = new Map<string, EeyesTask>();
  for (const task of tasks) {
    if (task.status === "cancelled") continue;
    const device = byId.get(task.deviceId);
    const model = (device?.model || device?.label || task.deviceId).trim().toLowerCase();
    const platform = device?.platform || "";
    const key = `${platform}\n${model}`;
    const prev = best.get(key);
    if (!prev || eeyesPackTaskRank(task) > eeyesPackTaskRank(prev)) best.set(key, task);
  }
  return [...best.values()];
}

/** Conclusion first, then the rest of the pack reading. */
export function eeyesAnalysisOrder(text: string): { conclusion: string; explanation: string } {
  const trimmed = text.trim();
  const at = trimmed.search(/(?:^|\n)Conclusión:/);
  if (at < 0) return { conclusion: "", explanation: trimmed };
  const cut = trimmed[at] === "\n" ? at + 1 : at;
  return {
    conclusion: trimmed.slice(cut).trim(),
    explanation: trimmed.slice(0, at).trim(),
  };
}

export function eeyesPackAnalysis(tasks: EeyesTask[]): string {
  for (const task of tasks) {
    const text = task.packAnalysis?.trim();
    if (text) return text;
  }
  return "";
}

const PHOTO_SESSION_WINDOW_MS = 60_000;

function samePhotoSession(a: EeyesTask, b: EeyesTask): boolean {
  if (a.batchId && a.batchId === b.batchId) return true;
  if (a.title !== b.title) return false;
  if ((a.cameraFacing || "back") !== (b.cameraFacing || "back")) return false;
  if ((a.photoIntervalSec || 0) !== (b.photoIntervalSec || 0)) return false;
  if ((a.maxPhotos || 0) !== (b.maxPhotos || 0)) return false;
  if ((a.notifyAt || "").slice(0, 16) !== (b.notifyAt || "").slice(0, 16)) return false;
  const delta = Math.abs(Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return Number.isFinite(delta) && delta <= PHOTO_SESSION_WINDOW_MS;
}

/**
 * One scheduling action across devices. A burst gives each device its own
 * batch id, so those copies join by the shared setup and creation window.
 */
export function eeyesPhotoSessions(tasks: EeyesTask[]): EeyesTask[][] {
  const sorted = [...tasks].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const sessions: EeyesTask[][] = [];
  for (const task of sorted) {
    const found = sessions.find((group) => samePhotoSession(group[0], task));
    if (found) found.push(task);
    else sessions.push([task]);
  }
  return sessions;
}

/** Groups one send across devices. Tasks without a batch stay on their own. */
export function eeyesBatches(tasks: EeyesTask[]): EeyesTask[][] {
  const order: EeyesTask[][] = [];
  const byId = new Map<string, EeyesTask[]>();
  for (const task of tasks) {
    const key = task.batchId || task.id;
    const group = byId.get(key);
    if (group) {
      group.push(task);
      continue;
    }
    const next = [task];
    byId.set(key, next);
    order.push(next);
  }
  return order;
}

export type EeyesPhotoStage =
  | "cancelled"
  | "uploaded"
  | "capturing"
  | "taken"
  | "dispatched"
  | "scheduled"
  | "waiting_sync";

/** Where a scheduled photo is in the hub → device → camera → upload pipeline. */
export function eeyesPhotoStage(task: EeyesTask, now = Date.now()): EeyesPhotoStage {
  if (task.status === "completed") return "uploaded";
  if (task.status === "cancelled") return "cancelled";
  if (task.status === "in_progress") return "capturing";
  if (task.notifyAckedAt) return "taken";
  if (task.notifyDispatchedAt) return "dispatched";
  if (task.notifyAt && Date.parse(task.notifyAt) > now) return "scheduled";
  return "waiting_sync";
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
