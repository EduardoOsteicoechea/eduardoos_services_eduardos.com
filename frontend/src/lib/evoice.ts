/**
 * eVoice client — projects / docs / audios / generate / playlist share.
 * Cookie + CSRF via ./api (credentials: include). No Bearer JWT.
 */

import { apiRequest, currentCsrf, getCsrf, uploadFile, type APIErrorBody } from "./api";
import { mustLog } from "./dev-log";

export type EvoiceObjectMeta = {
  name: string;
  key: string;
  size: number;
  lastModified?: string;
  url?: string;
};

export type EvoiceJobStep = {
  id: string;
  label: string;
  state: "pending" | "active" | "done" | "failed" | "skipped" | string;
};

export type EvoiceJobFile = {
  name: string;
  state: "pending" | "active" | "done" | "skipped" | "failed" | string;
  progress: number;
  detail?: string;
};

export type EvoiceGenerateMode = "standard" | "premium" | "super_premium";

export type EvoiceJob = {
  id: string;
  state: "queued" | "running" | "done" | "failed" | "stopped" | string;
  ownerSafe: string;
  project: string;
  onlyFiles?: string[];
  premium?: boolean;
  mode?: EvoiceGenerateMode | string;
  contentPercent?: number;
  logs: string[];
  steps?: EvoiceJobStep[];
  files?: EvoiceJobFile[];
  progress?: number;
  currentStep?: string;
  error?: string;
  stats?: {
    docs: number;
    generated: number;
    skipped: number;
    failed: number;
  };
};

export type EvoiceShareFile = { name: string; size: number };

export type EvoiceShareInvite = {
  token: string;
  email: string;
  ownerSafe: string;
  project: string;
  files: EvoiceShareFile[];
  expiresAt: string;
  createdAt?: string;
};

function apiErr(data: APIErrorBody, fallback: string): string {
  return (data.message || data.error || fallback).trim() || fallback;
}

function docsPath(ownerSafe: string, project: string): string {
  return `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/docs`;
}

function audiosPath(ownerSafe: string, project: string): string {
  return `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/audios`;
}

function fileApiPath(
  ownerSafe: string,
  project: string,
  kind: "docs" | "audios",
  name: string,
  key?: string,
): string {
  const q = new URLSearchParams();
  q.set("name", name);
  if (key) q.set("key", key);
  return `/api/evoice/file/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/${kind}?${q}`;
}

/** Only pass storage key when it belongs to this owner/project. */
export function evoiceKeyForProject(
  ownerSafe: string,
  project: string,
  kind: "docs" | "audios",
  key?: string,
): string | undefined {
  if (!key) return undefined;
  const prefix = `evoice/${ownerSafe}/${project}/${kind}/`;
  return key.startsWith(prefix) ? key : undefined;
}

export function evoiceFileUrl(
  ownerSafe: string,
  project: string,
  kind: "docs" | "audios",
  name: string,
  key?: string,
): string {
  return fileApiPath(
    ownerSafe,
    project,
    kind,
    name,
    evoiceKeyForProject(ownerSafe, project, kind, key),
  );
}

export function evoiceAudioPath(
  ownerSafe: string,
  project: string,
  name: string,
  key?: string,
): string {
  return evoiceFileUrl(ownerSafe, project, "audios", name, key);
}

export async function fetchEvoiceMe(): Promise<{
  userSafe: string;
  isAdmin: boolean;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{
    userSafe?: string;
    isAdmin?: boolean;
  }>("/evoice/me");
  if (mustLog) console.log("[evoice] me", { status, requestId });
  if (status < 200 || status >= 300) {
    return { userSafe: "", isAdmin: false, error: apiErr(data, "eVoice session failed."), requestId };
  }
  return { userSafe: data.userSafe ?? "", isAdmin: Boolean(data.isAdmin), requestId };
}

export async function fetchEvoiceUsers(): Promise<{
  users: string[];
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{ users?: string[] }>("/evoice/users");
  if (status < 200 || status >= 300) {
    return { users: [], error: apiErr(data, "Could not list users."), requestId };
  }
  return { users: data.users ?? [], requestId };
}

export async function fetchEvoiceProjects(ownerSafe?: string): Promise<{
  ownerSafe: string;
  projects: string[];
  error?: string;
  requestId?: string;
}> {
  const q = ownerSafe ? `?owner=${encodeURIComponent(ownerSafe)}` : "";
  const { status, data, requestId } = await apiRequest<{
    ownerSafe?: string;
    projects?: string[];
  }>(`/evoice/projects${q}`);
  if (status < 200 || status >= 300) {
    return { ownerSafe: "", projects: [], error: apiErr(data, "Could not list projects."), requestId };
  }
  return { ownerSafe: data.ownerSafe ?? "", projects: data.projects ?? [], requestId };
}

export async function createEvoiceProject(
  name: string,
  ownerSafe?: string,
): Promise<{ ownerSafe: string; project: string; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{
    ownerSafe?: string;
    project?: string;
  }>("/evoice/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, owner: ownerSafe || undefined }),
  });
  if (status < 200 || status >= 300) {
    return { ownerSafe: "", project: "", error: apiErr(data, "Could not create project."), requestId };
  }
  return { ownerSafe: data.ownerSafe ?? "", project: data.project ?? "", requestId };
}

