/**
 * eoProject client — projects / stages / photos / IFC versions / share links.
 */

import { apiRequest, deleteJSON, patchJSON, uploadFile } from "./api";
import { mustLog } from "./dev-log";

export type EoprojectProject = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type EoprojectStage = {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type EoprojectPhoto = {
  id: string;
  projectId: string;
  stageId: string;
  userId: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
  url?: string;
};

export type EoprojectIfcVersion = {
  id: string;
  projectId: string;
  stageId: string;
  userId: string;
  version: number;
  label?: string;
  originalName: string;
  size: number;
  createdAt: string;
  url?: string;
};

export type EoprojectShare = {
  id: string;
  userId?: string;
  projectId?: string;
  label?: string;
  token?: string;
  link?: string;
  expiresAt: string;
  createdAt: string;
  expired?: boolean;
};

export type EoprojectStageBundle = {
  stage: EoprojectStage;
  photos: EoprojectPhoto[];
  ifcVersions: EoprojectIfcVersion[];
};

export type EoprojectDashboard = {
  project: EoprojectProject;
  stages: EoprojectStageBundle[];
};

export type EoprojectInvite = {
  valid: boolean;
  expiresAt?: string;
  label?: string;
  dashboard?: EoprojectDashboard;
  error?: string;
  requestId?: string;
};

function failMsg(data: { message?: string }, fallback: string): string {
  return data.message || fallback;
}

export async function fetchEoprojectMe(): Promise<{
  email: string;
  userId: string;
  isAdmin: boolean;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{
    email?: string;
    userId?: string;
    isAdmin?: boolean;
  }>("/eoproject/me");
  if (mustLog) console.log("[eoproject] me", { status, requestId });
  if (status < 200 || status >= 300) {
    return {
      email: "",
      userId: "",
      isAdmin: false,
      error: failMsg(data, "eoProject session failed."),
      requestId,
    };
  }
  return {
    email: data.email ?? "",
    userId: data.userId ?? "",
    isAdmin: Boolean(data.isAdmin),
    requestId,
  };
}

export async function listEoprojectProjects(): Promise<{
  projects: EoprojectProject[];
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{ projects?: EoprojectProject[] }>(
    "/eoproject/projects",
  );
  if (status < 200 || status >= 300) {
    return { projects: [], error: failMsg(data, "Could not list projects."), requestId };
  }
  return { projects: data.projects ?? [], requestId };
}

export async function createEoprojectProject(
  name: string,
  description?: string,
): Promise<{ project: EoprojectProject | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ project?: EoprojectProject }>(
    "/eoproject/projects",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined }),
    },
  );
  if (status < 200 || status >= 300) {
    return { project: null, error: failMsg(data, "Could not create project."), requestId };
  }
  return { project: data.project ?? null, requestId };
}

export async function fetchEoprojectDashboard(
  projectId: string,
): Promise<{ dashboard: EoprojectDashboard | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<EoprojectDashboard>(
    `/eoproject/projects/${encodeURIComponent(projectId)}`,
  );
  if (status < 200 || status >= 300) {
    return { dashboard: null, error: failMsg(data, "Could not load project."), requestId };
  }
  return {
    dashboard: {
      project: data.project,
      stages: data.stages ?? [],
    },
    requestId,
  };
}

export async function updateEoprojectProject(
  projectId: string,
  body: { name?: string; description?: string },
): Promise<{ project: EoprojectProject | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await patchJSON<{ project?: EoprojectProject }>(
    `/eoproject/projects/${encodeURIComponent(projectId)}`,
    body,
  );
  if (status < 200 || status >= 300) {
    return { project: null, error: failMsg(data, "Could not update project."), requestId };
  }
  return { project: data.project ?? null, requestId };
}

export async function deleteEoprojectProject(
  projectId: string,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { status, data, requestId } = await deleteJSON(
    `/eoproject/projects/${encodeURIComponent(projectId)}`,
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: failMsg(data, "Could not delete project."), requestId };
  }
  return { ok: true, requestId };
}

