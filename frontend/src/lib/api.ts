export type HealthResponse = {
  status: string;
  service?: string;
};

export type InfoResponse = {
  name: string;
  domain: string;
};

export type APIErrorBody = {
  error?: string;
  message?: string;
  request_id?: string;
  debug?: string;
  csrf?: string;
  ok?: boolean;
  id?: string;
  email?: string;
  username?: string;
  display_name?: string | null;
  phone?: string | null;
  role?: string;
  status?: string;
  email_verified?: boolean;
  avatar?: string | null;
};

export type MeResponse = APIErrorBody;

export type DiagnosticsResult = APIErrorBody & {
  text?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

let csrfToken = "";

function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.startsWith("/api/") ? normalized : `/api${normalized}`;
}

function rememberCsrf(token?: string): void {
  if (token) {
    csrfToken = token;
  }
}

export function currentCsrf(): string {
  return csrfToken;
}

export function resetCsrfMemory(): void {
  csrfToken = "";
}

async function parseJSON<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: "internal_error", message: "Something went wrong." } as T;
  }
}

function isUnsafe(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

async function apiSend<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const method = (init.method || "GET").toUpperCase();
  if (isUnsafe(method)) {
    await getCsrf();
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }
  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  const data = await parseJSON<T & APIErrorBody>(response);
  const requestId = response.headers.get("X-Request-ID") || data.request_id || "";
  if (!data.request_id && requestId) {
    data.request_id = requestId;
  }
  return { status: response.status, data, requestId };
}

export async function apiGet<T>(path: string): Promise<T> {
  const { status, data } = await apiSend<T>(path);
  if (status < 200 || status >= 300) {
    throw new Error(data.message || `Request failed with HTTP ${status}`);
  }
  return data;
}

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/health");
}

export function getInfo(): Promise<InfoResponse> {
  return apiGet<InfoResponse>("/info");
}

export async function getCsrf(): Promise<string> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  const response = await fetch(apiUrl("/auth/csrf"), {
    method: "GET",
    headers,
    credentials: "include",
  });
  const data = await parseJSON<{ csrf?: string }>(response);
  if (response.status === 200) {
    rememberCsrf(data.csrf);
  }
  return csrfToken;
}

export async function getMe(): Promise<{ status: number; data: MeResponse; requestId: string }> {
  return apiSend<MeResponse>("/auth/me");
}

export async function postJSON<T = MeResponse>(path: string, body: Record<string, unknown>): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  return apiSend<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchJSON<T = MeResponse>(path: string, body: Record<string, unknown>): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  return apiSend<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function loginAdmin(email: string, password: string, _csrf?: string): Promise<{ status: number; data: MeResponse; requestId: string }> {
  return postJSON<MeResponse>("/auth/login", { email, password });
}

export async function postDiagnostics(path: string, _csrf: string, body: Record<string, string>): Promise<{ status: number; data: DiagnosticsResult; requestId: string }> {
  return postJSON<DiagnosticsResult>(path, body);
}

export async function uploadAvatar(file: File): Promise<{ status: number; data: MeResponse; requestId: string }> {
  await getCsrf();
  const body = new FormData();
  body.append("file", file);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(apiUrl("/profile/avatar"), {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });
  const data = await parseJSON<MeResponse>(response);
  const requestId = response.headers.get("X-Request-ID") || data.request_id || "";
  if (requestId) {
    data.request_id = requestId;
  }
  return { status: response.status, data, requestId };
}

export async function deleteAvatar(): Promise<{ status: number; data: MeResponse; requestId: string }> {
  return apiSend<MeResponse>("/profile/avatar", { method: "DELETE" });
}
