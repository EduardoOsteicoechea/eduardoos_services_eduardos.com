/**
 * eocode — agent coding studio API client.
 *
 * The backend orchestrates four DeepSeek steps:
 *   identify -> (consult) | (coding) analyze -> edit -> validate
 * plus asset upload and the static-site preview served to the iframe.
 */

import { apiRequest, deleteJSON, postJSON, putJSON, uploadFile } from "./api";
import { mustLog } from "./dev-log";

export type EocodeAsset = {
  path: string;
  url: string;
  mime: string;
};

export type EocodeFileEntry = {
  path: string;
  type: string;
  size: number;
  dependencies?: string[];
  routes?: string[];
};

export type EocodeState = {
  user_id: string;
  is_admin: boolean;
  files: EocodeFileEntry[];
  media: string[];
  rules: string[];
  rules_index: string;
  preview_url: string;
};

export type EocodeFilePlan = {
  path: string;
  reason?: string;
};

export type EocodeIdentifyResult = {
  type: "consult" | "coding";
  text: string;
};

export type EocodeAnalyzeResult = {
  preliminary: string;
  files_to_edit: EocodeFilePlan[];
  new_files: EocodeFilePlan[];
  delete_files: EocodeFilePlan[];
  questions: string[];
};

export type EocodeEditResult = {
  files: string[];
  deleted: string[];
  changed: string[];
  unchanged: string[];
  render_ok: boolean;
  render_error?: string;
};

export type EocodeValidateResult = {
  needs_correction: boolean;
  files: string[];
  notes: string;
};

export type EocodeResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; detail?: string };

function log(step: string, detail: Record<string, unknown> = {}): void {
  if (mustLog) {
    console.log("[eocode]", step, detail);
  }
}

export async function fetchEocodeState(): Promise<
  { status: number; state?: EocodeState; error?: string; message?: string }
> {
  const { status, data } = await apiRequest<EocodeState & { error?: string; message?: string }>("/eocode/state");
  log("state", { status, files: data.files?.length, error: data.error });
  if (status < 200 || status >= 300) {
    return { status, error: data.error, message: data.message };
  }
  return { status, state: data };
}

export type EocodeFileContent = {
  path: string;
  type: string;
  content: string;
};

/** Reads one workspace file for the studio viewer (owner-scoped). */
export async function fetchEocodeFile(path: string): Promise<EocodeFileContent | null> {
  const normalized = path.replace(/^\/+/, "");
  const { status, data } = await apiRequest<EocodeFileContent & { error?: string }>(
    `/eocode/file/${normalized}`,
  );
  if (status < 200 || status >= 300 || typeof data.content !== "string") {
    return null;
  }
  return { path: data.path || normalized, type: data.type || "", content: data.content };
}

export type EocodeChatTurn = { role: "user" | "assistant"; content: string };

/** Loads the persisted conversation so a reload keeps the same chat. */
export async function fetchEocodeHistory(): Promise<EocodeChatTurn[]> {
  const { status, data } = await apiRequest<{ turns?: EocodeChatTurn[] }>("/eocode/history");
  if (status < 200 || status >= 300) {
    return [];
  }
  return (data.turns || []).filter((turn) => turn && typeof turn.content === "string");
}

/** Persists the conversation to the workspace chat history file. */
export async function saveEocodeHistory(turns: EocodeChatTurn[]): Promise<void> {
  try {
    await putJSON("/eocode/history", { turns });
  } catch {
    /* best-effort */
  }
}

export async function clearEocodeHistory(): Promise<void> {
  try {
    await deleteJSON("/eocode/history");
  } catch {
    /* best-effort */
  }
}

export async function identifyEocode(message: string, signal?: AbortSignal): Promise<EocodeResult<EocodeIdentifyResult>> {
  const { status, data } = await postJSON<{
    ok?: boolean;
    type?: string;
    text?: string;
    error?: string;
    message?: string;
    detail?: string;
  }>("/eocode/identify", { message }, { timeoutMs: 70000, signal });
  if (status < 200 || status >= 300 || data.ok === false) {
    return { ok: false, status, message: data.message || "The agent could not reply.", detail: data.detail };
  }
  const type = data.type === "coding" ? "coding" : "consult";
  return { ok: true, data: { type, text: data.text || "" } };
}

export async function analyzeEocode(message: string, signal?: AbortSignal): Promise<EocodeResult<EocodeAnalyzeResult>> {
  const { status, data } = await postJSON<{
    ok?: boolean;
    preliminary?: string;
    files_to_edit?: EocodeFilePlan[];
    new_files?: EocodeFilePlan[];
    delete_files?: EocodeFilePlan[];
    questions?: string[];
    error?: string;
    message?: string;
    detail?: string;
  }>("/eocode/analyze", { message }, { timeoutMs: 85000, signal });
  if (status < 200 || status >= 300 || data.ok === false) {
    return { ok: false, status, message: data.message || "The agent could not plan the change.", detail: data.detail };
  }
  return {
    ok: true,
    data: {
      preliminary: data.preliminary || "",
      files_to_edit: data.files_to_edit || [],
      new_files: data.new_files || [],
      delete_files: data.delete_files || [],
      questions: data.questions || [],
    },
  };
}

export async function editEocode(
  message: string,
  plan: Pick<EocodeAnalyzeResult, "files_to_edit" | "new_files" | "delete_files">,
  signal?: AbortSignal,
): Promise<EocodeResult<EocodeEditResult>> {
  const { status, data } = await postJSON<{
    ok?: boolean;
    files?: string[];
    changed?: string[];
    unchanged?: string[];
    deleted?: string[];
    render_ok?: boolean;
    render_error?: string;
    error?: string;
    message?: string;
    detail?: string;
  }>(
    "/eocode/edit",
    {
      message,
      files_to_edit: plan.files_to_edit,
      new_files: plan.new_files,
      delete_files: plan.delete_files,
    },
    { timeoutMs: 140000, signal },
  );
  if (status < 200 || status >= 300 || data.ok === false) {
    return { ok: false, status, message: data.message || "The agent could not write the files.", detail: data.detail };
  }
  return {
    ok: true,
    data: {
      files: data.files || [],
      changed: data.changed || [],
      unchanged: data.unchanged || [],
      deleted: data.deleted || [],
      render_ok: data.render_ok !== false,
      render_error: data.render_error,
    },
  };
}

export async function validateEocode(
  message: string,
  files: string[],
  signal?: AbortSignal,
): Promise<EocodeResult<EocodeValidateResult>> {
  const { status, data } = await postJSON<{
    ok?: boolean;
    needs_correction?: boolean;
    files?: string[];
    notes?: string;
    error?: string;
    message?: string;
    detail?: string;
  }>("/eocode/validate", { message, files }, { timeoutMs: 140000, signal });
  if (status < 200 || status >= 300 || data.ok === false) {
    return { ok: false, status, message: data.message || "The agent could not validate the change.", detail: data.detail };
  }
  return {
    ok: true,
    data: {
      needs_correction: Boolean(data.needs_correction),
      files: data.files || [],
      notes: data.notes || "",
    },
  };
}

export async function uploadEocodeAsset(file: File): Promise<EocodeResult<EocodeAsset>> {
  const { status, data } = await uploadFile<EocodeAsset>("/eocode/upload", file);
  if (status < 200 || status >= 300 || !data.path) {
    return { ok: false, status, message: data.message || "Could not upload the image." };
  }
  return { ok: true, data };
}
