import { apiRequest, postJSON, deleteJSON, type APIErrorBody } from "./api";

export type APIKeyRow = {
  id: string;
  label: string;
  prefix: string;
  created_at?: string;
  last_used_at?: string;
};

export type APIKeysResponse = APIErrorBody & { keys?: APIKeyRow[] };

export type APIKeyCreateResponse = APIErrorBody & {
  id?: string;
  label?: string;
  prefix?: string;
  created_at?: string;
  key?: string;
};

export function listAPIKeys() {
  return apiRequest<APIKeysResponse>("/admin/apikeys");
}

export function createAPIKey(label: string) {
  return postJSON<APIKeyCreateResponse>("/admin/apikeys", { label });
}

export function revokeAPIKey(id: string) {
  return deleteJSON<APIErrorBody>(`/admin/apikeys/${encodeURIComponent(id)}`);
}
