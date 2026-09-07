export type HealthResponse = {
  status: string;
  service?: string;
};

export type InfoResponse = {
  name: string;
  domain: string;
};

export type MeResponse = {
  id?: string;
  email?: string;
  username?: string;
  display_name?: string | null;
  phone?: string | null;
  role?: string;
  status?: string;
  email_verified?: boolean;
  avatar?: string | null;
  csrf?: string;
  error?: string;
  ok?: boolean;
};

export type DiagnosticsResult = {
  ok?: boolean;
  request_id?: string;
  error?: string;
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

async function parseJSON<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

async function apiSend<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T }> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const method = (init.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  const data = await parseJSON<T>(response);
  if (data && typeof data === "object" && "csrf" in data && typeof (data as { csrf?: string }).csrf === "string") {
    rememberCsrf((data as { csrf: string }).csrf);
  }
  return { status: response.status, data };
}

export async function apiGet<T>(path: string): Promise<T> {
  const { status, data } = await apiSend<T>(path);
  if (status < 200 || status >= 300) {
    throw new Error(`Request failed with HTTP ${status}`);
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
  const { data } = await apiSend<{ csrf?: string }>("/auth/csrf");
  rememberCsrf(data.csrf);
  return csrfToken;
}

export async function getMe(): Promise<{ status: number; data: MeResponse }> {
  const result = await apiSend<MeResponse>("/auth/me");
  rememberCsrf(result.data.csrf);
  return result;
}

export async function postJSON<T = MeResponse>(path: string, body: Record<string, unknown>): Promise<{ status: number; data: T }> {
  if (!csrfToken) {
    await getCsrf();
  }
  return apiSend<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchJSON<T = MeResponse>(path: string, body: Record<string, unknown>): Promise<{ status: number; data: T }> {
  if (!csrfToken) {
    await getCsrf();
  }
  return apiSend<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function loginAdmin(email: string, password: string, csrf: string): Promise<{ status: number; data: MeResponse }> {
  rememberCsrf(csrf);
  return postJSON<MeResponse>("/auth/login", { email, password });
}

export async function postDiagnostics(path: string, csrf: string, body: Record<string, string>): Promise<{ status: number; data: DiagnosticsResult }> {
  rememberCsrf(csrf);
  return postJSON<DiagnosticsResult>(path, body);
}

export async function uploadAvatar(file: File): Promise<{ status: number; data: MeResponse }> {
  if (!csrfToken) {
    await getCsrf();
  }
  const body = new FormData();
  body.append("file", file);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(apiUrl("/profile/avatar"), {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });
  const data = await parseJSON<MeResponse>(response);
  rememberCsrf(data.csrf);
  return { status: response.status, data };
}

export async function deleteAvatar(): Promise<{ status: number; data: MeResponse }> {
  if (!csrfToken) {
    await getCsrf();
  }
  return apiSend<MeResponse>("/profile/avatar", { method: "DELETE" });
}
