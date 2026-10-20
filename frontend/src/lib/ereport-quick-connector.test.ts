import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const probeEreportConnectorReady = vi.fn();
const showErrorModal = vi.fn();
const fetchOrgReport = vi.fn();
const fetchEreportAccess = vi.fn();
const patchReportSiteConnector = vi.fn();
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
  fetchEreportAccess: (...args: unknown[]) => fetchEreportAccess(...args),
  patchReportSiteConnector: (...args: unknown[]) => patchReportSiteConnector(...args),
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
  getConnectorActiveOverride,
  openEreportQuickConnector,
  setConnectorActiveOverride,
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

function mockReadyOk(overrides?: {
  orgId?: string;
  reportId?: string;
  tema?: string;
  sectionId?: string;
  groupId?: string;
}) {
  const orgId = overrides?.orgId || "org-1";
  const reportId = overrides?.reportId || "rep-1";
  const sectionId = overrides?.sectionId || "sec-1";
  const groupId = overrides?.groupId || "grp-1";
  probeEreportConnectorReady.mockResolvedValue({
    ok: true,
    binding: {
      orgId,
      reportId,
      tema: overrides?.tema || "Site",
      sectionId,
      groupId,
    },
    report: {},
    sectionId,
    groupId,
    ownerSafe: "owner_safe",
  });
}

function mockReportLoad(metaExtra?: Record<string, unknown>) {
  fetchOrgReport.mockResolvedValue({
    status: 200,
    requestId: "rep-load",
    data: {
      meta: {
        id: "rep-1",
        tema: "Site",
        connectorSectionId: "sec-1",
        connectorGroupId: "grp-1",
        ownerSafe: "owner_safe",
        connectorHosts: ["eduardoos.com"],
        ...metaExtra,
      },
      payload: samplePayload,
    },
  });
}

describe("openEreportQuickConnector readiness gate", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.documentElement.lang = "en";
    document.documentElement.classList.remove("ereport-connector-open");
    localStorage.clear();
    probeEreportConnectorReady.mockReset();
    showErrorModal.mockReset();
    fetchOrgReport.mockReset();
    fetchEreportAccess.mockReset();
    patchReportSiteConnector.mockReset().mockResolvedValue({
      status: 200,
      requestId: "patch-ok",
      data: {},
    });
    getCsrf.mockReset().mockResolvedValue("csrf");
    apiRequest.mockReset();
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    closeEreportQuickConnector();
    vi.restoreAllMocks();
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

  it("uses active override for probe when no binding is passed", async () => {
    setConnectorActiveOverride("org-ov", "rep-ov");
    probeEreportConnectorReady.mockResolvedValue({
      ok: false,
      reason: "unauthorized",
      message: "Sign in to use the eReport connector.",
      requestId: "req-auth",
    });

    await openEreportQuickConnector();

    expect(getConnectorActiveOverride()).toEqual({ orgId: "org-ov", reportId: "rep-ov" });
    expect(probeEreportConnectorReady).toHaveBeenCalledWith({
      orgId: "org-ov",
      reportId: "rep-ov",
    });
  });

  it("mounts UI after probe ok and enables compose once reload confirms targets", async () => {
    mockReadyOk();
    mockReportLoad();

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

  it("settings modal lists websites and saves connectorHosts with section/group", async () => {
    mockReadyOk();
    mockReportLoad();
    fetchEreportAccess.mockResolvedValue({
      status: 200,
      requestId: "access-ok",
      data: {
        canCreate: true,
        websiteRegistration: {
          orgId: "org-1",
          reportId: "rep-1",
          tema: "Site A",
          connectorHosts: ["eduardoos.com"],
        },
        websiteRegistrations: [
          {
            orgId: "org-1",
            reportId: "rep-1",
            tema: "Site A",
            connectorHosts: ["eduardoos.com"],
          },
          {
            orgId: "org-2",
            reportId: "rep-2",
            tema: "Site B",
            connectorHosts: ["other.example"],
          },
        ],
      },
    });

    await openEreportQuickConnector();

    const gear = document.querySelector("[data-eq-config]") as HTMLButtonElement;
    gear.click();
    await vi.waitFor(() => {
      expect(document.getElementById("eduardoos-ereport-settings-overlay")).toBeTruthy();
    });

    const websiteSelect = document.querySelector("[data-eq-website]") as HTMLSelectElement;
    const hostsInput = document.querySelector("[data-eq-hosts]") as HTMLInputElement;
    const sectionSelect = document.querySelector("[data-eq-section]") as HTMLSelectElement;
    const groupSelect = document.querySelector("[data-eq-group]") as HTMLSelectElement;
    expect(websiteSelect).toBeTruthy();
    expect([...websiteSelect.options].map((o) => o.value)).toEqual(
      expect.arrayContaining(["org-1:rep-1", "org-2:rep-2"]),
    );
    expect(hostsInput.value).toContain("eduardoos.com");
    expect(sectionSelect.value).toBe("sec-1");
    expect(groupSelect.value).toBe("grp-1");

    hostsInput.value = "eduardoos.com, www.eduardoos.com";
    const saveBtn = document.querySelector("[data-eq-save-config]") as HTMLButtonElement;
    saveBtn.click();

    await vi.waitFor(() => {
      expect(patchReportSiteConnector).toHaveBeenCalledWith("org-1", "rep-1", {
        sectionId: "sec-1",
        groupId: "grp-1",
        assign: false,
        connectorHosts: ["eduardoos.com", "www.eduardoos.com"],
      });
    });
  });

  it("switching website sets override and re-opens with new binding", async () => {
    mockReadyOk();
    mockReportLoad();
    fetchEreportAccess.mockResolvedValue({
      status: 200,
      requestId: "access-ok",
      data: {
        canCreate: true,
        websiteRegistrations: [
          { orgId: "org-1", reportId: "rep-1", tema: "Site A" },
          { orgId: "org-2", reportId: "rep-2", tema: "Site B" },
        ],
      },
    });

    await openEreportQuickConnector();

    document.querySelector<HTMLButtonElement>("[data-eq-config]")?.click();
    await vi.waitFor(() => {
      expect(document.querySelector("[data-eq-website]")).toBeTruthy();
    });

    mockReadyOk({ orgId: "org-2", reportId: "rep-2", tema: "Site B" });
    mockReportLoad({ id: "rep-2", tema: "Site B", connectorHosts: ["other.example"] });

    const websiteSelect = document.querySelector("[data-eq-website]") as HTMLSelectElement;
    websiteSelect.value = "org-2:rep-2";
    websiteSelect.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => {
      expect(getConnectorActiveOverride()).toEqual({ orgId: "org-2", reportId: "rep-2" });
      expect(probeEreportConnectorReady).toHaveBeenCalledWith({
        orgId: "org-2",
        reportId: "rep-2",
      });
    });
  });
});
