import { apiRequest, getCsrf } from "./api";
import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";
import {
  fetchEreportAccess,
  fetchOrgReport,
  type WebsiteRegistrationBinding,
} from "./ereport";
import { openEreportAdvancedConnectorModal } from "./ereport-connector-modal";
import { parseIssueText } from "./ereport-issue-parse";

const OVERLAY_ID = "eduardoos-ereport-quick-overlay";
const DEFAULTS_KEY = "ereport.connector.defaults";

export type ConnectorDefaults = {
  orgId: string;
  reportId: string;
  sectionId: string;
  groupId: string;
};

type SectionNode = {
  id: string;
  title?: string;
  groups?: GroupNode[];
};
type GroupNode = {
  id: string;
  title?: string;
  items?: ItemNode[];
};
type ItemNode = {
  id: string;
  nombre?: string;
  incidencia?: string;
  status?: string;
};
type ReportPayload = {
  sections?: SectionNode[];
};

function loadDefaults(): ConnectorDefaults | null {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConnectorDefaults;
    if (!parsed?.orgId || !parsed?.reportId || !parsed?.sectionId || !parsed?.groupId) return null;
    return {
      orgId: String(parsed.orgId),
      reportId: String(parsed.reportId),
      sectionId: String(parsed.sectionId),
      groupId: String(parsed.groupId),
    };
  } catch {
    return null;
  }
}

function saveDefaults(d: ConnectorDefaults) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d));
}

function onEscape(ev: KeyboardEvent) {
  if (ev.key === "Escape") {
    ev.preventDefault();
    ev.stopPropagation();
    closeEreportQuickConnector();
  }
}

export function closeEreportQuickConnector() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing?.parentNode) existing.parentNode.removeChild(existing);
  document.removeEventListener("keydown", onEscape, true);
  document.documentElement.classList.remove("ereport-connector-open");
}

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