export async function deleteEvoiceProject(
  ownerSafe: string,
  project: string,
): Promise<{ error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ deleted?: boolean }>(
    `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}`,
    { method: "DELETE" },
  );
  if (status < 200 || status >= 300) {
    return { error: apiErr(data, "Could not delete project."), requestId };
  }
  return { requestId };
}

export async function fetchEvoiceDocs(
  ownerSafe: string,
  project: string,
): Promise<{ docs: EvoiceObjectMeta[]; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ docs?: EvoiceObjectMeta[] }>(
    docsPath(ownerSafe, project),
  );
  if (status < 200 || status >= 300) {
    return { docs: [], error: apiErr(data, "Could not list docs."), requestId };
  }
  return { docs: data.docs ?? [], requestId };
}

export async function fetchEvoiceAudios(
  ownerSafe: string,
  project: string,
): Promise<{ audios: EvoiceObjectMeta[]; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ audios?: EvoiceObjectMeta[] }>(
    audiosPath(ownerSafe, project),
  );
  if (status < 200 || status >= 300) {
    return { audios: [], error: apiErr(data, "Could not list audios."), requestId };
  }
  return { audios: data.audios ?? [], requestId };
}

export async function uploadEvoiceDoc(
  ownerSafe: string,
  project: string,
  file: File,
): Promise<{ name: string; error?: string; requestId?: string }> {
  const { status, data, requestId } = await uploadFile<{ name?: string }>(
    docsPath(ownerSafe, project),
    file,
  );
  if (mustLog) console.log("[evoice] upload doc", { status, requestId, name: data.name });
  if (status < 200 || status >= 300) {
    return { name: "", error: apiErr(data, "Upload failed."), requestId };
  }
  return { name: data.name ?? file.name, requestId };
}

export async function pasteEvoiceDocText(
  ownerSafe: string,
  project: string,
  text: string,
): Promise<{ name: string; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ name?: string }>(
    `${docsPath(ownerSafe, project)}/text`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );
  if (status < 200 || status >= 300) {
    return { name: "", error: apiErr(data, "Could not save pasted text."), requestId };
  }
  return { name: data.name ?? "", requestId };
}

/**
 * URL crawl — original client path. Current Go mux has no crawl handler;
 * failures surface as API errors for the UI.
 */
export async function crawlEvoiceDocURL(
  ownerSafe: string,
  project: string,
  url: string,
): Promise<{ name: string; preview?: string; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ name?: string; preview?: string }>(
    `${docsPath(ownerSafe, project)}/crawl`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    },
  );
  if (status < 200 || status >= 300) {
    return { name: "", error: apiErr(data, "Could not crawl URL."), requestId };
  }
  return { name: data.name ?? "", preview: data.preview, requestId };
}

