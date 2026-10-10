import { apiRequest, getCsrf } from "./api";
import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";
import {
  fetchEreportAccess,
  fetchOrgReport,
  patchReportSiteConnector,
  type WebsiteRegistrationBinding,
} from "./ereport";
import {
  closeEreportIssueCardModal,
  isEreportIssueCardModalOpen,
  openEreportAdvancedConnectorModal,
  openEreportIssueCardModal,
  openEreportWorkspaceIssue,
} from "./ereport-connector-modal";
import { parseIssueText } from "./ereport-issue-parse";

const OVERLAY_ID = "eduardoos-ereport-quick-overlay";
const SETTINGS_ID = "eduardoos-ereport-settings-overlay";
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
  fechaIncidencia?: string;
};
type ReportPayload = {
  reportDate?: string;
  sections?: SectionNode[];
};

let writeChain: Promise<void> = Promise.resolve();

function enqueueWrite(fn: () => Promise<void>): Promise<void> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Notify an open workspace to reload so its autosave cannot overwrite node writes. */
function notifyReportMutated(orgId: string, reportId: string) {
  document.dispatchEvent(
    new CustomEvent("eos:ereport-report-mutated", {
      detail: { orgId, reportId },
    }),
  );
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

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

function saveDefaultsLocal(d: ConnectorDefaults) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d));
}

function onEscape(ev: KeyboardEvent) {
  if (ev.key !== "Escape") return;
  ev.preventDefault();
  ev.stopPropagation();
  if (isEreportIssueCardModalOpen()) {
    closeEreportIssueCardModal();
    return;
  }
  const settings = document.getElementById(SETTINGS_ID);
  if (settings) {
    closeEreportSettingsModal();
    return;
  }
  closeEreportQuickConnector();
}

export function closeEreportSettingsModal() {
  const existing = document.getElementById(SETTINGS_ID);
  if (existing?.parentNode) existing.parentNode.removeChild(existing);
}

export function closeEreportQuickConnector() {
  closeEreportIssueCardModal();
  closeEreportSettingsModal();
  const existing = document.getElementById(OVERLAY_ID);
  if (existing?.parentNode) existing.parentNode.removeChild(existing);
  document.removeEventListener("keydown", onEscape, true);
  document.documentElement.classList.remove("ereport-connector-open");
}

function el<T extends HTMLElement>(root: ParentNode, sel: string): T | null {
  return root.querySelector(sel) as T | null;
}

/** Labeled clipboard payload so a user can paste an issue into an agent chat. */
export function formatIssueClipboardText(opts: {
  reportId: string;
  sectionId: string;
  groupId: string;
  itemId: string;
  nombre?: string;
  incidencia?: string;
}): string {
  const nombre = (opts.nombre || "").trim();
  const incidencia = (opts.incidencia || "").trim();
  const lines = [
    `reportId: ${opts.reportId}`,
    `sectionId: ${opts.sectionId}`,
    `groupId: ${opts.groupId}`,
    `itemId: ${opts.itemId}`,
  ];
  if (nombre) lines.push(`nombre: ${nombre}`);
  if (incidencia) lines.push(`incidencia: ${incidencia}`);
  if (!nombre && !incidencia) lines.push("(no nombre/incidencia text)");
  return lines.join("\n");
}

async function copyTextToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999rem";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
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
  body: { nombre: string; incidencia: string; status: string; fechaIncidencia?: string },
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

