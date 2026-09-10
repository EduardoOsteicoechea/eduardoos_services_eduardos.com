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

export type AdminUserRow = {
  id: string;
  email: string;
  username: string;
  display_name?: string | null;
  role: string;
  status: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUsersResponse = APIErrorBody & {
  users?: AdminUserRow[];
  count?: number;
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
let csrfInFlight: Promise<string> | null = null;
let refreshInFlight: Promise<{ status: number; data: MeResponse; requestId: string }> | null = null;

const SESSION_HINT_KEY = "eduardoos.session-hint";
const REFRESH_LOCK_KEY = "eduardoos.refresh-lock";
const REFRESH_LOCK_MS = 15000;

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
  csrfInFlight = null;
}

export function markSessionHint(): void {
  try {
    sessionStorage.setItem(SESSION_HINT_KEY, "1");
    sessionLog("session.hint.set");
  } catch {
    /* private mode */
  }
}

export function clearSessionHint(): void {
  try {
    sessionStorage.removeItem(SESSION_HINT_KEY);
    sessionLog("session.hint.clear");
  } catch {
    /* private mode */
  }
}

export function hasSessionHint(): boolean {
  try {
    return sessionStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function isAuthPath(path: string): boolean {
  const p = path.startsWith("/") ? path : `/${path}`;
  const normalized = p.startsWith("/api/") ? p.slice(4) : p;
  return (
    normalized === "/auth/me" ||
    normalized === "/auth/csrf" ||
    normalized === "/auth/refresh" ||
    normalized === "/auth/login" ||
    normalized === "/auth/logout" ||
    normalized === "/auth/register" ||
    normalized.startsWith("/auth/")
  );
}

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request("eduardoos-session-refresh", fn);
  }
  const started = Date.now();
  while (Date.now() - started < REFRESH_LOCK_MS) {
    try {
      const raw = localStorage.getItem(REFRESH_LOCK_KEY);
      const until = raw ? Number(raw) : 0;
      if (!until || until < Date.now()) {
        localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now() + REFRESH_LOCK_MS));
        break;
      }
    } catch {
      break;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  try {
    return await fn();
  } finally {
    try {
      localStorage.removeItem(REFRESH_LOCK_KEY);
    } catch {
      /* ignore */
    }
  }
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
    const gateway = response.status === 502 || response.status === 503 || response.status === 504;
    return {
      error: "internal_error",
      message: gateway ? "Could not reach the API. The server may be down or restarting." : "Something went wrong.",
    } as T;
  }
}

function isUnsafe(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

const apiTimeoutMs = 12000;

type ApiSendOpts = {
  skipAuthRetry?: boolean;
  skipCsrfRetry?: boolean;
  forceCsrfRefresh?: boolean;
  timeoutMs?: number;
};

function timeoutSignal(
  existing?: AbortSignal | null,
  ms = apiTimeoutMs,
): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), ms);
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

function logApiFailure(
  method: string,
  path: string,
  status: number,
  data: APIErrorBody,
  requestId: string,
): void {
  if (status < 400 && status !== 0) {
    return;
  }
  if (path.includes("/auth/me") && status === 401) {
    return;
  }
  console.error("[api.error]", {
    method,
    path,
    status,
    requestId,
    error: data.error,
    message: data.message,
  });
}

