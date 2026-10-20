import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getHealth = vi.fn();
const getMe = vi.fn();
const getCsrf = vi.fn();
const isTransientAuthStatus = vi.fn((status: number) => status === 0 || status === 429 || (status >= 500 && status <= 599));
const checkServiceAccess = vi.fn();
const fetchEreportAccess = vi.fn();
const fetchOrgReport = vi.fn();
const patchReportSiteConnector = vi.fn();
const displayOwnerSafe = vi.fn((email: string) => email.replace(/@/g, "_at_"));

vi.mock("./api", () => ({
  getHealth: (...args: unknown[]) => getHealth(...args),
  getMe: (...args: unknown[]) => getMe(...args),
  getCsrf: (...args: unknown[]) => getCsrf(...args),
  isTransientAuthStatus: (status: number) => isTransientAuthStatus(status),
}));

vi.mock("./serviceAccess", () => ({
  checkServiceAccess: (...args: unknown[]) => checkServiceAccess(...args),
}));

vi.mock("./ereport", () => ({
  fetchEreportAccess: (...args: unknown[]) => fetchEreportAccess(...args),
  fetchOrgReport: (...args: unknown[]) => fetchOrgReport(...args),
  patchReportSiteConnector: (...args: unknown[]) => patchReportSiteConnector(...args),
  displayOwnerSafe: (email: string) => displayOwnerSafe(email),
}));

vi.mock("./dev-log", () => ({
  mustLog: false,
}));

import { probeEreportConnectorReady } from "./ereport-connector-ready";

function okMe() {
  return { status: 200, requestId: "me-1", data: { id: "user-1", email: "a@b.com" } };
}

function okAccess(extra: Record<string, unknown> = {}) {
  return {
    status: 200,
    requestId: "acc-1",
    data: {
      canCreate: true,
      ownerSafe: "a_at_b.com",
      websiteRegistration: { orgId: "org-1", reportId: "rep-1", tema: "Site" },
      ...extra,
    },
  };
}

function okReport(payload: unknown, meta: Record<string, unknown> = {}) {
  return {
    status: 200,
    requestId: "rep-1",
    data: {
      meta: { id: "rep-1", tema: "Site", orgId: "org-1", ownerSafe: "a_at_b.com", ...meta },
      payload,
      canEdit: true,
    },
  };
}

const samplePayload = {
  sections: [
    {
      id: "sec-1",
      title: "Website",
      groups: [{ id: "grp-1", title: "Issues" }],
    },
  ],
};

describe("probeEreportConnectorReady", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    localStorage.clear();
    getHealth.mockReset().mockResolvedValue({ status: "ok" });
    getMe.mockReset().mockResolvedValue(okMe());
    getCsrf.mockReset().mockResolvedValue("csrf-token");
    isTransientAuthStatus.mockClear();
    checkServiceAccess.mockReset().mockResolvedValue({
      allowed: true,
      isAdmin: false,
      hasEntitlement: true,
      isHomescoolStudent: false,
    });
    fetchEreportAccess.mockReset().mockResolvedValue(okAccess());
    fetchOrgReport.mockReset().mockResolvedValue(
      okReport(samplePayload, { connectorSectionId: "sec-1", connectorGroupId: "grp-1" }),
    );
    patchReportSiteConnector.mockReset().mockResolvedValue({
      status: 200,
      requestId: "patch-1",
      data: {},
    });
    displayOwnerSafe.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns api_down when health fails", async () => {
    getHealth.mockRejectedValueOnce(new Error("network"));
    const result = await probeEreportConnectorReady();
    expect(result).toEqual({
      ok: false,
      reason: "api_down",
      message: "The API is not reachable.",
    });
    expect(getMe).not.toHaveBeenCalled();
  });

  it("returns no_binding when website registration is missing", async () => {
    fetchEreportAccess.mockResolvedValueOnce(
      okAccess({ websiteRegistration: null }),
    );
    const result = await probeEreportConnectorReady();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_binding");
      expect(result.message).toBe("No website registration report is configured.");
      expect(result.requestId).toBe("acc-1");
    }
    expect(fetchOrgReport).not.toHaveBeenCalled();
  });

  it("returns bad_targets when resolved section/group are missing from payload", async () => {
    fetchOrgReport.mockResolvedValueOnce(okReport({ sections: [] }, {}));

    const result = await probeEreportConnectorReady();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("bad_targets");
      expect(result.message).toBe("The connector section or subsection is invalid.");
    }
    expect(getCsrf).not.toHaveBeenCalled();
  });

  it("happy path returns ok when meta has connector targets", async () => {
    const result = await probeEreportConnectorReady();
    expect(result).toMatchObject({
      ok: true,
      sectionId: "sec-1",
      groupId: "grp-1",
      ownerSafe: "a_at_b.com",
      binding: { orgId: "org-1", reportId: "rep-1", tema: "Site" },
    });
    if (result.ok) {
      expect(result.report).toBeTruthy();
    }
    expect(patchReportSiteConnector).not.toHaveBeenCalled();
    expect(getCsrf).toHaveBeenCalled();
  });

  it("happy path patches site-connector when meta lacked ids", async () => {
    fetchOrgReport.mockResolvedValueOnce(okReport(samplePayload, {}));
    const result = await probeEreportConnectorReady();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sectionId).toBe("sec-1");
      expect(result.groupId).toBe("grp-1");
    }
    expect(patchReportSiteConnector).toHaveBeenCalledWith("org-1", "rep-1", {
      assign: false,
      sectionId: "sec-1",
      groupId: "grp-1",
    });
  });

  it("accepts org/report opts override when binding is absent", async () => {
    fetchEreportAccess.mockResolvedValueOnce(
      okAccess({ websiteRegistration: null }),
    );
    fetchOrgReport.mockResolvedValueOnce(
      okReport(samplePayload, { connectorSectionId: "sec-1", connectorGroupId: "grp-1" }),
    );
    const result = await probeEreportConnectorReady({ orgId: "org-x", reportId: "rep-x" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.binding.orgId).toBe("org-x");
      expect(result.binding.reportId).toBe("rep-x");
    }
    expect(fetchOrgReport).toHaveBeenCalledWith("org-x", "rep-x");
  });

  it("uses Spanish messages when html lang is es", async () => {
    document.documentElement.lang = "es";
    getHealth.mockRejectedValueOnce(new Error("down"));
    const result = await probeEreportConnectorReady();
    expect(result).toEqual({
      ok: false,
      reason: "api_down",
      message: "La API no responde.",
    });
  });
});
