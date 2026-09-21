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

export type ChatPageContext = {
  path: string;
  page_context: string;
};

/** Visible main-column text for the current route (bounded; sent as agent context). */
export function collectChatPageContext(): ChatPageContext {
  const path = typeof location !== "undefined" ? location.pathname.replace(/\/+$/, "") || "/" : "/";
  const main = typeof document !== "undefined" ? document.querySelector("main") : null;
  let page_context = "";
  if (main instanceof HTMLElement) {
    page_context = (main.innerText || "").replace(/\s+/g, " ").trim();
    if (page_context.length > 12000) {
      page_context = page_context.slice(0, 12000);
    }
  }
  return { path, page_context };
}


export type ChatResponse = APIErrorBody & {
  ok?: boolean;
  text?: string;
};

export type ChatStreamOptions = {
  speak?: boolean;
  lang?: string;
  onAudio?: (base64: string, mime: string) => void;
};

export type VoiceConfig = {
  enabled: boolean;
  sampleRate: number;
  langs: string[];
  defaultLang: string;
};

export type VoiceChunkResponse = APIErrorBody & {
  partial?: string;
  final?: string;
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
    if (response.status === 413) {
      return {
        error: "payload_too_large",
        message: "This upload is too large for the server limit.",
      } as T;
    }
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    if (response.status === 413) {
      return {
        error: "payload_too_large",
        message: "This upload is too large for the server limit.",
      } as T;
    }
    const gateway = response.status === 502 || response.status === 503 || response.status === 504;
    return {
      error: "internal_error",
      message: gateway
        ? "Could not reach the API. The server may be down or restarting."
        : "Something went wrong.",
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

export async function apiSend<T>(
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
        data: {
          error: "internal_error",
          message: "The request took too long. Try again with a shorter description, or wait and retry.",
        } as T & APIErrorBody,
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

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; signal?: AbortSignal; skipAuthRetry?: boolean; forceCsrfRefresh?: boolean } = {},
): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  return apiSend<T>(path, init, opts);
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

function shouldForceCsrf(path: string): boolean {
  const normalized = path.startsWith("/api/") ? path.slice(4) : path.startsWith("/") ? path : `/${path}`;
  return (
    normalized === "/auth/login" ||
    normalized === "/auth/register" ||
    normalized === "/auth/verify-email" ||
    normalized === "/auth/resend-verification" ||
    normalized === "/auth/request-password-reset" ||
    normalized === "/auth/reset-password" ||
    normalized === "/auth/refresh"
  );
}

export async function postJSON<T = MeResponse>(
  path: string,
  body: Record<string, unknown>,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  return apiSend<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: opts?.signal,
    },
    { timeoutMs: opts?.timeoutMs, forceCsrfRefresh: shouldForceCsrf(path) },
  );
}

export async function postChatStream(
  message: string,
  history: ChatTurn[],
  onDelta: (delta: string) => void,
  options?: ChatStreamOptions,
): Promise<{ status: number; data: ChatResponse; requestId: string }> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 45000);
  try {
    let response = await sendChat(message, history, true, controller.signal, options);
    if (response.status === 403) {
      await getCsrf(true);
      response = await sendChat(message, history, true, controller.signal, options);
    }
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
          const payload = JSON.parse(line.slice(5).trim()) as ChatResponse & {
            delta?: string;
            done?: boolean;
            type?: string;
            mime?: string;
            data?: string;
          };
          if (payload.type === "audio" && payload.data) {
            options?.onAudio?.(payload.data, payload.mime || "audio/mpeg");
            continue;
          }
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
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 45000);
  try {
    let response = await sendChat(message, history, false, controller.signal);
    if (response.status === 403) {
      await getCsrf(true);
      response = await sendChat(message, history, false, controller.signal);
    }
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

async function sendChat(
  message: string,
  history: ChatTurn[],
  stream: boolean,
  signal: AbortSignal,
  options?: ChatStreamOptions,
): Promise<Response> {
  await getCsrf(true);
  const headers = new Headers();
  headers.set("Accept", stream ? "text/event-stream" : "application/json");
  headers.set("Content-Type", "application/json");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  return fetch(apiUrl("/chat"), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({
      message,
      history,
      ...collectChatPageContext(),
      ...(stream ? { stream: true } : {}),
      ...(options?.speak ? { speak: true, lang: options.lang || "" } : {}),
    }),
    signal,
  });
}

// ---------------------------------------------------------------------------
// Voice: streaming speech-to-text
// ---------------------------------------------------------------------------

export async function getVoiceConfig(): Promise<VoiceConfig | null> {
  try {
    const response = await fetch(apiUrl("/voice/config"), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (response.status !== 200) {
      return null;
    }
    const data = await parseJSON<VoiceConfig & APIErrorBody>(response);
    if (data.enabled) {
      return {
        enabled: true,
        sampleRate: data.sampleRate || 16000,
        langs: data.langs || ["es", "en"],
        defaultLang: data.defaultLang || "es",
      };
    }
  } catch {
    /* voice is optional */
  }
  return null;
}

export async function startVoiceStream(lang: string): Promise<string | null> {
  try {
    const { status, data } = await postJSON<{ streamId?: string; error?: string }>(
      "/voice/stream",
      { lang },
      { timeoutMs: 60000 },
    );
    if (status === 200 && data.streamId) {
      return data.streamId;
    }
  } catch {
    /* handled by caller */
  }
  return null;
}

export async function postVoiceChunk(
  streamId: string,
  pcm: ArrayBuffer,
): Promise<{ status: number; data: VoiceChunkResponse }> {
  await getCsrf(false);
  const headers = new Headers();
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Accept", "application/json");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  try {
    const response = await fetch(apiUrl(`/voice/stream/${encodeURIComponent(streamId)}/chunk`), {
      method: "POST",
      headers,
      credentials: "include",
      body: pcm,
    });
    const data = await parseJSON<VoiceChunkResponse>(response);
    return { status: response.status, data };
  } catch {
    return { status: 0, data: { error: "internal_error" } };
  }
}