async function apiSend<T>(
  path: string,
  init: RequestInit = {},
  opts: ApiSendOpts = {},
): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const method = (init.method || "GET").toUpperCase();
  if (isUnsafe(method)) {
    await getCsrf(opts.forceCsrfRefresh);
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }
  const timed = timeoutSignal(init.signal, opts.timeoutMs ?? apiTimeoutMs);
  const url = apiUrl(path);
  sessionLog("api.request", {
    method,
    url,
    hasCsrfHeader: headers.has("X-CSRF-Token"),
    csrfInMemory: Boolean(csrfToken),
    skipAuthRetry: Boolean(opts.skipAuthRetry),
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
    if (response.ok && (data as MeResponse).id) {
      markSessionHint();
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

    if (
      response.status === 401 &&
      !opts.skipAuthRetry &&
      !isAuthPath(path) &&
      hasSessionHint()
    ) {
      sessionLog("api.unauthorized_retry_refresh", { path, method });
      const refreshed = await refreshSession();
      if (refreshed.status === 200 && refreshed.data.id) {
        return apiSend<T>(path, init, { ...opts, skipAuthRetry: true });
      }
    }

    if (
      response.status === 403 &&
      isUnsafe(method) &&
      !opts.skipCsrfRetry &&
      data.error === "forbidden"
    ) {
      sessionLog("api.forbidden_retry_csrf", { path, method, error: data.error });
      resetCsrfMemory();
      return apiSend<T>(path, init, { ...opts, skipCsrfRetry: true, forceCsrfRefresh: true });
    }

    logApiFailure(method, path, response.status, data, requestId);
    return { status: response.status, data, requestId };
  } catch (err) {
    sessionLog("api.network_error", {
      method,
      path,
      error: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message : String(err),
    });
    console.error("[api.network_error]", {
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

export async function getCsrf(force = false): Promise<string> {
  if (!force && csrfToken) {
    sessionLog("csrf.reuse_memory", { tokenLength: csrfToken.length });
    return csrfToken;
  }
  if (force) {
    if (csrfInFlight) {
      try {
        await csrfInFlight;
      } catch {
        /* ignore prior mint failure */
      }
    }
    csrfToken = "";
    csrfInFlight = null;
  }
  if (!csrfInFlight) {
    sessionLog("csrf.fetch_start", { force });
    csrfInFlight = (async () => {
      const timed = timeoutSignal();
      try {
        const headers = new Headers();
        headers.set("Accept", "application/json");
        const response = await fetch(apiUrl("/auth/csrf"), {
          method: "GET",
          headers,
          credentials: "include",
          signal: timed.signal,
        });
        const data = await parseJSON<{ csrf?: string }>(response);
        sessionLog("csrf.fetch_done", { status: response.status, tokenLength: data.csrf?.length ?? 0 });
        sessionLogCookies("after /auth/csrf");
        if (response.status === 200) {
          rememberCsrf(data.csrf);
        }
        return csrfToken;
      } finally {
        timed.cancel();
        csrfInFlight = null;
      }
    })();
  }
  return csrfInFlight;
}

export async function refreshSession(): Promise<{ status: number; data: MeResponse; requestId: string }> {
  if (!refreshInFlight) {
    sessionLog("session.refresh.start");
    refreshInFlight = withRefreshLock(async () => {
      const result = await postJSON<MeResponse>("/auth/refresh", {});
      sessionLog("session.refresh.done", { status: result.status, userId: result.data.id });
      if (result.status === 200 && result.data.id) {
        markSessionHint();
      } else if (result.status === 401) {
        clearSessionHint();
      }
      return result;
    }).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function getMe(): Promise<{ status: number; data: MeResponse; requestId: string }> {
  const first = await apiSend<MeResponse>("/auth/me", {}, { skipAuthRetry: true });
  if (first.status === 200 && first.data.id) {
    markSessionHint();
    return first;
  }
  if (first.status !== 401) {
    return first;
  }
  if (!hasSessionHint()) {
    sessionLog("session.me.guest_skip_refresh");
    return first;
  }
  sessionLog("session.me.unauthorized_try_refresh");
  const refreshed = await refreshSession();
  if (refreshed.status !== 200 || !refreshed.data.id) {
    clearSessionHint();
    return first;
  }
  return apiSend<MeResponse>("/auth/me", {}, { skipAuthRetry: true });
}

export async function getAdminUsers(): Promise<{ status: number; data: AdminUsersResponse; requestId: string }> {
  return apiSend<AdminUsersResponse>("/admin/users");
}

export async function getJSON<T = MeResponse>(path: string): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  return apiSend<T>(path);
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
    const type = (response.headers.get("Content-Type") || "").toLowerCase();
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
  const body = new FormData();
  body.append(field, file);
  // Do not set Content-Type: the browser must add the multipart boundary.
  return apiSend<T>(path, { method: "POST", body }, { timeoutMs: 120000 });
}

export async function loginAdmin(email: string, password: string, _csrf?: string): Promise<{ status: number; data: MeResponse; requestId: string }> {
  return postJSON<MeResponse>("/auth/login", loginPayload(email, password));
}

export async function postDiagnostics(path: string, _csrf: string, body: Record<string, string>): Promise<{ status: number; data: DiagnosticsResult; requestId: string }> {
  return postJSON<DiagnosticsResult>(path, body);
}

export async function uploadAvatar(file: File): Promise<{ status: number; data: MeResponse; requestId: string }> {
  return uploadFile<MeResponse>("/profile/avatar", file);
}

export async function deleteAvatar(): Promise<{ status: number; data: MeResponse; requestId: string }> {
  return apiSend<MeResponse>("/profile/avatar", { method: "DELETE" });
}