function openSettingsModal(opts: {
  binding: WebsiteRegistrationBinding;
  payload: ReportPayload | null;
  defaults: ConnectorDefaults;
  onSaved: (next: ConnectorDefaults) => void;
  onAdvanced: () => void;
}) {
  closeEreportSettingsModal();

  const overlay = document.createElement("div");
  overlay.id = SETTINGS_ID;
  overlay.className = "ereport-settings-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Connector settings");

  const frame = document.createElement("div");
  frame.className = "ereport-settings-overlay__frame";
  frame.innerHTML = `
    <header class="ereport-settings-overlay__bar">
      <h2 class="ereport-settings-overlay__title">Connector settings</h2>
      <button type="button" class="icon-btn" data-eq-settings-close aria-label="Close settings" title="Close">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </header>
    <div class="ereport-settings-overlay__body">
      <label>
        Report
        <select data-eq-report disabled>
          <option value="${opts.binding.orgId}:${opts.binding.reportId}">${opts.binding.tema || "Website registration"}</option>
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
    </div>
    <div class="ereport-settings-overlay__actions">
      <button type="button" class="btn btn--primary" data-eq-save-config>Save defaults</button>
      <button type="button" class="btn" data-eq-advanced>Advanced editor</button>
    </div>
  `;

  overlay.append(frame);
  document.body.append(overlay);

  const sectionSelect = el<HTMLSelectElement>(frame, "[data-eq-section]")!;
  const groupSelect = el<HTMLSelectElement>(frame, "[data-eq-group]")!;
  const saveBtn = el<HTMLButtonElement>(frame, "[data-eq-save-config]")!;

  function populateConfigSelects() {
    const sections = opts.payload?.sections || [];
    fillSelect(
      sectionSelect,
      sections.map((s) => ({ value: s.id, label: s.title || s.id })),
      "Select section…",
    );
    sectionSelect.value = opts.defaults.sectionId || "";
    const sec = sections.find((s) => s.id === sectionSelect.value);
    fillSelect(
      groupSelect,
      (sec?.groups || []).map((g) => ({ value: g.id, label: g.title || g.id })),
      "Select subsection…",
    );
    groupSelect.value = opts.defaults.groupId || "";
  }

  populateConfigSelects();

  el(frame, "[data-eq-settings-close]")?.addEventListener("click", () => closeEreportSettingsModal());
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeEreportSettingsModal();
  });

  sectionSelect.addEventListener("change", () => {
    const sec = (opts.payload?.sections || []).find((s) => s.id === sectionSelect.value);
    fillSelect(
      groupSelect,
      (sec?.groups || []).map((g) => ({ value: g.id, label: g.title || g.id })),
      "Select subsection…",
    );
    groupSelect.value = sec?.groups?.[0]?.id || "";
  });

  saveBtn.addEventListener("click", () => {
    if (!sectionSelect.value || !groupSelect.value) {
      window.alert("Select a main section and subsection.");
      return;
    }
    const next: ConnectorDefaults = {
      orgId: opts.binding.orgId,
      reportId: opts.binding.reportId,
      sectionId: sectionSelect.value,
      groupId: groupSelect.value,
    };
    saveDefaultsLocal(next);
    opts.onSaved(next);
    saveBtn.disabled = true;
    void enqueueWrite(async () => {
      try {
        const { status, data, requestId } = await patchReportSiteConnector(next.orgId, next.reportId, {
          sectionId: next.sectionId,
          groupId: next.groupId,
          assign: false,
        });
        saveBtn.disabled = false;
        if (status !== 200) {
          showErrorModal({
            message: String(data.message || "Could not save defaults."),
            requestId: String(data.request_id || requestId),
            details: String(data.error || `HTTP ${status}`),
          });
          window.alert("Could not save defaults on the server.");
          return;
        }
        notifyReportMutated(next.orgId, next.reportId);
        closeEreportSettingsModal();
        window.alert("Defaults saved.");
      } catch (err) {
        saveBtn.disabled = false;
        const msg = err instanceof Error ? err.message : "Could not save defaults.";
        showErrorModal({ message: msg });
        window.alert("Could not save defaults on the server.");
      }
    });
  });

  el(frame, "[data-eq-advanced]")?.addEventListener("click", () => {
    opts.onAdvanced();
  });

  sectionSelect.focus();
}

