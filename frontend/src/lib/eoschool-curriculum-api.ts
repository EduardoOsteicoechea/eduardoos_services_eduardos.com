import { apiRequest, apiSend } from "./api";

export const DEFAULT_CURRICULUM_STUDENT_KEY = "elias-osteicoechea";

export type CurriculumStudent = {
  studentKey: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  age: number;
  grade: string;
  photoUrl?: string;
  hasPhoto?: boolean;
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
const PORTFOLIO_PATH = "/eoschool/curriculum/portfolio-preview";
const PROGRAM_PATH = "/eoschool/curriculum/program-preview";

export async function fetchCurriculumProgress(
  studentKey = DEFAULT_CURRICULUM_STUDENT_KEY,
): Promise<{ ok: true; data: CurriculumProgressPayload } | { ok: false; status: number; requestId?: string }> {
  const q = new URLSearchParams({ studentKey });
  const { status, data, requestId } = await apiSend<CurriculumProgressPayload>(
    `${PROGRESS_PATH}?${q}`,
    { method: "GET" },
  );
  if (status === 401 || status === 403 || status === 404) {
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
  if (status === 401 || status === 403 || status === 404) {
    return { ok: false, status, requestId };
  }
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "No se pudo cargar la lista de estudiantes.");
  }
  return { ok: true, data };
}

export async function createCurriculumStudent(input: {
  firstName: string;
  lastName: string;
  age: number;
  grade: string;
  photo?: File | null;
}): Promise<{ ok: true; student: CurriculumStudent } | { ok: false; error: string; requestId?: string }> {
  const body = new FormData();
  body.set("firstName", input.firstName);
  body.set("lastName", input.lastName);
  body.set("age", String(input.age));
  body.set("grade", input.grade);
  if (input.photo) body.set("photo", input.photo);
  const { status, data, requestId } = await apiSend<{ student: CurriculumStudent; message?: string }>(
    STUDENTS_PATH,
    { method: "POST", body },
    { timeoutMs: 120000 },
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: data.message || "No se pudo registrar el estudiante.", requestId };
  }
  return { ok: true, student: data.student };
}

export async function updateCurriculumStudent(
  studentKey: string,
  input: {
    firstName?: string;
    lastName?: string;
    age?: number;
    grade?: string;
    photo?: File | null;
    clearPhoto?: boolean;
  },
): Promise<{ ok: true; student: CurriculumStudent } | { ok: false; error: string; requestId?: string }> {
  const body = new FormData();
  if (input.firstName != null) body.set("firstName", input.firstName);
  if (input.lastName != null) body.set("lastName", input.lastName);
  if (input.age != null) body.set("age", String(input.age));
  if (input.grade != null) body.set("grade", input.grade);
  if (input.clearPhoto) body.set("clearPhoto", "true");
  if (input.photo) body.set("photo", input.photo);
  const { status, data, requestId } = await apiSend<{ student: CurriculumStudent; message?: string }>(
    `${STUDENTS_PATH}/${encodeURIComponent(studentKey)}`,
    { method: "PATCH", body },
    { timeoutMs: 120000 },
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: data.message || "No se pudo actualizar el estudiante.", requestId };
  }
  return { ok: true, student: data.student };
}

export async function deleteCurriculumStudent(
  studentKey: string,
): Promise<{ ok: true } | { ok: false; error: string; requestId?: string }> {
  const { status, data, requestId } = await apiSend<{ message?: string }>(
    `${STUDENTS_PATH}/${encodeURIComponent(studentKey)}`,
    { method: "DELETE" },
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: data.message || "No se pudo eliminar el estudiante.", requestId };
  }
  return { ok: true };
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

function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function fetchCurriculumPortfolioPreview(studentKey: string): Promise<{
  ok: boolean;
  pdfBytes?: Uint8Array;
  error?: string;
  requestId?: string;
}> {
  const { status, data, requestId } = await apiRequest<{ pdf_base64?: string; message?: string }>(
    PORTFOLIO_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentKey }),
    },
  );
  if (status < 200 || status >= 300) {
    return { ok: false, error: data.message || "No se pudo generar el portafolio.", requestId };
  }
  if (!data.pdf_base64) {
    return { ok: false, error: "Respuesta sin PDF.", requestId };
  }
  return { ok: true, pdfBytes: base64ToBytes(data.pdf_base64), requestId };
}

export async function fetchCurriculumProgramPreview(): Promise<{
  ok: boolean;
  pdfBytes?: Uint8Array;
  error?: string;
  requestId?: string;
}> {
  const { getCsrf } = await import("./api");
  const csrf = await getCsrf();
  const res = await fetch(`/api${PROGRAM_PATH}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/pdf, application/json",
      "X-CSRF-Token": csrf,
    },
  });
  const requestId = res.headers.get("X-Request-ID") || undefined;
  if (!res.ok) {
    let message = "No se pudo generar el PDF del programa.";
    try {
      const err = (await res.json()) as { message?: string };
      if (err.message) message = err.message;
    } catch {
      /* ignore */
    }
    return { ok: false, error: message, requestId };
  }
  const ctype = res.headers.get("Content-Type") || "";
  if (ctype.includes("application/pdf")) {
    const buf = await res.arrayBuffer();
    return { ok: true, pdfBytes: new Uint8Array(buf), requestId };
  }
  try {
    const data = (await res.json()) as { pdf_base64?: string; message?: string };
    if (data.pdf_base64) {
      return { ok: true, pdfBytes: base64ToBytes(data.pdf_base64), requestId };
    }
    return { ok: false, error: data.message || "Respuesta sin PDF.", requestId };
  } catch {
    return { ok: false, error: "Respuesta inválida.", requestId };
  }
}
