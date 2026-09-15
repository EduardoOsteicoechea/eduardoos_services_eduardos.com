/**
 * eocode — agent coding studio API client.
 *
 * The backend orchestrates four DeepSeek steps:
 *   identify -> (consult) | (coding) analyze -> edit -> validate
 * plus asset upload and the static-site preview served to the iframe.
 */

import { apiRequest, postJSON, uploadFile } from "./api";
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
};

export type EocodeValidateResult = {
  needs_correction: boolean;
  files: string[];
  notes: string;
};

export type EocodeResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

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

export async function identifyEocode(message: string): Promise<EocodeResult<EocodeIdentifyResult>> {
  const { status, data } = await postJSON<{
    ok?: boolean;
    type?: string;
    text?: string;
    error?: string;
    message?: string;
  }>("/eocode/identify", { message }, { timeoutMs: 70000 });
  if (status < 200 || status >= 300 || data.ok === false) {
    return { ok: false, status, message: data.message || "The agent could not reply." };
  }
  const type = data.type === "coding" ? "coding" : "consult";
  return { ok: true, data: { type, text: data.text || "" } };
}

export async function analyzeEocode(message: string): Promise<EocodeResult<EocodeAnalyzeResult>> {
  const { status, data } = await postJSON<{
    ok?: boolean;
    preliminary?: string;
    files_to_edit?: EocodeFilePlan[];
    new_files?: EocodeFilePlan[];
    delete_files?: EocodeFilePlan[];
    questions?: string[];
    error?: string;
    message?: string;
  }>("/eocode/analyze", { message }, { timeoutMs: 85000 });
  if (status < 200 || status >= 300 || data.ok === false) {
    return { ok: false, status, message: data.message || "The agent could not plan the change." };
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
): Promise<EocodeResult<EocodeEditResult>> {
  const { status, data } = await postJSON<{
    ok?: boolean;
    files?: string[];
    deleted?: string[];
    error?: string;
    message?: string;
  }>(
    "/eocode/edit",
    {
      message,
      files_to_edit: plan.files_to_edit,
      new_files: plan.new_files,
      delete_files: plan.delete_files,
    },
    { timeoutMs: 130000 },
  );
  if (status < 200 || status >= 300 || data.ok === false) {
    return { ok: false, status, message: data.message || "The agent could not write the files." };
  }
  return { ok: true, data: { files: data.files || [], deleted: data.deleted || [] } };
}

export async function validateEocode(message: string, files: string[]): Promise<EocodeResult<EocodeValidateResult>> {
  const { status, data } = await postJSON<{
    ok?: boolean;
    needs_correction?: boolean;
    files?: string[];
    notes?: string;
    error?: string;
    message?: string;
  }>("/eocode/validate", { message, files }, { timeoutMs: 130000 });
  if (status < 200 || status >= 300 || data.ok === false) {
    return { ok: false, status, message: data.message || "The agent could not validate the change." };
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
