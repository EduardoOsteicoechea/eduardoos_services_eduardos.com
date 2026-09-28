/**
 * Pamphlet footer profiles (cookie CSRF).
 */

import { apiRequest } from "./api";
import {
  emptyFooter,
  ensureFooterLabelColon,
  FOOTER_DEFAULT_LABELS,
  type PamphletFooter,
} from "./pamphlet-generator/src/pamphlet_schema";

export type FooterProfile = {
  userId: string;
  footerId: string;
  name: string;
  footer: PamphletFooter;
  createdAt?: string;
  updatedAt?: string;
};

export type FooterListResponse = {
  count: number;
  footers: FooterProfile[];
};

export async function fetchFooterProfiles(): Promise<FooterListResponse> {
  const { status, data } = await apiRequest<FooterListResponse>("/epams/footers");
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not load footers.");
  }
  return {
    count: data.count ?? 0,
    footers: data.footers ?? [],
  };
}

export async function createFooterProfile(payload: {
  name: string;
  footer: PamphletFooter;
}): Promise<FooterProfile> {
  const { status, data } = await apiRequest<FooterProfile>("/epams/footers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (status < 200 || status >= 300 || !data.footerId) {
    throw new Error(data.message || "Could not create footer.");
  }
  return data;
}

export async function updateFooterProfile(
  footerId: string,
  payload: { name: string; footer: PamphletFooter },
): Promise<FooterProfile> {
  const { status, data } = await apiRequest<FooterProfile>(
    `/epams/footers/${encodeURIComponent(footerId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (status < 200 || status >= 300 || !data.footerId) {
    throw new Error(data.message || "Could not update footer.");
  }
  return data;
}

export async function deleteFooterProfile(footerId: string): Promise<void> {
  const { status, data } = await apiRequest(`/epams/footers/${encodeURIComponent(footerId)}`, {
    method: "DELETE",
  });
  if (status < 200 || status >= 300) {
    throw new Error(data.message || "Could not delete footer.");
  }
}

export function footerFromForm(form: Partial<PamphletFooter> | null | undefined): PamphletFooter {
  const f = { ...emptyFooter(), ...(form || {}) };
  f.label1 = ensureFooterLabelColon(f.label1.trim() ? f.label1 : FOOTER_DEFAULT_LABELS.label1);
  f.label2 = ensureFooterLabelColon(f.label2.trim() ? f.label2 : FOOTER_DEFAULT_LABELS.label2);
  f.label3 = ensureFooterLabelColon(f.label3.trim() ? f.label3 : FOOTER_DEFAULT_LABELS.label3);
  f.label4 = ensureFooterLabelColon(f.label4.trim() ? f.label4 : FOOTER_DEFAULT_LABELS.label4);
  return f;
}