export async function deleteEvoiceDoc(
  ownerSafe: string,
  project: string,
  name: string,
): Promise<{ error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ deleted?: boolean }>(
    `${docsPath(ownerSafe, project)}?name=${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
  if (status < 200 || status >= 300) {
    return { error: apiErr(data, "Could not delete document."), requestId };
  }
  return { requestId };
}

export async function deleteEvoiceAudio(
  ownerSafe: string,
  project: string,
  name: string,
): Promise<{ error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ deleted?: boolean }>(
    `${audiosPath(ownerSafe, project)}?name=${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
  if (status < 200 || status >= 300) {
    return { error: apiErr(data, "Could not delete audio."), requestId };
  }
  return { requestId };
}

export async function startEvoiceGenerate(
  ownerSafe: string,
  project: string,
  files?: string[],
  mode: EvoiceGenerateMode = "standard",
  contentPercent = 100,
): Promise<{ jobId: string; error?: string; requestId?: string }> {
  const body: {
    files?: string[];
    mode: EvoiceGenerateMode;
    contentPercent: number;
    premium?: boolean;
  } = { mode, contentPercent };
  if (files && files.length > 0) body.files = files;
  if (mode === "premium" || mode === "super_premium") body.premium = true;

  const { status, data, requestId } = await apiRequest<{ jobId?: string }>(
    `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (mustLog) console.log("[evoice] generate", { status, requestId, jobId: data.jobId });
  if (status < 200 || status >= 300) {
    return { jobId: "", error: apiErr(data, "Generate failed."), requestId };
  }
  return { jobId: data.jobId ?? "", requestId };
}

export async function fetchEvoiceJob(jobId: string): Promise<{
  job: EvoiceJob | null;
  error?: string;
  status?: number;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<EvoiceJob>(
    `/evoice/jobs/${encodeURIComponent(jobId)}`,
  );
  if (status < 200 || status >= 300) {
    return { job: null, error: apiErr(data, "Could not load job."), status, requestId };
  }
  return { job: data, status, requestId };
}

export async function stopEvoiceJob(
  jobId: string,
): Promise<{ job: EvoiceJob | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<EvoiceJob>(
    `/evoice/jobs/${encodeURIComponent(jobId)}/stop`,
    { method: "POST" },
  );
  if (status < 200 || status >= 300) {
    return { job: null, error: apiErr(data, "Could not stop job."), requestId };
  }
  return { job: data, requestId };
}

export async function resumeEvoiceJob(jobId: string): Promise<{
  jobId: string;
  files?: string[];
  premium?: boolean;
  mode?: string;
  contentPercent?: number;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{
    jobId?: string;
    files?: string[];
    premium?: boolean;
    mode?: string;
    contentPercent?: number;
  }>(`/evoice/jobs/${encodeURIComponent(jobId)}/resume`, { method: "POST" });
  if (status < 200 || status >= 300) {
    return { jobId: "", error: apiErr(data, "Could not resume job."), requestId };
  }
  return {
    jobId: data.jobId ?? "",
    files: data.files,
    premium: data.premium,
    mode: data.mode,
    contentPercent: data.contentPercent,
    requestId,
  };
}

/** Fetch a docs file as text (cookies only — no Authorization). */
export async function fetchEvoiceDocText(
  ownerSafe: string,
  project: string,
  name: string,
  key?: string,
): Promise<{ text: string; error?: string }> {
  try {
    const path = evoiceFileUrl(ownerSafe, project, "docs", name, key);
    const res = await fetch(path, { credentials: "include" });
    if (!res.ok) return { text: "", error: `Doc fetch failed (${res.status})` };
    return { text: await res.text() };
  } catch (e) {
    return { text: "", error: e instanceof Error ? e.message : "Doc fetch failed" };
  }
}

/** Lightweight backend liveness check used before auto-resume. */
export async function fetchBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Authenticated audio blob URL (cookies only — no Authorization). */
export async function fetchEvoiceAudioBlobUrl(
  ownerSafe: string,
  project: string,
  name: string,
  key?: string,
): Promise<string> {
  const path = evoiceAudioPath(ownerSafe, project, name, key);
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) {
    let body = "";
    try {
      body = (await res.text()).slice(0, 400);
    } catch {
      /* ignore */
    }
    throw new Error(`Audio fetch failed (${res.status}) GET ${path}${body ? ` — ${body}` : ""}`);
  }
  return URL.createObjectURL(await res.blob());
}

export async function downloadEvoiceAudio(
  ownerSafe: string,
  project: string,
  name: string,
  key?: string,
): Promise<void> {
  const url = await fetchEvoiceAudioBlobUrl(ownerSafe, project, name, key);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Create playlist share invite + email magic link. */
export async function createEvoicePlaylistShare(
  ownerSafe: string,
  project: string,
  email: string,
  files?: string[],
  durationHours = 72,
): Promise<{ invite: EvoiceShareInvite; link: string }> {
  const { status, data, requestId } = await apiRequest<{
    invite?: EvoiceShareInvite;
    link?: string;
  }>(
    `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/shares`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        files: files ?? [],
        durationHours,
      }),
    },
  );
  if (mustLog) console.log("[evoice] share", { status, requestId });
  if (status < 200 || status >= 300 || !data.invite || !data.link) {
    throw new Error(apiErr(data, "Could not create playlist share."));
  }
  return { invite: data.invite, link: data.link };
}

/** Alias for createEvoicePlaylistShare. */
export const createEvoiceShare = createEvoicePlaylistShare;

/** Public invite preview (cookies optional; no CSRF). */
export async function fetchEvoicePlaylistInvite(token: string): Promise<{
  valid: boolean;
  expired: boolean;
  invite: EvoiceShareInvite;
}> {
  const { status, data } = await apiRequest<{
    valid?: boolean;
    expired?: boolean;
    invite?: EvoiceShareInvite;
  }>(`/evoice/invite/${encodeURIComponent(token)}`);
  if (status < 200 || status >= 300 || !data.invite) {
    throw new Error(apiErr(data, "Invite not found."));
  }
  return {
    valid: Boolean(data.valid),
    expired: Boolean(data.expired),
    invite: data.invite,
  };
}

/** Alias for fetchEvoicePlaylistInvite. */
export const fetchEvoiceInvite = fetchEvoicePlaylistInvite;

/** Copy shared tracks into caller's project. */
export async function acceptEvoicePlaylistInvite(
  token: string,
  project: string,
): Promise<{
  project: string;
  imported: string[];
  renamed: Record<string, string>;
}> {
  const { status, data } = await apiRequest<{
    project?: string;
    imported?: string[];
    renamed?: Record<string, string>;
  }>(`/evoice/invite/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  });
  if (status < 200 || status >= 300 || !data.project) {
    throw new Error(apiErr(data, "Could not import playlist."));
  }
  return {
    project: data.project,
    imported: data.imported ?? [],
    renamed: data.renamed ?? {},
  };
}

export async function postEvoiceWithCsrf(
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  await getCsrf();
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
  });
  const csrf = currentCsrf();
  if (csrf) headers.set("X-CSRF-Token", csrf);
  return fetch(path.startsWith("/api/") ? path : `/api${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });
}
