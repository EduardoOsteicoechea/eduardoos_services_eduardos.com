/**
 * eVoice client — projects / docs / audios / generate / playlist share.
 */

import { apiRequest, currentCsrf, getCsrf, uploadFile } from "./api";
import { mustLog } from "./dev-log";

export type EvoiceObjectMeta = {
  name: string;
  key: string;
  size: number;
  lastModified?: string;
  url?: string;
};

export type EvoiceJob = {
  id: string;
  state: string;
  ownerSafe?: string;
  project?: string;
  progress?: number;
  error?: string;
  logs?: string[];
};

export async function fetchEvoiceMe(): Promise<{
  userSafe: string;
  isAdmin: boolean;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{ userSafe?: string; isAdmin?: boolean }>(
    "/evoice/me",
  );
  if (mustLog) console.log("[evoice] me", { status, requestId });
  if (status < 200 || status >= 300) {
    return { userSafe: "", isAdmin: false, error: data.message || "eVoice session failed.", requestId };
  }
  return { userSafe: data.userSafe ?? "", isAdmin: Boolean(data.isAdmin), requestId };
}

export async function fetchEvoiceProjects(ownerSafe?: string): Promise<{
  ownerSafe: string;
  projects: string[];
  error?: string;
  requestId?: string;
}> {
  const q = ownerSafe ? `?owner=${encodeURIComponent(ownerSafe)}` : "";
  const { status, data, requestId } = await apiRequest<{ ownerSafe?: string; projects?: string[] }>(
    `/evoice/projects${q}`,
  );
  if (status < 200 || status >= 300) {
    return { ownerSafe: "", projects: [], error: data.message || "Could not list projects.", requestId };
  }
  return { ownerSafe: data.ownerSafe ?? "", projects: data.projects ?? [], requestId };
}

export async function createEvoiceProject(
  name: string,
  ownerSafe?: string,
): Promise<{ ownerSafe: string; project: string; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ ownerSafe?: string; project?: string }>(
    "/evoice/projects",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, owner: ownerSafe || undefined }),
    },
  );
  if (status < 200 || status >= 300) {
    return { ownerSafe: "", project: "", error: data.message || "Could not create project.", requestId };
  }
  return { ownerSafe: data.ownerSafe ?? "", project: data.project ?? "", requestId };
}

export async function fetchEvoiceDocs(
  ownerSafe: string,
  project: string,
): Promise<{ docs: EvoiceObjectMeta[]; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ docs?: EvoiceObjectMeta[] }>(
    `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/docs`,
  );
  if (status < 200 || status >= 300) {
    return { docs: [], error: data.message || "Could not list docs.", requestId };
  }
  return { docs: data.docs ?? [], requestId };
}

export async function fetchEvoiceAudios(
  ownerSafe: string,
  project: string,
): Promise<{ audios: EvoiceObjectMeta[]; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ audios?: EvoiceObjectMeta[] }>(
    `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/audios`,
  );
  if (status < 200 || status >= 300) {
    return { audios: [], error: data.message || "Could not list audios.", requestId };
  }
  return { audios: data.audios ?? [], requestId };
}

export async function uploadEvoiceDoc(
  ownerSafe: string,
  project: string,
  file: File,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { status, data, requestId } = await uploadFile(
    `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/docs`,
    file,
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: data.message || "Upload failed.", requestId };
  }
  return { ok: true, requestId };
}

export async function startEvoiceGenerate(
  ownerSafe: string,
  project: string,
  body: Record<string, unknown> = {},
): Promise<{ job: EvoiceJob | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<EvoiceJob>(
    `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (status < 200 || status >= 300) {
    return { job: null, error: data.message || "Generate failed.", requestId };
  }
  return { job: data, requestId };
}

export async function fetchEvoiceJob(jobId: string): Promise<{
  job: EvoiceJob | null;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<EvoiceJob>(
    `/evoice/jobs/${encodeURIComponent(jobId)}`,
  );
  if (status < 200 || status >= 300) {
    return { job: null, error: data.message || "Could not load job.", requestId };
  }
  return { job: data, requestId };
}

export async function createEvoiceShare(
  ownerSafe: string,
  project: string,
  files: string[],
  email?: string,
): Promise<{ token?: string; url?: string; link?: string; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{
    token?: string;
    url?: string;
    link?: string;
    invite?: { token?: string };
  }>(
    `/evoice/projects/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/shares`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files, email: email || undefined }),
    },
  );
  if (status < 200 || status >= 300) {
    return { error: data.message || "Could not create share.", requestId };
  }
  const token = data.token || data.invite?.token;
  const link = data.link || data.url;
  return { token, url: link, link, requestId };
}

export type EvoiceShareInvite = {
  token?: string;
  email?: string;
  ownerSafe?: string;
  project?: string;
  files?: string[] | EvoiceObjectMeta[];
  expiresAt?: string;
  createdAt?: string;
};

export async function fetchEvoiceInvite(token: string): Promise<{
  valid?: boolean;
  expired?: boolean;
  invite?: EvoiceShareInvite;
  project?: string;
  files?: EvoiceObjectMeta[];
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{
    valid?: boolean;
    expired?: boolean;
    invite?: EvoiceShareInvite;
    project?: string;
    files?: EvoiceObjectMeta[];
  }>(`/evoice/invite/${encodeURIComponent(token)}`);
  if (status < 200 || status >= 300) {
    return { error: data.message || "Invite not found.", requestId };
  }
  const filesRaw = data.invite?.files ?? data.files ?? [];
  const files: EvoiceObjectMeta[] = (filesRaw as Array<string | EvoiceObjectMeta>).map((f) =>
    typeof f === "string" ? { name: f, key: f, size: 0 } : f,
  );
  return {
    valid: data.valid,
    expired: data.expired,
    invite: data.invite,
    project: data.invite?.project ?? data.project,
    files,
    requestId,
  };
}

export async function acceptEvoicePlaylistInvite(
  token: string,
  project: string,
): Promise<{
  project?: string;
  imported?: string[];
  renamed?: Record<string, string>;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{
    project?: string;
    imported?: string[];
    renamed?: Record<string, string>;
  }>(`/evoice/invite/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project }),
  });
  if (status < 200 || status >= 300) {
    return { error: data.message || "Could not import playlist.", requestId };
  }
  return {
    project: data.project,
    imported: data.imported ?? [],
    renamed: data.renamed ?? {},
    requestId,
  };
}

export function evoiceFileUrl(
  ownerSafe: string,
  project: string,
  kind: "docs" | "audios",
  name: string,
): string {
  const q = new URLSearchParams({ name });
  return `/api/evoice/file/${encodeURIComponent(ownerSafe)}/${encodeURIComponent(project)}/${kind}?${q}`;
}

export async function postEvoiceWithCsrf(path: string, body: Record<string, unknown>): Promise<Response> {
  await getCsrf();
  const headers = new Headers({ "Content-Type": "application/json", Accept: "application/json" });
  const csrf = currentCsrf();
  if (csrf) headers.set("X-CSRF-Token", csrf);
  return fetch(path.startsWith("/api/") ? path : `/api${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });
}