export async function createEoprojectStage(
  projectId: string,
  name: string,
  sortOrder?: number,
): Promise<{ stage: EoprojectStage | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ stage?: EoprojectStage }>(
    `/eoproject/projects/${encodeURIComponent(projectId)}/stages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sortOrder }),
    },
  );
  if (status < 200 || status >= 300) {
    return { stage: null, error: failMsg(data, "Could not create stage."), requestId };
  }
  return { stage: data.stage ?? null, requestId };
}

export async function updateEoprojectStage(
  projectId: string,
  stageId: string,
  body: { name?: string; sortOrder?: number },
): Promise<{ stage: EoprojectStage | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await patchJSON<{ stage?: EoprojectStage }>(
    `/eoproject/projects/${encodeURIComponent(projectId)}/stages/${encodeURIComponent(stageId)}`,
    body,
  );
  if (status < 200 || status >= 300) {
    return { stage: null, error: failMsg(data, "Could not update stage."), requestId };
  }
  return { stage: data.stage ?? null, requestId };
}

export async function deleteEoprojectStage(
  projectId: string,
  stageId: string,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { status, data, requestId } = await deleteJSON(
    `/eoproject/projects/${encodeURIComponent(projectId)}/stages/${encodeURIComponent(stageId)}`,
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: failMsg(data, "Could not delete stage."), requestId };
  }
  return { ok: true, requestId };
}

export async function uploadEoprojectPhoto(
  projectId: string,
  stageId: string,
  file: File,
): Promise<{ photo: EoprojectPhoto | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await uploadFile<{ photo?: EoprojectPhoto }>(
    `/eoproject/projects/${encodeURIComponent(projectId)}/stages/${encodeURIComponent(stageId)}/photos`,
    file,
  );
  if (status < 200 || status >= 300) {
    return { photo: null, error: failMsg(data, "Photo upload failed."), requestId };
  }
  return { photo: data.photo ?? null, requestId };
}

export async function deleteEoprojectPhoto(
  projectId: string,
  stageId: string,
  photoId: string,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { status, data, requestId } = await deleteJSON(
    `/eoproject/projects/${encodeURIComponent(projectId)}/stages/${encodeURIComponent(stageId)}/photos/${encodeURIComponent(photoId)}`,
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: failMsg(data, "Could not delete photo."), requestId };
  }
  return { ok: true, requestId };
}

export async function uploadEoprojectIfc(
  projectId: string,
  stageId: string,
  file: File,
  label?: string,
): Promise<{ version: EoprojectIfcVersion | null; error?: string; requestId?: string }> {
  const fields = label?.trim() ? { label: label.trim() } : undefined;
  const { status, data, requestId } = await uploadFile<{ version?: EoprojectIfcVersion }>(
    `/eoproject/projects/${encodeURIComponent(projectId)}/stages/${encodeURIComponent(stageId)}/ifc`,
    file,
    "file",
    fields,
  );
  if (status < 200 || status >= 300) {
    return { version: null, error: failMsg(data, "IFC upload failed."), requestId };
  }
  return { version: data.version ?? null, requestId };
}

export async function deleteEoprojectIfc(
  projectId: string,
  stageId: string,
  versionId: string,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { status, data, requestId } = await deleteJSON(
    `/eoproject/projects/${encodeURIComponent(projectId)}/stages/${encodeURIComponent(stageId)}/ifc/${encodeURIComponent(versionId)}`,
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: failMsg(data, "Could not delete IFC version."), requestId };
  }
  return { ok: true, requestId };
}

export async function listEoprojectShares(
  projectId: string,
): Promise<{ shares: EoprojectShare[]; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ shares?: EoprojectShare[] }>(
    `/eoproject/projects/${encodeURIComponent(projectId)}/shares`,
  );
  if (status < 200 || status >= 300) {
    return { shares: [], error: failMsg(data, "Could not list shares."), requestId };
  }
  return { shares: data.shares ?? [], requestId };
}

export async function createEoprojectShare(
  projectId: string,
  label: string,
  durationHours: number,
): Promise<{ share: EoprojectShare | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<{ share?: EoprojectShare }>(
    `/eoproject/projects/${encodeURIComponent(projectId)}/shares`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, durationHours }),
    },
  );
  if (status < 200 || status >= 300) {
    return { share: null, error: failMsg(data, "Could not create share."), requestId };
  }
  return { share: data.share ?? null, requestId };
}

export async function deleteEoprojectShare(
  projectId: string,
  shareId: string,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { status, data, requestId } = await deleteJSON(
    `/eoproject/projects/${encodeURIComponent(projectId)}/shares/${encodeURIComponent(shareId)}`,
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: failMsg(data, "Could not delete share."), requestId };
  }
  return { ok: true, requestId };
}

export async function fetchEoprojectInvite(token: string): Promise<EoprojectInvite> {
  const { status, data, requestId } = await apiRequest<{
    valid?: boolean;
    expiresAt?: string;
    label?: string;
    dashboard?: EoprojectDashboard;
  }>(`/eoproject/invite/${encodeURIComponent(token)}`);
  if (status < 200 || status >= 300) {
    return { valid: false, error: failMsg(data, "Invite not found."), requestId };
  }
  return {
    valid: Boolean(data.valid),
    expiresAt: data.expiresAt,
    label: data.label,
    dashboard: data.dashboard,
    requestId,
  };
}

export function eoprojectPhotoFileUrl(
  projectId: string,
  stageId: string,
  photoId: string,
): string {
  return `/api/eoproject/projects/${encodeURIComponent(projectId)}/stages/${encodeURIComponent(stageId)}/photos/${encodeURIComponent(photoId)}/file`;
}

export function eoprojectIfcFileUrl(
  projectId: string,
  stageId: string,
  versionId: string,
): string {
  return `/api/eoproject/projects/${encodeURIComponent(projectId)}/stages/${encodeURIComponent(stageId)}/ifc/${encodeURIComponent(versionId)}/file`;
}

export function eoprojectInvitePhotoUrl(token: string, photoId: string): string {
  return `/api/eoproject/invite/${encodeURIComponent(token)}/photos/${encodeURIComponent(photoId)}/file`;
}

export function eoprojectInviteIfcUrl(token: string, versionId: string): string {
  return `/api/eoproject/invite/${encodeURIComponent(token)}/ifc/${encodeURIComponent(versionId)}/file`;
}

export function eoprojectInvitePageUrl(token: string): string {
  return `/eoproject/invite?token=${encodeURIComponent(token)}`;
}
