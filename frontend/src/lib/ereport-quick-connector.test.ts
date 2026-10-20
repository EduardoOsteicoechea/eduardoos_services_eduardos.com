import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const probeEreportConnectorReady = vi.fn();
const showErrorModal = vi.fn();
const fetchOrgReport = vi.fn();
const getCsrf = vi.fn();
const apiRequest = vi.fn();

vi.mock("./ereport-connector-ready", () => ({
  probeEreportConnectorReady: (...args: unknown[]) => probeEreportConnectorReady(...args),
}));

vi.mock("./error-modal", () => ({
  showErrorModal: (...args: unknown[]) => showErrorModal(...args),
}));

vi.mock("./api", () => ({
  getCsrf: (...args: unknown[]) => getCsrf(...args),
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock("./ereport", () => ({
  EREPORT_API_TIMEOUT_MS: 15_000,
  fetchOrgReport: (...args: unknown[]) => fetchOrgReport(...args),
  patchReportSiteConnector: vi.fn(),
}));

vi.mock("./ereport-connector-modal", () => ({
  closeEreportIssueCardModal: vi.fn(),
  isEreportIssueCardModalOpen: () => false,
  openEreportAdvancedConnectorModal: vi.fn(),
  openEreportIssueCardModal: vi.fn(),
  openEreportWorkspaceIssue: vi.fn(),
}));

vi.mock("./dev-log", () => ({
  mustLog: false,
}));

import {
  closeEreportQuickConnector,
  openEreportQuickConnector,
} from "./ereport-quick-connector";

const samplePayload = {
  sections: [
    {
      id: "sec-1",
      title: "Website",
      groups: [{ id: "grp-1", title: "Issues", items: [] }],
    },
  ],
};

describe("openEreportQuickConnector readiness gate", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.documentElement.lang = "en";
    document.documentElement.classList.remove("ereport-connector-open");
    localStorage.clear();
    probeEreportConnectorReady.mockReset();
    showErrorModal.mockReset();
    fetchOrgReport.mockReset();
    getCsrf.mockReset().mockResolvedValue("csrf");
    apiRequest.mockReset();
  });

  afterEach(() => {
    closeEreportQuickConnector();
  });

  it("blocks open and shows error modal when probe fails (no overlay/compose)", async () => {
    probeEreportConnectorReady.mockResolvedValue({
      ok: false,
      reason: "no_binding",
      message: "No website registration report is configured.",
      requestId: "req-blocked",
    });

    await openEreportQuickConnector();

    expect(probeEreportConnectorReady).toHaveBeenCalledOnce();
    expect(showErrorModal).toHaveBeenCalledWith({
      message: "No website registration report is configured.",
      requestId: "req-blocked",
      details: "no_binding",
    });
    expect(document.getElementById("eduardoos-ereport-quick-overlay")).toBeNull();
    expect(fetchOrgReport).not.toHaveBeenCalled();
  });

  it("passes binding org/report into the probe when provided", async () => {
    probeEreportConnectorReady.mockResolvedValue({
      ok: false,
      reason: "unauthorized",
      message: "Sign in to use the eReport connector.",
      requestId: "req-auth",
    });

    await openEreportQuickConnector({
      binding: { orgId: "org-x", reportId: "rep-x", tema: "Site" },
    });

    expect(probeEreportConnectorReady).toHaveBeenCalledWith({
      orgId: "org-x",
      reportId: "rep-x",
    });
  });

  it("mounts UI after probe ok and enables compose once reload confirms targets", async () => {
    probeEreportConnectorReady.mockResolvedValue({
      ok: true,
      binding: { orgId: "org-1", reportId: "rep-1", tema: "Site", sectionId: "sec-1", groupId: "grp-1" },
      report: {},
      sectionId: "sec-1",
      groupId: "grp-1",
      ownerSafe: "owner_safe",
    });
    fetchOrgReport.mockResolvedValue({
      status: 200,
      requestId: "rep-load",
      data: {
        meta: {
          id: "rep-1",
          connectorSectionId: "sec-1",
          connectorGroupId: "grp-1",
          ownerSafe: "owner_safe",
        },
        payload: samplePayload,
      },
    });

    await openEreportQuickConnector();

    const overlay = document.getElementById("eduardoos-ereport-quick-overlay");
    expect(overlay).toBeTruthy();
    const compose = overlay?.querySelector("[data-eq-compose]") as HTMLElement | null;
    expect(compose).toBeTruthy();
    expect(compose?.hidden).toBe(false);
    const addBtn = overlay?.querySelector("[data-eq-add]") as HTMLButtonElement | null;
    expect(addBtn?.disabled).toBe(false);
    const status = overlay?.querySelector("[data-eq-status]");
    expect(status?.textContent).toBe("Ready to save.");
    expect(showErrorModal).not.toHaveBeenCalled();
  });
});
