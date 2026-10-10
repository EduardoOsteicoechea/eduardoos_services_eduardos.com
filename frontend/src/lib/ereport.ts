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

export type EreportPurpose = "website_registration" | "other";

export type WebsiteRegistrationBinding = {
  orgId: string;
  reportId: string;
  tema?: string;
  sectionId?: string;
  groupId?: string;
};

export type ReportCard = {
  id: string;
  tema: string;
  reportNumber?: string;
  purpose?: EreportPurpose | string;
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
  purpose?: EreportPurpose | string;
  connectorSectionId?: string;
  connectorGroupId?: string;
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
  return apiRequest<{
    canCreate?: boolean;
    ownerSafe?: string;
    ownerEmail?: string;
    ownerUserId?: string;
    websiteRegistration?: WebsiteRegistrationBinding | null;
  }>("/ereport/access");
}

export function fetchEreportOrgs() {
  return apiRequest<{ ownerSafe?: string; ownerUserId?: string; orgs?: OrgCard[]; recentReports?: RecentReportCard[] }>("/ereport/orgs");
}

export function fetchEreportOrg(orgId: string) {
  return apiRequest<{ org?: OrgCard & { name: string }; reports?: ReportCard[] }>(`/ereport/orgs/${orgId}`);
}

export function createEreportOrg(
  name: string,
  firstReportName: string,
  firstReportPurpose: EreportPurpose | string = "other",
) {
  return postJSON<{ org?: OrgCard & EreportMeta; report?: EreportMeta; viewUrl?: string }>("/ereport/orgs", {
    name,
    firstReportName,
    firstReportPurpose,
  });
}

export function updateEreportOrgs(orgs: Array<{ id: string; name?: string; order?: number; hidden?: boolean }>) {
  return putJSON<{ orgs?: OrgCard[] }>("/ereport/orgs", { orgs });
}

export function deleteEreportOrg(orgId: string) {
  return deleteJSON(`/ereport/orgs/${orgId}`);
}

export function createOrgReport(orgId: string, tema: string, purpose: EreportPurpose | string = "other") {
  return postJSON<{ meta?: EreportMeta; viewUrl?: string }>(`/ereport/orgs/${orgId}/reports`, { tema, purpose });
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

/** Assign report as site website_registration and/or persist connector section/subsection defaults. */
export function patchReportSiteConnector(
  orgId: string,
  reportId: string,
  body: { sectionId: string; groupId: string; assign?: boolean },
) {
  return apiRequest<{ meta?: EreportMeta; websiteRegistration?: WebsiteRegistrationBinding }>(
    `/ereport/orgs/${orgId}/reports/${reportId}/site-connector`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { timeoutMs: 120000 },
  );
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
    { timeoutMs: 120000 },
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

export type EreportSaveBody = { tema?: string; payload?: EreportPayload };
export type EreportSaveResult = Awaited<ReturnType<typeof saveInviteReport>>;

/**
 * Serializes cloud saves and keeps only the newest pending payload.
 * Rapid edits on large reports (~2s PUTs) otherwise let an older in-flight
 * response overwrite a newer one — invitees see their changes “not saving”.
 */
export function createEreportSavePump(saveFn: (body: EreportSaveBody) => Promise<EreportSaveResult>) {
  let pending: EreportSaveBody | null = null;
  let running = false;
  let lastResult: EreportSaveResult | null = null;
  let idleWaiters: Array<() => void> = [];

  const settleIdle = () => {
    if (running || pending) return;
    const waiters = idleWaiters.splice(0);
    for (const wait of waiters) wait();
  };

  const kick = async () => {
    if (running) return;
    running = true;
    try {
      while (pending) {
        const job = pending;
        pending = null;
        lastResult = await saveFn(job);
      }
    } finally {
      running = false;
      if (pending) {
        void kick();
      } else {
        settleIdle();
      }
    }
  };

  return {
    /** Fire-and-forget (autosave). Coalesces to the latest body. */
    enqueue(body: EreportSaveBody): void {
      pending = body;
      void kick();
    },
    /** Wait until this body (or a newer one that superseded it) has flushed. */
    enqueueAndWait(body: EreportSaveBody): Promise<EreportSaveResult | null> {
      pending = body;
      void kick();
      return new Promise((resolve) => {
        idleWaiters.push(() => resolve(lastResult));
        settleIdle();
      });
    },
  };
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
