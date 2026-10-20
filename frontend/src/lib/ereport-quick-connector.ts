import { apiRequest, getCsrf } from "./api";
import { mustLog } from "./dev-log";
import { showErrorModal } from "./error-modal";
import {
  EREPORT_API_TIMEOUT_MS,
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
import * as ereportReady from "./ereport-connector-ready";
import { probeEreportConnectorReady } from "./ereport-connector-ready";
import { parseIssueText } from "./ereport-issue-parse";

const OVERLAY_ID = "eduardoos-ereport-quick-overlay";
const SETTINGS_ID = "eduardoos-ereport-settings-overlay";
const DEFAULTS_KEY = "ereport.connector.defaults";
const ACTIVE_KEY_PREFIX = "ereport.connector.active.";
const LOG_PREFIX = "[ereport-quick]";

type ActiveOverride = { orgId: string; reportId: string };

type ReadyOverrideApi = {
  setConnectorActiveOverride?: (orgId: string, reportId: string) => void;
  getConnectorActiveOverride?: () => ActiveOverride | null;
};

function activeStorageKey(): string {
  try {
    return `${ACTIVE_KEY_PREFIX}${location.hostname}`;
  } catch {
    return `${ACTIVE_KEY_PREFIX}default`;
  }
}

function readyOverrideFn<K extends keyof ReadyOverrideApi>(name: K): ReadyOverrideApi[K] | undefined {
  // hasOwnProperty avoids Vitest's mock trap for missing named exports.
  if (!Object.prototype.hasOwnProperty.call(ereportReady, name)) return undefined;
  const fn = (ereportReady as ReadyOverrideApi)[name];
  return typeof fn === "function" ? fn : undefined;
}

/** Prefer ready-module helpers when exported; else localStorage per hostname. */
export function setConnectorActiveOverride(orgId: string, reportId: string): void {
  const readySet = readyOverrideFn("setConnectorActiveOverride");
  if (readySet) {
    readySet(orgId, reportId);
    return;
  }
  try {
    localStorage.setItem(activeStorageKey(), JSON.stringify({ orgId, reportId }));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getConnectorActiveOverride(): ActiveOverride | null {
  const readyGet = readyOverrideFn("getConnectorActiveOverride");
  if (readyGet) {
    return readyGet();
  }
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

function parseConnectorHosts(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((h) => h.trim())
    .filter(Boolean);
}

function formatConnectorHosts(hosts: string[] | undefined | null): string {
  return (hosts || []).map((h) => String(h || "").trim()).filter(Boolean).join(", ");
}

function websiteOptionValue(b: WebsiteRegistrationBinding): string {
  return `${b.orgId}:${b.reportId}`;
}

function parseWebsiteOptionValue(value: string): ActiveOverride | null {
  const idx = value.indexOf(":");
  if (idx <= 0) return null;
  const orgId = value.slice(0, idx).trim();
  const reportId = value.slice(idx + 1).trim();
  if (!orgId || !reportId) return null;
  return { orgId, reportId };
}

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
  checklist?: Array<{ id?: string; checked?: boolean }>;
};
type ReportPayload = {
  reportDate?: string;
  sections?: SectionNode[];
};

/** Open = not closed. Closed = status aprobado, or all checklist rows checked. */
export function isWebsiteIssueOpen(item: {
  status?: string;
  checklist?: Array<{ checked?: boolean }> | null;
}): boolean {
  if ((item.status || "").trim() === "aprobado") return false;
  const list = Array.isArray(item.checklist) ? item.checklist : [];
  if (list.length > 0 && list.every((c) => !!c.checked)) return false;
  return true;
}

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

function isSpanishUi(): boolean {
  try {
    return typeof document !== "undefined" && document.documentElement.lang.startsWith("es");
  } catch {
    return false;
  }
}

function readyToSaveStatus(): string {
  return isSpanishUi() ? "Listo para guardar." : "Ready to save.";
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
    { timeoutMs: EREPORT_API_TIMEOUT_MS },
  );
}

function openSettingsModal(opts: {
  binding: WebsiteRegistrationBinding;
  payload: ReportPayload | null;
  defaults: ConnectorDefaults;
  registrations: WebsiteRegistrationBinding[];
  connectorHosts: string[];
  onSaved: (next: ConnectorDefaults, hosts: string[]) => void;
  onWebsiteChange: (next: WebsiteRegistrationBinding) => void;
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
        Website
        <select data-eq-website></select>
      </label>
      <label>
        Hosts
        <input type="text" data-eq-hosts placeholder="example.com, www.example.com" autocomplete="off" />
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

  const websiteSelect = el<HTMLSelectElement>(frame, "[data-eq-website]")!;
  const hostsInput = el<HTMLInputElement>(frame, "[data-eq-hosts]")!;
  const sectionSelect = el<HTMLSelectElement>(frame, "[data-eq-section]")!;
  const groupSelect = el<HTMLSelectElement>(frame, "[data-eq-group]")!;
  const saveBtn = el<HTMLButtonElement>(frame, "[data-eq-save-config]")!;

  const registrations = [...opts.registrations];
  const currentKey = websiteOptionValue(opts.binding);
  if (!registrations.some((r) => websiteOptionValue(r) === currentKey)) {
    registrations.unshift({
      orgId: opts.binding.orgId,
      reportId: opts.binding.reportId,
      ...(opts.binding.tema ? { tema: opts.binding.tema } : {}),
      ...(opts.binding.sectionId ? { sectionId: opts.binding.sectionId } : {}),
      ...(opts.binding.groupId ? { groupId: opts.binding.groupId } : {}),
      ...(opts.binding.connectorHosts ? { connectorHosts: opts.binding.connectorHosts } : {}),
    });
  }

  fillSelect(
    websiteSelect,
    registrations.map((r) => ({
      value: websiteOptionValue(r),
      label: (r.tema || "").trim() || r.reportId,
    })),
    registrations.length ? "Select website…" : "No websites…",
  );
  websiteSelect.value = currentKey;
  hostsInput.value = formatConnectorHosts(opts.connectorHosts);

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

  websiteSelect.addEventListener("change", () => {
    const parsed = parseWebsiteOptionValue(websiteSelect.value);
    if (!parsed) return;
    if (parsed.orgId === opts.binding.orgId && parsed.reportId === opts.binding.reportId) return;
    const next =
      registrations.find(
        (r) => r.orgId === parsed.orgId && r.reportId === parsed.reportId,
      ) || ({ orgId: parsed.orgId, reportId: parsed.reportId } as WebsiteRegistrationBinding);
    setConnectorActiveOverride(parsed.orgId, parsed.reportId);
    opts.onWebsiteChange(next);
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
    const hosts = parseConnectorHosts(hostsInput.value);
    const next: ConnectorDefaults = {
      orgId: opts.binding.orgId,
      reportId: opts.binding.reportId,
      sectionId: sectionSelect.value,
      groupId: groupSelect.value,
    };
    saveDefaultsLocal(next);
    opts.onSaved(next, hosts);
    saveBtn.disabled = true;
    void enqueueWrite(async () => {
      try {
        const { status, data, requestId } = await patchReportSiteConnector(next.orgId, next.reportId, {
          sectionId: next.sectionId,
          groupId: next.groupId,
          assign: false,
          connectorHosts: hosts,
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

  websiteSelect.focus();
}

export async function openEreportQuickConnector(opts?: {
  binding?: WebsiteRegistrationBinding | null;
}) {
  closeEreportQuickConnector();
  document.dispatchEvent(new CustomEvent("eos:close-trays"));

  const activeOverride = getConnectorActiveOverride();
  const probeOpts =
    opts?.binding?.orgId && opts?.binding?.reportId
      ? { orgId: opts.binding.orgId, reportId: opts.binding.reportId }
      : activeOverride?.orgId && activeOverride?.reportId
        ? { orgId: activeOverride.orgId, reportId: activeOverride.reportId }
        : undefined;
  const ready = await probeEreportConnectorReady(probeOpts);
  if (!ready.ok) {
    if (mustLog) {
      console.log(LOG_PREFIX, "open blocked", {
        reason: ready.reason,
        requestId: ready.requestId,
      });
    }
    showErrorModal({
      message: ready.message,
      requestId: ready.requestId,
      details: ready.reason,
    });
    return;
  }

  let binding: WebsiteRegistrationBinding = {
    orgId: ready.binding.orgId,
    reportId: ready.binding.reportId,
    ...(opts?.binding?.tema || ready.binding.tema
      ? { tema: opts?.binding?.tema || ready.binding.tema }
      : {}),
    ...(ready.binding.sectionId || opts?.binding?.sectionId
      ? { sectionId: ready.binding.sectionId || opts?.binding?.sectionId }
      : {}),
    ...(ready.binding.groupId || opts?.binding?.groupId
      ? { groupId: ready.binding.groupId || opts?.binding?.groupId }
      : {}),
    ...(opts?.binding?.connectorHosts
      ? { connectorHosts: opts.binding.connectorHosts }
      : {}),
  };
  let ownerSafe = (ready.ownerSafe || "").trim();
  let websiteRegistrations: WebsiteRegistrationBinding[] = [];
  let connectorHosts: string[] = Array.isArray(opts?.binding?.connectorHosts)
    ? [...opts.binding.connectorHosts]
    : [];

  if (mustLog) {
    console.log(LOG_PREFIX, "ready", {
      orgId: binding.orgId,
      reportId: binding.reportId,
      sectionId: ready.sectionId,
      groupId: ready.groupId,
      ownerSafe,
      probeOpts,
    });
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
    <div class="ereport-quick-overlay__compose" data-eq-compose hidden>
      <button type="button" class="icon-btn" data-eq-add aria-label="Add issue" title="Add issue" disabled>
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
      </button>
      <div class="ereport-quick-overlay__input-row" data-eq-input-row hidden>
        <textarea data-eq-input rows="3" placeholder="Issue title. Description after the first period…" disabled></textarea>
        <button type="button" class="btn btn--primary" data-eq-submit disabled>Save issue</button>
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
  const composeEl = el<HTMLElement>(frame, "[data-eq-compose]")!;
  const inputRow = el<HTMLElement>(frame, "[data-eq-input-row]")!;
  const input = el<HTMLTextAreaElement>(frame, "[data-eq-input]")!;
  const addBtn = el<HTMLButtonElement>(frame, "[data-eq-add]")!;
  const submitBtn = el<HTMLButtonElement>(frame, "[data-eq-submit]")!;

  let payload: ReportPayload | null = null;
  let targetsConfirmed = false;
  let defaults: ConnectorDefaults = {
    orgId: binding.orgId,
    reportId: binding.reportId,
    sectionId: ready.sectionId || "",
    groupId: ready.groupId || "",
  };

  function setStatus(msg: string) {
    statusEl.textContent = msg;
  }

  function setComposeEnabled(enabled: boolean) {
    targetsConfirmed = enabled;
    composeEl.hidden = !enabled;
    addBtn.disabled = !enabled;
    input.disabled = !enabled;
    submitBtn.disabled = !enabled;
    if (!enabled) inputRow.hidden = true;
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
    const items = (group?.items || []).filter(isWebsiteIssueOpen);
    if (!defaults?.sectionId || !defaults?.groupId) {
      setStatus("Configure section and subsection first.");
      return;
    }
    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "ereport-quick-overlay__empty";
      empty.textContent =
        (group?.items || []).length > 0
          ? "No open issues in this subsection."
          : "No issues in this subsection yet.";
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
            if (mustLog) console.log(LOG_PREFIX, "issue copied", { itemId: it.id });
          })
          .catch(() => {
            setStatus("Could not copy issue.");
            if (mustLog) console.log(LOG_PREFIX, "issue copy failed", { itemId: it.id });
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

  async function loadWebsiteRegistrations(): Promise<WebsiteRegistrationBinding[]> {
    if (websiteRegistrations.length > 0) return websiteRegistrations;
    try {
      const access = await fetchEreportAccess();
      if (access.status !== 200) return websiteRegistrations;
      const list = Array.isArray(access.data.websiteRegistrations)
        ? access.data.websiteRegistrations.filter((r) => r?.orgId && r?.reportId)
        : [];
      const primary = access.data.websiteRegistration;
      const merged: WebsiteRegistrationBinding[] = [...list];
      if (primary?.orgId && primary?.reportId) {
        const key = websiteOptionValue(primary);
        if (!merged.some((r) => websiteOptionValue(r) === key)) merged.unshift(primary);
      }
      websiteRegistrations = merged;
      const match = merged.find(
        (r) => r.orgId === binding.orgId && r.reportId === binding.reportId,
      );
      if (match) {
        if (match.tema) binding = { ...binding, tema: match.tema };
        if (Array.isArray(match.connectorHosts) && connectorHosts.length === 0) {
          connectorHosts = [...match.connectorHosts];
          binding = { ...binding, connectorHosts };
        }
      }
    } catch {
      /* keep prior list */
    }
    return websiteRegistrations;
  }

  function openSettings() {
    void (async () => {
      const registrations = await loadWebsiteRegistrations();
      openSettingsModal({
        binding,
        payload,
        defaults,
        registrations,
        connectorHosts,
        onSaved: (next, hosts) => {
          defaults = next;
          connectorHosts = hosts;
          binding = { ...binding, connectorHosts: hosts };
          syncContext();
          renderList();
          setComposeEnabled(Boolean(next.sectionId && next.groupId));
          setStatus(next.sectionId && next.groupId ? readyToSaveStatus() : "Defaults saved.");
        },
        onWebsiteChange: (next) => {
          void openEreportQuickConnector({ binding: next });
        },
        onAdvanced: () => {
          closeEreportQuickConnector();
          openEreportAdvancedConnectorModal({
            orgId: binding.orgId,
            reportId: binding.reportId,
            label: "eReport connector",
          });
        },
      });
    })();
  }

  async function reloadReport() {
    setStatus("Loading…");
    setComposeEnabled(false);
    const { status, data, requestId } = await fetchOrgReport(binding.orgId, binding.reportId);
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
    if (meta?.ownerSafe) ownerSafe = String(meta.ownerSafe).trim() || ownerSafe;
    if (meta?.tema) binding = { ...binding, tema: String(meta.tema) };
    if (meta?.connectorSectionId) defaults.sectionId = String(meta.connectorSectionId);
    if (meta?.connectorGroupId) defaults.groupId = String(meta.connectorGroupId);
    if (Array.isArray(meta?.connectorHosts)) {
      connectorHosts = meta.connectorHosts.map((h) => String(h || "").trim()).filter(Boolean);
      binding = { ...binding, connectorHosts };
    }
    if (binding.sectionId && !defaults.sectionId) defaults.sectionId = binding.sectionId;
    if (binding.groupId && !defaults.groupId) defaults.groupId = binding.groupId;
    if (ready.sectionId && !defaults.sectionId) defaults.sectionId = ready.sectionId;
    if (ready.groupId && !defaults.groupId) defaults.groupId = ready.groupId;

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
    const targetsOk = Boolean(defaults.sectionId && defaults.groupId && currentGroup());
    setComposeEnabled(targetsOk);
    setStatus(targetsOk ? readyToSaveStatus() : "Open settings to pick section and subsection.");
    if (!targetsOk) {
      openSettings();
    }
  }

  el(frame, "[data-eq-close]")?.addEventListener("click", () => closeEreportQuickConnector());
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) closeEreportQuickConnector();
  });

  el(frame, "[data-eq-config]")?.addEventListener("click", () => openSettings());

  addBtn.addEventListener("click", () => {
    if (!targetsConfirmed || !defaults.sectionId || !defaults.groupId) {
      window.alert("Configure section and subsection first.");
      openSettings();
      return;
    }
    inputRow.hidden = false;
    input.focus();
  });

  function submitIssue() {
    if (!targetsConfirmed || !defaults.sectionId || !defaults.groupId) {
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
          if (mustLog) {
            console.log(LOG_PREFIX, "save failed", { status, requestId, nombre });
          }
          return;
        }
        if (data.payload) {
          payload = data.payload as ReportPayload;
        }
        const createdId = String(
          (data as { item?: { id?: string }; id?: string }).item?.id ||
            (data as { id?: string }).id ||
            "",
        ).trim();
        const gAfter = currentGroup();
        if (gAfter?.items) {
          gAfter.items = gAfter.items.filter((it) => it.id !== tempId);
        }
        const present = createdId
          ? Boolean(gAfter?.items?.some((it) => it.id === createdId))
          : Boolean(
              gAfter?.items?.some(
                (it) => it.nombre === nombre && (it.incidencia || "") === (incidencia || ""),
              ),
            );
        if ((status === 201 || status === 200) && !present) {
          await reloadReport();
          setStatus("Issue saved.");
        } else {
          syncContext();
          renderList();
          setStatus("Issue saved.");
        }
        notifyReportMutated(orgId, reportId);
        if (mustLog) console.log(LOG_PREFIX, "save", { nombre, status, requestId, createdId });
      } catch (err) {
        const g = currentGroup();
        if (g?.items) g.items = g.items.filter((it) => it.id !== tempId);
        renderList();
        const msg = err instanceof Error ? err.message : "Could not save issue.";
        showErrorModal({ message: msg });
        setStatus("Could not save issue.");
        if (mustLog) {
          console.log(LOG_PREFIX, "save failed", {
            message: err instanceof Error ? err.message : "unknown",
          });
        }
      }
    });
  }

  submitBtn.addEventListener("click", () => {
    submitIssue();
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      submitIssue();
    }
  });

  setStatus(isSpanishUi() ? "Cargando…" : "Loading…");
  await reloadReport();
}
