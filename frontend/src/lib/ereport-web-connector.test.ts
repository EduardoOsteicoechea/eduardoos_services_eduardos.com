import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getHealth = vi.fn();
const getCsrf = vi.fn();
const apiRequest = vi.fn();
const probeEreportConnectorReady = vi.fn();
const fetchEreportAccess = vi.fn();
const fetchEreportOrg = vi.fn();
const fetchEreportOrgs = vi.fn();
const fetchOrgReport = vi.fn();
const showErrorModal = vi.fn();

vi.mock("./api", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
  getCsrf: (...args: unknown[]) => getCsrf(...args),
  getHealth: (...args: unknown[]) => getHealth(...args),
}));

vi.mock("./ereport-connector-ready", () => ({
  probeEreportConnectorReady: (...args: unknown[]) => probeEreportConnectorReady(...args),
}));

vi.mock("./ereport", () => ({
  EREPORT_API_TIMEOUT_MS: 60_000,
  fetchEreportAccess: (...args: unknown[]) => fetchEreportAccess(...args),
  fetchEreportOrg: (...args: unknown[]) => fetchEreportOrg(...args),
  fetchEreportOrgs: (...args: unknown[]) => fetchEreportOrgs(...args),
  fetchOrgReport: (...args: unknown[]) => fetchOrgReport(...args),
}));

vi.mock("./error-modal", () => ({
  showErrorModal: (...args: unknown[]) => showErrorModal(...args),
}));

vi.mock("./dev-log", () => ({
  mustLog: false,
}));

import { startEreportWebConnector } from "./ereport-web-connector";

function mountRoot(): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = `
    <p data-wc-status></p>
    <div data-wc-auth hidden><p data-wc-auth-msg></p></div>
    <div data-wc-path hidden>
      <select data-wc-org></select>
      <select data-wc-report></select>
    </div>
    <p data-wc-report-label hidden></p>
    <div data-wc-cascade hidden>
      <select data-wc-section></select>
      <select data-wc-group></select>
      <select data-wc-item></select>
      <button type="button" data-wc-section-create></button>
      <button type="button" data-wc-group-create></button>
      <button type="button" data-wc-item-create></button>
      <div data-wc-section-fields hidden>
        <input data-wc-section-title />
        <textarea data-wc-section-concept></textarea>
        <button type="button" data-wc-section-save></button>
      </div>
      <div data-wc-group-fields hidden>
        <input data-wc-group-title />
        <textarea data-wc-group-concept></textarea>
        <button type="button" data-wc-group-save></button>
      </div>
      <div data-wc-item-fields hidden>
        <input data-wc-item-nombre />
        <textarea data-wc-item-incidencia></textarea>
        <input data-wc-item-fecha-inc />
        <select data-wc-item-status><option value=""></option></select>
        <textarea data-wc-item-solucion></textarea>
        <input data-wc-item-fecha-sol />
        <button type="button" data-wc-item-save></button>
      </div>
    </div>
  `;
  document.body.append(root);
  return root;
}

describe("startEreportWebConnector bootstrap readiness", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    document.body.replaceChildren();
    window.history.replaceState({}, "", "/ereport/web-connector");
    getHealth.mockReset().mockResolvedValue({ status: "ok" });
    getCsrf.mockReset().mockResolvedValue("csrf");
    apiRequest.mockReset();
    probeEreportConnectorReady.mockReset();
    fetchEreportAccess.mockReset().mockResolvedValue({
      status: 200,
      requestId: "acc-1",
      data: { canCreate: true },
    });
    fetchEreportOrgs.mockReset().mockResolvedValue({
      status: 200,
      requestId: "orgs-1",
      data: { orgs: [{ id: "org-1", name: "Org", hidden: false }] },
    });
    fetchEreportOrg.mockReset();
    fetchOrgReport.mockReset();
    showErrorModal.mockReset();
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("locked mode probes readiness before showing the editor", async () => {
    window.history.replaceState({}, "", "/ereport/web-connector?org=org-1&report=rep-1");
    probeEreportConnectorReady.mockResolvedValueOnce({
      ok: true,
      binding: { orgId: "org-1", reportId: "rep-1", tema: "Site" },
      report: {
        meta: { tema: "Site" },
        payload: {
          sections: [{ id: "sec-1", title: "S", groups: [{ id: "grp-1", title: "G" }] }],
        },
      },
      sectionId: "sec-1",
      groupId: "grp-1",
      ownerSafe: "a_at_b.com",
    });

    const root = mountRoot();
    startEreportWebConnector(root);
    await vi.waitFor(() => {
      expect(probeEreportConnectorReady).toHaveBeenCalledWith({
        orgId: "org-1",
        reportId: "rep-1",
      });
    });
    await vi.waitFor(() => {
      expect(root.querySelector("[data-wc-cascade]")?.hasAttribute("hidden")).toBe(false);
    });
    expect(fetchEreportAccess).not.toHaveBeenCalled();
    expect(root.querySelector("[data-wc-auth]")?.hasAttribute("hidden")).toBe(true);
    expect((root.querySelector("[data-wc-section]") as HTMLSelectElement).value).toBe("sec-1");
  });

  it("locked mode probe fail keeps editor hidden and shows auth message", async () => {
    window.history.replaceState({}, "", "/ereport/web-connector?org=org-1&report=rep-1");
    probeEreportConnectorReady.mockResolvedValueOnce({
      ok: false,
      reason: "api_down",
      message: "The API is not reachable.",
    });

    const root = mountRoot();
    startEreportWebConnector(root);
    await vi.waitFor(() => {
      expect(root.querySelector("[data-wc-auth]")?.hasAttribute("hidden")).toBe(false);
    });
    expect(root.querySelector("[data-wc-cascade]")?.hasAttribute("hidden")).toBe(true);
    expect(root.querySelector("[data-wc-auth-msg]")?.textContent).toContain("API is not reachable");
    expect(showErrorModal).toHaveBeenCalled();
  });

  it("picker mode health-fails with api_down UI and does not open cascade", async () => {
    getHealth.mockRejectedValueOnce(new Error("network"));
    const root = mountRoot();
    startEreportWebConnector(root);
    await vi.waitFor(() => {
      expect(root.querySelector("[data-wc-auth]")?.hasAttribute("hidden")).toBe(false);
    });
    expect(probeEreportConnectorReady).not.toHaveBeenCalled();
    expect(fetchEreportAccess).not.toHaveBeenCalled();
    expect(root.querySelector("[data-wc-cascade]")?.hasAttribute("hidden")).toBe(true);
    expect(root.querySelector("[data-wc-status]")?.textContent).toContain("API is not reachable");
  });
});
