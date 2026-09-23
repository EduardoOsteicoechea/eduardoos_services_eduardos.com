/**
 * Homescool API client (cookie CSRF).
 */

import { apiRequest, uploadFile } from "./api";
import { mustLog } from "./dev-log";

export type HomescoolLink = {
  id: string;
  teacherEmail: string;
  studentEmail: string;
  studentSlug: string;
  s3Prefix?: string;
  folders?: string[];
  createdAt: string;
};

export type HomescoolTask = {
  id: string;
  name: string;
  description: string;
  period?: string;
  studyAreas?: string[];
  startDate?: string;
  endDate?: string;
  durationMin?: number;
  maxScore?: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

function fail<T extends Record<string, unknown>>(
  status: number,
  data: { message?: string },
  requestId: string,
  empty: T,
): T & { error?: string; requestId?: string } {
  return {
    ...empty,
    error: data.message || `Request failed (${status})`,
    requestId,
  };
}

export async function fetchHomescoolStudents(): Promise<{
  students: HomescoolLink[];
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{ students?: HomescoolLink[]; links?: HomescoolLink[] }>(
    "/homescool/students",
  );
  if (mustLog) console.log("[homescool] students", { status, requestId });
  if (status < 200 || status >= 300) {
    return fail(status, data, requestId, { students: [] as HomescoolLink[] });
  }
  return { students: data.students ?? data.links ?? [], requestId };
}

export async function registerHomescoolStudent(payload: {
  studentEmail: string;
  displayName?: string;
}): Promise<{ student: HomescoolLink | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<HomescoolLink>("/homescool/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (status < 200 || status >= 300) {
    return { student: null, error: data.message || "Could not register student.", requestId };
  }
  return { student: data, requestId };
}

export async function fetchTeacherTasks(slug: string): Promise<{
  tasks: HomescoolTask[];
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{ tasks?: HomescoolTask[] }>(
    `/homescool/students/${encodeURIComponent(slug)}/tasks`,
  );
  if (status < 200 || status >= 300) {
    return fail(status, data, requestId, { tasks: [] as HomescoolTask[] });
  }
  return { tasks: data.tasks ?? [], requestId };
}

export async function createTeacherTask(
  slug: string,
  body: Record<string, unknown>,
): Promise<{ task: HomescoolTask | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<HomescoolTask>(
    `/homescool/students/${encodeURIComponent(slug)}/tasks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (status < 200 || status >= 300) {
    return { task: null, error: data.message || "Could not create task.", requestId };
  }
  return { task: data, requestId };
}

export async function fetchLearningLinks(): Promise<{
  teachers: HomescoolLink[];
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{ teachers?: HomescoolLink[]; links?: HomescoolLink[] }>(
    "/homescool/learning",
  );
  if (status < 200 || status >= 300) {
    return fail(status, data, requestId, { teachers: [] as HomescoolLink[] });
  }
  return { teachers: data.teachers ?? data.links ?? [], requestId };
}

export async function fetchLearningTasks(teacherSlug: string): Promise<{
  tasks: HomescoolTask[];
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{ tasks?: HomescoolTask[] }>(
    `/homescool/learning/${encodeURIComponent(teacherSlug)}/tasks`,
  );
  if (status < 200 || status >= 300) {
    return fail(status, data, requestId, { tasks: [] as HomescoolTask[] });
  }
  return { tasks: data.tasks ?? [], requestId };
}

export async function fetchHomescoolCatalogs(): Promise<{
  catalogs: unknown;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<Record<string, unknown>>("/homescool/catalogs");
  if (status < 200 || status >= 300) {
    return { catalogs: null, error: data.message || "Could not load catalogs.", requestId };
  }
  return { catalogs: data, requestId };
}

export async function uploadTeacherFolderFile(
  slug: string,
  folder: string,
  file: File,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { status, data, requestId } = await uploadFile(
    `/homescool/students/${encodeURIComponent(slug)}/folders/${encodeURIComponent(folder)}`,
    file,
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: data.message || "Upload failed.", requestId };
  }
  return { ok: true, requestId };
}

export type HomescoolMaterial = {
  id: string;
  ownerUserId: string;
  cycle: number;
  week: number;
  subject: string;
  day: number;
  level?: number;
  format?: string;
  sessionDate?: string;
  title: string;
  slug?: string;
  documentPath?: string;
  htmlPath?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EoschoolQuestion = {
  id: string;
  originDay: number;
  type: string;
  prompt: string;
  choices?: string[];
  answer?: string;
};

export type EoschoolDocument = {
  format: string;
  version: number;
  cycle: number;
  week: number;
  day: number;
  level: number;
  subject: string;
  locale?: string;
  title: string;
  lesson: {
    kind: string;
    focusPoint?: number | null;
    points: { id?: string; heading: string; body: string }[];
    summary?: string;
  };
  quiz: {
    questionCount: number;
    questions: EoschoolQuestion[];
  };
  media?: { id?: string; path: string; alt?: string }[];
};

export type HomescoolCycleSummary = {
  cycle: number;
  count: number;
  empty: boolean;
};

export async function fetchHomescoolMaterials(cycle?: number): Promise<{
  cycles: HomescoolCycleSummary[];
  materials: HomescoolMaterial[];
  error?: string;
  requestId?: string;
}> {
  const q = cycle ? `?cycle=${encodeURIComponent(String(cycle))}` : "";
  const { status, data, requestId } = await apiRequest<{
    cycles?: HomescoolCycleSummary[];
    materials?: HomescoolMaterial[];
  }>(`/homescool/materials${q}`);
  if (mustLog) console.log("[homescool] materials", { status, requestId, cycle });
  if (status < 200 || status >= 300) {
    return fail(status, data, requestId, {
      cycles: [] as HomescoolCycleSummary[],
      materials: [] as HomescoolMaterial[],
    });
  }
  return {
    cycles: data.cycles ?? [],
    materials: data.materials ?? [],
    requestId,
  };
}

export async function fetchHomescoolMaterial(id: string): Promise<{
  material: HomescoolMaterial | null;
  viewUrl?: string;
  documentUrl?: string;
  pdfUrl?: string;
  htmlUrl?: string;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{
    material?: HomescoolMaterial;
    viewUrl?: string;
    documentUrl?: string;
    pdfUrl?: string;
    htmlUrl?: string;
  }>(`/homescool/materials/${encodeURIComponent(id)}`);
  if (mustLog) {
    console.log("[homescool] material", {
      status,
      requestId,
      id,
      format: data.material?.format,
      hasDocumentUrl: Boolean(data.documentUrl),
    });
  }
  if (status < 200 || status >= 300) {
    return { material: null, error: data.message || "Could not load material.", requestId };
  }
  return {
    material: data.material ?? null,
    viewUrl: data.viewUrl,
    documentUrl: data.documentUrl,
    pdfUrl: data.pdfUrl,
    htmlUrl: data.htmlUrl,
    requestId,
  };
}

/** GET cookie-auth PDF and trigger a browser download. */
export async function downloadHomescoolMaterialPdf(
  materialId: string,
  fileName = "homescool.pdf",
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const id = materialId.trim();
  if (!id) return { ok: false, error: "Missing material id." };
  const url = `/api/homescool/materials/${encodeURIComponent(id)}/pdf`;
  if (mustLog) console.log("[homescool] pdf.download.start", { id, fileName });
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/pdf, application/json" },
    });
    const requestId = res.headers.get("X-Request-ID") || "";
    if (!res.ok) {
      let message = `PDF download failed (${res.status})`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        /* ignore */
      }
      if (mustLog) console.log("[homescool] pdf.download.fail", { status: res.status, requestId, message });
      return { ok: false, error: message, requestId };
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    if (mustLog) console.log("[homescool] pdf.download.ok", { id, bytes: blob.size, requestId });
    return { ok: true, requestId };
  } catch (err) {
    if (mustLog) console.log("[homescool] pdf.download.error", { err: String(err) });
    return { ok: false, error: "Could not download PDF." };
  }
}
