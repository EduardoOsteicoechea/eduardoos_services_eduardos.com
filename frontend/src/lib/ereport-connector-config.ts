import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";
import {
  fetchEreportAccess,
  fetchOrgReport,
  patchReportSiteConnector,
  type WebsiteRegistrationBinding,
} from "./ereport";
import { normalizeConnectorHost } from "./ereport-connector-ready";

const DONE_TYPE = "ereport-embed-config-done";
const CLOSE_TYPE = "ereport-embed-close";
const ACTIVE_KEY_PREFIX = "ereport.connector.active.";

type SectionNode = { id: string; title?: string; groups?: Array<{ id: string; title?: string }> };
type ActiveOverride = { orgId: string; reportId: string };

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

function activeStorageKey(): string {
  try {
    const host = normalizeConnectorHost(location.host || location.hostname || "localhost");
    return `${ACTIVE_KEY_PREFIX}${host || "localhost"}`;
  } catch {
    return `${ACTIVE_KEY_PREFIX}default`;
  }
}

function readActiveOverride(): ActiveOverride | null {
  try {
    const raw = localStorage.getItem(activeStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveOverride;
    const orgId = String(parsed?.orgId || "").trim();
    const reportId = String(parsed?.reportId || "").trim();
    if (!orgId || !reportId) return null;
    return { orgId, reportId };
  } catch {
    return null;
  }
}

function writeActiveOverride(orgId: string, reportId: string): void {
  try {
    localStorage.setItem(activeStorageKey(), JSON.stringify({ orgId, reportId }));
  } catch {
    /* ignore quota / private mode */
  }
}

function bindingKey(b: Pick<WebsiteRegistrationBinding, "orgId" | "reportId">): string {
  return `${b.orgId}:${b.reportId}`;
}

function parseBindingKey(value: string): ActiveOverride | null {
  const idx = value.indexOf(":");
  if (idx <= 0) return null;
  const orgId = value.slice(0, idx).trim();
  const reportId = value.slice(idx + 1).trim();
  if (!orgId || !reportId) return null;
  return { orgId, reportId };
}

function parseConnectorHosts(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((h) => h.trim())
    .filter(Boolean);
}

function formatConnectorHosts(hosts: string[] | undefined | null): string {
  return (hosts || []).map((h) => String(h || "").trim()).filter(Boolean).join(", ");
}

function ensureHostsInput(root: HTMLElement, before: HTMLElement): HTMLInputElement {
  let input = el<HTMLInputElement>(root, "[data-cc-hosts]");
  if (input) return input;
  const label = document.createElement("label");
  label.textContent = "Connector hosts (comma-separated; include port for localhost)";
  input = document.createElement("input");
  input.type = "text";
  input.setAttribute("data-cc-hosts", "");
  input.placeholder = "eduardoos.com, localhost:8080, localhost:3000";
  input.autocomplete = "off";
  label.append(input);
  before.before(label);
  return input;
}

export function startEreportConnectorConfig(root: HTMLElement) {
  const statusEl = el<HTMLElement>(root, "[data-cc-status]")!;
  const reportSelect = el<HTMLSelectElement>(root, "[data-cc-report]")!;
  const sectionSelect = el<HTMLSelectElement>(root, "[data-cc-section]")!;
  const groupSelect = el<HTMLSelectElement>(root, "[data-cc-group]")!;
  const saveBtn = el<HTMLButtonElement>(root, "[data-cc-save]")!;
  const closeBtn = el<HTMLButtonElement>(root, "[data-cc-close]");
  const hostsInput = ensureHostsInput(root, saveBtn);

  let registrations: WebsiteRegistrationBinding[] = [];
  let sections: SectionNode[] = [];

  function setStatus(msg: string) {
    statusEl.textContent = msg;
  }

  function selectedBinding(): WebsiteRegistrationBinding | undefined {
    const key = parseBindingKey(reportSelect.value || "");
    if (!key) return undefined;
    return registrations.find((r) => r.orgId === key.orgId && r.reportId === key.reportId);
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

  function applyHostsFromBinding(binding: WebsiteRegistrationBinding | undefined) {
    hostsInput.value = formatConnectorHosts(binding?.connectorHosts);
  }

  async function loadReportTree(orgId: string, reportId: string) {
    setStatus("Loading sections…");
    const binding = registrations.find((r) => r.orgId === orgId && r.reportId === reportId);
    applyHostsFromBinding(binding);
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
    const fromMeta = formatConnectorHosts(data.meta?.connectorHosts);
    if (fromMeta) hostsInput.value = fromMeta;
    setStatus("Pick active registration, hosts, section and subsection, then save.");
  }

  function resolveInitialKey(
    list: WebsiteRegistrationBinding[],
    serverActive: WebsiteRegistrationBinding | null,
  ): string {
    const override = readActiveOverride();
    if (override && list.some((b) => b.orgId === override.orgId && b.reportId === override.reportId)) {
      return bindingKey(override);
    }
    if (serverActive?.orgId && serverActive?.reportId) {
      const match = list.find((b) => b.orgId === serverActive.orgId && b.reportId === serverActive.reportId);
      if (match) return bindingKey(match);
    }
    if (list[0]) return bindingKey(list[0]);
    return "";
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

    const fromList = access.data.websiteRegistrations || [];
    const singular = access.data.websiteRegistration || null;
    registrations = fromList.length
      ? fromList
      : singular?.orgId && singular?.reportId
        ? [singular]
        : [];

    fillSelect(
      reportSelect,
      registrations.map((r) => {
        const hosts = formatConnectorHosts(r.connectorHosts);
        const hostHint = hosts ? ` · ${hosts}` : "";
        return {
          value: bindingKey(r),
          label: `${r.tema || r.reportId}${hostHint} · ${r.orgId}`,
        };
      }),
      "Select website registration…",
    );

    const initial = resolveInitialKey(registrations, singular);
    reportSelect.value = initial;
    if (initial) {
      const key = parseBindingKey(initial);
      if (key) {
        writeActiveOverride(key.orgId, key.reportId);
        await loadReportTree(key.orgId, key.reportId);
      }
    } else {
      setStatus("Add a website registration in the eReport hub first.");
    }
  }

  reportSelect.addEventListener("change", () => {
    const key = parseBindingKey(reportSelect.value || "");
    if (!key) return;
    writeActiveOverride(key.orgId, key.reportId);
    void loadReportTree(key.orgId, key.reportId);
  });

  sectionSelect.addEventListener("change", () => {
    fillGroups(sectionSelect.value);
  });

  closeBtn?.addEventListener("click", () => {
    postToParent({ type: CLOSE_TYPE });
  });

  saveBtn.addEventListener("click", () => {
    void (async () => {
      const binding = selectedBinding();
      if (!binding || !sectionSelect.value || !groupSelect.value) {
        window.alert("Select website registration, section, and subsection.");
        return;
      }
      const connectorHosts = parseConnectorHosts(hostsInput.value);
      saveBtn.disabled = true;
      setStatus("Saving…");
      const { status, data, requestId } = await patchReportSiteConnector(binding.orgId, binding.reportId, {
        sectionId: sectionSelect.value,
        groupId: groupSelect.value,
        assign: true,
        connectorHosts,
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
      writeActiveOverride(binding.orgId, binding.reportId);
      const idx = registrations.findIndex((r) => r.orgId === binding.orgId && r.reportId === binding.reportId);
      if (idx >= 0) {
        registrations[idx] = {
          ...registrations[idx],
          sectionId: sectionSelect.value,
          groupId: groupSelect.value,
          connectorHosts,
        };
        const current = reportSelect.value;
        fillSelect(
          reportSelect,
          registrations.map((r) => {
            const hosts = formatConnectorHosts(r.connectorHosts);
            const hostHint = hosts ? ` · ${hosts}` : "";
            return {
              value: bindingKey(r),
              label: `${r.tema || r.reportId}${hostHint} · ${r.orgId}`,
            };
          }),
          "Select website registration…",
        );
        reportSelect.value = current;
      }
      const next = {
        orgId: binding.orgId,
        reportId: binding.reportId,
        sectionId: sectionSelect.value,
        groupId: groupSelect.value,
        tema: binding.tema,
        connectorHosts,
      };
      setStatus("Saved.");
      postToParent({ type: DONE_TYPE, ...next });
      if (mustLog) console.log("[ereport-connector-config] saved", next);
    })();
  });

  void bootstrap();
}
