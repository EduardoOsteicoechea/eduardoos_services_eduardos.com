import { sessionLog, sessionLogCookies } from "./dev-log";

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

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = APIErrorBody & {
  ok?: boolean;
  text?: string;
};

let csrfToken = "";

function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.startsWith("/api/") ? normalized : `/api${normalized}`;
}

function rememberCsrf(token?: string): void {
  if (token) {
    sessionLog("csrf.remember", { tokenLength: token.length });
    csrfToken = token;
  }
}

export function currentCsrf(): string {
  return csrfToken;
}

export function resetCsrfMemory(): void {
  sessionLog("csrf.reset");
  csrfToken = "";
}

export type LoginPayload = {
  identifier: string;
  password: string;
};

export function loginPayload(identifier: string, password: string): LoginPayload {
  return { identifier: identifier.trim(), password };
}

export function profileAvatarURL(avatar: string | null | undefined): string | null {
  if (!avatar) {
    return null;
  }
  try {
    const url = new URL(avatar, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || url.pathname !== "/api/profile/avatar") {
      return null;
    }
    return `/api/profile/avatar${url.search}`;
  } catch {
    return null;
  }
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

const apiTimeoutMs = 12000;

function timeoutSignal(existing?: AbortSignal | null): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), apiTimeoutMs);
  const cancel = () => globalThis.clearTimeout(timer);
  if (existing) {
    if (existing.aborted) {
      controller.abort();
    } else {
      existing.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }
  return { signal: controller.signal, cancel };
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
  const timed = timeoutSignal(init.signal);
  const url = apiUrl(path);
  sessionLog("api.request", {
    method,
    url,
    hasCsrfHeader: headers.has("X-CSRF-Token"),
    csrfInMemory: Boolean(csrfToken),
  });
  sessionLogCookies(`before ${method} ${path}`);
  try {
    const response = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
      signal: timed.signal,
    });
    const data = await parseJSON<T & APIErrorBody>(response);
    const requestId = response.headers.get("X-Request-ID") || data.request_id || "";
    if (!data.request_id && requestId) {
      data.request_id = requestId;
    }
    if (response.ok && typeof data.csrf === "string" && data.csrf) {
      rememberCsrf(data.csrf);
    }
    sessionLog("api.response", {
      method,
      path,
      status: response.status,
      requestId,
      error: data.error,
      hasUser: Boolean((data as MeResponse).id),
    });
    sessionLogCookies(`after ${method} ${path}`);
    return { status: response.status, data, requestId };
  } catch (err) {
    sessionLog("api.network_error", {
      method,
      path,
      error: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        status: 0,
        data: { error: "internal_error", message: "Could not reach the API." } as T & APIErrorBody,
        requestId: "",
      };
    }
    throw err;
  } finally {
    timed.cancel();
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const { status, data } = await apiSend<T>(path);
  if (status < 200 || status >= 300) {
    throw new Error(data.message || `Request failed with HTTP ${status}`);
  }
  return data;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  return apiSend<T>(path, init);
}

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/health");
}

export function getInfo(): Promise<InfoResponse> {
  return apiGet<InfoResponse>("/info");
}

export async function getCsrf(): Promise<string> {
  sessionLog("csrf.fetch_start");
  const headers = new Headers();
  headers.set("Accept", "application/json");
  const response = await fetch(apiUrl("/auth/csrf"), {
    method: "GET",
    headers,
    credentials: "include",
  });
  const data = await parseJSON<{ csrf?: string }>(response);
  sessionLog("csrf.fetch_done", { status: response.status, tokenLength: data.csrf?.length ?? 0 });
  sessionLogCookies("after /auth/csrf");
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

export async function postChatStream(
  message: string,
  history: ChatTurn[],
  onDelta: (delta: string) => void,
): Promise<{ status: number; data: ChatResponse; requestId: string }> {
  await getCsrf();
  const headers = new Headers();
  headers.set("Accept", "text/event-stream");
  headers.set("Content-Type", "application/json");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(apiUrl("/chat"), {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ message, history, stream: true }),
      signal: controller.signal,
    });
    const requestId = response.headers.get("X-Request-ID") || "";
    const type = response.headers.get("Content-Type") || "";
    if (!type.includes("event-stream")) {
      const data = await parseJSON<ChatResponse>(response);
      if (!data.request_id && requestId) {
        data.request_id = requestId;
      }
      return { status: response.status, data, requestId: data.request_id || requestId };
    }
    const reader = response.body?.getReader();
    if (!reader) {
      return { status: response.status, data: { error: "provider_unavailable", message: "The assistant could not reply." }, requestId };
    }
    const decoder = new TextDecoder();
    let buf = "";
    let final: ChatResponse = { ok: true };
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() || "";
      for (const part of parts) {
        const line = part.split("\n").find((item) => item.startsWith("data:"));
        if (!line) {
          continue;
        }
        try {
          const payload = JSON.parse(line.slice(5).trim()) as ChatResponse & { delta?: string; done?: boolean };
          if (payload.delta) {
            onDelta(payload.delta);
          }
          if (payload.done || payload.ok === false || payload.error) {
            final = payload;
          }
          if (payload.request_id) {
            final.request_id = payload.request_id;
          }
        } catch {
          /* ignore a partial event */
        }
      }
    }
    return { status: response.status, data: final, requestId: final.request_id || requestId };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        status: 0,
        data: { error: "internal_error", message: "Could not reach the API." },
        requestId: "",
      };
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export async function postChat(message: string, history: ChatTurn[]): Promise<{ status: number; data: ChatResponse; requestId: string }> {
  await getCsrf();
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(apiUrl("/chat"), {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    });
    const data = await parseJSON<ChatResponse>(response);
    const requestId = response.headers.get("X-Request-ID") || data.request_id || "";
    if (!data.request_id && requestId) {
      data.request_id = requestId;
    }
    return { status: response.status, data, requestId };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        status: 0,
        data: { error: "internal_error", message: "Could not reach the API." },
        requestId: "",
      };
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export async function patchJSON<T = MeResponse>(path: string, body: Record<string, unknown>): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  return apiSend<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function putJSON<T = MeResponse>(path: string, body: Record<string, unknown>): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  return apiSend<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteJSON<T = MeResponse>(path: string): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  return apiSend<T>(path, { method: "DELETE" });
}

export async function uploadFile<T = APIErrorBody>(path: string, file: File, field = "file"): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  await getCsrf();
  const body = new FormData();
  body.append(field, file);
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });
  const data = await parseJSON<T & APIErrorBody>(response);
  const requestId = response.headers.get("X-Request-ID") || data.request_id || "";
  if (requestId) {
    data.request_id = requestId;
  }
  return { status: response.status, data, requestId };
}

export async function loginAdmin(email: string, password: string, _csrf?: string): Promise<{ status: number; data: MeResponse; requestId: string }> {
  return postJSON<MeResponse>("/auth/login", loginPayload(email, password));
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
