import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";
import {
  fetchEreportAccess,
  fetchEreportOrg,
  fetchEreportOrgs,
  fetchOrgReport,
  patchReportSiteConnector,
  type RecentReportCard,
  type WebsiteRegistrationBinding,
} from "./ereport";

const DONE_TYPE = "ereport-embed-config-done";
const CLOSE_TYPE = "ereport-embed-close";

type SectionNode = { id: string; title?: string; groups?: Array<{ id: string; title?: string }> };

function el<T extends HTMLElement>(root: ParentNode, sel: string): T | null {
  return root.querySelector(sel) as T | null;
}

function fillSelect(select: HTMLSelectElement, options: { value: string; label: string }[], placeholder: string) {
  select.replaceChildren();
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = placeholder;
  select.append(ph);
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    select.append(o);
  }
}

function postToParent(msg: Record<string, unknown>) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(msg, "*");
    }
  } catch {
    /* ignore */
  }
}

export function startEreportConnectorConfig(root: HTMLElement) {
  const statusEl = el<HTMLElement>(root, "[data-cc-status]")!;
  const reportSelect = el<HTMLSelectElement>(root, "[data-cc-report]")!;
  const sectionSelect = el<HTMLSelectElement>(root, "[data-cc-section]")!;
  const groupSelect = el<HTMLSelectElement>(root, "[data-cc-group]")!;
  const saveBtn = el<HTMLButtonElement>(root, "[data-cc-save]")!;
  const closeBtn = el<HTMLButtonElement>(root, "[data-cc-close]");

  let reports: Array<RecentReportCard & { purpose?: string }> = [];
  let sections: SectionNode[] = [];
  let binding: WebsiteRegistrationBinding | null = null;

  function setStatus(msg: string) {
    statusEl.textContent = msg;
  }

  function selectedReport(): RecentReportCard | undefined {
    const [orgId, reportId] = (reportSelect.value || "").split(":");
    return reports.find((r) => r.orgId === orgId && r.id === reportId);
  }

  function fillGroups(sectionId: string, preferred = "") {
    const sec = sections.find((s) => s.id === sectionId);
    fillSelect(
      groupSelect,
      (sec?.groups || []).map((g) => ({ value: g.id, label: g.title || g.id })),
      "Select subsection…",
    );
    groupSelect.value =
      preferred && (sec?.groups || []).some((g) => g.id === preferred) ? preferred : sec?.groups?.[0]?.id || "";
  }

  async function loadReportTree(orgId: string, reportId: string) {
    setStatus("Loading sections…");
    const { status, data, requestId } = await fetchOrgReport(orgId, reportId);
    if (status !== 200) {
      showErrorModal({
        message: String(data.message || "Could not load report."),
        requestId: String(data.request_id || requestId),
      });
      setStatus("Could not load report.");
      return;
    }
    sections = ((data.payload as { sections?: SectionNode[] } | undefined)?.sections || []) as SectionNode[];
    fillSelect(
      sectionSelect,
      sections.map((s) => ({ value: s.id, label: s.title || s.id })),
      "Select section…",
    );
    const preferredSection =
      data.meta?.connectorSectionId ||
      (binding?.orgId === orgId && binding?.reportId === reportId ? binding.sectionId : "") ||
      sections[0]?.id ||
      "";
    sectionSelect.value = preferredSection;
    fillGroups(
      preferredSection,
      data.meta?.connectorGroupId ||
        (binding?.orgId === orgId && binding?.reportId === reportId ? binding.groupId : "") ||
        "",
    );
    setStatus("Pick section and subsection, then save.");
  }

  async function bootstrap() {
    setStatus("Checking session…");
    const access = await fetchEreportAccess();
    if (access.status === 401) {
      setStatus("Sign in on eduardoos.com, then reopen Configure.");
      return;
    }
    if (access.status !== 200 || !access.data.canCreate) {
      setStatus("eReport subscription required.");
      return;
    }
    binding = access.data.websiteRegistration || null;

    const orgsRes = await fetchEreportOrgs();
    if (orgsRes.status !== 200) {
      setStatus("Could not load organizations.");
      return;
    }
    const orgs = (orgsRes.data.orgs || []).filter((o) => !o.hidden);
    const batches = await Promise.all(
      orgs.map(async (org) => {
        const res = await fetchEreportOrg(org.id);
        if (res.status !== 200) return [] as RecentReportCard[];
        return (res.data.reports || []).map((report) => ({
          ...report,
          orgId: org.id,
          orgName: org.name,
        }));
      }),
    );
    reports = batches.flat().sort((a, b) => {
      const aWeb = a.purpose === "website_registration" ? 0 : 1;
      const bWeb = b.purpose === "website_registration" ? 0 : 1;
      if (aWeb !== bWeb) return aWeb - bWeb;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });

    fillSelect(
      reportSelect,
      reports.map((r) => ({
        value: `${r.orgId}:${r.id}`,
        label: `${r.tema || r.id}${r.purpose === "website_registration" ? " (site)" : ""} · ${r.orgName || r.orgId}`,
      })),
      "Select report…",
    );

    let initial = "";
    if (binding?.orgId && binding?.reportId) {
      initial = `${binding.orgId}:${binding.reportId}`;
    } else if (reports[0]) {
      initial = `${reports[0].orgId}:${reports[0].id}`;
    }
    reportSelect.value = initial;
    if (initial) {
      const [orgId, reportId] = initial.split(":");
      await loadReportTree(orgId, reportId);
    } else {
      setStatus("Create a report in eReport first.");
    }
  }

  reportSelect.addEventListener("change", () => {
    const rep = selectedReport();
    if (!rep) return;
    void loadReportTree(rep.orgId, rep.id);
  });

  sectionSelect.addEventListener("change", () => {
    fillGroups(sectionSelect.value);
  });

  closeBtn?.addEventListener("click", () => {
    postToParent({ type: CLOSE_TYPE });
  });

  saveBtn.addEventListener("click", () => {
    void (async () => {
      const rep = selectedReport();
      if (!rep || !sectionSelect.value || !groupSelect.value) {
        window.alert("Select report, section, and subsection.");
        return;
      }
      saveBtn.disabled = true;
      setStatus("Saving…");
      const { status, data, requestId } = await patchReportSiteConnector(rep.orgId, rep.id, {
        sectionId: sectionSelect.value,
        groupId: groupSelect.value,
        assign: true,
      });
      saveBtn.disabled = false;
      if (status !== 200) {
        showErrorModal({
          message: String(data.message || "Could not save."),
          requestId: String(data.request_id || requestId),
          details: String(data.error || `HTTP ${status}`),
        });
        setStatus("Could not save.");
        return;
      }
      const next = {
        orgId: rep.orgId,
        reportId: rep.id,
        sectionId: sectionSelect.value,
        groupId: groupSelect.value,
        tema: rep.tema,
      };
      setStatus("Saved.");
      postToParent({ type: DONE_TYPE, ...next });
      if (mustLog) console.log("[ereport-connector-config] saved", next);
    })();
  });

  void bootstrap();
}