export async function openEreportQuickConnector(opts?: {
  binding?: WebsiteRegistrationBinding | null;
}) {
  closeEreportQuickConnector();
  document.dispatchEvent(new CustomEvent("eos:close-trays"));

  let binding = opts?.binding ?? null;
  let ownerSafe = "";
  {
    const { status, data } = await fetchEreportAccess();
    if (status === 200) {
      ownerSafe = (data.ownerSafe || "").trim();
      if (!binding?.orgId || !binding?.reportId) {
        if (data.websiteRegistration?.orgId && data.websiteRegistration?.reportId) {
          binding = data.websiteRegistration;
        }
      }
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
  const inputRow = el<HTMLElement>(frame, "[data-eq-input-row]")!;
  const input = el<HTMLTextAreaElement>(frame, "[data-eq-input]")!;

  let payload: ReportPayload | null = null;
  const cached = loadDefaults();
  let defaults: ConnectorDefaults = {
    orgId: binding.orgId,
    reportId: binding.reportId,
    sectionId: binding.sectionId || (cached?.orgId === binding.orgId && cached?.reportId === binding.reportId ? cached.sectionId : "") || "",
    groupId: binding.groupId || (cached?.orgId === binding.orgId && cached?.reportId === binding.reportId ? cached.groupId : "") || "",
  };

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
      const actions = document.createElement("div");
      actions.className = "ereport-quick-overlay__item-actions";
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "icon-btn ereport-quick-overlay__item-copy";
      copyBtn.setAttribute("aria-label", "Copy issue for agent");
      copyBtn.title = "Copy issue for agent";
      copyBtn.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">content_copy</span>';
      copyBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const text = formatIssueClipboardText({
          reportId: defaults!.reportId,
          sectionId: defaults!.sectionId,
          groupId: defaults!.groupId,
          itemId: it.id,
          nombre: it.nombre,
          incidencia: it.incidencia,
        });
        void copyTextToClipboard(text)
          .then(() => {
            setStatus("Issue copied.");
            if (mustLog) console.log("[ereport-quick] issue copied", { itemId: it.id });
          })
          .catch(() => {
            setStatus("Could not copy issue.");
            if (mustLog) console.log("[ereport-quick] issue copy failed", { itemId: it.id });
          });
      });
      actions.append(copyBtn);
      const itemId = (it.id || "").trim();
      if (itemId && !itemId.startsWith("tmp-")) {
        const openCardBtn = document.createElement("button");
        openCardBtn.type = "button";
        openCardBtn.className = "btn ereport-quick-overlay__item-open-card";
        openCardBtn.setAttribute("aria-label", "Open issue");
        openCardBtn.title = "Open issue";
        openCardBtn.textContent = "Open";
        openCardBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          void openEreportIssueCardModal({
            orgId: defaults.orgId,
            reportId: defaults.reportId,
            sectionId: defaults.sectionId,
            groupId: defaults.groupId,
            itemId,
            item: it,
            onChanged: () => {
              void reloadReport();
            },
            onDeleted: () => {
              void reloadReport();
            },
          });
        });
        actions.append(openCardBtn);
        const openWorkspaceBtn = document.createElement("button");
        openWorkspaceBtn.type = "button";
        openWorkspaceBtn.className = "icon-btn ereport-quick-overlay__item-open";
        openWorkspaceBtn.setAttribute("aria-label", "Open issue in eReport");
        openWorkspaceBtn.title = "Open issue in eReport";
        openWorkspaceBtn.innerHTML =
          '<span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>';
        openWorkspaceBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openEreportWorkspaceIssue({
            orgId: defaults.orgId,
            reportId: defaults.reportId,
            itemId,
            ownerSafe,
          });
        });
        actions.append(openWorkspaceBtn);
      }
      li.append(title, st, actions);
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

  function openSettings() {
    openSettingsModal({
      binding: binding!,
      payload,
      defaults: defaults!,
      onSaved: (next) => {
        defaults = next;
        syncContext();
        renderList();
        setStatus("Defaults saved.");
      },
      onAdvanced: () => {
        closeEreportQuickConnector();
        openEreportAdvancedConnectorModal({
          orgId: binding!.orgId,
          reportId: binding!.reportId,
          label: "eReport connector",
        });
      },
    });
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
    const meta = data.meta;
    if (meta?.connectorSectionId) defaults.sectionId = String(meta.connectorSectionId);
    if (meta?.connectorGroupId) defaults.groupId = String(meta.connectorGroupId);
    if (binding?.sectionId && !defaults.sectionId) defaults.sectionId = binding.sectionId;
    if (binding?.groupId && !defaults.groupId) defaults.groupId = binding.groupId;

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
    if (defaults.sectionId && defaults.groupId) {
      saveDefaultsLocal(defaults);
    }
    syncContext();
    renderList();
    setStatus(defaults?.sectionId && defaults?.groupId ? "Ready." : "Open settings to pick section and subsection.");
    if (!defaults?.sectionId || !defaults?.groupId) {
      openSettings();
    }
  }

  el(frame, "[data-eq-close]")?.addEventListener("click", () => closeEreportQuickConnector());
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeEreportQuickConnector();
  });

  el(frame, "[data-eq-config]")?.addEventListener("click", () => openSettings());

  el(frame, "[data-eq-add]")?.addEventListener("click", () => {
    if (!defaults?.sectionId || !defaults?.groupId) {
      window.alert("Configure section and subsection first.");
      openSettings();
      return;
    }
    inputRow.hidden = false;
    input.focus();
  });

  function submitIssue() {
    if (!defaults?.sectionId || !defaults?.groupId) {
      window.alert("Configure section and subsection first.");
      return;
    }
    const { nombre, incidencia } = parseIssueText(input.value);
    if (!nombre) {
      window.alert("Write an issue first.");
      return;
    }
    const fecha = todayDate();
    const tempId = `tmp-${Date.now()}`;
    const group = currentGroup();
    if (!group) {
      window.alert("Configure section and subsection first.");
      return;
    }
    if (!group.items) group.items = [];
    group.items.push({
      id: tempId,
      nombre,
      incidencia,
      status: "reprobado",
      fechaIncidencia: fecha,
    });
    if (payload) payload.reportDate = fecha;
    input.value = "";
    inputRow.hidden = true;
    syncContext();
    renderList();
    setStatus("Saving…");

    const orgId = defaults.orgId;
    const reportId = defaults.reportId;
    const sectionId = defaults.sectionId;
    const groupId = defaults.groupId;

    void enqueueWrite(async () => {
      try {
        const { status, data, requestId } = await postItem(orgId, reportId, sectionId, groupId, {
          nombre,
          incidencia,
          status: "reprobado",
          fechaIncidencia: fecha,
        });
        if (status !== 201 && status !== 200) {
          const g = currentGroup();
          if (g?.items) g.items = g.items.filter((it) => it.id !== tempId);
          renderList();
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
        syncContext();
        renderList();
        setStatus("Issue saved.");
        notifyReportMutated(orgId, reportId);
        if (mustLog) console.log("[ereport-quick] issue saved", { nombre, status, requestId });
      } catch (err) {
        const g = currentGroup();
        if (g?.items) g.items = g.items.filter((it) => it.id !== tempId);
        renderList();
        const msg = err instanceof Error ? err.message : "Could not save issue.";
        showErrorModal({ message: msg });
        setStatus("Could not save issue.");
        window.alert("Could not save issue.");
      }
    });
  }

  el(frame, "[data-eq-submit]")?.addEventListener("click", () => {
    submitIssue();
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      submitIssue();
    }
  });

  await reloadReport();
  if (mustLog) console.log("[ereport-quick] open", { orgId: binding.orgId, reportId: binding.reportId });
}
