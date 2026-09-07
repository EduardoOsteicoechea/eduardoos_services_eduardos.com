export type HealthResponse = {
  status: string;
  service?: string;
};

export type InfoResponse = {
  name: string;
  domain: string;
};

function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.startsWith("/api/") ? normalized : `/api${normalized}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/health");
}

export function getInfo(): Promise<InfoResponse> {
  return apiGet<InfoResponse>("/info");
}
