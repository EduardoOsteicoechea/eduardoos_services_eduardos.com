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
