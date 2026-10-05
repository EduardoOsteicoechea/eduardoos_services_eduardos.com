import { apiSend } from "./api";

export const DEFAULT_CURRICULUM_STUDENT_KEY = "elias-osteicoechea";

export type CurriculumStudent = {
  studentKey: string;
  displayName: string;
  age: number;
  grade: string;
};

export type CurriculumProgressPayload = {
  student: CurriculumStudent;
  sectionsDone: string[];
};

export type CurriculumStudentsPayload = {
  students: CurriculumStudent[];
};

/** Normalize to /api/... via apiSend's apiUrl (do not prefix /api here). */
const PROGRESS_PATH = "/eoschool/curriculum/progress";
const SECTIONS_PATH = "/eoschool/curriculum/progress/sections";
const STUDENTS_PATH = "/eoschool/curriculum/students";

export async function fetchCurriculumProgress(
  studentKey = DEFAULT_CURRICULUM_STUDENT_KEY,
): Promise<{ ok: true; data: CurriculumProgressPayload } | { ok: false; status: number; requestId?: string }> {
  const q = new URLSearchParams({ studentKey });
  const { status, data, requestId } = await apiSend<CurriculumProgressPayload>(
    `${PROGRESS_PATH}?${q}`,
    { method: "GET" },
  );
  if (status === 401 || status === 403) {
    return { ok: false, status, requestId };
  }
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "No se pudo cargar el progreso.");
  }
  return { ok: true, data };
}

export async function fetchCurriculumStudents(): Promise<
  { ok: true; data: CurriculumStudentsPayload } | { ok: false; status: number; requestId?: string }
> {
  const { status, data, requestId } = await apiSend<CurriculumStudentsPayload>(STUDENTS_PATH, {
    method: "GET",
  });
  if (status === 401 || status === 403) {
    return { ok: false, status, requestId };
  }
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "No se pudo cargar la lista de estudiantes.");
  }
  return { ok: true, data };
}

export async function patchCurriculumSection(input: {
  studentKey: string;
  dayId: string;
  sectionId: string;
  completed: boolean;
}): Promise<CurriculumProgressPayload> {
  const { status, data, requestId } = await apiSend<CurriculumProgressPayload>(SECTIONS_PATH, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (status < 200 || status >= 300) {
    const err = new Error(data.message || "No se pudo guardar el progreso.") as Error & {
      requestId?: string;
      status?: number;
    };
    err.requestId = requestId;
    err.status = status;
    throw err;
  }
  return data;
}
