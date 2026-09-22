import {
  apiRequest,
  currentCsrf,
  deleteJSON,
  getCsrf,
  postJSON,
  putJSON,
  uploadFile,
} from "./api";
import { workspaceHref } from "./ereport-routes";

export type EreportPayload = Record<string, unknown>;

export type OrgCard = {
  id: string;
  name: string;
  order: number;
  hidden?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ReportCard = {
  id: string;
  tema: string;
  reportNumber?: string;
  updatedAt: string;
};

export type RecentReportCard = ReportCard & {
  orgId: string;
  orgName?: string;
  openCount?: number;
  completedCount?: number;
};

export type EreportMeta = {
  id: string;
  tema: string;
  reportNumber?: string;
  reportDate?: string;
  orgId: string;
  ownerUserId?: string;
  ownerEmail?: string;
  ownerSafe?: string;
  ownerUsername?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EreportHistoryCard = {
  id: string;
  createdAt: string;
  source: string;
  keyPrefix?: string;
  tema: string;
};

export type EreportInvite = {
  id: string;
  scope: "org" | "report" | string;
  orgId: string;
  reportId?: string;
  expiresAt: string;
  createdAt?: string;
  canEdit: boolean;
};

export type APIKeyRow = {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  key?: string;
};

export { workspaceHref };

export function displayOwnerSafe(email: string): string {
  return email.trim().toLowerCase().replace(/@/g, "_at_").replace(/\//g, "_");
}

export function fetchEreportAccess() {
  return apiRequest<{ canCreate?: boolean; ownerSafe?: string; ownerEmail?: string; ownerUserId?: string }>("/ereport/access");
}

export function fetchEreportOrgs() {
  return apiRequest<{ ownerSafe?: string; ownerUserId?: string; orgs?: OrgCard[]; recentReports?: RecentReportCard[] }>("/ereport/orgs");
}

export function fetchEreportOrg(orgId: string) {
  return apiRequest<{ org?: OrgCard & { name: string }; reports?: ReportCard[] }>(`/ereport/orgs/${orgId}`);
}

export function createEreportOrg(name: string, firstReportName: string) {
  return postJSON<{ org?: OrgCard & EreportMeta; report?: EreportMeta; viewUrl?: string }>("/ereport/orgs", {
    name,
    firstReportName,
  });
}

export function updateEreportOrgs(orgs: Array<{ id: string; name?: string; order?: number; hidden?: boolean }>) {
  return putJSON<{ orgs?: OrgCard[] }>("/ereport/orgs", { orgs });
}

export function deleteEreportOrg(orgId: string) {
  return deleteJSON(`/ereport/orgs/${orgId}`);
}

export function createOrgReport(orgId: string, tema: string) {
  return postJSON<{ meta?: EreportMeta; viewUrl?: string }>(`/ereport/orgs/${orgId}/reports`, { tema });
}

export function importOrgReport(orgId: string, tema: string, payload: EreportPayload) {
  return postJSON<{ meta?: EreportMeta }>(`/ereport/orgs/${orgId}/import`, { tema, payload });
}

export function fetchOrgReport(orgId: string, reportId: string) {
  return apiRequest<{ meta?: EreportMeta; payload?: EreportPayload; canShare?: boolean; canEdit?: boolean }>(
    `/ereport/orgs/${orgId}/reports/${reportId}`,
  );
}

export function saveOrgReport(orgId: string, reportId: string, body: { tema?: string; payload?: EreportPayload }) {
  // Large payloads (images as data URLs) often exceed the default 12s API timeout.
  return putJSON<{ meta?: EreportMeta }>(`/ereport/orgs/${orgId}/reports/${reportId}`, body, { timeoutMs: 120000 });
}

export function deleteOrgReport(orgId: string, reportId: string) {
  return deleteJSON(`/ereport/orgs/${orgId}/reports/${reportId}`);
}

export function listReportHistory(orgId: string, reportId: string) {
  return apiRequest<{ items?: EreportHistoryCard[] }>(`/ereport/orgs/${orgId}/reports/${reportId}/history`);
}

export function createReportHistory(
  orgId: string,
  reportId: string,
  body: { tema?: string; payload?: EreportPayload; label?: string } = {},
) {
  return postJSON<{ id?: string; tema?: string; source?: string }>(
    `/ereport/orgs/${orgId}/reports/${reportId}/history`,
    body,
  );
}

export function fetchReportHistorySnapshot(orgId: string, reportId: string, snapshotId: string) {
  return apiRequest<{ snapshot?: EreportHistoryCard & { payload?: EreportPayload } }>(
    `/ereport/orgs/${orgId}/reports/${reportId}/history/${snapshotId}`,
  );
}

export function restoreReportHistory(orgId: string, reportId: string, snapshotId: string) {
  return postJSON<{ meta?: EreportMeta; payload?: EreportPayload }>(
    `/ereport/orgs/${orgId}/reports/${reportId}/history/${snapshotId}/restore`,
    {},
  );
}

export type EreportSharedCard = {
  shareId: string;
  ownerUserId: string;
  ownerSafe?: string;
  ownerEmail?: string;
  orgId: string;
  reportId: string;
  tema: string;
  reportNumber?: string;
  canEdit: boolean;
  updatedAt: string;
  viewUrl?: string;
};

export function fetchSharedReports() {
  return apiRequest<{ items?: EreportSharedCard[] }>("/ereport/shared");
}

export function fetchSharedReport(orgId: string, reportId: string) {
  return apiRequest<{
    meta?: EreportMeta;
    payload?: EreportPayload;
    canEdit?: boolean;
    shared?: boolean;
  }>(`/ereport/shared/orgs/${orgId}/reports/${reportId}`);
}

export function saveSharedReport(orgId: string, reportId: string, body: { tema?: string; payload?: EreportPayload }) {
  return putJSON<{ meta?: EreportMeta }>(`/ereport/shared/orgs/${orgId}/reports/${reportId}`, body, { timeoutMs: 120000 });
}

export function sharedImageUploadPath(orgId: string, reportId: string): string {
  return `/api/ereport/shared/orgs/${orgId}/reports/${reportId}/images`;
}

export function createOrgInvite(orgId: string, email: string, durationHours: number) {
  return postJSON<{ invite?: EreportInvite; link?: string }>(`/ereport/orgs/${orgId}/invites`, {
    email,
    durationHours,
  });
}

export function createReportInvite(
  orgId: string,
  reportId: string,
  body: { emails: string[]; durationHours: number; message: string },
) {
  return postJSON<{
    invite?: EreportInvite;
    link?: string;
    hash?: string;
    emailsSent?: number;
    expiresAt?: string;
    message?: string;
  }>(`/ereport/orgs/${orgId}/reports/${reportId}/invites`, body);
}

export function fetchInvitePreview(inviteId: string, secret: string) {
  return apiRequest<{ invite?: EreportInvite; valid?: boolean; expired?: boolean; needsOtp?: boolean; canEdit?: boolean }>(
    `/ereport/invites/${inviteId}?t=${encodeURIComponent(secret)}`,
  );
}

export function fetchInviteSharedReport(inviteId: string, secret: string) {
  return apiRequest<{ meta?: EreportMeta; payload?: EreportPayload; canEdit?: boolean }>(
    `/ereport/invites/${inviteId}/report?t=${encodeURIComponent(secret)}`,
  );
}

export function claimInviteSession(inviteId: string, secret: string) {
  return postJSON<{
    invite?: EreportInvite;
    canEdit?: boolean;
    meta?: EreportMeta;
    payload?: EreportPayload;
    reports?: ReportCard[];
  }>(`/ereport/invites/${inviteId}/claim`, { t: secret });
}

export function requestInviteOTP(inviteId: string, email: string, secret: string) {
  return postJSON(`/ereport/invites/${inviteId}/otp`, { email, t: secret });
}

export function verifyInviteOTP(inviteId: string, email: string, otp: string, secret: string) {
  return postJSON<{ invite?: EreportInvite; canEdit?: boolean; reports?: ReportCard[] }>(`/ereport/invites/${inviteId}/verify`, {
    email,
    otp,
    t: secret,
  });
}

export function fetchInviteSession() {
  return apiRequest<{ invite?: EreportInvite; canEdit?: boolean; reports?: ReportCard[]; meta?: EreportMeta; payload?: EreportPayload }>(
    "/ereport/invite-session",
  );
}

export function fetchInviteReport(reportId: string) {
  return apiRequest<{ meta?: EreportMeta; payload?: EreportPayload; canEdit?: boolean }>(
    `/ereport/invite-session/reports/${reportId}`,
  );
}

export function saveInviteReport(reportId: string, body: { tema?: string; payload?: EreportPayload }) {
  return putJSON<{ meta?: EreportMeta }>(`/ereport/invite-session/reports/${reportId}`, body, { timeoutMs: 120000 });
}

export function ownerImageUploadPath(orgId: string, reportId: string): string {
  return `/api/ereport/orgs/${orgId}/reports/${reportId}/images`;
}

export function inviteImageUploadPath(reportId: string): string {
  return `/api/ereport/invite-session/reports/${reportId}/images`;
}

export function downloadEreportSnapshot(filename: string, payload: EreportPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ereport") ? filename : `${filename || "snapshot"}.ereport`;
  a.click();
  URL.revokeObjectURL(url);
}

export function listAPIKeys() {
  return apiRequest<{ keys?: APIKeyRow[] }>("/apikeys");
}

export function createAPIKey(label: string) {
  return postJSON<APIKeyRow>("/apikeys", { label });
}

export function revokeAPIKey(id: string) {
  return deleteJSON(`/apikeys/${id}`);
}

export function fetchAPIDocs() {
  return apiRequest<Record<string, unknown>>("/v1/docs");
}

export function refreshCsrf(): Promise<string> {
  return getCsrf();
}

export function rememberedCsrf(): string {
  return currentCsrf();
}

export function uploadReportImage(path: string, file: File) {
  return uploadFile<{ id?: string; mime?: string; name?: string; url?: string }>(path.replace(/^\/api/, ""), file);
}