async function postItem(
  orgId: string,
  reportId: string,
  sectionId: string,
  groupId: string,
  body: { nombre: string; incidencia: string; status: string },
) {
  await getCsrf();
  return apiRequest<Record<string, unknown>>(
    `/ereport/orgs/${encodeURIComponent(orgId)}/reports/${encodeURIComponent(reportId)}/sections/${encodeURIComponent(sectionId)}/groups/${encodeURIComponent(groupId)}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { timeoutMs: 120000 },
  );
}

export async function openEreportQuickConnector(opts?: {
  binding?: WebsiteRegistrationBinding | null;
}) {
  closeEreportQuickConnector();
  document.dispatchEvent(new CustomEvent("eos:close-trays"));

  let binding = opts?.binding ?? null;
  if (!binding?.orgId || !binding?.reportId) {
    const { status, data } = await fetchEreportAccess();
    if (status === 200 && data.websiteRegistration?.orgId && data.websiteRegistration?.reportId) {
      binding = data.websiteRegistration;
    }
  }
  if (!binding?.orgId || !binding?.reportId) {
    window.alert("No website registration report is configured. Create one in eReport first.");
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "ereport-quick-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Report website issue");

  const frame = document.createElement("div");
  frame.className = "ereport-quick-overlay__frame";
  frame.innerHTML = `
    <header class="ereport-quick-overlay__bar">
      <h2 class="ereport-quick-overlay__title">Website issues</h2>
      <div class="ereport-quick-overlay__bar-actions">
        <button type="button" class="icon-btn" data-eq-config aria-label="Connector settings" title="Connector settings">
          <span class="material-symbols-outlined" aria-hidden="true">settings</span>
        </button>
        <button type="button" class="icon-btn" data-eq-close aria-label="Close" title="Close">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
    </header>
    <p class="ereport-quick-overlay__context" data-eq-context></p>
    <div class="ereport-quick-overlay__config" data-eq-config-panel hidden>
      <label>
        Report
        <select data-eq-report disabled>
          <option value="${binding.orgId}:${binding.reportId}">${binding.tema || "Website registration"}</option>
        </select>
      </label>
      <label>
        Main section
        <select data-eq-section></select>
      </label>
      <label>
        Subsection
        <select data-eq-group></select>
      </label>
      <div class="ereport-quick-overlay__row">
        <button type="button" class="btn btn--primary" data-eq-save-config>Save defaults</button>
        <button type="button" class="btn" data-eq-advanced>Advanced editor</button>
      </div>
    </div>
    <ul class="ereport-quick-overlay__list" data-eq-list></ul>
    <div class="ereport-quick-overlay__compose" data-eq-compose>
      <button type="button" class="icon-btn" data-eq-add aria-label="Add issue" title="Add issue">
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
      </button>
      <div class="ereport-quick-overlay__input-row" data-eq-input-row hidden>
        <textarea data-eq-input rows="3" placeholder="Issue title. Description after the first period…"></textarea>
        <button type="button" class="btn btn--primary" data-eq-submit>Save issue</button>
      </div>
    </div>
    <p class="status ereport-quick-overlay__status" data-eq-status></p>
  `;

  overlay.append(frame);
  document.body.append(overlay);
  document.documentElement.classList.add("ereport-connector-open");
  document.addEventListener("keydown", onEscape, true);

  const contextEl = el<HTMLElement>(frame, "[data-eq-context]")!;
  const listEl = el<HTMLElement>(frame, "[data-eq-list]")!;
  const statusEl = el<HTMLElement>(frame, "[data-eq-status]")!;
  const configPanel = el<HTMLElement>(frame, "[data-eq-config-panel]")!;
  const sectionSelect = el<HTMLSelectElement>(frame, "[data-eq-section]")!;
  const groupSelect = el<HTMLSelectElement>(frame, "[data-eq-group]")!;
  const inputRow = el<HTMLElement>(frame, "[data-eq-input-row]")!;
  const input = el<HTMLTextAreaElement>(frame, "[data-eq-input]")!;

  let payload: ReportPayload | null = null;
  let defaults = loadDefaults();
  if (!defaults || defaults.orgId !== binding.orgId || defaults.reportId !== binding.reportId) {
    defaults = {
      orgId: binding.orgId,
      reportId: binding.reportId,
      sectionId: defaults?.sectionId || "",
      groupId: defaults?.groupId || "",
    };
  }

  function setStatus(msg: string) {
    statusEl.textContent = msg;
  }

  function currentSection(): SectionNode | undefined {
    return payload?.sections?.find((s) => s.id === defaults?.sectionId);
  }
  function currentGroup(): GroupNode | undefined {
    return currentSection()?.groups?.find((g) => g.id === defaults?.groupId);
  }

  function renderList() {
    listEl.replaceChildren();
    const group = currentGroup();
    const items = group?.items || [];
    if (!defaults?.sectionId || !defaults?.groupId) {
      setStatus("Configure section and subsection first.");
      return;
    }
    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "ereport-quick-overlay__empty";
      empty.textContent = "No issues in this subsection yet.";
      listEl.append(empty);
      return;
    }
    for (const it of items) {
      const li = document.createElement("li");
      li.className = "ereport-quick-overlay__item";
      const title = document.createElement("span");
      title.className = "ereport-quick-overlay__item-title";
      title.textContent = it.nombre || it.incidencia || it.id;
      const st = document.createElement("span");
      st.className = "ereport-quick-overlay__item-status";
      st.textContent = it.status || "";
      li.append(title, st);
      listEl.append(li);
    }
  }

  function syncContext() {
    const sec = currentSection();
    const grp = currentGroup();
    const reportLabel = binding?.tema || "Website registration";
    contextEl.textContent = [
      reportLabel,
      sec?.title || (defaults?.sectionId ? "Section" : "No section"),
      grp?.title || (defaults?.groupId ? "Subsection" : "No subsection"),
    ].join(" · ");
  }

  function populateConfigSelects() {
    const sections = payload?.sections || [];
    fillSelect(
      sectionSelect,
      sections.map((s) => ({ value: s.id, label: s.title || s.id })),
      "Select section…",
    );
    sectionSelect.value = defaults?.sectionId || "";
    const sec = sections.find((s) => s.id === sectionSelect.value);
    fillSelect(
      groupSelect,
      (sec?.groups || []).map((g) => ({ value: g.id, label: g.title || g.id })),
      "Select subsection…",
    );
    groupSelect.value = defaults?.groupId || "";
  }

  async function reloadReport() {
    setStatus("Loading…");
    const { status, data, requestId } = await fetchOrgReport(binding!.orgId, binding!.reportId);
    if (status !== 200) {
      showErrorModal({
        message: String((data as { message?: string }).message || "Could not load report."),
        requestId: String((data as { request_id?: string }).request_id || requestId),
      });
      setStatus("Could not load report.");
      return;
    }
    payload = (data.payload as ReportPayload) || { sections: [] };
    const sections = payload.sections || [];
    if (defaults?.sectionId && !sections.some((s) => s.id === defaults!.sectionId)) {
      defaults.sectionId = "";
      defaults.groupId = "";
    }
    const sec = sections.find((s) => s.id === defaults?.sectionId);
    if (defaults?.groupId && !sec?.groups?.some((g) => g.id === defaults!.groupId)) {
      defaults.groupId = "";
    }
    if (!defaults?.sectionId && sections[0]) {
      defaults.sectionId = sections[0].id;
      defaults.groupId = sections[0].groups?.[0]?.id || "";
    }
    if (defaults?.sectionId && !defaults.groupId) {
      const s = sections.find((x) => x.id === defaults!.sectionId);
      defaults.groupId = s?.groups?.[0]?.id || "";
    }
    populateConfigSelects();
    syncContext();
    renderList();
    setStatus(defaults?.sectionId && defaults?.groupId ? "Ready." : "Open settings to pick section and subsection.");
    if (!defaults?.sectionId || !defaults?.groupId) {
      configPanel.hidden = false;
    }
  }

  el(frame, "[data-eq-close]")?.addEventListener("click", () => closeEreportQuickConnector());
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeEreportQuickConnector();
  });

  el(frame, "[data-eq-config]")?.addEventListener("click", () => {
    configPanel.hidden = !configPanel.hidden;
    if (!configPanel.hidden) populateConfigSelects();
  });

  sectionSelect.addEventListener("change", () => {
    const sec = (payload?.sections || []).find((s) => s.id === sectionSelect.value);
    fillSelect(
      groupSelect,
      (sec?.groups || []).map((g) => ({ value: g.id, label: g.title || g.id })),
      "Select subsection…",
    );
    groupSelect.value = sec?.groups?.[0]?.id || "";
  });

  el(frame, "[data-eq-save-config]")?.addEventListener("click", () => {
    if (!sectionSelect.value || !groupSelect.value) {
      window.alert("Select a main section and subsection.");
      return;
    }
    defaults = {
      orgId: binding!.orgId,
      reportId: binding!.reportId,
      sectionId: sectionSelect.value,
      groupId: groupSelect.value,
    };
    saveDefaults(defaults);
    configPanel.hidden = true;
    syncContext();
    renderList();
    setStatus("Defaults saved.");
    window.alert("Defaults saved.");
  });

  el(frame, "[data-eq-advanced]")?.addEventListener("click", () => {
    closeEreportQuickConnector();
    openEreportAdvancedConnectorModal({
      orgId: binding!.orgId,
      reportId: binding!.reportId,
      label: "eReport connector",
    });
  });

  el(frame, "[data-eq-add]")?.addEventListener("click", () => {
    if (!defaults?.sectionId || !defaults?.groupId) {
      window.alert("Configure section and subsection first.");
      configPanel.hidden = false;
      return;
    }
    inputRow.hidden = false;
    input.focus();
  });

  async function submitIssue() {
    if (!defaults?.sectionId || !defaults?.groupId) {
      window.alert("Configure section and subsection first.");
      return;
    }
    const { nombre, incidencia } = parseIssueText(input.value);
    if (!nombre) {
      window.alert("Write an issue first.");
      return;
    }
    setStatus("Saving issue…");
    const { status, data, requestId } = await postItem(
      defaults.orgId,
      defaults.reportId,
      defaults.sectionId,
      defaults.groupId,
      { nombre, incidencia, status: "reprobado" },
    );
    if (status !== 201 && status !== 200) {
      showErrorModal({
        message: String(data.message || "Could not save issue."),
        requestId: String(data.request_id || requestId),
        details: String(data.error || `HTTP ${status}`),
      });
      setStatus("Could not save issue.");
      window.alert("Could not save issue.");
      return;
    }
    payload = (data.payload as ReportPayload) || payload;
    input.value = "";
    inputRow.hidden = true;
    syncContext();
    renderList();
    setStatus("Issue saved.");
    window.alert("Issue saved.");
    if (mustLog) console.log("[ereport-quick] issue saved", { nombre });
  }

  el(frame, "[data-eq-submit]")?.addEventListener("click", () => {
    void submitIssue();
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      void submitIssue();
    }
  });

  await reloadReport();
  if (mustLog) console.log("[ereport-quick] open", { orgId: binding.orgId, reportId: binding.reportId });
}
