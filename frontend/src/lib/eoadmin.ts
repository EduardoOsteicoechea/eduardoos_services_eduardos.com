import { getCsrf, currentCsrf, getJSON, postJSON, putJSON, deleteJSON, type APIErrorBody } from "./api";
import { mustLog } from "./dev-log";

export type EoadminRect = { x: number; y: number; w: number; h: number };

export type EoadminCheckboxDef = {
  id: string;
  label: string;
  unit_label: string;
};

export type EoadminOption = {
  id: string;
  label: string;
  description?: string;
  product_id?: string;
  checkboxes: EoadminCheckboxDef[];
  active?: boolean;
  sort_order?: number;
};

export type EoadminSelectedItem = {
  checkbox_id: string;
  label?: string;
  unit_label?: string;
  units: number;
};

export type EoadminStatement = {
  id: string;
  user_id: string;
  user_email: string;
  option_id: string;
  option_label: string;
  product_id?: string;
  items: EoadminSelectedItem[];
  description: string;
  rects?: {
    amount: EoadminRect;
    reference: EoadminRect;
    date?: EoadminRect | null;
  };
  svg?: string;
  has_image?: boolean;
  image_url?: string;
  status: string;
  admin_note?: string;
  approved_at?: string | null;
  delivered_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type EoadminOptionsResponse = APIErrorBody & {
  options?: EoadminOption[];
  count?: number;
};

export type EoadminStatementsResponse = APIErrorBody & {
  statements?: EoadminStatement[];
  count?: number;
};

export type EoadminStatementResponse = APIErrorBody & {
  statement?: EoadminStatement;
};

export const EOADMIN_STATUSES = [
  "pending_payment",
  "pending_approval",
  "to_deliver",
  "delivered",
  "rejected",
] as const;

export function statusLabel(status: string): string {
  switch (status) {
    case "pending_payment":
      return "Pending payment";
    case "pending_approval":
      return "Pending approval";
    case "to_deliver":
      return "To deliver";
    case "delivered":
      return "Delivered";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export function buildAnnotationSvg(rects: {
  amount?: EoadminRect | null;
  reference?: EoadminRect | null;
  date?: EoadminRect | null;
}): string {
  const parts: string[] = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" preserveAspectRatio="none">',
  ];
  const draw = (r: EoadminRect | null | undefined, stroke: string, label: string) => {
    if (!r || r.w <= 0 || r.h <= 0) return;
    parts.push(
      `<rect data-label="${label}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="${stroke}" stroke-width="0.005" />`,
    );
  };
  draw(rects.amount, "#e11d48", "amount");
  draw(rects.reference, "#2563eb", "reference");
  draw(rects.date, "#16a34a", "date");
  parts.push("</svg>");
  return parts.join("");
}

export async function listEoadminOptions(q = "", all = false): Promise<{ status: number; data: EoadminOptionsResponse; requestId: string }> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (all) params.set("all", "1");
  const qs = params.toString();
  return getJSON<EoadminOptionsResponse>(`/eoadmin/options${qs ? `?${qs}` : ""}`);
}

export async function createEoadminOption(body: Record<string, unknown>) {
  return postJSON<EoadminOptionsResponse & { option?: EoadminOption }>("/eoadmin/options", body);
}

export async function updateEoadminOption(id: string, body: Record<string, unknown>) {
  return putJSON<{ option?: EoadminOption } & APIErrorBody>(`/eoadmin/options/${id}`, body);
}

export async function deleteEoadminOption(id: string) {
  return deleteJSON(`/eoadmin/options/${id}`);
}

export async function listEoadminStatements(status = "") {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return getJSON<EoadminStatementsResponse>(`/eoadmin/statements${qs}`);
}

export async function getEoadminStatement(id: string) {
  return getJSON<EoadminStatementResponse>(`/eoadmin/statements/${id}`);
}

export async function approveEoadminStatement(id: string, note = "") {
  return postJSON<EoadminStatementResponse>(`/eoadmin/statements/${id}/approve`, { note });
}

export async function rejectEoadminStatement(id: string, note = "") {
  return postJSON<EoadminStatementResponse>(`/eoadmin/statements/${id}/reject`, { note });
}

export async function deliverEoadminStatement(id: string, note = "") {
  return postJSON<EoadminStatementResponse>(`/eoadmin/statements/${id}/deliver`, { note });
}

export async function submitEoadminStatement(input: {
  file?: File | null;
  optionId: string;
  description: string;
  items: { checkbox_id: string; units: number }[];
  amountRect?: EoadminRect | null;
  referenceRect?: EoadminRect | null;
  dateRect?: EoadminRect | null;
  svg?: string;
}): Promise<{ status: number; data: EoadminStatementResponse; requestId: string }> {
  await getCsrf();
  const body = new FormData();
  body.append("option_id", input.optionId);
  body.append("description", input.description);
  body.append("items", JSON.stringify(input.items));
  if (input.file) {
    body.append("file", input.file);
    if (input.amountRect) body.append("amount_rect", JSON.stringify(input.amountRect));
    if (input.referenceRect) body.append("reference_rect", JSON.stringify(input.referenceRect));
    if (input.dateRect) body.append("date_rect", JSON.stringify(input.dateRect));
    body.append("svg", input.svg || buildAnnotationSvg({
      amount: input.amountRect,
      reference: input.referenceRect,
      date: input.dateRect,
    }));
  }
  const headers = new Headers();
  headers.set("Accept", "application/json");
  const csrf = currentCsrf();
  if (csrf) headers.set("X-CSRF-Token", csrf);
  if (mustLog) {
    console.log("eoadmin.submit.start", { optionId: input.optionId, hasFile: Boolean(input.file), items: input.items.length });
  }
  const response = await fetch("/api/eoadmin/statements", {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });
  const data = (await response.json().catch(() => ({}))) as EoadminStatementResponse;
  const requestId = response.headers.get("X-Request-ID") || data.request_id || "";
  if (requestId) data.request_id = requestId;
  if (mustLog) {
    console.log("eoadmin.submit.end", { status: response.status, requestId, statementId: data.statement?.id });
  }
  return { status: response.status, data, requestId };
}
