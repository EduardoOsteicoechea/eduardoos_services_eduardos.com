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
  role?: string;
  email_verified?: boolean;
  csrf: string;
  error?: string;
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

function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.startsWith("/api/") ? normalized : `/api${normalized}`;
}

async function parseJSON<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  return parseJSON<T>(response);
}

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/health");
}

export function getInfo(): Promise<InfoResponse> {
  return apiGet<InfoResponse>("/info");
}

export async function getMe(): Promise<{ status: number; data: MeResponse }> {
  const response = await fetch(apiUrl("/auth/me"), {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  const data = await parseJSON<MeResponse>(response);
  return { status: response.status, data };
}

export async function loginAdmin(email: string, password: string, csrf: string): Promise<{ status: number; data: MeResponse }> {
  const response = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJSON<MeResponse>(response);
  return { status: response.status, data };
}

export async function postDiagnostics(path: string, csrf: string, body: Record<string, string>): Promise<{ status: number; data: DiagnosticsResult }> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
    },
    body: JSON.stringify(body),
  });
  const data = await parseJSON<DiagnosticsResult>(response);
  return { status: response.status, data };
}