export async function stopVoiceStream(streamId: string): Promise<string> {
  try {
    const { status, data } = await postJSON<{ text?: string }>(
      `/voice/stream/${encodeURIComponent(streamId)}/stop`,
      {},
      { timeoutMs: 180000 },
    );
    if (status === 200) {
      return (data.text || "").trim();
    }
  } catch {
    /* ignore */
  }
  return "";
}

export async function cancelVoiceStream(streamId: string): Promise<void> {
  try {
    await postJSON(`/voice/stream/${encodeURIComponent(streamId)}/cancel`, {});
  } catch {
    /* ignore */
  }
}

/** Normalizes a raw ASR transcript into a context-aware message (DeepSeek). */
export async function interpretVoiceMessage(
  text: string,
  history: ChatTurn[],
  lang: string,
): Promise<string> {
  const message = text.trim();
  if (!message) {
    return "";
  }
  try {
    const { status, data } = await postJSON<APIErrorBody>(
      "/voice/interpret",
      { text: message, lang, history },
      { timeoutMs: 45000 },
    );
    if (status === 200 && typeof data.text === "string" && data.text.trim()) {
      return data.text.trim();
    }
  } catch {
    /* fall back to the raw transcript */
  }
  return message;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Synthesizes speech for a text reply (POST /api/voice/speak). Best-effort. */
export async function synthesizeVoice(
  text: string,
  lang: string,
): Promise<{ base64: string; mime: string } | null> {
  await getCsrf(false);
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "audio/*");
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  try {
    const response = await fetch(apiUrl("/voice/speak"), {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ text, lang }),
    });
    if (response.status !== 200) {
      return null;
    }
    const mime = response.headers.get("Content-Type") || "audio/mpeg";
    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) {
      return null;
    }
    return { base64: arrayBufferToBase64(buffer), mime };
  } catch {
    return null;
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

export async function uploadFile<T = APIErrorBody>(
  path: string,
  file: File,
  field = "file",
  fields?: Record<string, string>,
  timeoutMs = 120000,
): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  const body = new FormData();
  body.append(field, file);
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== "") body.append(key, value);
    }
  }
  // Do not set Content-Type: the browser must add the multipart boundary.
  return apiSend<T>(path, { method: "POST", body }, { timeoutMs });
}

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export async function uploadFileWithProgress<T = APIErrorBody>(
  path: string,
  file: File,
  opts: {
    field?: string;
    fields?: Record<string, string>;
    onProgress?: (progress: UploadProgress) => void;
  } = {},
): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> {
  const { field = "file", fields, onProgress } = opts;
  const body = new FormData();
  body.append(field, file);
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== "") body.append(key, value);
    }
  }

  const attempt = async (
    forceCsrf: boolean,
  ): Promise<{ status: number; data: T & APIErrorBody; requestId: string }> => {
    await getCsrf(forceCsrf);
    const result = await new Promise<{ status: number; data: T & APIErrorBody; requestId: string }>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", apiUrl(path), true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Accept", "application/json");
      if (csrfToken) {
        xhr.setRequestHeader("X-CSRF-Token", csrfToken);
      }
      xhr.timeout = 120000;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0;
          onProgress({ loaded: event.loaded, total: event.total, percent });
        }
      };
      xhr.onload = () => {
        const requestId = xhr.getResponseHeader("X-Request-ID") || "";
        const text = xhr.responseText || "";
        let data: T & APIErrorBody = {} as T & APIErrorBody;
        if (text) {
          try {
            data = JSON.parse(text) as T & APIErrorBody;
          } catch {
            data = { error: "internal_error", message: "Something went wrong." } as T & APIErrorBody;
          }
        } else if (xhr.status === 413) {
          data = {
            error: "payload_too_large",
            message: "This upload is too large for the server limit.",
          } as T & APIErrorBody;
        }
        if (!data.request_id && requestId) {
          data.request_id = requestId;
        }
        resolve({ status: xhr.status, data, requestId });
      };
      xhr.onerror = () => {
        resolve({
          status: 0,
          data: { error: "internal_error", message: "Could not reach the API." } as T & APIErrorBody,
          requestId: "",
        });
      };
      xhr.ontimeout = () => {
        resolve({
          status: 0,
          data: { error: "internal_error", message: "The upload took too long." } as T & APIErrorBody,
          requestId: "",
        });
      };
      xhr.onabort = () => {
        resolve({
          status: 0,
          data: { error: "internal_error", message: "The upload was cancelled." } as T & APIErrorBody,
          requestId: "",
        });
      };
      xhr.send(body);
    });

    if (result.status === 403 && !forceCsrf && result.data.error === "forbidden") {
      resetCsrfMemory();
      return attempt(true);
    }
    return result;
  };

  return attempt(false);
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
